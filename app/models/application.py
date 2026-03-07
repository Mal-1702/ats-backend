from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class PublicJobOut(BaseModel):
    """Public-facing slimmed-down job view (no internal scoring data)."""
    id: int
    title: str
    skills: List[str]
    min_experience: int
    created_at: datetime

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
