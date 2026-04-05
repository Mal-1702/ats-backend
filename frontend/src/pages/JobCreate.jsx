import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { Briefcase, Plus, X, AlertCircle, Sparkles, Target, Zap, FileText, Clock, DollarSign, Star } from 'lucide-react';

// ── Priority configuration ────────────────────────────────────────────────
const PRIORITY_LEVELS = [
    { label: 'Critical', value: 1.00, tw: 'text-red-400 bg-red-500/10 border-red-500/30', bar: 'bg-red-500', dot: 'bg-red-400' },
    { label: 'High',     value: 0.75, tw: 'text-orange-400 bg-orange-500/10 border-orange-500/30', bar: 'bg-orange-500', dot: 'bg-orange-400' },
    { label: 'Medium',   value: 0.50, tw: 'text-amber-400 bg-amber-500/10 border-amber-500/30', bar: 'bg-amber-500', dot: 'bg-amber-400' },
    { label: 'Low',      value: 0.25, tw: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', bar: 'bg-cyan-500', dot: 'bg-cyan-400' },
    { label: 'Optional', value: 0.10, tw: 'text-slate-400 bg-slate-500/10 border-slate-500/30', bar: 'bg-slate-500', dot: 'bg-slate-400' },
];

function getPriorityConfig(priority) {
    if (priority >= 0.90) return PRIORITY_LEVELS[0];
    if (priority >= 0.65) return PRIORITY_LEVELS[1];
    if (priority >= 0.40) return PRIORITY_LEVELS[2];
    if (priority >= 0.20) return PRIORITY_LEVELS[3];
    return PRIORITY_LEVELS[4];
}

// ── SkillCard: a single skill with priority slider ────────────────────────
function SkillCard({ skillObj, onRemove, onPriorityChange }) {
    const { skill, priority } = skillObj;
    const cfg = getPriorityConfig(priority);
    const barW = Math.round(priority * 100);

    return (
        <div className={`rounded-2xl border p-4 transition-all duration-300 ${cfg.tw}`}>
            {/* Top row: name + remove */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-black text-white truncate mr-2">{skill}</span>
                <button
                    type="button"
                    onClick={() => onRemove(skill)}
                    className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label={`Remove ${skill}`}
                >
                    <X size={14} />
                </button>
            </div>

            {/* Priority bar */}
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${cfg.bar}`}
                    style={{ width: `${barW}%` }}
                />
            </div>

            {/* Slider */}
            <input
                type="range"
                min="0.10"
                max="1.00"
                step="0.01"
                value={priority}
                onChange={(e) => onPriorityChange(skill, parseFloat(e.target.value))}
                className="w-full h-1 accent-blue-500 appearance-none bg-slate-800 rounded-full cursor-pointer mb-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
                aria-label={`Priority for ${skill}`}
            />

            {/* Level chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
                {PRIORITY_LEVELS.map((lvl) => {
                    const isActive = Math.abs(priority - lvl.value) < 0.13;
                    return (
                        <button
                            key={lvl.label}
                            type="button"
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                isActive
                                    ? lvl.tw
                                    : 'text-slate-600 border-slate-800 bg-slate-950/60 hover:text-slate-400 hover:border-slate-700'
                            }`}
                            onClick={() => onPriorityChange(skill, lvl.value)}
                        >
                            {lvl.label}
                        </button>
                    );
                })}
            </div>

            {/* Current label */}
            <div className={`text-[11px] font-black ${cfg.tw.split(' ')[0]}`}>
                {barW}% — {cfg.label}
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────
const JobCreate = () => {
    const [formData, setFormData] = useState({
        title: '',
        keywords: [],
        min_experience: 0,
        long_description: '',
        work_schedule: '',
        salary_range: '',
    });
    const [highlights, setHighlights] = useState([]);
    const [currentHighlight, setCurrentHighlight] = useState('');
    const [skillObjs, setSkillObjs] = useState([]);   // [{ skill, priority, importance_level }]
    const [currentSkill, setCurrentSkill] = useState('');
    const [currentKeyword, setCurrentKeyword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // ── Skill handlers ───────────────────────────────────────────────────────
    const addSkill = () => {
        const trimmed = currentSkill.trim();
        if (!trimmed) return;
        if (skillObjs.some((s) => s.skill.toLowerCase() === trimmed.toLowerCase())) return;
        setSkillObjs((prev) => [
            ...prev,
            { skill: trimmed, priority: 0.75, importance_level: 'high' },
        ]);
        setCurrentSkill('');
    };

    const removeSkill = (name) =>
        setSkillObjs((prev) => prev.filter((s) => s.skill !== name));

    const updatePriority = (name, newPriority) => {
        const cfg = getPriorityConfig(newPriority);
        setSkillObjs((prev) =>
            prev.map((s) =>
                s.skill === name
                    ? { ...s, priority: newPriority, importance_level: cfg.label.toLowerCase() }
                    : s,
            ),
        );
    };

    // ── Keyword handlers ─────────────────────────────────────────────────────
    const addKeyword = () => {
        const trimmed = currentKeyword.trim();
        if (!trimmed || formData.keywords.includes(trimmed)) return;
        setFormData((f) => ({ ...f, keywords: [...f.keywords, trimmed] }));
        setCurrentKeyword('');
    };

    const removeKeyword = (kw) =>
        setFormData((f) => ({ ...f, keywords: f.keywords.filter((k) => k !== kw) }));

    // ── Highlight handlers ─────────────────────────────────────────────────
    const addHighlight = () => {
        const trimmed = currentHighlight.trim();
        if (!trimmed || highlights.includes(trimmed)) return;
        setHighlights((prev) => [...prev, trimmed]);
        setCurrentHighlight('');
    };
    const removeHighlight = (h) => setHighlights((prev) => prev.filter((x) => x !== h));

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (skillObjs.length === 0) {
            setError('Please add at least one required skill.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                skills: skillObjs.map((s) => s.skill),
                skill_priorities: skillObjs.map((s) => ({
                    skill: s.skill,
                    priority: s.priority,
                    importance_level: s.importance_level,
                })),
                long_description: formData.long_description || null,
                work_schedule: formData.work_schedule || null,
                salary_range: formData.salary_range || null,
                key_highlights: highlights.length > 0 ? highlights : null,
            };
            await jobsAPI.create(payload);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create job');
        } finally {
            setLoading(false);
        }
    };

    // ── Stat summary ─────────────────────────────────────────────────────────
    const criticalCount = skillObjs.filter((s) => s.priority >= 0.90).length;
    const highCount = skillObjs.filter((s) => s.priority >= 0.65 && s.priority < 0.90).length;
    const optionalCount = skillObjs.filter((s) => s.priority < 0.40).length;

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
            <Sidebar />

            <main className="flex-1 min-w-0 overflow-auto custom-scrollbar relative p-8 lg:p-12">
                <div className="max-w-3xl mx-auto">

                    {/* ── HEADER ────────────────────────────────── */}
                    <div className="mb-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="size-2 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Job Builder</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter leading-none mb-2">Create New Job</h1>
                        <p className="text-slate-400 text-sm font-medium">Define the position and set skill priorities for smarter candidate ranking</p>
                    </div>

                    {/* ── ERROR BANNER ──────────────────────────── */}
                    {error && (
                        <div className="mb-6 flex items-center gap-3 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold animate-in fade-in duration-300">
                            <AlertCircle size={20} className="shrink-0" />
                            {error}
                            <button onClick={() => setError('')} className="ml-auto p-1 hover:text-white transition-colors"><X size={16} /></button>
                        </div>
                    )}

                    {/* ── FORM CARD ─────────────────────────────── */}
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-8">

                            {/* ── Job Title ────────────────────────── */}
                            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
                                <div className="flex items-center gap-2 mb-5">
                                    <Briefcase size={16} className="text-blue-400" />
                                    <label className="text-xs font-black text-slate-300 uppercase tracking-[0.15em]">Job Title *</label>
                                </div>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    placeholder="e.g., Senior Python Developer"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:shadow-[0_0_15px_-5px_rgba(59,130,246,0.15)] transition-all"
                                />
                            </div>

                            {/* ── Required Skills + Priority ───────── */}
                            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
                                <div className="flex items-center gap-2 mb-1">
                                    <Target size={16} className="text-blue-400" />
                                    <label className="text-xs font-black text-slate-300 uppercase tracking-[0.15em]">Required Skills *</label>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium mb-5">Set importance level for each skill — affects candidate ranking</p>

                                {/* Input + Add */}
                                <div className="flex gap-3 mb-5">
                                    <input
                                        type="text"
                                        value={currentSkill}
                                        onChange={(e) => setCurrentSkill(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                                        placeholder="Type a skill and press Enter or click Add"
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={addSkill}
                                        className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl text-xs font-black bg-blue-600/10 text-blue-400 border border-blue-500/30 hover:bg-blue-600/20 transition-all active:scale-95"
                                    >
                                        <Plus size={14} />
                                        Add
                                    </button>
                                </div>

                                {/* Priority summary stats */}
                                {skillObjs.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-5">
                                        {criticalCount > 0 && (
                                            <span className="text-[10px] font-black px-2.5 py-1 rounded-lg text-red-400 bg-red-500/10 border border-red-500/20">{criticalCount} Critical</span>
                                        )}
                                        {highCount > 0 && (
                                            <span className="text-[10px] font-black px-2.5 py-1 rounded-lg text-orange-400 bg-orange-500/10 border border-orange-500/20">{highCount} High</span>
                                        )}
                                        {optionalCount > 0 && (
                                            <span className="text-[10px] font-black px-2.5 py-1 rounded-lg text-slate-400 bg-slate-500/10 border border-slate-500/20">{optionalCount} Optional</span>
                                        )}
                                        <span className="text-[10px] font-black px-2.5 py-1 rounded-lg text-blue-400 bg-blue-500/10 border border-blue-500/20">{skillObjs.length} total</span>
                                    </div>
                                )}

                                {/* Skill cards grid */}
                                {skillObjs.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {skillObjs.map((s) => (
                                            <SkillCard
                                                key={s.skill}
                                                skillObj={s}
                                                onRemove={removeSkill}
                                                onPriorityChange={updatePriority}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-5 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-slate-500 text-xs font-medium">
                                        <Sparkles size={16} className="text-slate-600 shrink-0" />
                                        <span>Add skills above — each skill can be individually prioritised from Critical to Optional</span>
                                    </div>
                                )}
                            </div>

                            {/* ── Keywords ─────────────────────────── */}
                            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
                                <div className="flex items-center gap-2 mb-1">
                                    <Zap size={16} className="text-blue-400" />
                                    <label className="text-xs font-black text-slate-300 uppercase tracking-[0.15em]">Keywords</label>
                                    <span className="text-[10px] text-slate-600 font-medium ml-1">(optional)</span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium mb-5">Add keywords to help match candidates more precisely</p>

                                <div className="flex gap-3 mb-4">
                                    <input
                                        type="text"
                                        value={currentKeyword}
                                        onChange={(e) => setCurrentKeyword(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                                        placeholder="e.g., microservices, cloud, startup"
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={addKeyword}
                                        className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl text-xs font-black bg-blue-600/10 text-blue-400 border border-blue-500/30 hover:bg-blue-600/20 transition-all active:scale-95"
                                    >
                                        <Plus size={14} />
                                        Add
                                    </button>
                                </div>

                                {formData.keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.keywords.map((kw, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded-xl">
                                                {kw}
                                                <button type="button" onClick={() => removeKeyword(kw)} className="text-violet-400/60 hover:text-white transition-colors">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Min Experience ──────────────────────── */}
                            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
                                <div className="flex items-center gap-2 mb-5">
                                    <Briefcase size={16} className="text-blue-400" />
                                    <label className="text-xs font-black text-slate-300 uppercase tracking-[0.15em]">Minimum Experience (Years) *</label>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        value={formData.min_experience}
                                        onChange={(e) => setFormData({ ...formData, min_experience: parseInt(e.target.value) || 0 })}
                                        required
                                        min="0"
                                        max="30"
                                        className="w-32 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white font-bold text-center placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="text-xs text-slate-500 font-medium">years of professional experience</span>
                                </div>
                            </div>

                            {/* ── Long Description ───────────────────── */}
                            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText size={16} className="text-blue-400" />
                                    <label className="text-xs font-black text-slate-300 uppercase tracking-[0.15em]">Job Description</label>
                                    <span className="text-[10px] text-slate-600 font-medium ml-1">(optional)</span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium mb-5">Detailed description visible to candidates when applying</p>
                                <textarea
                                    value={formData.long_description}
                                    onChange={(e) => setFormData({ ...formData, long_description: e.target.value })}
                                    placeholder="Describe the role, responsibilities, team, and what success looks like..."
                                    maxLength={5000}
                                    rows={5}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all resize-y min-h-[120px]"
                                />
                                {formData.long_description && (
                                    <div className="text-right text-[10px] text-slate-600 mt-1">{formData.long_description.length}/5000</div>
                                )}
                            </div>

                            {/* ── Work Schedule + Salary ─────────────── */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
                                    <div className="flex items-center gap-2 mb-5">
                                        <Clock size={16} className="text-blue-400" />
                                        <label className="text-xs font-black text-slate-300 uppercase tracking-[0.15em]">Work Schedule</label>
                                    </div>
                                    <select
                                        value={formData.work_schedule}
                                        onChange={(e) => setFormData({ ...formData, work_schedule: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white font-medium focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Select schedule</option>
                                        <option value="Full-time">Full-time</option>
                                        <option value="Part-time">Part-time</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Freelance">Freelance</option>
                                        <option value="Internship">Internship</option>
                                        <option value="Remote">Remote</option>
                                        <option value="Hybrid">Hybrid</option>
                                        <option value="On-site">On-site</option>
                                    </select>
                                </div>

                                <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
                                    <div className="flex items-center gap-2 mb-5">
                                        <DollarSign size={16} className="text-blue-400" />
                                        <label className="text-xs font-black text-slate-300 uppercase tracking-[0.15em]">Salary Range</label>
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.salary_range}
                                        onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                                        placeholder="e.g., ₹8-12 LPA or $80k-$120k"
                                        maxLength={100}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            {/* ── Key Highlights ────────────────────── */}
                            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
                                <div className="flex items-center gap-2 mb-1">
                                    <Star size={16} className="text-blue-400" />
                                    <label className="text-xs font-black text-slate-300 uppercase tracking-[0.15em]">Key Highlights</label>
                                    <span className="text-[10px] text-slate-600 font-medium ml-1">(optional)</span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium mb-5">Perks and benefits candidates will see — e.g., "Remote-first", "Health insurance"</p>

                                <div className="flex gap-3 mb-4">
                                    <input
                                        type="text"
                                        value={currentHighlight}
                                        onChange={(e) => setCurrentHighlight(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHighlight(); } }}
                                        placeholder="e.g., Flexible hours, Stock options"
                                        maxLength={100}
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={addHighlight}
                                        className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl text-xs font-black bg-blue-600/10 text-blue-400 border border-blue-500/30 hover:bg-blue-600/20 transition-all active:scale-95"
                                    >
                                        <Plus size={14} />
                                        Add
                                    </button>
                                </div>

                                {highlights.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {highlights.map((h, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-xl">
                                                <Star size={10} className="text-emerald-400" />
                                                {h}
                                                <button type="button" onClick={() => removeHighlight(h)} className="text-emerald-400/60 hover:text-white transition-colors">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Form Actions ────────────────────────── */}
                            <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => navigate('/dashboard')}
                                    className="px-8 py-3.5 rounded-2xl text-sm font-black text-slate-400 border border-slate-800 hover:bg-slate-900 hover:text-white transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-black bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                                >
                                    {loading ? (
                                        <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Briefcase size={16} />
                                            <span>Create Job</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default JobCreate;
