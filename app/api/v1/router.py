from fastapi import APIRouter
from app.api.v1.routes import (
    health, upload, ranking, resumes, jobs, auth, resume_analysis, public, admin, dashboard, comments
)

router = APIRouter()

router.include_router(auth.router)
router.include_router(health.router)
router.include_router(upload.router)
router.include_router(ranking.router)
router.include_router(resumes.router)
router.include_router(jobs.router)
router.include_router(resume_analysis.router)
router.include_router(public.router)
router.include_router(admin.router)
router.include_router(dashboard.router)
router.include_router(comments.router)
