import sys
sys.stderr = sys.stdout
try:
    import importlib.util, os
    spec = importlib.util.spec_from_file_location(
        "scorer", os.path.join("app", "services", "scorer.py")
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    print("Import OK")

    # Quick functional tests
    yrs = mod.extract_years_of_experience("Billankrah CV 2025\nAWS Azure Docker")
    print(f"Bare-year test: {yrs} (expect 0.0) PASS={yrs==0.0}")

    yrs2 = mod.extract_years_of_experience("Engineer, TechCorp  Jan 2021 - Present\nDev, Acme  2018-2020")
    print(f"Date-range test: {yrs2} (expect 5-8)")

    tl = mod.normalize_text("Node.js Express PostgreSQL AWS")
    ok = mod.skill_present_in_text("node.js", tl)
    print(f"node.js synonym: {ok} (expect True)")

    ok2 = mod.skill_present_in_text("postgresql", mod.normalize_text("I use postgres daily"))
    print(f"postgres synonym: {ok2} (expect True)")

    # Test ecosystem inference: candidate has django -> python should be inferred
    job = {"skills": ["Python", "Django", "PostgreSQL", "Docker", "Node.js", "Redis"],
           "keywords": ["backend", "api", "rest"], "min_experience": 3}
    resume = """
    Senior Backend Engineer (Jan 2018 - Present)
    Led team of 8 engineers building scalable microservices with Django.
    Deployed containers on AWS using Docker and Kubernetes.
    Managed PostgreSQL databases and Redis caches.
    Designed RESTful APIs consumed by 5M users.
    Mentored junior engineers. Architected distributed systems.
    B.Tech Computer Science, github.com/user
    """
    r = mod.score_resume(resume, job, "Backend Engineer")
    fs = r["final_score"]
    print(f"\nSenior candidate score: {fs}/100 (expect 75+)")
    print(f"  Matched: {r['matched_skills']}")
    print(f"  Exp yrs: {r['breakdown']['experience_years']}")
    print(f"  {r['explanation']}")

except Exception as e:
    import traceback
    traceback.print_exc()
