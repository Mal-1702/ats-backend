import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import './Login.css';

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
            // Auto-redirect after 3 seconds
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            console.error('Reset password error:', err);
            setMessage(err.response?.data?.detail || 'Failed to reset password. The link may be expired.');
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="login-page">
                <div className="login-container">
                    <div className="login-card">
                        <div className="login-header">
                            <CheckCircle size={48} className="success-icon" style={{ color: '#10b981', marginBottom: '1rem' }} />
                            <h2>Password Reset!</h2>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                Your password has been updated successfully.
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '1rem' }}>
                                Redirecting you to login...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo">
                        <div className="logo-icon">ATS</div>
                    </div>
                    <h2>Reset Password</h2>
                    <p>Enter your new secure password</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {(status === 'error') && (
                        <div className="error-message">
                            <AlertCircle size={18} />
                            <span>{message}</span>
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="password">New Password</label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={20} />
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={!token || status === 'loading'}
                                required
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={20} />
                            <input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={!token || status === 'loading'}
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="login-button"
                        disabled={!token || status === 'loading'}
                    >
                        {status === 'loading' ? (
                            <>
                                <Loader2 className="spinner" size={18} />
                                Resetting...
                            </>
                        ) : (
                            'Reset Password'
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <Link to="/login" className="back-to-login">
                        <ArrowLeft size={16} />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
