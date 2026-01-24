import os
from app.services.resume_parser import parse_resume
from app.services.scorer import score_resume


def rank_resumes_for_job(job, resumes, uploads_dir="uploads"):
    """
    job: (id, title, skills, keywords, min_experience)
    resumes: [(resume_id, filename), ...]
    """
    results = []

    job_id, _, skills, keywords, min_experience = job

    for resume_id, filename in resumes:
        path = os.path.join(uploads_dir, filename)

        if not os.path.exists(path):
            continue

        text = parse_resume(path)

        score = score_resume(
            resume_text=text,
            required_skills=skills,
            keywords=keywords,
            min_experience=min_experience
        )

        results.append({
            "resume_id": resume_id,
            "filename": filename,
            "score": score
        })

    # Sort high → low
    results.sort(key=lambda x: x["score"], reverse=True)
    return results
