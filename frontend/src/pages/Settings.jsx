import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, RefreshCw, Eye, EyeOff, Users, ChevronDown } from 'lucide-react';
import { adminAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import './Settings.css';

const ROLE_LABELS = { ceo: 'CEO', admin: 'Admin', hr: 'HR' };
const ROLE_COLORS = { ceo: 'role-ceo', admin: 'role-admin', hr: 'role-hr' };

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
        <div className="page-layout">
            <Sidebar />
            <main className="settings-main">
                <div className="settings-container">

                    {/* Header */}
                    <div className="settings-header">
                        <div className="settings-header-icon"><Shield size={32} /></div>
                        <div>
                            <h1>Settings</h1>
                            <p className="settings-subtitle">CEO Portal — User Management</p>
                        </div>
                        <button className="btn-create-user" onClick={() => setShowCreateForm(v => !v)}>
                            <Plus size={18} />
                            {showCreateForm ? 'Cancel' : 'Create User'}
                        </button>
                    </div>

                    {/* Flash messages */}
                    {success && <div className="flash flash-success">{success}</div>}
                    {error && <div className="flash flash-error">{error}</div>}

                    {/* Create user form */}
                    {showCreateForm && (
                        <div className="create-user-card">
                            <h3><Plus size={16} /> New Staff Account</h3>
                            <form className="create-user-form" onSubmit={handleCreateUser}>
                                <div className="form-row">
                                    <input
                                        className="input-field"
                                        type="email"
                                        placeholder="Email address"
                                        value={newUser.email}
                                        onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                                        required
                                    />
                                    <input
                                        className="input-field"
                                        type="text"
                                        placeholder="Full name (optional)"
                                        value={newUser.full_name}
                                        onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))}
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="pw-wrapper">
                                        <input
                                            className="input-field"
                                            type={showPw ? 'text' : 'password'}
                                            placeholder="Password"
                                            value={newUser.password}
                                            onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                                            required
                                        />
                                        <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <select
                                        className="input-field"
                                        value={newUser.role}
                                        onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                                    >
                                        <option value="hr">HR</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <button className="btn-submit-create" type="submit" disabled={creating}>
                                    {creating ? 'Creating…' : 'Create Account'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* User table */}
                    <div className="users-card">
                        <div className="users-card-header">
                            <div className="users-card-title">
                                <Users size={20} />
                                <span>System Users</span>
                                <span className="user-count">{users.length}</span>
                            </div>
                            <button className="btn-refresh" onClick={fetchUsers} title="Refresh">
                                <RefreshCw size={16} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="settings-loading"><div className="spinner-sm" /></div>
                        ) : users.length === 0 ? (
                            <p className="settings-empty">No users found.</p>
                        ) : (
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} className={u.role === 'ceo' ? 'row-ceo' : ''}>
                                            <td className="td-email">{u.email}</td>
                                            <td>{u.full_name || <span className="text-muted">—</span>}</td>
                                            <td>
                                                {u.role === 'ceo' ? (
                                                    <span className={`role-badge ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                                                ) : (
                                                    <div className="role-select-wrapper">
                                                        <select
                                                            className={`role-select ${ROLE_COLORS[u.role]}`}
                                                            value={u.role}
                                                            onChange={e => handleRoleChange(u.id, e.target.value)}
                                                        >
                                                            <option value="hr">HR</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                        <ChevronDown size={12} className="role-chevron" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                                            <td className="td-actions">
                                                {u.role !== 'ceo' && (
                                                    <>
                                                        <button
                                                            className="btn-action btn-reset-pw"
                                                            onClick={() => { setResetTarget(u); setResetPw(''); }}
                                                            title="Reset password"
                                                        >
                                                            <RefreshCw size={14} />
                                                        </button>
                                                        <button
                                                            className="btn-action btn-delete-user"
                                                            onClick={() => handleDeleteUser(u.id, u.email)}
                                                            title="Delete user"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Reset password modal */}
                    {resetTarget && (
                        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
                            <div className="modal-card" onClick={e => e.stopPropagation()}>
                                <div className="modal-icon">🔑</div>
                                <h3>Reset Password</h3>
                                <p>Set a new password for <strong>{resetTarget.email}</strong></p>
                                <form onSubmit={handleResetPassword}>
                                    <input
                                        className="input-field"
                                        type="password"
                                        placeholder="New password"
                                        value={resetPw}
                                        onChange={e => setResetPw(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                    <div className="modal-actions">
                                        <button type="button" className="modal-btn-cancel" onClick={() => setResetTarget(null)} disabled={resetting}>Cancel</button>
                                        <button type="submit" className="modal-btn-confirm" disabled={resetting}>
                                            {resetting ? 'Saving…' : 'Set Password'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default Settings;
