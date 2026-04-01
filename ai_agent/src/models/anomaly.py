from sqlalchemy.orm import Session
from sqlalchemy import text
from sklearn.ensemble import IsolationForest
import pandas as pd
import numpy as np

def detect_resource_hoarding(db: Session) -> dict:
    '''
    Detects if a single club is monopolizing a category (Hoarding).
    A simple statistical anomaly detection (Z-score approach)
    '''
    query = text('''
        SELECT c.club_name, rc.category_name, COUNT(b.booking_id) as total_bookings
        FROM bookings b
        JOIN users u ON b.user_id = u.user_id
        JOIN clubs c ON u.club_id = c.club_id
        JOIN resources r ON b.resource_id = r.resource_id
        JOIN resource_categories rc ON r.category_id = rc.category_id
        GROUP BY c.club_name, rc.category_name
    ''')
    
    results = db.execute(query).fetchall()
    
    if len(results) < 5:
        return {"status": "success", "message": "Not enough data to detect hoarding."}
        
    df = pd.DataFrame(results, columns=['club_name', 'category_name', 'total_bookings'])
    
    # Calculate Z-score for bookings within each category
    df['z_score'] = df.groupby('category_name')['total_bookings'].transform(
        lambda x: (x - x.mean()) / x.std() if x.std() > 0 else 0
    )
    
    # Threshold for anomaly (e.g. Z-score > 2.0 means they book significantly more than average)
    hoarders = df[df['z_score'] > 2.0]
    
    return {
        "status": "success",
        "hoarding_alerts": hoarders.to_dict(orient='records')
    }

def detect_repair_cost_spikes(db: Session) -> dict:
    '''
    Uses IsolationForest to find sudden spikes in repair_cost from maintenance_logs.
    '''
    query = text('''
        SELECT log_id, resource_id, repair_cost, completion_date
        FROM maintenance_logs
        WHERE repair_cost IS NOT NULL AND repair_cost > 0
    ''')
    
    results = db.execute(query).fetchall()
    
    if len(results) < 10:
        return {"status": "success", "message": "Not enough maintenance logs for ML anomaly detection."}
        
    df = pd.DataFrame(results, columns=['log_id', 'resource_id', 'repair_cost', 'completion_date'])
    
    # We use IsolationForest on repair_cost
    model = IsolationForest(contamination=0.05, random_state=42)
    # the input needs to be 2D array
    X = df[['repair_cost']].values 
    
    df['anomaly_score'] = model.fit_predict(X)
    
    # anomalies are marked as -1 in IsolationForest
    spikes = df[df['anomaly_score'] == -1]
    
    return {
        "status": "success",
        "spike_alerts": spikes[['log_id', 'resource_id', 'repair_cost']].to_dict(orient='records')
    }
