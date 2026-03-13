from celery import Celery
from app.core.config import get_settings

settings = get_settings()

def fix_redis_url(url: str) -> str:
    if not url:
        return url
    
    url = url.strip()
    
    if url.startswith("rediss://") and "ssl_cert_reqs" not in url:
        separator = "&" if "?" in url else "?"
        return f"{url}{separator}ssl_cert_reqs=none"
    return url

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
