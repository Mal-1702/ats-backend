from fastapi import APIRouter
from app.models.job import JobCreate, JobOut
from app.db.crud import insert_job, get_all_jobs

router = APIRouter()


@router.post("/jobs", response_model=dict, tags=["Jobs"])
def create_job(job: JobCreate):
    """
    Create a new job.
    """
    job_id = insert_job(job)

    return {
        "message": "Job created successfully",
        "job_id": job_id
    }


@router.get("/jobs", response_model=list[JobOut], tags=["Jobs"])
def list_jobs():
    """
    List all jobs.
    """
    rows = get_all_jobs()

    return [
        JobOut(
            id=row[0],
            title=row[1],
            skills=row[2],
            keywords=row[3],
            min_experience=row[4],
            created_at=row[5]
        )
        for row in rows
    ]
