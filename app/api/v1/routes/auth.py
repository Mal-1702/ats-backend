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


@router.post("/auth/register", response_model=UserOut, tags=["Auth"])
def register(payload: UserRegister):
    """
    Register a new user account.
    Returns the created user profile.
    """
    # Check if email already exists
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
    )

    user_row = get_user_by_id(user_id)
    return UserOut(
        id=user_row[0],
        email=user_row[1],
        full_name=user_row[3],
        is_active=user_row[4],
        created_at=user_row[5],
    )


@router.post("/auth/login", response_model=TokenOut, tags=["Auth"])
def login(credentials: UserLogin):
    """
    Authenticate with email + password and receive a JWT access token.
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

    token = create_access_token(
        data={"sub": str(user_row[0]), "email": user_row[1]},
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    user = UserOut(
        id=user_row[0],
        email=user_row[1],
        full_name=user_row[3],
        is_active=user_row[4],
        created_at=user_row[5],
    )

    return TokenOut(access_token=token, token_type="bearer", user=user)


@router.get("/auth/me", response_model=UserOut, tags=["Auth"])
def get_me(current_user: dict = Depends(get_current_user)):
    """
    Return the current authenticated user's profile.
    """
    user_row = get_user_by_id(current_user["user_id"])
    if not user_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserOut(
        id=user_row[0],
        email=user_row[1],
        full_name=user_row[3],
        is_active=user_row[4],
        created_at=user_row[5],
    )
