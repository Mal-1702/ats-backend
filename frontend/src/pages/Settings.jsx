import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, RefreshCw, Eye, EyeOff, Users, ChevronDown, X, KeyRound, UserPlus, AlertCircle } from 'lucide-react';
import { adminAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

const ROLE_LABELS = { ceo: 'CEO', admin: 'Admin', hr: 'HR' };
const ROLE_STYLES = {
    ceo:   'text-violet-300 bg-violet-500/15 border-violet-500/30',
    admin: 'text-blue-300 bg-blue-500/15 border-blue-500/30',
    hr:    'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
};

const Settings = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Create user form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'hr' });
    const [showPw, setShowPw] = useState(false);

    // Reset password inline
    const [resetTarget, setResetTarget] = useState(null);
    const [resetPw, setResetPw] = useState('');
    const [resetting, setResetting] = useState(false);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await adminAPI.getUsers();
            setUsers(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load users.');
        } finally {
            setLoading(false);
        }
    };

    const flash = (msg, isError = false) => {
        if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
        else { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await adminAPI.createUser(newUser);
            flash(`✓ ${newUser.email} created as ${ROLE_LABELS[newUser.role]}.`);
            setNewUser({ email: '', password: '', full_name: '', role: 'hr' });
            setShowCreateForm(false);
            fetchUsers();
        } catch (err) {
            flash(err.response?.data?.detail || 'Failed to create user.', true);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteUser = async (userId, email) => {
        if (!window.confirm(`Delete account "${email}"? This cannot be undone.`)) return;
        try {
            await adminAPI.deleteUser(userId);
            flash(`✓ ${email} deleted.`);
            fetchUsers();
        } catch (err) {
            flash(err.response?.data?.detail || 'Failed to delete.', true);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await adminAPI.updateRole(userId, newRole);
            flash(`✓ Role updated to ${ROLE_LABELS[newRole]}.`);
            fetchUsers();
        } catch (err) {
            flash(err.response?.data?.detail || 'Failed to update role.', true);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setResetting(true);
        try {
            await adminAPI.resetPassword(resetTarget.id, resetPw);
            flash(`✓ Password reset for ${resetTarget.email}.`);
            setResetTarget(null);
            setResetPw('');
        } catch (err) {
            flash(err.response?.data?.detail || 'Failed to reset password.', true);
        } finally {
            setResetting(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
            <Sidebar />

            <main className="flex-1 min-w-0 overflow-auto custom-scrollbar p-8 lg:p-12">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* ── HEADER ────────────────────────────────── */}
                    <div className="flex items-center gap-5 mb-2">
                        <div className="size-14 bg-gradient-to-br from-violet-500/20 to-blue-500/15 rounded-2xl flex items-center justify-center border border-violet-500/30 shrink-0">
                            <Shield size={28} className="text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <div className="size-2 bg-violet-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">CEO Portal</span>
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tighter leading-none">Settings</h1>
                            <p className="text-sm text-slate-400 font-medium mt-1">User Management & Access Control</p>
                        </div>
                        <button
                            onClick={() => setShowCreateForm(v => !v)}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all active:scale-95 bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20"
                        >
                            {showCreateForm ? <X size={16} /> : <UserPlus size={16} />}
                            {showCreateForm ? 'Cancel' : 'Create User'}
                        </button>
                    </div>

                    {/* ── FLASH MESSAGES ─────────────────────────── */}
                    <AnimatePresence>
                        {success && (
                            <motion.div
                                className="p-4 rounded-2xl text-sm font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                            >{success}</motion.div>
                        )}
                        {error && (
                            <motion.div
                                className="flex items-center gap-3 p-4 rounded-2xl text-sm font-bold bg-red-500/10 border border-red-500/20 text-red-400"
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                            >
                                <AlertCircle size={16} className="shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── CREATE USER FORM ──────────────────────── */}
                    <AnimatePresence>
                        {showCreateForm && (
                            <motion.div
                                className="bg-slate-900/40 border border-blue-500/20 rounded-[2rem] p-8"
                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                transition={{ duration: 0.25 }}
                            >
                                <div className="flex items-center gap-2 mb-6">
                                    <UserPlus size={16} className="text-blue-400" />
                                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.15em]">New Staff Account</h3>
                                </div>

                                <form onSubmit={handleCreateUser} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input
                                            type="email"
                                            placeholder="Email address"
                                            value={newUser.email}
                                            onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                                            required
                                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Full name (optional)"
                                            value={newUser.full_name}
                                            onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative">
                                            <input
                                                type={showPw ? 'text' : 'password'}
                                                placeholder="Password"
                                                value={newUser.password}
                                                onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                                                required
                                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 pr-12 text-sm text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPw(v => !v)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                            >
                                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <select
                                            value={newUser.role}
                                            onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm text-white font-medium focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer [&>option]:bg-slate-900"
                                        >
                                            <option value="hr">HR</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {creating ? (
                                            <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Plus size={16} />
                                        )}
                                        {creating ? 'Creating…' : 'Create Account'}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── USER TABLE CARD ───────────────────────── */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden">
                        {/* Card header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <Users size={18} className="text-blue-400" />
                                <span className="text-sm font-black text-white">System Users</span>
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    {users.length}
                                </span>
                            </div>
                            <button
                                onClick={fetchUsers}
                                title="Refresh"
                                className="p-2 rounded-xl text-slate-500 border border-slate-800 hover:text-blue-400 hover:border-blue-500/30 transition-all"
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>

                        {/* Table content */}
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="h-7 w-7 border-3 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                        ) : users.length === 0 ? (
                            <p className="text-center py-12 text-sm text-slate-500 font-medium">No users found.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-800/50">
                                            <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Email</th>
                                            <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Name</th>
                                            <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Role</th>
                                            <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Created</th>
                                            <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr
                                                key={u.id}
                                                className={`border-b border-slate-800/30 transition-colors hover:bg-slate-900/50 ${u.role === 'ceo' ? 'bg-violet-500/[0.03]' : ''}`}
                                            >
                                                <td className="px-6 py-4 font-bold text-white whitespace-nowrap">{u.email}</td>
                                                <td className="px-6 py-4 text-slate-400">{u.full_name || <span className="text-slate-600">—</span>}</td>
                                                <td className="px-6 py-4">
                                                    {u.role === 'ceo' ? (
                                                        <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${ROLE_STYLES[u.role]}`}>
                                                            {ROLE_LABELS[u.role]}
                                                        </span>
                                                    ) : (
                                                        <div className="relative inline-flex items-center">
                                                            <select
                                                                value={u.role}
                                                                onChange={e => handleRoleChange(u.id, e.target.value)}
                                                                className={`appearance-none px-3 py-1 pr-7 text-[10px] font-black uppercase tracking-wider rounded-lg border cursor-pointer transition-all bg-transparent focus:outline-none ${ROLE_STYLES[u.role]} [&>option]:bg-slate-900 [&>option]:text-white`}
                                                            >
                                                                <option value="hr">HR</option>
                                                                <option value="admin">Admin</option>
                                                            </select>
                                                            <ChevronDown size={10} className="absolute right-2 pointer-events-none text-slate-500" />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    {u.role !== 'ceo' && (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => { setResetTarget(u); setResetPw(''); }}
                                                                title="Reset password"
                                                                className="size-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/10 transition-all"
                                                            >
                                                                <RefreshCw size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteUser(u.id, u.email)}
                                                                title="Delete user"
                                                                className="size-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── RESET PASSWORD MODAL ──────────────────── */}
                    <AnimatePresence>
                        {resetTarget && (
                            <motion.div
                                className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl"
                                onClick={() => setResetTarget(null)}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <motion.div
                                    className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2rem] p-8 text-center shadow-2xl"
                                    onClick={e => e.stopPropagation()}
                                    initial={{ scale: 0.95, y: 20 }}
                                    animate={{ scale: 1, y: 0 }}
                                    exit={{ scale: 0.95, y: 20 }}
                                >
                                    <div className="size-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-blue-500/20">
                                        <KeyRound size={24} className="text-blue-400" />
                                    </div>
                                    <h3 className="text-lg font-black text-white mb-2">Reset Password</h3>
                                    <p className="text-sm text-slate-400 mb-6">
                                        Set a new password for <strong className="text-blue-300">{resetTarget.email}</strong>
                                    </p>
                                    <form onSubmit={handleResetPassword}>
                                        <input
                                            type="password"
                                            placeholder="New password"
                                            value={resetPw}
                                            onChange={e => setResetPw(e.target.value)}
                                            required
                                            autoFocus
                                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all mb-6"
                                        />
                                        <div className="flex gap-3 justify-center">
                                            <button
                                                type="button"
                                                onClick={() => setResetTarget(null)}
                                                disabled={resetting}
                                                className="px-6 py-3 rounded-2xl text-sm font-black text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={resetting}
                                                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                                            >
                                                {resetting ? (
                                                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <KeyRound size={14} />
                                                )}
                                                {resetting ? 'Saving…' : 'Set Password'}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </main>
        </div>
    );
};

export default Settings;
