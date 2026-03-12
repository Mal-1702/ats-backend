from app.db.crud import insert_resume, get_all_resumes

def test_attribution():
    print("Testing resume insertion...")
    
    # 1. Simulate portal upload
    portal_id = insert_resume(
        "test_portal_resume.pdf",
        upload_source="candidate_portal",
        uploaded_by_name="Candidate Portal",
        uploaded_by="portal",
        uploader_name=None
    )
    print(f"Inserted portal resume ID: {portal_id}")

    # 2. Simulate internal upload
    internal_id = insert_resume(
        "test_internal_resume.pdf",
        uploaded_by_user_id=1,
        uploaded_by_name="Test User",
        upload_source="hr_manual_upload",
        uploaded_by="internal",
        uploader_name="Test User"
    )
    print(f"Inserted internal resume ID: {internal_id}")

    # 3. Retrieve all
    print("\nRetrieving resumes...")
    resumes = get_all_resumes()
    for row in resumes[:5]:
        print(f"Row data: {row}")

if __name__ == "__main__":
    test_attribution()
