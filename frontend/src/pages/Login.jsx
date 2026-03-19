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
  ArrowRight,
} from "lucide-react";

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
    <section className="fixed inset-0 bg-zinc-950 text-zinc-50 overflow-y-auto">
      <style>{`
        .accent-lines{position:absolute;inset:0;pointer-events:none;opacity:.7}
        .hline,.vline{position:absolute;background:#27272a;will-change:transform,opacity}
        .hline{left:0;right:0;height:1px;transform:scaleX(0);transform-origin:50% 50%;animation:drawX .8s cubic-bezier(.22,.61,.36,1) forwards}
        .vline{top:0;bottom:0;width:1px;transform:scaleY(0);transform-origin:50% 0%;animation:drawY .9s cubic-bezier(.22,.61,.36,1) forwards}
        .hline:nth-child(1){top:18%;animation-delay:.12s}
        .hline:nth-child(2){top:50%;animation-delay:.22s}
        .hline:nth-child(3){top:82%;animation-delay:.32s}
        .vline:nth-child(4){left:22%;animation-delay:.42s}
        .vline:nth-child(5){left:50%;animation-delay:.54s}
        .vline:nth-child(6){left:78%;animation-delay:.66s}
        .hline::after,.vline::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(250,250,250,.24),transparent);opacity:0;animation:shimmer .9s ease-out forwards}
        .hline:nth-child(1)::after{animation-delay:.12s}
        .hline:nth-child(2)::after{animation-delay:.22s}
        .hline:nth-child(3)::after{animation-delay:.32s}
        .vline:nth-child(4)::after{animation-delay:.42s}
        .vline:nth-child(5)::after{animation-delay:.54s}
        .vline:nth-child(6)::after{animation-delay:.66s}
        @keyframes drawX{0%{transform:scaleX(0);opacity:0}60%{opacity:.95}100%{transform:scaleX(1);opacity:.7}}
        @keyframes drawY{0%{transform:scaleY(0);opacity:0}60%{opacity:.95}100%{transform:scaleY(1);opacity:.7}}
        @keyframes shimmer-line{0%{opacity:0}35%{opacity:.25}100%{opacity:0}}

        .card-animate {
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.8s cubic-bezier(.22,.61,.36,1) 0.4s forwards;
        }
        @keyframes fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

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
      {loading && !showWelcome && !showOtpScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
           <div className="text-center">
               <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-zinc-50 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
               <h2 className="mt-4 text-xl font-semibold tracking-tight text-zinc-50">Setting things up...</h2>
           </div>
        </div>
      )}

      {showWelcome && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg transition-all duration-1000">
            <span className="text-6xl mb-6">✨</span>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-50">WELCOME</h1>
            <h2 className="text-2xl mt-2 text-zinc-400 font-light tracking-wider uppercase">{username}</h2>
        </div>
      )}

      {showOtpScreen && (
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
      )}

      {/* Main Login Card */}
      <div className="min-h-screen w-full grid place-items-center px-4 py-12 relative z-10">
        <Card className="card-animate w-full max-w-sm border-zinc-800 bg-zinc-900/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {isLogin ? 'Sign in to access your dashboard' : 'Join us to start recruiting smarter'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="grid gap-5">
              
              {!isLogin && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="fullName" className="text-zinc-300">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={handleChange}
                        className={`pl-10 bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 ${validationErrors.fullName ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {validationErrors.fullName && <span className="text-xs text-red-400">{validationErrors.fullName}</span>}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dob" className="text-zinc-300">Date of Birth</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="dob"
                        name="dob"
                        type="date"
                        value={formData.dob}
                        onChange={handleChange}
                        max={new Date().toISOString().split('T')[0]}
                        className={`pl-10 bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 ${validationErrors.dob ? 'border-red-500' : ''}`}
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                    {validationErrors.dob && <span className="text-xs text-red-400">{validationErrors.dob}</span>}
                  </div>
                </>
              )}

              <div className="grid gap-2">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={`pl-10 bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 ${validationErrors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {validationErrors.email && <span className="text-xs text-red-400">{validationErrors.email}</span>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password" className="text-zinc-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className={`pl-10 pr-10 bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 ${validationErrors.password ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    tabIndex="-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-zinc-400 hover:text-zinc-200"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {validationErrors.password && <span className="text-xs text-red-400">{validationErrors.password}</span>}
              </div>

              {!isLogin && (
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`pl-10 pr-10 bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        tabIndex="-1"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-zinc-400 hover:text-zinc-200"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {validationErrors.confirmPassword && <span className="text-xs text-red-400">{validationErrors.confirmPassword}</span>}
                  </div>
              )}

              {isLogin && (
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember"
                        className="border-zinc-700 data-[state=checked]:bg-zinc-50 data-[state=checked]:text-zinc-900"
                      />
                      <Label htmlFor="remember" className="text-zinc-400 font-normal">
                        Remember me
                      </Label>
                    </div>
                    <Link to="/forgot-password" className="text-sm text-zinc-300 hover:text-zinc-100 transition-colors">
                      Forgot password?
                    </Link>
                  </div>
              )}

              {error && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-300 text-sm p-3 rounded-md text-center">
                    {error}
                  </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-10 rounded-lg bg-zinc-50 text-zinc-900 hover:bg-zinc-200 font-semibold shadow-md active:scale-[0.98] transition-all">
                {loading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
              </Button>

            </CardContent>

            <CardFooter className="flex items-center justify-center text-sm text-zinc-400 pb-8">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button 
                  type="button" 
                  onClick={switchMode}
                  className="ml-1.5 text-zinc-200 hover:text-white font-medium hover:underline focus:outline-none"
              >
                {isLogin ? "Create one" : "Sign in here"}
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </section>
  );
}
