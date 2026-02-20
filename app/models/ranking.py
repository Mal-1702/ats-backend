from pydantic import BaseModel
from datetime import datetime


class RankingOut(BaseModel):
    resume_id: int
    filename: str
    score: float
    ranked_at: datetime

    class Config:
        from_attributes = True
