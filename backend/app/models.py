import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    DateTime,
    ForeignKey,
    Boolean,
    Text,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    profile_name = Column(String(100), default="", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    activities = relationship("DailyActivity", back_populates="user", cascade="all, delete-orphan")
    mood_checkins = relationship("MoodCheckIn", back_populates="user", cascade="all, delete-orphan")
    simulations = relationship("RoutineSimulation", back_populates="user", cascade="all, delete-orphan")

class DailyActivity(Base):
    __tablename__ = "daily_activities"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    total_screen_time = Column(Float, nullable=False)
    work_study_hours = Column(Float, nullable=True)
    social_media_hours = Column(Float, nullable=True)
    entertainment_hours = Column(Float, nullable=True)
    late_night_usage = Column(Float, nullable=True)
    breaks = Column(Integer, nullable=True)
    average_break_minutes = Column(Float, nullable=True)
    tasks_completed = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(String(20), default="user", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="activities")

    __table_args__ = (
        UniqueConstraint("user_id", "date", "source", name="uq_user_date_activity"),
    )

class MoodCheckIn(Base):
    __tablename__ = "mood_checkins"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    mood = Column(Integer, nullable=False)
    stress = Column(Integer, nullable=False)
    energy = Column(Integer, nullable=False)
    fatigue = Column(Integer, nullable=False)
    note = Column(Text, default="", nullable=False)
    source = Column(String(20), default="user", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="mood_checkins")

class RoutineSimulation(Base):
    __tablename__ = "routine_simulations"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    total_screen_time = Column(Float, nullable=False)
    active_work = Column(Float, nullable=False)
    social_media = Column(Float, nullable=False)
    entertainment = Column(Float, nullable=False)
    late_night = Column(Float, nullable=False)
    break_count = Column(Integer, nullable=False)
    avg_break_duration = Column(Integer, nullable=False)
    predicted_productivity_score = Column(Float, nullable=False)
    archetype_name = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="simulations")
