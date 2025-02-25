import pytest
from typing import Dict, List
from src.services.grader import QuestionGrader

@pytest.fixture
def grader():
    """Initialize grader for tests."""
    return QuestionGrader()

@pytest.mark.asyncio
async def test_grader_accepts_good_question(grader, good_question_example):
    """Test that our grader accepts a known good question."""
    result = await grader.grade_question(good_question_example)
    
    assert result["passed"] == True
    assert result["score"] >= 0.99  # We want 99% confidence
    assert result["feedback"] is None  # No feedback needed for passing questions

@pytest.mark.asyncio
async def test_grader_rejects_bad_questions(grader, bad_questions):
    """Test that our grader rejects questions with known issues."""
    for bad_question in bad_questions:
        result = await grader.grade_question(bad_question)
        
        assert result["passed"] == False
        assert bad_question["expected_failure"] in result["feedback"].lower()
        assert result["score"] == 0.0

@pytest.mark.asyncio
async def test_grader_precision(grader, good_question_example, bad_questions):
    """Test that our grader maintains 99% precision."""
    # Run all questions through grader
    results = {
        "true_positives": 0,
        "false_positives": 0,
        "true_negatives": 0,
        "false_negatives": 0
    }
    
    # Test good question
    good_result = await grader.grade_question(good_question_example)
    if good_result["passed"]:
        results["true_positives"] += 1
    else:
        results["false_negatives"] += 1
    
    # Test bad questions
    for bad_question in bad_questions:
        bad_result = await grader.grade_question(bad_question)
        if bad_result["passed"]:
            results["false_positives"] += 1
        else:
            results["true_negatives"] += 1
    
    # Calculate precision
    precision = results["true_positives"] / (results["true_positives"] + results["false_positives"])
    assert precision >= 0.99, "Grader precision must be at least 99%" 