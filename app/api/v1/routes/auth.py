from fastapi import APIRouter, HTTPException, Depends, status
from datetime import timedelta
from app.models.user import UserRegister, UserLogin, UserOut, TokenOut
from app.db.crud import create_user, get_user_by_email, get_user_by_id
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


def _row_to_user_out(row) -> UserOut:
    """Convert a DB user row to UserOut. Row: (id, email, pw_hash, full_name, is_active, created_at, role, dob)"""
    return UserOut(
        id=row[0],
        email=row[1],
        full_name=row[3],
        role=row[6] if len(row) > 6 else "hr",
        is_active=row[4],
        created_at=row[5],
        dob=row[7] if len(row) > 7 else None,
    )


@router.post("/auth/register", response_model=UserOut, tags=["Auth"])
def register(payload: UserRegister):
    """
    Register a new HR user account (open endpoint).
    New accounts always default to 'hr' role.
    """
    existing = get_user_by_email(payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    hashed = hash_password(payload.password)
    user_id = create_user(
        email=payload.email,
        hashed_password=hashed,
        full_name=payload.full_name,
        role="hr",      # public registration always hr
        dob=payload.dob,
    )

    user_row = get_user_by_id(user_id)
    return _row_to_user_out(user_row)


@router.post("/auth/login", response_model=TokenOut, tags=["Auth"])
def login(credentials: UserLogin):
    """
    Authenticate with email + password and receive a JWT access token.
    The token now includes the user's role.
    """
    user_row = get_user_by_email(credentials.email)

    if not user_row or not verify_password(credentials.password, user_row[2]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user_row[4]:  # is_active
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    role = user_row[6] if len(user_row) > 6 else "hr"
    full_name = user_row[3] if len(user_row) > 3 else ""

    token = create_access_token(
        data={
            "sub": str(user_row[0]),
            "email": user_row[1],
            "role": role,
            "name": full_name,      # ← full_name now included in JWT
        },
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenOut(
        access_token=token,
        token_type="bearer",
        user=_row_to_user_out(user_row),
    )


@router.get("/auth/me", response_model=UserOut, tags=["Auth"])
def get_me(current_user: dict = Depends(get_current_user)):
    """Return the current authenticated user's profile including role."""
    user_row = get_user_by_id(current_user["user_id"])
    if not user_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return _row_to_user_out(user_row)
