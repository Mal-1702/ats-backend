import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Calendar,
  ShieldCheck,
} from "lucide-react";

import "./Login.css";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  // Background Canvas particle logic from user's provided code
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();

    let ps = [];
    let raf = 0;

    const make = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      v: Math.random() * 0.25 + 0.05,
      o: Math.random() * 0.35 + 0.15,
    });

    const init = () => {
      ps = [];
      const count = Math.floor((canvas.width * canvas.height) / 9000);
      for (let i = 0; i < count; i++) ps.push(make());
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ps.forEach((p) => {
        p.y -= p.v;
        if (p.y < 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + Math.random() * 40;
          p.v = Math.random() * 0.25 + 0.05;
          p.o = Math.random() * 0.35 + 0.15;
        }
        ctx.fillStyle = `rgba(250,250,250,${p.o})`;
        ctx.fillRect(p.x, p.y, 0.7, 2.2);
      });
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      setSize();
      init();
    };

    window.addEventListener("resize", onResize);
    init();
    raf = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

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
      if (isLogin) {
        const result = await login(normalizedEmail, formData.password);
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error);
          setLoading(false);
        }
      } else {
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
    if (validationErrors[e.target.name]) {
      setValidationErrors((prev) => { const n = { ...prev }; delete n[e.target.name]; return n; });
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setValidationErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authAPI.verifyOTP(formData.email.trim().toLowerCase(), otp);
      if (result.data) {
        const loginResult = await login(formData.email.trim().toLowerCase(), formData.password);
        if (loginResult.success) {
          setUsername(formData.fullName || formData.email.split('@')[0]);
          navigate('/dashboard');
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
    <section className="relative min-h-screen w-full bg-[#030303] text-zinc-50 overflow-x-hidden font-sans selection:bg-zinc-100/10 selection:text-zinc-100">
      {/* Subtle vignette */}
      <div className="fixed inset-0 pointer-events-none [background:radial-gradient(80%_60%_at_50%_30%,rgba(255,255,255,0.06),transparent_60%)]" />

      {/* Animated accent lines */}
      <div className="accent-lines fixed">
        <div className="hline" />
        <div className="hline" />
        <div className="hline" />
        <div className="vline" />
        <div className="vline" />
        <div className="vline" />
      </div>

      {/* Particles */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full opacity-50 mix-blend-screen pointer-events-none"
      />

      {/* Overlays */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg transition-all duration-1000">
            <span className="text-6xl mb-6">✨</span>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-50">WELCOME</h1>
            <h2 className="text-2xl mt-2 text-zinc-400 font-light tracking-wider uppercase">{username}</h2>
        </div>
      )}

      {showOtpScreen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
            <Card className="card-animate w-full max-w-sm border-zinc-800 bg-zinc-900/90 backdrop-blur shadow-2xl">
              <CardHeader className="space-y-1 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/50">
                      <ShieldCheck className="h-8 w-8 text-zinc-300" />
                  </div>
                  <CardTitle className="text-2xl">Verify Email</CardTitle>
                  <CardDescription className="text-zinc-400">
                      We've sent a 6-digit code to <br/><strong className="text-zinc-200">{formData.email}</strong>
                  </CardDescription>
              </CardHeader>
              <form onSubmit={handleOtpSubmit}>
                  <CardContent className="grid gap-4">
                      <div className="grid gap-2 text-center">
                          <Input
                              type="text"
                              name="otp"
                              className="text-center text-xl tracking-[0.5em] h-12 bg-zinc-950 border-zinc-800 text-zinc-50"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="------"
                              required
                              autoFocus
                          />
                      </div>
                      {error && <div className="text-red-400 text-sm font-medium text-center">{error}</div>}
                      <Button type="submit" className="w-full h-10 rounded-lg bg-zinc-50 text-zinc-900 hover:bg-zinc-200 font-semibold" disabled={loading}>
                          {loading ? "Verifying..." : "Verify & Activate"}
                      </Button>
                      <Button 
                          type="button" 
                          variant="ghost" 
                          className="w-full text-zinc-400 hover:text-zinc-50"
                          onClick={() => setShowOtpScreen(false)}
                      >
                          Back to Registration
                      </Button>
                  </CardContent>
              </form>
            </Card>
        </div>
      ) : (
        /* Main Login Card */
        <div className="min-h-screen w-full flex items-center justify-center px-4 relative z-10 py-12">
          <div className="login-card card-animate">
            <div className="login-header">
              <h1 className="login-title">
                {isLogin ? 'Welcome back' : 'Create an account'}
              </h1>
              <p className="login-description">
                {isLogin ? 'Sign in to your account' : 'Join us to start recruiting smarter'}
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="login-content">
                
                {!isLogin && (
                  <>
                    <div className="form-field">
                      <label htmlFor="fullName" className="form-label">Full Name</label>
                      <div className="form-input-wrapper">
                        <User className="form-input-icon" />
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          placeholder="John Doe"
                          value={formData.fullName}
                          onChange={handleChange}
                          className="form-input"
                        />
                      </div>
                      {validationErrors.fullName && <span className="text-xs text-red-500 mt-1 ml-1">{validationErrors.fullName}</span>}
                    </div>

                    <div className="form-field">
                      <label htmlFor="dob" className="form-label">Date of Birth</label>
                      <div className="form-input-wrapper">
                        <Calendar className="form-input-icon" />
                        <input
                          id="dob"
                          name="dob"
                          type="date"
                          value={formData.dob}
                          onChange={handleChange}
                          max={new Date().toISOString().split('T')[0]}
                          className="form-input"
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>
                      {validationErrors.dob && <span className="text-xs text-red-500 mt-1 ml-1">{validationErrors.dob}</span>}
                    </div>
                  </>
                )}

                <div className="form-field">
                  <label htmlFor="email" className="form-label">Email</label>
                  <div className="form-input-wrapper">
                    <Mail className="form-input-icon" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                  {validationErrors.email && <span className="text-xs text-red-500 mt-1 ml-1">{validationErrors.email}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="password" className="form-label">Password</label>
                  <div className="form-input-wrapper">
                    <Lock className="form-input-icon" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="form-input"
                    />
                    <button
                      type="button"
                      tabIndex="-1"
                      className="form-input-toggle border-none bg-transparent flex items-center justify-center h-full"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {validationErrors.password && <span className="text-xs text-red-500 mt-1 ml-1">{validationErrors.password}</span>}
                </div>

                {isLogin && (
                    <div className="form-options">
                      <div className="form-checkbox-wrapper">
                        <Checkbox
                          id="remember"
                          className="h-5 w-5 border-zinc-700 data-[state=checked]:bg-zinc-100 data-[state=checked]:text-zinc-900"
                        />
                        <label htmlFor="remember" className="form-label !mb-0 cursor-pointer text-zinc-400 select-none">
                          Remember me
                        </label>
                      </div>
                      <Link to="/forgot-password" title="Forgot password link" className="form-link">
                        Forgot password?
                      </Link>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-4 rounded-lg text-center font-medium animate-in fade-in zoom-in duration-300">
                      {error}
                    </div>
                )}

                <button type="submit" disabled={loading} className="login-button border-none">
                  {loading ? "Processing..." : "Continue"}
                </button>
              </div>

              <div className="login-footer">
                <p className="footer-text">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <button 
                      type="button" 
                      onClick={switchMode}
                      className="footer-link border-none bg-transparent cursor-pointer"
                  >
                    {isLogin ? "Create one" : "Sign in here"}
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
