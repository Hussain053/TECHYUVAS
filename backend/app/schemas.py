from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, model_validator, ConfigDict

# ----------------- User Schemas -----------------
class UserBase(BaseModel):
    email: str
    profile_name: Optional[str] = ""

class UserOut(UserBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------- Activity Schemas -----------------
class DailyActivityBase(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD")
    total_screen_time: float = Field(..., ge=0.0, le=24.0)
    work_study_hours: Optional[float] = Field(None, ge=0.0, le=24.0)
    social_media_hours: Optional[float] = Field(None, ge=0.0, le=24.0)
    entertainment_hours: Optional[float] = Field(None, ge=0.0, le=24.0)
    late_night_usage: Optional[float] = Field(None, ge=0.0, le=24.0)
    breaks: Optional[int] = Field(None, ge=0, le=100)
    average_break_minutes: Optional[float] = Field(None, ge=0.0, le=240.0)
    tasks_completed: Optional[int] = Field(None, ge=0, le=1000)
    notes: Optional[str] = Field(None, max_length=1000)
    source: str = Field("user", pattern=r"^(user|demo)$")

    @model_validator(mode="after")
    def validate_totals(self):
        total = self.total_screen_time
        for field_name, label in [
            ("work_study_hours", "Work/Study hours"),
            ("social_media_hours", "Social media hours"),
            ("entertainment_hours", "Entertainment hours"),
            ("late_night_usage", "Late-night hours")
        ]:
            val = getattr(self, field_name)
            if val is not None and val > total:
                raise ValueError(f"{label} ({val}h) cannot exceed total screen time ({total}h).")
        return self

class DailyActivityCreate(DailyActivityBase):
    pass

class DailyActivityUpdate(BaseModel):
    total_screen_time: Optional[float] = Field(None, ge=0.0, le=24.0)
    work_study_hours: Optional[float] = Field(None, ge=0.0, le=24.0)
    social_media_hours: Optional[float] = Field(None, ge=0.0, le=24.0)
    entertainment_hours: Optional[float] = Field(None, ge=0.0, le=24.0)
    late_night_usage: Optional[float] = Field(None, ge=0.0, le=24.0)
    breaks: Optional[int] = Field(None, ge=0, le=100)
    average_break_minutes: Optional[float] = Field(None, ge=0.0, le=240.0)
    tasks_completed: Optional[int] = Field(None, ge=0, le=1000)
    notes: Optional[str] = Field(None, max_length=1000)

class DailyActivityOut(DailyActivityBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------- Mood Schemas -----------------
class MoodCheckInBase(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    recorded_at: datetime
    mood: int = Field(..., ge=1, le=5)
    stress: int = Field(..., ge=1, le=5)
    energy: int = Field(..., ge=1, le=5)
    fatigue: int = Field(..., ge=1, le=5)
    note: Optional[str] = Field("", max_length=500)
    source: str = Field("user", pattern=r"^(user|demo)$")

class MoodCheckInCreate(MoodCheckInBase):
    pass

class MoodCheckInOut(MoodCheckInBase):
    id: str
    user_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------- ML Simulator & Profiling Schemas -----------------
class RoutineSimulationRequest(BaseModel):
    total_screen_time: float = Field(..., ge=0.0, le=24.0, description="Total screen time in hours")
    active_work: float = Field(..., ge=0.0, le=24.0, description="Active work or study hours")
    social_media: float = Field(0.0, ge=0.0, le=24.0, description="Social media hours")
    entertainment: float = Field(0.0, ge=0.0, le=24.0, description="Entertainment hours")
    late_night: float = Field(0.0, ge=0.0, le=24.0, description="Late-night hours")
    break_count: int = Field(0, ge=0, le=100, description="Number of breaks")
    avg_break_duration: int = Field(15, ge=0, le=240, description="Average break length in minutes")
    age_group: str = Field("25-34", description="Age bracket")
    occupation: str = Field("Software Engineer", description="Occupation title")

    @model_validator(mode="after")
    def validate_simulation_consistency(self):
        if self.active_work > self.total_screen_time:
            raise ValueError("Active work hours cannot exceed total screen time.")
        if self.late_night > self.total_screen_time:
            raise ValueError("Late-night hours cannot exceed total screen time.")
        return self

class ConfidenceBand(BaseModel):
    lower: float
    upper: float

class ArchetypeSummary(BaseModel):
    cluster_id: int
    archetype_name: str
    description: str
    distance_to_center: float
    is_routine_drift: bool
    cluster_benchmark_averages: Dict[str, float]

class RoutineSimulationResponse(BaseModel):
    predicted_productivity_score: float
    delta_from_reference: float
    contributing_factors: List[str]
    confidence_band: ConfidenceBand
    archetype: ArchetypeSummary

class HabitProfileRequest(BaseModel):
    total_screen_time: float = Field(..., ge=0.0, le=24.0)
    active_work: float = Field(..., ge=0.0, le=24.0)
    social_media: float = Field(0.0, ge=0.0, le=24.0)
    entertainment: float = Field(0.0, ge=0.0, le=24.0)
    late_night: float = Field(0.0, ge=0.0, le=24.0)
    break_count: int = Field(0, ge=0, le=100)
    avg_break_duration: int = Field(15, ge=0, le=240)
