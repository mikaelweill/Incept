import os
from typing import List, Optional, Dict, Any
import httpx
from dotenv import load_dotenv

from src.models.question import Question, InteractionType, Choice, Solution

load_dotenv()

class CCCError(Exception):
    """Custom error for CCC API issues"""
    pass

class CCCClient:
    def __init__(self):
        self.base_url = "https://commoncrawl.alpha1edtech.com"

    async def get_standard(self, standard_code: str) -> Dict[str, Any]:
        """
        Fetch a standard by its code (e.g., 'MS-PS2-2' for 8th grade science).
        
        Example response:
        {
            "id": "6b99f13c-d7cc-11e8-824f-0242ac160002",
            "educationLevel": ["03"],
            "humanCodingScheme": "L.3.2.f",
            "fullStatement": "Use spelling patterns and generalizations..."
        }
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/standards/items",
                params={"keyword": standard_code}
            )
            
            if response.status_code != 200:
                raise CCCError(f"Failed to fetch standard: {response.text}")
            
            standards = response.json()
            if not standards:
                raise CCCError(f"No standard found for code: {standard_code}")
                
            return standards[0]

    async def get_content_for_standard(self, cf_item_id: str) -> List[Dict[str, Any]]:
        """
        Fetch content associated with a standard.
        
        Example response:
        [
            {
                "id": 123,
                "type": "Article",
                "CFItemId": "789e4567-e89b-12d3-a456-426614174001",
                "name": "Understanding Addition",
                "content": {
                    "title": "Basic Addition Concepts",
                    "body": "Addition is a fundamental mathematical operation..."
                }
            }
        ]
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/sources/content",
                params={"CFItemId": cf_item_id}
            )
            
            if response.status_code != 200:
                raise CCCError(f"Failed to fetch content: {response.text}")
                
            return response.json()

    async def get_questions_for_standard(self, standard_code: str) -> List[Question]:
        """
        Get all questions for a specific standard.
        
        Args:
            standard_code: e.g., 'MS-PS2-2' for 8th grade Forces and Motion
            
        Returns:
            List of Question objects
        """
        # First get the standard details
        standard = await self.get_standard(standard_code)
        
        # Then get all content for this standard
        content_items = await self.get_content_for_standard(standard["id"])
        
        # Filter for questions and convert to our format
        questions = []
        for item in content_items:
            if item["type"] != "Question":
                continue
                
            try:
                content = item["content"]
                
                # Convert CCC question format to our Question model
                question = Question(
                    prompt=content["question_text"],
                    interaction_type=content.get("question_type", "multiple_choice"),
                    choices=[
                        Choice(
                            text=choice["text"],
                            is_correct=choice["is_correct"],
                            explanation=choice.get("explanation", "")
                        )
                        for choice in content.get("choices", [])
                    ] if content.get("choices") else None,
                    correct_answer=content["correct_answer"],
                    solution=Solution(
                        steps=content.get("solution_steps", []),
                        explanation=content.get("solution_explanation", "")
                    ),
                    subject="science",
                    grade=8,
                    standard=standard_code,
                    lesson=standard["humanCodingScheme"],
                    difficulty=content.get("difficulty", 1)
                )
                questions.append(question)
            except KeyError as e:
                print(f"Skipping malformed question: {e}")
                continue
                
        return questions

    async def find_similar_questions(self, question_text: str) -> List[Question]:
        """
        Find questions similar to the given text across all supported standards.
        
        Args:
            question_text: The question to find similar matches for
            
        Returns:
            List of similar questions
        """
        # For now, we'll search across all 8th grade physics standards
        standards = [
            "MS-PS2-1",  # Newton's Laws
            "MS-PS2-2",  # Forces and Motion
            "MS-PS2-3",  # Factors Affecting Forces
            "MS-PS2-4",  # Gravitational and Magnetic Forces
            "MS-PS2-5"   # Fields
        ]
        
        all_questions = []
        for standard in standards:
            try:
                questions = await self.get_questions_for_standard(standard)
                all_questions.extend(questions)
            except CCCError as e:
                print(f"Error fetching questions for {standard}: {e}")
                continue
        
        # TODO: Implement proper similarity ranking
        # For now, just return all questions (limited to 5)
        return all_questions[:5] 