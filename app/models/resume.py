from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ResumeOut(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime
    experience_years: float
    extracted_skills: Optional[List[str]] = []
    uploaded_by_name: Optional[str] = None
    upload_source: Optional[str] = None
    # ── Candidate application fields (joined from applications) ──
    candidate_type: Optional[str] = None
    confidence_score: Optional[int] = None
    expected_salary: Optional[str] = None
    availability: Optional[str] = None
    candidate_note: Optional[str] = None