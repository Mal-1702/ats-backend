import psycopg2
from psycopg2 import OperationalError
import os
from dotenv import load_dotenv

load_dotenv()


def get_db_connection():
    """
    Creates and returns a PostgreSQL database connection using environment variables.
    """
    try:
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
