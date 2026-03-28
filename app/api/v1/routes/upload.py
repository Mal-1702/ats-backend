from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import logging
from app.db.crud import insert_resume
from app.core.security import get_current_user
import os
import shutil
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {"pdf", "docx"}
UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload-resume", tags=["Resume"])
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a resume file. Requires authentication."""
    filename = file.filename

    if not filename or "." not in filename:
        raise HTTPException(status_code=400, detail="Invalid file name")

    ext = filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF/DOCX files are allowed")

    # Ensure uploads directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Read file content and validate size
    try:
        contents = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        raise HTTPException(status_code=500, detail="Failed to read the uploaded file. Please try again.")
    finally:
        await file.close()

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {MAX_FILE_SIZE // (1024*1024)}MB limit."
        )

    # UUID-prefixed filename to prevent overwrite race conditions
    unique_filename = f"{uuid.uuid4().hex[:8]}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        logger.error(f"Failed to save file to disk: {e}")
        raise HTTPException(status_code=500, detail="Failed to save the file. Please try again.")

    # Insert resume metadata into database
    try:
        resume_id = insert_resume(
            unique_filename,
            uploaded_by_user_id=current_user.get("user_id"),
            uploaded_by_name=current_user.get("full_name", "HR Uploader"),
            upload_source="hr_manual_upload",
        )
    except Exception as e:
        logger.error(f"Failed to record resume in DB: {e}")
        # If DB insert fails, remove the uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Failed to record resume. Please try again.")

    return {
        "status": "uploaded",
        "filename": filename,
        "resume_id": resume_id,
        "saved_at": file_path,
    }
