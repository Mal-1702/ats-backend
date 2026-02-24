# -*- coding: utf-8 -*-
"""
ATS Scoring Engine v4  -- Production-Grade Intelligent Evaluator
================================================================
15-phase pipeline simulating an experienced professional recruiter.

Phases implemented:
  Phase 1   Job Requirement Intelligence  (dynamic skill tiering)
  Phase 2   Text normalisation & section awareness
  Phase 3   Semantic Skill Analysis       (synonym dict + tech families)
  Phase 4   Case / format-insensitive detection
  Phase 5   Skill Inference Engine        (ecosystem chains)
  Phase 6   Experience & Seniority Evaluation
  Phase 7   Role Alignment Analysis
  Phase 8   Project Impact & Achievement Recognition
  Phase 9   Penalty Logic Reform         (smart penalties)
  Phase 10  Component Score Computation   (importance-weighted)
  Phase 11  Weighted Aggregation
  Phase 12  Non-Linear Score Adjustments
  Phase 13  Tier Classification
  Phase 14  Explainable Output
  Phase 15  Deterministic & Fair Evaluation
"""
import re
from datetime import datetime
from typing import Dict, List, Set, Tuple

# ---------------------------------------------------------------------------
# Runtime constants
# ---------------------------------------------------------------------------
_NOW          = datetime.now()
CURRENT_YEAR  = _NOW.year
CURRENT_MONTH = _NOW.month
MAX_EXP_YEARS = 45


MONTH_MAP: Dict[str, int] = {
    'jan': 1,  'january': 1,   'feb': 2,  'february': 2,
    'mar': 3,  'march': 3,     'apr': 4,  'april': 4,
    'may': 5,  'jun': 6,       'june': 6, 'jul': 7,
    'july': 7, 'aug': 8,       'august': 8,
    'sep': 9,  'sept': 9,      'september': 9,
    'oct': 10, 'october': 10,  'nov': 11, 'november': 11,
    'dec': 12, 'december': 12,
}


# ===========================================================================
# PHASE 3 & 4 -- Synonym dictionary  (canonical -> [aliases])
# ===========================================================================
SKILL_SYNONYMS: Dict[str, List[str]] = {
    # Languages
    "python":        ["python", "py", "python3", "python 3", "python2", "cpython"],
    "javascript":    ["javascript", "js", "java script", "ecmascript",
                      "es6", "es6+", "es2015", "es2016", "es2017", "es2018",
                      "es2019", "es2020", "es2021", "vanillajs", "vanilla js"],
    "typescript":    ["typescript", "ts"],
    "java":          ["java", "java 8", "java 11", "java 17", "java se",
                      "java ee", "core java"],
    "c++":           ["c++", "cpp", "c plus plus"],
    "c#":            ["c#", "csharp", "c sharp", ".net", "dotnet"],
    "go":            ["go", "golang"],
    "rust":          ["rust"],
    "ruby":          ["ruby"],
    "php":           ["php"],
    "swift":         ["swift"],
    "kotlin":        ["kotlin"],
    "scala":         ["scala"],
    "bash":          ["bash", "shell", "shell script", "bash script", "sh",
                      "unix shell", "scripting"],
    "sql":           ["sql", "structured query language", "plsql", "pl/sql",
                      "tsql", "t-sql", "hql", "ansi sql"],
    "r":             ["r language", "r programming", "rstudio", "r studio"],
    "dart":          ["dart"],
    # Frontend
    "react":         ["react", "reactjs", "react.js", "react js",
                      "react native", "react hooks"],
    "angular":       ["angular", "angularjs", "angular.js", "angular 2",
                      "angular2", "angular 14", "angular 15", "angular 16"],
    "vue":           ["vue", "vuejs", "vue.js", "vue js",
                      "vue 3", "vue2", "vue3"],
    "nextjs":        ["nextjs", "next.js", "next js", "next"],
    "html":          ["html", "html5", "xhtml", "html/css"],
    "css":           ["css", "css3", "scss", "sass", "less",
                      "styled components", "css-in-js"],
    "tailwind":      ["tailwind", "tailwindcss", "tailwind css"],
    "svelte":        ["svelte"],
    "redux":         ["redux", "redux toolkit", "zustand", "mobx", "recoil"],
    # Backend frameworks
    "django":        ["django", "django rest framework", "drf", "django rf",
                      "django orm", "django views", "django framework"],
    "flask":         ["flask", "flask api", "flask rest"],
    "fastapi":       ["fastapi", "fast api", "fast-api", "fastapi framework"],
    "spring":        ["spring", "spring boot", "springboot",
                      "spring framework", "spring mvc", "spring cloud",
                      "spring data"],
    "express":       ["express", "express.js", "expressjs",
                      "express framework"],
    "rails":         ["rails", "ruby on rails", "ror"],
    "asp.net":       ["asp.net", "asp.net core", "aspnet", ".net core",
                      "dotnet", "asp .net"],
    "laravel":       ["laravel"],
    "node.js":       ["node.js", "node", "nodejs", "node js"],
    "gin":           ["gin", "gin framework", "gin-gonic"],
    "nestjs":        ["nestjs", "nest.js", "nest js"],
    # Databases
    "postgresql":    ["postgresql", "postgres", "postgre", "pg", "psql",
                      "postgressql", "postgresdb", "postgresql database"],
    "mysql":         ["mysql", "my sql", "mariadb", "maria db"],
    "mongodb":       ["mongodb", "mongo", "mongo db", "mongoose"],
    "sqlite":        ["sqlite", "sqlite3"],
    "redis":         ["redis", "redis cache", "redis db"],
    "elasticsearch": ["elasticsearch", "elastic search", "elastic",
                      "opensearch", "elk", "elk stack"],
    "cassandra":     ["cassandra", "apache cassandra"],
    "dynamodb":      ["dynamodb", "dynamo db", "amazon dynamodb"],
    "firebase":      ["firebase", "firestore", "firebase realtime"],
    "oracle":        ["oracle", "oracle db", "oracle database"],
    "mssql":         ["mssql", "sql server", "microsoft sql server", "ms sql"],
    "neo4j":         ["neo4j", "graph database"],
    # Cloud / DevOps
    "aws":           ["aws", "amazon web services", "ec2", "s3", "lambda",
                      "amazon aws", "aws cloud", "elastic beanstalk",
                      "ecs", "eks", "cloudfront", "cloudwatch",
                      "rds", "sqs", "sns"],
    "azure":         ["azure", "microsoft azure", "ms azure",
                      "azure devops", "azure functions", "azure blob"],
    "gcp":           ["gcp", "google cloud", "google cloud platform",
                      "google compute engine", "bigquery", "cloud run"],
    "docker":        ["docker", "dockerfile", "docker-compose",
                      "docker compose", "containerization",
                      "containers", "docker swarm"],
    "kubernetes":    ["kubernetes", "k8s", "kube", "kubectl",
                      "helm", "openshift"],
    "jenkins":       ["jenkins", "jenkins ci", "jenkins pipeline"],
    "terraform":     ["terraform", "infrastructure as code", "iac"],
    "ansible":       ["ansible", "ansible playbook"],
    "git":           ["git", "version control", "git flow", "gitflow"],
    "github":        ["github", "github actions", "github workflow"],
    "gitlab":        ["gitlab", "gitlab ci", "gitlab cd", "gitlab pipeline"],
    "bitbucket":     ["bitbucket", "bitbucket pipelines"],
    "linux":         ["linux", "unix", "ubuntu", "centos", "debian",
                      "rhel", "fedora", "linux administration",
                      "linux server"],
    "nginx":         ["nginx", "nginx server"],
    "kafka":         ["kafka", "apache kafka", "event streaming",
                      "event-driven"],
    "rabbitmq":      ["rabbitmq", "rabbit mq", "amqp",
                      "message broker", "mq"],
    "celery":        ["celery", "celery task", "celery worker"],
    # AI / ML
    "tensorflow":    ["tensorflow", "tf", "keras", "tensorflow keras"],
    "pytorch":       ["pytorch", "torch", "pytorch lightning"],
    "scikit-learn":  ["scikit-learn", "sklearn", "scikit learn"],
    "langchain":     ["langchain", "lang chain", "langchain framework"],
    "openai":        ["openai", "gpt", "chatgpt", "gpt-4", "gpt-3",
                      "llm", "large language model"],
    "machine learning": ["machine learning", "ml", "supervised learning",
                         "unsupervised learning", "deep learning", "dl",
                         "neural network", "neural networks", "nlp",
                         "computer vision", "cv", "artificial intelligence",
                         "ai"],
    "pandas":        ["pandas", "pd"],
    "numpy":         ["numpy", "np"],
    # Practices / Architecture
    "rest api":      ["rest", "rest api", "restful", "restful api",
                      "rest api development", "rest services", "http api",
                      "backend api", "web api", "api development",
                      "api design", "api integration", "api gateway"],
    "graphql":       ["graphql", "graph ql", "apollo", "apollo graphql"],
    "microservices": ["microservices", "micro services",
                      "microservice architecture", "distributed services",
                      "soa", "service mesh", "service-oriented"],
    "ci/cd":         ["ci/cd", "cicd", "ci cd", "continuous integration",
                      "continuous delivery", "continuous deployment",
                      "devops pipeline", "deployment pipeline",
                      "github actions", "circleci", "travis ci"],
    "agile":         ["agile", "scrum", "sprint", "kanban",
                      "agile methodology"],
    "unit testing":  ["unit testing", "unit test", "unit tests", "tdd",
                      "test driven development", "test driven", "pytest",
                      "junit", "jest", "mocha", "jasmine", "cypress",
                      "integration testing", "test automation", "qa",
                      "automated testing"],
    "system design": ["system design", "software architecture",
                      "distributed systems", "hld", "lld",
                      "low level design", "high level design",
                      "scalable systems", "system architecture",
                      "distributed system design"],
    # Tools
    "tableau":       ["tableau", "tableau desktop"],
    "powerbi":       ["power bi", "powerbi", "power bi desktop"],
    "jira":          ["jira", "atlassian jira", "atlassian"],
    "figma":         ["figma", "ui design", "ux design"],
    "websocket":     ["websocket", "websockets", "socket.io", "real-time"],
}

_ALIAS_TO_CANONICAL: Dict[str, str] = {}
for _c, _aliases in SKILL_SYNONYMS.items():
    for _a in _aliases:
        _ALIAS_TO_CANONICAL[_a.lower()] = _c


# ===========================================================================
# PHASE 3 -- Technology Family Groups
# (semantic equivalences between similar tools in same domain)
# ===========================================================================
TECH_FAMILIES: Dict[str, List[str]] = {
    # Having any member gives 50% partial credit for any other member
    "message_queue":    ["kafka", "rabbitmq", "celery", "redis",
                         "aws sqs", "azure service bus", "pubsub"],
    "version_control":  ["git", "github", "gitlab", "bitbucket",
                         "svn", "mercurial"],
    "rdbms":            ["postgresql", "mysql", "mssql", "oracle",
                         "mariadb", "sqlite", "aurora"],
    "nosql_doc":        ["mongodb", "dynamodb", "couchdb", "firebase",
                         "cosmosdb"],
    "cache_store":      ["redis", "memcached", "elasticsearch"],
    "cloud_platform":   ["aws", "azure", "gcp", "heroku",
                         "digitalocean", "linode"],
    "container":        ["docker", "podman", "lxc", "containerd"],
    "orchestration":    ["kubernetes", "openshift", "docker swarm",
                         "nomad"],
    "ci_cd_tool":       ["jenkins", "github", "gitlab", "travis",
                         "circleci", "teamcity", "bamboo"],
    "observability":    ["prometheus", "grafana", "elk",
                         "splunk", "datadog", "newrelic"],
    "frontend_fw":      ["react", "angular", "vue", "svelte",
                         "nextjs"],
    "backend_lang":     ["python", "java", "go", "node.js",
                         "ruby", "php", "c#"],
    "api_style":        ["rest api", "graphql", "grpc",
                         "websocket"],
    "infra_as_code":    ["terraform", "ansible", "pulumi",
                         "cloudformation"],
    "ml_framework":     ["tensorflow", "pytorch", "scikit-learn",
                         "keras", "xgboost"],
}

# Build reverse: canonical -> family name
_SKILL_TO_FAMILY: Dict[str, str] = {}
for _fam, _members in TECH_FAMILIES.items():
    for _m in _members:
        _mc = _ALIAS_TO_CANONICAL.get(_m.lower(), _m.lower())
        _SKILL_TO_FAMILY[_mc] = _fam


# ===========================================================================
# Skill category sets
# ===========================================================================
PROG_LANGUAGES = {
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust",
    "ruby", "php", "swift", "kotlin", "scala", "bash", "sql", "r", "dart",
}
FRAMEWORKS = {
    "react", "angular", "vue", "nextjs", "django", "flask", "fastapi",
    "spring", "express", "rails", "asp.net", "laravel", "node.js", "svelte",
    "redux", "tensorflow", "pytorch", "scikit-learn", "langchain", "openai",
    "pandas", "numpy", "celery", "websocket", "gin", "nestjs",
}
DATABASES = {
    "postgresql", "mysql", "mongodb", "sqlite", "redis", "elasticsearch",
    "cassandra", "dynamodb", "firebase", "oracle", "mssql", "neo4j",
}
TOOLS = {
    "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "terraform",
    "ansible", "git", "github", "gitlab", "bitbucket", "linux", "nginx",
    "kafka", "rabbitmq", "tableau", "powerbi", "jira", "figma", "graphql",
}
PRACTICES = {
    "rest api", "microservices", "ci/cd", "agile", "unit testing",
    "system design", "machine learning",
}
ALL_CANONICAL = PROG_LANGUAGES | FRAMEWORKS | DATABASES | TOOLS | PRACTICES


# ===========================================================================
# PHASE 5 -- Ecosystem Inference Chains
# ===========================================================================
ECOSYSTEM_CHAINS: Dict[str, List[str]] = {
    "django":        ["python", "rest api"],
    "flask":         ["python", "rest api"],
    "fastapi":       ["python", "rest api"],
    "celery":        ["python"],
    "pandas":        ["python"],
    "numpy":         ["python"],
    "scikit-learn":  ["python", "machine learning"],
    "tensorflow":    ["python", "machine learning"],
    "pytorch":       ["python", "machine learning"],
    "langchain":     ["python"],
    "spring":        ["java", "rest api"],
    "express":       ["node.js", "javascript", "rest api"],
    "nestjs":        ["node.js", "typescript", "rest api"],
    "nextjs":        ["react", "javascript"],
    "react":         ["javascript"],
    "angular":       ["typescript", "javascript"],
    "vue":           ["javascript"],
    "rails":         ["ruby", "rest api"],
    "asp.net":       ["c#"],
    "laravel":       ["php"],
    "kubernetes":    ["docker"],
    "graphql":       ["rest api"],
    "microservices": ["rest api", "system design"],
    "kafka":         ["microservices"],
    "rabbitmq":      ["microservices"],
}

# Role-type critical skill sets (for Phase 1)
_CRITICAL_BACKEND  = {"python", "java", "go", "node.js", "c#", "ruby", "php",
                       "django", "flask", "fastapi", "spring", "express",
                       "asp.net", "rails", "rest api", "microservices",
                       "postgresql", "mysql", "mongodb"}
_CRITICAL_FRONTEND = {"react", "angular", "vue", "javascript", "typescript",
                       "nextjs", "html", "css"}
_CRITICAL_FULLSTACK= _CRITICAL_BACKEND | _CRITICAL_FRONTEND
_CRITICAL_DATA     = {"python", "sql", "pandas", "machine learning",
                       "tensorflow", "pytorch", "scikit-learn", "spark"}
_CRITICAL_DEVOPS   = {"docker", "kubernetes", "aws", "azure", "gcp",
                       "ci/cd", "terraform", "linux"}
_CRITICAL_ML       = {"python", "tensorflow", "pytorch", "scikit-learn",
                       "machine learning", "pandas", "numpy"}

_ROLE_CRITICAL: Dict[str, Set[str]] = {
    "backend":   _CRITICAL_BACKEND,
    "frontend":  _CRITICAL_FRONTEND,
    "fullstack": _CRITICAL_FULLSTACK,
    "data":      _CRITICAL_DATA,
    "devops":    _CRITICAL_DEVOPS,
    "ml":        _CRITICAL_ML,
}

ROLE_KEYWORDS: Dict[str, List[str]] = {
    "backend":   ["api", "server", "database", "microservices", "rest",
                  "backend", "server-side", "endpoint", "middleware"],
    "frontend":  ["ui", "css", "html", "react", "angular", "vue",
                  "frontend", "user interface", "ux", "responsive"],
    "fullstack": ["full stack", "full-stack", "fullstack",
                  "end to end", "frontend", "backend", "api", "database"],
    "devops":    ["docker", "kubernetes", "ci/cd", "aws", "linux",
                  "terraform", "infrastructure", "deployment",
                  "pipeline", "monitoring"],
    "data":      ["python", "sql", "pandas", "analytics",
                  "data pipeline", "etl", "spark", "bigquery"],
    "ml":        ["machine learning", "deep learning", "nlp",
                  "tensorflow", "pytorch", "model", "training",
                  "inference", "transformer"],
}

SENIORITY_SIGNALS = [
    "senior", "lead", "principal", "staff engineer", "architect",
    "tech lead", "team lead", "engineering manager", "vp of engineering",
    "director", "head of", "cto", "chief",
    "mentored", "mentoring", "coached", "onboarded junior",
    "architected", "system design", "designed the system",
    "led a team", "led team", "managed a team", "managed team",
    "cross-functional", "cross functional", "stakeholder",
    "scalable", "high availability", "high-availability",
    "fault tolerant", "distributed", "large-scale", "enterprise-scale",
    "millions of", "10 million", "100 million", "billion",
    "production-grade", "real-time", "low latency",
    "drove", "owned", "ownership",
]


# ===========================================================================
# HELPERS -- Normalisation & lookup
# ===========================================================================

def normalize_text(text: str) -> str:
    """
    Phase 4: Normalise resume/JD text for consistent matching.
    Lowercase, collapse whitespace, standardise punctuation.
    """
    t = text.lower()
    t = re.sub(r'[\u2013\u2014]', '-', t)          # unicode dashes -> hyphen
    t = re.sub(r'[\u2022\u00b7\u25b8\u25aa\u25a0]', ' ', t)  # bullets
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\n{2,}', '\n', t)
    return t


def normalize_skill(skill: str) -> str:
    return _ALIAS_TO_CANONICAL.get(skill.lower().strip(), skill.lower().strip())


def get_all_aliases(skill: str) -> List[str]:
    canonical = normalize_skill(skill)
    return SKILL_SYNONYMS.get(canonical, [skill.lower(), canonical])


def _make_pattern(alias: str) -> str:
    escaped = re.escape(alias)
    if len(alias) <= 3:
        return r'(?<![a-z0-9])' + escaped + r'(?![a-z0-9])'
    return r'(?<![a-z])' + escaped + r'(?![a-z])'


def skill_present_in_text(skill: str, text_norm: str) -> bool:
    """Phase 4: Case-insensitive synonym-aware skill detection."""
    for alias in get_all_aliases(skill):
        if re.search(_make_pattern(alias), text_norm):
            return True
    return False


def get_family(skill: str) -> str:
    """Return the technology family for a canonical skill, or ''."""
    return _SKILL_TO_FAMILY.get(normalize_skill(skill), '')


def family_member_present(skill: str, text_norm: str) -> bool:
    """
    Phase 3: Return True if a tech-family equivalent of `skill` is in text.
    E.g. job needs Kafka; resume has RabbitMQ -> same family -> partial credit.
    """
    fam = get_family(skill)
    if not fam:
        return False
    members = TECH_FAMILIES.get(fam, [])
    for member in members:
        canonical_member = _ALIAS_TO_CANONICAL.get(member.lower(), member.lower())
        if canonical_member == normalize_skill(skill):
            continue
        if skill_present_in_text(canonical_member, text_norm):
            return True
    return False


# ===========================================================================
# PHASE 6 -- Experience Extraction
# ===========================================================================

def _parse_year_month(month_s: str, year_s: str) -> Tuple[int, int]:
    year  = int(year_s.strip())
    m_key = month_s.strip().lower().rstrip('.')
    month = MONTH_MAP.get(m_key, 6)
    return year, month


def extract_years_of_experience(text: str) -> float:
    """
    Phase 6: Compute total professional experience from employment date ranges.
    Never treats bare calendar years (2025) as duration.
    """
    tn = normalize_text(text)
    _mon = (r'(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|'
            r'jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|'
            r'oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s*)?')
    _yr  = r'(20\d{2}|19\d{2})'
    _sep = r'\s*(?:-{1,2}|to|till)\s*'
    _end = (r'(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|'
            r'jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|'
            r'oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s*)?'
            r'(20\d{2}|19\d{2}|present|current|now|ongoing|till\s*date|to\s*date)')
    pattern = re.compile(_mon + _yr + _sep + _end, re.IGNORECASE)
    periods: List[Tuple[int, int]] = []
    for m in pattern.findall(tn):
        s_mon_s, s_yr_s, e_mon_s, e_part = m
        try:
            s_yr, s_mo = _parse_year_month(s_mon_s, s_yr_s)
        except (ValueError, AttributeError):
            continue
        e_clean = (e_part or '').strip()
        if re.match(r'^(present|current|now|ongoing|till|to\s*date)', e_clean, re.I):
            e_yr, e_mo = CURRENT_YEAR, CURRENT_MONTH
        else:
            try:
                e_yr, e_mo = _parse_year_month(e_mon_s, e_clean)
            except (ValueError, AttributeError):
                continue
        if not (1970 <= s_yr <= CURRENT_YEAR):
            continue
        if not (s_yr <= e_yr <= CURRENT_YEAR + 1):
            continue
        sa, ea = s_yr * 12 + s_mo, e_yr * 12 + e_mo
        if ea > sa:
            periods.append((sa, ea))

    if periods:
        earliest = min(p[0] for p in periods)
        latest   = max(p[1] for p in periods)
        years    = round((latest - earliest) / 12, 1)
        return min(max(years, 0.0), float(MAX_EXP_YEARS))

    # Fallback: explicit statement
    explicit_re = re.compile(
        r'(\d+(?:\.\d+)?)\s*\+?\s*years?\s+(?:of\s+)?'
        r'(?:relevant\s+|professional\s+|industry\s+|work\s+|total\s+)?experience',
        re.IGNORECASE,
    )
    found = explicit_re.findall(tn)
    if found:
        val = max(float(v) for v in found)
        if 0 < val <= MAX_EXP_YEARS:
            return round(val, 1)
    return 0.0


# ===========================================================================
# PHASE 1 -- Job Requirement Intelligence
# ===========================================================================

def detect_role_type(job_title: str, keywords: List[str], skills: List[str]) -> str:
    """Detect role type from job title and keywords."""
    text = (job_title + ' ' + ' '.join(keywords) + ' ' + ' '.join(skills)).lower()
    for role, signals in ROLE_KEYWORDS.items():
        if any(s in text for s in signals):
            return role
    return "backend"  # default


def classify_job_skills(
    required_skills: List[str],
    role_type: str,
) -> Dict[str, str]:
    """
    Phase 1: Assign each required skill an importance tier:
      critical   -> 3x weight (must-have for this role)
      important  -> 2x weight (high value)
      optional   -> 1x weight (nice-to-have)

    Heuristics:
    - Skills matching role's critical set -> critical
    - Skills listed first (top 50%) tend to be more important
    - Supporting/tooling skills near end -> optional
    """
    critical_set = _ROLE_CRITICAL.get(role_type, _CRITICAL_BACKEND)
    classification: Dict[str, str] = {}
    n = max(len(required_skills), 1)

    for idx, skill in enumerate(required_skills):
        canonical = normalize_skill(skill)
        position_ratio = idx / n

        if canonical in critical_set:
            tier = "critical"
        elif position_ratio <= 0.45:
            tier = "important"
        elif position_ratio <= 0.75:
            tier = "important"
        else:
            tier = "optional"
        classification[skill.lower()] = tier

    return classification


# ===========================================================================
# PHASE 5 -- Skill Inference Engine
# ===========================================================================

def _get_inferred_skills(detected_canonicals: Set[str]) -> Set[str]:
    """Phase 5: Given detected skills, return implied canonical skills."""
    implied: Set[str] = set()
    for skill in detected_canonicals:
        for inferred in ECOSYSTEM_CHAINS.get(skill, []):
            implied.add(normalize_skill(inferred))
    return implied


# ===========================================================================
# PHASE 3 -- Skill Extraction & Matching
# ===========================================================================

def extract_skills_from_text(text: str) -> List[str]:
    """Extract all recognisable canonical skills from resume text."""
    tn = normalize_text(text)
    found = []
    for canonical in ALL_CANONICAL:
        if skill_present_in_text(canonical, tn):
            label = canonical.upper() if len(canonical) <= 3 else canonical.title()
            found.append(label)
    return sorted(set(found))


def match_skills(
    resume_text: str,
    required_skills: List[str],
    job_keywords: List[str],
    skill_importance: Dict[str, str],
) -> Tuple[List[str], List[str], List[str], Dict[str, str]]:
    """
    Phase 3 + 5: Match required skills using:
      1. Direct synonym-aware detection
      2. Ecosystem inference (Django -> Python)
      3. Technology family equivalence (RabbitMQ <-> Kafka, partial credit)

    Returns
    -------
    matched        : skills found with match type suffix
    missing        : genuinely absent skills
    bonus          : extra techs the candidate brings
    match_types    : skill -> 'direct' | 'inferred' | 'family'
    """
    tn = normalize_text(resume_text)

    # Detect all canonical skills present in resume
    detected_canonicals: Set[str] = {
        c for c in ALL_CANONICAL if skill_present_in_text(c, tn)
    }
    implied = _get_inferred_skills(detected_canonicals)

    matched: List[str]        = []
    missing: List[str]        = []
    match_types: Dict[str, str] = {}

    for skill in required_skills:
        canonical = normalize_skill(skill)
        if skill_present_in_text(skill, tn):
            # Direct / synonym match
            matched.append(skill)
            match_types[skill.lower()] = "direct"
        elif canonical in implied or canonical in detected_canonicals:
            # Ecosystem inference match
            matched.append(f"{skill} (inferred)")
            match_types[skill.lower()] = "inferred"
        elif family_member_present(skill, tn):
            # Technology family equivalent (partial credit)
            matched.append(f"{skill} (equivalent)")
            match_types[skill.lower()] = "family"
        else:
            missing.append(skill)

    # Bonus skills
    req_canonical = {normalize_skill(s) for s in required_skills}
    bonus = []
    for canonical in ALL_CANONICAL:
        if canonical not in req_canonical and skill_present_in_text(canonical, tn):
            label = canonical.upper() if len(canonical) <= 3 else canonical.title()
            bonus.append(label)

    return matched, missing, bonus, match_types


def categorize_skills(skill_list: List[str]) -> Dict:
    result: Dict[str, List[str]] = {
        "languages": [], "frameworks": [], "databases": [],
        "tools": [], "other": [],
    }
    for skill in skill_list:
        c = normalize_skill(
            skill.replace(" (inferred)", "").replace(" (equivalent)", "")
        )
        if c in PROG_LANGUAGES:       result["languages"].append(skill)
        elif c in FRAMEWORKS:         result["frameworks"].append(skill)
        elif c in DATABASES:          result["databases"].append(skill)
        elif c in TOOLS:              result["tools"].append(skill)
        else:                         result["other"].append(skill)
    return result


# ===========================================================================
# PHASE 10 -- Component Score Calculators
# ===========================================================================

def compute_skill_match_score(
    matched: List[str],
    missing: List[str],
    match_types: Dict[str, str],
    skill_importance: Dict[str, str],
) -> Tuple[int, Dict]:
    """
    Phase 10: Importance-weighted skill coverage score.

    Weights per importance tier:
      critical:  3x
      important: 2x
      optional:  1x

    Match-type multipliers:
      direct:     1.0  (full credit)
      inferred:   0.75 (strong inference)
      family:     0.50 (equivalent technology)

    Returns score (0-100) and a breakdown dict for debugging.
    """
    TIER_WEIGHT  = {"critical": 3, "important": 2, "optional": 1}
    MATCH_CREDIT = {"direct": 1.0, "inferred": 0.75, "family": 0.50}

    total_weight   = 0.0
    earned_weight  = 0.0

    matched_clean       = [s.replace(" (inferred)", "").replace(" (equivalent)", "")
                            for s in matched]
    critical_missing    = []
    important_missing   = []

    # Matched skills
    for skill in matched:
        skill_key = skill.lower().split(" (")[0]
        tier      = skill_importance.get(skill_key, "important")
        w         = float(TIER_WEIGHT.get(tier, 2))
        mtype     = match_types.get(skill_key, "direct")
        credit    = MATCH_CREDIT.get(mtype, 1.0)
        total_weight  += w
        earned_weight += w * credit

    # Missing skills
    for skill in missing:
        skill_key = skill.lower()
        tier      = skill_importance.get(skill_key, "important")
        w         = float(TIER_WEIGHT.get(tier, 2))
        total_weight += w
        if tier == "critical":
            critical_missing.append(skill)
        elif tier == "important":
            important_missing.append(skill)

    if total_weight == 0:
        return 65, {}

    raw_coverage = earned_weight / total_weight  # 0..1

    # Apply generous curve for realistic scores
    if raw_coverage >= 1.00: score = 100
    elif raw_coverage >= 0.90: score = int(90 + (raw_coverage - 0.90) / 0.10 * 10)
    elif raw_coverage >= 0.75: score = int(78 + (raw_coverage - 0.75) / 0.15 * 12)
    elif raw_coverage >= 0.60: score = int(63 + (raw_coverage - 0.60) / 0.15 * 15)
    elif raw_coverage >= 0.40: score = int(43 + (raw_coverage - 0.40) / 0.20 * 20)
    else: score = int(raw_coverage * 110)

    breakdown = {
        "raw_coverage":       round(raw_coverage * 100, 1),
        "critical_missing":   critical_missing,
        "important_missing":  important_missing,
    }
    return score, breakdown


def compute_experience_score(
    candidate_years: float,
    required_years: float,
    seniority_score: int,
) -> int:
    """
    Phase 6: Blended experience score = raw years (70%) + seniority signals (30%).
    Generous curve that rewards senior candidates.
    """
    if required_years <= 0:
        if candidate_years >= 12: raw = 100
        elif candidate_years >= 9: raw = 95
        elif candidate_years >= 7: raw = 88
        elif candidate_years >= 5: raw = 78
        elif candidate_years >= 3: raw = 65
        elif candidate_years >= 1: raw = 50
        else: raw = 30
    elif candidate_years >= required_years:
        excess = (candidate_years - required_years) / max(required_years, 1)
        bonus  = min(int(excess * 30), 30)
        raw    = min(70 + bonus, 100)
    else:
        ratio = candidate_years / required_years
        raw   = max(int(ratio * 68), 5)

    blended = int(raw * 0.70 + seniority_score * 0.30)
    return min(max(blended, 0), 100)


def compute_seniority_score(text: str, candidate_years: float) -> int:
    """Phase 6: Seniority & leadership signal score (0-100)."""
    tn   = normalize_text(text)
    hits = sum(1 for s in SENIORITY_SIGNALS if s in tn)
    signal_pct = min(hits / 10, 1.0)
    base       = int(signal_pct * 70)

    if candidate_years >= 12: yr_bonus = 30
    elif candidate_years >= 9: yr_bonus = 25
    elif candidate_years >= 7: yr_bonus = 20
    elif candidate_years >= 5: yr_bonus = 12
    elif candidate_years >= 3: yr_bonus = 6
    else: yr_bonus = 0

    return min(base + yr_bonus, 100)


def compute_role_alignment_score(
    text: str,
    job_title: str,
    keywords: List[str],
    role_type: str,
) -> int:
    """
    Phase 7: Measure how closely the candidate's career maps to the target role.
    Checks both technology signals and responsibility language.
    """
    tn          = normalize_text(text)
    role_signals = ROLE_KEYWORDS.get(role_type, [])
    if not role_signals:
        return 60

    hits = sum(1 for sig in role_signals if sig in tn)
    base = min(int((hits / len(role_signals)) * 100), 100)

    # Keyword bonus (synonym-expanded)
    kw_hits  = sum(1 for kw in keywords if skill_present_in_text(kw, tn))
    kw_bonus = int((kw_hits / max(len(keywords), 1)) * 35)

    return min(base + kw_bonus, 100)


def compute_projects_score(text: str) -> int:
    """Phase 8: Project impact & achievement recognition."""
    tn = normalize_text(text)
    signals = [
        'project', 'portfolio', 'github.com', 'gitlab.com',
        'built', 'developed', 'implemented', 'deployed',
        'designed', 'architected', 'launched', 'shipped',
        'led', 'created', 'open source', 'open-source',
        'contributions', 'production', 'released',
        # Impact language (Phase 8: no explicit metrics required)
        'improved', 'optimized', 'reduced', 'scaled',
        'migrated', 'refactored', 'automated',
        'millions', 'users', 'customers', 'clients',
    ]
    hits = sum(1 for s in signals if s in tn)
    return min(int((hits / len(signals)) * 100), 100)


def compute_education_score(text: str) -> int:
    """Phase 10: Education (minor factor, 5% weight)."""
    tn = normalize_text(text)
    if any(w in tn for w in ['phd', 'ph.d', 'doctorate', 'doctor of']):
        return 100
    if any(w in tn for w in ['master', 'msc', 'm.sc', 'm.s.',
                               'mba', 'mtech', 'm.tech']):
        return 90
    if any(w in tn for w in ['bachelor', 'b.sc', 'b.s.', 'btech',
                               'b.tech', 'be ', 'b.e.', 'undergraduate',
                               'b.comm', 'computer science',
                               'information technology',
                               'information systems', 'engineering']):
        return 75
    if any(w in tn for w in ['associate', 'diploma', 'certification',
                               'certified', 'aws certified',
                               'google certified', 'microsoft certified']):
        return 65
    return 40


# ===========================================================================
# PHASE 9 & 12 -- Penalty Logic + Non-Linear Adjustments
# ===========================================================================

def apply_adjustments(
    base_score: int,
    skill_score: int,
    exp_score: int,
    seniority_score: int,
    role_score: int,
    critical_missing: List[str],
    candidate_years: float,
    required_years: float,
    bonus_count: int,
) -> Tuple[int, List[str]]:
    """
    Phase 12: Human-like non-linear score corrections.

    Boosts (additive):
    - Senior candidate (8+ yrs) with strong skills -> +5
    - Very strong seniority signals -> +3
    - Rich bonus skill portfolio (5+) -> +2

    Penalties (proportional deductions):
    - Each missing CRITICAL skill -> -8 pts  (Phase 9: only penalise for core gaps)
    - Entire domain mismatch -> -12 pts

    Score is clamped to [0, 100].
    """
    adj         = base_score
    adj_notes   = []

    # -- Boosts ---
    if candidate_years >= 8 and skill_score >= 65:
        adj += 5
        adj_notes.append("Senior + strong skills boost +5")
    if seniority_score >= 70:
        adj += 3
        adj_notes.append("Strong leadership signals boost +3")
    if bonus_count >= 5:
        adj += 2
        adj_notes.append("Rich bonus skill portfolio +2")

    # -- Penalties (Phase 9) ---
    n_critical_missing = len(critical_missing)
    if n_critical_missing > 0:
        penalty = min(n_critical_missing * 8, 20)   # max -20 for critical gaps
        adj -= penalty
        adj_notes.append(
            f"Missing {n_critical_missing} critical skill(s) = -{penalty} pts"
        )

    # Domain mismatch: role_score is very low but we have candidate experience
    if role_score < 25 and candidate_years >= 2:
        adj -= 10
        adj_notes.append("Domain mismatch penalty -10")

    adj = max(0, min(100, adj))
    return adj, adj_notes


# ===========================================================================
# PHASE 13 & 14 -- Tier + Insights
# ===========================================================================

def _assign_tier(score: int) -> Tuple[str, str]:
    """
    Phase 13: Updated tier classification.
    Returns (tier_letter, tier_label).
    """
    if score >= 90: return "A", "Exceptional - Interview Immediately"
    if score >= 80: return "B", "Strong Hire"
    if score >= 70: return "C", "Good Candidate"
    if score >= 60: return "D", "Moderate Fit"
    return "E", "Weak Fit"


def generate_insights(
    matched_skills:   List[str],
    missing_skills:   List[str],
    bonus_skills:     List[str],
    skill_score:      int,
    exp_score:        int,
    seniority_score:  int,
    role_score:       int,
    final_score:      int,
    candidate_years:  float,
    required_years:   float,
    adj_notes:        List[str],
    job_title:        str = "",
    critical_missing: List[str] = None,
) -> Dict:
    """Phase 14: Recruiter-style explainable output."""
    critical_missing = critical_missing or []
    direct_matched   = [s for s in matched_skills if "(inferred)" not in s
                        and "(equivalent)" not in s]
    inferred_m       = [s for s in matched_skills if "(inferred)" in s]
    family_m         = [s for s in matched_skills if "(equivalent)" in s]
    total_required   = len(matched_skills) + len(missing_skills)

    # Seniority label
    if seniority_score >= 70: seniority_label = "Senior"
    elif seniority_score >= 40: seniority_label = "Mid-Level"
    else: seniority_label = "Junior / Entry-Level"

    # Confidence
    match_ratio = len(matched_skills) / max(total_required, 1)
    if final_score >= 80 and match_ratio >= 0.7: confidence = "High"
    elif final_score >= 65 and match_ratio >= 0.5: confidence = "Medium"
    else: confidence = "Low"

    # Strengths
    strengths: List[str] = []
    if direct_matched:
        ss = ', '.join(direct_matched[:4]) + ('...' if len(direct_matched) > 4 else '')
        strengths.append(
            f"Directly matches {len(direct_matched)}/{total_required} "
            f"required skills: {ss}"
        )
    if inferred_m:
        ims = ', '.join(s.replace(' (inferred)', '') for s in inferred_m[:3])
        strengths.append(f"Ecosystem expertise implies proficiency in: {ims}")
    if family_m:
        fms = ', '.join(s.replace(' (equivalent)', '') for s in family_m[:3])
        strengths.append(f"Uses equivalent technologies for: {fms}")
    if candidate_years > 0:
        yrs_s = f"{candidate_years} yr{'s' if candidate_years != 1 else ''}"
        strengths.append(f"{yrs_s} of professional experience [{seniority_label}]")
    if seniority_score >= 60:
        strengths.append(
            "Strong seniority signals: leadership, architecture, "
            "or large-scale system experience"
        )
    if bonus_skills:
        strengths.append(
            f"Additional relevant skills: {', '.join(bonus_skills[:4])}"
        )

    # Gaps (Phase 9: report only critical missing)
    gaps: List[str] = []
    if critical_missing:
        gaps.append(f"Missing CRITICAL skills: {', '.join(critical_missing)}")
    non_critical_missing = [s for s in missing_skills if s not in critical_missing]
    if non_critical_missing:
        gaps.append(
            f"Optional / nice-to-have skills absent: "
            f"{', '.join(non_critical_missing[:4])}"
        )
    if required_years > 0 and candidate_years < required_years:
        gaps.append(
            f"Experience gap: {candidate_years} yr(s) vs "
            f"{required_years} required"
        )

    # Recommendation
    if final_score >= 90:   recommendation = "Strong Hire — Interview Immediately"
    elif final_score >= 80: recommendation = "Strong Hire"
    elif final_score >= 70: recommendation = "Good Candidate — Proceed to Interview"
    elif final_score >= 60: recommendation = "Moderate Fit — Consider"
    else:                   recommendation = "Not Recommended"

    tier, tier_label = _assign_tier(final_score)

    # Reasoning narrative
    jc = f" for the {job_title} role" if job_title else ""
    matched_summary = (
        f"{len(direct_matched)} direct, {len(inferred_m)} inferred, "
        f"{len(family_m)} equivalent"
    )
    reasoning = (
        f"Candidate{jc} scores {final_score}/100 [{tier_label}]. "
        f"Skill coverage: {skill_score}% ({matched_summary} of {total_required} required). "
        f"Experience: {candidate_years} yr(s) [{seniority_label}] -> {exp_score}%. "
        f"Role alignment: {role_score}%. "
        f"Confidence: {confidence}. "
        f"Recommendation: {recommendation}."
    )

    return {
        "key_strengths":   strengths or ["Resume processed successfully"],
        "gaps":            gaps,
        "recommendation":  recommendation,
        "reasoning":       reasoning,
        "seniority_label": seniority_label,
        "seniority_score": seniority_score,
        "confidence":      confidence,
        "tier":            tier,
        "tier_label":      tier_label,
        "score_notes":     adj_notes,
    }


# ===========================================================================
# MAIN SCORING FUNCTION
# ===========================================================================

def score_resume(resume_text: str, job: Dict, job_title: str = "") -> Dict:
    """
    ATS Scoring Engine v4 -- All 15 phases.

    Weights (Phase 11)
    ------------------
    Skill Match (importance-weighted + inference + family):  30%
    Experience + Seniority (blended):                        30%
    Projects / Impact:                                       25%
    Role Alignment:                                          10%
    Education:                                                5%

    Post-aggregation: non-linear adjustments (Phase 12).
    """
    required_skills: List[str] = job.get("skills", []) or []
    keywords: List[str]        = job.get("keywords") or []
    required_years: float      = float(job.get("min_experience") or 0)

    # Derive keywords if none provided
    if not keywords:
        title_words = [w for w in job_title.lower().split() if len(w) > 3]
        keywords    = required_skills + title_words

    # -- Phase 1: Role detection + skill importance classification --
    role_type          = detect_role_type(job_title, keywords, required_skills)
    skill_importance   = classify_job_skills(required_skills, role_type)

    # -- Phase 6: Extract experience --
    candidate_years = extract_years_of_experience(resume_text)

    # -- Phase 3 & 5: Match skills (direct + inferred + family) --
    matched, missing, bonus, match_types = match_skills(
        resume_text, required_skills, keywords, skill_importance
    )

    # -- Phase 2: Extract all skills (for categorization) --
    all_extracted    = extract_skills_from_text(resume_text)
    candidate_skills = categorize_skills(all_extracted)

    # -- Phase 10: Component scores --
    skill_score, skill_breakdown = compute_skill_match_score(
        matched, missing, match_types, skill_importance
    )
    seniority_sc = compute_seniority_score(resume_text, candidate_years)
    exp_score    = compute_experience_score(candidate_years, required_years, seniority_sc)
    role_score   = compute_role_alignment_score(
        resume_text, job_title, keywords, role_type
    )
    proj_score   = compute_projects_score(resume_text)
    edu_score    = compute_education_score(resume_text)

    # -- Phase 11: Weighted aggregation --
    base_score = int(
        0.30 * skill_score +
        0.30 * exp_score   +
        0.25 * proj_score  +
        0.10 * role_score  +
        0.05 * edu_score
    )
    base_score = max(0, min(100, base_score))

    # -- Phase 12: Non-linear adjustments --
    critical_missing = skill_breakdown.get("critical_missing", [])
    final_score, adj_notes = apply_adjustments(
        base_score      = base_score,
        skill_score     = skill_score,
        exp_score       = exp_score,
        seniority_score = seniority_sc,
        role_score      = role_score,
        critical_missing= critical_missing,
        candidate_years = candidate_years,
        required_years  = required_years,
        bonus_count     = len(bonus),
    )

    # -- Phase 14: Insights --
    insights = generate_insights(
        matched_skills  = matched,
        missing_skills  = missing,
        bonus_skills    = bonus,
        skill_score     = skill_score,
        exp_score       = exp_score,
        seniority_score = seniority_sc,
        role_score      = role_score,
        final_score     = final_score,
        candidate_years = candidate_years,
        required_years  = required_years,
        adj_notes       = adj_notes,
        job_title       = job_title,
        critical_missing= critical_missing,
    )
    # Embed skill arrays for DB persistence
    insights["matched_skills"]   = matched
    insights["missing_skills"]   = missing
    insights["bonus_skills"]     = bonus[:10]
    insights["candidate_skills"] = candidate_skills

    explanation = (
        f"Skill:{skill_score}%(cov={skill_breakdown.get('raw_coverage','?')}%) | "
        f"Exp:{exp_score}%({candidate_years}yrs) | "
        f"Seniority:{seniority_sc}% | Role:{role_score}% | "
        f"Proj:{proj_score}% | Edu:{edu_score}% | "
        f"Base:{base_score} -> Final:{final_score}/100 | "
        f"Rec:{insights['recommendation']}"
    )

    return {
        "final_score": final_score,
        "breakdown": {
            "skill_match":      skill_score,
            "keyword_match":    role_score,       # UI compat alias
            "experience_score": exp_score,
            "experience_years": candidate_years,
        },
        "matched_skills":   matched,
        "missing_skills":   missing,
        "bonus_skills":     bonus,
        "extracted_skills": all_extracted,
        "candidate_skills": candidate_skills,
        "insights":         insights,
        "explanation":      explanation,
    }
