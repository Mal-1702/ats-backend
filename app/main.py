from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.router import router as v1_router
from app.core.config import get_settings
import time
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="Enterprise AI backend",
    description="Enterprise ATS - POC Backend",
    version="1.0.0"
)
app.include_router(v1_router, prefix="/api/v1")

# ── CORS (production-safe: reads from CORS_ORIGINS env var) ──────────
# In .env: CORS_ORIGINS=http://localhost:3000,http://localhost:5173
# For production: CORS_ORIGINS=https://your-frontend.com
allowed_origins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Rate Limiter Middleware (in-memory, no external deps) ────────────
# Limits: 10 login attempts / minute per IP, 60 general API calls / minute
_rate_store: dict[str, list[float]] = {}
RATE_LIMITS = {
    "/api/v1/auth/login": {"max": 10, "window": 60},     # 10 login attempts/min
    "/api/v1/auth/register": {"max": 5, "window": 60},    # 5 registrations/min
    "/api/v1/upload-resume": {"max": 30, "window": 60},   # 30 uploads/min
}
DEFAULT_RATE = {"max": 120, "window": 60}  # 120 requests/min for everything else


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    path = request.url.path

    # Determine which rate limit applies
    limit_config = DEFAULT_RATE
    for route_prefix, config in RATE_LIMITS.items():
        if path.startswith(route_prefix):
            limit_config = config
            break

    key = f"{client_ip}:{path.split('?')[0]}"
    now = time.time()
    window = limit_config["window"]
    max_requests = limit_config["max"]

    # Clean expired entries and check
    if key not in _rate_store:
        _rate_store[key] = []

    _rate_store[key] = [t for t in _rate_store[key] if now - t < window]

    if len(_rate_store[key]) >= max_requests:
        logger.warning(f"Rate limit exceeded: {client_ip} on {path}")
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please slow down."},
        )

    _rate_store[key].append(now)
    response = await call_next(request)
    return response


# ── Global Exception Handler (prevents stack trace leaks) ────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
    )


# ── Health Check ─────────────────────────────────────────────────────
@app.get("/")
def health_check():
    """
    This endpoint is used to check if the backend is running.
    """
    return {
        "status": "OK",
        "message": "ATS backend is running"
    }

