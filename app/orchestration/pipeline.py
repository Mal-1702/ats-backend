"""
Lightweight orchestration pipeline.
Handles resume and job profiling synchronously when Celery is unavailable.
"""
import logging
from typing import Optional
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ATSPipeline:
    """
    Orchestrates resume parsing and job profiling.
    Used as a synchronous fallback when Celery is not running.
    """

    def process_job_creation(self, job_data: dict) -> dict:
        """
        Build a structured job profile from raw job data.
        """
        try:
            skills = job_data.get("skills", [])
            keywords = job_data.get("keywords", [])
            min_experience = job_data.get("min_experience", 0)

            job_profile = {
                "title": job_data.get("title", ""),
                "required_skills": skills,
                "keywords": keywords,
                "min_experience": min_experience,
                "processed": True,
            }

            return {"job_profile": job_profile}

        except Exception as e:
            logger.error(f"Pipeline error during job creation: {e}")
            return {"job_profile": {}}

    def process_resume(self, resume_id: int, file_path: str) -> dict:
        """
        Parse and profile a resume file synchronously.
        """
        try:
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

            return {"candidate_profile": candidate_profile}

        except Exception as e:
            logger.error(f"Pipeline error during resume processing: {e}")
            return {"candidate_profile": {}}


_pipeline_instance: Optional[ATSPipeline] = None


def get_pipeline() -> ATSPipeline:
    global _pipeline_instance
    if _pipeline_instance is None:
        _pipeline_instance = ATSPipeline()
    return _pipeline_instance
