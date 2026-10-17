from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import DailyActivity, User
from backend.app.schemas import DailyActivityCreate, DailyActivityUpdate, DailyActivityOut
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/activities", tags=["Activities"])

@router.get("", response_model=List[DailyActivityOut])
def list_activities(
    start_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    source: str = Query("user", pattern=r"^(user|demo)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(DailyActivity).filter(
        DailyActivity.user_id == user.id,
        DailyActivity.source == source
    )
    if start_date:
        query = query.filter(DailyActivity.date >= start_date)
    if end_date:
        query = query.filter(DailyActivity.date <= end_date)
    return query.order_by(DailyActivity.date.asc()).all()

@router.post("", response_model=DailyActivityOut, status_code=status.HTTP_201_CREATED)
def create_or_update_activity(
    activity_in: DailyActivityCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Upsert logic per user, date, source
    existing = db.query(DailyActivity).filter(
        DailyActivity.user_id == user.id,
        DailyActivity.date == activity_in.date,
        DailyActivity.source == activity_in.source
    ).first()

    if existing:
        for field, value in activity_in.model_dump().items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    new_activity = DailyActivity(
        user_id=user.id,
        **activity_in.model_dump()
    )
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    return new_activity

@router.get("/{activity_id}", response_model=DailyActivityOut)
def get_activity(
    activity_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    activity = db.query(DailyActivity).filter(
        DailyActivity.id == activity_id,
        DailyActivity.user_id == user.id
    ).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity entry not found.")
    return activity

@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    activity = db.query(DailyActivity).filter(
        DailyActivity.id == activity_id,
        DailyActivity.user_id == user.id
    ).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity entry not found.")
    db.delete(activity)
    db.commit()
    return None
