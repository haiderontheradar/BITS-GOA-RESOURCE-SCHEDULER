import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Get DATABASE_URL from generic environment variable or explicitly for postgresql
DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "postgresql://irsadmin:irspassword@localhost:5432/irsdb"
)

# SQLAlchemy instance setup
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
