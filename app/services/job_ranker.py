# -*- coding: utf-8 -*-
"""
Enhanced Job Ranker with Cross-Candidate Calibration
=====================================================
Two-pass ranking pipeline:
  Pass 1  Score each resume individually (scorer.py v4)
  Pass 2  Calibrate scores relative to the candidate pool, apply
          role-fit spectrum, consistency check, and comparative
          recommendations.
"""
import os
import logging
from typing import List, Tuple

from app.services.resume_parser import parse_resume
from app.services.scorer import score_resume, extract_years_of_experience
from app.db.crud import update_resume_parsed_data

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pass-2 helpers  (pool-level analysis)
# ---------------------------------------------------------------------------

def _determine_role_fit(score: int, skill_score: int) -> str:
    """
    Role-Fit Spectrum (Phase 4 of calibration):
      core_fit       80 + skill >= 70
      adjacent_fit   65-79  OR skill >= 50
      weak_fit       50-64
      irrelevant     <50
    """
    if score >= 80 and skill_score >= 70:
        return "core_fit"
    if score >= 65 or skill_score >= 50:
        return "adjacent_fit"
    if score >= 50:
        return "weak_fit"
    return "irrelevant"


def _comparative_label(rank_idx: int, pool_size: int) -> str:
    """Return a rank-based comparative label."""
    pct = 1.0 - rank_idx / max(pool_size - 1, 1)
    if pct >= 0.85:  return "Top Candidate"
    if pct >= 0.60:  return "Strong Candidate"
    if pct >= 0.35:  return "Moderate Candidate"
    if pct >= 0.15:  return "Below Average"
    return "Weak Candidate"


def _comparative_recommendation(label: str, raw_rec: str) -> str:
    """
    Phase 7: Blend the absolute recommendation from scorer with
    the comparative pool position for a recruiter-facing label.
    """
    if label == "Top Candidate":
        return "Strong Hire — Prioritise Interview"
    if label == "Strong Candidate":
        return "Hire — Schedule Interview"
    if label == "Moderate Candidate":
        return raw_rec or "Consider — Further Screening Needed"
    if label == "Below Average":
        return "Low Priority — Only if Pool is Thin"
    return "Not Recommended"


def calibrate_scores(results: List[dict]) -> List[dict]:
    """
    Cross-candidate calibration (Pass 2).

    Strategy
    --------
    1. Compute the pool's raw score distribution.
    2. Scale scores linearly so the best candidate lands in [88, 95]
       and the worst is proportionally lower — preserving all relative gaps.
    3. Blend calibrated score (70 %) with raw score (30 %) so absolute
       capability still matters (prevents inflating truly poor candidates).
    4. Apply compression so the output sits in realistic ATS bands:
         Top:      82–95
         Strong:   70–82
         Moderate: 58–70
         Weak:     45–58
         Poor:     < 45
    5. Consistency check: if a candidate has higher experience AND higher
       skill score than a lower-ranked peer, swap their final scores to
       correct inversions caused by minor keyword gaps.
    6. Assign comparative label + recommendation.

    Parameters
    ----------
    results : list of dicts already sorted descending by raw ``score``

    Returns
    -------
    Same list with ``score`` updated in place; ``raw_score`` preserved.
    """
    n = len(results)
    if n == 0:
        return results

    # ── Preserve raw scores ──────────────────────────────────────────────
    for r in results:
        r["raw_score"] = r["score"]

    if n == 1:
        r = results[0]
        r["comparative_rank"] = "Only Candidate"
        r["role_fit"]         = _determine_role_fit(
            r["score"],
            r.get("breakdown", {}).get("skill_match", 0),
        )
        return results

    raw_scores  = [r["raw_score"] for r in results]
    pool_max    = max(raw_scores)
    pool_min    = min(raw_scores)
    pool_range  = max(pool_max - pool_min, 1)

    # ── Target output ceiling ───────────────────────────────────────────
    # If the best raw score is already 90+, leave it; otherwise lift to 90
    TARGET_TOP = max(90, min(95, pool_max + 8))
    # Bottom: don't lift more than 6 pts above raw floor
    TARGET_BOT = max(25, pool_min - 2)

    calibrated_scores = []
    for r in results:
        raw = r["raw_score"]
        # Linear interpolation across [TARGET_BOT, TARGET_TOP]
        scaled = TARGET_BOT + (raw - pool_min) / pool_range * (TARGET_TOP - TARGET_BOT)
        # Blend: 70 % pool-relative, 30 % absolute raw capability
        blended = int(scaled * 0.70 + raw * 0.30)
        blended = max(20, min(95, blended))
        calibrated_scores.append(blended)

    # ── Compression into realistic ATS bands ────────────────────────────
    compressed = []
    for idx, score in enumerate(calibrated_scores):
        # Percentile within this pool (0=worst, 1=best)
        pct = 1.0 - idx / max(n - 1, 1)
        if pct >= 0.85:    band_target = 82 + int(pct * 13)   # 82-95
        elif pct >= 0.65:  band_target = 70 + int(pct * 18)   # 70-82
        elif pct >= 0.40:  band_target = 58 + int(pct * 29)   # 58-70
        elif pct >= 0.20:  band_target = 45 + int(pct * 32)   # 45-58
        else:              band_target = 30 + int(pct * 50)    # 30-45
        # Keep calibrated influence dominant, nudge toward band
        final = int(score * 0.75 + band_target * 0.25)
        final = max(20, min(95, final))
        compressed.append(final)

    # Write scores back
    for r, cs in zip(results, compressed):
        r["score"] = cs

    # ── Consistency check (Phase 6) ──────────────────────────────────────
    # If candidate[i] has higher skill_score AND more experience than
    # candidate[i+1] but a lower calibrated score (edge case after
    # compression), swap their scores.
    for i in range(len(results) - 1):
        a, b = results[i], results[i + 1]
        a_skill = a.get("breakdown", {}).get("skill_match", 0)
        b_skill = b.get("breakdown", {}).get("skill_match", 0)
        a_exp   = a.get("breakdown", {}).get("experience_years", 0.0) or 0
        b_exp   = b.get("breakdown", {}).get("experience_years", 0.0) or 0
        # b outranks a on BOTH dimensions yet scores lower -> inversion
        if b_skill > a_skill and b_exp > a_exp and b["score"] < a["score"]:
            logger.info(
                "Consistency fix: swapping scores %d<->%d for %s and %s",
                a["score"], b["score"],
                a.get("filename", "?"), b.get("filename", "?"),
            )
            a["score"], b["score"] = b["score"], a["score"]

    # Re-sort after consistency fixes
    results.sort(key=lambda x: x["score"], reverse=True)

    # ── Comparative labels & recommendations ─────────────────────────────
    for rank_idx, r in enumerate(results):
        comp_label = _comparative_label(rank_idx, n)
        role_fit   = _determine_role_fit(
            r["score"],
            r.get("breakdown", {}).get("skill_match", 0),
        )
        raw_rec = ""
        if r.get("insights"):
            raw_rec = r["insights"].get("recommendation", "")

        comp_rec = _comparative_recommendation(comp_label, raw_rec)

        r["comparative_rank"] = comp_label
        r["role_fit"]         = role_fit
        r["rank_position"]    = rank_idx + 1

        # Update insights so they propagate to DB and API
        if r.get("insights"):
            r["insights"]["comparative_rank"]       = comp_label
            r["insights"]["comparative_recommendation"] = comp_rec
            r["insights"]["role_fit"]               = role_fit
            r["insights"]["pool_size"]              = n
            # Override recommendation with comparative version
            r["insights"]["recommendation"]         = comp_rec

    return results


