from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.file_manager import save_resume

router = APIRouter()

ALLOWED_EXTENSIONS = {"pdf", "docx", "doc"}

@router.post("/upload-resume", tags=["Resume"])
async def upload_resume(file: UploadFile = File(...)):
    filename = file.filename

    if "." not in filename:
        raise HTTPException(status_code=400, detail="Invalid file")

    ext = filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF/DOC/DOCX files allowed"
        )

    file_path = save_resume(file)

    return {
        "status": "uploaded",
        "filename": filename,
        "saved_at": file_path
    }
