import { useState, useEffect } from 'react';
import {
    Award, TrendingUp, AlertTriangle, ChevronDown, ChevronUp,
    CheckCircle, XCircle, Star, BarChart2, Layers, Brain, Users, Plus,
    MessageSquare, Send, Trash2, Clock, Loader
} from 'lucide-react';
import { commentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './CandidateCard.css';

/**
 * CandidateCard — Controlled component.
 * Expand/collapse state is managed by the PARENT via:
 *   isExpanded (boolean)  — current expanded state
 *   onToggle   (function) — called when button is clicked
 */
const CandidateCard = ({ candidate, rank, isExpanded, onToggle, skillPriorities }) => {
    const { user } = useAuth();

    // ── Comment state ────────────────────────────────────────────────────
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [commentSubmitting, setCommentSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [commentError, setCommentError] = useState('');

    // Fetch comments when card is expanded
    useEffect(() => {
        if (isExpanded && candidate.resume_id) {
            fetchComments();
        }
    }, [isExpanded, candidate.resume_id]);

    const fetchComments = async () => {
        if (!candidate.resume_id) return;
        setCommentLoading(true);
        setCommentError('');
        try {
            const res = await commentsAPI.getComments(candidate.resume_id);
            setComments(res.data.comments || []);
        } catch {
            setCommentError('Failed to load comments.');
        } finally {
            setCommentLoading(false);
        }
    };

    const handleAddComment = async () => {
        const trimmed = newComment.trim();
        if (!trimmed) return;
        setCommentSubmitting(true);
        setCommentError('');
        try {
            const res = await commentsAPI.addComment(candidate.resume_id, trimmed);
            // Optimistic: prepend the new comment
            setComments(prev => [res.data.comment, ...prev]);
            setNewComment('');
        } catch (err) {
            setCommentError(err.response?.data?.detail || 'Failed to add comment.');
        } finally {
            setCommentSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;
        setDeletingId(commentId);
        setCommentError('');
        try {
            await commentsAPI.deleteComment(commentId);
            // Optimistic: remove from list
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (err) {
            setCommentError(err.response?.data?.detail || 'Failed to delete comment.');
        } finally {
            setDeletingId(null);
        }
    };

    const canDeleteComment = (comment) => {
        if (!user) return false;
        if (comment.user_id === user.id) return true;
        if (user.role === 'admin' || user.role === 'ceo') return true;
        return false;
    };

    const getTierColor = t => ({ A: 'tier-a', B: 'tier-b', C: 'tier-c', D: 'tier-d' }[t] || 'tier-default');
    const getScoreColor = s => s >= 80 ? 'score-excellent' : s >= 60 ? 'score-good' : s >= 40 ? 'score-fair' : 'score-poor';
    const recClass = r => 'rec-' + (r || '').toLowerCase().replace(/[\s/]+/g, '-');

    // Create a priority map for quick lookup: { skill_name_lower: { priority, level } }
    const priorityMap = {};
    if (Array.isArray(skillPriorities)) {
        skillPriorities.forEach(sp => {
            if (sp && sp.skill) {
                priorityMap[sp.skill.toLowerCase().trim()] = {
                    priority: sp.priority,
                    level: sp.importance_level || 'high'
                };
            }
        });
    }

    const getPriorityLabel = (skill) => {
        const entry = priorityMap[skill.toLowerCase().trim()];
        if (!entry) return null;
        if (entry.priority >= 0.9) return { label: 'CRITICAL', class: 'p-critical' };
        if (entry.priority >= 0.65) return { label: 'HIGH', class: 'p-high' };
        if (entry.priority >= 0.40) return { label: 'MEDIUM', class: 'p-medium' };
        if (entry.priority >= 0.20) return { label: 'LOW', class: 'p-low' };
        return { label: 'OPTIONAL', class: 'p-optional' };
    };

    // Safe data access
    const matched = Array.isArray(candidate.matched_skills) ? candidate.matched_skills : [];
    const missing = Array.isArray(candidate.missing_skills) ? candidate.missing_skills : [];
    const bonus = Array.isArray(candidate.bonus_skills) ? candidate.bonus_skills : [];
    const catSkills = candidate.candidate_skills && typeof candidate.candidate_skills === 'object'
        ? candidate.candidate_skills : {};
    const breakdown = candidate.breakdown && typeof candidate.breakdown === 'object'
        ? candidate.breakdown : {};
    const hasSkills = matched.length > 0 || missing.length > 0 || bonus.length > 0;

    const catEntries = Object.entries(catSkills).filter(
        ([, vals]) => Array.isArray(vals) && vals.length > 0
    );

    const breakdownRows = [
        { key: 'skill_match', label: 'Skill Match' },
        { key: 'keyword_match', label: 'Keyword Match' },
        { key: 'experience_score', label: 'Experience' },
    ];

    // Stable panel id for aria
    const panelId = `candidate-details-${candidate.resume_id ?? rank}`;

    const handleToggle = (e) => {
        e.stopPropagation();
        if (typeof onToggle === 'function') {
            onToggle();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle(e);
        }
    };

    return (
        <div className="candidate-card">
            {/* ── Header ─────────────────────────────────── */}
            <div className="candidate-header">
                <div className="candidate-rank" aria-hidden="true">#{rank}</div>

                <div className="candidate-info">
                    <h3 className="candidate-name">
                        {candidate.candidate_filename || `Candidate #${rank}`}
                    </h3>
                    <div className="candidate-meta">
                        <span className={`tier-badge ${getTierColor(candidate.tier)}`}>
                            Tier {candidate.tier || '—'}
                        </span>
                        <span className={`score-badge ${getScoreColor(candidate.final_score ?? 0)}`}>
                            {candidate.final_score ?? 0}/100
                        </span>
                        {candidate.recommendation && (
                            <span className={`rec-badge ${recClass(candidate.recommendation)}`}>
                                {candidate.recommendation}
                            </span>
                        )}
                        {breakdown.experience_years > 0 && (
                            <span className="exp-badge">
                                {breakdown.experience_years} yrs exp
                            </span>
                        )}
                        {candidate.upload_source === 'hr_manual_upload' ? (
                            <span className="uploader-badge manual">
                                <Plus size={12} />
                                {candidate.uploaded_by_name || 'HR Upload'}
                            </span>
                        ) : (
                            <span className="uploader-badge portal">
                                <Users size={12} />
                                {candidate.uploaded_by_name || 'Candidate Portal'}
                            </span>
                        )}
                    </div>
                </div>

                <button
                    className={`expand-button ${isExpanded ? 'expanded' : ''}`}
                    onClick={handleToggle}
                    onKeyDown={handleKeyDown}
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    aria-label={isExpanded ? 'Collapse candidate details' : 'Expand candidate details'}
                >
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
            </div>

            {/* ── Expanded Detail Panels ─────────────────── */}
            {isExpanded && (
                <div
                    id={panelId}
                    className="candidate-details"
                    role="region"
                    aria-label="Candidate details"
                >
                    {/* 1. Score Breakdown — full width */}
                    <div className="detail-card detail-full">
                        <div className="detail-card-header">
                            <BarChart2 size={15} />
                            <span>Score Breakdown</span>
                        </div>
                        <div className="breakdown-rows">
                            {breakdownRows.map(({ key, label }) => {
                                const val = Math.round(breakdown[key] ?? 0);
                                return (
                                    <div key={key} className="breakdown-row">
                                        <span className="breakdown-label">{label}</span>
                                        <div className="breakdown-bar" role="progressbar"
                                            aria-valuenow={val} aria-valuemin={0} aria-valuemax={100}>
                                            <div
                                                className="breakdown-fill"
                                                style={{ width: `${Math.min(val, 100)}%` }}
                                            />
                                        </div>
                                        <span className="breakdown-val">{val}%</span>
                                    </div>
                                );
                            })}
                            {breakdown.experience_years > 0 && (
                                <div className="breakdown-row">
                                    <span className="breakdown-label">Exp. Years</span>
                                    <div className="breakdown-bar">
                                        <div className="breakdown-fill"
                                            style={{ width: `${Math.min(breakdown.experience_years * 10, 100)}%` }} />
                                    </div>
                                    <span className="breakdown-val">{breakdown.experience_years} yrs</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Skills Analysis — full width */}
                    <div className="detail-card detail-full">
                        <div className="detail-card-header">
                            <Star size={15} />
                            <span>Skills Analysis</span>
                            {breakdown.skill_match != null && (
                                <span className="skill-match-pct">{Math.round(breakdown.skill_match)}% match</span>
                            )}
                        </div>
                        {!hasSkills ? (
                            <p className="empty-msg">No skills could be extracted from this resume.</p>
                        ) : (
                            <div className="skills-grid">
                                {matched.length > 0 && (
                                    <div className="skill-group">
                                        <div className="skill-group-label matched-label">
                                            <CheckCircle size={12} /> Matched ({matched.length})
                                        </div>
                                        <div className="skill-chips">
                                            {matched.map((s, i) => {
                                                const p = getPriorityLabel(s);
                                                return (
                                                    <span key={i} className={`chip chip-matched ${p?.class || ''}`}>
                                                        {s}
                                                        {p && <span className="priority-mini-tag">{p.label}</span>}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {missing.length > 0 && (
                                    <div className="skill-group">
                                        <div className="skill-group-label missing-label">
                                            <XCircle size={12} /> Missing ({missing.length})
                                        </div>
                                        <div className="skill-chips">
                                            {missing.map((s, i) => {
                                                const p = getPriorityLabel(s);
                                                return (
                                                    <span key={i} className={`chip chip-missing ${p?.class || ''}`}>
                                                        {s}
                                                        {p && <span className="priority-mini-tag">{p.label}</span>}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {bonus.length > 0 && (
                                    <div className="skill-group">
                                        <div className="skill-group-label bonus-label">
                                            <Star size={12} /> Bonus
                                        </div>
                                        <div className="skill-chips">
                                            {bonus.map((s, i) => <span key={i} className="chip chip-bonus">{s}</span>)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 3. Categorised Skills — full width (only if data exists) */}
                    {catEntries.length > 0 && (
                        <div className="detail-card detail-full">
                            <div className="detail-card-header">
                                <Layers size={15} />
                                <span>Detected Skills by Category</span>
                            </div>
                            <div className="cat-grid">
                                {catEntries.map(([cat, vals]) => (
                                    <div key={cat} className="cat-row">
                                        <span className="cat-label">
                                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                        </span>
                                        <div className="skill-chips">
                                            {vals.map((s, i) => <span key={i} className="chip chip-cat">{s}</span>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 4. AI Analysis + Strengths/Gaps — 2-column row */}
                    <div className="detail-row-2col">
                        {candidate.reasoning && (
                            <div className="detail-card">
                                <div className="detail-card-header">
                                    <Brain size={15} />
                                    <span>AI Analysis</span>
                                </div>
                                <p className="reasoning-text">{candidate.reasoning}</p>
                            </div>
                        )}

                        {(candidate.key_strengths?.length > 0 || candidate.gaps?.length > 0) && (
                            <div className="detail-card">
                                {candidate.key_strengths?.length > 0 && (
                                    <>
                                        <div className="detail-card-header">
                                            <TrendingUp size={15} />
                                            <span>Key Strengths</span>
                                        </div>
                                        <ul className="insight-list strengths-list">
                                            {candidate.key_strengths.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </>
                                )}
                                {candidate.gaps?.length > 0 && (
                                    <>
                                        <div className="detail-card-header"
                                            style={{ marginTop: candidate.key_strengths?.length ? '1rem' : 0 }}>
                                            <AlertTriangle size={15} />
                                            <span>Gaps to Address</span>
                                        </div>
                                        <ul className="insight-list gaps-list">
                                            {candidate.gaps.map((g, i) => <li key={i}>{g}</li>)}
                                        </ul>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 5. HR Comments ─────────────────────────────── */}
                    <div className="detail-card detail-full comments-section">
                        <div className="detail-card-header">
                            <MessageSquare size={15} />
                            <span>HR Comments</span>
                            <span className="comment-count">{comments.length}</span>
                        </div>

                        {/* Comment input */}
                        <div className="comment-input-row">
                            <input
                                type="text"
                                className="comment-input"
                                placeholder="Add a comment about this candidate..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !commentSubmitting && handleAddComment()}
                                disabled={commentSubmitting}
                                maxLength={2000}
                            />
                            <button
                                className="comment-send-btn"
                                onClick={handleAddComment}
                                disabled={commentSubmitting || !newComment.trim()}
                                aria-label="Submit comment"
                            >
                                {commentSubmitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </div>

                        {/* Error */}
                        {commentError && (
                            <div className="comment-error">
                                <XCircle size={14} />
                                {commentError}
                            </div>
                        )}

                        {/* Comment list */}
                        {commentLoading ? (
                            <div className="comment-loading">
                                <Loader size={18} className="animate-spin" />
                                <span>Loading comments...</span>
                            </div>
                        ) : comments.length === 0 ? (
                            <div className="comment-empty">
                                No comments yet. Be the first to leave feedback.
                            </div>
                        ) : (
                            <div className="comment-list">
                                {comments.map(c => (
                                    <div key={c.id} className="comment-item">
                                        <div className="comment-item-header">
                                            <div className="comment-user-info">
                                                <span className="comment-avatar">
                                                    {(c.user || '??').charAt(0).toUpperCase()}
                                                </span>
                                                <span className="comment-user-name">{c.user}</span>
                                                <span className="comment-time">
                                                    <Clock size={10} />
                                                    {new Date(c.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            {canDeleteComment(c) && (
                                                <button
                                                    className="comment-delete-btn"
                                                    onClick={() => handleDeleteComment(c.id)}
                                                    disabled={deletingId === c.id}
                                                    aria-label="Delete comment"
                                                    title="Delete comment"
                                                >
                                                    {deletingId === c.id
                                                        ? <Loader size={13} className="animate-spin" />
                                                        : <Trash2 size={13} />
                                                    }
                                                </button>
                                            )}
                                        </div>
                                        <p className="comment-text">{c.comment}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};

export default CandidateCard;
