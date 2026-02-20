import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import logging

logger = logging.getLogger("app.middleware.request_id")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Attaches a unique request ID to every incoming request.
    Logs request start and end for observability.
    """

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        logger.info(
            "REQUEST_START",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client": request.client.host if request.client else "unknown",
            },
        )

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
