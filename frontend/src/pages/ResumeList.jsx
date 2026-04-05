import { useState, useEffect, useCallback } from 'react';
import { resumesAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { Trash2, FileText, AlertCircle, Download, Eye, Search, Filter, X, ChevronDown, ChevronUp, Users, Plus } from 'lucide-react';

const ResumeList = () => {
    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Job filter State
    const [jobs, setJobs] = useState([]);
    const [activeJobId, setActiveJobId] = useState(null);

    // Multi-select State
    const [selectedResumes, setSelectedResumes] = useState([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [availableSkills, setAvailableSkills] = useState([]);
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [expRange, setExpRange] = useState({ min: 0, max: 20 });
    const [keyword, setKeyword] = useState('');
    const [hoveredItem, setHoveredItem] = useState(null);
    const [expandedNotes, setExpandedNotes] = useState({});

    const toggleNote = (id, e) => {
        e.stopPropagation();
        setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
    };

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
            setSelectedResumes(prev => prev.filter(id => id !== resumeId));
        } catch (error) {
            console.error('Delete error:', error);
            setError(`Failed to delete resume: ${error.response?.data?.detail || 'Unknown error'}`);
        }
    };

    // ── Multi-select handlers ─────────────────────────────────
    const toggleSelectResume = (resumeId) => {
        setSelectedResumes(prev =>
            prev.includes(resumeId)
                ? prev.filter(id => id !== resumeId)
                : [...prev, resumeId]
        );
    };

    const handleSelectAll = () => {
        if (selectedResumes.length === resumes.length) {
            setSelectedResumes([]);
        } else {
            setSelectedResumes(resumes.map(r => r.id));
        }
    };

    const handleBulkDelete = async () => {
        setBulkDeleting(true);
        try {
            await resumesAPI.bulkDelete(selectedResumes);
            setResumes(prev => prev.filter(r => !selectedResumes.includes(r.id)));
            setSelectedResumes([]);
            setShowBulkModal(false);
        } catch (err) {
            setError(err.response?.data?.detail || 'Bulk delete failed. Please try again.');
            setShowBulkModal(false);
        } finally {
            setBulkDeleting(false);
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
        <div className="flex h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
            <Sidebar />

            <main className="flex-1 min-w-0 overflow-auto custom-scrollbar relative p-8 lg:p-12">
                <div className="max-w-6xl mx-auto">

                    {/* ── HEADER ─────────────────────────────────── */}
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="size-2 bg-blue-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Resume Database</span>
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tighter leading-none mb-2">Uploaded Resumes</h1>
                            <p className="text-slate-400 text-sm font-medium">{resumes.length} total candidates in the pipeline</p>
                        </div>

                        {/* Search + Filter Toggle */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search by name, role, or skill..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-80 bg-slate-900/60 border border-slate-800 rounded-2xl pl-12 pr-10 py-3 text-sm text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:shadow-[0_0_15px_-5px_rgba(59,130,246,0.15)] transition-all"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-white transition-colors">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold border transition-all ${
                                    showFilters
                                        ? 'bg-blue-600/10 text-blue-400 border-blue-500/30'
                                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                                }`}
                            >
                                <Filter size={16} />
                                Filters
                                {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* ── JOB FILTER CHIPS ─────────────────────────── */}
                    {jobs.length > 0 && (
                        <div className="mb-6">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mr-4">Filter by Job:</span>
                            <div className="flex gap-2 flex-wrap mt-2">
                                <button
                                    onClick={() => handleJobFilter(null)}
                                    className={`px-5 py-2 text-xs font-bold rounded-full border transition-all ${
                                        activeJobId === null
                                            ? 'bg-blue-600/10 text-blue-400 border-blue-500/30 shadow-[0_0_15px_-5px_rgba(59,130,246,0.2)]'
                                            : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                                    }`}
                                >
                                    All Resumes
                                </button>
                                {jobs.map((job) => (
                                    <button
                                        key={job.id}
                                        onClick={() => handleJobFilter(job.id)}
                                        className={`px-5 py-2 text-xs font-bold rounded-full border transition-all ${
                                            activeJobId === job.id
                                                ? 'bg-blue-600/10 text-blue-400 border-blue-500/30 shadow-[0_0_15px_-5px_rgba(59,130,246,0.2)]'
                                                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                                        }`}
                                    >
                                        {job.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── ADVANCED FILTER PANEL ─────────────────────── */}
                    {showFilters && (
                        <div className="mb-8 p-8 rounded-[2rem] bg-slate-900/40 border border-slate-800 space-y-8 animate-in fade-in duration-300">
                            {/* Experience Range */}
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Years of Experience</h3>
                                <div className="flex items-center gap-4 mb-2">
                                    <span className="text-sm font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">{expRange.min} yrs</span>
                                    <div className="flex-1 h-px bg-slate-800" />
                                    <span className="text-sm font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">{expRange.max === 20 ? '20+' : expRange.max} yrs</span>
                                </div>
                                <div className="relative mt-3">
                                    <input
                                        type="range" min="0" max="20"
                                        value={expRange.min}
                                        onChange={(e) => setExpRange({ ...expRange, min: parseInt(e.target.value) })}
                                        className="w-full accent-blue-500 appearance-none h-1.5 bg-slate-800 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-lg"
                                    />
                                    <input
                                        type="range" min="0" max="20"
                                        value={expRange.max}
                                        onChange={(e) => setExpRange({ ...expRange, max: parseInt(e.target.value) })}
                                        className="w-full accent-blue-500 appearance-none h-1.5 bg-slate-800 rounded-full cursor-pointer mt-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-lg"
                                    />
                                </div>
                            </div>

                            {/* Skills */}
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Skillset</h3>
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-auto custom-scrollbar pr-2">
                                    {availableSkills.map(skill => (
                                        <button
                                            key={skill}
                                            onClick={() => toggleSkill(skill)}
                                            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                                                selectedSkills.includes(skill)
                                                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/10'
                                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                                            }`}
                                        >
                                            {skill}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Keywords */}
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Keywords</h3>
                                <input
                                    type="text"
                                    placeholder="e.g. Microservices, DevOps..."
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>

                            {/* Reset */}
                            <div className="pt-2">
                                <button onClick={handleClearFilters} className="text-xs font-black text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors">
                                    ✕ Reset All Filters
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── ERROR BANNER ─────────────────────────────── */}
                    {error && (
                        <div className="mb-6 flex items-center gap-3 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold animate-in fade-in duration-300">
                            <AlertCircle size={20} className="shrink-0" />
                            {error}
                            <button onClick={() => setError('')} className="ml-auto p-1 hover:text-white transition-colors"><X size={16} /></button>
                        </div>
                    )}

                    {/* ── CONTENT ─────────────────────────────────── */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center">
                            <div className="h-12 w-12 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mb-6" />
                            <p className="text-sm text-slate-500 font-bold">Searching resumes...</p>
                        </div>
                    ) : resumes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center">
                            <div className="size-24 bg-slate-900 rounded-full flex items-center justify-center mb-8 border border-slate-800">
                                <FileText size={48} className="text-slate-700" />
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2">No resumes found</h2>
                            <p className="text-slate-500 font-medium">Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        <>
                            {/* ── SELECT ALL / BULK ACTIONS BAR ─────────── */}
                            <div className="flex items-center justify-between mb-6 px-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-blue-500 cursor-pointer rounded"
                                        checked={resumes.length > 0 && selectedResumes.length === resumes.length}
                                        onChange={handleSelectAll}
                                    />
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                                        {selectedResumes.length === 0
                                            ? 'Select All'
                                            : selectedResumes.length === resumes.length
                                                ? 'Deselect All'
                                                : `${selectedResumes.length} selected`}
                                    </span>
                                </label>

                                {selectedResumes.length > 0 && (
                                    <button
                                        onClick={() => setShowBulkModal(true)}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95"
                                    >
                                        <Trash2 size={14} />
                                        Delete Selected ({selectedResumes.length})
                                    </button>
                                )}
                            </div>

                            {/* ── RESUME LIST (Hover-expand card layout) ──────── */}
                            <div className="space-y-3">
                                {resumes.map(resume => {
                                    const isHovered = hoveredItem === resume.id;
                                    const isSelected = selectedResumes.includes(resume.id);
                                    const isExpanded = expandedNotes[resume.id];
                                    return (
                                        <div
                                            key={resume.id}
                                            className="relative group"
                                            onMouseEnter={() => setHoveredItem(resume.id)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                        >
                                            <div
                                                className={`relative overflow-hidden border transition-all duration-300 ease-in-out cursor-pointer ${
                                                    isExpanded
                                                        ? 'h-auto min-h-[140px] py-4 border-blue-500 shadow-lg bg-blue-500/10'
                                                        : isHovered
                                                            ? 'h-[120px] border-blue-500 shadow-lg shadow-blue-500/20 bg-blue-500/5'
                                                            : isSelected
                                                                ? 'h-[88px] border-blue-500/30 bg-blue-600/5'
                                                                : 'h-[88px] border-slate-800 bg-slate-900/40 hover:border-blue-500/50'
                                                }`}
                                            >
                                                {/* Corner brackets on hover */}
                                                {isHovered && (
                                                    <>
                                                        <div className="absolute top-3 left-3 w-6 h-6 pointer-events-none">
                                                            <div className="absolute top-0 left-0 w-4 h-0.5 bg-blue-500" />
                                                            <div className="absolute top-0 left-0 w-0.5 h-4 bg-blue-500" />
                                                        </div>
                                                        <div className="absolute bottom-3 right-3 w-6 h-6 pointer-events-none">
                                                            <div className="absolute bottom-0 right-0 w-4 h-0.5 bg-blue-500" />
                                                            <div className="absolute bottom-0 right-0 w-0.5 h-4 bg-blue-500" />
                                                        </div>
                                                    </>
                                                )}

                                                {/* Content */}
                                                <div className="flex items-center justify-between h-full px-6 lg:px-8">
                                                    {/* LEFT: Checkbox + Icon + Info */}
                                                    <div className="flex items-center gap-5 min-w-0 flex-1">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 accent-blue-500 cursor-pointer shrink-0 rounded"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelectResume(resume.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />

                                                        <div className={`size-12 shrink-0 rounded-xl flex items-center justify-center border transition-colors ${
                                                            isHovered
                                                                ? 'bg-blue-500/20 border-blue-500/40'
                                                                : 'bg-blue-600/10 border-blue-500/20'
                                                        }`}>
                                                            <FileText size={22} className="text-blue-400" />
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <h3 className={`font-bold truncate transition-colors duration-300 ${
                                                                isHovered ? 'text-xl text-blue-400' : 'text-base text-white'
                                                            }`}>
                                                                {resume.filename}
                                                            </h3>
                                                            <div className={`flex items-center gap-3 mt-1 text-xs font-medium transition-colors duration-300 ${
                                                                isHovered ? 'text-slate-300' : 'text-slate-500'
                                                            }`}>
                                                                <span>{new Date(resume.uploaded_at).toLocaleDateString()}</span>
                                                                <span className="text-slate-700">•</span>
                                                                <span className={`flex items-center gap-1.5 ${
                                                                    resume.upload_source === 'hr_manual_upload' ? 'text-emerald-400' : 'text-violet-400'
                                                                }`}>
                                                                    {resume.upload_source === 'hr_manual_upload' ? <Plus size={10} /> : <Users size={10} />}
                                                                    {resume.uploaded_by_name || (resume.upload_source === 'hr_manual_upload' ? 'HR Upload' : 'Candidate Portal')}
                                                                </span>
                                                            </div>
                                                            {/* Candidate Preferences panel */}
                                                            {(resume.expected_salary || resume.availability || resume.candidate_note) && isExpanded && (
                                                                <div className="flex flex-col gap-2 p-4 bg-slate-950/70 backdrop-blur-sm rounded-xl border border-slate-800 mt-3 w-full xl:w-[90%] relative z-20 shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
                                                                    <div className="flex items-center gap-4 text-xs font-medium">
                                                                        {resume.expected_salary && (
                                                                            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-md border border-emerald-500/20">
                                                                                💰 {resume.expected_salary}
                                                                            </span>
                                                                        )}
                                                                        {resume.availability && (
                                                                            <span className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-2.5 py-1.5 rounded-md border border-blue-500/20">
                                                                                📅 {resume.availability}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {resume.candidate_note && (
                                                                        <div className="mt-1.5 text-sm text-slate-300 italic leading-relaxed">
                                                                            📝 "{resume.candidate_note}"
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* RIGHT: Action buttons — visible on hover */}
                                                    <div className={`flex items-center gap-2 shrink-0 ml-4 transition-opacity duration-300 ${
                                                        isHovered || isExpanded ? 'opacity-100' : 'opacity-0 lg:opacity-40'
                                                    }`}>
                                                        {(resume.expected_salary || resume.availability || resume.candidate_note) && (
                                                            <button
                                                                onClick={(e) => toggleNote(resume.id, e)}
                                                                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border rounded-xl transition-all ${
                                                                    isExpanded 
                                                                        ? 'bg-blue-600/10 text-blue-400 border-blue-500/30' 
                                                                        : 'text-slate-400 border-slate-800 hover:bg-emerald-600/10 hover:text-emerald-400 hover:border-emerald-500/30'
                                                                }`}
                                                            >
                                                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                                {isExpanded ? 'Less Info' : 'Read More'}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleView(resume.id); }}
                                                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-400 border border-slate-800 rounded-xl hover:bg-blue-600/10 hover:text-blue-400 hover:border-blue-500/30 transition-all"
                                                        >
                                                            <Eye size={14} /> View
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDownload(resume.id, resume.filename); }}
                                                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-400 border border-slate-800 rounded-xl hover:bg-emerald-600/10 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
                                                        >
                                                            <Download size={14} /> Download
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(resume.id, resume.filename); }}
                                                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-400/60 border border-red-500/10 rounded-xl hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all"
                                                        >
                                                            <Trash2 size={14} /> Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ── BULK DELETE MODAL ──────────────────────── */}
                            {showBulkModal && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => !bulkDeleting && setShowBulkModal(false)}>
                                    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[3rem] p-12 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="mx-auto size-24 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-red-500/20">
                                            <Trash2 className="text-red-500" size={40} />
                                        </div>
                                        <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Confirm Deletion</h3>
                                        <p className="text-slate-400 font-medium mb-10 leading-relaxed">
                                            Are you sure you want to permanently delete <strong className="text-white">{selectedResumes.length} resume{selectedResumes.length > 1 ? 's' : ''}</strong>? This action cannot be undone.
                                        </p>
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => setShowBulkModal(false)}
                                                disabled={bulkDeleting}
                                                className="flex-1 px-4 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-sm font-black text-slate-300 active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleBulkDelete}
                                                disabled={bulkDeleting}
                                                className="flex-1 px-4 py-4 bg-red-600 hover:bg-red-500 rounded-2xl text-sm font-black text-white active:scale-95 transition-all shadow-xl shadow-red-500/20 disabled:opacity-50"
                                            >
                                                {bulkDeleting ? 'Deleting...' : 'Confirm Delete'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ResumeList;
