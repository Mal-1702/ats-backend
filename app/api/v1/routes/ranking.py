from fastapi import APIRouter

router = APIRouter()

@router.get("/rank", tags=["Scoring"])
def rank_resumes():
    return {"message": "Resume ranking endpoint"}
