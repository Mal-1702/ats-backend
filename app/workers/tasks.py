from app.workers.celery_worker import celery_app
from app.db.crud import update_resume_with_profile, update_job_with_profile
import logging

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="process_resume_task")
def process_resume_task(self, resume_id: int, file_path: str):
    """
    Background task to parse and profile a resume.
    Updates the DB record with extracted data once done.
    """
    try:
        self.update_state(state="PROGRESS", meta={"step": "parsing"})

        from app.services.resume_parser import parse_resume
        from app.services.scorer import extract_years_of_experience, extract_skills

        text = parse_resume(file_path)
        experience = extract_years_of_experience(text)
        skills = extract_skills(text)

        candidate_profile = {
            "parsed_text": text,
            "years_of_experience": experience,
            "skills": skills,
            "filename": file_path.split("/")[-1],
        }

        update_resume_with_profile(resume_id, candidate_profile)

        return {"status": "completed", "resume_id": resume_id}

    except Exception as exc:
        logger.error(f"Resume processing failed for resume_id={resume_id}: {exc}")
        raise self.retry(exc=exc, countdown=30, max_retries=3)


@celery_app.task(bind=True, name="process_job_task")
def process_job_task(self, job_id: int, job_data: dict):
    """
    Background task to build a job profile via the AI pipeline.
    """
    try:
        self.update_state(state="PROGRESS", meta={"step": "profiling"})

        from app.orchestration.pipeline import get_pipeline
        pipeline = get_pipeline()
        result = pipeline.process_job_creation(job_data)

        job_profile = result.get("job_profile", {})
        update_job_with_profile(job_id, job_profile)

        return {"status": "completed", "job_id": job_id}

    except Exception as exc:
        logger.error(f"Job processing failed for job_id={job_id}: {exc}")
        raise self.retry(exc=exc, countdown=30, max_retries=3)
