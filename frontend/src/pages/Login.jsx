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
import { Separator } from "../components/ui/separator";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Calendar,
  ShieldCheck,
} from "lucide-react";

import { FloatingPaths } from "../components/ui/floating-paths";
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
          setLoading(false);
          setShowOtpScreen(false);
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
    <div className="relative min-h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden">

      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>
      {/* Animated accent lines from the new UI */}
      <div className="accent-lines pointer-events-none absolute inset-0 z-[2] opacity-70">
        <div className="hline" />
        <div className="hline" />
        <div className="hline" />
        <div className="vline" />
        <div className="vline" />
        <div className="vline" />
      </div>

      {/* Foreground Login UI */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 w-full">
        {/* Header from new UI design */}
        <header className="absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-4 pointer-events-auto">
          <span className="text-xs tracking-[0.14em] uppercase text-zinc-400">
            NOVA
          </span>
        </header>

        {showOtpScreen ? (
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
          <Card className="card-animate w-[400px] max-w-full border border-zinc-800 bg-[#09090b]/80 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-2xl z-10 pointer-events-auto overflow-hidden">
            <CardHeader className="space-y-4 !p-12 !pt-16 !pb-10">
              <CardTitle className="text-[32px] font-bold tracking-tight text-white mb-2">
                {isLogin ? 'Welcome back' : 'Create an account'}
              </CardTitle>
              <CardDescription className="text-[16px] font-medium text-zinc-400">
                {isLogin ? 'Sign in to your account' : 'Join us to start recruiting smarter'}
              </CardDescription>
            </CardHeader>

            <CardContent className="!p-12 !pt-0 !pb-10">
              <form onSubmit={handleSubmit} noValidate className="grid gap-[32px]">

                {!isLogin && (
                  <>
                    <div className="grid gap-[6px]">
                      <Label htmlFor="fullName" className="text-[13px] font-semibold text-zinc-200">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-zinc-500" />
                        <Input
                          id="fullName"
                          name="fullName"
                          type="text"
                          placeholder="John Doe"
                          value={formData.fullName}
                          onChange={handleChange}
                          className="!pl-[42px] bg-[#09090b] border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 rounded-[8px] h-10 transition-colors focus-visible:border-zinc-700 focus-visible:ring-1 focus-visible:ring-zinc-700"
                        />
                      </div>
                      {validationErrors.fullName && <span className="text-xs text-red-500 ml-1">{validationErrors.fullName}</span>}
                    </div>

                    <div className="grid gap-[6px]">
                      <Label htmlFor="dob" className="text-[13px] font-semibold text-zinc-200">Date of Birth</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-zinc-500" />
                        <Input
                          id="dob"
                          name="dob"
                          type="date"
                          value={formData.dob}
                          onChange={handleChange}
                          max={new Date().toISOString().split('T')[0]}
                          className="!pl-[42px] bg-[#09090b] border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 rounded-[8px] h-10 transition-colors focus-visible:border-zinc-700 focus-visible:ring-1 focus-visible:ring-zinc-700 [color-scheme:dark]"
                        />
                      </div>
                      {validationErrors.dob && <span className="text-xs text-red-500 ml-1">{validationErrors.dob}</span>}
                    </div>
                  </>
                )}

                <div className="grid gap-[6px]">
                  <Label htmlFor="email" className="text-[14px] font-[600] text-zinc-200">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-zinc-500" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="!pl-[42px] bg-[#09090b] border border-zinc-800/80 text-[14px] text-zinc-200 placeholder:text-zinc-600 rounded-[8px] h-10 transition-colors focus-visible:border-zinc-700 focus-visible:ring-1 focus-visible:ring-zinc-700"
                    />
                  </div>
                  {validationErrors.email && <span className="text-xs text-red-500 ml-1">{validationErrors.email}</span>}
                </div>

                <div className="grid gap-[6px]">
                  <Label htmlFor="password" className="text-[14px] font-[600] text-zinc-200">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-zinc-500" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="!pl-[42px] pr-10 bg-[#09090b] border border-zinc-800/80 text-[14px] text-zinc-200 placeholder:text-zinc-600 rounded-[8px] h-10 transition-colors focus-visible:border-zinc-700 focus-visible:ring-1 focus-visible:ring-zinc-700"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex="-1"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors border-none bg-transparent cursor-pointer"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                  {validationErrors.password && <span className="text-xs text-red-500 ml-1">{validationErrors.password}</span>}
                </div>

                {isLogin && (
                  <div className="flex items-center justify-between mt-0.5 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember"
                        className="border-zinc-700 bg-transparent rounded-[4px] w-4 h-4 data-[state=checked]:bg-zinc-200 data-[state=checked]:text-black"
                      />
                      <Label htmlFor="remember" className="text-[14px] font-[600] text-zinc-400 cursor-pointer">
                        Remember me
                      </Label>
                    </div>
                    <Link to="/forgot-password" title="Forgot password link" className="text-[14px] font-[600] text-zinc-400 hover:text-zinc-200 transition-colors no-underline">
                      Forgot password?
                    </Link>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-4 rounded-lg text-center font-medium animate-in fade-in zoom-in duration-300">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full h-12 mt-6 rounded-[10px] bg-white text-black hover:bg-zinc-200 font-bold transition-colors shadow-none text-base">
                  {loading ? "Processing..." : "Continue"}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex items-center justify-center text-sm font-medium text-zinc-400 !pb-16 !px-12 border-none bg-transparent">
              <span className="opacity-80">{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
              <button
                type="button"
                onClick={switchMode}
                className="ml-1 text-white hover:text-zinc-200 font-bold border-none bg-transparent cursor-pointer"
              >
                {isLogin ? "Create one" : "Sign in here"}
              </button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}

