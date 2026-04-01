from sqlalchemy.orm import Session
from sqlalchemy import text

def optimize_buffer_time(db: Session, threshold_minutes: int = 15) -> dict:
    '''
    Analyzes discrepancy between actual_return_time and end_time.
    Suggests adjustments to buffer_time_minutes in the resource_categories table.
    '''
    # Analyze the average delay for returned items
    query = text('''
        SELECT 
            rc.category_id, 
            rc.category_name, 
            rc.buffer_time_minutes,
            AVG(EXTRACT(EPOCH FROM (b.actual_return_time - b.end_time))/60) as avg_delay_minutes
        FROM bookings b
        JOIN resources r ON b.resource_id = r.resource_id
        JOIN resource_categories rc ON r.category_id = rc.category_id
        WHERE b.actual_return_time IS NOT NULL 
          AND b.actual_return_time > b.end_time
        GROUP BY rc.category_id, rc.category_name, rc.buffer_time_minutes
    ''')
    
    results = db.execute(query).fetchall()
    
    recommendations = []
    
    for row in results:
        category_id = row[0]
        category_name = row[1]
        current_buffer = row[2]
        avg_delay = float(row[3]) if row[3] else 0.0
        
        # If the average delay exceeds the current buffer + a safe threshold, recommend an update
        if avg_delay > (current_buffer + threshold_minutes):
            suggested_buffer = int(avg_delay + threshold_minutes)
            
            recommendations.append({
                "category_id": category_id,
                "category_name": category_name,
                "current_buffer": current_buffer,
                "observed_avg_delay": round(avg_delay, 2),
                "suggested_buffer": suggested_buffer,
                "action": "increase_buffer"
            })
            
    return {
        "status": "success",
        "optimization_suggestions": recommendations
    }
