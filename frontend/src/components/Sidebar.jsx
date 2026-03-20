import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  Briefcase, 
  Upload, 
  FileText, 
  Home, 
  Star, 
  Settings, 
  ChevronsRight, 
  BarChart3,
  LayoutDashboard
} from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(true);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/upload', icon: Upload, label: 'Upload Resume' },
        { path: '/resumes', icon: FileText, label: 'View Resumes' },
        { path: '/rate-resume', icon: Star, label: 'Rate Resume' },
        { path: '/jobs/create', icon: Briefcase, label: 'Create Job' },
    ];

    return (
        <aside 
            className={`sticky top-0 h-screen shrink-0 border-r border-slate-800/60 transition-all duration-300 ease-in-out z-40 ${
                open ? 'w-64' : 'w-20'
            } bg-slate-950 p-4 shadow-2xl flex flex-col`}
        >
            {/* Branding */}
            <div className="mb-10 px-2 py-2">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/20">
                        <BarChart3 size={24} />
                    </div>
                    {open && (
                        <div className="transition-opacity duration-300">
                            <span className="block text-base font-black tracking-tight text-white uppercase italic">ATS PRO</span>
                            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Enterprise Suite</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                {navItems.map((item) => (
                    <NavItem 
                        key={item.path}
                        {...item}
                        active={location.pathname === item.path}
                        open={open}
                        navigate={navigate}
                    />
                ))}

                <div className="my-4 border-t border-slate-800/50" />

                <NavItem 
                    path="/settings"
                    icon={Settings}
                    label="Settings"
                    active={location.pathname === '/settings'}
                    open={open}
                    navigate={navigate}
                />
            </nav>

            {/* Footer / User */}
            <div className="mt-auto pt-6 border-t border-slate-800/50">
                {open && (
                    <div className="flex items-center gap-3 px-3 py-4 mb-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 hover:bg-slate-900 transition-colors">
                        <div className="size-10 shrink-0 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="block text-sm font-bold text-white truncate">{user?.full_name || "User"}</span>
                            <span className="block text-xs text-slate-500 truncate">{user?.email}</span>
                        </div>
                    </div>
                )}
                
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
                >
                    <LogOut size={20} className={`shrink-0 ${!open && "mx-auto"}`} />
                    {open && <span className="text-sm font-bold">Logout</span>}
                </button>

                <button
                    onClick={() => setOpen(!open)}
                    className="mt-4 flex items-center justify-center w-full p-2 text-slate-600 hover:text-slate-400 hover:bg-slate-900/50 rounded-lg transition-all"
                >
                    <ChevronsRight
                        size={18}
                        className={`transition-transform duration-500 ${open ? "rotate-180" : ""}`}
                    />
                </button>
            </div>
        </aside>
    );
};

const NavItem = ({ path, icon: Icon, label, active, open, navigate }) => {
    return (
        <button
            onClick={() => navigate(path)}
            className={`relative flex h-11 w-full items-center rounded-xl transition-all duration-300 group ${
                active 
                    ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_-5px_rgba(59,130,246,0.2)]" 
                    : "text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent"
            }`}
            title={!open ? label : ''}
        >
            <div className={`grid h-full w-14 shrink-0 place-content-center transition-colors ${active ? "text-blue-400" : "group-hover:text-white text-slate-500"}`}>
                <Icon size={20} className={active ? "animate-pulse" : ""} />
            </div>
            
            {open && (
                <span className="text-[13px] font-bold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300">
                    {label}
                </span>
            )}

            {active && (
                <div className={`absolute ${open ? "right-3" : "right-1"} h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]`} />
            )}
        </button>
    );
};

export default Sidebar;
