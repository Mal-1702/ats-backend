from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os

from app.services.resume_parser import parse_resume
from app.services.scorer import score_resume
from app.db.crud import (
    get_job_by_id,
    get_all_resume_files,
    upsert_ranking
)
from app.services.job_ranker import rank_resumes_for_job
from app.db.crud import get_rankings_for_job


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

@router.post("/rank/job/{job_id}", tags=["Ranking"])
def rank_job(job_id: int):
    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    resumes = get_all_resume_files()
    if not resumes:
        return {"message": "No resumes found", "results": []}

    results = rank_resumes_for_job(job, resumes)

    # Persist results
    for r in results:
        upsert_ranking(job_id, r["resume_id"], r["score"])

    return {
        "job_id": job_id,
        "ranked_resumes": results
    }

@router.get("/rank/job/{job_id}", tags=["Ranking"])
def get_job_rankings(job_id: int):
    rows = get_rankings_for_job(job_id)

    if not rows:
        return {"job_id": job_id, "ranked_resumes": []}

    return {
        "job_id": job_id,
        "ranked_resumes": [
            {
                "resume_id": r[0],
                "filename": r[1],
                "score": r[2],
                "ranked_at": r[3]
            }
            for r in rows
        ]
    }
