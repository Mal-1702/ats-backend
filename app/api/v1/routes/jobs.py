from fastapi import APIRouter, HTTPException, Depends, status
from app.models.job import JobCreate, JobOut, SkillWithPriority, priority_to_level
from app.db.crud import (
    insert_job,
    get_all_jobs,
    get_job_by_id,
    toggle_job_status,
    delete_job,
    update_job_skills,
)
from app.core.security import get_current_user
from typing import List
import json

router = APIRouter()


def _parse_skill_priorities(raw) -> list:
    """Deserialise skill_priorities from DB (JSONB -> list of dicts)."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return []
    return []


def _row_to_jobout(row) -> JobOut:
    """Convert a DB row tuple to a JobOut model, safe for 7 or 8 columns."""
    skill_priorities = _parse_skill_priorities(row[7]) if len(row) > 7 else []
    return JobOut(
        id=row[0],
        title=row[1],
        skills=row[2] or [],
        skill_priorities=skill_priorities or None,
        keywords=row[3] or [],
        min_experience=row[4],
        created_at=row[5],
        is_active=row[6] if len(row) > 6 else True,
    )


@router.post("/jobs", response_model=dict, tags=["Jobs"])
def create_job(
    job: JobCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new job posting with optional per-skill priority weights.
    Accepts skill_priorities as a list of { skill, priority, importance_level }.
    """
    job_id = insert_job(job)

    # Build the skill_priority_map for downstream processing
    priority_map = job.get_skill_priority_map()

    job_data = {
        "title":           job.title,
        "skills":          job.skills,
        "keywords":        job.keywords or [],
        "min_experience":  job.min_experience,
        "skill_priorities": priority_map,
    }

    task_id = None
    try:
        from app.workers.tasks import process_job_task
        task = process_job_task.delay(job_id, job_data)
        task_id = task.id
    except Exception:
        pass

    return {
        "message":  "Job created successfully",
        "job_id":   job_id,
        "task_id":  task_id,
        "status":   "processing" if task_id else "completed",
    }


@router.get("/jobs", response_model=List[JobOut], tags=["Jobs"])
def list_jobs(current_user: dict = Depends(get_current_user)):
    """List all jobs including skill priorities."""
    rows = get_all_jobs()
    return [_row_to_jobout(row) for row in rows]


@router.get("/jobs/{job_id}", response_model=JobOut, tags=["Jobs"])
def get_job(
    job_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific job by ID."""
    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return _row_to_jobout(job)


@router.patch("/jobs/{job_id}/status", tags=["Jobs"])
def update_job_status(
    job_id: int,
    is_active: bool,
    current_user: dict = Depends(get_current_user)
):
    """Toggle job active/filled status."""
    success = toggle_job_status(job_id, is_active)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return {
        "message":   f"Job {'activated' if is_active else 'deactivated'} successfully",
        "job_id":    job_id,
        "is_active": is_active,
    }


@router.delete("/jobs/{job_id}", tags=["Jobs"])
def delete_job_endpoint(
    job_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a job by ID."""
    success = delete_job(job_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return {"message": "Job deleted successfully", "job_id": job_id}


@router.patch("/jobs/{job_id}/skills", tags=["Jobs"])
def update_skills_endpoint(
    job_id: int,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Update the skills list (and optional priorities) for a job.
    Payload: { "skills": [...], "skill_priorities": [...] }
    """
    skills = payload.get("skills")
    if skills is None or not isinstance(skills, list):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Payload must contain a 'skills' list",
        )

    success = update_job_skills(job_id, skills)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return {
        "message": "Skills updated successfully",
        "job_id":  job_id,
        "skills":  skills,
    }
