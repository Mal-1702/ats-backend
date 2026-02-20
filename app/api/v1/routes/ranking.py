from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os

from app.services.resume_parser import parse_resume
from app.services.scorer import score_resume
from app.db.crud import (
    get_job_by_id,
    get_all_resume_files,
    upsert_ranking,
    get_rankings_for_job,
)
from app.services.job_ranker import rank_resumes_for_job
from app.core.security import get_current_user


router = APIRouter()


class JobRequest(BaseModel):
    filename: str
    skills: list[str]
    keywords: list[str] = []
    min_experience: float = 0


@router.post("/rank-resume", tags=["Ranking"])
def rank_resume(
    job: JobRequest,
    current_user: dict = Depends(get_current_user)
):
    """Rank a single uploaded resume against job requirements."""
    resume_path = os.path.join("uploads", job.filename)

    if not os.path.exists(resume_path):
        raise HTTPException(
            status_code=404,
            detail=f"Resume '{job.filename}' not found in uploads folder",
        )

    try:
        resume_text = parse_resume(resume_path)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = score_resume(
        resume_text,
        {
            "skills": job.skills,
            "keywords": job.keywords,
            "min_experience": job.min_experience,
        },
    )

    return {"filename": job.filename, "result": result}


@router.post("/rank/job/{job_id}", tags=["Ranking"])
def rank_job(
    job_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Trigger ranking of all resumes against a job."""
    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    resumes = get_all_resume_files()
    if not resumes:
        return {"message": "No resumes found", "results": []}

    results = rank_resumes_for_job(job, resumes)

    for r in results:
        upsert_ranking(job_id, r["resume_id"], r["score"])

    return {
        "job_id": job_id,
        "message": f"Ranked {len(results)} candidates",
        "ranked_resumes": results,
    }


@router.get("/rank/job/{job_id}", tags=["Ranking"])
def get_job_rankings(
    job_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get stored rankings for a job."""
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
                "ranked_at": str(r[3]),
            }
            for r in rows
        ],
    }


@router.get("/rank/job/{job_id}/shortlist", tags=["Ranking"])
def get_job_shortlist(
    job_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Get shortlisted candidates for a job in the format the frontend expects.
    Returns shortlist with tier classification and summary stats.
    """
    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    rows = get_rankings_for_job(job_id)

    if not rows:
        return {
            "job_id": job_id,
            "shortlist": [],
            "shortlist_size": 0,
            "message": "No rankings yet. Click 'Trigger Ranking' to start matching.",
            "recommendations": None,
        }

    def assign_tier(score: int) -> str:
        if score >= 80:
            return "A"
        elif score >= 60:
            return "B"
        elif score >= 40:
            return "C"
        return "D"

    shortlist = [
        {
            "resume_id": r[0],
            "filename": r[1],
            "final_score": r[2],
            "tier": assign_tier(r[2]),
            "ranked_at": str(r[3]),
        }
        for r in rows
    ]

    # Sort by score descending
    shortlist.sort(key=lambda x: x["final_score"], reverse=True)

    tier_a_count = sum(1 for c in shortlist if c["tier"] == "A")
    avg_score = round(sum(c["final_score"] for c in shortlist) / len(shortlist)) if shortlist else 0

    recommendations = None
    if tier_a_count > 0:
        recommendations = (
            f"{tier_a_count} top-tier candidate(s) scored 80+ and are strongly recommended for interview. "
            f"Average score across all {len(shortlist)} candidates: {avg_score}."
        )
    elif shortlist:
        recommendations = (
            f"No top-tier candidates found yet. Average score: {avg_score}. "
            f"Consider uploading more resumes or broadening the required skills."
        )

    return {
        "job_id": job_id,
        "shortlist": shortlist,
        "shortlist_size": len(shortlist),
        "recommendations": recommendations,
    }


@router.get("/rank/job/{job_id}/full-report", tags=["Ranking"])
def get_full_report(
    job_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get full detailed ranking report for a job."""
    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    rows = get_rankings_for_job(job_id)

    return {
        "job_id": job_id,
        "job_title": job[1],
        "total_ranked": len(rows),
        "candidates": [
            {
                "resume_id": r[0],
                "filename": r[1],
                "score": r[2],
                "ranked_at": str(r[3]),
            }
            for r in rows
        ],
    }
