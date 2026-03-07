import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import './ResumeUpload.css';

const ResumeUpload = () => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        const validFiles = droppedFiles.filter(
            (file) =>
                (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') &&
                file.size <= 10 * 1024 * 1024
        );

        if (validFiles.length !== droppedFiles.length) {
            setError('Some files were rejected. Only PDF and DOCX files under 10MB are allowed.');
        }

        setFiles((prev) => [...prev, ...validFiles]);
    }, []);

    const handleFileInput = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles((prev) => [...prev, ...selectedFiles]);
        setError('');
    };

    const removeFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setError('');

        const results = [];
        const errors = [];

        for (const file of files) {
            try {
                const response = await uploadAPI.uploadResume(file);
                results.push(response.data);
            } catch (err) {
                errors.push(`${file.name}: ${err.response?.data?.detail || 'Upload failed'}`);
            }
        }

        setUploading(false);

        if (errors.length > 0) {
            setError(errors.join('; '));
        }

        if (results.length > 0) {
            setUploadResult({
                count: results.length,
                files: results,
            });
            setTimeout(() => {
                setFiles([]);
            }, 1000);
        }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-main">
                <div className="upload-page-wrapper">
                    <div className="container upload-container">
                        <div className="upload-header">
                            <Upload size={32} />
                            <h1>Upload Resume</h1>
                            <p>Upload candidate resumes for AI-powered analysis</p>
                        </div>

                        <div className="upload-card">
                            {!uploadResult ? (
                                <>
                                    <div
                                        className={`drop-zone ${dragActive ? 'drag-over' : ''}`}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="dropzone-content">
                                            <div className="upload-icon">
                                                <FileText size={48} />
                                            </div>
                                            <h3>Drag & drop your resume(s) here</h3>
                                            <p>or</p>
                                            <button
                                                type="button"
                                                className="browse-button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    fileInputRef.current?.click();
                                                }}
                                            >
                                                <Upload size={18} />
                                                <span>Browse Files</span>
                                            </button>
                                            <input
                                                id="file-input"
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".pdf,.docx"
                                                multiple
                                                onChange={handleFileInput}
                                                style={{ display: 'none' }}
                                            />
                                            <p className="file-info">Supported formats: PDF, DOCX (Max 10MB each)</p>
                                        </div>
                                    </div>

                                    {files.length > 0 && (
                                        <div className="file-list">
                                            <div className="file-list-header">
                                                <h3>Selected Files</h3>
                                                <span className="file-count">{files.length} file(s)</span>
                                            </div>
                                            {files.map((file, index) => (
                                                <div key={index} className="file-item">
                                                    <div className="file-info">
                                                        <div className="file-icon">
                                                            <FileText size={24} />
                                                        </div>
                                                        <div className="file-details">
                                                            <div className="file-name">{file.name}</div>
                                                            <div className="file-size">
                                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="remove-file"
                                                        onClick={() => removeFile(index)}
                                                        title="Remove file"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                className="btn-upload"
                                                onClick={handleUpload}
                                                disabled={uploading}
                                            >
                                                {uploading ? (
                                                    <div className="spinner" style={{ width: '20px', height: '20px' }} />
                                                ) : (
                                                    <>
                                                        <Upload size={18} />
                                                        <span>Upload {files.length} Resume(s)</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="alert alert-error">
                                            <AlertCircle size={20} />
                                            <span>{error}</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="success-screen">
                                    <div className="success-icon">
                                        <CheckCircle size={64} />
                                    </div>
                                    <h2>{uploadResult.count} Resume(s) Uploaded Successfully!</h2>
                                    <p>The resumes are being processed by our AI agents.</p>

                                    <div className="result-details">
                                        {uploadResult.files.slice(0, 3).map((result, index) => (
                                            <div key={index} className="result-item">
                                                <span className="label">{result.filename}</span>
                                                <span className="badge badge-success">{result.status}</span>
                                            </div>
                                        ))}
                                        {uploadResult.count > 3 && (
                                            <div className="result-item">
                                                <span className="label">+ {uploadResult.count - 3} more...</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="success-actions">
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => {
                                                setUploadResult(null);
                                                setFiles([]);
                                            }}
                                        >
                                            Upload More
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => navigate('/dashboard')}
                                        >
                                            Go to Dashboard
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumeUpload;
