import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def migrate_attribution():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DATABASE_HOST", "localhost"),
            port=int(os.getenv("DATABASE_PORT", 5432)),
            user=os.getenv("DATABASE_USER", "postgres"),
            password=os.getenv("DATABASE_PASSWORD"),
            database=os.getenv("DATABASE_NAME", "ats_db")
        )
        cur = conn.cursor()

        print("🚀 Starting migration: Adding correct attribution columns to resumes table...")

        # Add new columns
        cur.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(50) DEFAULT 'portal';")
        cur.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS uploader_name VARCHAR(255);")

        print("✅ Migration completed successfully! Columns configured.")

        # Optional: migrate data from old columns to new ones for better backward compatibility
        cur.execute("UPDATE resumes SET uploaded_by = 'internal', uploader_name = uploaded_by_name WHERE upload_source = 'hr_manual_upload';")
        cur.execute("UPDATE resumes SET uploaded_by = 'portal', uploader_name = NULL WHERE upload_source = 'candidate_portal';")
        # For legacy data where source isn't strictly defined, default to portal
        cur.execute("UPDATE resumes SET uploaded_by = 'portal', uploader_name = NULL WHERE uploaded_by IS NULL;")
        
        print(f"✅ Data backfilled for older resumes.")

        conn.commit()

    except Exception as e:
        print(f"❌ Migration failed: {e}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    migrate_attribution()
