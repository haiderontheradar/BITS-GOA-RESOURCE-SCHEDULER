from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.db.database import get_db

from src.models.forecasting import forecast_resource_demand
from src.models.optimization import optimize_buffer_time
from src.models.anomaly import detect_resource_hoarding, detect_repair_cost_spikes
from src.models.recommendation import suggest_alternative_resource
from src.seed import seed_database

router = APIRouter()

@router.get('/forecast')
def get_demand_forecast(category_name: str, periods: int = 7, granularity: str = 'daily', db: Session = Depends(get_db)):
    """Predict Resource Crunches over the next N periods for a specific category."""
    if granularity not in ['daily', 'hourly']:
        raise HTTPException(status_code=400, detail="Granularity must be 'daily' or 'hourly'")
    return forecast_resource_demand(db, category_name, forecast_periods=periods, granularity=granularity)

@router.get('/optimize-buffers')
def get_buffer_optimizations(threshold: int = 15, db: Session = Depends(get_db)):
    """Analyze disparities in actual vs. expected end times and recommend new buffers."""
    return optimize_buffer_time(db, threshold_minutes=threshold)

@router.get('/anomalies/hoarding')
def check_hoarding(db: Session = Depends(get_db)):
    """Detect if a specific club is monopolizing certain resource categories."""
    return detect_resource_hoarding(db)

@router.get('/anomalies/cost-spikes')
def check_cost_spikes(db: Session = Depends(get_db)):
    """Detect sudden spikes in asset repair costs."""
    return detect_repair_cost_spikes(db)
    
@router.get('/recommend-alternative')
def recommend_alternative(user_id: int, unavailable_resource_id: int, db: Session = Depends(get_db)):
    """Suggest alternative resources if a fixed asset goes under emergency maintenance."""
    return suggest_alternative_resource(db, user_id, unavailable_resource_id)

@router.post('/dev/seed')
def seed_db_endpoint():
    """Wipe DB and seed 6 months of historical data with simulated fests & anomalies."""
    try:
        seed_database()
        return {"status": "success", "message": "Database seeded with 6 months of mock data."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
