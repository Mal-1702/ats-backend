import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def diagnose():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    bucket = os.getenv("SUPABASE_BUCKET", "resumes")

    print(f"Checking Supabase URL: {url}")
    print(f"Using Bucket: {bucket}")
    
    if not url or not key:
        print("ERROR: SUPABASE_URL or SUPABASE_KEY missing in .env")
        return

    try:
        supabase = create_client(url, key)
        print("SUCCESS: Supabase client initialized.")
    except Exception as e:
        print(f"ERROR: Failed to initialize Supabase client: {e}")
        return

    try:
        # Check bucket existence
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        print(f"Available buckets: {bucket_names}")
        
        if bucket not in bucket_names:
            print(f"ERROR: Bucket '{bucket}' not found!")
        else:
            print(f"SUCCESS: Bucket '{bucket}' exists.")
            
            # Try a test upload
            print("Attempting test upload...")
            test_data = b"test file content"
            test_name = "diagnostics_test.txt"
            res = supabase.storage.from_(bucket).upload(
                f"resumes/{test_name}",
                test_data,
                {"upsert": "true"}
            )
            print(f"SUCCESS: Test upload complete. Path: {res}")
            
    except Exception as e:
        print(f"ERROR: Storage operation failed: {e}")

if __name__ == "__main__":
    diagnose()
