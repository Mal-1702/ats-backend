from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os

from app.services.resume_parser import parse_resume
from app.services.scorer import score_resume

router = APIRouter()

# -------------------------
# Request Schema
# -------------------------

class JobRequest(BaseModel):
    filename: str              # uploaded resume filename
    skills: list[str]
    keywords: list[str] = []
    min_experience: float = 0


# -------------------------
# Rank Resume API
# -------------------------

@router.post("/rank-resume", tags=["Ranking"])
def rank_resume(job: JobRequest):
    """
    Rank an already uploaded resume based on job requirements
    """

    # Build resume path
    resume_path = os.path.join("uploads", job.filename)

    if not os.path.exists(resume_path):
        raise HTTPException(
            status_code=404,
            detail=f"Resume '{job.filename}' not found in uploads folder"
        )

    # Parse resume
    try:
        resume_text = parse_resume(resume_path)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(
        status_code=400,
        detail=str(e)
    )

    # Score resume
    result = score_resume(
        resume_text,
        {
            "skills": job.skills,
            "keywords": job.keywords,
            "min_experience": job.min_experience
        }
    )

    return {
        "filename": job.filename,
        "result": result
    }
