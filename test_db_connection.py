import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

def test_connection():
    # Attempt to use DATABASE_URL
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("false (No DATABASE_URL found in .env)")
        return
        
    try:
        # Connect to the remote database
        conn = psycopg2.connect(database_url)
        conn.close()
        print("true")
    except Exception as e:
        print(f"false (Connection failed: {e})")

if __name__ == "__main__":
    test_connection()
