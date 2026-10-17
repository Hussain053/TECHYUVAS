from fastapi import APIRouter, Depends
from backend.app.schemas import UserOut
from backend.app.models import User
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserOut)
def get_current_user_profile(user: User = Depends(get_current_user)):
    return user
