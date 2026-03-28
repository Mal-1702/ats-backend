"""One-time migration: add dob column to users table."""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv("DATABASE_HOST", "localhost"),
    port=int(os.getenv("DATABASE_PORT", 5432)),
    user=os.getenv("DATABASE_USER"),
    password=os.getenv("DATABASE_PASSWORD"),
    dbname=os.getenv("DATABASE_NAME"),
)

cur = conn.cursor()
cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;")
conn.commit()
cur.close()
conn.close()
print("✅ Migration complete: dob column added to users table (existing rows unchanged).")
