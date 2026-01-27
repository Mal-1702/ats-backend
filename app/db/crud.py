from app.db.dbase import get_db_connection
from typing import List, Tuple
from app.models.job import JobCreate
from app.services.scorer import extract_years_of_experience
from app.services.resume_parser import parse_resume


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


def insert_job(job: JobCreate) -> int:
    """
    Insert a new job into the database.
    Returns the created job ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO jobs (title, skills, keywords, min_experience)
        VALUES (%s, %s, %s, %s)
        RETURNING id;
    """

    cursor.execute(
        query,
        (
            job.title,
            job.skills,
            job.keywords,
            job.min_experience
        )
    )

    job_id = cursor.fetchone()[0]
    conn.commit()

    cursor.close()
    conn.close()

    return job_id


def get_all_jobs() -> List[Tuple]:
    """
    Fetch all jobs from the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT id, title, skills, keywords, min_experience, created_at
        FROM jobs
        ORDER BY created_at DESC;
    """

    cursor.execute(query)
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    return rows

def get_job_by_id(job_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT id, title, skills, keywords, min_experience
        FROM jobs
        WHERE id = %s;
    """
    cursor.execute(query, (job_id,))
    row = cursor.fetchone()

    cursor.close()
    conn.close()
    return row


def get_all_resume_files():
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT id, filename FROM resumes;"
    cursor.execute(query)
    rows = cursor.fetchall()

    cursor.close()
    conn.close()
    return rows


def upsert_ranking(job_id: int, resume_id: int, score: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO rankings (job_id, resume_id, score)
        VALUES (%s, %s, %s)
        ON CONFLICT (job_id, resume_id)
        DO UPDATE SET score = EXCLUDED.score, created_at = CURRENT_TIMESTAMP;
    """

    cursor.execute(query, (job_id, resume_id, score))
    conn.commit()

    cursor.close()
    conn.close()

def get_rankings_for_job(job_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT
            r.resume_id,
            res.filename,
            r.score,
            r.created_at
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
