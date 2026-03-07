import { useState, useEffect, useRef, useCallback } from 'react';
import { publicAPI } from '../services/api';
import './CandidatePortal.css';

const CandidatePortal = () => {
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [step, setStep] = useState('jobs'); // 'jobs' | 'form' | 'success'
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);

    const [form, setForm] = useState({
        candidate_name: '',
        candidate_email: '',
        resume_file: null,
    });

    const fileInputRef = useRef(null);

    useEffect(() => {
        publicAPI.getOpenJobs()
            .then((res) => setJobs(res.data))
            .catch(() => setError('Failed to load jobs. Please try again later.'))
            .finally(() => setLoading(false));
    }, []);

    const handleSelectJob = (job) => {
        setSelectedJob(job);
        setStep('form');
        setError('');
        setForm({ candidate_name: '', candidate_email: '', resume_file: null });
    };

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) validateAndSetFile(file);
    }, []);

    const validateAndSetFile = (file) => {
        const ext = file.name.rsplit ? file.name.rsplit('.', 1).pop() : file.name.split('.').pop().toLowerCase();
        if (!['pdf', 'docx'].includes(ext.toLowerCase())) {
            setError('Only PDF and DOCX files are allowed.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('File must be under 10 MB.');
            return;
        }
        setForm((prev) => ({ ...prev, resume_file: file }));
        setError('');
    };

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        if (file) validateAndSetFile(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.candidate_name.trim() || !form.candidate_email.trim() || !form.resume_file) {
            setError('Please fill in all fields and attach a resume.');
            return;
        }

        setSubmitting(true);
        setError('');

        const formData = new FormData();
        formData.append('job_id', selectedJob.id);
        formData.append('candidate_name', form.candidate_name.trim());
        formData.append('candidate_email', form.candidate_email.trim());
        formData.append('resume_file', form.resume_file);

        try {
            await publicAPI.submitApplication(formData);
            setStep('success');
        } catch (err) {
            setError(err.response?.data?.detail || 'Submission failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const resetPortal = () => {
        setStep('jobs');
        setSelectedJob(null);
        setError('');
        setForm({ candidate_name: '', candidate_email: '', resume_file: null });
    };

    return (
        <div className="cp-page">
            {/* ── Header ────────────────────────────────────── */}
            <header className="cp-header">
                <div className="cp-header-inner">
                    <div className="cp-logo">
                        <span className="cp-logo-icon">◈</span>
                        <span className="cp-logo-text">TalentHub</span>
                    </div>
                    <p className="cp-tagline">Find your next opportunity</p>
                </div>
            </header>

            <main className="cp-main">
                {/* ── STEP: Jobs List ────────────────────────── */}
                {step === 'jobs' && (
                    <div className="cp-section">
                        <div className="cp-section-header">
                            <h1>Open Positions</h1>
                            <p>Browse available roles and start your application</p>
                        </div>

                        {error && (
                            <div className="cp-alert cp-alert-error">{error}</div>
                        )}

                        {loading ? (
                            <div className="cp-loading">
                                <div className="cp-spinner" />
                                <p>Loading positions...</p>
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="cp-empty">
                                <span className="cp-empty-icon">📭</span>
                                <h3>No open positions right now</h3>
                                <p>Check back soon — new roles are added regularly.</p>
                            </div>
                        ) : (
                            <div className="cp-jobs-grid">
                                {jobs.map((job) => (
                                    <div key={job.id} className="cp-job-card" onClick={() => handleSelectJob(job)}>
                                        <div className="cp-job-badge">Open</div>
                                        <h3 className="cp-job-title">{job.title}</h3>
                                        <div className="cp-job-meta">
                                            <span>⏱ {job.min_experience}+ yrs exp</span>
                                        </div>
                                        <div className="cp-skills-list">
                                            {(job.skills || []).slice(0, 5).map((skill) => (
                                                <span key={skill} className="cp-skill-tag">{skill}</span>
                                            ))}
                                            {(job.skills || []).length > 5 && (
                                                <span className="cp-skill-more">+{job.skills.length - 5} more</span>
                                            )}
                                        </div>
                                        <button className="cp-apply-btn">Apply Now →</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── STEP: Application Form ─────────────────── */}
                {step === 'form' && (
                    <div className="cp-section cp-form-section">
                        <button className="cp-back-btn" onClick={resetPortal}>← Back to Jobs</button>
                        <div className="cp-form-header">
                            <div className="cp-form-title-group">
                                <span className="cp-form-label">Applying for</span>
                                <h2>{selectedJob?.title}</h2>
                            </div>
                        </div>

                        <form className="cp-form" onSubmit={handleSubmit} noValidate>
                            <div className="cp-form-group">
                                <label htmlFor="cp-name">Full Name</label>
                                <input
                                    id="cp-name"
                                    type="text"
                                    placeholder="Jane Doe"
                                    value={form.candidate_name}
                                    onChange={(e) => setForm((p) => ({ ...p, candidate_name: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="cp-form-group">
                                <label htmlFor="cp-email">Email Address</label>
                                <input
                                    id="cp-email"
                                    type="email"
                                    placeholder="jane@example.com"
                                    value={form.candidate_email}
                                    onChange={(e) => setForm((p) => ({ ...p, candidate_email: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="cp-form-group">
                                <label>Resume</label>
                                <div
                                    className={`cp-dropzone${dragActive ? ' cp-dropzone--active' : ''}${form.resume_file ? ' cp-dropzone--filled' : ''}`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {form.resume_file ? (
                                        <div className="cp-file-selected">
                                            <span className="cp-file-icon">📄</span>
                                            <div>
                                                <div className="cp-file-name">{form.resume_file.name}</div>
                                                <div className="cp-file-size">
                                                    {(form.resume_file.size / 1024 / 1024).toFixed(2)} MB
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="cp-file-remove"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setForm((p) => ({ ...p, resume_file: null }));
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="cp-dropzone-inner">
                                            <div className="cp-upload-icon">⬆</div>
                                            <p>Drag & drop your resume here</p>
                                            <span>or click to browse</span>
                                            <small>PDF or DOCX — max 10 MB</small>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.docx"
                                    onChange={handleFileInput}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {error && (
                                <div className="cp-alert cp-alert-error">{error}</div>
                            )}

                            <button
                                type="submit"
                                className="cp-submit-btn"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <><div className="cp-spinner cp-spinner-sm" /> Submitting...</>
                                ) : (
                                    'Submit Application'
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* ── STEP: Success ────────────────────────────── */}
                {step === 'success' && (
                    <div className="cp-section cp-success-section">
                        <div className="cp-success-icon">✓</div>
                        <h2>Application Submitted!</h2>
                        <p>
                            Thank you for applying for <strong>{selectedJob?.title}</strong>.
                            Our team will review your resume and get back to you soon.
                        </p>
                        <button className="cp-apply-btn" onClick={resetPortal}>
                            Browse More Jobs
                        </button>
                    </div>
                )}
            </main>

            <footer className="cp-footer">
                <p>© {new Date().getFullYear()} TalentHub — Powered by ATS Pro</p>
            </footer>
        </div>
    );
};

export default CandidatePortal;
