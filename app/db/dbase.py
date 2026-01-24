import psycopg2
from psycopg2 import OperationalError


def get_db_connection():
    """
    Creates and returns a PostgreSQL database connection.
    """
    try:
        connection = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password="1702",
            database="ats_db"
        )
        return connection

    except OperationalError as e:
        print("❌ Failed to connect to PostgreSQL")
        print(e)
        raise
