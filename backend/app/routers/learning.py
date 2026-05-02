import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from app.deps import get_current_user
from app.models.user import User
from app.services.gemini_service import GeminiService, LearningPath, SkillCourseRecommendations

router = APIRouter()

@router.get("/path/{skill_name}", response_model=LearningPath)
async def get_learning_path(
    skill_name: str,
    current_prof: float = 1.0,
    target_prof: float = 4.0,
    current_user: User = Depends(get_current_user)
):
    path = GeminiService.generate_learning_path(skill_name, current_prof, target_prof)
    if not path:
        raise HTTPException(status_code=500, detail="Failed to generate learning path")
    return path

@router.get("/courses/{skill_name}", response_model=SkillCourseRecommendations)
async def get_course_suggestions(
    skill_name: str,
    role_title: str = Query(default="Professional"),
    current_user: User = Depends(get_current_user)
):
    """
    Dynamically suggests courses for a specific skill based on the employee's role.
    """
    courses = GeminiService.suggest_courses(skill_name, role_title)
    if not courses:
        raise HTTPException(status_code=500, detail="Failed to generate course suggestions")
    return courses
