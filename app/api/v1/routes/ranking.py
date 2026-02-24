"""
Ranking routes — score all resumes against a job, store full analysis,
and return structured shortlist with candidate insights.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os
import json
import logging

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
logger = logging.getLogger(__name__)


class JobRequest(BaseModel):
    filename: str
    skills: list[str]
    keywords: list[str] = []
    min_experience: float = 0


# ─────────────────────────────────────────────
# POST /rank-resume — Score a single resume
# ─────────────────────────────────────────────

@router.post("/rank-resume", tags=["Ranking"])
def rank_resume(
    job: JobRequest,
    current_user: dict = Depends(get_current_user),
):
    """Score a single uploaded resume against provided job requirements."""
    resume_path = os.path.join("uploads", job.filename)
    if not os.path.exists(resume_path):
        raise HTTPException(status_code=404, detail=f"Resume '{job.filename}' not found")

    try:
        resume_text = parse_resume(resume_path)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = score_resume(
        resume_text,
        {"skills": job.skills, "keywords": job.keywords, "min_experience": job.min_experience},
    )
    return {"filename": job.filename, "result": result}


# ─────────────────────────────────────────────
# POST /rank/job/{job_id} — Trigger full ranking
# ─────────────────────────────────────────────

@router.post("/rank/job/{job_id}", tags=["Ranking"])
def rank_job(
    job_id: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Score ALL uploaded resumes against `job_id`, store results with full
    breakdown and insights, and return ranked list.
    """
    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    resumes = get_all_resume_files()
    if not resumes:
        return {"message": "No resumes uploaded yet", "results": [], "ranked_count": 0}

    results = rank_resumes_for_job(job, resumes)

    # Persist each result with full JSON
    for r in results:
        upsert_ranking(
            job_id=job_id,
            resume_id=r["resume_id"],
            score=r["score"],
            breakdown=r.get("breakdown"),
            insights=r.get("insights"),
        )

    logger.info("Ranked %d resumes for job %d", len(results), job_id)

    return {
        "job_id":       job_id,
        "ranked_count": len(results),
        "message":      f"Successfully ranked {len(results)} candidate(s)",
        "results": [
            {
                "resume_id":       r["resume_id"],
                "filename":        r["filename"],
                "score":           r["score"],
                "breakdown":       r.get("breakdown"),
                "matched_skills":  r.get("matched_skills", []),
                "missing_skills":  r.get("missing_skills", []),
                "recommendation":  r.get("insights", {}).get("recommendation", ""),
            }
            for r in results
        ],
    }


# ─────────────────────────────────────────────
# GET /rank/job/{job_id} — Raw rankings
# ─────────────────────────────────────────────

