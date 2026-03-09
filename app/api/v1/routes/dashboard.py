"""
Dashboard utility endpoints.

GET /dashboard/new-resumes-count
  Returns the number of resumes uploaded after the given `since` timestamp.
  Stateless: the frontend stores `last_dashboard_check` in localStorage
  and passes it as a query param. No server-side session state required.
"""

from fastapi import APIRouter, Depends, Query
from datetime import datetime, timezone
from typing import Optional

from app.db.dbase import get_db_connection
from app.core.security import get_current_user

router = APIRouter()


def _count_new_resumes(since: Optional[datetime], job_id: Optional[int]) -> int:
    """
    Count resumes uploaded after `since`.
    If `since` is None, returns total resume count.
    If `job_id` is provided, scopes the count to that job via applications table.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    if job_id is not None:
        # Job-scoped count via the applications table
        if since:
            cur.execute("""
                SELECT COUNT(DISTINCT r.id)
                FROM resumes r
                JOIN applications a ON a.resume_id = r.id
                WHERE a.job_id = %s
                  AND r.uploaded_at > %s;
            """, (job_id, since))
        else:
            cur.execute("""
                SELECT COUNT(DISTINCT r.id)
                FROM resumes r
                JOIN applications a ON a.resume_id = r.id
                WHERE a.job_id = %s;
            """, (job_id,))
    else:
        # Global count
        if since:
            cur.execute(
                "SELECT COUNT(*) FROM resumes WHERE uploaded_at > %s;",
                (since,)
            )
        else:
            cur.execute("SELECT COUNT(*) FROM resumes;")

    count = cur.fetchone()[0]
    cur.close()
    conn.close()
    return count


@router.get("/dashboard/new-resumes-count", tags=["Dashboard"])
def get_new_resumes_count(
    since: Optional[str] = Query(
        None,
        description="ISO-8601 timestamp. Only resumes uploaded after this time are counted.",
    ),
    job_id: Optional[int] = Query(None, description="Optional: scope count to a specific job."),
    current_user: dict = Depends(get_current_user),
):
    """
    Return the number of resumes uploaded since the given timestamp.

    The frontend stores the last-check time in localStorage and passes it
    as `since`. This endpoint is read-only and changes no data.

    Also returns `server_time` so the frontend can store an accurate
    next-check baseline that is not affected by client clock drift.
    """
    since_dt: Optional[datetime] = None
    if since:
        try:
            # Support both Z-suffix and +00:00 offset
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
        except ValueError:
            since_dt = None

    count = _count_new_resumes(since_dt, job_id)

    response = {
        "new_resumes": count,
        "since": since,
        "server_time": datetime.now(timezone.utc).isoformat(),
    }
    if job_id is not None:
        response["job_id"] = job_id

    return response
