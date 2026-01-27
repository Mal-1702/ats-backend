from pydantic import BaseModel
from typing import List,Optional
from datetime import datetime

class ResumeOut(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime
    experience_years: float
    extracted_skills: Optional[List[str]] = []