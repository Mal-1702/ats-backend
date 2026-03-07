from app.db.dbase import get_db_connection
from typing import List, Tuple, Optional
from app.models.job import JobCreate
from app.services.scorer import extract_years_of_experience
from app.services.resume_parser import parse_resume
import json


def insert_resume(filename: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    path = f"uploads/{filename}"

    try:
        text = parse_resume(path)
    except:
        text = ""

    experience = extract_years_of_experience(text)

    query = """
        INSERT INTO resumes (filename, experience_years, parsed_text)
        VALUES (%s, %s, %s)
        RETURNING id;
    """

    cursor.execute(query, (filename, experience, text))
    resume_id = cursor.fetchone()[0]

    conn.commit()
    cursor.close()
    conn.close()

    return resume_id

def get_all_resumes(
    search_query: Optional[str] = None,
    skills: Optional[List[str]] = None,
    min_experience: Optional[float] = None,
    max_experience: Optional[float] = None,
    keywords: Optional[str] = None
):
    """
    Fetch resumes with advanced filtering and search relevance ranking.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    # Build the base query with dynamic ranking
    base_query = """
        SELECT id, filename, uploaded_at, experience_years, extracted_skills
    """
    
    # Ranking logic
    ranking_parts = ["0"]
    params = []
    
    if search_query:
        # Boost for filename match
        ranking_parts.append("(CASE WHEN filename ILIKE %s THEN 10 ELSE 0 END)")
        params.append(f"%{search_query}%")
        # Boost for name/role in parsed_text (if we had specific columns, otherwise we scan text)
        ranking_parts.append("(CASE WHEN parsed_text ILIKE %s THEN 5 ELSE 0 END)")
        params.append(f"%{search_query}%")

    if skills:
        # Boost for skill matches
        for skill in skills:
            ranking_parts.append("(CASE WHEN %s = ANY(extracted_skills) THEN 8 ELSE 0 END)")
            params.append(skill)

    if keywords:
        ranking_parts.append("(CASE WHEN parsed_text ILIKE %s THEN 3 ELSE 0 END)")
        params.append(f"%{keywords}%")

    relevance_score = " + ".join(ranking_parts)
    
    query = f"{base_query}, ({relevance_score}) as relevance FROM resumes"
    where_clauses = []

    if search_query:
        where_clauses.append("(filename ILIKE %s OR parsed_text ILIKE %s)")
        params.extend([f"%{search_query}%", f"%{search_query}%"])
    
    if skills:
        # Filter for resumes containing ALL selected skills (as requested in Feature 4)
        where_clauses.append("extracted_skills @> %s")
        params.append(skills)

    if min_experience is not None:
        where_clauses.append("experience_years >= %s")
        params.append(min_experience)
    
    if max_experience is not None:
        where_clauses.append("experience_years <= %s")
        params.append(max_experience)

    if keywords:
        where_clauses.append("parsed_text ILIKE %s")
        params.append(f"%{keywords}%")

    if where_clauses:
        query += " WHERE " + " AND ".join(where_clauses)

    query += " ORDER BY relevance DESC, uploaded_at DESC"

    cur.execute(query, tuple(params))
    rows = cur.fetchall()

    cur.close()
    conn.close()

    return rows


def get_unique_skills() -> List[str]:
    """
    Extract a unique list of all skills detected across all resumes.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT DISTINCT unnest(extracted_skills) as skill
        FROM resumes
        WHERE extracted_skills IS NOT NULL
        ORDER BY skill ASC;
    """)
    
    skills = [row[0] for row in cur.fetchall() if row[0]]

    cur.close()
    conn.close()
    return skills


def _ensure_skill_priorities_column(cursor) -> bool:
    """Ensure the skill_priorities JSONB column exists on the jobs table."""
    try:
        cursor.execute("""
            ALTER TABLE jobs
            ADD COLUMN IF NOT EXISTS skill_priorities JSONB DEFAULT NULL;
        """)
        return True
    except Exception:
        return False


def insert_job(job: JobCreate) -> int:
    """
    Insert a new job into the database.
    Stores skill_priorities as JSONB when provided.
    Returns the created job ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    _ensure_skill_priorities_column(cursor)

    # Serialise skill_priorities to a JSON list if provided
    skill_priorities_json = None
    if job.skill_priorities:
        skill_priorities_json = json.dumps(
            [sp.model_dump() for sp in job.skill_priorities]
        )

    try:
        query = """
            INSERT INTO jobs (title, skills, keywords, min_experience, skill_priorities)
            VALUES (%s, %s, %s, %s, %s::jsonb)
            RETURNING id;
        """
        cursor.execute(
            query,
            (
                job.title,
                job.skills,
                job.keywords,
                job.min_experience,
                skill_priorities_json,
            )
        )
    except Exception:
        # Fallback for DBs that don't have the column yet
        conn.rollback()
        query = """
            INSERT INTO jobs (title, skills, keywords, min_experience)
            VALUES (%s, %s, %s, %s)
            RETURNING id;
        """
        cursor.execute(query, (job.title, job.skills, job.keywords, job.min_experience))

    job_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    conn.close()
    return job_id


def get_all_jobs() -> List[Tuple]:
    """Fetch all jobs from the database (includes skill_priorities if present)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, title, skills, keywords, min_experience, created_at,
                   COALESCE(is_active, TRUE) as is_active,
                   skill_priorities
            FROM jobs
            ORDER BY created_at DESC;
        """)
    except Exception:
        conn.rollback()
        cursor.execute("""
            SELECT id, title, skills, keywords, min_experience, created_at,
                   COALESCE(is_active, TRUE) as is_active
            FROM jobs
            ORDER BY created_at DESC;
        """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def get_job_by_id(job_id: int):
    """Fetch a single job by ID (includes skill_priorities if present)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, title, skills, keywords, min_experience, created_at,
                   COALESCE(is_active, TRUE) as is_active,
                   skill_priorities
            FROM jobs WHERE id = %s;
        """, (job_id,))
    except Exception:
        conn.rollback()
        cursor.execute("""
            SELECT id, title, skills, keywords, min_experience, created_at,
                   COALESCE(is_active, TRUE) as is_active
            FROM jobs WHERE id = %s;
        """, (job_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row


def get_all_resume_files():
    '''
    for fectching all resumes 
    '''
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT id, filename FROM resumes;"
    cursor.execute(query)
    rows = cursor.fetchall()

    cursor.close()
    conn.close()
    return rows


def upsert_ranking(job_id: int, resume_id: int, score: int,
                   breakdown: dict = None, insights: dict = None):
    """
    Upsert a ranking record with optional JSON breakdown and insights.
    Uses column-based ON CONFLICT to avoid dependency on a specific constraint name.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Try with breakdown/insights columns first
    try:
        query = """
            INSERT INTO rankings (job_id, resume_id, score, breakdown, insights)
            VALUES (%s, %s, %s, %s::jsonb, %s::jsonb)
            ON CONFLICT (job_id, resume_id)
            DO UPDATE SET
                score      = EXCLUDED.score,
                breakdown  = EXCLUDED.breakdown,
                insights   = EXCLUDED.insights,
                created_at = CURRENT_TIMESTAMP;
        """
        cursor.execute(
            query,
            (
                job_id,
                resume_id,
                score,
                json.dumps(breakdown) if breakdown else None,
                json.dumps(insights)  if insights  else None,
            )
        )
    except Exception:
        # Fallback: store just the score if new columns aren't available
        conn.rollback()
        query_basic = """
            INSERT INTO rankings (job_id, resume_id, score)
            VALUES (%s, %s, %s)
            ON CONFLICT (job_id, resume_id)
            DO UPDATE SET score = EXCLUDED.score, created_at = CURRENT_TIMESTAMP;
        """
        cursor.execute(query_basic, (job_id, resume_id, score))

    # --- Lifecycle update: ensure job_resumes association exists ---
    cursor.execute("""
        INSERT INTO job_resumes (job_id, resume_id, status)
        VALUES (%s, %s, 'active')
        ON CONFLICT (job_id, resume_id) DO NOTHING;
    """, (job_id, resume_id))

    conn.commit()
    cursor.close()
    conn.close()

def get_rankings_for_job(job_id: int):
    """Retrieve all rankings for a job, ordered by score descending."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT
            r.resume_id,
            res.filename,
            r.score,
            r.created_at,
            r.breakdown,
            r.insights
        FROM rankings r
        JOIN resumes res ON r.resume_id = res.id
        WHERE r.job_id = %s
        ORDER BY r.score DESC;
    """

    cursor.execute(query, (job_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def update_resume_parsed_data(resume_id, experience_years, extracted_skills, parsed_text):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        UPDATE resumes
        SET experience_years = %s,
            extracted_skills = %s,
            parsed_text = %s
        WHERE id = %s
    """, (experience_years, extracted_skills, parsed_text, resume_id))

    conn.commit()
    cur.close()
    conn.close()


def get_resume_by_id(resume_id: int):
    """Fetch a single resume by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, filename, uploaded_at, experience_years, extracted_skills, profile_data, parsed_text FROM resumes WHERE id = %s",
        (resume_id,)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row


def delete_resume(resume_id: int) -> Optional[str]:
    """Delete resume from database. Returns filename or None if not found."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT filename FROM resumes WHERE id = %s", (resume_id,))
    result = cur.fetchone()
    if not result:
        cur.close()
        conn.close()
        return None
    filename = result[0]
    cur.execute("DELETE FROM rankings WHERE resume_id = %s", (resume_id,))
    cur.execute("DELETE FROM resumes WHERE id = %s", (resume_id,))
    conn.commit()
    cur.close()
    conn.close()
    return filename