# ---------------------------------------------------------------------------
# Main ranking function
# ---------------------------------------------------------------------------

def rank_resumes_for_job(
    job,
    resumes: List[Tuple],
    uploads_dir: str = "uploads",
) -> List[dict]:
    """
    Two-pass ranking pipeline.

    Pass 1: Score each resume independently (scorer v4).
    Pass 2: Calibrate scores within the pool (cross-candidate normalisation).

    job row : (id, title, skills, keywords, min_experience, created_at, is_active)
    resumes : [(resume_id, filename), ...]

    Returns list of result dicts sorted by calibrated score (descending).
    """
    # ── Extract job fields ───────────────────────────────────────────────
    job_id         = job[0]
    job_title      = job[1]  if len(job) > 1 else ""
    skills         = job[2]  if len(job) > 2 else []
    keywords       = job[3]  if len(job) > 3 else []
    min_experience = job[4]  if len(job) > 4 else 0

    skills   = skills   or []
    keywords = keywords or []

    job_payload = {
        "skills":         skills,
        "keywords":       keywords,
        "min_experience": float(min_experience or 0),
    }

    results: List[dict] = []

    # ── Pass 1: Individual scoring ───────────────────────────────────────
    for resume_id, filename in resumes:
        path = os.path.join(uploads_dir, filename)

        if not os.path.exists(path):
            logger.warning("Resume file not found, skipping: %s", path)
            continue

        try:
            text = parse_resume(path)
        except Exception as exc:
            logger.error("Failed to parse %s: %s", filename, exc)
            continue

        if not text or len(text.strip()) < 20:
            logger.warning("Empty/too-short text for %s, skipping", filename)
            continue

        years = extract_years_of_experience(text)
        try:
            update_resume_parsed_data(
                resume_id=resume_id,
                experience_years=years,
                extracted_skills=skills,
                parsed_text=text,
            )
        except Exception as exc:
            logger.warning(
                "Could not update parsed data for resume id=%s: %s",
                resume_id, exc,
            )

        try:
            score_data = score_resume(text, job_payload, job_title=job_title)
        except Exception as exc:
            logger.error("Failed to score %s: %s", filename, exc)
            continue

        results.append({
            "resume_id":        resume_id,
            "filename":         filename,
            "score":            score_data["final_score"],
            "raw_score":        score_data["final_score"],    # set properly in pass 2
            "breakdown":        score_data["breakdown"],
            "insights":         score_data["insights"],
            "matched_skills":   score_data.get("matched_skills", []),
            "missing_skills":   score_data.get("missing_skills", []),
            "bonus_skills":     score_data.get("bonus_skills", []),
            "extracted_skills": score_data.get("extracted_skills", []),
            "explanation":      score_data.get("explanation", ""),
        })

        logger.info(
            "Pass-1 scored %s for job %d: %d/100",
            filename, job_id, score_data["final_score"],
        )

    if not results:
        return []

    # Sort by raw score before calibration
    results.sort(key=lambda x: x["score"], reverse=True)

    # ── Pass 2: Cross-candidate calibration ─────────────────────────────
    results = calibrate_scores(results)

    logger.info(
        "Calibrated %d candidates for job %d | scores: %s",
        len(results), job_id,
        [r["score"] for r in results],
    )

    return results
