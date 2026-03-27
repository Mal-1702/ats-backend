import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI, resumesAPI, dashboardAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import BorderGlow from '../components/ui/BorderGlow';
import { 
  Briefcase, 
  Users, 
  TrendingUp, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Bell, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Layers,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CubeLoader from '../components/ui/cube-loader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const LAST_CHECK_KEY = 'ats_last_dashboard_check';
const POLL_INTERVAL_MS = 60_000;

// ── Stacked chart tooltip ──
const StackedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const total = payload.reduce((s, p) => s + (p.value || 0), 0);
        return (
            <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl px-4 py-3 shadow-2xl min-w-[160px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                {payload.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 py-0.5">
                        <div className="flex items-center gap-2">
                            <div className="size-2.5 rounded-sm" style={{ background: p.color }} />
                            <span className="text-xs font-bold text-slate-300 truncate max-w-[100px]">{p.dataKey}</span>
                        </div>
                        <span className="text-xs font-black text-white">{p.value}</span>
                    </div>
                ))}
                <div className="border-t border-slate-700/50 mt-1.5 pt-1.5 flex justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Total</span>
                    <span className="text-xs font-black text-white">{total}</span>
                </div>
            </div>
        );
    }
    return null;
};

// ── Custom Legend ──
const ChartLegend = ({ payload }) => (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-3">
        {payload?.map((entry, i) => (
            <div key={i} className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-sm" style={{ background: entry.color }} />
                <span className="text-[11px] font-bold text-slate-400">{entry.value}</span>
            </div>
        ))}
    </div>
);

