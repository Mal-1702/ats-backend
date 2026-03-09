from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Literal
from datetime import datetime

VALID_ROLES = Literal["ceo", "admin", "hr"]


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        if isinstance(v, str):
            return v.strip().lower()
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        if isinstance(v, str):
            return v.strip().lower()
        return v


class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    role: str = "hr"
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── CEO User Management Models ──────────────────────────────────

class UserCreate(BaseModel):
    """CEO-only: create a new HR or Admin account."""
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: Literal["hr", "admin"] = "hr"   # CEO cannot create another CEO

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        if isinstance(v, str):
            return v.strip().lower()
        return v


class UserUpdateRole(BaseModel):
    """CEO-only: update a user's role."""
    role: Literal["hr", "admin"]


class UserUpdatePassword(BaseModel):
    """CEO-only: reset a user's password."""
    password: str
