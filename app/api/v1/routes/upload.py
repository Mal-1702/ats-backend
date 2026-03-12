from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.db.crud import insert_resume
from app.core.security import get_current_user
from app.utilities import storage
import os
import shutil

router = APIRouter()

ALLOWED_EXTENSIONS = {"pdf", "docx"}
UPLOAD_DIR = "uploads"


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

    # Upload the file to Supabase via utility array
    try:
        contents = await file.read()
        saved_path = storage.upload_resume(contents, filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file remotely: {str(e)}")
    finally:
        await file.close()

    # Insert resume metadata into database (non-blocking — parse errors won't fail the upload)
    try:
        resume_id = insert_resume(
            filename,
            uploaded_by_user_id=current_user.get("id"),
            uploaded_by_name=current_user.get("full_name"),
            upload_source="hr_manual_upload",
            uploaded_by="internal",
            uploader_name=current_user.get("full_name"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record resume metadata: {str(e)}")

    return {
        "status": "uploaded",
        "filename": filename,
        "resume_id": resume_id,
        "saved_at": saved_path,
    }
