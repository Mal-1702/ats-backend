import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { CanvasRevealEffect } from '../components/CanvasRevealEffect';
import { MiniNavbar } from '../components/MiniNavbar';
import { motion, AnimatePresence } from 'framer-motion';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        try {
            const response = await authAPI.forgotPassword(email);
            setMessage(response.data.message);
            setStatus('success');
        } catch (err) {
            console.error('Forgot password error:', err);
            setMessage(err.response?.data?.detail || 'Failed to request password reset. Please try again.');
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
                                        <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Check Mail</h1>
                                        <p className="text-white/60">{message}</p>
                                    </div>
                                    <Link to="/login" className="text-white/40 hover:text-white transition-colors text-sm underline">
                                        Back to Login
                                    </Link>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="form"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="text-center space-y-2">
                                        <h1 className="text-3xl font-bold text-white tracking-tight">Forgot Password?</h1>
                                        <p className="text-white/50">Enter your email to receive a reset link</p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {status === 'error' && (
                                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                                <AlertCircle size={16} />
                                                <span>{message}</span>
                                            </div>
                                        )}

                                        <div className="relative">
                                            <input
                                                type="email"
                                                placeholder="recruiter@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-white/5 text-white border border-white/10 rounded-full py-3 px-6 focus:border-white/30 focus:outline-none transition-all text-center"
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
                                                disabled={status === 'loading'}
                                            >
                                                {status === 'loading' ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Loader2 className="animate-spin" size={18} />
                                                        <span>Sending...</span>
                                                    </div>
                                                ) : 'Send Reset Link'}
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

export default ForgotPassword;
