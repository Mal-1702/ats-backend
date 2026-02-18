import { useState, useEffect } from 'react';
import { resumesAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { Trash2, FileText, AlertCircle, Download, Eye } from 'lucide-react';
import './ResumeList.css';

const ResumeList = () => {
    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchResumes();
    }, []);

    const fetchResumes = async () => {
        try {
            const response = await resumesAPI.getAll();
            setResumes(response.data);
        } catch (error) {
            console.error('Failed to fetch resumes:', error);
            setError('Failed to load resumes');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (resumeId, filename) => {
        console.log('Delete clicked:', resumeId, filename);
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
        console.log('Download clicked:', resumeId, filename);
        try {
            const response = await resumesAPI.downloadResume(resumeId);
            console.log('Download response:', response);
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
            setError(`Failed to download resume: ${error.response?.data?.detail || 'Unknown error'}`);
        }
    };

    const handleView = async (resumeId) => {
        console.log('View clicked:', resumeId);
        try {
            const response = await resumesAPI.viewResume(resumeId);
            console.log('View response:', response);
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            // Clean up after a delay to ensure the window opens
            setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } catch (error) {
            console.error('View error:', error);
            setError(`Failed to view resume: ${error.response?.data?.detail || 'Unknown error'}`);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-layout">
                <Sidebar />
                <div className="dashboard-main">
                    <div className="container">
                        <div className="spinner-large"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-main">
                <div className="resume-list-page">
                    <div className="container">
                        <div className="resume-list-header">
                            <h1>Uploaded Resumes</h1>
                            <p className="subtitle">{resumes.length} total</p>
                        </div>

                        {error && (
                            <div className="alert alert-error">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        {resumes.length === 0 ? (
                            <div className="empty-state">
                                <FileText size={64} />
                                <h2>No resumes uploaded yet</h2>
                                <p>Upload your first resume to get started</p>
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
                                                    {resume.experience_years !== null && (
                                                        <span className="resume-exp">
                                                            {resume.experience_years} years exp
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {resume.extracted_skills && resume.extracted_skills.length > 0 && (
                                            <div className="resume-skills">
                                                {resume.extracted_skills.slice(0, 5).map((skill, idx) => (
                                                    <span key={idx} className="skill-tag">{skill}</span>
                                                ))}
                                                {resume.extracted_skills.length > 5 && (
                                                    <span className="skill-more">
                                                        +{resume.extracted_skills.length - 5} more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div className="resume-footer">
                                            <button
                                                className="btn-view"
                                                onClick={() => handleView(resume.id)}
                                                title="View resume"
                                            >
                                                <Eye size={18} />
                                                <span>View</span>
                                            </button>
                                            <button
                                                className="btn-download"
                                                onClick={() => handleDownload(resume.id, resume.filename)}
                                                title="Download resume"
                                            >
                                                <Download size={18} />
                                                <span>Download</span>
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDelete(resume.id, resume.filename)}
                                                title="Delete resume"
                                            >
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

