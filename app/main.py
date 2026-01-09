from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import router as v1_router

# Create FastAPI app
app = FastAPI(
    title="Enterprise AI backend",
    description="Enterprise ATS - POC Backend",
    version="1.0.0"
)
app.include_router(v1_router, prefix="/api/v1")

# CORS (important for frontend later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # later restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Health Check Route
# -------------------------
@app.get("/")
def health_check():
    """
    This endpoint is used to check if the backend is running.
    """
    return {
        "status": "OK",
        "message": "ATS backend is running"
    }
