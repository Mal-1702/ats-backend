"""
Public API routes — no authentication required.
These are the ONLY routes accessible from the Candidate Portal.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.db.crud import get_open_jobs, insert_application, insert_resume, get_job_by_id
from app.models.application import PublicJobOut, ApplicationOut
from app.utilities import storage
from typing import List
import os

router = APIRouter(prefix="/public", tags=["Public – Candidate Portal"])

ALLOWED_EXTENSIONS = {"pdf", "docx"}
UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ─────────────────────────────────────
# GET /public/jobs
# ─────────────────────────────────────
@router.get("/jobs", response_model=List[PublicJobOut])
def list_open_jobs():
    """
    Public endpoint — returns all currently open job postings.
    Closed / inactive jobs are never included.
    No authentication required.
    """
    rows = get_open_jobs()
    return [
        PublicJobOut(
            id=row[0],
            title=row[1],
            skills=row[2] or [],
            min_experience=row[3],
            created_at=row[4],
        )
        for row in rows
    ]


# ─────────────────────────────────────
# POST /public/apply
# ─────────────────────────────────────
@router.post("/apply")
async def submit_application(
    job_id: int = Form(...),
    candidate_name: str = Form(...),
    candidate_email: str = Form(...),
    resume_file: UploadFile = File(...),
):
    """
    Public endpoint — submit a job application with a resume.
    No authentication required.

    1. Validates the job exists and is still open.
    2. Validates the file type and size.
    3. Saves and parses the resume (same pipeline as HR upload).
    4. Records the application in the 'applications' table.
    """
    # ── Validate job ─────────────────────────────────────────
    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    # job row: (id, title, skills, keywords, min_experience, created_at, is_active, ...)
    is_active = job[6] if len(job) > 6 else True
    if not is_active:
        raise HTTPException(status_code=410, detail="This job is no longer accepting applications.")

    # ── Validate file ─────────────────────────────────────────
    filename = resume_file.filename
    if not filename or "." not in filename:
        raise HTTPException(status_code=400, detail="Invalid file name.")

    ext = filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are accepted.")

    contents = await resume_file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MB limit.")

    # ── Save file ─────────────────────────────────────────────
    # Prefix with candidate name to avoid collisions
    safe_name = candidate_name.strip().replace(" ", "_").lower()
    stored_filename = f"candidate_{safe_name}_{filename}"

    try:
        saved_path = storage.upload_resume(contents, stored_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save resume remotely: {str(e)}")
    finally:
        await resume_file.close()

    # ── Insert resume (runs existing parsing pipeline) ────────
    try:
        resume_id = insert_resume(
            stored_filename,
            upload_source="candidate_portal",
            uploaded_by_name="Candidate Portal",
            uploaded_by="portal",
            uploader_name=None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record resume: {str(e)}")

    # ── Insert application record ─────────────────────────────
    try:
        app_id, submitted_at = insert_application(
            job_id=job_id,
            resume_id=resume_id,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record application: {str(e)}")

    return {
        "status": "submitted",
        "message": "Your application has been received. Thank you!",
        "application_id": app_id,
        "resume_id": resume_id,
        "submitted_at": submitted_at.isoformat(),
    }
