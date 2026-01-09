from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create FastAPI app
app = FastAPI(
    title="AI ATS Backend",
    description="Enterprise ATS - POC Backend",
    version="1.0.0"
)

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
