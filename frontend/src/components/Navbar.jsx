import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Briefcase, Upload, BarChart3, FileText } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="container navbar-content">
                <Link to="/" className="navbar-brand">
                    <BarChart3 size={28} />
                    <span>ATS Pro</span>
                </Link>

                <div className="navbar-links">
                    <Link to="/dashboard" className="nav-link">
                        <Briefcase size={18} />
                        <span>Dashboard</span>
                    </Link>
                    <Link to="/upload" className="nav-link">
                        <Upload size={18} />
                        <span>Upload Resume</span>
                    </Link>
                    <Link to="/resumes" className="nav-link">
                        <FileText size={18} />
                        <span>View Resumes</span>
                    </Link>
                    <Link to="/jobs/create" className="nav-link">
                        <Briefcase size={18} />
                        <span>Create Job</span>
                    </Link>
                </div>

                <div className="navbar-user">
                    <span className="user-email">{user?.email}</span>
                    <button onClick={handleLogout} className="btn-logout">
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
