from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, Literal
from datetime import datetime, date

VALID_ROLES = Literal["ceo", "admin", "hr"]


class UserRegister(BaseModel):
    full_name: str
    dob: Optional[date] = None
    email: EmailStr
    password: str
    confirm_password: str

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("full_name", mode="before")
    @classmethod
    def validate_full_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Full name must not be empty")
        return v.strip()

    @field_validator("password", mode="before")
    @classmethod
    def validate_password_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


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
    dob: Optional[date] = None
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
    dob: Optional[date] = None
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
