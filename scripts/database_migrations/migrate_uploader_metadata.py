import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DATABASE_HOST", "localhost"),
            port=int(os.getenv("DATABASE_PORT", 5432)),
            user=os.getenv("DATABASE_USER", "postgres"),
            password=os.getenv("DATABASE_PASSWORD"),
            database=os.getenv("DATABASE_NAME", "ats_db")
        )
        cur = conn.cursor()

        print("🚀 Starting migration: Adding uploader metadata to resumes table...")

        # Add columns for attribution
        cur.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS uploaded_by_user_id INTEGER;")
        cur.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS uploaded_by_name TEXT;")
        cur.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS upload_source TEXT DEFAULT 'candidate_portal';")
        
        # Add file_hash for duplicate detection
        cur.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS file_hash TEXT;")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_resumes_file_hash ON resumes(file_hash);")

        conn.commit()
        print("✅ Migration completed successfully!")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    migrate()