def update_resume_with_profile(resume_id: int, candidate_profile: dict):
    """Update resume with full candidate profile."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE resumes
        SET experience_years = %s,
            extracted_skills = %s,
            parsed_text = %s,
            profile_data = %s,
            processed_at = CURRENT_TIMESTAMP
        WHERE id = %s;
    """, (
        candidate_profile.get('years_of_experience', 0),
        candidate_profile.get('skills', []),
        candidate_profile.get('parsed_text', ''),
        json.dumps(candidate_profile),
        resume_id
    ))
    conn.commit()
    cursor.close()
    conn.close()


def get_all_resume_profiles_for_job() -> List[dict]:
    """Get all processed resume profiles."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT profile_data FROM resumes WHERE profile_data IS NOT NULL ORDER BY uploaded_at DESC;")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    profiles = []
    for row in rows:
        if row[0]:
            try:
                profiles.append(json.loads(row[0]) if isinstance(row[0], str) else row[0])
            except Exception:
                continue
    return profiles


# ============================================
# JOB STATUS / EDIT / DELETE
# ============================================

def toggle_job_status(job_id: int, is_active: bool) -> bool:
    """Update job active status. Returns True if successful."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE jobs SET is_active = %s WHERE id = %s RETURNING id", (is_active, job_id))
    result = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return result is not None


