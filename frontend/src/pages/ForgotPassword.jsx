import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import './Login.css'; // Reuse login styles for consistency

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

    if (status === 'success') {
        return (
            <div className="login-page">
                <div className="login-container">
                    <div className="login-card">
                        <div className="login-header">
                            <CheckCircle size={48} className="success-icon" style={{ color: '#10b981', marginBottom: '1rem' }} />
                            <h2>Check your email</h2>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                {message}
                            </p>
                        </div>
                        <div className="login-footer" style={{ marginTop: '2rem' }}>
                            <Link to="/login" className="back-to-login">
                                <ArrowLeft size={16} />
                                Back to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="logo">
                            <div className="logo-icon">ATS</div>
                        </div>
                        <h2>Forgot Password?</h2>
                        <p>Enter your email to receive a reset link</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {status === 'error' && (
                            <div className="error-message">
                                <AlertCircle size={18} />
                                <span>{message}</span>
                            </div>
                        )}

                        <div className="input-group">
                            <label htmlFor="email">Email Address</label>
                            <div className="input-wrapper">
                                <Mail className="input-icon" size={20} />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="login-button"
                            disabled={status === 'loading'}
                        >
                            {status === 'loading' ? (
                                <>
                                    <Loader2 className="spinner" size={18} />
                                    Sending Link...
                                </>
                            ) : (
                                'Send Reset Link'
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
        </div>
    );
};

export default ForgotPassword;
