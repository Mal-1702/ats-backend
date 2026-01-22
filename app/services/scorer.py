import re
from typing import Dict, List


# -------------------------------------------------
# EXPERIENCE EXTRACTION
# -------------------------------------------------

def extract_years_of_experience(text: str) -> float:
    """
    Extract numeric years of experience from resume text.

    Examples it supports:
    - "3 years experience"
    - "5+ years"
    - "2.5 years"
    - "10 years of experience"
    """

    text = text.lower()

    # Regex to capture numbers before 'year' or 'years'
    matches = re.findall(r'(\d+(?:\.\d+)?)\s*\+?\s*years?', text)

    if not matches:
        return 0.0

    # Take maximum mentioned experience (best assumption)
    return max(float(year) for year in matches)


# -------------------------------------------------
# EXPERIENCE SCORING
# -------------------------------------------------

def experience_score(resume_text: str, required_years: float = 0) -> int:
    """
    Calculate experience score based on numeric years.
    """

    candidate_years = extract_years_of_experience(resume_text)

    # No experience mentioned
    if candidate_years == 0:
        return 20

    # If job specifies minimum experience
    if required_years > 0:
        ratio = candidate_years / required_years

        if ratio >= 1.5:
            return 100
        elif ratio >= 1.0:
            return 85
        elif ratio >= 0.75:
            return 65
        else:
            return 40

    # Generic scoring if job has no requirement
    if candidate_years < 2:
        return 40
    elif 2<candidate_years < 4:
        return 60
    elif 4<candidate_years < 7:
        return 80
    else:
        return 95


# -------------------------------------------------
# SKILL / KEYWORD MATCHING
# -------------------------------------------------

def keyword_score(resume_text: str, keywords: List[str]) -> int:
    """
    Score based on keyword presence in resume text.
    """

    if not keywords:
        return 0

    resume_text = resume_text.lower()
    keywords = [kw.lower() for kw in keywords]

    matched = sum(1 for kw in keywords if kw in resume_text)

    return int((matched / len(keywords)) * 100)


# -------------------------------------------------
# MAIN SCORING FUNCTION
# -------------------------------------------------

def score_resume(resume_text: str, job: Dict) -> Dict:
    """
    Main ATS scoring function.
    Returns score + breakdown + explanation.
    """

    skills = job.get("skills", [])
    keywords = job.get("keywords", skills)
    required_years = job.get("min_experience", 0)

    skill_match = keyword_score(resume_text, skills)
    keyword_match = keyword_score(resume_text, keywords)
    exp_score = experience_score(resume_text, required_years)

    # Weighted final score
    final_score = int(
        (0.4 * skill_match) +
        (0.3 * keyword_match) +
        (0.3 * exp_score)
    )

    explanation = (
        f"Skill match: {skill_match}%, "
        f"Keyword relevance: {keyword_match}%, "
        f"Experience score: {exp_score}% "
        f"(Required: {required_years} years)."
    )

    return {
        "final_score": final_score,
        "breakdown": {
            "skill_match": skill_match,
            "keyword_match": keyword_match,
            "experience_score": exp_score,
            "extracted_experience_years": extract_years_of_experience(resume_text)
        },
        "explanation": explanation
    }


# -------------------------------------------------
# LOCAL TEST (OPTIONAL – REMOVE LATER)
# -------------------------------------------------

if __name__ == "__main__":
    resume_text = (
        "Senior Python developer with 10+ years experience in "
        "Machine Learning, Data Science, SQL and backend systems."
    )

    job = {
        "skills": ["Python", "ML", "SQL"],
        "keywords": ["data", "backend"],
        "min_experience": 3
    }

    result = score_resume(resume_text, job)
    print(result)
