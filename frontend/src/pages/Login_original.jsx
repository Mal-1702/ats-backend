import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { authAPI } from '../services/api';
import './Login.css';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        dob: '',
    });
    const [validationErrors, setValidationErrors] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [showOtpScreen, setShowOtpScreen] = useState(false);
    const [otp, setOtp] = useState('');
    const [username, setUsername] = useState('');

    const { login, register } = useAuth();
    const navigate = useNavigate();

    const validateSignup = () => {
        const errs = {};
        if (!formData.fullName.trim()) errs.fullName = 'Full name is required';
        if (!formData.dob) errs.dob = 'Date of birth is required';
        if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'Enter a valid email address';
        if (formData.password.length < 8) errs.password = 'Password must be at least 8 characters';
        if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setValidationErrors({});

        if (isLogin) {
            if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                setValidationErrors({ email: 'Enter a valid email address' });
                return;
            }
        } else {
            const errs = validateSignup();
            if (Object.keys(errs).length > 0) {
                setValidationErrors(errs);
                return;
            }
        }

        setLoading(true);
        const normalizedEmail = formData.email.trim().toLowerCase();
        try {
            let result;
            if (isLogin) {
                result = await login(normalizedEmail, formData.password);
                if (result.success) {
                    const name = formData.fullName || formData.email.split('@')[0];
                    setUsername(name);
                    setTimeout(() => {
                        setShowWelcome(true);
                        setTimeout(() => { navigate('/dashboard'); }, 2000);
                    }, 1500);
                } else {
                    setError(result.error);
                    setLoading(false);
                }
            } else {
                // Register
                try {
                    const regResult = await authAPI.register({
                        email: normalizedEmail,
                        password: formData.password,
                        confirm_password: formData.password,
                        full_name: formData.fullName.trim(),
                        dob: formData.dob || null,
                    });
                    
                    if (regResult.data) {
                        setLoading(false);
                        setShowOtpScreen(true);
                    }
                } catch (regError) {
                    setError(regError.response?.data?.detail || 'Registration failed');
                    setLoading(false);
                }
            }
        } catch {
            setError('An unexpected error occurred');
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear validation error for the field being edited
        if (validationErrors[e.target.name]) {
            setValidationErrors((prev) => { const n = { ...prev }; delete n[e.target.name]; return n; });
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setValidationErrors({});
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await authAPI.verifyOTP(formData.email.trim().toLowerCase(), otp);
            if (result.data) {
                // Success! Now login automatically
                const loginResult = await login(formData.email.trim().toLowerCase(), formData.password);
                if (loginResult.success) {
                    setUsername(formData.fullName || formData.email.split('@')[0]);
                    setLoading(false);
                    setShowOtpScreen(false);
                    setTimeout(() => {
                        setShowWelcome(true);
                        setTimeout(() => { navigate('/dashboard'); }, 2000);
                    }, 1000);
                } else {
                    setError('Verification successful, but auto-login failed. Please sign in manually.');
                    setLoading(false);
                    setShowOtpScreen(false);
                    setIsLogin(true);
                }
            }
        } catch (otpErr) {
            setError(otpErr.response?.data?.detail || 'Invalid or expired code');
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Loading Screen Overlay */}
            {loading && !showWelcome && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <div className="loading-spinner"></div>
                        <h2 className="loading-text">We are setting things up for you...</h2>
                    </div>
                </div>
            )}

            {/* Welcome Screen Overlay */}
            {showWelcome && (
                <div className="welcome-overlay">
                    <div className="welcome-content">
                        <div className="welcome-icon">Γ£¿</div>
                        <h1 className="welcome-title">WELCOME</h1>
                        <h2 className="welcome-username">{username}</h2>
                    </div>
                </div>
            )}

            {/* OTP Screen Overlay */}
            {showOtpScreen && (
                <div className="otp-overlay">
                    <div className="login-card otp-card">
                        <div className="login-header">
                            <div className="login-icon otp-icon">
                                <ShieldCheck size={32} />
                            </div>
                            <h1>Verify Gmail</h1>
                            <p>We've sent a 6-digit code to <strong>{formData.email}</strong></p>
                        </div>

                        <form onSubmit={handleOtpSubmit} className="login-form">
                            <div className="form-group">
                                <input
                                    type="text"
                                    name="otp"
                                    className="form-input otp-input"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="Enter 6-digit code"
                                    required
                                    autoFocus
                                />
                                <label className="form-label label-active">Verification Code</label>
                            </div>

                            {error && <div className="error-message">{error}</div>}

                            <button type="submit" className="login-button" disabled={loading}>
                                {loading ? <div className="spinner" /> : <span>Verify & Activate</span>}
                            </button>
                            
                            <button 
                                type="button" 
                                className="toggle-auth-mode" 
                                style={{ marginTop: '1rem', width: '100%' }}
                                onClick={() => setShowOtpScreen(false)}
                            >
                                Back to Registration
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-icon">
                            {isLogin ? <LogIn size={32} /> : <UserPlus size={32} />}
                        </div>
                        <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
                        <p>
                            {isLogin
                                ? 'Sign in to access your ATS dashboard'
                                : 'Join us to start recruiting smarter'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form" noValidate>

                        {/* ΓöÇΓöÇ Signup-only fields ΓöÇΓöÇ */}
                        {!isLogin && (
                            <>
                                {/* Full Name */}
                                <div className="form-group">
                                    <input
                                        type="text"
                                        name="fullName"
                                        className={`form-input${validationErrors.fullName ? ' input-error' : ''}`}
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        placeholder=" "
                                    />
                                    <label className="form-label">Full Name</label>
                                    {validationErrors.fullName && (
                                        <span className="field-error">{validationErrors.fullName}</span>
                                    )}
                                </div>

                                {/* Date of Birth */}
                                <div className="form-group">
                                    <input
                                        type="date"
                                        name="dob"
                                        className={`form-input form-input-date${validationErrors.dob ? ' input-error' : ''}`}
                                        value={formData.dob}
                                        onChange={handleChange}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                    <label className={`form-label${formData.dob ? ' label-active' : ''}`}>Date of Birth</label>
                                    {validationErrors.dob && (
                                        <span className="field-error">{validationErrors.dob}</span>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Email */}
                        <div className="form-group">
                            <input
                                type="email"
                                name="email"
                                className={`form-input${validationErrors.email ? ' input-error' : ''}`}
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder=" "
                            />
                            <label className="form-label">Email</label>
                            {validationErrors.email && (
                                <span className="field-error">{validationErrors.email}</span>
                            )}
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <input
                                type="password"
                                name="password"
                                className={`form-input${validationErrors.password ? ' input-error' : ''}`}
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder=" "
                                minLength={8}
                            />
                            <label className="form-label">Password</label>
                            {validationErrors.password && (
                                <span className="field-error">{validationErrors.password}</span>
                            )}
                        </div>

                        {/* Forgot Password Link */}
                        {isLogin && (
                            <div className="forgot-password-container">
                                <Link to="/forgot-password" title="Click here to reset your password">
                                    Forgot Password?
                                </Link>
                            </div>
                        )}

                        {/* Confirm Password ΓÇö signup only */}
                        {!isLogin && (
                            <div className="form-group">
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    className={`form-input${validationErrors.confirmPassword ? ' input-error' : ''}`}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder=" "
                                />
                                <label className="form-label">Confirm Password</label>
                                {validationErrors.confirmPassword && (
                                    <span className="field-error">{validationErrors.confirmPassword}</span>
                                )}
                            </div>
                        )}

                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? (
                                <div className="spinner" />
                            ) : isLogin ? (
                                <><LogIn size={18} /><span>Sign In</span></>
                            ) : (
                                <><UserPlus size={18} /><span>Create Account</span></>
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>
                            {isLogin ? "Don't have an account? " : 'Already have an account? '}
                            <button type="button" onClick={switchMode} className="toggle-auth-mode">
                                {isLogin ? 'Sign up' : 'Sign in'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
