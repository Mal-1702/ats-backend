"""
One-time migration script: creates the 'applications' table
that links candidates to job postings.

Run once: python create_applications_table.py
"""
from app.db.dbase import get_db_connection

def run_migration():
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id              SERIAL PRIMARY KEY,
            job_id          INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
            resume_id       INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
            candidate_name  TEXT    NOT NULL,
            candidate_email TEXT    NOT NULL,
            submitted_at    TIMESTAMP DEFAULT NOW()
        );
    """)

    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_applications_job_id
        ON applications(job_id);
    """)

    conn.commit()
    cur.close()
    conn.close()
    print("✅  'applications' table created (or already exists).")


if __name__ == "__main__":
    run_migration()
