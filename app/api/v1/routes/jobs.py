from fastapi import APIRouter, HTTPException, Depends, status
from app.models.job import JobCreate, JobOut
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

router = APIRouter()


@router.post("/jobs", response_model=dict, tags=["Jobs"])
def create_job(
    job: JobCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new job posting. Requires authentication.
    Background profile analysis is attempted asynchronously (best-effort).
    """
    # Always insert core job first — this is the only required DB write
    job_id = insert_job(job)

    # Post-insert processing is best-effort: any failure here must NOT crash this endpoint
    job_data = {
        "title": job.title,
        "skills": job.skills,
        "keywords": job.keywords or [],
        "min_experience": job.min_experience,
    }

    task_id = None
    try:
        from app.workers.tasks import process_job_task
        task = process_job_task.delay(job_id, job_data)
        task_id = task.id
    except Exception:
        # Celery not running or Redis unavailable — silently ignore
        pass

    return {
        "message": "Job created successfully",
        "job_id": job_id,
        "task_id": task_id,
        "status": "processing" if task_id else "completed",
    }


@router.get("/jobs", response_model=List[JobOut], tags=["Jobs"])
def list_jobs(current_user: dict = Depends(get_current_user)):
    """List all jobs. Requires authentication."""
    rows = get_all_jobs()

    return [
        JobOut(
            id=row[0],
            title=row[1],
            skills=row[2],
            keywords=row[3],
            min_experience=row[4],
            created_at=row[5],
            is_active=row[6],
        )
        for row in rows
    ]


@router.get("/jobs/{job_id}", response_model=JobOut, tags=["Jobs"])
def get_job(
    job_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific job by ID. Requires authentication."""
    job = get_job_by_id(job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    return JobOut(
        id=job[0],
        title=job[1],
        skills=job[2],
        keywords=job[3],
        min_experience=job[4],
        created_at=job[5],
        is_active=job[6] if len(job) > 6 else True,
    )


@router.patch("/jobs/{job_id}/status", tags=["Jobs"])
def update_job_status(
    job_id: int,
    is_active: bool,
    current_user: dict = Depends(get_current_user)
):
    """Toggle job active/filled status. Requires authentication."""
    success = toggle_job_status(job_id, is_active)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    return {
        "message": f"Job {'activated' if is_active else 'deactivated'} successfully",
        "job_id": job_id,
        "is_active": is_active,
    }


@router.delete("/jobs/{job_id}", tags=["Jobs"])
def delete_job_endpoint(
    job_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a job by ID. Requires authentication."""
    success = delete_job(job_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    return {
        "message": "Job deleted successfully",
        "job_id": job_id,
    }


@router.patch("/jobs/{job_id}/skills", tags=["Jobs"])
def update_skills_endpoint(
    job_id: int,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Update the skills list for a job.
    Payload: { "skills": ["skill1", "skill2", ...] }
    Requires authentication.
    """
    skills = payload.get("skills")
    if skills is None or not isinstance(skills, list):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Payload must contain a 'skills' list",
        )

    success = update_job_skills(job_id, skills)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    return {
        "message": "Skills updated successfully",
        "job_id": job_id,
        "skills": skills,
    }
