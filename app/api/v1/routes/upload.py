from fastapi import APIRouter, UploadFile, File

router = APIRouter()

@router.post("/upload-resume", tags=["Resume"])
async def upload_resume(file: UploadFile = File(...)):
    return {"filename": file.filename, "status": "uploaded"}
