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
        { path: '/resumes', icon: FileText, label: 'View Database' },
        { path: '/rate-resume', icon: Star, label: 'Rate Candidates' },
        { path: '/jobs/create', icon: Briefcase, label: 'Open Jobs' },
    ];

    return (
        <aside 
            className={`sticky top-0 h-screen shrink-0 border-r border-slate-800/60 transition-all duration-300 ease-in-out z-40 ${
                open ? 'w-[260px]' : 'w-[72px]'
            } bg-[#0A0F1C] flex flex-col relative`}
        >
            {/* Collapse Toggle (Floating on right border) */}
            <button
                onClick={() => setOpen(!open)}
                className="absolute -right-3.5 top-8 flex h-7 w-7 items-center justify-center rounded-full bg-[#0A0F1C] border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-xl z-50 cursor-pointer"
            >
                <ChevronsRight
                    size={14}
                    className={`transition-transform duration-500 ${open ? "rotate-180" : ""}`}
                />
            </button>

            {/* Branding Header */}
            <div className={`h-[72px] flex items-center ${open ? 'px-6' : 'justify-center'} border-b border-slate-800/40 shrink-0`}>
                <div className="flex items-center gap-3">
                    <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md shadow-blue-500/20">
                        <BarChart3 size={18} strokeWidth={2.5} />
                    </div>
                    {open && (
                        <div className="flex flex-col justify-center whitespace-nowrap overflow-hidden transition-all duration-300">
                            <span className="text-[15px] font-bold tracking-tight text-white leading-none">ATS Suite</span>
                            <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase mt-1">Enterprise</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Body */}
            <nav className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-6 space-y-1 ${open ? 'px-3' : 'px-2'}`}>
                {open && <div className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 mt-1">Main Menu</div>}
                
                {navItems.map((item) => (
                    <NavItem 
                        key={item.path}
                        {...item}
                        active={location.pathname === item.path || (item.path === '/resumes' && location.pathname.startsWith('/resumes'))}
                        open={open}
                        navigate={navigate}
                    />
                ))}

                <div className="pt-5 pb-3 px-3">
                    <div className="h-px w-full bg-slate-800/40" />
                </div>

                {open && <div className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">System</div>}

                <NavItem 
                    path="/settings"
                    icon={Settings}
                    label="Settings"
                    active={location.pathname === '/settings'}
                    open={open}
                    navigate={navigate}
                />
            </nav>

            {/* Footer / User Profile */}
            <div className={`p-4 border-t border-slate-800/40 shrink-0 bg-[#0A0F1C]`}>
                {open ? (
                    <div className="flex items-center gap-3 mb-4 px-2 py-1.5 rounded-lg border border-transparent">
                        <div className="size-[34px] shrink-0 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                            {user?.full_name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <span className="block text-[13px] font-medium text-slate-200 truncate">{user?.full_name || "Admin User"}</span>
                            <span className="block text-[11px] text-slate-500 truncate">{user?.email || "admin@ats.com"}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center mb-4">
                        <div className="size-[34px] shrink-0 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                            {user?.full_name?.charAt(0).toUpperCase() || "U"}
                        </div>
                    </div>
                )}
                
                <button 
                    onClick={handleLogout}
                    className={`flex items-center ${open ? 'justify-start px-3 gap-3' : 'justify-center'} w-full h-10 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors group`}
                    title={!open ? "Logout" : ""}
                >
                    <LogOut size={16} strokeWidth={2.5} className="shrink-0 group-hover:text-red-400 transition-colors" />
                    {open && <span className="text-[13px] font-semibold">Log out</span>}
                </button>
            </div>
        </aside>
    );
};

const NavItem = ({ path, icon: Icon, label, active, open, navigate }) => {
    return (
        <button
            onClick={() => navigate(path)}
            className={`relative flex h-10 w-full items-center rounded-lg transition-all group ${open ? "px-3 justify-start" : "justify-center"} ${
                active 
                    ? "bg-blue-600/10 text-blue-500" 
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
            }`}
            title={!open ? label : ''}
        >
            {active && open && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-md bg-blue-500" />
            )}
            {active && !open && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-blue-500" />
            )}

            <Icon size={18} strokeWidth={active ? 2.5 : 2} className={`shrink-0 transition-all duration-300 ${active ? "text-blue-500 scale-105" : "text-slate-400 group-hover:text-slate-200"}`} />
            
            {open && (
                <span className={`ml-3 text-[13px] tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${active ? "text-blue-500 font-bold" : "text-slate-400 group-hover:text-slate-200 font-medium"}`}>
                    {label}
                </span>
            )}
        </button>
    );
};

export default Sidebar;
