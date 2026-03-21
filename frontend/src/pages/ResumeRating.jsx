import { useState, useEffect, useRef, useCallback } from 'react';
import { Star, Upload, Send, CheckCircle, TrendingUp, Lightbulb, FileText, Search, X, Paperclip, FolderOpen, Sparkles, HelpCircle, Users, Layers, MessageCircle } from 'lucide-react';
import { resumesAPI, resumeAnalysisAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import Sidebar from '../components/Sidebar';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────
//  Auto-resize textarea hook
// ─────────────────────────────────────────────────────────
function useAutoResizeTextarea({ minHeight, maxHeight }) {
    const textareaRef = useRef(null);
    const adjustHeight = useCallback((reset) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        if (reset) { textarea.style.height = `${minHeight}px`; return; }
        textarea.style.height = `${minHeight}px`;
        const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Infinity));
        textarea.style.height = `${newHeight}px`;
    }, [minHeight, maxHeight]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) textarea.style.height = `${minHeight}px`;
    }, [minHeight]);

    return { textareaRef, adjustHeight };
}

// ─────────────────────────────────────────────────────────
//  Score color utility
// ─────────────────────────────────────────────────────────
const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
    if (score >= 40) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10';
};

const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
};

// ─────────────────────────────────────────────────────────
//  Analysis Card (renders inside chat for single result)
// ─────────────────────────────────────────────────────────
const SingleAnalysisCard = ({ result }) => (
    <div className="space-y-5">
        {/* Score */}
        <div className="flex items-center gap-5">
            <div className={`size-20 rounded-2xl border-2 flex flex-col items-center justify-center ${getScoreColor(result.score)}`}>
                <span className="text-2xl font-black leading-none">{result.score}</span>
                <span className="text-[9px] font-bold opacity-60">/ 100</span>
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-white truncate mb-1">{result.filename}</h3>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getScoreColor(result.score)}`}>
                    {getScoreLabel(result.score)}
                </span>
                {result.summary && <p className="text-xs text-slate-400 mt-2 leading-relaxed">{result.summary}</p>}
            </div>
        </div>
        {/* Strengths */}
        {result.strengths?.length > 0 && (
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider">Key Strengths</span>
                </div>
                <ul className="space-y-1.5">
                    {result.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-slate-400 pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-emerald-400">{s}</li>
                    ))}
                </ul>
            </div>
        )}
        {/* Improvements */}
        {result.improvements?.length > 0 && (
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-amber-400" />
                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider">Areas to Improve</span>
                </div>
                <ul className="space-y-1.5">
                    {result.improvements.map((s, i) => (
                        <li key={i} className="text-xs text-slate-400 pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-amber-400">{s}</li>
                    ))}
                </ul>
            </div>
        )}
        {/* Suggestions */}
        {result.suggestions?.length > 0 && (
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={14} className="text-blue-400" />
                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider">Actionable Tips</span>
                </div>
                <ul className="space-y-1.5">
                    {result.suggestions.map((s, i) => (
                        <li key={i} className="text-xs text-slate-400 pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-blue-400">{s}</li>
                    ))}
                </ul>
            </div>
        )}
    </div>
);

// ─────────────────────────────────────────────────────────
//  Batch Analysis Card (renders for multi-select)
// ─────────────────────────────────────────────────────────
const BatchAnalysisCard = ({ results }) => (
    <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-blue-400" />
            <span className="text-sm font-black text-white">Batch Analysis — {results.length} Resumes</span>
        </div>
        {results.map((result, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate flex-1 mr-3">{result.filename}</span>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${getScoreColor(result.score)}`}>
                        {result.score}/100
                    </span>
                </div>
                <div className="text-[11px] text-slate-500">
                    <span className="text-emerald-400 font-semibold">Strength:</span> {result.strengths?.[0] || 'N/A'}
                </div>
                <div className="text-[11px] text-slate-500">
                    <span className="text-amber-400 font-semibold">Improve:</span> {result.improvements?.[0] || 'N/A'}
                </div>
            </div>
        ))}
    </div>
);

// ─────────────────────────────────────────────────────────
//  Typing dots animation
// ─────────────────────────────────────────────────────────
const TypingDots = () => (
    <div className="flex items-center ml-1">
        {[1, 2, 3].map((dot) => (
            <motion.div
                key={dot}
                className="w-1.5 h-1.5 bg-blue-400 rounded-full mx-0.5"
                animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.85, 1.1, 0.85] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.15, ease: 'easeInOut' }}
            />
        ))}
    </div>
);

