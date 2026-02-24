from app.services.scorer import extract_years_of_experience, skill_present_in_text, score_resume

PASS = "[PASS]"
FAIL = "[FAIL]"

# Test 1: bare year "2025" must NOT be treated as years of experience
resume_buggy = "Billankrah Resume CV 2025\nAWS Azure Docker Python SQL"
yrs = extract_years_of_experience(resume_buggy)
ok = yrs == 0.0
print(f"{PASS if ok else FAIL} Test 1 - bare 2025: {yrs} yrs (expected 0.0)")

# Test 2: proper date ranges
resume_ranges = "Software Engineer, Acme Corp\nJan 2020 - Present\nJunior Dev 2018 - 2020"
yrs2 = extract_years_of_experience(resume_ranges)
ok = 5.0 <= yrs2 <= 9.0
print(f"{PASS if ok else FAIL} Test 2 - date ranges: {yrs2} yrs (expected 5-9)")

# Test 3: explicit statement
resume_explicit = "5+ years of professional experience in backend development."
yrs3 = extract_years_of_experience(resume_explicit)
ok = yrs3 == 5.0
print(f"{PASS if ok else FAIL} Test 3 - explicit stmt: {yrs3} yrs (expected 5.0)")

# Test 4: synonym matching
tl = "worked with node.js express postgresql aws kubernetes unit testing"
tests = [
    ("node.js",      True),
    ("postgresql",   True),
    ("unit testing", True),
    ("django",       False),
    ("vue",          False),
]
for skill, expected in tests:
    result = skill_present_in_text(skill, tl)
    ok = result == expected
    print(f"{PASS if ok else FAIL} Test 4 - '{skill}' in text: {result} (expected {expected})")

# Test 5: full scoring - strong candidate should score > 60
job = {
    "skills": ["Python", "Django", "PostgreSQL", "Docker", "AWS", "Node.js"],
    "keywords": ["backend", "api", "microservices"],
    "min_experience": 3,
}
resume_strong = """
Senior Backend Engineer — TechCorp (Jan 2021 - Present)
Led development of REST API microservices using Python, Django, Node.js.
Deployed containers with Docker on AWS ECS.
Managed PostgreSQL databases, Redis caches.
Implemented CI/CD pipelines on GitHub Actions.
B.Tech in Computer Science, 2020.
GitHub: github.com/user | built 5 production services.
"""
r = score_resume(resume_strong, job, "Backend Engineer")
fs = r["final_score"]
ok = fs >= 55
print(f"\n{PASS if ok else FAIL} Test 5 - strong resume: {fs}/100 (expected >=55)")
print(f"  Skill:{r['breakdown']['skill_match']}% Exp:{r['breakdown']['experience_score']}% KW:{r['breakdown']['keyword_match']}%")
print(f"  Exp yrs: {r['breakdown']['experience_years']}")
print(f"  Matched: {r['matched_skills']}")
print(f"  Missing: {r['missing_skills']}")
print(f"  Rec: {r['insights']['recommendation']}")
print(f"  Explanation: {r['explanation']}")
