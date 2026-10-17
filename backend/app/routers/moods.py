from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import MoodCheckIn, User
from backend.app.schemas import MoodCheckInCreate, MoodCheckInOut
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/moods", tags=["Mood Check-Ins"])

@router.get("", response_model=List[MoodCheckInOut])
def list_mood_checkins(
    start_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    source: str = Query("user", pattern=r"^(user|demo)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(MoodCheckIn).filter(
        MoodCheckIn.user_id == user.id,
        MoodCheckIn.source == source
    )
    if start_date:
        query = query.filter(MoodCheckIn.date >= start_date)
    if end_date:
        query = query.filter(MoodCheckIn.date <= end_date)
    return query.order_by(MoodCheckIn.recorded_at.asc()).all()

@router.post("", response_model=MoodCheckInOut, status_code=status.HTTP_201_CREATED)
def create_mood_checkin(
    checkin_in: MoodCheckInCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_checkin = MoodCheckIn(
        user_id=user.id,
        **checkin_in.model_dump()
    )
    db.add(new_checkin)
    db.commit()
    db.refresh(new_checkin)
    return new_checkin

@router.get("/{checkin_id}", response_model=MoodCheckInOut)
def get_mood_checkin(
    checkin_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    checkin = db.query(MoodCheckIn).filter(
        MoodCheckIn.id == checkin_id,
        MoodCheckIn.user_id == user.id
    ).first()
    if not checkin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mood check-in not found.")
    return checkin

@router.delete("/{checkin_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mood_checkin(
    checkin_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    checkin = db.query(MoodCheckIn).filter(
        MoodCheckIn.id == checkin_id,
        MoodCheckIn.user_id == user.id
    ).first()
    if not checkin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mood check-in not found.")
    db.delete(checkin)
    db.commit()
    return None
