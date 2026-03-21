import { useState, useEffect, useRef } from 'react';
import { Star, Upload, MessageCircle, Send, CheckCircle, TrendingUp, Lightbulb, FileText, Users, Search, X } from 'lucide-react';
import { resumesAPI, resumeAnalysisAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import Sidebar from '../components/Sidebar';
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
    const [resumeSearch, setResumeSearch] = useState('');
    const [hoveredResumeItem, setHoveredResumeItem] = useState(null);

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
            const response = await resumesAPI.getAll();
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

        const aiMessageId = Date.now();
        setChatMessages(prev => [...prev, { id: aiMessageId, type: 'ai', text: '', isStreaming: true }]);

        setChatInput('');
        setChatLoading(true);

        try {
            let fullText = '';
            await resumeAnalysisAPI.chatStream(
                sessionId,
                userMessage,
                (token) => {
                    fullText += token;
                    setChatMessages(prev => prev.map(msg =>
                        msg.id === aiMessageId ? { ...msg, text: fullText } : msg
                    ));
                },
                (error) => {
                    console.error('Streaming error:', error);
                    setChatMessages(prev => prev.map(msg =>
                        msg.id === aiMessageId ? { ...msg, text: fullText + '\n\n**[Error during streaming]**', isStreaming: false } : msg
                    ));
                },
                () => {
                    setChatMessages(prev => prev.map(msg =>
                        msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
                    ));
                    setChatLoading(false);
                }
            );
        } catch (error) {
            console.error('Chat error:', error);
            setChatMessages(prev => [...prev.filter(m => m.id !== aiMessageId), {
                type: 'ai',
                text: 'Sorry, I encountered an error. Please try again.'
            }]);
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
        <div className="flex min-h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
            <Sidebar />
            <div className="flex-1 min-w-0 overflow-auto custom-scrollbar relative">
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
                        <div className="flex gap-6 h-[calc(100vh-220px)]">
                            {/* ── LEFT: Selector Panel ──────────────────── */}
                            <div className="w-[380px] shrink-0 flex flex-col bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden">
                                {/* Header */}
                                <div className="p-6 pb-4 border-b border-slate-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-black text-white tracking-tight">Select Resume(s)</h2>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-3.5 h-3.5 accent-blue-500 cursor-pointer rounded"
                                                checked={multiSelectMode}
                                                onChange={(e) => {
                                                    setMultiSelectMode(e.target.checked);
                                                    if (!e.target.checked) setSelectedResumes(prev => prev.slice(0, 1));
                                                }}
                                            />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Multi-select</span>
                                        </label>
                                    </div>
                                    {/* Search Bar */}
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Search resumes..."
                                            value={resumeSearch}
                                            onChange={(e) => setResumeSearch(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-8 py-2.5 text-xs text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                                        />
                                        {resumeSearch && (
                                            <button onClick={() => setResumeSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Scrollable Resume List */}
                                <div className="flex-1 overflow-auto custom-scrollbar p-4 space-y-2">
                                    {resumes
                                        .filter(r => r.filename.toLowerCase().includes(resumeSearch.toLowerCase()))
                                        .map((resume) => {
                                            const isHovered = hoveredResumeItem === resume.id;
                                            const isSelected = selectedResumes.includes(resume.id);
                                            return (
                                                <div
                                                    key={resume.id}
                                                    className="relative"
                                                    onMouseEnter={() => setHoveredResumeItem(resume.id)}
                                                    onMouseLeave={() => setHoveredResumeItem(null)}
                                                    onClick={() => handleResumeSelect(resume.id)}
                                                >
                                                    <div
                                                        className={`relative overflow-hidden border cursor-pointer transition-all duration-300 ease-in-out ${
                                                            isHovered
                                                                ? 'h-[80px] border-blue-500 shadow-lg shadow-blue-500/20 bg-blue-500/5'
                                                                : isSelected
                                                                    ? 'h-[64px] border-blue-500/30 bg-blue-600/5'
                                                                    : 'h-[64px] border-slate-800 bg-slate-950/60 hover:border-blue-500/50'
                                                        }`}
                                                    >
                                                        {/* Corner brackets */}
                                                        {isHovered && (
                                                            <>
                                                                <div className="absolute top-2 left-2 w-5 h-5 pointer-events-none">
                                                                    <div className="absolute top-0 left-0 w-3 h-0.5 bg-blue-500" />
                                                                    <div className="absolute top-0 left-0 w-0.5 h-3 bg-blue-500" />
                                                                </div>
                                                                <div className="absolute bottom-2 right-2 w-5 h-5 pointer-events-none">
                                                                    <div className="absolute bottom-0 right-0 w-3 h-0.5 bg-blue-500" />
                                                                    <div className="absolute bottom-0 right-0 w-0.5 h-3 bg-blue-500" />
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* Content */}
                                                        <div className="flex items-center gap-3 h-full px-4">
                                                            {multiSelectMode && (
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-3.5 h-3.5 accent-blue-500 cursor-pointer shrink-0 rounded"
                                                                    checked={isSelected}
                                                                    readOnly
                                                                />
                                                            )}
                                                            <div className={`size-9 shrink-0 rounded-lg flex items-center justify-center border transition-colors ${
                                                                isHovered ? 'bg-blue-500/20 border-blue-500/40' : 'bg-blue-600/10 border-blue-500/20'
                                                            }`}>
                                                                <FileText size={16} className="text-blue-400" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className={`font-bold truncate transition-colors duration-300 ${
                                                                    isHovered ? 'text-sm text-blue-400' : isSelected ? 'text-xs text-blue-300' : 'text-xs text-white'
                                                                }`}>
                                                                    {resume.filename}
                                                                </h3>
                                                                <span className={`text-[10px] font-medium transition-colors duration-300 ${
                                                                    isHovered ? 'text-slate-300' : 'text-slate-500'
                                                                }`}>
                                                                    {new Date(resume.uploaded_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                    {resumes.filter(r => r.filename.toLowerCase().includes(resumeSearch.toLowerCase())).length === 0 && (
                                        <div className="text-center py-10">
                                            <p className="text-xs text-slate-600 font-bold">No resumes match your search</p>
                                        </div>
                                    )}
                                </div>

                                {/* Sticky Analyze Button */}
                                <div className="p-4 pt-3 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
                                    <button
                                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20"
                                        onClick={handleAnalyze}
                                        disabled={loading || selectedResumes.length === 0}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                <Star size={16} />
                                                Analyze {selectedResumes.length} Resume{selectedResumes.length !== 1 ? 's' : ''}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* ── RIGHT: Analysis Panel ──────────────────── */}
                            <div className="flex-1 min-w-0 overflow-auto custom-scrollbar bg-slate-900/20 border border-slate-800/50 rounded-[2rem] p-8">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <div className="h-10 w-10 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mb-4" />
                                        <p className="text-xs text-slate-500 font-bold">Analyzing resume(s)...</p>
                                    </div>
                                ) : analysis ? (
                                    analysis.type === 'single' ? (
                                        <SingleAnalysisView result={analysis.result} getScoreColor={getScoreColor} />
                                    ) : (
                                        <BatchAnalysisView results={analysis.results} getScoreColor={getScoreColor} />
                                    )
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <div className="size-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                                            <Star size={28} className="text-slate-700" />
                                        </div>
                                        <h2 className="text-lg font-black text-white mb-1">Select a resume to analyze</h2>
                                        <p className="text-xs text-slate-500 font-medium max-w-sm">Get detailed AI-powered feedback on resume quality, strengths, and areas for improvement</p>
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
                                                    <div className="message-header">
                                                        {msg.type === 'user' ? 'You' : 'AI Assistant'}
                                                    </div>
                                                    <div className="message-text">
                                                        <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                                                            {msg.text}
                                                        </ReactMarkdown>
                                                        {msg.isStreaming && <span className="streaming-cursor" />}
                                                    </div>
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
            </div>
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


