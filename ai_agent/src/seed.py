import os
import random
from datetime import datetime, timedelta
from faker import Faker
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text

from src.db.database import SQLALCHEMY_DATABASE_URL

fake = Faker()

def get_fest_multiplier(date: datetime) -> float:
    # Fest dates for the 2025/2026 academic year
    waves_start, waves_end = datetime(2025, 11, 15), datetime(2025, 11, 18)
    quark_start, quark_end = datetime(2026, 2, 2), datetime(2026, 2, 5)
    spree_start, spree_end = datetime(2026, 3, 20), datetime(2026, 3, 22)

    if waves_start <= date <= waves_end:
        return 4.0 # Huge spike for Waves
    elif quark_start <= date <= quark_end:
        return 2.5 # Moderate spike
    elif spree_start <= date <= spree_end:
        return 3.0 # High spike
        
    return 1.0 # Normal day

def is_fest_date(date: datetime) -> int:
    multiplier = get_fest_multiplier(date)
    return 1 if multiplier > 1.0 else 0

def seed_database():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with Session(engine) as db:
        print("Starting seed process... (Cleaning existing data)")
        # Wipe tables
        db.execute(text("TRUNCATE TABLE maintenance_logs, notifications, bookings, resources, users, resource_categories, clubs, departments, roles RESTART IDENTITY CASCADE"))
        db.commit()

        print("Seeding base entities...")
        # 1. Roles
        roles = ['Student', 'Faculty', 'Club Secretary', 'IRS Admin']
        for r in roles:
            db.execute(text("INSERT INTO roles (role_name) VALUES (:r)"), {'r': r})

        # 2. Departments
        depts = ['CS', 'EEE', 'Mechanical', 'Chemical']
        for d in depts:
            db.execute(text("INSERT INTO departments (dept_name) VALUES (:d)"), {'d': d})

        # 3. Clubs
        clubs = [
            ('Coding Club', 'Technical'), 
            ('Dance Club', 'Cultural'), 
            ('Photography Club', 'Creative'),
            ('Drama Club', 'Cultural'),
            ('Sports Council', 'Sports')
        ]
        for c, cat in clubs:
            db.execute(text("INSERT INTO clubs (club_name, category) VALUES (:c, :cat)"), {'c': c, 'cat': cat})

        # 4. Resource Categories
        categories = [
            ('Electronics', 30), # 30 min buffer
            ('Auditoriums', 120),
            ('Rooms', 15),
            ('Sports Equipment', 0)
        ]
        for cn, m in categories:
            db.execute(text("INSERT INTO resource_categories (category_name, buffer_time_minutes) VALUES (:cn, :m)"), {'cn': cn, 'm': m})

        db.commit()

        # 5. Resources
        print("Seeding resources...")
        cat_ids_res = db.execute(text("SELECT category_id, category_name FROM resource_categories")).fetchall()
        cat_map = {row[1]: row[0] for row in cat_ids_res}

        resources = [
            ('DSLR Camera A', 'Electronics', False),
            ('DSLR Camera B', 'Electronics', False),
            ('Projector X', 'Electronics', False),
            ('Main Auditorium', 'Auditoriums', True),
            ('Lecture Hall DL', 'Rooms', True),
            ('Volleyball Net', 'Sports Equipment', False)
        ]
        for name, c_name, fixed in resources:
            db.execute(text('''
                INSERT INTO resources (resource_name, category_id, is_fixed_asset) 
                VALUES (:name, :cid, :fixed)
            '''), {'name': name, 'cid': cat_map[c_name], 'fixed': fixed})
        
        db.commit()

        # 6. Users
        print("Seeding users...")
        for i in range(50):
            db.execute(text('''
                INSERT INTO users (bits_id, full_name, email, password_hash, role_id, club_id, department_id)
                VALUES (:bid, :fn, :em, 'hashed_pw', 1, :cid, 1)
            '''), {
                'bid': f"202{random.randint(1,4)}A7PS{random.randint(100,999)}G",
                'fn': fake.name(),
                'em': fake.email(),
                'cid': random.randint(1, 5)
            })
        db.commit()

        # 7. Bookings & Anomalies
        print("Seeding 6 months of bookings (with fests & hoarding)...")
        users = db.execute(text("SELECT user_id, club_id FROM users")).fetchall()
        res = db.execute(text("SELECT resource_id, category_id FROM resources")).fetchall()
        
        start_date = datetime(2025, 10, 1) # 6 months prior
        end_date = datetime(2026, 4, 1)
        
        current_date = start_date
        while current_date < end_date:
            # Base probability of booking a resource
            base_prob = 0.5
            fest_mult = get_fest_multiplier(current_date)
            
            # Anomaly: Dance club hoards Auditoriums (Say user_id's where club_id = 2)
            # Anomaly: Delayed returns
            
            # Iterate through each hour from 8 AM to 8 PM
            for hour in range(8, 20):
                daily_time = current_date.replace(hour=hour, minute=0)
                
                # Determine how many bookings happen this hour
                traffic = int(random.uniform(0, 2) * fest_mult)
                
                for _ in range(traffic):
                    r_id, rc_id = random.choice(res)
                    u_id, uc_id = random.choice(users)
                    
                    # Hoarding Logic Injection:
                    # If Auditorium (which is rc_id 2), bias it heavily to Dance Club (club 2)
                    if rc_id == 2 and random.random() < 0.7:
                        # Find a user from club 2
                        dance_users = [u for u, c in users if c == 2]
                        if dance_users:
                            u_id = random.choice(dance_users)
                    
                    duration_hours = random.randint(1, 3)
                    start_time = daily_time
                    end_time = start_time + timedelta(hours=duration_hours)
                    
                    # Buffer delay logic
                    # Usually returned on time, but sometimes delayed
                    actual_return_time = end_time
                    if random.random() < 0.3: # 30% chance returned late
                        actual_return_time += timedelta(minutes=random.randint(5, 45))
                    
                    db.execute(text('''
                        INSERT INTO bookings (user_id, resource_id, request_time, start_time, end_time, actual_return_time, approval_status)
                        VALUES (:u_id, :r_id, :req, :st, :et, :act, 'approved_by_faculty')
                    '''), {
                        'u_id': u_id,
                        'r_id': r_id,
                        'req': start_time - timedelta(days=1),
                        'st': start_time,
                        'et': end_time,
                        'act': actual_return_time
                    })
            
            current_date += timedelta(days=1)
        
        db.commit()

        # 8. Maintenance Logs (Spikes Anomaly)
        print("Seeding maintenance logs...")
        current_date = start_date
        while current_date < end_date:
            if random.random() < 0.05: # Rare maintenance
                r_id = random.choice(res)[0]
                cost = random.randint(500, 2000)
                
                # Introduce Cost Spikes
                if random.random() < 0.1: # 10% of logs are massive spikes
                    cost = random.randint(10000, 25000)
                
                db.execute(text('''
                    INSERT INTO maintenance_logs (resource_id, technician_name, issue_description, repair_cost, completion_date)
                    VALUES (:r, 'Tech A', 'Fixing issues..', :c, :date)
                '''), {'r': r_id, 'c': cost, 'date': current_date + timedelta(days=2)})
            
            current_date += timedelta(days=1)
            
        db.commit()
        print("Seeding Complete!")

if __name__ == "__main__":
    seed_database()
