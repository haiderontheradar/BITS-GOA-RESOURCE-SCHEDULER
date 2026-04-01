from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router as ai_router

app = FastAPI(
    title="BITS Campus IRS - AI Agent",
    description="Predictive Resource Analytics Agent (Smart Clerk)",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Since it's internal to the docker network, * is acceptable for MVP
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router, prefix="")

@app.get("/")
def read_root():
    return {"status": "healthy", "service": "IRS Predict Analytics Agent"}
