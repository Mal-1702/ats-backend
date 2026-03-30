"""
Candidate Comments API — POST / GET / DELETE
Allows authenticated HR/Admin/CEO users to leave comments on candidates.
Deletion is restricted to the comment author OR admin/CEO roles.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional
from app.core.security import get_current_user
from app.db.crud import (
    create_comment,
    get_comments_by_resume,
    delete_comment_by_id,
    get_comment_by_id,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Request / Response schemas ────────────────────────────────────────────
class CommentCreate(BaseModel):
    resume_id: int
    comment_text: str = Field(..., min_length=1, max_length=2000)


class CommentOut(BaseModel):
    id: int
    user: str
    user_id: int
    comment: str
    timestamp: str


# ── POST /comments — Add a comment ───────────────────────────────────────
@router.post("/comments", tags=["Comments"], status_code=status.HTTP_201_CREATED)
def add_comment(
    payload: CommentCreate,
    current_user: dict = Depends(get_current_user),
):
    """Add a comment on a candidate resume."""
    # Sanitize: strip HTML/script tags from comment text
    import re
    clean_text = re.sub(r"<[^>]+>", "", payload.comment_text).strip()
    if not clean_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Comment cannot be empty.",
        )

    try:
        comment = create_comment(
            resume_id=payload.resume_id,
            user_id=current_user["user_id"],
            comment_text=clean_text,
        )
        return {
            "message": "Comment added successfully",
            "comment": comment,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        logger.exception("Failed to create comment")
        raise HTTPException(
            status_code=500,
            detail="Failed to add comment. Please try again.",
        )


# ── GET /comments/{resume_id} — Fetch all comments for a candidate ──────
@router.get("/comments/{resume_id}", tags=["Comments"])
def get_comments(
    resume_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Fetch all comments for a given resume/candidate."""
    try:
        comments = get_comments_by_resume(resume_id)
        return {"comments": comments}
    except Exception:
        logger.exception("Failed to fetch comments")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch comments. Please try again.",
        )


# ── DELETE /comments/{comment_id} — Delete a comment ────────────────────
@router.delete("/comments/{comment_id}", tags=["Comments"])
def remove_comment(
    comment_id: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a specific comment.
    Only the comment author OR admin/CEO can delete.
    """
    # 1. Fetch the comment
    comment = get_comment_by_id(comment_id)
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found.",
        )

    # 2. Authorization check
    is_owner = comment["user_id"] == current_user["user_id"]
    is_privileged = current_user.get("role") in ("admin", "ceo")

    if not is_owner and not is_privileged:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this comment.",
        )

    # 3. Delete
    try:
        success = delete_comment_by_id(comment_id)
        if not success:
            raise HTTPException(status_code=404, detail="Comment not found.")
        return {"message": "Comment deleted successfully", "comment_id": comment_id}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to delete comment")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete comment. Please try again.",
        )