def delete_job(job_id: int) -> bool:
    """Delete a job by ID. Returns True if deleted."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM jobs WHERE id = %s RETURNING id", (job_id,))
    result = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return result is not None


def update_job_skills(job_id: int, skills: list) -> bool:
    """Update the skills list for a job."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE jobs SET skills = %s WHERE id = %s RETURNING id", (skills, job_id))
    result = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return result is not None


def update_job_with_profile(job_id: int, job_profile: dict):
    """Update job with profile from processing pipeline."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE jobs SET profile_data = %s, processed_at = CURRENT_TIMESTAMP WHERE id = %s;",
        (json.dumps(job_profile), job_id)
    )
    conn.commit()
    cursor.close()
    conn.close()


# ============================================
# USER AUTHENTICATION CRUD
# ============================================

def create_user(email: str, hashed_password: str, full_name: str = None) -> int:
    """Create a new user account."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (email, hashed_password, full_name) VALUES (%s, %s, %s) RETURNING id;",
        (email.strip().lower(), hashed_password, full_name)
    )
    user_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    conn.close()
    return user_id


def get_user_by_email(email: str):
    """Get user by email."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, email, hashed_password, full_name, is_active, created_at FROM users WHERE email = %s;",
        (email.strip().lower(),)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row


def get_user_by_id(user_id: int):
    """Get user by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, email, hashed_password, full_name, is_active, created_at FROM users WHERE id = %s;",
        (user_id,)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row


# ============================================
# DATA LIFECYCLE & CLEANUP
# ============================================

