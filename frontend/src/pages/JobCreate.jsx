import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { Briefcase, Plus, X, AlertCircle } from 'lucide-react';
import './JobCreate.css';

import SkillPriorityCard, { getPriorityConfig } from '../components/SkillPriorityCard';

// ── Main page ─────────────────────────────────────────────────────────────
const JobCreate = () => {
    const [formData, setFormData] = useState({
        title: '',
        keywords: [],
        min_experience: 0,
    });
    const [skillObjs, setSkillObjs] = useState([]);   // [{ skill, priority, importance_level }]
    const [currentSkill, setCurrentSkill] = useState('');
    const [currentKeyword, setCurrentKeyword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // ── Skill handlers ───────────────────────────────────────────────────────
    const addSkill = () => {
        const trimmed = currentSkill.trim();
        if (!trimmed) return;
        if (skillObjs.some((s) => s.skill.toLowerCase() === trimmed.toLowerCase())) return;
        setSkillObjs((prev) => [
            ...prev,
            { skill: trimmed, priority: 0.75, importance_level: 'high' },
        ]);
        setCurrentSkill('');
    };

    const removeSkill = (name) =>
        setSkillObjs((prev) => prev.filter((s) => s.skill !== name));

    const updatePriority = (name, newPriority) => {
        const cfg = getPriorityConfig(newPriority);
        setSkillObjs((prev) =>
            prev.map((s) =>
                s.skill === name
                    ? { ...s, priority: newPriority, importance_level: cfg.label.toLowerCase() }
                    : s,
            ),
        );
    };

    // ── Keyword handlers ─────────────────────────────────────────────────────
    const addKeyword = () => {
        const trimmed = currentKeyword.trim();
        if (!trimmed || formData.keywords.includes(trimmed)) return;
        setFormData((f) => ({ ...f, keywords: [...f.keywords, trimmed] }));
        setCurrentKeyword('');
    };

    const removeKeyword = (kw) =>
        setFormData((f) => ({ ...f, keywords: f.keywords.filter((k) => k !== kw) }));

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (skillObjs.length === 0) {
            setError('Please add at least one required skill.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                skills: skillObjs.map((s) => s.skill),
                skill_priorities: skillObjs.map((s) => ({
                    skill: s.skill,
                    priority: s.priority,
                    importance_level: s.importance_level,
                })),
            };
            await jobsAPI.create(payload);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create job');
        } finally {
            setLoading(false);
        }
    };

    // ── Stat summary ─────────────────────────────────────────────────────────
    const criticalCount = skillObjs.filter((s) => s.priority >= 0.90).length;
    const highCount = skillObjs.filter((s) => s.priority >= 0.65 && s.priority < 0.90).length;
    const optionalCount = skillObjs.filter((s) => s.priority < 0.40).length;

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-main">
                <div className="container job-create-container">
                    <div className="job-create-header">
                        <Briefcase size={32} />
                        <h1>Create New Job</h1>
                        <p>Define the position and set skill priorities for smarter candidate ranking</p>
                    </div>

                    <div className="job-create-card">
                        <form onSubmit={handleSubmit}>

                            {/* Job Title */}
                            <div className="form-group">
                                <label className="form-label">Job Title *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    placeholder="e.g., Senior Python Developer"
                                />
                            </div>

                            {/* Required Skills + Priority */}
                            <div className="form-group">
                                <label className="form-label">
                                    Required Skills *
                                    <span className="form-label-hint"> — set importance for each skill</span>
                                </label>

                                <div className="tag-input-container">
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={currentSkill}
                                        onChange={(e) => setCurrentSkill(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
                                        }}
                                        placeholder="Type a skill and press Enter or click Add"
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={addSkill}
                                    >
                                        <Plus size={16} />
                                        Add
                                    </button>
                                </div>

                                {/* Priority summary stats */}
                                {skillObjs.length > 0 && (
                                    <div className="priority-stats">
                                        <span className="pstat critical">{criticalCount} Critical</span>
                                        <span className="pstat high">{highCount} High</span>
                                        <span className="pstat optional">{optionalCount} Optional</span>
                                        <span className="pstat total">{skillObjs.length} total skills</span>
                                    </div>
                                )}

                                {/* Skill cards grid */}
                                {skillObjs.length > 0 ? (
                                    <div className="skills-priority-grid">
                                        {skillObjs.map((s) => (
                                            <SkillPriorityCard
                                                key={s.skill}
                                                skillObj={s}
                                                onRemove={removeSkill}
                                                onPriorityChange={updatePriority}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="skills-empty-hint">
                                        <AlertCircle size={16} />
                                        <span>Add skills above — each skill can be individually prioritised from Critical to Optional</span>
                                    </div>
                                )}
                            </div>

                            {/* Keywords */}
                            <div className="form-group">
                                <label className="form-label">Keywords <span className="form-label-optional">(optional)</span></label>
                                <div className="tag-input-container">
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={currentKeyword}
                                        onChange={(e) => setCurrentKeyword(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') { e.preventDefault(); addKeyword(); }
                                        }}
                                        placeholder="e.g., microservices, cloud, startup"
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={addKeyword}
                                    >
                                        <Plus size={16} />
                                        Add
                                    </button>
                                </div>
                                <div className="tags-list">
                                    {formData.keywords.map((kw, idx) => (
                                        <span key={idx} className="tag">
                                            {kw}
                                            <button type="button" onClick={() => removeKeyword(kw)}>
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Min Experience */}
                            <div className="form-group">
                                <label className="form-label">Minimum Experience (years) *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.min_experience}
                                    onChange={(e) =>
                                        setFormData({ ...formData, min_experience: parseInt(e.target.value) || 0 })
                                    }
                                    required
                                    min="0"
                                    max="30"
                                />
                            </div>

                            {error && (
                                <div className="form-error">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => navigate('/dashboard')}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <div className="spinner" style={{ width: '20px', height: '20px' }} />
                                    ) : (
                                        <>
                                            <Briefcase size={18} />
                                            <span>Create Job</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobCreate;
