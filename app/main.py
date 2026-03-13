from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import router as v1_router
from app.core.config import get_settings

# Create FastAPI app
app = FastAPI(
    title="Enterprise AI backend",
    description="Enterprise ATS - POC Backend",
    version="1.0.0"
)
app.include_router(v1_router, prefix="/api/v1")

settings = get_settings()

# CORS (important for frontend later)
# We add both the base Vercel domain and the specific preview URL
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://ats-frontend-nfr6r7su-mal-1702s-projects.vercel.app",
    "https://ats-frontend-gamma.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    # In production, we MUST specify origins when allow_credentials=True
    allow_origins=origins if not settings.DEBUG else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    """
    This endpoint is used to check if the backend is running.
    """
    return {
        "status": "OK",
        "message": "ATS backend is running",
        "environment": "production" if not settings.DEBUG else "development"
    }
