import ssl
from celery import Celery
from app.core.config import get_settings

settings = get_settings()

def fix_redis_url(url: str) -> str:
    if not url:
        return url
    
    clean_url = url.strip()
    
    # Celery's Redis backend is VERY picky and requires exactly one of these strings:
    # CERT_REQUIRED, CERT_OPTIONAL, or CERT_NONE
    if clean_url.lower().startswith("rediss://") and "ssl_cert_reqs" not in clean_url:
        separator = "&" if "?" in clean_url else "?"
        fixed_url = f"{clean_url}{separator}ssl_cert_reqs=CERT_NONE"
        return fixed_url
        
    return clean_url

broker_url = fix_redis_url(settings.CELERY_BROKER_URL)
backend_url = fix_redis_url(settings.CELERY_RESULT_BACKEND)

print(f"DEBUG: Celery Broker URL starts with: {broker_url[:15]}")

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
    # Additional layer of safety for SSL
    broker_use_ssl={'ssl_cert_reqs': ssl.CERT_NONE} if broker_url.startswith("rediss") else None,
    redis_backend_use_ssl={'ssl_cert_reqs': ssl.CERT_NONE} if backend_url.startswith("rediss") else None,
)
