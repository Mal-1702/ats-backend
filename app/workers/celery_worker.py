from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "ats_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_track_started=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,

    # ── Time limits ──────────────────────────────────────────
    task_time_limit=300,          # Hard kill after 5 minutes
    task_soft_time_limit=240,     # Raise SoftTimeLimitExceeded at 4 min (allows graceful cleanup)

    # ── Concurrency ──────────────────────────────────────────
    # Windows only supports --pool=solo (single-threaded).
    # On Linux/production, run with prefork for true parallelism:
    #   celery -A app.workers.celery_worker worker --pool=prefork --concurrency=4
    worker_concurrency=4,         # Number of concurrent worker processes (Linux prefork)
    worker_prefetch_multiplier=2, # Each worker pre-fetches 2 tasks from Redis

    # ── Rate limiting (prevents Groq/LLM API throttling) ─────
    task_default_rate_limit="30/m",  # Max 30 tasks per minute globally
)