const Dashboard = () => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [resumeCount, setResumeCount] = useState(0);
    const [weeklyStats, setWeeklyStats] = useState([]);
    const [jobRoles, setJobRoles] = useState([]);
    const [range, setRange] = useState("week");

    const [rawResumes, setRawResumes] = useState([]);

    const transformData = (data, rng) => {
        if (!data || !data.length) return [];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const createEmptyGroups = (keys, labelFn) => {
            return keys.map(key => {
                const group = { day: labelFn(key) };
                const roles = jobRoles.map(r => r.key);
                roles.forEach(r => { group[r] = 0; });
                group._key = key;
                return group;
            });
        };

        let groups = [];
        if (rng === "week") {
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const dayKeys = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
                dayKeys.push(d.getDay());
            }
            groups = createEmptyGroups(dayKeys, d => days[d]);
            const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
            data.forEach(r => {
                const dDate = new Date(r.createdAt);
                if (dDate >= weekAgo) {
                    const group = groups.find(g => g._key === dDate.getDay());
                    if (group) group[r.role] = (group[r.role] || 0) + 1;
                }
            });
        } 
        else if (rng === "month") {
            groups = createEmptyGroups([1, 2, 3, 4, 5], w => `Week ${w}`);
            data.forEach(r => {
                const dDate = new Date(r.createdAt);
                if (dDate.getFullYear() === today.getFullYear() && dDate.getMonth() === today.getMonth()) {
                    const weekNum = Math.ceil(dDate.getDate() / 7);
                    const group = groups.find(g => g._key === weekNum);
                    if (group) group[r.role] = (group[r.role] || 0) + 1;
                }
            });
            // Optional: filter out Week 5 if month only has 28 days (Feb)
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            if (daysInMonth <= 28) groups = groups.filter(g => g._key !== 5);
        }
        else if (rng === "year") {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            groups = createEmptyGroups([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], m => months[m]);
            data.forEach(r => {
                const dDate = new Date(r.createdAt);
                if (dDate.getFullYear() === today.getFullYear()) {
                    const group = groups.find(g => g._key === dDate.getMonth());
                    if (group) group[r.role] = (group[r.role] || 0) + 1;
                }
            });
        }
        return groups;
    };

    const chartData = useMemo(() => transformData(rawResumes, range), [rawResumes, range, jobRoles]);
    const [loadingStage, setLoadingStage] = useState('complete');
    const [loading, setLoading] = useState(true);
    const [editingJob, setEditingJob] = useState(null);
    const [editSkills, setEditSkills] = useState([]);
    const [newSkill, setNewSkill] = useState('');
    const [editLoading, setEditLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [uploadJob, setUploadJob] = useState(null);
    const [uploadFiles, setUploadFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [newResumeAlert, setNewResumeAlert] = useState(0);
    const pollRef = useRef(null);
    const navigate = useNavigate();

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

    const fetchWeeklyStats = async () => {
        try {
            const res = await dashboardAPI.getRawResumes();
            setRawResumes(res.data.resumes || []);
            setJobRoles(res.data.job_roles || []);
        } catch { /* silent */ }
    };

    const checkNewResumes = async () => {
        try {
            const since = localStorage.getItem(LAST_CHECK_KEY);
            const params = since ? { since } : {};
            const res = await dashboardAPI.getNewResumesCount(params);
            const { new_resumes, server_time } = res.data;
            localStorage.setItem(LAST_CHECK_KEY, server_time);
            if (new_resumes > 0) setNewResumeAlert(new_resumes);
        } catch { /* Silent fail */ }
    };

    useEffect(() => {
        sessionStorage.setItem('dashboard_loaded', 'true');

        fetchData();
        fetchWeeklyStats();
        checkNewResumes();
        pollRef.current = setInterval(checkNewResumes, POLL_INTERVAL_MS);
        return () => {
            clearInterval(pollRef.current);
        };
    }, []);

    const dismissAlert = () => setNewResumeAlert(0);

    const handleToggleStatus = async (jobId, newStatus) => {
        try {
            await jobsAPI.toggleStatus(jobId, newStatus);
            fetchData();
        } catch (error) {
            console.error('Failed to toggle job status:', error);
        }
    };

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

    const removeEditSkill = (skill) => setEditSkills(editSkills.filter(s => s !== skill));

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

    const handleDeleteJob = async (jobId) => {
        try {
            await jobsAPI.delete(jobId);
            setDeleteConfirm(null);
            fetchData();
        } catch (error) {
            console.error('Failed to delete job:', error);
        }
    };

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
            setUploadStatus({ type: 'success', message: `Successfully uploaded ${uploadFiles.length} resume(s)!` });
            setUploadFiles([]);
            fetchData();
            setTimeout(closeUploadModal, 2000);
        } catch (error) {
            setUploadStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to upload resumes.' });
        } finally {
            setUploading(false);
        }
    };

    const activeJobsCount = jobs.filter(job => job.is_active).length;

    const statsCards = [
        { label: 'Total Listings', value: jobs.length, icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10', glowColor: '220 80 60', colors: ['#3b82f6', '#60a5fa', '#2563eb'] },
        { label: 'Active Roles', value: activeJobsCount, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', glowColor: '150 80 60', colors: ['#10b981', '#34d399', '#059669'] },
        { label: 'Candidates', value: resumeCount, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10', glowColor: '270 80 70', colors: ['#8b5cf6', '#a78bfa', '#7c3aed'] },
    ];

    // Chart total based on selected range
    const chartTotal = chartData.reduce((sum, d) => {
        let dayTotal = 0;
        for (const role of jobRoles) dayTotal += d[role.key] || 0;
        return sum + dayTotal;
    }, 0);

    return (
        <div className="flex h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
            {/* Cinematic Loading Overlay */}
            {loadingStage !== 'complete' && (
                <div 
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617] text-slate-50 transition-all duration-1000 ease-in-out"
                    style={{
                        opacity: loadingStage === 'fade-out' ? 0 : 1,
                        transform: loadingStage === 'fade-out' ? 'scale(1.1) blur(10px)' : 'scale(1)',
                        pointerEvents: 'none'
                    }}
                >
                    {loadingStage === 'cube' ? (
                        <div className="animate-in fade-in duration-700"><CubeLoader /></div>
                    ) : (
                        <div className="text-center space-y-6 animate-in fade-in zoom-in duration-700">
                            <div className="size-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/10 border border-blue-500/20">
                                <span className="text-4xl">✨</span>
                            </div>
                            <div>
                                <h1 className="text-5xl font-black tracking-tighter text-white">
                                    Welcome back, {user?.full_name?.split(' ')[0] || "Recruiter"}
                                </h1>
                                <p className="text-slate-500 text-sm font-bold tracking-[0.3em] uppercase mt-2">Initializing Recruitment Lab</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Sidebar />

            <main className="flex-1 min-w-0 overflow-auto custom-scrollbar relative bg-[radial-gradient(circle_at_top_right,rgba(30,41,59,0.3),transparent_50%)]">
                <div className="max-w-7xl mx-auto px-6 py-10 animate-in fade-in zoom-in duration-1000 ease-out fill-mode-forwards">

                    {/* ── HEADER ──────────────────────────────────── */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                 <div className="size-2 bg-blue-500 rounded-full animate-pulse" />
                                 <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">System Active</span>
                            </div>
                            <h1 className="text-5xl font-black text-white tracking-tighter leading-none mb-3">Dashboard</h1>
                            <p className="text-slate-400 text-lg font-medium tracking-tight">Managing <span className="text-blue-400 font-bold">{activeJobsCount} open positions</span> and <span className="text-emerald-400 font-bold">{resumeCount} candidates</span>.</p>
                        </div>
                        
                        <button 
                            onClick={() => navigate('/jobs/create')}
                            className="group bg-blue-600 hover:bg-blue-500 text-white pl-6 pr-5 py-3.5 rounded-2xl shadow-2xl shadow-blue-500/20 font-black text-sm tracking-wide transition-all duration-300 flex items-center gap-2 border border-blue-400/20 hover:-translate-y-1"
                        >
                            + Create New Job
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* ── ALERT BANNER ────────────────────────────── */}
                    {newResumeAlert > 0 && (
                        <div className="flex items-center justify-between p-5 bg-blue-600/5 border border-blue-500/20 rounded-2xl text-blue-400 shadow-xl shadow-blue-500/5 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                                    <Bell className="h-5 w-5 animate-bounce" />
                                </div>
                                <div>
                                    <p className="text-sm font-black tracking-tight text-white mb-0.5">{newResumeAlert} New Submissions</p>
                                    <p className="text-xs text-slate-500 font-medium">Received since your last session on {new Date().toLocaleDateString()}.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => navigate('/resumes')} className="text-xs font-black uppercase tracking-widest bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-500 transition-all active:scale-95">Review All</button>
                                <button onClick={dismissAlert} className="p-2.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-600"><X size={18} /></button>
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════
                        SECTION 1:  STATS CARDS — 12-col grid
                    ═══════════════════════════════════════════════ */}
                    <div className="grid grid-cols-12 gap-6">
                        {statsCards.map((stat, i) => (
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

                    {/* ═══════════════════════════════════════════════
                        SECTION 2:  STACKED BAR CHART — full width
                    ═══════════════════════════════════════════════ */}
                    <div className="grid grid-cols-12 gap-6 mt-8">
                        <div className="col-span-12">
                            <BorderGlow
                                backgroundColor="#0a0f1e"
                                borderRadius={20}
                                glowColor="220 70 60"
                                colors={['#3b82f6', '#8b5cf6', '#06b6d4']}
                                glowIntensity={0.6}
                                glowRadius={25}
                                fillOpacity={0.2}
                            >
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                                                <BarChart3 size={18} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white tracking-tight">Resumes by Job Role</h3>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                    Stacked — {range === 'week' ? 'Last 7 Days' : range === 'month' ? 'This Month' : 'This Year'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="flex gap-2">
                                                <button onClick={() => setRange('week')} className={`px-3 py-1 rounded-md text-sm transition-colors ${range === 'week' ? 'bg-blue-600 text-white font-bold border border-blue-500' : 'border border-slate-700 text-slate-400 hover:text-slate-300'}`}>Week</button>
                                                <button onClick={() => setRange('month')} className={`px-3 py-1 rounded-md text-sm transition-colors ${range === 'month' ? 'bg-blue-600 text-white font-bold border border-blue-500' : 'border border-slate-700 text-slate-400 hover:text-slate-300'}`}>Month</button>
                                                <button onClick={() => setRange('year')} className={`px-3 py-1 rounded-md text-sm transition-colors ${range === 'year' ? 'bg-blue-600 text-white font-bold border border-blue-500' : 'border border-slate-700 text-slate-400 hover:text-slate-300'}`}>Year</button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl font-black text-white tracking-tighter">{chartTotal}</span>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">total</span>
                                            </div>
                                        </div>
                                    </div>

                                    {chartData.length > 0 ? (
                                        <div className="h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={chartData}
                                                    margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                                                    barCategoryGap="20%"
                                                >
                                                    <CartesianGrid
                                                        vertical={false}
                                                        strokeDasharray="3 3"
                                                        stroke="rgba(255,255,255,0.04)"
                                                    />
                                                    <XAxis
                                                        dataKey="day"
                                                        tickLine={false}
                                                        tickMargin={8}
                                                        axisLine={false}
                                                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                                                    />
                                                    <YAxis
                                                        tickLine={false}
                                                        axisLine={false}
                                                        tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                                                        allowDecimals={false}
                                                    />
                                                    <Tooltip
                                                        content={<StackedTooltip />}
                                                        cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 8 }}
                                                    />
                                                    <Legend content={<ChartLegend />} />
                                                    {jobRoles.map((role) => (
                                                        <Bar
                                                            key={role.key}
                                                            dataKey={role.key}
                                                            stackId="a"
                                                            fill={role.color}
                                                            radius={[4, 4, 0, 0]}
                                                            fillOpacity={0.85}
                                                        />
                                                    ))}
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="h-[250px] flex items-center justify-center">
                                            <p className="text-sm text-slate-600 font-medium">No resume uploads in the selected range</p>
                                        </div>
                                    )}
                                </div>
                            </BorderGlow>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════
                        SECTION 3:  LIVE LISTINGS — 12-col grid
                    ═══════════════════════════════════════════════ */}
                    <div className="mt-10">
                        <div className="flex items-center justify-between mb-6 px-1">
                            <div className="flex items-center gap-3">
                                <div className="size-9 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800"><Layers size={18} className="text-blue-500" /></div>
                                <h2 className="text-xl font-black text-white tracking-tight">Live Listings</h2>
                            </div>
                            {jobs.length > 0 && <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{jobs.length} Active Positions</span>}
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-32"><div className="h-12 w-12 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin" /></div>
                        ) : jobs.length === 0 ? (
                            <div className="bg-slate-900/30 border-2 border-slate-800 border-dashed rounded-[2rem] py-24 text-center flex flex-col items-center">
                                <div className="size-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800 shadow-2xl">
                                    <Briefcase size={40} className="text-slate-700" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2">No active positions</h3>
                                <p className="text-slate-500 text-base mb-8 max-w-sm font-medium leading-relaxed italic">"The best talent is out there. Start your hunt by creating a new job listing today."</p>
                                <button onClick={() => navigate('/jobs/create')} className="bg-white text-slate-950 px-8 py-3.5 rounded-2xl font-black tracking-wide hover:bg-slate-200 transition-all flex items-center gap-3 shadow-2xl shadow-white/5 active:scale-95">
                                    <Plus size={20} /> New Position
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-12 gap-6">
                                {jobs.map((job) => (
                                    <div key={job.id} className="col-span-12 md:col-span-4">
                                        <BorderGlow
                                            backgroundColor="#0a0f1e"
                                            borderRadius={20}
                                            glowColor={job.is_active ? '220 70 60' : '0 60 50'}
                                            colors={job.is_active ? ['#3b82f6', '#60a5fa', '#8b5cf6'] : ['#ef4444', '#f87171', '#dc2626']}
                                            glowIntensity={0.7}
                                            glowRadius={25}
                                            fillOpacity={0.25}
                                        >
                                            <div className="min-h-[300px] p-7 flex flex-col justify-between group relative">
                                                <div className="space-y-5">
                                                    <div className="flex justify-between items-start">
                                                        <div className="space-y-1">
                                                            <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors uppercase leading-tight pr-6">{job.title}</h3>
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Job ID: #{String(job.id).slice(0, 8)}</p>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleStatus(job.id, !job.is_active);
                                                            }}
                                                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] rounded-full border shrink-0 transition-colors hover:bg-opacity-80 active:scale-95 cursor-pointer ${job.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`}
                                                        >
                                                            {job.is_active ? 'Active' : 'Closed'}
                                                        </button>
                                                    </div>

                                                    <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-400">
                                                        <div className="flex items-center gap-1.5 bg-slate-950/50 px-2.5 py-1 rounded-lg border border-white/5"><Calendar size={12} className="text-blue-400" />{job.min_experience}+ Yrs</div>
                                                        <div className="flex items-center gap-1.5 bg-slate-950/50 px-2.5 py-1 rounded-lg border border-white/5"><Layers size={12} className="text-emerald-400" />{new Date(job.created_at).toLocaleDateString()}</div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                                        {job.skills?.slice(0, 3).map((skill, idx) => (
                                                            <span key={idx} className="px-3 py-1 text-[10px] font-black bg-slate-950 text-slate-300 rounded-lg border border-slate-800 group-hover:border-blue-500/30 transition-colors capitalize">{skill}</span>
                                                        ))}
                                                        {job.skills?.length > 3 && <span className="px-3 py-1 text-[10px] font-black bg-white text-slate-950 rounded-lg">+{job.skills.length - 3}</span>}
                                                    </div>
                                                </div>

                                                <div className="mt-6 flex items-center gap-2 pt-5 border-t border-slate-800/50">
                                                    <button 
                                                        onClick={() => navigate(`/jobs/${job.id}/candidates`)}
                                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs py-3 rounded-xl shadow-lg shadow-blue-500/10 transition-all active:scale-95"
                                                    >
                                                        View Candidates
                                                    </button>
                                                    <button 
                                                        onClick={() => openUploadModal(job)}
                                                        className="p-3 text-slate-400 bg-slate-950 border border-slate-800 rounded-xl hover:text-white hover:bg-slate-800 transition-all active:scale-95"
                                                        title="Upload Resume"
                                                    >
                                                        <Upload size={16} />
                                                    </button>
                                                    <button onClick={() => openEditModal(job)} className="p-2 text-slate-600 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"><Pencil size={16} /></button>
                                                    <button onClick={() => setDeleteConfirm(job.id)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        </BorderGlow>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </main>

            {/* ═══════════════════════════════════════════════
                MODALS — Unchanged functionality
            ═══════════════════════════════════════════════ */}
            {editingJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[2rem] p-10 shadow-[0_0_100px_-20px_rgba(59,130,246,0.1)] relative">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight mb-1">Edit Requirements</h3>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Job: {editingJob.title}</p>
                            </div>
                            <button onClick={closeEditModal} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"><X size={20} /></button>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3">Core Competencies</label>
                                <div className="flex flex-wrap gap-2 p-2 min-h-[100px] bg-slate-950 rounded-xl border border-slate-800 overflow-y-auto custom-scrollbar">
                                    {editSkills.map((skill, idx) => (
                                        <span key={idx} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black flex items-center gap-3">
                                            {skill}
                                            <button onClick={() => removeEditSkill(skill)} className="hover:scale-125 transition-transform"><X size={12} /></button>
                                        </span>
                                    ))}
                                    {editSkills.length === 0 && <span className="p-4 text-slate-600 italic font-medium">No skills defined...</span>}
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <input type="text" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-5 py-3.5 text-sm text-white font-bold focus:outline-none focus:border-blue-500 transition-colors" placeholder="Add new skill..." value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEditSkill()}/>
                                <button onClick={addEditSkill} className="bg-blue-600 hover:bg-blue-500 px-5 rounded-xl transition-colors text-white font-black">Add</button>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={closeEditModal} className="flex-1 px-4 py-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-black text-slate-300 transition-all active:scale-95">Discard</button>
                                <button onClick={handleSaveSkills} disabled={editLoading} className="flex-2 px-4 py-3.5 bg-white hover:bg-slate-200 rounded-xl text-sm font-black text-slate-950 transition-all active:scale-95">
                                    {editLoading ? "Updating Lab..." : "Apply Changes"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2rem] p-10 shadow-2xl text-center">
                        <div className="mx-auto size-20 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
                            <Trash2 className="text-red-500" size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Decommission Job?</h3>
                        <p className="text-slate-500 font-medium mb-8 leading-relaxed italic">"This will permanently archive the position and its candidate rankings."</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-black text-slate-300 active:scale-95 transition-all">Cancel</button>
                            <button onClick={() => handleDeleteJob(deleteConfirm)} className="flex-1 px-4 py-3.5 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-black text-white active:scale-95 transition-all shadow-xl shadow-red-500/20">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {uploadJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[2rem] p-10 shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1">Import Talent</h3>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Target: {uploadJob.title}</p>
                            </div>
                            <button onClick={closeUploadModal} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleFileUpload} className="space-y-6">
                            <label className="group flex flex-col items-center justify-center w-full min-h-[180px] border-3 border-slate-800 border-dashed rounded-2xl bg-slate-950/50 hover:bg-slate-950 hover:border-blue-500/50 transition-all cursor-pointer relative overflow-hidden">
                                <div className="z-10 flex flex-col items-center justify-center text-center px-8">
                                    <div className="size-14 bg-slate-900 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600/10 transition-colors border border-slate-800 group-hover:border-blue-500/50">
                                        <Upload className="h-7 w-7 text-slate-500 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                    <p className="text-base font-black text-white mb-1 leading-none">Drop CVs here</p>
                                    <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">PDF or DOCX (Max 10MB)</p>
                                </div>
                                <input type="file" multiple accept=".pdf,.docx" onChange={(e) => {
                                    const selected = e.target.files;
                                    if (selected.length > 150) {
                                        setUploadStatus({ type: 'error', message: `Maximum 150 resumes allowed per batch. You selected ${selected.length}.` });
                                        e.target.value = '';
                                        return;
                                    }
                                    setUploadFiles(selected);
                                    setUploadStatus(null);
                                }} className="hidden" />
                            </label>
                            
                            {/* Upload Limit Note */}
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                                <span className="text-amber-500">📌</span>
                                <span>Note: Maximum resumes to be uploaded are <strong className="text-slate-400">150</strong> per batch.</span>
                            </div>
                            
                            {uploadFiles.length > 0 && (
                                <div className="bg-slate-950 rounded-2xl p-5 max-h-40 overflow-auto custom-scrollbar border border-slate-800 space-y-2">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Pipeline ({uploadFiles.length} items)</h4>
                                    {Array.from(uploadFiles).map((file, i) => (
                                        <div key={i} className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-3 truncate">
                                                <div className="size-5 bg-blue-600/10 rounded flex items-center justify-center text-blue-500 font-bold text-[9px]">CV</div>
                                                <span className="text-xs font-bold text-slate-300 truncate">{file.name}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-600">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {uploadStatus && (
                                <div className={`p-5 rounded-xl flex items-center gap-4 text-sm font-black ${uploadStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                    {uploadStatus.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
                                    {uploadStatus.message}
                                </div>
                            )}
                            
                            <button disabled={uploading || uploadFiles.length === 0} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-2xl shadow-blue-500/20 active:scale-[0.98] disabled:opacity-30 disabled:grayscale">
                                {uploading ? "Analyzing & Parsing..." : "Start Intake"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
