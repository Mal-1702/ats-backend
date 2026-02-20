from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class JobCreate(BaseModel):
    """Used when creating a new job (input from API)."""
    title: str
    skills: List[str]
    keywords: Optional[List[str]] = []
    min_experience: int


class JobOut(BaseModel):
    """Used when returning job data to client."""
    id: int
    title: str
    skills: List[str]
    keywords: List[str]
    min_experience: int
    created_at: datetime
    is_active: bool = True

    class Config:
        from_attributes = True