// ─────────────────────────────────────────────────────────
//  Resume Picker Modal
// ─────────────────────────────────────────────────────────
const ResumePicker = ({ resumes, multiSelect, onConfirm, onClose }) => {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState([]);
    const [hovered, setHovered] = useState(null);

    const filtered = resumes.filter(r => r.filename.toLowerCase().includes(search.toLowerCase()));

    const toggleSelect = (id) => {
        if (multiSelect) {
            setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        } else {
            setSelected([id]);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}>
            <motion.div
                className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25 }}
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-black text-white tracking-tight">
                            {multiSelect ? 'Select Resumes (Multi)' : 'Select a Resume'}
                        </h2>
                        <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search resumes..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-8 py-2.5 text-xs text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="max-h-[400px] overflow-auto custom-scrollbar p-4 space-y-2">
                    {filtered.map((resume) => {
                        const isHov = hovered === resume.id;
                        const isSel = selected.includes(resume.id);
                        return (
                            <div
                                key={resume.id}
                                className="relative"
                                onMouseEnter={() => setHovered(resume.id)}
                                onMouseLeave={() => setHovered(null)}
                                onClick={() => toggleSelect(resume.id)}
                            >
                                <div className={`relative overflow-hidden border cursor-pointer transition-all duration-300 ease-in-out ${
                                    isHov ? 'h-[76px] border-blue-500 shadow-lg shadow-blue-500/20 bg-blue-500/5'
                                    : isSel ? 'h-[60px] border-blue-500/30 bg-blue-600/5'
                                    : 'h-[60px] border-slate-800 bg-slate-950/60 hover:border-blue-500/50'
                                }`}>
                                    {isHov && (
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
                                    <div className="flex items-center gap-3 h-full px-4">
                                        {multiSelect && (
                                            <input type="checkbox" className="w-3.5 h-3.5 accent-blue-500 cursor-pointer shrink-0 rounded" checked={isSel} readOnly />
                                        )}
                                        <div className={`size-8 shrink-0 rounded-lg flex items-center justify-center border transition-colors ${
                                            isHov ? 'bg-blue-500/20 border-blue-500/40' : 'bg-blue-600/10 border-blue-500/20'
                                        }`}>
                                            <FileText size={14} className="text-blue-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className={`font-bold truncate transition-colors duration-300 ${
                                                isHov ? 'text-sm text-blue-400' : isSel ? 'text-xs text-blue-300' : 'text-xs text-white'
                                            }`}>{resume.filename}</h3>
                                            <span className={`text-[10px] font-medium transition-colors duration-300 ${isHov ? 'text-slate-300' : 'text-slate-500'}`}>
                                                {new Date(resume.uploaded_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {isSel && !multiSelect && (
                                            <CheckCircle size={16} className="text-blue-400 shrink-0" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-xs text-slate-600 font-bold">No resumes found</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/80">
                    <button
                        onClick={() => selected.length > 0 && onConfirm(selected)}
                        disabled={selected.length === 0}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black transition-all active:scale-[0.98] disabled:opacity-30 bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20"
                    >
                        <Star size={16} />
                        Analyze {selected.length} Resume{selected.length !== 1 ? 's' : ''}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};


// ═════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════
const ResumeRating = () => {
    // ── State ────────────────────────────────────────────
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Session (for upload-based chat)
    const [sessionId, setSessionId] = useState(null);

    // Resumes from DB
    const [resumes, setResumes] = useState([]);

    // Command palette
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState(-1);

    // Resume picker modal
    const [showPicker, setShowPicker] = useState(false);
    const [pickerMulti, setPickerMulti] = useState(false);

    // Refs
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const commandPaletteRef = useRef(null);
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 56, maxHeight: 200 });

    // ── Commands ─────────────────────────────────────────
    const commands = [
        { icon: <FileText className="w-4 h-4" />, label: 'Analyze Resume', description: 'Select from your database', prefix: '/analyze' },
        { icon: <Upload className="w-4 h-4" />, label: 'Upload Resume', description: 'Upload from your device', prefix: '/upload' },
        { icon: <Layers className="w-4 h-4" />, label: 'Batch Analyze', description: 'Compare multiple resumes', prefix: '/batch' },
        { icon: <HelpCircle className="w-4 h-4" />, label: 'Help', description: 'Show available commands', prefix: '/help' },
    ];

    // ── Effects ──────────────────────────────────────────
    useEffect(() => {
        fetchResumes();
    }, []);

    useEffect(() => {
        if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (inputValue.startsWith('/') && !inputValue.includes(' ')) {
            setShowCommandPalette(true);
            const idx = commands.findIndex(c => c.prefix.startsWith(inputValue));
            setActiveSuggestion(idx >= 0 ? idx : -1);
        } else {
            setShowCommandPalette(false);
        }
    }, [inputValue]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            const target = e.target;
            const cmdBtn = document.querySelector('[data-command-button]');
            if (commandPaletteRef.current && !commandPaletteRef.current.contains(target) && !cmdBtn?.contains(target)) {
                setShowCommandPalette(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Fetch resumes ────────────────────────────────────
    const fetchResumes = async () => {
        try {
            const response = await resumesAPI.getAll();
            setResumes(response.data || []);
        } catch (err) {
            console.error('Failed to fetch resumes:', err);
        }
    };

    // ── Handle commands ──────────────────────────────────
    const executeCommand = (command) => {
        setInputValue('');
        setShowCommandPalette(false);
        adjustHeight(true);

        switch (command.prefix) {
            case '/analyze':
                setPickerMulti(false);
                setShowPicker(true);
                break;
            case '/upload':
                fileInputRef.current?.click();
                break;
            case '/batch':
                setPickerMulti(true);
                setShowPicker(true);
                break;
            case '/help':
                setMessages(prev => [...prev, {
                    type: 'ai', text: `Here are the available commands:\n\n` +
                        `• **/analyze** — Select a resume from your database to analyze\n` +
                        `• **/upload** — Upload a resume from your device for analysis + interactive chat\n` +
                        `• **/batch** — Select multiple resumes for comparative analysis\n` +
                        `• **/help** — Show this help message\n\n` +
                        `You can also use the 📎 button to attach a file or the 📁 button to browse your database.`
                }]);
                break;
        }
    };

    // ── File upload (device) ─────────────────────────────
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
            setError('Only PDF and DOCX files are supported');
            return;
        }

        // Show system message
        setMessages(prev => [...prev,
            { type: 'system', text: `📎 Attached: ${file.name}` },
            { type: 'user', text: `Analyze my resume "${file.name}"` }
        ]);

        setLoading(true);
        setError('');

        try {
            const response = await resumeAnalysisAPI.uploadAndAnalyze(file);
            setSessionId(response.data.session_id);

            setMessages(prev => [...prev, {
                type: 'analysis-single',
                result: response.data,
                followUp: `I've analyzed **"${response.data.filename}"** and scored it **${response.data.score}/100**. You can now ask me follow-up questions about this resume — I'll help you improve it! 💬`
            }]);
        } catch (err) {
            console.error('Upload error:', err);
            setMessages(prev => [...prev, {
                type: 'ai',
                text: `❌ Failed to analyze the resume: ${err.response?.data?.detail || 'Unknown error'}. Please try again.`
            }]);
        } finally {
            setLoading(false);
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ── Database resume analysis ─────────────────────────
    const handlePickerConfirm = async (selectedIds) => {
        setShowPicker(false);

        const selectedResumes = resumes.filter(r => selectedIds.includes(r.id));
        const names = selectedResumes.map(r => r.filename).join(', ');

        setMessages(prev => [...prev,
            { type: 'system', text: `📁 Selected from database: ${names}` },
            { type: 'user', text: selectedIds.length > 1 ? `Compare these ${selectedIds.length} resumes` : `Analyze "${names}"` }
        ]);

        setLoading(true);
        setError('');

        try {
            if (selectedIds.length > 1) {
                const response = await resumeAnalysisAPI.analyzeBatch(selectedIds);
                setMessages(prev => [...prev, {
                    type: 'analysis-batch',
                    results: response.data,
                    followUp: `I've analyzed **${response.data.length} resumes** and generated a comparative analysis above.`
                }]);
            } else {
                const response = await resumeAnalysisAPI.analyzeSingle(selectedIds[0]);
                setMessages(prev => [...prev, {
                    type: 'analysis-single',
                    result: response.data,
                    followUp: `I've analyzed **"${response.data.filename}"** from your database.`
                }]);
            }
        } catch (err) {
            console.error('Analysis error:', err);
            setMessages(prev => [...prev, {
                type: 'ai',
                text: `❌ Failed to analyze: ${err.response?.data?.detail || 'Unknown error'}. Please try again.`
            }]);
        } finally {
            setLoading(false);
        }
    };

    // ── Chat message (follow-up questions) ───────────────
    const handleSendMessage = async () => {
        const text = inputValue.trim();
        if (!text) return;

        // Check if it's a command
        if (text.startsWith('/')) {
            const cmd = commands.find(c => text.startsWith(c.prefix));
            if (cmd) { executeCommand(cmd); return; }
        }

        setMessages(prev => [...prev, { type: 'user', text }]);
        setInputValue('');
        adjustHeight(true);

        // If we have a session, use streaming chat
        if (sessionId) {
            const aiMessageId = Date.now();
            setMessages(prev => [...prev, { id: aiMessageId, type: 'ai', text: '', isStreaming: true }]);
            setLoading(true);

            try {
                let fullText = '';
                await resumeAnalysisAPI.chatStream(
                    sessionId,
                    text,
                    (token) => {
                        fullText += token;
                        setMessages(prev => prev.map(msg =>
                            msg.id === aiMessageId ? { ...msg, text: fullText } : msg
                        ));
                    },
                    (error) => {
                        console.error('Streaming error:', error);
                        setMessages(prev => prev.map(msg =>
                            msg.id === aiMessageId ? { ...msg, text: fullText + '\n\n**[Error during streaming]**', isStreaming: false } : msg
                        ));
                    },
                    () => {
                        setMessages(prev => prev.map(msg =>
                            msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
                        ));
                        setLoading(false);
                    }
                );
            } catch (err) {
                console.error('Chat error:', err);
                setMessages(prev => [...prev.filter(m => m.id !== aiMessageId), {
                    type: 'ai',
                    text: 'Sorry, I encountered an error. Please try again.'
                }]);
                setLoading(false);
            }
        } else {
            // No session — guide the user
            setMessages(prev => [...prev, {
                type: 'ai',
                text: `To chat about a resume, please upload one from your device first using the 📎 button or the \`/upload\` command. I'll analyze it and then we can discuss improvements interactively!\n\nFor quick analysis without chat, use \`/analyze\` to pick from your database.`
            }]);
        }
    };

    // ── Keyboard handling ────────────────────────────────
    const handleKeyDown = (e) => {
        if (showCommandPalette) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestion(prev => prev < commands.length - 1 ? prev + 1 : 0);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestion(prev => prev > 0 ? prev - 1 : commands.length - 1);
            } else if (e.key === 'Tab' || (e.key === 'Enter' && activeSuggestion >= 0)) {
                e.preventDefault();
                executeCommand(commands[activeSuggestion]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowCommandPalette(false);
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputValue.trim()) handleSendMessage();
        }
    };

    // ── New chat ─────────────────────────────────────────
    const handleNewChat = () => {
        setMessages([]);
        setSessionId(null);
        setError('');
        setInputValue('');
        adjustHeight(true);
    };

    const hasMessages = messages.length > 0;

    // ═════════════════════════════════════════════════════
    //  RENDER
    // ═════════════════════════════════════════════════════
    return (
        <div className="flex min-h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
            <Sidebar />

            <main className="flex-1 min-w-0 flex flex-col relative overflow-hidden">
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={handleFileUpload}
                />

                {/* Error banner */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            className="mx-8 mt-4 flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {error}
                            <button onClick={() => setError('')} className="ml-auto p-1 hover:text-white"><X size={14} /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Chat Area ────────────────────────────── */}
                <div className="flex-1 overflow-auto custom-scrollbar flex flex-col">
                    {!hasMessages ? (
                        /* ── WELCOME STATE ──────────────────── */
                        <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
                            {/* Background glows */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-[128px] animate-pulse" />
                                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px] animate-pulse delay-700" />
                            </div>

                            <motion.div
                                className="text-center space-y-3 relative z-10"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2, duration: 0.5 }}
                                >
                                    <div className="mx-auto size-16 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/10">
                                        <Sparkles size={28} className="text-blue-400" />
                                    </div>
                                    <h1 className="text-3xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/40 pb-1">
                                        Rate My Resume
                                    </h1>
                                    <motion.div
                                        className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto max-w-xs"
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: '100%', opacity: 1 }}
                                        transition={{ delay: 0.5, duration: 0.8 }}
                                    />
                                </motion.div>
                                <motion.p
                                    className="text-sm text-white/40"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    Upload a resume or select from your database for AI-powered analysis
                                </motion.p>
                            </motion.div>

                            {/* Quick action buttons */}
                            <motion.div
                                className="flex flex-wrap items-center justify-center gap-2 mt-8 relative z-10"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                {commands.map((cmd, index) => (
                                    <motion.button
                                        key={cmd.prefix}
                                        onClick={() => executeCommand(cmd)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.06] rounded-xl text-xs text-white/50 hover:text-white/90 transition-all border border-white/[0.05] hover:border-white/[0.1]"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.7 + index * 0.08 }}
                                        whileHover={{ scale: 1.02, y: -1 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {cmd.icon}
                                        <span>{cmd.label}</span>
                                    </motion.button>
                                ))}
                            </motion.div>
                        </div>
                    ) : (
                        /* ── MESSAGES ───────────────────────── */
                        <div className="flex-1 px-6 lg:px-8 py-6">
                            <div className="max-w-3xl mx-auto space-y-5">
                                {/* New Chat button */}
                                <div className="flex justify-end mb-2">
                                    <button
                                        onClick={handleNewChat}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-500 border border-slate-800 rounded-lg hover:text-white hover:border-slate-700 transition-all"
                                    >
                                        <Sparkles size={12} /> New Analysis
                                    </button>
                                </div>

                                {messages.map((msg, idx) => {
                                    if (msg.type === 'system') {
                                        return (
                                            <motion.div
                                                key={idx}
                                                className="text-center"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                            >
                                                <span className="text-[10px] font-bold text-slate-600 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                                                    {msg.text}
                                                </span>
                                            </motion.div>
                                        );
                                    }

                                    if (msg.type === 'user') {
                                        return (
                                            <motion.div
                                                key={idx}
                                                className="flex justify-end"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                <div className="max-w-[80%] bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-br-sm text-sm font-medium">
                                                    {msg.text}
                                                </div>
                                            </motion.div>
                                        );
                                    }

                                    if (msg.type === 'analysis-single') {
                                        return (
                                            <motion.div
                                                key={idx}
                                                className="space-y-3"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                <div className="max-w-[90%] bg-slate-900/60 border border-slate-800 rounded-2xl rounded-bl-sm p-6">
                                                    <SingleAnalysisCard result={msg.result} />
                                                </div>
                                                {msg.followUp && (
                                                    <div className="max-w-[80%] bg-slate-900/40 border border-slate-800/50 px-5 py-3 rounded-2xl rounded-bl-sm text-sm text-slate-300">
                                                        <ReactMarkdown remarkPlugins={[remarkBreaks]}>{msg.followUp}</ReactMarkdown>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    }

                                    if (msg.type === 'analysis-batch') {
                                        return (
                                            <motion.div
                                                key={idx}
                                                className="space-y-3"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                <div className="max-w-[90%] bg-slate-900/60 border border-slate-800 rounded-2xl rounded-bl-sm p-6">
                                                    <BatchAnalysisCard results={msg.results} />
                                                </div>
                                                {msg.followUp && (
                                                    <div className="max-w-[80%] bg-slate-900/40 border border-slate-800/50 px-5 py-3 rounded-2xl rounded-bl-sm text-sm text-slate-300">
                                                        <ReactMarkdown remarkPlugins={[remarkBreaks]}>{msg.followUp}</ReactMarkdown>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    }

                                    // AI text message
                                    return (
                                        <motion.div
                                            key={idx}
                                            className="flex"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <div className="max-w-[80%] bg-slate-900/60 border border-slate-800 px-5 py-3 rounded-2xl rounded-bl-sm text-sm text-slate-300">
                                                <ReactMarkdown remarkPlugins={[remarkBreaks]}>{msg.text}</ReactMarkdown>
                                                {msg.isStreaming && <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse rounded-sm" />}
                                            </div>
                                        </motion.div>
                                    );
                                })}

                                {/* Loading indicator */}
                                {loading && messages[messages.length - 1]?.type !== 'ai' && (
                                    <motion.div
                                        className="flex items-center gap-2 text-xs text-slate-500"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <div className="size-6 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800">
                                            <Sparkles size={12} className="text-blue-400" />
                                        </div>
                                        <span className="font-bold">Analyzing</span>
                                        <TypingDots />
                                    </motion.div>
                                )}

                                <div ref={chatEndRef} />
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Input Bar ────────────────────────────── */}
                <div className="shrink-0 p-4 lg:px-8 relative">
                    <div className="max-w-3xl mx-auto">
                        <motion.div
                            className="relative backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.06] shadow-2xl"
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            {/* Command palette */}
                            <AnimatePresence>
                                {showCommandPalette && (
                                    <motion.div
                                        ref={commandPaletteRef}
                                        className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl bg-slate-900/95 rounded-xl z-50 shadow-2xl border border-slate-700/50 overflow-hidden"
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <div className="py-1">
                                            {commands.map((cmd, index) => (
                                                <motion.div
                                                    key={cmd.prefix}
                                                    className={cn(
                                                        'flex items-center gap-3 px-4 py-2.5 text-xs cursor-pointer transition-colors',
                                                        activeSuggestion === index
                                                            ? 'bg-blue-500/10 text-white'
                                                            : 'text-white/60 hover:bg-white/5'
                                                    )}
                                                    onClick={() => executeCommand(cmd)}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: index * 0.03 }}
                                                >
                                                    <div className="w-5 h-5 flex items-center justify-center text-blue-400">{cmd.icon}</div>
                                                    <div className="font-bold">{cmd.label}</div>
                                                    <div className="text-white/30 text-[10px] ml-1">{cmd.description}</div>
                                                    <div className="ml-auto text-[10px] text-slate-600 font-mono">{cmd.prefix}</div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Textarea */}
                            <div className="p-3 pb-0">
                                <textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onChange={(e) => { setInputValue(e.target.value); adjustHeight(); }}
                                    onKeyDown={handleKeyDown}
                                    placeholder={sessionId ? "Ask about improving your resume..." : "Type / for commands or ask a question..."}
                                    className="w-full px-4 py-3 resize-none bg-transparent border-none text-white/90 text-sm focus:outline-none placeholder:text-white/20 min-h-[56px]"
                                    style={{ overflow: 'hidden' }}
                                    disabled={loading}
                                />
                            </div>

                            {/* Button bar */}
                            <div className="p-3 pt-1 border-t border-white/[0.04] flex items-center justify-between gap-4">
                                <div className="flex items-center gap-1">
                                    {/* Attach file */}
                                    <motion.button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        whileTap={{ scale: 0.94 }}
                                        className="p-2.5 text-white/30 hover:text-white/80 rounded-xl transition-colors hover:bg-white/[0.05]"
                                        title="Upload from device"
                                    >
                                        <Paperclip className="w-4 h-4" />
                                    </motion.button>

                                    {/* Browse database */}
                                    <motion.button
                                        type="button"
                                        onClick={() => { setPickerMulti(false); setShowPicker(true); }}
                                        whileTap={{ scale: 0.94 }}
                                        className="p-2.5 text-white/30 hover:text-white/80 rounded-xl transition-colors hover:bg-white/[0.05]"
                                        title="Browse from database"
                                    >
                                        <FolderOpen className="w-4 h-4" />
                                    </motion.button>

                                    {/* Command palette toggle */}
                                    <motion.button
                                        type="button"
                                        data-command-button
                                        onClick={(e) => { e.stopPropagation(); setShowCommandPalette(prev => !prev); }}
                                        whileTap={{ scale: 0.94 }}
                                        className={cn(
                                            'p-2.5 text-white/30 hover:text-white/80 rounded-xl transition-colors hover:bg-white/[0.05]',
                                            showCommandPalette && 'bg-white/[0.08] text-white/80'
                                        )}
                                        title="Commands"
                                    >
                                        <span className="text-[10px] font-black">/</span>
                                    </motion.button>

                                    {/* Session indicator */}
                                    {sessionId && (
                                        <span className="ml-2 flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                            <MessageCircle size={10} /> Chat Active
                                        </span>
                                    )}
                                </div>

                                {/* Send button */}
                                <motion.button
                                    type="button"
                                    onClick={handleSendMessage}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={loading || !inputValue.trim()}
                                    className={cn(
                                        'px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2',
                                        inputValue.trim()
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500'
                                            : 'bg-white/[0.04] text-white/30'
                                    )}
                                >
                                    {loading ? (
                                        <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    <span>Send</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Resume Picker Modal */}
                <AnimatePresence>
                    {showPicker && (
                        <ResumePicker
                            resumes={resumes}
                            multiSelect={pickerMulti}
                            onConfirm={handlePickerConfirm}
                            onClose={() => setShowPicker(false)}
                        />
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default ResumeRating;
