import json
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import RoutineSimulation, User
from backend.app.schemas import (
    RoutineSimulationRequest,
    RoutineSimulationResponse,
    HabitProfileRequest,
    ArchetypeSummary
)
from backend.app.dependencies import get_current_user
from backend.ml.inference import simulate_routine, profile_habit

router = APIRouter(prefix="/ml", tags=["Machine Learning"])

METRICS_PATH = Path(__file__).resolve().parent.parent.parent / "ml" / "artifacts" / "metrics.json"

@router.post("/simulate", response_model=RoutineSimulationResponse)
def run_simulation(
    sim_in: RoutineSimulationRequest,
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        sim_result = simulate_routine(
            total_screen_time=sim_in.total_screen_time,
            active_work=sim_in.active_work,
            social_media=sim_in.social_media,
            entertainment=sim_in.entertainment,
            late_night=sim_in.late_night,
            break_count=sim_in.break_count,
            avg_break_duration=sim_in.avg_break_duration,
            age_group=sim_in.age_group,
            occupation=sim_in.occupation
        )

        profile_result = profile_habit(
            total_screen_time=sim_in.total_screen_time,
            active_work=sim_in.active_work,
            social_media=sim_in.social_media,
            entertainment=sim_in.entertainment,
            late_night=sim_in.late_night,
            break_count=sim_in.break_count,
            avg_break_duration=sim_in.avg_break_duration
        )

        # Optional simulation audit record persistence if user is resolved
        if user:
            record = RoutineSimulation(
                user_id=user.id,
                total_screen_time=sim_in.total_screen_time,
                active_work=sim_in.active_work,
                social_media=sim_in.social_media,
                entertainment=sim_in.entertainment,
                late_night=sim_in.late_night,
                break_count=sim_in.break_count,
                avg_break_duration=sim_in.avg_break_duration,
                predicted_productivity_score=sim_result["predicted_productivity_score"],
                archetype_name=profile_result["archetype_name"]
            )
            db.add(record)
            db.commit()

        return RoutineSimulationResponse(
            predicted_productivity_score=sim_result["predicted_productivity_score"],
            delta_from_reference=sim_result["delta_from_reference"],
            contributing_factors=sim_result["contributing_factors"],
            confidence_band=sim_result["confidence_band"],
            archetype=ArchetypeSummary(
                cluster_id=profile_result["cluster_id"],
                archetype_name=profile_result["archetype_name"],
                description=profile_result["description"],
                distance_to_center=profile_result["distance_to_center"],
                is_routine_drift=profile_result["is_routine_drift"],
                cluster_benchmark_averages=profile_result["cluster_benchmark_averages"]
            )
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Routine simulation failed: {str(e)}"
        )

@router.post("/profile", response_model=ArchetypeSummary)
def run_habit_profile(profile_in: HabitProfileRequest):
    try:
        res = profile_habit(
            total_screen_time=profile_in.total_screen_time,
            active_work=profile_in.active_work,
            social_media=profile_in.social_media,
            entertainment=profile_in.entertainment,
            late_night=profile_in.late_night,
            break_count=profile_in.break_count,
            avg_break_duration=profile_in.avg_break_duration
        )
        return ArchetypeSummary(
            cluster_id=res["cluster_id"],
            archetype_name=res["archetype_name"],
            description=res["description"],
            distance_to_center=res["distance_to_center"],
            is_routine_drift=res["is_routine_drift"],
            cluster_benchmark_averages=res["cluster_benchmark_averages"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Habit profiling failed: {str(e)}"
        )

@router.get("/metrics")
def get_ml_metrics():
    if not METRICS_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model metrics artifact not found."
        )
    with open(METRICS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)
