"""
Test: Cross-candidate calibration in job_ranker (calibrate_scores).
Simulates 4 candidates with different capability levels.
"""
import sys, os, importlib.util, traceback

sys.stderr = sys.stdout

def load_mod(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m

try:
    scorer  = load_mod(os.path.join("app","services","scorer.py"),     "scorer")
    ranker  = load_mod(os.path.join("app","services","job_ranker.py"), "ranker")
    print("=== Imports: OK ===\n")

    PASS, FAIL = "[PASS]", "[FAIL]"

    job = {
        "skills": ["Python", "Django", "PostgreSQL", "Docker", "AWS",
                   "Node.js", "Redis", "Kafka"],
        "keywords": ["backend", "api", "microservices"],
        "min_experience": 5,
    }

    resumes = {
        "Senior Staff":
            """Staff Backend Engineer | TechScale (Jan 2015 - Present)
            Led team of 15 engineers, architected scalable microservices for 30M users.
            Python/Django REST APIs, PostgreSQL, Redis, Kafka, Docker, AWS ECS/EKS.
            Mentored 8 engineers. System design ownership. B.Tech CS 2014.
            github.com/user | 12 open-source contributions.""",

        "Senior Dev":
            """Senior Backend Engineer | Startup (Mar 2019 - Present)
            Built REST API services using Django and PostgreSQL.
            Deployed Docker containers on AWS. Used Redis caching.
            3 shipped products. Unit testing with pytest. B.Sc IT 2018.""",

        "Mid Dev":
            """Backend Developer | Agency (Jun 2021 - Present)
            Developed Python Flask APIs. PostgreSQL database management.
            Basic Docker usage. 2 years experience. Agile team.
            B.Sc Computer Science 2021.""",

        "Frontend Intern":
            """Frontend Intern | WebCo (Aug 2024 - Jan 2025)
            Built HTML/CSS pages. Learned React basics.
            No backend experience. Student project on GitHub.
            B.Sc in progress 2025.""",
    }

    # Score individually first
    individual = {}
    for name, text in resumes.items():
        r = scorer.score_resume(text, job, "Backend Engineer")
        individual[name] = r["final_score"]
        print(f"Individual {name}: {r['final_score']}/100")

    print()

    # Build mock results list (as job_ranker would)
    mock_results = []
    for i, (name, text) in enumerate(resumes.items()):
        r = scorer.score_resume(text, job, "Backend Engineer")
        mock_results.append({
            "resume_id":  i + 1,
            "filename":   name + ".pdf",
            "score":      r["final_score"],
            "raw_score":  r["final_score"],
            "breakdown":  r["breakdown"],
            "insights":   r["insights"],
            "matched_skills": r["matched_skills"],
            "missing_skills": r["missing_skills"],
            "bonus_skills":   r["bonus_skills"],
            "explanation":    r["explanation"],
        })

    mock_results.sort(key=lambda x: x["score"], reverse=True)

    # Run calibration
    calibrated = ranker.calibrate_scores(mock_results)

    print("=== Calibrated Pool Scores ===")
    prev_score = 999
    order_ok = True
    for r in calibrated:
        name = r["filename"].replace(".pdf","")
        cs   = r["score"]
        raw  = r["raw_score"]
        comp = r.get("comparative_rank","?")
        fit  = r.get("role_fit","?")
        rec  = r.get("insights",{}).get("recommendation","?")
        print(f"  {name:20s}: raw={raw:3d} -> calibrated={cs:3d} | {comp:25s} | {fit:15s} | {rec}")
        if cs > prev_score:
            order_ok = False
        prev_score = cs

    print()

    # Assertions
    scores_by_name = {
        r["filename"].replace(".pdf",""): r["score"] for r in calibrated
    }
    top = scores_by_name.get("Senior Staff", 0)
    weak = scores_by_name.get("Frontend Intern", 0)

    ok1 = top >= 80
    print(f"{PASS if ok1 else FAIL} Top (Senior Staff) >= 80: {top}")

    ok2 = weak < 60
    print(f"{PASS if ok2 else FAIL} Weak (Frontend Intern) < 60: {weak}")

    ok3 = scores_by_name["Senior Staff"] > scores_by_name["Senior Dev"] > scores_by_name["Mid Dev"]
    print(f"{PASS if ok3 else FAIL} Order preserved: Staff > Senior > Mid")

    print(f"{PASS if order_ok else FAIL} No order inversions in calibrated list")

    ok5 = top <= 95
    print(f"{PASS if ok5 else FAIL} Top score capped at 95: {top}")

except Exception:
    traceback.print_exc()
