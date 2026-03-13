from supabase import create_client
from app.core.config import get_settings

# Force load settings to ensure variables are available
settings = get_settings()
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_KEY
SUPABASE_BUCKET = settings.SUPABASE_BUCKET

supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"CRITICAL: Failed to initialize Supabase client: {e}")

def upload_resume(file_bytes: bytes, filename: str) -> str:
    """
    Uploads file bytes to Supabase Storage.
    Returns the path: resumes/{filename}
    """
    if not supabase:
        raise RuntimeError("Supabase client not initialized. Check your environment variables.")

    import time
    timestamp = int(time.time())
    unique_filename = f"{timestamp}_{filename}"
    path = f"resumes/{unique_filename}"
    
    # Upload bytes
    try:
        res = supabase.storage.from_(SUPABASE_BUCKET).upload(
            path,
            file_bytes,
            {
                "content-type": "application/pdf" if filename.lower().endswith(".pdf") else "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "upsert": "true"
            }
        )
        # Check for error in response if supabase-py doesn't raise
        if hasattr(res, 'error') and res.error:
            raise RuntimeError(f"Supabase error: {res.error}")
    except Exception as e:
        print(f"ERROR: Supabase upload failed for {path}: {e}")
        raise e
    
    return path

def get_resume_url(path: str) -> str:
    """
    Returns the public URL for a given path.
    """
    if not supabase or not path.startswith("resumes/"):
        return path # Local or legacy path
        
    try:
        res = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(path)
        return res
    except Exception:
        return path

def download_resume_bytes(path: str) -> bytes:
    """
    Downloads raw bytes from Supabase.
    """
    if not supabase or not path.startswith("resumes/"):
        return None
        
    try:
        response = supabase.storage.from_(SUPABASE_BUCKET).download(path)
        return response
    except Exception as e:
        print(f"ERROR: Failed to download {path} from Supabase: {e}")
        return None

def delete_resume(path: str):
    """
    Deletes a file from Supabase Storage.
    """
    if not supabase or not path.startswith("resumes/"):
        return
        
    try:
        supabase.storage.from_(SUPABASE_BUCKET).remove([path])
    except Exception as e:
        print(f"Warning: Failed to delete {path} from Supabase: {e}")