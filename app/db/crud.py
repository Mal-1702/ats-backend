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

def get_all_resumes():
    """
    Fetch all uploaded resumes from the database.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id,
               filename,
               uploaded_at,
               experience_years,
               extracted_skills
        FROM resumes
        ORDER BY uploaded_at DESC
    """)

    rows = cur.fetchall()

    cur.close()
    conn.close()

    return rows


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
# SUPERVISOR DECISIONS CRUD
# ============================================

def save_supervisor_decision(job_id: int, supervisor_decision: dict):
    """Save supervisor decision for a job."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO supervisor_decisions (job_id, decision_data, created_at)
        VALUES (%s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (job_id)
        DO UPDATE SET decision_data = EXCLUDED.decision_data, created_at = CURRENT_TIMESTAMP;
    """, (job_id, json.dumps(supervisor_decision)))
    conn.commit()
    cursor.close()
    conn.close()


def get_supervisor_decision(job_id: int):
    """Get supervisor decision for a job."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT decision_data, created_at FROM supervisor_decisions WHERE job_id = %s;",
        (job_id,)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        return json.loads(row[0]) if isinstance(row[0], str) else row[0]
    return None
