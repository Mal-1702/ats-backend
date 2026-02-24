from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Any
from datetime import datetime


# Priority levels aligned with the 5-level scale
PRIORITY_LEVELS = {
    "critical": 1.0,
    "high":     0.75,
    "medium":   0.50,
    "low":      0.25,
    "optional": 0.10,
}


class SkillWithPriority(BaseModel):
    """
    A required skill with an explicit recruiter-assigned importance weight.
    The priority field accepts either:
      - A numeric value between 0.0–1.0  (e.g., 0.9)
      - A named level string: critical / high / medium / low / optional
    importance_level is kept in sync with priority.
    """
    skill: str
    priority: float = Field(default=0.75, ge=0.0, le=1.0)
    importance_level: str = "high"

    @field_validator("priority", mode="before")
    @classmethod
    def coerce_priority(cls, v: Any) -> float:
        if isinstance(v, str):
            level = v.strip().lower()
            if level in PRIORITY_LEVELS:
                return PRIORITY_LEVELS[level]
            try:
                return float(v)
            except ValueError:
                return 0.75
        return float(v)

    @field_validator("importance_level", mode="before")
    @classmethod
    def derive_level(cls, v: Any) -> str:
        if isinstance(v, str) and v.lower() in PRIORITY_LEVELS:
            return v.lower()
        return v

    def label(self) -> str:
        """Return a human-readable label for the priority value."""
        p = self.priority
        if p >= 0.90: return "Critical"
        if p >= 0.65: return "High"
        if p >= 0.40: return "Medium"
        if p >= 0.20: return "Low"
        return "Optional"


def priority_to_level(priority: float) -> str:
    if priority >= 0.90: return "critical"
    if priority >= 0.65: return "high"
    if priority >= 0.40: return "medium"
    if priority >= 0.20: return "low"
    return "optional"


class JobCreate(BaseModel):
    """Used when creating a new job (input from API)."""
    title: str
    skills: List[str]
    skill_priorities: Optional[List[SkillWithPriority]] = None
    keywords: Optional[List[str]] = []
    min_experience: int

    def get_skill_priority_map(self) -> dict:
        """
        Returns { skill_name_lower: priority_float } for use by scorer.
        Falls back to empty dict if no priorities provided.
        """
        if not self.skill_priorities:
            return {}
        return {
            sp.skill.strip().lower(): sp.priority
            for sp in self.skill_priorities
        }


class JobOut(BaseModel):
    """Used when returning job data to client."""
    id: int
    title: str
    skills: List[str]
    skill_priorities: Optional[List[dict]] = None
    keywords: List[str]
    min_experience: int
    created_at: datetime
    is_active: bool = True

    class Config:
        from_attributes = True
