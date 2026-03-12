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
    uploaded_by: Optional[str] = "portal"
    uploader_name: Optional[str] = None