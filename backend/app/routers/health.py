from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.database import get_db
from backend.ml.inference import get_regressor, get_clusterer

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_healthy = False
    try:
        db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception:
        db_healthy = False

    regressor_ready = get_regressor() is not None
    clusterer_ready = get_clusterer() is not None

    return {
        "status": "healthy" if db_healthy and regressor_ready and clusterer_ready else "degraded",
        "database": "connected" if db_healthy else "disconnected",
        "ml_models": {
            "regression_pipeline": "loaded" if regressor_ready else "unavailable",
            "clustering_pipeline": "loaded" if clusterer_ready else "unavailable"
        },
        "service": "MindTrace Backend API",
        "version": "1.0.0"
    }
