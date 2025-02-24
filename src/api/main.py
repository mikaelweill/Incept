from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from src.models.question import Question, InteractionType, Choice, Image, Solution
from src.services.ccc_client import CCCClient, CCCError

app = FastAPI(
    title="Incept API",
    description="API for generating educational content for 8th grade science",
    version="1.0.0"
)

# Initialize clients
ccc_client = CCCClient()

# Models
class Article(BaseModel):
    content: str
    subject: Optional[str] = None
    grade: Optional[int] = None
    standard: Optional[str] = None
    lesson: Optional[str] = None

class GradeResponse(BaseModel):
    passed: bool
    scorecard: dict
    feedback: Optional[str] = None

# 8th grade science standards we support
SUPPORTED_STANDARDS = [
    "MS-PS2-1",  # Newton's Laws
    "MS-PS2-2",  # Forces and Motion
    "MS-PS2-3",  # Factors Affecting Forces
    "MS-PS2-4",  # Gravitational and Magnetic Forces
    "MS-PS2-5"   # Fields
]

# Question endpoints
@app.post("/api/v1/questions/tag", response_model=Question)
async def tag_question(question: Question):
    """Tag a question with subject, grade, standard, lesson, and difficulty."""
    try:
        # Use CCC client to find similar questions
        similar_questions = await ccc_client.find_similar_questions(question.prompt)
        
        if not similar_questions:
            # If no similar questions found, raise an error
            raise CCCError("No similar questions found in CCC database")
            
        # Use the most similar question's metadata
        most_similar = similar_questions[0]
        
        # Update our question with the metadata
        question.subject = most_similar.subject
        question.grade = most_similar.grade
        question.standard = most_similar.standard
        question.lesson = most_similar.lesson
        question.difficulty = most_similar.difficulty
        
        return question
        
    except CCCError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to tag question using CCC API: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error while tagging question: {str(e)}"
        )

@app.post("/api/v1/questions/grade", response_model=GradeResponse)
async def grade_question(question: Question):
    """Grade a question and provide quality feedback."""
    raise HTTPException(status_code=501, detail="Not implemented yet")

@app.post("/api/v1/questions/generate", response_model=Question)
async def generate_question(template: Question):
    """Generate a new question based on provided parameters."""
    raise HTTPException(status_code=501, detail="Not implemented yet")

# Article endpoints
@app.post("/api/v1/articles/tag", response_model=Article)
async def tag_article(article: Article):
    """Tag an article with subject, grade, standard, and lesson."""
    raise HTTPException(status_code=501, detail="Not implemented yet")

@app.post("/api/v1/articles/grade", response_model=GradeResponse)
async def grade_article(article: Article):
    """Grade an article and provide quality feedback."""
    raise HTTPException(status_code=501, detail="Not implemented yet")

@app.post("/api/v1/articles/generate", response_model=Article)
async def generate_article(template: Article):
    """Generate a new article based on provided parameters."""
    raise HTTPException(status_code=501, detail="Not implemented yet") 