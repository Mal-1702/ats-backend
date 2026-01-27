from fastapi import APIRouter
from app.db.crud import get_all_resumes
from app.models.resume import ResumeOut

router = APIRouter()

@router.get("/resumes", response_model=list[ResumeOut], tags=["Resume"])
def list_resumes():
    """
    List all uploaded resumes from database
    """

    rows = get_all_resumes()

    return [
        ResumeOut(
            id=row[0],
            filename=row[1],
            uploaded_at=row[2],
            experience_years=row[3],
            extracted_skills=row[4]
        )
        for row in rows
    ]
