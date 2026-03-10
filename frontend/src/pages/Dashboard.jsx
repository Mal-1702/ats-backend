import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI, resumesAPI, dashboardAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { Briefcase, Users, TrendingUp, Plus, Pencil, Trash2, X, Bell, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import './Dashboard.css';

const LAST_CHECK_KEY = 'ats_last_dashboard_check';
const POLL_INTERVAL_MS = 60_000;

const Dashboard = () => {
    const [jobs, setJobs] = useState([]);
    const [resumeCount, setResumeCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [editingJob, setEditingJob] = useState(null);
    const [editSkills, setEditSkills] = useState([]);
    const [newSkill, setNewSkill] = useState('');
    const [editLoading, setEditLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [uploadJob, setUploadJob] = useState(null);
    const [uploadFiles, setUploadFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success'|'error', message: string }
    const navigate = useNavigate();

    // ─── New-resume alert state ───────────────────────────────
    const [newResumeAlert, setNewResumeAlert] = useState(0);
    const pollRef = useRef(null);

    useEffect(() => {
        fetchData();
        checkNewResumes();   // immediate check on mount

        // Poll every 60 s
        pollRef.current = setInterval(checkNewResumes, POLL_INTERVAL_MS);
        return () => clearInterval(pollRef.current);
    }, []);

    const fetchData = async () => {
        try {
            const [jobsResponse, resumesResponse] = await Promise.all([
                jobsAPI.getAll(),
                resumesAPI.getAll()
            ]);
            setJobs(jobsResponse.data);
            setResumeCount(resumesResponse.data.length);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    // ─── New-resume check (server-side count) ─────────────────
    const checkNewResumes = async () => {
        try {
            const since = localStorage.getItem(LAST_CHECK_KEY);
            const params = since ? { since } : {};
            const res = await dashboardAPI.getNewResumesCount(params);
            const { new_resumes, server_time } = res.data;

            // Update the baseline to the server's clock (avoids client drift)
            localStorage.setItem(LAST_CHECK_KEY, server_time);

            if (new_resumes > 0) {
                setNewResumeAlert(new_resumes);
            }
        } catch {
            // Alert failure must never break the dashboard
        }
    };

    const dismissAlert = () => setNewResumeAlert(0);


    const handleToggleStatus = async (jobId, newStatus) => {
        try {
            await jobsAPI.toggleStatus(jobId, newStatus);
            fetchData();
        } catch (error) {
            console.error('Failed to toggle job status:', error);
        }
    };

    // -------- EDIT SKILLS --------
    const openEditModal = (job) => {
        setEditingJob(job);
        setEditSkills([...job.skills]);
        setNewSkill('');
    };

    const closeEditModal = () => {
        setEditingJob(null);
        setEditSkills([]);
        setNewSkill('');
    };

    const addEditSkill = () => {
        const trimmed = newSkill.trim();
        if (trimmed && !editSkills.includes(trimmed)) {
            setEditSkills([...editSkills, trimmed]);
            setNewSkill('');
        }
    };

    const removeEditSkill = (skill) => {
        setEditSkills(editSkills.filter(s => s !== skill));
    };

    const handleSaveSkills = async () => {
        if (!editingJob) return;
        setEditLoading(true);
        try {
            await jobsAPI.updateSkills(editingJob.id, editSkills);
            closeEditModal();
            fetchData();
        } catch (error) {
            console.error('Failed to update skills:', error);
        } finally {
            setEditLoading(false);
        }
    };

    // -------- DELETE --------
    const handleDeleteJob = async (jobId) => {
        try {
            await jobsAPI.delete(jobId);
            setDeleteConfirm(null);
            fetchData();
        } catch (error) {
            console.error('Failed to delete job:', error);
        }
    };

    // -------- UPLOAD RESUMES --------
    const openUploadModal = (job) => {
        setUploadJob(job);
        setUploadFiles([]);
        setUploadStatus(null);
    };

    const closeUploadModal = () => {
        if (uploading) return;
        setUploadJob(null);
        setUploadFiles([]);
        setUploadStatus(null);
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!uploadFiles || uploadFiles.length === 0) return;

        setUploading(true);
        setUploadStatus(null);

        try {
            await jobsAPI.uploadResumes(uploadJob.id, uploadFiles);
            setUploadStatus({ type: 'success', message: `Successfully uploaded ${uploadFiles.length} resume(s)! Processing in background.` });
            setUploadFiles([]);
            fetchData();
            setTimeout(closeUploadModal, 2000);
        } catch (error) {
            setUploadStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to upload resumes.' });
        } finally {
            setUploading(false);
        }
    };

    const activeJobs = jobs.filter(job => job.is_active);

    const stats = [
        {
            title: 'Total Jobs',
            value: jobs.length,
            icon: <Briefcase size={28} />,
            color: 'primary',
        },
        {
            title: 'Active Positions',
            value: activeJobs.length,
            icon: <TrendingUp size={28} />,
            color: 'success',
        },
        {
            title: 'Total Candidates',
            value: resumeCount,
            icon: <Users size={28} />,
            color: 'warning',
        },
    ];

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-main">
                <div className="dashboard-page">
                    <div className="container">
                        <div className="dashboard-header">
                            <div>
                                <h1>Dashboard</h1>
                                <p>Welcome back! Here's an overview of your recruitment pipeline</p>
                            </div>
                            <button
                                className="btn-create"
                                onClick={() => navigate('/jobs/create')}
                            >
                                <Plus size={20} />
                                <span>Create New Job</span>
                            </button>
                        </div>

                        {/* ── New-resume alert banner ── */}
                        {newResumeAlert > 0 && (
                            <div className="new-resume-alert">
                                <div className="alert-left">
                                    <Bell size={20} className="alert-bell" />
                                    <span>
                                        <strong>{newResumeAlert}</strong> new resume{newResumeAlert > 1 ? 's have' : ' has'} been uploaded since your last visit.
                                    </span>
                                </div>
                                <div className="alert-actions">
                                    <button className="alert-btn-view" onClick={() => navigate('/resumes')}>
                                        View Resumes
                                    </button>
                                    <button className="alert-btn-dismiss" onClick={dismissAlert} title="Dismiss">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="stats-grid">
                            {stats.map((stat, index) => (
                                <div key={index} className="stat-card">
                                    <div className={`stat-icon ${stat.color}`}>{stat.icon}</div>
                                    <div className="stat-content">
                                        <div className="stat-label">{stat.title}</div>
                                        <div className="stat-value">{stat.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="jobs-section">
                        <h2>Recent Jobs</h2>
                        {loading ? (
                            <div className="loading-container">
                                <div className="spinner" />
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="empty-state">
                                <Briefcase size={48} />
                                <h3>No jobs yet</h3>
                                <p>Create your first job to start matching candidates</p>
                                <button
                                    className="btn btn-primary mt-2"
                                    onClick={() => navigate('/jobs/create')}
                                >
                                    <Plus size={18} />
                                    <span>Create Job</span>
                                </button>
                            </div>
                        ) : (
                            <div className="jobs-grid">
                                {jobs.map((job) => (
                                    <div key={job.id} className="job-card">
                                        <div className="job-header">
                                            <h3>{job.title}</h3>
                                            <div className="job-status">
                                                <span className="status-label">Status:</span>
                                                <span className={job.is_active ? 'status-value active' : 'status-value inactive'}>
                                                    {job.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="job-meta">
                                            <span className="badge badge-info">
                                                {job.min_experience}+ years
                                            </span>
                                            <span className="badge badge-success">
                                                {job.skills?.length || 0} skills
                                            </span>
                                        </div>
                                        <div className="job-skills">
                                            {job.skills?.slice(0, 3).map((skill, idx) => (
                                                <span key={idx} className="skill-tag">
                                                    {skill}
                                                </span>
                                            ))}
                                            {job.skills?.length > 3 && (
                                                <span className="skill-tag">+{job.skills.length - 3}</span>
                                            )}
                                        </div>
                                        <div className="job-footer">
                                            <span className="job-date">
                                                Created {new Date(job.created_at).toLocaleDateString()}
                                            </span>
                                            <div className="job-actions">
                                                <button
                                                    className="btn btn-outline btn-sm"
                                                    onClick={() => navigate(`/jobs/${job.id}/candidates`)}
                                                >
                                                    View Candidates
                                                </button>
                                                <button
                                                    className="btn btn-outline btn-sm btn-upload-manual"
                                                    onClick={(e) => { e.stopPropagation(); openUploadModal(job); }}
                                                    title="Add Resumes Manually"
                                                >
                                                    <Upload size={14} />
                                                    Add Resume
                                                </button>
                                                <button
                                                    className={`btn btn-sm ${job.is_active ? 'btn-danger' : 'btn-success'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleStatus(job.id, !job.is_active);
                                                    }}
                                                    title={job.is_active ? 'Mark as Filled' : 'Reopen Position'}
                                                >
                                                    {job.is_active ? 'Mark as Filled' : 'Reopen'}
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-edit-skills"
                                                    onClick={(e) => { e.stopPropagation(); openEditModal(job); }}
                                                    title="Edit Skills"
                                                >
                                                    <Pencil size={14} />
                                                    Edit Skills
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-delete-job"
                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(job.id); }}
                                                    title="Delete Job"
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── EDIT SKILLS MODAL ── */}
            {editingJob && (
                <div className="modal-overlay" onClick={closeEditModal}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit Skills — {editingJob.title}</h3>
                            <button className="modal-close" onClick={closeEditModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="edit-skills-tags">
                                {editSkills.map((skill, idx) => (
                                    <span key={idx} className="edit-skill-tag">
                                        {skill}
                                        <button onClick={() => removeEditSkill(skill)}>
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                {editSkills.length === 0 && (
                                    <span className="no-skills-hint">No skills added yet</span>
                                )}
                            </div>

                            <div className="edit-skill-input-row">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Type a skill and press Enter"
                                    value={newSkill}
                                    onChange={e => setNewSkill(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEditSkill())}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={addEditSkill}
                                >
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={closeEditModal}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveSkills}
                                disabled={editLoading}
                            >
                                {editLoading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELETE CONFIRM MODAL ── */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal-box modal-box-sm" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Delete Job</h3>
                            <button className="modal-close" onClick={() => setDeleteConfirm(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete this job? This action <strong>cannot be undone</strong>.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => handleDeleteJob(deleteConfirm)}
                            >
                                <Trash2 size={14} /> Delete Job
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── UPLOAD RESUME MODAL ── */}
            {uploadJob && (
                <div className="modal-overlay" onClick={closeUploadModal}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add Resumes — {uploadJob.title}</h3>
                            <button className="modal-close" onClick={closeUploadModal} disabled={uploading}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleFileUpload}>
                            <div className="modal-body">
                                <p className="upload-hint">Upload PDF or DOCX resumes directly to this job pool.</p>

                                <div className="file-input-container">
                                    <label className="file-drop-zone">
                                        <Upload size={32} />
                                        <span>Click to browse or drag files here</span>
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.docx"
                                            onChange={(e) => setUploadFiles(e.target.files)}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                </div>

                                {uploadFiles.length > 0 && (
                                    <div className="selected-files">
                                        <h4>Selected Files ({uploadFiles.length})</h4>
                                        <ul>
                                            {Array.from(uploadFiles).map((file, idx) => (
                                                <li key={idx}>
                                                    <Briefcase size={14} />
                                                    <span>{file.name}</span>
                                                    <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {uploadStatus && (
                                    <div className={`upload-status ${uploadStatus.type}`}>
                                        {uploadStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                        <span>{uploadStatus.message}</span>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={closeUploadModal} disabled={uploading}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={uploading || Array.from(uploadFiles).length === 0}
                                >
                                    {uploading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : 'Upload Resumes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
