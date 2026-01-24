from pydantic import BaseModel
from datetime import datetime


class ResumeOut(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime

    class Config:
        from_attributes = True
