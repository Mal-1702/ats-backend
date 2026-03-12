import os
from app.utilities.storage import upload_resume, get_resume_url
from app.db.crud import insert_resume, _calculate_file_hash, get_resume_by_id

def test_supabase_flow():
    test_filename = "test_upload_to_supabase.pdf"
    test_content = b"%PDF-1.4\n%This is a fake PDF for testing storage.\n"

    print("1. Uploading to Supabase via utility...")
    # This shouldn't fail if supabase is configured
    path = upload_resume(test_content, test_filename)
    print(f"   Success! Path: {path}")

    print("2. Getting Public URL...")
    url = get_resume_url(path)
    print(f"   Success! URL: {url}")

    print("3. Testing DB Insertion and background tools...")
    # This runs `_calculate_file_hash` and `parse_resume` which should dynamically download it
    resume_id = insert_resume(
        filename=test_filename,
        upload_source="test_script"
    )
    print(f"   Success! Inserted row ID: {resume_id}")

    row = get_resume_by_id(resume_id)
    print(f"   DB check: filename={row[1]}, file_hash={row[7]}")
    
    # We purposefully passed a fake PDF string which should fail parsing, producing blank text, 
    # but the download wrapper in `_calculate_file_hash` and `parse_resume` shouldn't throw a FileNotFoundError

if __name__ == "__main__":
    test_supabase_flow()
