from fastapi import APIRouter
from app.api.v1.routes import health, upload, ranking
from app.api.v1.routes import resumes
from app.api.v1.routes import jobs
from app.api.v1.routes import auth

router = APIRouter()

router.include_router(auth.router)
router.include_router(health.router)
router.include_router(upload.router)
router.include_router(ranking.router)
router.include_router(resumes.router)
router.include_router(jobs.router)