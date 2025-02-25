import os
from typing import List, Optional, Dict, Any
import httpx
from dotenv import load_dotenv
import json

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
        print(f"Attempting to fetch standard: {standard_code}")
        print(f"Using API URL: {self.base_url}")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/standards/items",
                    params={"keyword": standard_code}
                )
                
                print(f"API Response Status: {response.status_code}")
                print(f"API Response: {response.text}")
                
                if response.status_code != 200:
                    raise CCCError(f"Failed to fetch standard: {response.text}")
                
                standards = response.json()
                if not standards:
                    raise CCCError(f"No standard found for code: {standard_code}")
                    
                return standards[0]
            except httpx.RequestError as e:
                print(f"HTTP Request failed: {str(e)}")
                raise CCCError(f"Failed to connect to CCC API: {str(e)}")

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
        
        # Print some debug info
        print(f"\nProcessing {len(content_items)} content items for standard {standard_code}")
        print(f"Standard details: {standard['fullStatement']}")
        
        # Filter for questions and convert to our format
        questions = []
        for i, item in enumerate(content_items):
            if item["type"] != "Question":
                continue
                
            try:
                content = item["content"]
                
                # Print raw content for debugging
                print(f"\nRaw question content #{i}:")
                print(json.dumps(content, indent=2))
                
                # Map CCC API fields to our expected fields
                if "question" in content and "question_text" not in content:
                    content["question_text"] = content["question"]
                
                if "answers" in content and "choices" not in content:
                    # Convert answers to choices format
                    content["choices"] = [
                        {
                            "text": answer["label"],
                            "is_correct": answer["isCorrect"],
                            "explanation": answer.get("explanation", "")
                        }
                        for answer in content["answers"]
                    ]
                    # Set correct_answer if not present
                    if "correct_answer" not in content:
                        for idx, answer in enumerate(content["answers"]):
                            if answer["isCorrect"]:
                                content["correct_answer"] = answer["label"]
                                break
                
                # Check if required fields are present
                if "question_text" not in content:
                    print(f"Missing required field 'question_text' in question #{i}")
                    continue
                    
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
                    correct_answer=content.get("correct_answer", ""),
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
                print(f"Successfully converted question #{i}")
            except KeyError as e:
                print(f"Skipping malformed question #{i}: {e}")
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