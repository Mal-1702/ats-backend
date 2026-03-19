import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { CanvasRevealEffect } from '../components/CanvasRevealEffect';
import { MiniNavbar } from '../components/MiniNavbar';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid or missing reset token.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setStatus('error');
            setMessage('Password must be at least 8 characters.');
            return;
        }

        setStatus('loading');
        try {
            await authAPI.resetPassword({
                token,
                password,
                confirm_password: confirmPassword
            });
            setStatus('success');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            console.error('Reset password error:', err);
            setMessage(err.response?.data?.detail || 'Failed to reset password. The link may be expired.');
            setStatus('error');
        }
    };

    return (
        <div className="flex w-full flex-col min-h-screen bg-black relative overflow-hidden">
            <div className="absolute inset-0 z-0">
                <CanvasRevealEffect
                    animationSpeed={3}
                    containerClassName="bg-black"
                    colors={[[255, 255, 255], [255, 255, 255]]}
                    dotSize={6}
                    reverse={status === 'success'}
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.8)_0%,_rgba(0,0,0,1)_100%)]" />
                <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
            </div>
            
            <div className="relative z-10 flex flex-col flex-1">
                <MiniNavbar />

                <div className="flex flex-1 flex-col justify-center items-center px-4">
                    <div className="w-full mt-24 max-w-sm">
                        <AnimatePresence mode="wait">
                            {status === 'success' ? (
                                <motion.div 
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center space-y-6"
                                >
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                                        <CheckCircle size={40} className="text-black" />
                                    </div>
                                    <div className="space-y-2">
                                        <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Updated!</h1>
                                        <p className="text-white/60">Your password has been reset successfully.</p>
                                    </div>
                                    <p className="text-xs text-white/30">Redirecting you to login...</p>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="form"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="text-center space-y-2">
                                        <h1 className="text-3xl font-bold text-white tracking-tight">Reset Password</h1>
                                        <p className="text-white/50">Enter your new secure password</p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {status === 'error' && (
                                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                                <AlertCircle size={16} />
                                                <span>{message}</span>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="New Password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full bg-white/5 text-white border border-white/10 rounded-full py-3 px-6 focus:border-white/30 focus:outline-none transition-all"
                                                    disabled={!token || status === 'loading'}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>

                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Confirm New Password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full bg-white/5 text-white border border-white/10 rounded-full py-3 px-6 focus:border-white/30 focus:outline-none transition-all"
                                                disabled={!token || status === 'loading'}
                                                required
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <Link 
                                                to="/login"
                                                className="w-1/3 py-3 rounded-full bg-white/5 text-white flex items-center justify-center hover:bg-white/10 transition-all text-sm"
                                            >
                                                <ArrowLeft size={16} />
                                            </Link>
                                            <button 
                                                type="submit" 
                                                className="flex-1 py-3 rounded-full bg-white text-black font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                                                disabled={!token || status === 'loading'}
                                            >
                                                {status === 'loading' ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Loader2 className="animate-spin" size={18} />
                                                        <span>Processing...</span>
                                                    </div>
                                                ) : 'Reset Password'}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
