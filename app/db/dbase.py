import psycopg2
from psycopg2 import OperationalError
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """
    Creates and returns a PostgreSQL database connection.
    Supports both DATABASE_URL (production) and individual env vars (local).
    """

    try:
        database_url = os.getenv("DATABASE_URL")

        if database_url:
            # Production (Supabase / Render / Cloud)
            connection = psycopg2.connect(database_url)
        else:
            # Local development fallback
            connection = psycopg2.connect(
                host=os.getenv("DATABASE_HOST", "localhost"),
                port=int(os.getenv("DATABASE_PORT", 5432)),
                user=os.getenv("DATABASE_USER", "postgres"),
                password=os.getenv("DATABASE_PASSWORD"),
                database=os.getenv("DATABASE_NAME", "ats_db")
            )

        return connection

    except OperationalError as e:
        print("❌ Failed to connect to PostgreSQL")
        print(e)
        raise