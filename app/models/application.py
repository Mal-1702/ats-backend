from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class PublicJobOut(BaseModel):
    """Public-facing job view for candidates (no internal scoring data)."""
    id: int
    title: str
    skills: List[str]
    min_experience: int
    created_at: datetime
    # ── Extended job details ──
    long_description: Optional[str] = None
    work_schedule: Optional[str] = None
    salary_range: Optional[str] = None
    key_highlights: Optional[List[str]] = None

    class Config:
        from_attributes = True


class ApplicationOut(BaseModel):
    """Response model for a submitted application."""
    application_id: int
    job_id: int
    resume_id: int
    candidate_name: str
    candidate_email: str
    submitted_at: datetime

    class Config:
        from_attributes = True
