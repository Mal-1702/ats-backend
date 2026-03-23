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

import Galaxy from "../components/Galaxy";
import { ATSLoader } from "../components/ui/ats-loader";
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
          const name = formData.fullName || formData.email.split('@')[0];
          setUsername(name);
          setShowWelcome(true);
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
          setLoading(false);
          setShowOtpScreen(false);
          setShowWelcome(true);
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
    <div className="relative min-h-screen w-full bg-black">
      
      {/* Galaxy Background Layer */}
      {!showWelcome && (
        <div className="absolute inset-0 z-0">
          <Galaxy
            hueShift={240}
            speed={0.6}
            starSpeed={0.4}
            density={1.2}
            glowIntensity={0.4}
            saturation={0.3}
            twinkleIntensity={0.4}
            rotationSpeed={0.08}
            mouseRepulsion={true}
            repulsionStrength={1.5}
            transparent={false}
          />
        </div>
      )}

      {/* Foreground Login UI */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 pointer-events-none">
        {showWelcome && (
          <ATSLoader onComplete={() => navigate('/dashboard')} />
        )}

        {!showWelcome && (showOtpScreen ? (
          <div className="w-full max-w-sm pointer-events-auto">
            <button
              onClick={() => setShowOtpScreen(false)}
              className="mb-4 text-zinc-400 hover:text-white transition-colors flex items-center gap-2 group border-none bg-transparent cursor-pointer"
            >
              ← Back to Registration
            </button>
            <Card className="card-animate border-zinc-800 bg-zinc-900/90 backdrop-blur-xl shadow-2xl rounded-2xl p-6">
              <CardHeader className="space-y-1 text-center p-0 mb-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  <ShieldCheck className="h-8 w-8 text-indigo-400" />
                </div>
                <CardTitle className="text-2xl font-semibold text-white">Verify Email</CardTitle>
                <CardDescription className="text-zinc-400">
                  We've sent a 6-digit code to <br /><strong className="text-zinc-200">{formData.email}</strong>
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleOtpSubmit}>
                <div className="grid gap-4">
                  <div className="grid gap-2 text-center">
                    <Input
                      type="text"
                      name="otp"
                      className="text-center text-xl tracking-[0.5em] h-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:ring-indigo-500 rounded-lg"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="------"
                      required
                      autoFocus
                    />
                  </div>
                  {error && <div className="text-red-400 text-sm font-medium text-center">{error}</div>}
                  <Button type="submit" className="w-full h-11 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 font-semibold transition-all shadow-lg shadow-indigo-500/20" disabled={loading}>
                    {loading ? "Verifying..." : "Verify & Activate"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        ) : (
          /* Main Login Card - INTEGRATED WITH USER'S REFINED STYLE */
          <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-xl p-8 card-animate pointer-events-auto">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-semibold text-white mb-2">
                {isLogin ? 'Welcome back' : 'Create an account'}
              </h1>
              <p className="text-sm text-zinc-400 mb-6">
                {isLogin ? 'Sign in to your account' : 'Join us to start recruiting smarter'}
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4">

                {!isLogin && (
                  <>
                    <div className="form-field">
                      <label htmlFor="fullName" className="text-xs text-zinc-400 mb-1 block tracking-wide">Full Name</label>
                      <div className="form-input-wrapper relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          placeholder="John Doe"
                          value={formData.fullName}
                          onChange={handleChange}
                          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        />
                      </div>
                      {validationErrors.fullName && <span className="text-xs text-red-500 mt-1 ml-1">{validationErrors.fullName}</span>}
                    </div>

                    <div className="form-field">
                      <label htmlFor="dob" className="text-xs text-zinc-400 mb-1 block tracking-wide">Date of Birth</label>
                      <div className="form-input-wrapper relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <input
                          id="dob"
                          name="dob"
                          type="date"
                          value={formData.dob}
                          onChange={handleChange}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition [color-scheme:dark]"
                        />
                      </div>
                      {validationErrors.dob && <span className="text-xs text-red-500 mt-1 ml-1">{validationErrors.dob}</span>}
                    </div>
                  </>
                )}

                <div className="form-field">
                  <label htmlFor="email" className="text-xs text-zinc-400 mb-1 block tracking-wide">Email</label>
                  <div className="form-input-wrapper relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full rounded-lg bg-zinc-800 border border-zinc-700 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>
                  {validationErrors.email && <span className="text-xs text-red-500 mt-1 ml-1">{validationErrors.email}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="password" className="text-xs text-zinc-400 mb-1 block tracking-wide">Password</label>
                  <div className="form-input-wrapper relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full rounded-lg bg-zinc-800 border border-zinc-700 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      tabIndex="-1"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors border-none bg-transparent cursor-pointer"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {validationErrors.password && <span className="text-xs text-red-500 mt-1 ml-1">{validationErrors.password}</span>}
                </div>

                {isLogin && (
                  <div className="flex items-center justify-between text-sm text-zinc-400 mt-3 px-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember"
                        className="h-4 w-4 border-zinc-700 data-[state=checked]:bg-indigo-500 data-[state=checked]:text-white"
                      />
                      <label htmlFor="remember" className="cursor-pointer select-none">
                        Remember me
                      </label>
                    </div>
                    <Link to="/forgot-password" title="Forgot password link" className="hover:text-indigo-400 transition-colors no-underline">
                      Forgot password?
                    </Link>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-4 rounded-lg text-center font-medium animate-in fade-in zoom-in duration-300">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg shadow-indigo-600/20 active:scale-[0.98]">
                  {loading ? "Processing..." : "Continue"}
                </button>
              </div>

              <div className="mt-8 text-center pt-6 border-t border-zinc-800/50">
                <p className="text-sm text-zinc-500">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="ml-1 text-indigo-400 hover:text-indigo-300 font-semibold border-none bg-transparent cursor-pointer transition-colors"
                  >
                    {isLogin ? "Create one" : "Sign in here"}
                  </button>
                </p>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

