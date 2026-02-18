import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { Briefcase, Plus, X } from 'lucide-react';
import './JobCreate.css';

const JobCreate = () => {
    const [formData, setFormData] = useState({
        title: '',
        skills: [],
        keywords: [],
        min_experience: 0,
    });
    const [currentSkill, setCurrentSkill] = useState('');
    const [currentKeyword, setCurrentKeyword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await jobsAPI.create(formData);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create job');
        } finally {
            setLoading(false);
        }
    };

    const addSkill = () => {
        if (currentSkill.trim() && !formData.skills.includes(currentSkill.trim())) {
            setFormData({
                ...formData,
                skills: [...formData.skills, currentSkill.trim()],
            });
            setCurrentSkill('');
        }
    };

    const removeSkill = (skill) => {
        setFormData({
            ...formData,
            skills: formData.skills.filter((s) => s !== skill),
        });
    };

    const addKeyword = () => {
        if (currentKeyword.trim() && !formData.keywords.includes(currentKeyword.trim())) {
            setFormData({
                ...formData,
                keywords: [...formData.keywords, currentKeyword.trim()],
            });
            setCurrentKeyword('');
        }
    };

    const removeKeyword = (keyword) => {
        setFormData({
            ...formData,
            keywords: formData.keywords.filter((k) => k !== keyword),
        });
    };

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-main">
                <div className="container job-create-container">
                    <div className="job-create-header">
                        <Briefcase size={32} />
                        <h1>Create New Job</h1>
                        <p>Define the position and requirements</p>
                    </div>

                    <div className="job-create-card">
                        <form onSubmit={handleSubmit}>
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

                            <div className="form-group">
                                <label className="form-label">Required Skills *</label>
                                <div className="tag-input-container">
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={currentSkill}
                                        onChange={(e) => setCurrentSkill(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                        placeholder="Type a skill and press Enter"
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
                                <div className="tags-list">
                                    {formData.skills.map((skill, idx) => (
                                        <span key={idx} className="tag">
                                            {skill}
                                            <button type="button" onClick={() => removeSkill(skill)}>
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Keywords (Optional)</label>
                                <div className="tag-input-container">
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={currentKeyword}
                                        onChange={(e) => setCurrentKeyword(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                                        placeholder="Type a keyword and press Enter"
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
                                    {formData.keywords.map((keyword, idx) => (
                                        <span key={idx} className="tag">
                                            {keyword}
                                            <button type="button" onClick={() => removeKeyword(keyword)}>
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

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

                            {error && <div className="form-error">{error}</div>}

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => navigate('/dashboard')}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
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
