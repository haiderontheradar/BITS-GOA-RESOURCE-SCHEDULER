import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
from statsmodels.tsa.statespace.sarimax import SARIMAX
from datetime import datetime
import warnings

warnings.filterwarnings("ignore") # suppress statsmodels warnings for cleaner API output

def is_fest_date(d: datetime) -> int:
    # Fest mock dates for 2025/2026 Academic Year
    waves_start, waves_end = datetime(2025, 11, 15).date(), datetime(2025, 11, 18).date()
    quark_start, quark_end = datetime(2026, 2, 2).date(), datetime(2026, 2, 5).date()
    spree_start, spree_end = datetime(2026, 3, 20).date(), datetime(2026, 3, 22).date()
    
    current = d.date() if isinstance(d, datetime) else d.date()
    if (waves_start <= current <= waves_end) or \
       (quark_start <= current <= quark_end) or \
       (spree_start <= current <= spree_end):
        return 1
    return 0

def forecast_resource_demand(db: Session, category_name: str, forecast_periods: int = 7, granularity: str = 'daily') -> dict:
    '''
    Time-Series forecasting using SARIMAX with 'is_fest' as an exogenous variable.
    granularity: 'daily' (forecast_periods = days) or 'hourly' (forecast_periods = hours)
    '''
    
    if granularity == 'hourly':
        # Group by Date and Hour
        query = text('''
            SELECT DATE_TRUNC('hour', b.start_time) as booking_time, COUNT(b.booking_id) as demand
            FROM bookings b
            JOIN resources r ON b.resource_id = r.resource_id
            JOIN resource_categories rc ON r.category_id = rc.category_id
            WHERE rc.category_name = :category_name
            AND b.start_time IS NOT NULL
            GROUP BY DATE_TRUNC('hour', b.start_time)
            ORDER BY DATE_TRUNC('hour', b.start_time) ASC
        ''')
    else:
        # Group by Date only
        query = text('''
            SELECT DATE(b.start_time) as booking_time, COUNT(b.booking_id) as demand
            FROM bookings b
            JOIN resources r ON b.resource_id = r.resource_id
            JOIN resource_categories rc ON r.category_id = rc.category_id
            WHERE rc.category_name = :category_name
            AND b.start_time IS NOT NULL
            GROUP BY DATE(b.start_time)
            ORDER BY DATE(b.start_time) ASC
        ''')
        
    result = db.execute(query, {'category_name': category_name}).fetchall()
    
    # Requirement Check
    if len(result) < 14 and granularity == 'daily':
        return {'status': 'error', 'message': 'Insufficient data for Daily SARIMAX (Need 14+ days)'}
    if len(result) < 48 and granularity == 'hourly':
        return {'status': 'error', 'message': 'Insufficient data for Hourly SARIMAX (Need 48+ hours)'}
        
    df = pd.DataFrame(result, columns=['booking_time', 'demand'])
    df['booking_time'] = pd.to_datetime(df['booking_time'])
    df.set_index('booking_time', inplace=True)
    
    # Frequency Resampling
    freq = 'h' if granularity == 'hourly' else 'D'
    df = df.asfreq(freq, fill_value=0)
    
    # Create Exogenous Variable for Historical Data
    df['is_fest'] = [is_fest_date(d) for d in df.index]
    
    # Fit SARIMAX Model
    # Since hourly data has daily seasonality (24) and daily data has weekly seasonality (7)
    seasonal_period = 24 if granularity == 'hourly' else 7
    order = (1, 1, 1) if granularity == 'daily' else (1, 0, 1)
    seasonal_order = (1, 1, 1, seasonal_period) if granularity == 'daily' else (0, 0, 0, 0) # Keep hourly simple to save compute time
    
    try:
        model = SARIMAX(df['demand'], exog=df[['is_fest']], order=order, seasonal_order=seasonal_order)
        fitted_model = model.fit(disp=False)
    except Exception as e:
        return {'status': 'error', 'message': f'Model fitting failed: {str(e)}'}
        
    # Prepare Future Exogenous Variables
    future_dates = pd.date_range(
        start=df.index[-1] + pd.Timedelta(hours=1 if granularity=='hourly' else 24), 
        periods=forecast_periods, 
        freq=freq
    )
    future_exog = pd.DataFrame({
        'is_fest': [is_fest_date(d) for d in future_dates]
    }, index=future_dates)
    
    # Forecast
    forecast = fitted_model.get_forecast(steps=forecast_periods, exog=future_exog)
    forecast_values = forecast.predicted_mean.round().astype(int)
    
    forecast_results = []
    crunch_warnings = []
    
    # Arbitrary Crunch Thresholds
    crunch_threshold = 5 if granularity == 'hourly' else 15
    
    for date, val in zip(future_dates, forecast_values):
        val = max(0, val) # Prevent negative demand
        time_str = date.strftime('%Y-%m-%d %H:00') if granularity == 'hourly' else date.strftime('%Y-%m-%d')
        forecast_results.append({
            'time': time_str, 
            'predicted_demand': int(val),
            'fest_day': future_exog.loc[date, 'is_fest'] == 1
        })
        if val >= crunch_threshold:
            crunch_warnings.append(time_str)
            
    return {
        'status': 'success',
        'category': category_name,
        'granularity': granularity,
        'forecast': forecast_results,
        'crunch_warnings': crunch_warnings,
        'message': f"Potential resource crunch on {len(crunch_warnings)} upcoming slots." if crunch_warnings else "Demand is stable."
    }
