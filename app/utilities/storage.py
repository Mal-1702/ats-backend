import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "resumes")

supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_resume(file_bytes: bytes, filename: str) -> str:
    """
    Uploads file bytes to Supabase Storage.
    Returns the path: resumes/{filename}
    """
    if not supabase:
        print("Warning: Supabase client not initialized. Check your .env variables.")
        # Fallback to local write if someone runs without supabase configured during dev
        os.makedirs("uploads", exist_ok=True)
        local_path = os.path.join("uploads", filename)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        return local_path

    path = f"resumes/{filename}"
    
    # Upload bytes
    response = supabase.storage.from_(SUPABASE_BUCKET).upload(
        path,
        file_bytes,
        {"content-type": "application/pdf"}
    )
    
    return path

def get_resume_url(path: str) -> str:
    """
    Returns the public URL for a given path.
    """
    if not supabase or not path.startswith("resumes/"):
        return path # It's a local fallback path like uploads/filename.pdf
        
    res = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(path)
    return res

def download_resume_bytes(path: str) -> bytes:
    """
    Downloads raw bytes from Supabase. 
    Required for AI parsing logic which expects bytes/files.
    """
    if not supabase or not path.startswith("resumes/"):
        return None
        
    response = supabase.storage.from_(SUPABASE_BUCKET).download(path)
    return response