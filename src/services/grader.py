from typing import Dict, List, Optional
import os
from openai import AsyncOpenAI
import json
import re
import httpx

class QuestionGrader:
    def __init__(self):
        """Initialize the grader with OpenAI client."""
        # Create a clean httpx client without proxies
        self.http_client = httpx.AsyncClient(timeout=60.0)
        
        # Initialize OpenAI client with explicit http_client to avoid proxies issue
        self.client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            http_client=self.http_client
        )
        
        # Quality criteria from PRD
        self.criteria = {
            "content": [
                "consistent_with_article",
                "correct_answer_accurate",
                "no_correct_distractors",
                "plausible_distractors",
                "clear_wrong_answer_explanations",
                "clear_solution"
            ],
            "format": [
                "grade_appropriate_language",
                "consistent_wording",
                "grammatically_correct",
                "properly_formatted"
            ],
            "metadata": [
                "appropriate_subject",
                "appropriate_grade",
                "appropriate_standard",
                "appropriate_lesson",
                "appropriate_difficulty"
            ]
        }
    
    async def grade_question(self, question: Dict) -> Dict:
        """Grade a question and return detailed feedback."""
        
        try:
            # Construct prompt for LLM
            prompt = self._construct_grading_prompt(question)
            
            # Log what we're sending to LLM
            print("\n=== SENDING TO LLM ===")
            print(f"Question being graded: {json.dumps(question, indent=2)}")
            print(f"\nPrompt: {prompt}")
            
            # Get LLM evaluation
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",  # Using GPT-4 for high precision
                messages=[
                    {"role": "system", "content": """You are an expert educational content evaluator. 
Your task is to evaluate questions for quality and provide detailed feedback.
You must be extremely strict in your evaluation as these questions will be used to teach students.
A question must pass ALL criteria to be considered acceptable.
If you find ANY issues, the question must fail.
Provide specific, actionable feedback for any failures."""},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1  # Low temperature for consistent evaluation
            )
            
            # Log what LLM returned
            print("\n=== LLM RESPONSE ===")
            print(response.choices[0].message.content)
            
            # Parse LLM response into structured feedback
            evaluation = self._parse_llm_response(response.choices[0].message.content)
            
            print("\n=== PARSED RESULT ===")
            print(json.dumps(evaluation, indent=2))
            
            return {
                "passed": evaluation["passed"],
                "score": 1.0 if evaluation["passed"] else 0.0,
                "feedback": evaluation["feedback"] if not evaluation["passed"] else None,
                "scorecard": evaluation["scorecard"]
            }
        finally:
            # Make sure we close the HTTP client
            try:
                await self.http_client.aclose()
            except Exception as e:
                print(f"Error closing HTTP client: {str(e)}")
    
    def _construct_grading_prompt(self, question: Dict) -> str:
        """Construct the prompt for grading a question."""
        prompt = f"""Please evaluate this question for quality according to these criteria:

Question to evaluate:
{json.dumps(question, indent=2)}

Criteria to check:
1. Content Quality:
   - Is it consistent with standard teaching for this topic?
   - Is the designated correct answer accurate?
   - Are all distractors clearly incorrect? (no ambiguity)
   - Are at least 2 distractors plausible mistakes a student might make?
   - Does each wrong answer have a clear explanation?
   - Is the solution clear and complete?

2. Format Quality:
   - Is the language appropriate for grade {question.get('metadata', {}).get('grade', '8')}?
   - Is the wording consistent throughout?
   - Is it grammatically correct?
   - Is it properly formatted?

3. Metadata Appropriateness:
   - Subject: {question.get('metadata', {}).get('subject')}
   - Grade: {question.get('metadata', {}).get('grade')}
   - Standard: {question.get('metadata', {}).get('standard')}
   - Lesson: {question.get('metadata', {}).get('lesson')}
   - Difficulty: {question.get('metadata', {}).get('difficulty')}

IMPORTANT: Please format your response EXACTLY as follows:

Content Quality:
[For each criterion, on a new line:]
- PASS/FAIL: [criterion name]
  Explanation: [brief explanation]

Format Quality:
[For each criterion, on a new line:]
- PASS/FAIL: [criterion name]
  Explanation: [brief explanation]

Metadata Appropriateness:
[For each criterion, on a new line:]
- PASS/FAIL: [criterion name]
  Explanation: [brief explanation]

Overall verdict: [PASS/FAIL]

[If any failures:]
Detailed feedback:
[List specific issues and suggestions for improvement]

Scorecard:
Content Quality: [PASS/FAIL]
Format Quality: [PASS/FAIL]
Metadata Appropriateness: [PASS/FAIL]"""

        return prompt
    
    def _parse_llm_response(self, response: str) -> Dict:
        """Parse LLM response into structured feedback."""
        # Look for overall verdict
        verdict_match = re.search(r"Overall verdict:\s*(PASS|FAIL)", response)
        overall_verdict = verdict_match.group(1) if verdict_match else "FAIL"
        
        # Parse detailed feedback if it exists
        feedback_match = re.search(r"Detailed feedback:(.*?)(?=\n\nScorecard:|\Z)", response, re.DOTALL)
        detailed_feedback = feedback_match.group(1).strip() if feedback_match else None
        
        # Parse scorecard
        scorecard = {}
        scorecard_match = re.search(r"Scorecard:(.*?)(?=\Z)", response, re.DOTALL)
        if scorecard_match:
            scorecard_text = scorecard_match.group(1)
            for line in scorecard_text.strip().split('\n'):
                if ':' in line:
                    category, result = line.split(':', 1)
                    scorecard[category.strip()] = result.strip() == "PASS"
        
        return {
            "passed": overall_verdict == "PASS",
            "feedback": detailed_feedback if overall_verdict == "FAIL" else None,
            "scorecard": scorecard
        } 