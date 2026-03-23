import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rankingAPI, jobsAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import CandidateCard from '../components/CandidateCard';
import BorderGlow from '../components/ui/BorderGlow';
import {
    Users, TrendingUp, Loader, AlertCircle,
    ArrowLeft, Sparkles, Award, Target, BarChart3, Brain
} from 'lucide-react';

const RankedCandidates = () => {
    const { jobId } = useParams();
    const [job, setJob] = useState(null);
    const [rankings, setRankings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [expandedIds, setExpandedIds] = useState(new Set());
    const navigate = useNavigate();

    const toggleExpanded = (resumeId) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(resumeId)) next.delete(resumeId);
            else next.add(resumeId);
            return next;
        });
    };

    useEffect(() => { fetchJobAndRankings(); }, [jobId]);

    const fetchJobAndRankings = async () => {
        try {
            const [jobResponse, rankingsResponse] = await Promise.all([
                jobsAPI.getById(jobId),
                rankingAPI.getShortlist(jobId),
            ]);
            setJob(jobResponse.data);
            setRankings(rankingsResponse.data);
        } catch (err) {
            setError('Failed to load rankings');
        } finally {
            setLoading(false);
        }
    };

    const triggerRanking = async () => {
        setProcessing(true);
        setError('');
        try {
            await rankingAPI.triggerRanking(jobId);
            setTimeout(async () => {
                await fetchJobAndRankings();
                setProcessing(false);
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to trigger ranking');
            setProcessing(false);
        }
    };

    const hasResults = rankings?.shortlist && rankings.shortlist.length > 0;

    // Summary stats
    const tierACount = hasResults ? rankings.shortlist.filter(c => c.tier === 'A').length : 0;
    const avgScore = hasResults
        ? Math.round(rankings.shortlist.reduce((s, c) => s + c.final_score, 0) / rankings.shortlist.length)
        : 0;

    const summaryCards = [
        { label: 'Total Candidates', value: rankings?.shortlist_size ?? 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', glowColor: '220 80 60', colors: ['#3b82f6', '#60a5fa', '#2563eb'] },
        { label: 'Top Tier (A)', value: tierACount, icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/10', glowColor: '40 90 55', colors: ['#f59e0b', '#fbbf24', '#d97706'] },
        { label: 'Average Score', value: avgScore, icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10', glowColor: '150 80 60', colors: ['#10b981', '#34d399', '#059669'] },
    ];

    // ── Loading state ──
    if (loading) {
        return (
            <div className="flex min-h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
                <Sidebar />
                <main className="flex-1 min-w-0 overflow-auto custom-scrollbar relative">
                    <div className="max-w-7xl mx-auto px-6 py-10 flex items-center justify-center min-h-[80vh]">
                        <div className="h-14 w-14 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
            <Sidebar />

            <main className="flex-1 min-w-0 overflow-auto custom-scrollbar relative bg-[radial-gradient(circle_at_top_right,rgba(30,41,59,0.3),transparent_50%)]">
                <div className="max-w-7xl mx-auto px-6 py-10">

                    {/* ── HEADER ──────────────────────────────── */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
                        <div>
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-400 transition-colors mb-3 group"
                            >
                                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                                Back to Dashboard
                            </button>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="size-2 bg-blue-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">AI Ranking Engine</span>
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tighter leading-none mb-3 uppercase">
                                {job?.title || 'Job Position'}
                            </h1>
                            <div className="flex items-center gap-3 text-sm text-slate-400 font-medium">
                                <div className="flex items-center gap-1.5 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-white/5">
                                    <Users size={14} className="text-blue-400" />
                                    <span>{rankings?.shortlist_size ?? 0} candidates</span>
                                </div>
                                {job?.min_experience && (
                                    <div className="flex items-center gap-1.5 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-white/5">
                                        <BarChart3 size={14} className="text-emerald-400" />
                                        <span>{job.min_experience}+ Years</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={triggerRanking}
                            disabled={processing}
                            className="group bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white pl-6 pr-5 py-3.5 rounded-2xl shadow-2xl shadow-blue-500/20 font-black text-sm tracking-wide transition-all duration-300 flex items-center gap-2 border border-blue-400/20 hover:-translate-y-1 disabled:translate-y-0"
                        >
                            {processing ? (
                                <>
                                    <Loader size={18} className="animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <TrendingUp size={18} />
                                    Trigger Ranking
                                </>
                            )}
                        </button>
                    </div>

                    {/* ── ERROR BANNER ────────────────────────── */}
                    {error && (
                        <div className="flex items-center gap-3 p-5 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 mb-8 shadow-xl shadow-red-500/5">
                            <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                <AlertCircle size={20} />
                            </div>
                            <span className="text-sm font-bold">{error}</span>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════
                        EMPTY STATE
                    ══════════════════════════════════════════ */}
                    {!hasResults ? (
                        <div className="mt-4">
                            <BorderGlow
                                backgroundColor="#0a0f1e"
                                borderRadius={20}
                                glowColor="220 70 60"
                                colors={['#3b82f6', '#8b5cf6', '#06b6d4']}
                                glowIntensity={0.5}
                                glowRadius={25}
                                fillOpacity={0.15}
                            >
                                <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                                    <div className="size-24 bg-slate-900 rounded-full flex items-center justify-center mb-8 border border-slate-800 shadow-2xl">
                                        <Users size={48} className="text-slate-700" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-3 tracking-tight">No Rankings Yet</h3>
                                    <p className="text-slate-500 text-base mb-8 max-w-md font-medium leading-relaxed">
                                        {rankings?.message || "No rankings yet. Click 'Trigger Ranking' to start matching."}
                                    </p>
                                    <button
                                        onClick={triggerRanking}
                                        disabled={processing}
                                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white px-8 py-3.5 rounded-2xl font-black text-sm tracking-wide transition-all flex items-center gap-2 shadow-2xl shadow-blue-500/20 active:scale-95"
                                    >
                                        <Sparkles size={18} />
                                        Start Matching
                                    </button>
                                </div>
                            </BorderGlow>
                        </div>
                    ) : (
                        <>
                            {/* ══════════════════════════════════
                                SUMMARY CARDS — 12-col grid
                            ══════════════════════════════════ */}
                            <div className="grid grid-cols-12 gap-6 mb-8">
                                {summaryCards.map((stat, i) => (
                                    <div key={i} className="col-span-12 md:col-span-4">
                                        <BorderGlow
                                            backgroundColor="#0a0f1e"
                                            borderRadius={20}
                                            glowColor={stat.glowColor}
                                            colors={stat.colors}
                                            glowIntensity={0.8}
                                            glowRadius={30}
                                            fillOpacity={0.3}
                                        >
                                            <div className="p-6 group relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-6 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity">
                                                    <stat.icon size={72} />
                                                </div>
                                                <div className={`size-11 ${stat.bg} rounded-xl flex items-center justify-center mb-5 border border-white/5`}>
                                                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                                                </div>
                                                <p className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase mb-1.5">{stat.label}</p>
                                                <p className="text-4xl font-black text-white tracking-tighter">{stat.value}</p>
                                            </div>
                                        </BorderGlow>
                                    </div>
                                ))}
                            </div>

                            {/* ══════════════════════════════════
                                AI RECOMMENDATIONS
                            ══════════════════════════════════ */}
                            {rankings.recommendations && (
                                <BorderGlow
                                    backgroundColor="#0a0f1e"
                                    borderRadius={20}
                                    glowColor="270 70 60"
                                    colors={['#8b5cf6', '#a78bfa', '#7c3aed']}
                                    glowIntensity={0.5}
                                    glowRadius={20}
                                    fillOpacity={0.15}
                                >
                                    <div className="p-6 mb-0">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="size-9 bg-violet-500/10 rounded-xl flex items-center justify-center border border-violet-500/20">
                                                <Brain size={18} className="text-violet-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white tracking-tight">AI Recommendations</h3>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Powered by AI Analysis</p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-300 leading-relaxed font-medium">{rankings.recommendations}</p>
                                    </div>
                                </BorderGlow>
                            )}

                            {/* ══════════════════════════════════
                                SHORTLISTED CANDIDATES
                            ══════════════════════════════════ */}
                            <div className={rankings.recommendations ? "mt-8" : ""}>
                                <div className="flex items-center justify-between mb-6 px-1">
                                    <div className="flex items-center gap-3">
                                        <div className="size-9 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800">
                                            <Award size={18} className="text-blue-500" />
                                        </div>
                                        <h2 className="text-xl font-black text-white tracking-tight">Shortlisted Candidates</h2>
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        {rankings.shortlist.length} ranked
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {rankings.shortlist.map((candidate, index) => (
                                        <CandidateCard
                                            key={candidate.resume_id ?? index}
                                            candidate={candidate}
                                            rank={index + 1}
                                            skillPriorities={job?.skill_priorities}
                                            isExpanded={expandedIds.has(candidate.resume_id)}
                                            onToggle={() => toggleExpanded(candidate.resume_id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default RankedCandidates;
