from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class InteractionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    FREE_RESPONSE = "free_response"


class Choice(BaseModel):
    text: str
    is_correct: bool
    explanation: str = Field(description="Explanation why this choice is right/wrong")


class Image(BaseModel):
    url: str
    caption: Optional[str] = None
    alt_text: str = Field(description="Accessibility description of the image")


class Solution(BaseModel):
    steps: List[str] = Field(description="Step by step guidance to solve the question")
    explanation: str = Field(description="Detailed explanation of the solution")


class Question(BaseModel):
    # Content
    prompt: str = Field(description="The actual question text")
    stimuli: Optional[str] = Field(None, description="Optional passage or context")
    images: Optional[List[Image]] = Field(None, description="Optional images or diagrams")
    
    # Answer format
    interaction_type: InteractionType
    choices: Optional[List[Choice]] = Field(None, description="Required for multiple choice")
    correct_answer: str = Field(description="For free response, the expected answer")
    
    # Solution and grading
    solution: Solution
    grading_criteria: Optional[str] = Field(None, description="Required for free response")
    
    # Metadata
    subject: Optional[str] = Field(None, description="e.g., 'science'")
    grade: Optional[int] = Field(None, description="e.g., 8")
    standard: Optional[str] = Field(None, description="e.g., NGSS code")
    lesson: Optional[str] = Field(None, description="Specific lesson within standard")
    difficulty: Optional[int] = Field(None, description="1 (easy) to 3 (hard)")

    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "A student pushes a 10 kg box across a rough floor with a constant force of 50 N. If the force of friction is 30 N, what is the net force on the box?",
                "interaction_type": "multiple_choice",
                "choices": [
                    {
                        "text": "20 N",
                        "is_correct": True,
                        "explanation": "The net force is the sum of all forces. 50 N push - 30 N friction = 20 N net force."
                    },
                    {
                        "text": "80 N",
                        "is_correct": False,
                        "explanation": "This incorrectly adds the forces instead of subtracting friction."
                    },
                    {
                        "text": "50 N",
                        "is_correct": False,
                        "explanation": "This only considers the pushing force and ignores friction."
                    },
                    {
                        "text": "30 N",
                        "is_correct": False,
                        "explanation": "This only considers the friction force and ignores the pushing force."
                    }
                ],
                "solution": {
                    "steps": [
                        "Identify the forces: 50 N push and 30 N friction in opposite directions",
                        "Since friction opposes motion, subtract it from the pushing force",
                        "50 N - 30 N = 20 N net force"
                    ],
                    "explanation": "The net force is the sum of all forces acting on an object. When forces act in opposite directions, we subtract the opposing force. Here, friction opposes the pushing force, so we subtract it."
                },
                "subject": "science",
                "grade": 8,
                "standard": "MS-PS2-2",
                "lesson": "Forces and Motion - Net Force",
                "difficulty": 2
            }
        } 