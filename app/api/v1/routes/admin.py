"""
CEO-only admin routes for user management.
All endpoints require CEO authentication via `require_ceo` dependency.
"""
from fastapi import APIRouter, HTTPException, Depends, status

from app.models.user import UserOut, UserCreate, UserUpdateRole, UserUpdatePassword
from app.db.crud import (
    get_user_by_email,
    get_user_by_id,
    get_all_users,
    create_user,
    update_user_role,
    update_user_password,
    delete_user_by_id,
)
from app.core.security import require_ceo, hash_password

router = APIRouter()


def _row_to_user_out(row) -> UserOut:
    """Convert DB row (id, email, full_name, is_active, created_at, role) to UserOut."""
    return UserOut(
        id=row[0],
        email=row[1],
        full_name=row[2],
        is_active=row[3],
        created_at=row[4],
        role=row[5] if len(row) > 5 else "hr",
    )


# ─── GET /admin/users ────────────────────────────────────────────────────────

@router.get("/admin/users", response_model=list[UserOut], tags=["Admin"])
def list_users(current_user: dict = Depends(require_ceo)):
    """[CEO only] List all HR and Admin accounts."""
    rows = get_all_users()
    return [_row_to_user_out(r) for r in rows]


# ─── POST /admin/users ───────────────────────────────────────────────────────

@router.post("/admin/users", response_model=UserOut, status_code=status.HTTP_201_CREATED, tags=["Admin"])
def create_staff_user(payload: UserCreate, current_user: dict = Depends(require_ceo)):
    """
    [CEO only] Create a new HR or Admin account.
    CEO cannot create another CEO via this endpoint (enforced by UserCreate model).
    """
    existing = get_user_by_email(payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    hashed = hash_password(payload.password)
    user_id = create_user(
        email=payload.email,
        hashed_password=hashed,
        full_name=payload.full_name,
        role=payload.role,
    )

    user_row = get_user_by_id(user_id)
    # get_user_by_id returns (id, email, pw_hash, full_name, is_active, created_at, role)
    return UserOut(
        id=user_row[0],
        email=user_row[1],
        full_name=user_row[3],
        is_active=user_row[4],
        created_at=user_row[5],
        role=user_row[6] if len(user_row) > 6 else "hr",
    )


# ─── DELETE /admin/users/{user_id} ──────────────────────────────────────────

@router.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Admin"])
def remove_user(user_id: int, current_user: dict = Depends(require_ceo)):
    """[CEO only] Delete an HR or Admin account. CEO cannot delete their own account."""
    if user_id == current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account.",
        )

    target = get_user_by_id(user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    target_role = target[6] if len(target) > 6 else "hr"
    if target_role == "ceo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CEO accounts cannot be deleted via this endpoint.",
        )

    deleted = delete_user_by_id(user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")


# ─── PATCH /admin/users/{user_id}/role ──────────────────────────────────────

@router.patch("/admin/users/{user_id}/role", response_model=UserOut, tags=["Admin"])
def change_user_role(user_id: int, payload: UserUpdateRole, current_user: dict = Depends(require_ceo)):
    """[CEO only] Change a user's role (hr ↔ admin). Cannot set role to 'ceo'."""
    target = get_user_by_id(user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    target_role = target[6] if len(target) > 6 else "hr"
    if target_role == "ceo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot change role of the CEO account.",
        )

    success = update_user_role(user_id, payload.role)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    updated = get_user_by_id(user_id)
    return UserOut(
        id=updated[0],
        email=updated[1],
        full_name=updated[3],
        is_active=updated[4],
        created_at=updated[5],
        role=updated[6] if len(updated) > 6 else "hr",
    )


# ─── PATCH /admin/users/{user_id}/password ──────────────────────────────────

@router.patch("/admin/users/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT, tags=["Admin"])
def reset_user_password(user_id: int, payload: UserUpdatePassword, current_user: dict = Depends(require_ceo)):
    """[CEO only] Reset a user's password."""
    target = get_user_by_id(user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    hashed = hash_password(payload.password)
    success = update_user_password(user_id, hashed)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
