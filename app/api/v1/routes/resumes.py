from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import FileResponse
from app.db.crud import get_all_resumes, delete_resume, get_resume_by_id
from app.models.resume import ResumeOut
from app.core.security import get_current_user
from app.core.config import get_settings
import os

router = APIRouter()


@router.get("/resumes", response_model=list[ResumeOut], tags=["Resume"])
def list_resumes(current_user: dict = Depends(get_current_user)):
    """List all uploaded resumes. Requires authentication."""
    rows = get_all_resumes()

    return [
        ResumeOut(
            id=row[0],
            filename=row[1],
            uploaded_at=row[2],
            experience_years=row[3],
            extracted_skills=row[4],
        )
        for row in rows
    ]


@router.delete("/resumes/{resume_id}", tags=["Resume"])
def delete_resume_endpoint(
    resume_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a resume by ID.
    Removes database entry and associated file from disk.
    Requires authentication.
    """
    settings = get_settings()

    filename = delete_resume(resume_id)

    if not filename:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )

    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Warning: Could not delete file {file_path}: {e}")

    return {
        "message": "Resume deleted successfully",
        "resume_id": resume_id,
        "filename": filename,
    }


@router.get("/resumes/{resume_id}/download", tags=["Resume"])
def download_resume(
    resume_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Download a resume file by ID. Requires authentication."""
    settings = get_settings()

    resume = get_resume_by_id(resume_id)

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )

    filename = resume[1]
    file_path = os.path.join(os.path.abspath(settings.UPLOAD_DIR), filename)

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found on disk",
        )

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/resumes/{resume_id}/view", tags=["Resume"])
def view_resume(
    resume_id: int,
    current_user: dict = Depends(get_current_user)
):
    """View a resume file inline in the browser. Requires authentication."""
    settings = get_settings()

    resume = get_resume_by_id(resume_id)

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )

    filename = resume[1]
    file_path = os.path.join(os.path.abspath(settings.UPLOAD_DIR), filename)

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found on disk",
        )

    media_type = (
        "application/pdf"
        if filename.lower().endswith(".pdf")
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_type,
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )
