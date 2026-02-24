import sys, os, importlib.util, traceback

sys.stderr = sys.stdout

try:
    spec = importlib.util.spec_from_file_location(
        "scorer", os.path.join("app", "services", "scorer.py")
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    print("=== Import: OK ===\n")

    PASS = "[PASS]"
    FAIL = "[FAIL]"

    # ── Test 1: bare year 2025 must NOT inflate experience ──
    yrs = mod.extract_years_of_experience("Candidate Resume 2025 | AWS Azure Docker Python")
    ok = yrs == 0.0
    print(f"{PASS if ok else FAIL} T1 bare-2025: {yrs} yrs (expect 0.0)")

    # ── Test 2: date ranges ──
    yrs2 = mod.extract_years_of_experience(
        "Senior Dev, TechCorp  Jan 2018 - Present\nEngineer, Acme  2015-2017"
    )
    ok = 8.0 <= yrs2 <= 13.0
    print(f"{PASS if ok else FAIL} T2 date-range: {yrs2} yrs (expect 8-13)")

    # ── Test 3: technology family equivalence ──
    # Job needs Kafka, resume has RabbitMQ
    tn = mod.normalize_text("Built event-driven system using RabbitMQ for async processing")
    fam_ok = mod.family_member_present("kafka", tn)
    print(f"{PASS if fam_ok else FAIL} T3 tech-family: kafka<->rabbitmq = {fam_ok} (expect True)")

    # ── Test 4: skill tiering ──
    skills = ["Python", "Django", "PostgreSQL", "Docker", "Jira", "Confluence"]
    tiers = mod.classify_job_skills(skills, "backend")
    python_tier = tiers.get("python", "?")
    jira_tier   = tiers.get("jira", "?")
    print(f"{PASS if python_tier == 'critical' else FAIL} T4a skill-tier Python={python_tier} (expect critical)")
    print(f"{PASS if jira_tier in ('optional','important') else FAIL} T4b skill-tier Jira={jira_tier} (expect optional/important)")

    # ── Test 5: STRONG senior candidate should score 80+ ──
    job = {
        "skills": ["Python", "Django", "PostgreSQL", "Docker", "AWS",
                   "Node.js", "Redis", "Kafka", "Kubernetes"],
        "keywords": ["backend", "api", "microservices", "scalable"],
        "min_experience": 5,
    }
    senior_resume = """
    Staff Backend Engineer  |  TechScale Inc  (Jan 2016 - Present)
    Led a team of 12 engineers building distributed microservices for 20M+ users.
    Architected scalable Python/Django REST APIs deployed on AWS ECS with Docker.
    Managed PostgreSQL and Redis infrastructure. Designed Kafka event-driven pipelines.
    Mentored junior engineers, drove cross-functional delivery with product teams.
    Migrated legacy monolith to Kubernetes-orchestrated microservices (40% latency reduction).
    Patents: 1 | Open source: github.com/user | B.Tech Computer Science 2015
    """
    r = mod.score_resume(senior_resume, job, "Backend Engineer")
    fs = r["final_score"]
    ok = fs >= 80
    print(f"\n{PASS if ok else FAIL} T5 SENIOR score: {fs}/100 (expect >= 80)")
    print(f"   {r['explanation']}")
    print(f"   Matched: {r['matched_skills']}")
    print(f"   Rec: {r['insights']['recommendation']}")

    # ── Test 6: WEAK candidate should score < 60 ──
    weak_resume = """
    Frontend Intern  |  SmallCo  (Jun 2024 - Dec 2024)
    Built simple HTML/CSS pages training project.
    Familiar with JavaScript. Learning React.
    No backend experience. B.Sc in progress.
    """
    r2 = mod.score_resume(weak_resume, job, "Backend Engineer")
    fs2 = r2["final_score"]
    ok2 = fs2 < 60
    print(f"\n{PASS if ok2 else FAIL} T6 WEAK score: {fs2}/100 (expect < 60)")
    print(f"   {r2['explanation']}")

    # ── Test 7: inference - Django detected, Python required ──
    partial_resume = """
    Backend Engineer  |  2022 - 2024
    Built Django REST APIs with Celery background tasks.
    Used Redis for caching, PostgreSQL as primary DB.
    Deployed with Docker on AWS.
    """
    job2 = {"skills": ["Python", "Django", "Redis", "Docker"],
            "keywords": ["backend"], "min_experience": 2}
    r3 = mod.score_resume(partial_resume, job2, "Backend Dev")
    python_matched = any("python" in s.lower() for s in r3["matched_skills"])
    print(f"\n{PASS if python_matched else FAIL} T7 INFERENCE: Python inferred from Django = {python_matched}")
    print(f"   Score: {r3['final_score']}/100 | Matched: {r3['matched_skills']}")

except Exception:
    traceback.print_exc()
