web: bash -c "celery -A app.workers.celery_worker worker --loglevel=info --concurrency=2 & uvicorn app.main:app --host 0.0.0.0 --port $PORT"
