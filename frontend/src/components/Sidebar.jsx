import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Briefcase, Upload, BarChart3, FileText, Home, Star } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

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

    return (
        <aside className="sidebar">
            <div className="sidebar-content">
                {/* Brand */}
                <div className="sidebar-brand">
                    <div className="brand-icon">
                        <BarChart3 size={32} />
                    </div>
                    <h2>ATS Pro</h2>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <span className="link-icon">{item.icon}</span>
                            <span className="link-label">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* User Section */}
                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                            <span className="user-email">{user?.email}</span>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn-logout-sidebar">
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
