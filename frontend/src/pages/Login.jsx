import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus } from 'lucide-react';
import './Login.css';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [username, setUsername] = useState('');

    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const normalizedEmail = formData.email.trim().toLowerCase();
        try {
            let result;
            if (isLogin) {
                result = await login(normalizedEmail, formData.password);
            } else {
                result = await register(normalizedEmail, formData.password, formData.fullName);
            }

            if (result.success) {
                // Extract username from email or full name
                const name = formData.fullName || formData.email.split('@')[0];
                setUsername(name);

                // Show welcome message after 1.5 seconds of loading
                setTimeout(() => {
                    setShowWelcome(true);

                    // Redirect to dashboard after 2 seconds of welcome screen
                    setTimeout(() => {
                        navigate('/dashboard');
                    }, 2000);
                }, 1500);
            } else {
                setError(result.error);
                setLoading(false);
            }
        } catch (err) {
            setError('An unexpected error occurred');
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
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
                        <div className="welcome-icon">✨</div>
                        <h1 className="welcome-title">WELCOME</h1>
                        <h2 className="welcome-username">{username}</h2>
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

                    <form onSubmit={handleSubmit} className="login-form">
                        {!isLogin && (
                            <div className="form-group">
                                <input
                                    type="text"
                                    name="fullName"
                                    className="form-input"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required={!isLogin}
                                    placeholder=" "
                                />
                                <label className="form-label">Full Name</label>
                            </div>
                        )}

                        <div className="form-group">
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder=" "
                            />
                            <label className="form-label">Email</label>
                        </div>

                        <div className="form-group">
                            <input
                                type="password"
                                name="password"
                                className="form-input"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder=" "
                                minLength={6}
                            />
                            <label className="form-label">Password</label>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? (
                                <div className="spinner" />
                            ) : isLogin ? (
                                <>
                                    <LogIn size={18} />
                                    <span>Sign In</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus size={18} />
                                    <span>Create Account</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>
                            {isLogin ? "Don't have an account? " : 'Already have an account? '}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError('');
                                }}
                                className="toggle-auth-mode"
                            >
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
