from sqlalchemy.orm import Session
from sqlalchemy import text

def suggest_alternative_resource(db: Session, user_id: int, unavailable_resource_id: int) -> dict:
    '''
    If a Fixed Asset becomes unavailable (e.g., emergency maintenance),
    suggest the "next best" resource based on the user's historical preferences.
    Requires finding a resource in the same category that is currently 'available'.
    '''
    # Find the category of the unavailable resource
    cat_query = text('''
        SELECT category_id FROM resources WHERE resource_id = :resource_id
    ''')
    cat_res = db.execute(cat_query, {'resource_id': unavailable_resource_id}).fetchone()
    
    if not cat_res:
        return {"status": "error", "message": "Resource not found."}
        
    category_id = cat_res[0]
    
    # Simple recommendation engine based on user's past bookings
    rec_query = text('''
        SELECT r.resource_id, r.resource_name, COUNT(b.booking_id) as prior_usage
        FROM resources r
        LEFT JOIN bookings b ON b.resource_id = r.resource_id AND b.user_id = :user_id
        WHERE r.category_id = :category_id AND r.status = 'available'
        GROUP BY r.resource_id, r.resource_name
        ORDER BY prior_usage DESC, r.resource_name ASC
        LIMIT 3
    ''')
    
    alternatives = db.execute(rec_query, {
        'user_id': user_id, 
        'category_id': category_id
    }).fetchall()
    
    if not alternatives:
        return {
            "status": "success", 
            "message": "No available alternative resources in the same category."
        }
    
    return {
        "status": "success",
        "unavailable_resource_id": unavailable_resource_id,
        "recommendations": [
            {
                "resource_id": row[0],
                "resource_name": row[1],
                "user_prior_usage": row[2]
            } for row in alternatives
        ]
    }
