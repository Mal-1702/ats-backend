import { useState, useEffect, useRef } from 'react';
import { Star, Upload, MessageCircle, Send, CheckCircle, TrendingUp, Lightbulb, FileText, Users } from 'lucide-react';
import { resumeAPI, resumeAnalysisAPI } from '../services/api';
import './ResumeRating.css';

const ResumeRating = () => {
    // Tab management
    const [activeTab, setActiveTab] = useState('existing');

    // Existing resumes tab
    const [resumes, setResumes] = useState([]);
    const [selectedResumes, setSelectedResumes] = useState([]);
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Upload & Chat tab
    const [uploadedFile, setUploadedFile] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [sessionAnalysis, setSessionAnalysis] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        if (activeTab === 'existing') {
            fetchResumes();
        }
    }, [activeTab]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    const fetchResumes = async () => {
        try {
            const response = await resumeAPI.getAll();
            setResumes(response.data || []);
        } catch (error) {
            console.error('Failed to fetch resumes:', error);
            setError('Failed to load resumes');
        }
    };

    const handleResumeSelect = (resumeId) => {
        if (multiSelectMode) {
            setSelectedResumes(prev =>
                prev.includes(resumeId)
                    ? prev.filter(id => id !== resumeId)
                    : [...prev, resumeId]
            );
        } else {
            setSelectedResumes([resumeId]);
        }
    };

    const handleAnalyze = async () => {
        if (selectedResumes.length === 0) {
            setError('Please select at least one resume');
            return;
        }

        setLoading(true);
        setError('');
        try {
            if (multiSelectMode && selectedResumes.length > 1) {
                const response = await resumeAnalysisAPI.analyzeBatch(selectedResumes);
                setAnalysis({ type: 'batch', results: response.data });
            } else {
                const response = await resumeAnalysisAPI.analyzeSingle(selectedResumes[0]);
                setAnalysis({ type: 'single', result: response.data });
            }
        } catch (error) {
            console.error('Analysis error:', error);
            setError(error.response?.data?.detail || 'Failed to analyze resume(s)');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
            setError('Only PDF and DOCX files are supported');
            return;
        }

        setUploadedFile(file);
        setLoading(true);
        setError('');

        try {
            const response = await resumeAnalysisAPI.uploadAndAnalyze(file);
            setSessionId(response.data.session_id);
            setSessionAnalysis(response.data);
            setChatMessages([{
                type: 'ai',
                text: `I've analyzed your resume "${response.data.filename}". Your score is ${response.data.score}/100. Feel free to ask me anything about improving it!`
            }]);
        } catch (error) {
            console.error('Upload error:', error);
            setError(error.response?.data?.detail || 'Failed to upload and analyze resume');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !sessionId) return;

        const userMessage = chatInput.trim();
        setChatMessages(prev => [...prev, { type: 'user', text: userMessage }]);
        setChatInput('');
        setChatLoading(true);

        try {
            const response = await resumeAnalysisAPI.chat(sessionId, userMessage);
            setChatMessages(prev => [...prev, { type: 'ai', text: response.data.response }]);
        } catch (error) {
            console.error('Chat error:', error);
            setChatMessages(prev => [...prev, {
                type: 'ai',
                text: 'Sorry, I encountered an error. Please try again.'
            }]);
        } finally {
            setChatLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'fair';
        return 'poor';
    };

    return (
        <div className="resume-rating-page">
            <div className="rating-header">
                <Star size={32} className="header-icon" />
                <div>
                    <h1>Rate My Resume</h1>
                    <p>Get AI-powered feedback on resume quality, strengths, and areas for improvement</p>
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    <span>{error}</span>
                    <button onClick={() => setError('')}>×</button>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="rating-tabs">
                <button
                    className={`tab-button ${activeTab === 'existing' ? 'active' : ''}`}
                    onClick={() => setActiveTab('existing')}
                >
                    <FileText size={18} />
                    Analyze Existing
                </button>
                <button
                    className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
                    onClick={() => setActiveTab('upload')}
                >
                    <Upload size={18} />
                    Upload & Chat
                </button>
            </div>

            {/* Existing Resumes Tab */}
            {activeTab === 'existing' && (
                <div className="rating-container">
                    <div className="selector-panel">
                        <div className="selector-header">
                            <h2>Select Resume(s)</h2>
                            <label className="multi-select-toggle">
                                <input
                                    type="checkbox"
                                    checked={multiSelectMode}
                                    onChange={(e) => {
                                        setMultiSelectMode(e.target.checked);
                                        if (!e.target.checked) setSelectedResumes(prev => prev.slice(0, 1));
                                    }}
                                />
                                <span>Multi-select</span>
                            </label>
                        </div>

                        <div className="resume-list">
                            {resumes.map((resume) => (
                                <div
                                    key={resume.id}
                                    className={`resume-card ${selectedResumes.includes(resume.id) ? 'selected' : ''}`}
                                    onClick={() => handleResumeSelect(resume.id)}
                                >
                                    {multiSelectMode && (
                                        <input
                                            type="checkbox"
                                            checked={selectedResumes.includes(resume.id)}
                                            readOnly
                                        />
                                    )}
                                    <FileText size={20} />
                                    <div className="resume-info">
                                        <strong>{resume.filename}</strong>
                                        <span>{new Date(resume.uploaded_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            className="analyze-button"
                            onClick={handleAnalyze}
                            disabled={loading || selectedResumes.length === 0}
                        >
                            <Star size={18} />
                            Analyze {selectedResumes.length} Resume{selectedResumes.length !== 1 ? 's' : ''}
                        </button>
                    </div>

                    <div className="analysis-panel">
                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner" />
                                <p>Analyzing resume(s)...</p>
                            </div>
                        ) : analysis ? (
                            analysis.type === 'single' ? (
                                <SingleAnalysisView result={analysis.result} getScoreColor={getScoreColor} />
                            ) : (
                                <BatchAnalysisView results={analysis.results} getScoreColor={getScoreColor} />
                            )
                        ) : (
                            <div className="placeholder-state">
                                <Star size={64} />
                                <h2>Select a resume to analyze</h2>
                                <p>Get detailed AI-powered feedback on resume quality, strengths, and areas for improvement</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Upload & Chat Tab */}
            {activeTab === 'upload' && (
                <div className="upload-chat-container">
                    {!sessionId ? (
                        <div className="upload-section">
                            <div className="upload-card">
                                <Upload size={48} />
                                <h2>Upload Your Resume</h2>
                                <p>Upload a PDF or DOCX file to get instant AI analysis and chat about improvements</p>
                                <label className="upload-button">
                                    <input
                                        type="file"
                                        accept=".pdf,.docx"
                                        onChange={handleFileUpload}
                                        disabled={loading}
                                    />
                                    <Upload size={20} />
                                    {loading ? 'Analyzing...' : 'Choose File'}
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="chat-interface">
                            <div className="chat-sidebar">
                                <div className="session-info">
                                    <FileText size={24} />
                                    <div>
                                        <strong>{sessionAnalysis?.filename}</strong>
                                        <span>Active Session</span>
                                    </div>
                                </div>

                                <div className={`session-score ${getScoreColor(sessionAnalysis?.score)}`}>
                                    <div className="score-value">{sessionAnalysis?.score}</div>
                                    <div className="score-label">/ 100</div>
                                </div>

                                <div className="quick-stats">
                                    <div className="stat">
                                        <CheckCircle size={16} />
                                        <span>{sessionAnalysis?.strengths.length || 0} Strengths</span>
                                    </div>
                                    <div className="stat">
                                        <TrendingUp size={16} />
                                        <span>{sessionAnalysis?.improvements.length || 0} Improvements</span>
                                    </div>
                                </div>

                                <button
                                    className="new-upload-button"
                                    onClick={() => {
                                        setSessionId(null);
                                        setSessionAnalysis(null);
                                        setChatMessages([]);
                                        setUploadedFile(null);
                                    }}
                                >
                                    Upload New Resume
                                </button>
                            </div>

                            <div className="chat-main">
                                <div className="chat-messages">
                                    {chatMessages.map((msg, idx) => (
                                        <div key={idx} className={`chat-message ${msg.type}`}>
                                            {msg.type === 'ai' && <MessageCircle size={20} />}
                                            <div className="message-content">{msg.text}</div>
                                        </div>
                                    ))}
                                    {chatLoading && (
                                        <div className="chat-message ai loading">
                                            <MessageCircle size={20} />
                                            <div className="typing-indicator">
                                                <span></span><span></span><span></span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                <div className="chat-input-container">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && !chatLoading && handleSendMessage()}
                                        placeholder="Ask about your resume... (e.g., 'How can I improve my score?')"
                                        disabled={chatLoading}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!chatInput.trim() || chatLoading}
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Single resume analysis view component
const SingleAnalysisView = ({ result, getScoreColor }) => (
    <div className="single-analysis">
        <div className="analysis-header">
            <h2>{result.filename}</h2>
        </div>

        <div className="score-section">
            <div className={`score-circle ${getScoreColor(result.score)}`}>
                <div className="score-value">{result.score}</div>
                <div className="score-label">/ 100</div>
            </div>
            <p className="score-summary">{result.summary}</p>
        </div>

        <div className="analysis-section">
            <h3><CheckCircle size={20} /> Key Strengths</h3>
            <ul className="strengths-list">
                {result.strengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                ))}
            </ul>
        </div>

        <div className="analysis-section">
            <h3><TrendingUp size={20} /> Areas to Improve</h3>
            <ul className="improvements-list">
                {result.improvements.map((improvement, idx) => (
                    <li key={idx}>{improvement}</li>
                ))}
            </ul>
        </div>

        <div className="analysis-section">
            <h3><Lightbulb size={20} /> Actionable Tips</h3>
            <ul className="suggestions-list">
                {result.suggestions.map((suggestion, idx) => (
                    <li key={idx}>{suggestion}</li>
                ))}
            </ul>
        </div>
    </div>
);

// Batch analysis view component
const BatchAnalysisView = ({ results, getScoreColor }) => (
    <div className="batch-analysis">
        <div className="batch-header">
            <Users size={24} />
            <div>
                <h2>Batch Analysis Results</h2>
                <p>{results.length} resume{results.length !== 1 ? 's' : ''} analyzed</p>
            </div>
        </div>

        <div className="comparison-table">
            {results.map((result, idx) => (
                <div key={idx} className="comparison-row">
                    <div className="row-filename">{result.filename}</div>
                    <div className={`row-score ${getScoreColor(result.score)}`}>
                        {result.score}/100
                    </div>
                    <div className="row-highlight">
                        <strong>Top Strength:</strong> {result.strengths[0] || 'N/A'}
                    </div>
                    <div className="row-issue">
                        <strong>Main Issue:</strong> {result.improvements[0] || 'N/A'}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default ResumeRating;