@router.get("/rank/job/{job_id}", tags=["Ranking"])
def get_job_rankings(
    job_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Return raw stored rankings for a job."""
    rows = get_rankings_for_job(job_id)
    if not rows:
        return {"job_id": job_id, "ranked_resumes": []}

    return {
        "job_id": job_id,
        "ranked_resumes": [
            {
                "resume_id": r[0],
                "filename":  r[1],
                "score":     r[2],
                "ranked_at": str(r[3]),
            }
            for r in rows
        ],
    }


# ─────────────────────────────────────────────
# GET /rank/job/{job_id}/shortlist — Rich shortlist
# ─────────────────────────────────────────────

def _assign_tier(score: int) -> str:
    """
    Tier classification aligned with new scoring engine v2.
    90+ → A (Strong Hire)
    75+ → B (Good Fit)
    60+ → C (Moderate)
    <60 → D (Weak Fit)
    """
    if score >= 90: return "A"
    if score >= 75: return "B"
    if score >= 60: return "C"
    return "D"


def _parse_json_field(field):
    """Safely parse a JSONB field that may be a dict or a JSON string."""
    if field is None:
        return None
    if isinstance(field, dict):
        return field
    try:
        return json.loads(field)
    except Exception:
        return None


@router.get("/rank/job/{job_id}/shortlist", tags=["Ranking"])
def get_job_shortlist(
    job_id: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Return full shortlist with tier, breakdown, and AI insights per candidate.
    This is the endpoint used by the RankedCandidates page.
    """
    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    rows = get_rankings_for_job(job_id)   # (resume_id, filename, score, created_at, breakdown, insights)

    if not rows:
        return {
            "job_id":         job_id,
            "shortlist":      [],
            "shortlist_size": 0,
            "message":        "No rankings yet. Click 'Trigger Ranking' to start matching.",
            "recommendations": None,
        }

    shortlist = []
    for r in rows:
        resume_id   = r[0]
        filename    = r[1]
        score       = r[2]
        ranked_at   = str(r[3])
        breakdown   = _parse_json_field(r[4]) if len(r) > 4 else None
        insights    = _parse_json_field(r[5]) if len(r) > 5 else None

        tier = _assign_tier(score)

        # Extract skill arrays from insights (stored as embedded JSON)
        matched_skills    = insights.get("matched_skills", [])   if insights else []
        missing_skills    = insights.get("missing_skills", [])   if insights else []
        bonus_skills      = insights.get("bonus_skills", [])     if insights else []
        candidate_skills  = insights.get("candidate_skills", {}) if insights else {}

        candidate = {
            "resume_id":          resume_id,
            "candidate_filename": filename,
            "final_score":        score,
            "tier":               tier,
            "ranked_at":          ranked_at,
            # Score breakdown bars
            "breakdown": breakdown or {
                "skill_match":      0,
                "keyword_match":    0,
                "experience_score": 0,
                "experience_years": 0,
            },
            # Skills sections
            "matched_skills":    matched_skills,
            "missing_skills":    missing_skills,
            "bonus_skills":      bonus_skills,
            "candidate_skills":  candidate_skills,   # {languages, frameworks, databases, tools}
            # AI insights
            "key_strengths":     insights.get("key_strengths", [])    if insights else [],
            "gaps":              insights.get("gaps", [])              if insights else [],
            "reasoning":         insights.get("reasoning", "")        if insights else "",
            "recommendation":    insights.get("recommendation", "")   if insights else "",
        }
        shortlist.append(candidate)


    # shortlist is already sorted by score DESC from DB query
    tier_a = [c for c in shortlist if c["tier"] == "A"]
    avg_score = round(
        sum(c["final_score"] for c in shortlist) / len(shortlist)
    ) if shortlist else 0

    # Top-level recommendations summary
    if tier_a:
        ai_summary = (
            f"{len(tier_a)} top-tier candidate(s) scored 80+ and are strongly recommended for interview. "
            f"Average ATS score across all {len(shortlist)} candidate(s): {avg_score}."
        )
    else:
        ai_summary = (
            f"No top-tier candidates yet. Average score: {avg_score}. "
            f"Consider broadening required skills or uploading more resumes."
        )

    return {
        "job_id":          job_id,
        "shortlist":       shortlist,
        "shortlist_size":  len(shortlist),
        "recommendations": ai_summary,
    }


# ─────────────────────────────────────────────
# GET /rank/job/{job_id}/full-report
# ─────────────────────────────────────────────

@router.get("/rank/job/{job_id}/full-report", tags=["Ranking"])
def get_full_report(
    job_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Detailed ranking report with full breakdown per candidate."""
    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    rows = get_rankings_for_job(job_id)

    return {
        "job_id":        job_id,
        "job_title":     job[1],
        "total_ranked":  len(rows),
        "candidates": [
            {
                "resume_id": r[0],
                "filename":  r[1],
                "score":     r[2],
                "ranked_at": str(r[3]),
                "breakdown": _parse_json_field(r[4]) if len(r) > 4 else None,
                "insights":  _parse_json_field(r[5]) if len(r) > 5 else None,
            }
            for r in rows
        ],
    }
