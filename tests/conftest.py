import pytest
from typing import Dict, List
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

# Test data fixtures
@pytest.fixture
def good_question_example() -> Dict:
    """Example of a high-quality question from CCC."""
    return {
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
        "metadata": {
            "subject": "science",
            "grade": 8,
            "standard": "MS-PS2-2",
            "lesson": "Forces and Motion - Net Force",
            "difficulty": 2
        }
    }

@pytest.fixture
def bad_questions() -> List[Dict]:
    """Examples of questions with specific quality issues."""
    return [
        # Example 1: Obvious answer (the correct answer stands out)
        {
            "prompt": "A student pushes a 10 kg box across a rough floor with a constant force of 50 N. If the force of friction is 30 N, what is the net force on the box?",
            "interaction_type": "multiple_choice",
            "choices": [
                {
                    "text": "20 N",  # Only reasonable answer
                    "is_correct": True,
                    "explanation": "The net force is the sum of all forces. 50 N push - 30 N friction = 20 N net force."
                },
                {
                    "text": "1000 N",  # Clearly wrong
                    "is_correct": False,
                    "explanation": "This is way too large."
                },
                {
                    "text": "0.1 N",  # Clearly wrong
                    "is_correct": False,
                    "explanation": "This is way too small."
                },
                {
                    "text": "-500 N",  # Clearly wrong
                    "is_correct": False,
                    "explanation": "This is negative and way too large."
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
            "metadata": {
                "subject": "science",
                "grade": 8,
                "standard": "MS-PS2-2",
                "lesson": "Forces and Motion - Net Force",
                "difficulty": 2
            },
            "expected_failure": "distractors_not_plausible"
        }
    ]

# Helper functions
def calculate_precision(true_positives: int, false_positives: int) -> float:
    """Calculate precision score."""
    if true_positives + false_positives == 0:
        return 0.0
    return true_positives / (true_positives + false_positives)

def calculate_recall(true_positives: int, false_negatives: int) -> float:
    """Calculate recall score."""
    if true_positives + false_negatives == 0:
        return 0.0
    return true_positives / (true_positives + false_negatives)

def calculate_f1(precision: float, recall: float) -> float:
    """Calculate F1 score."""
    if precision + recall == 0:
        return 0.0
    return 2 * (precision * recall) / (precision + recall) 