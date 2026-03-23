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


@router.get("/dashboard/weekly-stats", tags=["Dashboard"])
def get_weekly_stats(
    current_user: dict = Depends(get_current_user),
):
    """
    Return resume upload counts per day per job role for the past 7 days.
    Used by the stacked analytics bar chart on the dashboard.

    Response shape:
    {
      "weekly_stats": [
        {"day": "Mon", "Cyber Dev": 5, "Cloud Support Engineer": 3, ...},
        ...
      ],
      "job_roles": [
        {"key": "Cyber Dev", "color": "#3b82f6"},
        ...
      ]
    }
    """
    conn = get_db_connection()
    cur = conn.cursor()

    # Get per-day-per-job resume counts for the last 7 days
    cur.execute("""
        SELECT
            TO_CHAR(r.uploaded_at, 'Dy')  AS day_label,
            DATE(r.uploaded_at)           AS upload_date,
            j.title                       AS job_title,
            COUNT(*)                      AS resume_count
        FROM resumes r
        JOIN applications a ON a.resume_id = r.id
        JOIN jobs j ON j.id = a.job_id
        WHERE r.uploaded_at >= NOW() - INTERVAL '7 days'
        GROUP BY day_label, upload_date, j.title
        ORDER BY upload_date;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    # Collect unique job titles (preserve order of first appearance)
    seen_roles = []
    for row in rows:
        title = row[2]
        if title not in seen_roles:
            seen_roles.append(title)

    # Assign colors per role
    role_colors = [
        "#3b82f6",  # blue
        "#06b6d4",  # teal / cyan
        "#8b5cf6",  # purple
        "#10b981",  # emerald
        "#f97316",  # orange
        "#ec4899",  # pink
        "#eab308",  # yellow
        "#ef4444",  # red
        "#14b8a6",  # teal-alt
        "#6366f1",  # indigo
    ]

    job_roles = []
    for i, role in enumerate(seen_roles):
        job_roles.append({
            "key": role,
            "color": role_colors[i % len(role_colors)],
        })

    # Build per-day objects: { day: "Mon", "Cyber Dev": 5, "Cloud": 3, ... }
    day_map = {}  # date_str -> dict
    for row in rows:
        label = row[0].strip()
        date_str = str(row[1])
        job_title = row[2]
        count = row[3]

        if date_str not in day_map:
            day_map[date_str] = {"day": label}
            # Init all roles to 0
            for role in seen_roles:
                day_map[date_str][role] = 0

        day_map[date_str][job_title] = count

    # Sort by date, return list
    data = [v for _, v in sorted(day_map.items())]

    return {"weekly_stats": data, "job_roles": job_roles}


@router.get("/dashboard/raw-resumes", tags=["Dashboard"])
def get_raw_resumes(
    current_user: dict = Depends(get_current_user),
):
    """
    Return all resumes with their associated job role since Jan 1, 2026.
    Used by the frontend to dynamically transform and group into Week/Month/Year views.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            r.uploaded_at AS created_at,
            j.title AS role
        FROM resumes r
        JOIN applications a ON a.resume_id = r.id
        JOIN jobs j ON j.id = a.job_id
        WHERE r.uploaded_at >= '2026-01-01'
        ORDER BY r.uploaded_at ASC;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    resumes = []
    seen_roles = []
    
    for row in rows:
        role = row[1]
        resumes.append({
            "createdAt": row[0].isoformat(),
            "role": role
        })
        if role not in seen_roles:
            seen_roles.append(role)
            
    # Assign standard colors per role
    role_colors = [
        "#3b82f6",  # blue
        "#06b6d4",  # teal
        "#8b5cf6",  # purple
        "#10b981",  # emerald
        "#f97316",  # orange
        "#ec4899",  # pink
    ]

    job_roles = []
    for i, role in enumerate(seen_roles):
        job_roles.append({
            "key": role,
            "color": role_colors[i % len(role_colors)],
        })

    return {
        "resumes": resumes,
        "job_roles": job_roles
    }

