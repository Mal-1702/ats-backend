from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.db.crud import insert_resume
from app.core.security import get_current_user
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

    # Ensure uploads directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Save the file
    file_path = os.path.join(UPLOAD_DIR, filename)
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    finally:
        await file.close()

    # Insert resume metadata into database (non-blocking — parse errors won't fail the upload)
    try:
        resume_id = insert_resume(filename)
    except Exception as e:
        # If DB insert fails, remove the uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to record resume: {str(e)}")

    return {
        "status": "uploaded",
        "filename": filename,
        "resume_id": resume_id,
        "saved_at": file_path,
    }
