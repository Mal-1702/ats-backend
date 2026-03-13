from celery import Celery
from app.core.config import get_settings

settings = get_settings()

def fix_redis_url(url: str) -> str:
    if not url:
        return url
    
    # Remove any surrounding whitespace or newlines
    clean_url = url.strip()
    
    # Debug print so we can see what's happening in Render logs
    print(f"DEBUG: Processing Redis URL (first 10 chars): {clean_url[:10]}...")

    if clean_url.lower().startswith("rediss://") and "ssl_cert_reqs" not in clean_url:
        separator = "&" if "?" in clean_url else "?"
        fixed_url = f"{clean_url}{separator}ssl_cert_reqs=none"
        print("DEBUG: Applied SSL fix to Redis URL")
        return fixed_url
        
    return clean_url

settings = get_settings()
broker_url = fix_redis_url(settings.CELERY_BROKER_URL)
backend_url = fix_redis_url(settings.CELERY_RESULT_BACKEND)

celery_app = Celery(
    "ats_worker",
    broker=broker_url,
    backend=backend_url,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_track_started=True,
    task_time_limit=300,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)
