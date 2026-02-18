import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI, resumesAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { Briefcase, Users, TrendingUp, Plus } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
    const [jobs, setJobs] = useState([]);
    const [resumeCount, setResumeCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
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

    const handleToggleStatus = async (jobId, newStatus) => {
        try {
            await jobsAPI.toggleStatus(jobId, newStatus);
            fetchData(); // Refresh data
        } catch (error) {
            console.error('Failed to toggle job status:', error);
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
                                        <div
                                            key={job.id}
                                            className="job-card"
                                        >
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
                                                        className={`btn btn-sm ${job.is_active ? 'btn-danger' : 'btn-success'}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleStatus(job.id, !job.is_active);
                                                        }}
                                                        title={job.is_active ? 'Mark as Filled' : 'Reopen Position'}
                                                    >
                                                        {job.is_active ? 'Mark as Filled' : 'Reopen'}
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
            </div>
        </div>
    );
};

export default Dashboard;
