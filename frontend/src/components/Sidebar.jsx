import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Briefcase, Upload, BarChart3, FileText, Home, Star, Settings } from 'lucide-react';
import './Sidebar.css';

const ROLE_LABELS = { ceo: 'CEO', admin: 'Admin', hr: 'HR' };
const ROLE_BADGE_CLASS = { ceo: 'badge-ceo', admin: 'badge-admin', hr: 'badge-hr' };
const MIN_WIDTH = 180;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 260;
const STORAGE_KEY = 'ats_sidebar_width';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? parseInt(stored, 10) : DEFAULT_WIDTH;
    });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartX = useRef(null);
    const dragStartWidth = useRef(null);

    // Sync CSS variable whenever width changes
    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    }, [sidebarWidth]);

    const onMouseDown = useCallback((e) => {
        e.preventDefault();
        dragStartX.current = e.clientX;
        dragStartWidth.current = sidebarWidth;
        setIsDragging(true);
    }, [sidebarWidth]);

    useEffect(() => {
        if (!isDragging) return;

        const onMouseMove = (e) => {
            const delta = e.clientX - dragStartX.current;
            const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta));
            setSidebarWidth(newWidth);
        };

        const onMouseUp = () => {
            setIsDragging(false);
            setSidebarWidth(prev => {
                localStorage.setItem(STORAGE_KEY, prev);
                return prev;
            });
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', icon: <Home size={20} />, label: 'Dashboard' },
        { path: '/upload', icon: <Upload size={20} />, label: 'Upload Resume' },
        { path: '/resumes', icon: <FileText size={20} />, label: 'View Resumes' },
        { path: '/rate-resume', icon: <Star size={20} />, label: 'Rate My Resume' },
        { path: '/jobs/create', icon: <Briefcase size={20} />, label: 'Create Job' },
    ];

    const collapsed = sidebarWidth < 220;

    return (
        <aside className="sidebar" style={{ width: sidebarWidth }}>
            <div className="sidebar-content">
                {/* Brand */}
                <div className="sidebar-brand">
                    <div className="brand-icon">
                        <BarChart3 size={32} />
                    </div>
                    {!collapsed && <h2>ATS Pro</h2>}
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                            title={collapsed ? item.label : ''}
                        >
                            <span className="link-icon">{item.icon}</span>
                            {!collapsed && <span className="link-label">{item.label}</span>}
                        </Link>
                    ))}

                    {/* CEO-only Settings link */}
                    {user?.role === 'ceo' && (
                        <Link
                            to="/settings"
                            className={`sidebar-link sidebar-link--settings ${location.pathname === '/settings' ? 'active' : ''}`}
                            title={collapsed ? 'Settings' : ''}
                        >
                            <span className="link-icon"><Settings size={20} /></span>
                            {!collapsed && <span className="link-label">Settings</span>}
                        </Link>
                    )}
                </nav>

                {/* User Section */}
                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        {!collapsed && (
                            <div className="user-details">
                                <span className="user-email">{user?.email}</span>
                                {user?.role && (
                                    <span className={`role-badge-sidebar ${ROLE_BADGE_CLASS[user.role] || 'badge-hr'}`}>
                                        {ROLE_LABELS[user.role] || user.role}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <button onClick={handleLogout} className="btn-logout-sidebar">
                        <LogOut size={18} />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </div>

            {/* Drag-to-resize handle */}
            <div
                className={`sidebar-resize-handle${isDragging ? ' dragging' : ''}`}
                onMouseDown={onMouseDown}
                title="Drag to resize"
            />
        </aside>
    );
};

export default Sidebar;
