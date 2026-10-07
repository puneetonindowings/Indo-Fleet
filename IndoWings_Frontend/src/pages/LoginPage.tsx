import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  ArrowRight,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  Zap,
  Package,
  ShieldAlert,
} from 'lucide-react';
import { DeliveryUser } from '../types';
import { API_BASE_URL } from '../config/api';
import PhoneInput from '../components/PhoneInput';

interface LoginPageProps {
  onNavigate: (page: string) => void;
  onSuccess: (user: DeliveryUser, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onSuccess }) => {
  // Automatically forward logged in users to their role dashboard
  useEffect(() => {
    const token = localStorage.getItem('iw_delivery_token');
    const userStr = localStorage.getItem('iw_delivery_user');
    if (token && userStr) {
      try {
        const u = JSON.parse(userStr) as DeliveryUser;
        if (u.role === 'admin') {
          onNavigate('admin');
          window.history.pushState({}, '', '/admin');
        } else if (u.role === 'fleet_manager') {
          onNavigate('fleet');
          window.history.pushState({}, '', '/fleet');
        } else if (u.role === 'dispatcher') {
          onNavigate('dispatch');
          window.history.pushState({}, '', '/dispatch');
        } else if (u.role === 'support') {
          onNavigate('support-desk');
          window.history.pushState({}, '', '/support-desk');
        } else if (u.role === 'customer') {
          onNavigate('shop');
          window.history.pushState({}, '', '/shop');
        } else {
          onNavigate('profile');
          window.history.pushState({}, '', '/profile');
        }
      } catch {}
    }
  }, [onNavigate]);

  // Login method: 'email' or 'phone'
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

  // Email verification and password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifiedEmailUser, setVerifiedEmailUser] = useState<{
    name: string;
    role: string;
    email: string;
    station?: string;
  } | null>(null);

  // Phone verification state
  const [phone, setPhone] = useState('');
  const [verifiedPhoneUser, setVerifiedPhoneUser] = useState<{
    name: string;
    role: string;
    phone: string;
    station?: string;
  } | null>(null);
  const [phoneAuthMode, setPhoneAuthMode] = useState<'password' | 'otp'>('password');

  // Phone + OTP state
  const [otpStep, setOtpStep] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpDestination, setOtpDestination] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Status & loading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [otpInputsRef] = [useRef<(HTMLInputElement | null)[]>([])];

  // First-time login mandatory password change state
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<DeliveryUser | null>(null);
  const [pendingToken, setPendingToken] = useState<string>('');
  const [ftChannel, setFtChannel] = useState<'email' | 'phone'>('email');
  const [ftOtpSent, setFtOtpSent] = useState(false);
  const [ftOtp, setFtOtp] = useState('');
  const [ftNewPass, setFtNewPass] = useState('');
  const [ftConfirmPass, setFtConfirmPass] = useState('');
  const [ftLoading, setFtLoading] = useState(false);
  const [ftError, setFtError] = useState('');

  const handleSendFirstTimeOtp = async () => {
    if (!pendingUser) return;
    setFtLoading(true);
    setFtError('');
    try {
      const target = ftChannel === 'email' ? pendingUser.email : pendingUser.phone;
      const res = await fetch(`${API_BASE_URL}/api/delivery/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ftChannel === 'email'
          ? { email: target, purpose: 'first-time-password' }
          : { phone: target, purpose: 'first-time-password' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFtError(data.error || 'Failed to dispatch verification code');
        return;
      }
      setFtOtpSent(true);
    } catch {
      setFtError('Connection error sending security code.');
    } finally {
      setFtLoading(false);
    }
  };

  const handleCompleteFirstTimePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    if (!ftOtp.trim()) {
      setFtError('Please enter the 6-digit OTP code.');
      return;
    }
    if (ftNewPass.length < 6) {
      setFtError('New permanent password must be at least 6 characters.');
      return;
    }
    if (ftNewPass !== ftConfirmPass) {
      setFtError('Passwords do not match. Please verify.');
      return;
    }

    setFtLoading(true);
    setFtError('');

    try {
      const target = ftChannel === 'email' ? pendingUser.email : pendingUser.phone;
      const res = await fetch(`${API_BASE_URL}/api/delivery/auth/first-time-change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: pendingUser.id,
          target,
          otp: ftOtp.trim(),
          newPassword: ftNewPass.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFtError(data.error || 'Failed to update permanent password.');
        return;
      }

      const finalUser = data.user;
      const finalToken = data.token;
      localStorage.setItem('iw_delivery_token', finalToken);
      localStorage.setItem('iw_delivery_user', JSON.stringify(finalUser));

      onSuccess(finalUser, finalToken);
      routeByRole(finalUser);
    } catch {
      setFtError('Connection error updating security password.');
    } finally {
      setFtLoading(false);
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (otpStep && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpStep, resendTimer]);

  const routeByRole = (user: DeliveryUser) => {
    if (user.role === 'admin') {
      onNavigate('admin');
      window.history.pushState({}, '', '/admin');
    } else if (user.role === 'fleet_manager') {
      onNavigate('fleet');
      window.history.pushState({}, '', '/fleet');
    } else if (user.role === 'dispatcher') {
      onNavigate('dispatch');
      window.history.pushState({}, '', '/dispatch');
    } else if (user.role === 'support') {
      onNavigate('support-desk');
      window.history.pushState({}, '', '/support-desk');
    } else if (user.role === 'customer') {
      onNavigate('shop');
      window.history.pushState({}, '', '/shop');
    } else {
      onNavigate('home');
      window.history.pushState({}, '', '/');
    }
  };

  // 1. STEP 1: VERIFY IF EMAIL EXISTS IN DATABASE
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your authorized corporate email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/auth/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok || !data.exists) {
        setError(data.error || 'Access Denied: This email is not registered. Please contact Administrator for ID provisioning.');
        return;
      }

      setVerifiedEmailUser(data);
      setPassword('');
      setError('');
    } catch {
      setError('Cannot connect to authentication server. Please ensure backend service is running.');
    } finally {
      setLoading(false);
    }
  };

  // 2. STEP 2: EMAIL + PASSWORD LOGIN
  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanPass) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Access Denied: Invalid password.');
        return;
      }

      const user: DeliveryUser = data.user;
      const token: string = data.token;

      if (data.must_change_password) {
        setPendingUser(user);
        setPendingToken(token);
        setShowFirstTimeModal(true);
        setFtChannel('email');
        return;
      }

      localStorage.setItem('iw_delivery_token', token);
      localStorage.setItem('iw_delivery_user', JSON.stringify(user));

      onSuccess(user, token);
      routeByRole(user);
    } catch {
      setError('Cannot connect to authentication server. Please ensure backend service is running.');
    } finally {
      setLoading(false);
    }
  };

  // 3. STEP 1 FOR PHONE: VERIFY IF MOBILE NUMBER EXISTS
  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/auth/check-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await res.json();
      if (!res.ok || !data.exists) {
        setError(data.error || 'Access Denied: Mobile number not registered. Please contact Administrator for ID provisioning.');
        return;
      }

      setVerifiedPhoneUser(data);
      setPassword('');
      setError('');
    } catch {
      setError('Cannot connect to authentication server. Please check backend service.');
    } finally {
      setLoading(false);
    }
  };

  // 4. STEP 2 FOR PHONE: PASSWORD LOGIN
  const handlePhonePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    const cleanPass = password.trim();

    if (!cleanPass) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, password: cleanPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Access Denied: Invalid credentials or password.');
        return;
      }

      const user: DeliveryUser = data.user;
      const token: string = data.token;

      if (data.must_change_password) {
        setPendingUser(user);
        setPendingToken(token);
        setShowFirstTimeModal(true);
        setFtChannel('phone');
        return;
      }

      localStorage.setItem('iw_delivery_token', token);
      localStorage.setItem('iw_delivery_user', JSON.stringify(user));

      onSuccess(user, token);
      routeByRole(user);
    } catch {
      setError('Cannot connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  // 5. PHONE SMS OTP REQUEST
  const handleSendPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Access Denied: Phone number not registered. Please contact Administrator.');
        return;
      }

      setOtpDestination(data.destination || `+91 ${cleanPhone}`);
      setOtpStep(true);
      setResendTimer(60);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150);
    } catch {
      setError('Cannot connect to authentication server. Please verify backend service.');
    } finally {
      setLoading(false);
    }
  };

  // 6. PHONE SMS OTP VERIFICATION
  const handleVerifyPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the OTP code.');
      return;
    }

    setLoading(true);
    setError('');

    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          otp: fullOtp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid or expired verification code.');
        return;
      }

      const user: DeliveryUser = data.user;
      const token: string = data.token;

      if (data.must_change_password) {
        setPendingUser(user);
        setPendingToken(token);
        setShowFirstTimeModal(true);
        setFtChannel('phone');
        return;
      }

      localStorage.setItem('iw_delivery_token', token);
      localStorage.setItem('iw_delivery_user', JSON.stringify(user));

      onSuccess(user, token);
      routeByRole(user);
    } catch {
      setError('Verification connection failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const char = val.slice(-1);
    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);

    if (char && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handlePasteOtp = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const updated = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        updated[i] = pasted[i] || '';
      }
      setOtpDigits(updated);
      const nextFocus = Math.min(pasted.length, 5);
      otpInputsRef.current[nextFocus]?.focus();
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* ── LEFT: Classic Enterprise Branding Panel ─────────────────── */}
      <div
        className="hidden lg:flex lg:w-[46%] flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #101222 0%, #191b30 55%, #0d0e1a 100%)',
        }}
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Ambient atmospheric glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}
        />

        {/* Top brand header */}
        <div className="relative z-10">
          <button
            onClick={() => {
              onNavigate('home');
              window.history.pushState({}, '', '/');
            }}
            className="flex items-center gap-2 text-white/60 hover:text-white text-xs font-bold transition-colors mb-10 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Home</span>
          </button>

          <img src="/indofleet-logo-white.svg" alt="IndoFleet" className="h-9 w-auto mb-8" />

          <h1 className="text-3xl xl:text-4xl font-black text-white leading-tight mb-4 tracking-tight">
            Autonomous Drone Fleet Operations Gateway
          </h1>

          <p className="text-white/70 text-sm leading-relaxed max-w-md">
            Sign in with your enterprise credentials to access your designated role workspace for flight telemetry, QC compliance, and corridor dispatch.
          </p>
        </div>

        {/* Operational Roles Overview */}
        <div className="relative z-10 space-y-3 my-8">
          {[
            {
              icon: Zap,
              title: 'Real-Time Flight Telemetry',
              desc: 'Live corridor route tracking and waypoint milestones',
            },
            {
              icon: Shield,
              title: 'Multi-Point Hardware QC',
              desc: 'Avionics diagnostics, battery impedance, and DGCA NPNT',
            },
            {
              icon: Package,
              title: 'Digital Technical Handover',
              desc: 'Serial verification and digital acceptance challan sign-off',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 backdrop-blur-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white text-xs font-bold">{title}</p>
                <p className="text-white/50 text-[11px] mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-[11px] text-white/40">
          Copyright &copy; 2026 IndoWings. All rights reserved.
        </div>
      </div>

      {/* ── RIGHT: Form Panel ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-20 bg-white py-12">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
          <img src="/indofleet-logo-dark.svg" alt="IndoFleet" className="h-7 w-auto" />
          <button
            onClick={() => {
              onNavigate('home');
              window.history.pushState({}, '', '/');
            }}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>

        <div className="w-full max-w-md mx-auto">
          {showFirstTimeModal && pendingUser ? (
            <div className="animate-in fade-in slide-in-from-right-3 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-5 shadow-sm">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                Mandatory Security Setup
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                First-Time Password Reset
              </h2>
              <p className="text-slate-500 text-xs mt-1 mb-6 leading-relaxed">
                Welcome <span className="font-bold text-slate-900">{pendingUser.name}</span> ({pendingUser.role.toUpperCase()}).
                Your account was provisioned with a temporary passkey. You must verify identity via OTP and set a permanent password to continue.
              </p>

              {/* Channel Selector: Email or Phone */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Send Verification OTP To
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFtChannel('email');
                      setFtOtpSent(false);
                      setFtError('');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      ftChannel === 'email'
                        ? 'border-[#191b30] bg-slate-50 ring-2 ring-[#191b30]/15'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Mail className={`w-4 h-4 ${ftChannel === 'email' ? 'text-[#191b30]' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-slate-900">Email</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-1">{pendingUser.email || 'N/A'}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFtChannel('phone');
                      setFtOtpSent(false);
                      setFtError('');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      ftChannel === 'phone'
                        ? 'border-[#191b30] bg-slate-50 ring-2 ring-[#191b30]/15'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Phone className={`w-4 h-4 ${ftChannel === 'phone' ? 'text-[#191b30]' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-slate-900">SMS / Mobile</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-1">+91 {pendingUser.phone || 'N/A'}</p>
                  </button>
                </div>
              </div>

              {!ftOtpSent ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    Click below to generate an authorized one-time security passkey sent to your selected delivery channel.
                  </div>
                  {ftError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium text-center">
                      {ftError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSendFirstTimeOtp}
                    disabled={ftLoading}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#191b30] hover:bg-[#252945] transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {ftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    <span>{ftLoading ? 'Sending OTP...' : 'Send Security OTP'}</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCompleteFirstTimePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      6-Digit Security OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={ftOtp}
                      onChange={(e) => setFtOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Enter 6-digit OTP"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center tracking-widest font-mono text-lg font-bold text-slate-900 focus:outline-none focus:border-[#191b30] focus:ring-4 focus:ring-slate-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Create Permanent Password
                    </label>
                    <input
                      type="password"
                      value={ftNewPass}
                      onChange={(e) => setFtNewPass(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#191b30] focus:ring-4 focus:ring-slate-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Confirm Permanent Password
                    </label>
                    <input
                      type="password"
                      value={ftConfirmPass}
                      onChange={(e) => setFtConfirmPass(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#191b30] focus:ring-4 focus:ring-slate-100"
                      required
                    />
                  </div>

                  {ftError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium text-center">
                      {ftError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={ftLoading || ftOtp.length !== 6 || !ftNewPass || ftNewPass !== ftConfirmPass}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {ftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{ftLoading ? 'Saving Password...' : 'Verify OTP & Activate Account'}</span>
                  </button>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <button
                      type="button"
                      onClick={handleSendFirstTimeOtp}
                      className="text-[#191b30] font-bold hover:underline"
                    >
                      Resend OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFirstTimeModal(false);
                        setPendingUser(null);
                        setPendingToken('');
                        setFtOtpSent(false);
                        setFtOtp('');
                        setFtNewPass('');
                        setFtConfirmPass('');
                      }}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      Cancel & Return
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <>
              {/* Header icon & title */}
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-5 shadow-sm">
                <KeyRound className="w-6 h-6 text-slate-800" />
              </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Sign In to IndoFleet
          </h2>
          <p className="text-slate-500 text-sm mt-1 mb-6 leading-relaxed">
            Enter your corporate credentials to securely access your operations terminal.
          </p>

          {/* Login Method Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('email');
                setError('');
                setOtpStep(false);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'email'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Access</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('phone');
                setError('');
                setOtpStep(false);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMethod === 'phone'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Mobile Access</span>
            </button>
          </div>

          {/* ── METHOD 1: EMAIL (TWO-STEP: VERIFY ACCOUNT -> ENTER PASSWORD) ── */}
          {authMethod === 'email' && (
            <div className="space-y-4">
              {!verifiedEmailUser ? (
                // Step 1: Verify Email
                <form onSubmit={handleVerifyEmail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Corporate Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError('');
                        }}
                        required
                        placeholder="name@indowings.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#191b30] focus:ring-4 focus:ring-slate-100 transition-all font-medium"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Enter your authorized corporate email to verify identity.
                    </p>
                  </div>

                  {error && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium leading-relaxed">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#191b30] hover:bg-[#252945] transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] mt-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    <span>{loading ? 'Verifying Account...' : 'Continue to Password'}</span>
                  </button>
                </form>
              ) : (
                // Step 2: Account Verified -> Enter Password
                <form onSubmit={handleEmailPasswordLogin} className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                  {/* Verified Personnel Card */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-950 truncate">
                          {verifiedEmailUser.name}
                        </p>
                        <p className="text-[10.5px] text-emerald-700 capitalize font-medium truncate">
                          {verifiedEmailUser.role.replace('_', ' ')} &bull; {verifiedEmailUser.email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVerifiedEmailUser(null);
                        setPassword('');
                        setError('');
                      }}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline px-2 py-1 shrink-0 ml-2"
                    >
                      Change
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Account Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                        }}
                        autoFocus
                        required
                        placeholder="Enter your account password"
                        className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#191b30] focus:ring-4 focus:ring-slate-100 transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium leading-relaxed">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !password.trim()}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#191b30] hover:bg-[#252945] transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] mt-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    <span>{loading ? 'Authenticating...' : 'Sign In to Terminal'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── METHOD 2: MOBILE (TWO-STEP: VERIFY ACCOUNT -> PASSWORD OR OTP) ── */}
          {authMethod === 'phone' && (
            <div className="space-y-4">
              {!verifiedPhoneUser ? (
                // Step 1: Verify Mobile
                <form onSubmit={handleVerifyPhone} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Registered Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <PhoneInput
                        value={phone}
                        onChange={(v) => { setPhone(v); setError(''); }}
                        required
                        maxLength={15}
                        placeholder="Mobile number"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Enter your provisioned phone number to verify identity.
                    </p>
                  </div>

                  {error && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium leading-relaxed">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || phone.replace(/[^0-9]/g, '').length < 10}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#191b30] hover:bg-[#252945] transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] mt-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    <span>{loading ? 'Verifying Number...' : 'Continue to Sign In'}</span>
                  </button>
                </form>
              ) : !otpStep ? (
                // Step 2: Account Verified -> Password or OTP Choice
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                  {/* Verified Personnel Card */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-950 truncate">
                          {verifiedPhoneUser.name}
                        </p>
                        <p className="text-[10.5px] text-emerald-700 capitalize font-medium truncate">
                          {verifiedPhoneUser.role.replace('_', ' ')} &bull; +91 {phone.slice(-10)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVerifiedPhoneUser(null);
                        setOtpStep(false);
                        setPassword('');
                        setError('');
                      }}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline px-2 py-1 shrink-0 ml-2"
                    >
                      Change
                    </button>
                  </div>

                  {phoneAuthMode === 'password' ? (
                    <form onSubmit={handlePhonePasswordLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                          Account Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setError('');
                            }}
                            autoFocus
                            required
                            placeholder="Enter your account password"
                            className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#191b30] focus:ring-4 focus:ring-slate-100 transition-all font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium leading-relaxed">
                          {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading || !password.trim()}
                        className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#191b30] hover:bg-[#252945] transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] mt-2"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4" />
                        )}
                        <span>{loading ? 'Authenticating...' : 'Sign In with Password'}</span>
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPhoneAuthMode('otp');
                            setError('');
                            handleSendPhoneOtp();
                          }}
                          className="text-xs font-bold text-[#191b30] hover:underline"
                        >
                          Or sign in with SMS OTP instead &rarr;
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => handleSendPhoneOtp()}
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#191b30] hover:bg-[#252945] transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Phone className="w-4 h-4" />
                        )}
                        <span>Send 6-Digit SMS OTP</span>
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPhoneAuthMode('password');
                            setError('');
                          }}
                          className="text-xs font-bold text-[#191b30] hover:underline"
                        >
                          &larr; Back to Password Sign In
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Step 3 (OTP Verification)
                <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                  <button
                    onClick={() => {
                      setOtpStep(false);
                      setError('');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#191b30] mb-4 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to sign in options</span>
                  </button>

                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    Enter Verification Code
                  </h3>
                  <p className="text-slate-500 text-xs mt-1 mb-5">
                    We sent a 6-digit SMS OTP to{' '}
                    <span className="font-bold text-slate-900">{otpDestination}</span>
                  </p>

                  <form onSubmit={handleVerifyPhoneOtp} className="space-y-5">
                    <div>
                      <div
                        className="flex gap-2 sm:gap-3 justify-center"
                        onPaste={handlePasteOtp}
                      >
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => (otpInputsRef.current[idx] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                            className="w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-bold text-slate-900 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#191b30] focus:ring-4 focus:ring-slate-100 transition-all bg-slate-50/50"
                          />
                        ))}
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium text-center">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || otpDigits.join('').length !== 6}
                      className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#191b30] hover:bg-[#252945] transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>{loading ? 'Verifying...' : 'Verify & Continue'}</span>
                    </button>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span>Didn't receive SMS?</span>
                      {canResend ? (
                        <button
                          type="button"
                          onClick={() => handleSendPhoneOtp()}
                          className="font-bold text-[#191b30] hover:underline"
                        >
                          Resend OTP
                        </button>
                      ) : (
                        <span className="text-slate-400">Resend in {resendTimer}s</span>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Clean Enterprise Assistance */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            <span>Need assistance with your account? </span>
            <a
              href="/support"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('support');
                window.history.pushState({}, '', '/support');
              }}
              className="text-[#191b30] font-semibold hover:underline"
            >
              Contact Support Desk
            </a>
          </div>
        </>
      )}
    </div>
      </div>
    </div>
  );
};
