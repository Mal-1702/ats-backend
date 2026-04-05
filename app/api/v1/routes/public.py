"""
Public API routes — no authentication required.
These are the ONLY routes accessible from the Candidate Portal.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.db.crud import get_open_jobs, insert_application, insert_resume, get_job_by_id
from app.models.application import PublicJobOut, ApplicationOut
from typing import List, Optional
import os
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public", tags=["Public – Candidate Portal"])

ALLOWED_EXTENSIONS = {"pdf", "docx"}
UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _parse_highlights(raw):
    """Safely parse key_highlights JSONB from DB."""
    if raw is None:
        return None
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, list) else None
        except Exception:
            return None
    return None


# ─────────────────────────────────────
# GET /public/jobs
# ─────────────────────────────────────
@router.get("/jobs", response_model=List[PublicJobOut])
def list_open_jobs():
    """
    Public endpoint — returns all currently open job postings
    with extended details (description, schedule, salary, highlights).
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
            long_description=row[5] if len(row) > 5 else None,
            work_schedule=row[6] if len(row) > 6 else None,
            salary_range=row[7] if len(row) > 7 else None,
            key_highlights=_parse_highlights(row[8]) if len(row) > 8 else None,
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
    expected_salary: Optional[str] = Form(None),
    availability: Optional[str] = Form(None),
    candidate_note: Optional[str] = Form(None),
):
    """
    Public endpoint — submit a job application with a resume.
    No authentication required.

    1. Validates the job exists and is still open.
    2. Validates the file type and size.
    3. Saves and parses the resume (same pipeline as HR upload).
    4. Records the application in the 'applications' table with candidate preferences.
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

    # ── Sanitize text inputs (XSS protection) ─────────────────
    def _sanitize(val, max_len=2000):
        if not val:
            return None
        cleaned = val.strip()[:max_len]
        return cleaned if cleaned else None

    safe_salary = _sanitize(expected_salary, 255)
    safe_availability = _sanitize(availability, 255)
    safe_note = _sanitize(candidate_note, 2000)

    # ── Save file ─────────────────────────────────────────────
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Prefix with candidate name to avoid collisions
    safe_name = candidate_name.strip().replace(" ", "_").lower()
    stored_filename = f"candidate_{safe_name}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)

    try:
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        logger.error(f"Failed to save resume file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save your resume. Please try again.")
    finally:
        await resume_file.close()

    # ── Insert resume (runs existing parsing pipeline) ────────
    try:
        resume_id = insert_resume(
            stored_filename,
            upload_source="candidate_portal",
            uploaded_by_name="Candidate Portal",
        )
    except Exception as e:
        logger.error(f"Failed to record resume in DB: {e}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Failed to record your resume. Please try again.")

    # ── Insert application record with candidate preferences ──
    try:
        app_id, submitted_at = insert_application(
            job_id=job_id,
            resume_id=resume_id,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            expected_salary=safe_salary,
            availability=safe_availability,
            candidate_note=safe_note,
        )
    except Exception as e:
        logger.error(f"Failed to record application: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit your application. Please try again.")

    return {
        "status": "submitted",
        "message": "Your application has been received. Thank you!",
        "application_id": app_id,
        "resume_id": resume_id,
        "submitted_at": submitted_at.isoformat(),
    }