def close_job(job_id: int, reason: str = "Job filled/closed"):
    """Mark job as closed and archive associated resumes."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Update job status
        cursor.execute("""
            UPDATE jobs 
            SET is_active = FALSE, closed_at = CURRENT_TIMESTAMP 
            WHERE id = %s RETURNING id;
        """, (job_id,))
        if not cursor.fetchone():
            return False
            
        # 2. Archive associated resumes
        cursor.execute("""
            UPDATE job_resumes 
            SET status = 'archived' 
            WHERE job_id = %s;
        """, (job_id,))
        
        # 3. Log event
        cursor.execute("""
            INSERT INTO audit_logs (target_type, target_id, action, reason)
            VALUES ('job', %s, 'closed', %s);
        """, (job_id, reason))
        
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def reopen_job(job_id: int):
    """Reactivate a closed job and its associated resumes."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE jobs 
            SET is_active = TRUE, closed_at = NULL 
            WHERE id = %s RETURNING id;
        """, (job_id,))
        if not cursor.fetchone():
            return False
            
        cursor.execute("UPDATE job_resumes SET status = 'active' WHERE job_id = %s;", (job_id,))
        cursor.execute("INSERT INTO audit_logs (target_type, target_id, action) VALUES ('job', %s, 'reopened');", (job_id,))
        
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def toggle_resume_protection(resume_id: int, is_protected: bool):
    """Set protection status for a resume."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE resumes SET is_protected = %s WHERE id = %s RETURNING id;", (is_protected, resume_id))
    result = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return result is not None

def get_stale_resumes_for_cleanup(retention_days: int):
    """
    Find resumes eligible for deletion:
    - Associated with closed jobs for > inheritance days
    - NOT associated with any active job
    - NOT protected
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    query = """
        SELECT r.id, r.filename 
        FROM resumes r
        WHERE r.is_protected = FALSE
        AND NOT EXISTS (
            -- Must not be linked to ANY active job
            SELECT 1 FROM job_resumes jr
            JOIN jobs j ON jr.job_id = j.id
            WHERE jr.resume_id = r.id AND (j.is_active = TRUE OR j.closed_at IS NULL OR j.closed_at > NOW() - INTERVAL '%s days')
        )
        AND EXISTS (
            -- Must have been linked to AT LEAST ONE closed job that expired
            SELECT 1 FROM job_resumes jr
            JOIN jobs j ON jr.job_id = j.id
            WHERE jr.resume_id = r.id AND j.is_active = FALSE AND j.closed_at < NOW() - INTERVAL '%s days'
        );
    """
    cursor.execute(query, (retention_days, retention_days))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

def log_audit_event(target_type: str, target_id: int, action: str, reason: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO audit_logs (target_type, target_id, action, reason)
        VALUES (%s, %s, %s, %s);
    """, (target_type, target_id, action, reason))
    conn.commit()
    cursor.close()
    conn.close()


# ─────────────────────────────────────────────
# Candidate Portal CRUD
# ─────────────────────────────────────────────

def get_open_jobs():
    """Return all active/open jobs (for public candidate portal)."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, title, skills, min_experience, created_at
        FROM jobs
        WHERE is_active = true
        ORDER BY created_at DESC;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


def insert_application(job_id: int, resume_id: int, candidate_name: str, candidate_email: str) -> int:
    """Insert a new candidate application and return the application ID."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO applications (job_id, resume_id, candidate_name, candidate_email)
        VALUES (%s, %s, %s, %s)
        RETURNING id, submitted_at;
    """, (job_id, resume_id, candidate_name, candidate_email))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return row[0], row[1]


def get_resumes_by_job(job_id: int):
    """Return resumes linked to a specific job via the applications table."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT r.id, r.filename, r.uploaded_at, r.experience_years, r.extracted_skills
        FROM resumes r
        INNER JOIN applications a ON a.resume_id = r.id
        WHERE a.job_id = %s
        ORDER BY r.uploaded_at DESC;
    """, (job_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


def get_all_jobs_for_filter():
    """Return id and title of all active jobs for the HR filter panel."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, title FROM jobs
        WHERE is_active = true
        ORDER BY title ASC;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows
