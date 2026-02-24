"""
Resume Analyzer Service - Standalone Evaluation Logic
=====================================================
Analyzes resumes independently of job descriptions to provide 
quality scores, seniority levels, and professional feedback.
"""
import re
from typing import Dict, List, Optional
from app.services.scorer import (
    extract_skills_from_text,
    extract_years_of_experience,
    compute_seniority_score,
    normalize_text,
    categorize_skills,
    PROG_LANGUAGES,
    FRAMEWORKS,
    DATABASES,
    TOOLS,
    PRACTICES
)

class ResumeAnalyzer:
    """
    Evaluates resumes based on industry standards for technical depth,
    experience relevance, and professional presentation.
    """

    def analyze_standalone(self, resume_text: str) -> Dict:
        """
        Perform a full standalone analysis of a resume.
        """
        # 1. Basic Extractions
        text_norm = normalize_text(resume_text)
        skills = extract_skills_from_text(resume_text)
        exp_years = extract_years_of_experience(resume_text)
        seniority_score = compute_seniority_score(resume_text, exp_years)
        
        # 2. Seniority Classification
        seniority_level = self._classify_seniority(exp_years, seniority_score)
        
        # 3. Categorize Skills
        categorized = categorize_skills(skills)
        
        # 4. Calculate Quality Scores
        skill_depth_score = self._calculate_skill_depth(skills)
        presentation_score = self._evaluate_presentation(resume_text)
        complexity_score = self._evaluate_project_complexity(text_norm)
        
        # 5. Determine Role Suitability
        suitability = self._determine_role_suitability(text_norm, skills)
        
        # 6. Overall Score (Weighted)
        # 40% Experience/Seniority, 30% Skill Depth, 20% Complexity, 10% Presentation
        overall_score = int(
            (min(exp_years * 10, 100) * 0.20) + 
            (seniority_score * 0.20) + 
            (skill_depth_score * 0.30) + 
            (complexity_score * 0.20) + 
            (presentation_score * 0.10)
        )
        
        # 7. Generate Insights
        strengths = self._generate_strengths(exp_years, skills, seniority_level, presentation_score)
        improvements = self._generate_improvements(exp_years, skills, presentation_score, complexity_score)
        suggestions = self._generate_suggestions(seniority_level, suitability)

        return {
            "score": min(overall_score, 100),
            "seniority_level": seniority_level,
            "role_suitability": suitability,
            "years_of_experience": exp_years,
            "skills": skills,
            "categorized_skills": categorized,
            "strengths": strengths,
            "improvements": improvements,
            "suggestions": suggestions,
            "summary": f"A {seniority_level} professional with {exp_years} years of experience, showing strong suitability for {suitability[0] if suitability else 'software'} roles.",
            "metrics": {
                "skill_depth": skill_depth_score,
                "presentation": presentation_score,
                "complexity": complexity_score,
                "seniority": seniority_score
            }
        }

    def _classify_seniority(self, years: float, score: int) -> str:
        if years >= 10 or score > 85: return "Lead / Principal"
        if years >= 6 or score > 70: return "Senior"
        if years >= 3 or score > 45: return "Mid-Level"
        if years >= 1 or score > 20: return "Junior"
        return "Entry-Level"

    def _calculate_skill_depth(self, skills: List[str]) -> int:
        # Depth based on variety and ecosystem completeness
        if not skills: return 0
        base = min(len(skills) * 4, 60)
        
        # Bonus for having complementary skills (e.g., Lang + Framework + DB)
        has_lang = any(s.lower() in PROG_LANGUAGES for s in skills)
        has_fw   = any(s.lower() in FRAMEWORKS for s in skills)
        has_db   = any(s.lower() in DATABASES for s in skills)
        has_tool = any(s.lower() in TOOLS for s in skills)
        
        bonus = 0
        if has_lang and has_fw: bonus += 15
        if has_db: bonus += 10
        if has_tool: bonus += 15
        
        return min(base + bonus, 100)

    def _evaluate_presentation(self, text: str) -> int:
        score = 70 # Base
        
        # Check for contact info structure
        if re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text): score += 10
        if re.search(r'\b\d{10,}\b', text): score += 5
        if "github.com" in text.lower() or "linkedin.com" in text.lower(): score += 10
        
        # Penalty for very short resumes
        if len(text) < 500: score -= 30
        
        return min(max(score, 0), 100)

    def _evaluate_project_complexity(self, text_norm: str) -> int:
        complexity_keywords = [
            "architected", "optimized", "scale", "performance", "distributed",
            "microservices", "latency", "high availability", "infrastructure",
            "deployed", "managed", "led", "redesigned", "integrated"
        ]
        hits = sum(1 for kw in complexity_keywords if kw in text_norm)
        return min(25 + (hits * 8), 100)

    def _determine_role_suitability(self, text_norm: str, skills: List[str]) -> List[str]:
        roles = {
            "Backend": ["python", "java", "node", "sql", "api", "server", "django", "flask", "fastapi"],
            "Frontend": ["react", "angular", "vue", "javascript", "typescript", "css", "html"],
            "Full-Stack": ["react", "node", "fullstack", "frontend", "backend"],
            "DevOps / SRE": ["docker", "kubernetes", "aws", "ci/cd", "terraform", "jenkins"],
            "Data Science / AI": ["python", "pandas", "machine learning", "tensorflow", "pytorch", "nlp"]
        }
        
        suitability = []
        for role, keywords in roles.items():
            score = sum(1 for kw in keywords if kw in text_norm or any(kw in s.lower() for s in skills))
            if score >= 2:
                suitability.append(role)
        
        return suitability[:3] if suitability else ["General Software Engineering"]

    def _generate_strengths(self, years: float, skills: List[str], seniority: str, presentation: int) -> List[str]:
        strengths = []
        if years > 5: strengths.append(f"Significant industry experience ({years} years)")
        if len(skills) > 12: strengths.append("Diverse technical skill set")
        if "Senior" in seniority or "Lead" in seniority: strengths.append("Demonstrated seniority and potential leadership signals")
        if presentation > 85: strengths.append("Professional and well-structured resume layout")
        
        # Skill specific strengths
        if any(s.lower() in ["aws", "azure", "gcp"] for s in skills): strengths.append("Cloud platform expertise")
        if any(s.lower() in ["docker", "kubernetes"] for s in skills): strengths.append("Containerization and orchestration knowledge")
        
        return strengths[:5]

    def _generate_improvements(self, years: float, skills: List[str], presentation: int, complexity: int) -> List[str]:
        improvements = []
        if presentation < 75: improvements.append("Enhance contact information and professional links (LinkedIn/GitHub)")
        if len(skills) < 8: improvements.append("Broaden technical stack to include more modern frameworks or tools")
        if complexity < 50: improvements.append("Quantify project impact and use more action-oriented architectural terms")
        if not any(s.lower() in ["git", "ci/cd", "docker"] for s in skills): 
            improvements.append("Include more information about DevOps and version control practices")
        
        # Add dummy improvements if list is short
        if not improvements:
            improvements.append("Consider adding a summary section highlighting key achievements")
            
        return improvements[:4]

    def _generate_suggestions(self, seniority: str, suitability: List[str]) -> List[str]:
        suggestions = []
        role = suitability[0]
        if "Junior" in seniority:
            suggestions.append(f"Focus on building 2-3 deep-dive projects in {role}")
            suggestions.append("Obtain entry-level certifications for your primary stack")
        elif "Mid" in seniority:
            suggestions.append("Focus on system design and architectural patterns")
            suggestions.append("Take ownership of end-to-end features in your current role")
        else:
            suggestions.append("Increase visibility through tech blogging or open source contributions")
            suggestions.append("Apply for leadership or principal-level positions")
            
        return suggestions
