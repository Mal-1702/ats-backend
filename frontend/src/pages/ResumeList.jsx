import { useState, useEffect, useCallback } from 'react';
import { resumesAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { Trash2, FileText, AlertCircle, Download, Eye, Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import './ResumeList.css';

const ResumeList = () => {
    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Job filter State
    const [jobs, setJobs] = useState([]);
    const [activeJobId, setActiveJobId] = useState(null);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [availableSkills, setAvailableSkills] = useState([]);
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [expRange, setExpRange] = useState({ min: 0, max: 20 });
    const [keyword, setKeyword] = useState('');

    useEffect(() => {
        fetchResumes();
        fetchSkills();
        fetchJobsForFilter();
    }, []);

    const fetchResumes = async (params = {}) => {
        setLoading(true);
        try {
            const response = await resumesAPI.getAll(params);
            setResumes(response.data);
            setError('');
        } catch (error) {
            console.error('Failed to fetch resumes:', error);
            setError('Failed to load resumes');
        } finally {
            setLoading(false);
        }
    };

    const fetchSkills = async () => {
        try {
            const response = await resumesAPI.getUniqueSkills();
            setAvailableSkills(response.data);
        } catch (error) {
            console.error('Failed to fetch skills:', error);
        }
    };

    const fetchJobsForFilter = async () => {
        try {
            const response = await resumesAPI.getJobsForFilter();
            setJobs(response.data);
        } catch (error) {
            console.error('Failed to fetch jobs for filter:', error);
        }
    };

    const handleJobFilter = (jobId) => {
        setActiveJobId(jobId);
        if (jobId === null) {
            // Reset to default unfiltered view
            fetchResumes({});
        } else {
            fetchResumes({ job_id: jobId });
        }
    };

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (selectedSkills.length > 0) params.skills = selectedSkills;
            if (expRange.min > 0) params.min_exp = expRange.min;
            if (expRange.max < 20) params.max_exp = expRange.max;
            if (keyword) params.keywords = keyword;

            fetchResumes(params);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedSkills, expRange, keyword]);

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedSkills([]);
        setExpRange({ min: 0, max: 20 });
        setKeyword('');
    };

    const toggleSkill = (skill) => {
        setSelectedSkills(prev =>
            prev.includes(skill)
                ? prev.filter(s => s !== skill)
                : [...prev, skill]
        );
    };

    const handleDelete = async (resumeId, filename) => {
        if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
            return;
        }
        try {
            await resumesAPI.delete(resumeId);
            setResumes(resumes.filter(r => r.id !== resumeId));
        } catch (error) {
            console.error('Delete error:', error);
            setError(`Failed to delete resume: ${error.response?.data?.detail || 'Unknown error'}`);
        }
    };

    const handleDownload = async (resumeId, filename) => {
        try {
            const response = await resumesAPI.downloadResume(resumeId);
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            setError(`Failed to download resume`);
        }
    };

    const handleView = async (resumeId) => {
        try {
            const response = await resumesAPI.viewResume(resumeId);
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } catch (error) {
            console.error('View error:', error);
            setError(`Failed to view resume`);
        }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-main">
                <div className="resume-list-page">
                    <div className="container">
                        <div className="resume-list-header">
                            <div>
                                <h1>Uploaded Resumes</h1>
                                <p className="subtitle">{resumes.length} total</p>
                            </div>

                            <div className="search-actions">
                                <div className="search-input-wrapper">
                                    <Search className="search-icon" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Search by name, role, or skill..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="search-bar"
                                    />
                                    {searchQuery && (
                                        <button className="clear-search" onClick={() => setSearchQuery('')}>
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                                <button
                                    className={`filter-toggle ${showFilters ? 'active' : ''}`}
                                    onClick={() => setShowFilters(!showFilters)}
                                >
                                    <Filter size={20} />
                                    <span>Sort & Filter</span>
                                    {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* ── Job Filter Panel ───────────────────────── */}
                        {jobs.length > 0 && (
                            <div className="job-filter-panel">
                                <span className="job-filter-label">Filter by Job:</span>
                                <div className="job-filter-buttons">
                                    <button
                                        className={`job-filter-btn ${activeJobId === null ? 'active' : ''}`}
                                        onClick={() => handleJobFilter(null)}
                                    >
                                        All Resumes
                                    </button>
                                    {jobs.map((job) => (
                                        <button
                                            key={job.id}
                                            className={`job-filter-btn ${activeJobId === job.id ? 'active' : ''}`}
                                            onClick={() => handleJobFilter(job.id)}
                                        >
                                            {job.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {showFilters && (
                            <div className="filter-panel">
                                <div className="filter-section">
                                    <h3>Years of Experience</h3>
                                    <div className="exp-slider-container">
                                        <div className="exp-labels">
                                            <span>{expRange.min} yrs</span>
                                            <span>{expRange.max === 20 ? '20+ yrs' : `${expRange.max} yrs`}</span>
                                        </div>
                                        <div className="multi-range-slider">
                                            <input
                                                type="range"
                                                min="0"
                                                max="20"
                                                value={expRange.min}
                                                onChange={(e) => setExpRange({ ...expRange, min: parseInt(e.target.value) })}
                                                className="range-input"
                                            />
                                            <input
                                                type="range"
                                                min="0"
                                                max="20"
                                                value={expRange.max}
                                                onChange={(e) => setExpRange({ ...expRange, max: parseInt(e.target.value) })}
                                                className="range-input"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="filter-section">
                                    <h3>Skillset</h3>
                                    <div className="skills-checklist">
                                        {availableSkills.map(skill => (
                                            <label key={skill} className="skill-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSkills.includes(skill)}
                                                    onChange={() => toggleSkill(skill)}
                                                />
                                                <span>{skill}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="filter-section">
                                    <h3>Keywords</h3>
                                    <input
                                        type="text"
                                        placeholder="e.g. Microservices, DevOps..."
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        className="keyword-input"
                                    />
                                </div>

                                <div className="filter-footer">
                                    <button className="btn-clear-filters" onClick={handleClearFilters}>
                                        Reset All Filters
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="alert alert-error">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner-large"></div>
                                <p>Searching resumes...</p>
                            </div>
                        ) : resumes.length === 0 ? (
                            <div className="empty-state">
                                <FileText size={64} />
                                <h2>No resumes found</h2>
                                <p>Try adjusting your search or filters</p>
                            </div>
                        ) : (
                            <div className="resume-grid">
                                {resumes.map(resume => (
                                    <div key={resume.id} className="resume-card">
                                        <div className="resume-header-row">
                                            <div className="resume-icon">
                                                <FileText size={32} />
                                            </div>
                                            <div className="resume-info">
                                                <h3 className="resume-filename">{resume.filename}</h3>
                                                <div className="resume-meta">
                                                    <span className="resume-date">
                                                        {new Date(resume.uploaded_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="resume-footer">
                                            <button className="btn-view" onClick={() => handleView(resume.id)} title="View">
                                                <Eye size={18} />
                                                <span>View</span>
                                            </button>
                                            <button className="btn-download" onClick={() => handleDownload(resume.id, resume.filename)} title="Download">
                                                <Download size={18} />
                                                <span>Download</span>
                                            </button>
                                            <button className="btn-delete" onClick={() => handleDelete(resume.id, resume.filename)} title="Delete">
                                                <Trash2 size={18} />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumeList;

