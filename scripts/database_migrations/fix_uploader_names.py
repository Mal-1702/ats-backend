import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DATABASE_HOST", "localhost"),
        port=int(os.getenv("DATABASE_PORT", 5432)),
        user=os.getenv("DATABASE_USER", "postgres"),
        password=os.getenv("DATABASE_PASSWORD"),
        database=os.getenv("DATABASE_NAME", "ats_db")
    )

def migrate_uploader_names():
    print("🚀 Starting migration: Correcting uploader names...")
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 1. Backfill 'Candidate Portal' for portal uploads
        print("   -> Backfilling 'Candidate Portal' for portal source...")
        cur.execute("""
            UPDATE resumes 
            SET uploaded_by_name = 'Candidate Portal'
            WHERE upload_source = 'candidate_portal' 
            AND (uploaded_by_name IS NULL OR uploaded_by_name = '');
        """)
        print(f"      Rows affected: {cur.rowcount}")

        # 2. Backfill real names from users table for HR uploads
        print("   -> Backfilling real user names for HR manual uploads...")
        cur.execute("""
            UPDATE resumes r
            SET uploaded_by_name = u.full_name
            FROM users u
            WHERE r.uploaded_by_user_id = u.id
            AND r.upload_source = 'hr_manual_upload'
            AND (r.uploaded_by_name IS NULL OR r.uploaded_by_name = '' OR r.uploaded_by_name = 'HR TEAM');
        """)
        print(f"      Rows affected: {cur.rowcount}")

        # 3. Final fallback for HR uploads without user_id or where user not found
        print("   -> Applying fallback 'HR Upload' for indeterminate HR records...")
        cur.execute("""
            UPDATE resumes
            SET uploaded_by_name = 'HR Upload'
            WHERE upload_source = 'hr_manual_upload'
            AND (uploaded_by_name IS NULL OR uploaded_by_name = '' OR uploaded_by_name = 'HR TEAM');
        """)
        print(f"      Rows affected: {cur.rowcount}")

        conn.commit()
        print("✅ Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {str(e)}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate_uploader_names()
