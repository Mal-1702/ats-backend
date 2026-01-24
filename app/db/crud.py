from app.db.dbase import get_db_connection
from typing import List, Tuple
from app.models.job import JobCreate


def insert_resume(filename: str):
    """
    Save uploaded resume metadata into the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO resumes (filename)
        VALUES (%s);
    """

    cursor.execute(query, (filename,))
    conn.commit()

    cursor.close()
    conn.close()


def get_all_resumes():
    """
    Fetch all uploaded resumes from the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT id, filename, uploaded_at
        FROM resumes
        ORDER BY uploaded_at DESC;
    """

    cursor.execute(query)
    rows = cursor.fetchall()

    cursor.close()
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
    