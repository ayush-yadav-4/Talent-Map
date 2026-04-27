import uuid
from fastapi import APIRouter, Depends, HTTPException
from app.deps import get_current_user
from app.models.user import User
from app.services.gemini_service import GeminiService, LearningPath

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
