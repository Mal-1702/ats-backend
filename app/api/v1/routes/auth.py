from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from datetime import timedelta
from app.models.user import (
    UserRegister, 
    UserLogin, 
    UserOut, 
    TokenOut, 
    ForgotPasswordRequest, 
    ResetPasswordRequest
)
from app.db.crud import (
    create_user, 
    get_user_by_email, 
    get_user_by_id,
    create_password_reset_token,
    get_password_reset_token,
    delete_password_reset_token,
    update_user_password
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.core.config import get_settings
from app.services.email import send_reset_password_email, send_otp_email
import secrets
import random
from datetime import datetime, timedelta, timezone

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
    
    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    # 10 minutes expiry
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    from app.db.crud import update_user_otp
    update_user_otp(user_id, otp, expires_at)
    
    # Send OTP strictly via Gmail
    try:
        send_otp_email(payload.email, otp)
    except Exception as e:
        # In a production app, you might want to rollback the user creation if email fails
        # but for now we'll just log it. The user can request a resend later (not implemented yet).
        pass

    user_row = get_user_by_id(user_id)
    return _row_to_user_out(user_row)


class OtpVerificationRequest(BaseModel):
    email: str
    otp: str

@router.post("/auth/verify-otp", tags=["Auth"])
def verify_otp(payload: OtpVerificationRequest):
    """Verify the 6-digit OTP sent via Gmail to activate the account."""
    user_row = get_user_by_email(payload.email)
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")
        
    # user_row index: 0:id, 1:email, 2:pw, 3:name, 4:active, 5:created, 6:role, 7:dob, 8:otp, 9:otp_expires
    stored_otp = user_row[8]
    expires_at = user_row[9]
    
    if not stored_otp or stored_otp != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code")
        
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="Verification code has expired")
            
    from app.db.crud import activate_user
    activate_user(user_row[0])
    
    return {"message": "Account activated successfully! You can now log in."}


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
        if user_row[8]: # Has OTP pending?
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not verified. Please check your Gmail for the OTP.",
            )
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


@router.post("/auth/forgot-password", tags=["Auth"])
def forgot_password(payload: ForgotPasswordRequest):
    """
    Generate a password reset token and send it via email.
    Always returns success to prevent email enumeration.
    """
    user_row = get_user_by_email(payload.email)
    
    if user_row:
        user_id = user_row[0]
        token = secrets.token_urlsafe(32)
        # 15 minutes expiry
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
        
        create_password_reset_token(user_id, token, expires_at)
        send_reset_password_email(payload.email, token)

    return {"message": "If this email exists, a password reset link has been sent."}


@router.post("/auth/reset-password", tags=["Auth"])
def reset_password(payload: ResetPasswordRequest):
    """
    Verify the reset token and update the user's password.
    """
    token_row = get_password_reset_token(payload.token)
    
    if not token_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired reset token"
        )
    
    user_id, expires_at = token_row
    
    # Check expiry
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        delete_password_reset_token(payload.token)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
    
    # Securely update password
    hashed = hash_password(payload.password)
    update_user_password(user_id, hashed)
    
    # Delete token after successful use
    delete_password_reset_token(payload.token)
    
    return {"message": "Password updated successfully"}
