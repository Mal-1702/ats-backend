import os
from app.services.resume_parser import parse_resume
from app.services.scorer import score_resume


def rank_resumes_for_job(job, resumes, uploads_dir="uploads"):
    """
    job: (id, title, skills, keywords, min_experience)
    resumes: [(resume_id, filename), ...]
    """
    results = []

    _, _, skills, keywords, min_experience = job

    for resume_id, filename in resumes:
        path = os.path.join(uploads_dir, filename)

        if not os.path.exists(path):
            continue

        try:
            text = parse_resume(path)
        except Exception as e:
            print(f"[ERROR] Failed to parse {filename}: {e}")
            continue

        job_payload = {
            "skills": skills,
            "keywords": keywords,
            "min_experience": min_experience
        }

        try:
            score_data = score_resume(text, job_payload)
        except Exception as e:
            print(f"[ERROR] Failed to score {filename}: {e}")
            continue

        results.append({
            "resume_id": resume_id,
            "filename": filename,
            "score": score_data["final_score"],
            "breakdown": score_data["breakdown"],
            "explanation": score_data["explanation"]
        })

    return results
