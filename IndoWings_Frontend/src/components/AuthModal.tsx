import React, { useState, useRef, useEffect } from 'react';
import { X, Mail, Phone, Lock, Loader2, Shield, ArrowRight, RotateCcw, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export interface SavedAddress {
  id: string;
  label: 'Home' | 'Work' | 'Office' | 'Warehouse' | 'Other';
  recipient_name?: string;
  recipient_phone?: string;
  full_address: string;
  landmark?: string;
  city?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
}

export interface DeliveryUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'fleet_manager' | 'dispatcher' | 'customer' | 'support';
  station?: string;
  organization?: string;
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  saved_addresses?: SavedAddress[];
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: DeliveryUser, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpDestination, setOtpDestination] = useState('');
  const [detectedRole, setDetectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let t: any = null;
    if (otpStep && resendTimer > 0) {
      t = setInterval(() => setResendTimer(p => p - 1), 1000);
    }
    return () => clearInterval(t);
  }, [otpStep, resendTimer]);

  if (!isOpen) return null;

  const handleSendOtp = async (targetId?: string) => {
    const val = (targetId || identifier).trim();
    if (!val) {
      setError('Please enter your registered email address or mobile number');
      return;
    }

    const isEmail = val.includes('@');
    const cleanPhone = val.replace(/[^0-9]/g, '').slice(-10);

    if (!isEmail && cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number or email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEmail ? { email: val } : { phone: cleanPhone })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Account not found or access denied');
        return;
      }

      setOtpDestination(data.destination || val);
      setDetectedRole(data.role || null);
      setOtpStep(true);
      setResendTimer(60);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150);
    } catch {
      setError('Could not connect to authentication service. Verify backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter the complete 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');

    const isEmail = identifier.includes('@');
    const cleanPhone = identifier.replace(/[^0-9]/g, '').slice(-10);

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: isEmail ? identifier.trim() : undefined,
          phone: !isEmail ? cleanPhone : undefined,
          otp: fullOtp
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid verification code');
        return;
      }

      onSuccess(data.user, data.token);
      onClose();
    } catch {
      setError('Verification failed. Server connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors p-1">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#3b0080] to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/20 text-white">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-[#171222] text-lg leading-tight">Operations Portal</h3>
            <p className="text-xs text-slate-500 font-medium">Enterprise Drone Delivery & Fleet Control</p>
          </div>
        </div>

        {!otpStep ? (
          <div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Registered Mobile or Email
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={e => { setIdentifier(e.target.value); setError(''); }}
                    placeholder="Enter registered corporate email or mobile"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100"
                    onKeyDown={e => { if (e.key === 'Enter') handleSendOtp(); }}
                  />
                </div>
              </div>

              {error && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3 font-medium">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={loading}
                className="w-full py-3.5 bg-[#3b0080] hover:bg-[#2d006b] text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{loading ? 'Verifying Authorization...' : 'Send Secure OTP'}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>


          </div>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center pb-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-[#3b0080] mb-2">
                {detectedRole ? `Role: ${detectedRole.replace('_', ' ')}` : 'Authorized'}
              </span>
              <p className="text-xs text-slate-600">
                Enter the 6-digit OTP code dispatched to <br />
                <strong className="text-slate-900 font-bold">{otpDestination}</strong>
              </p>
            </div>

            {/* 6-digit inputs */}
            <div className="flex justify-center gap-2">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => otpInputsRef.current[idx] = el}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    const copy = [...otpDigits];
                    copy[idx] = val;
                    setOtpDigits(copy);
                    if (val && idx < 5) otpInputsRef.current[idx + 1]?.focus();
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
                      otpInputsRef.current[idx - 1]?.focus();
                    }
                  }}
                  className="w-11 h-13 text-center text-lg font-black border border-slate-200 rounded-xl focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100 bg-slate-50"
                />
              ))}
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3 font-medium text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otpDigits.join('').length < 6}
              className="w-full py-3.5 bg-[#3b0080] hover:bg-[#2d006b] text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{loading ? 'Authenticating...' : 'Verify OTP & Enter'}</span>
            </button>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <button
                type="button"
                onClick={() => setOtpStep(false)}
                className="hover:text-slate-800 font-medium"
              >
                Change ID / Mobile
              </button>
              <button
                type="button"
                disabled={resendTimer > 0}
                onClick={() => handleSendOtp()}
                className="text-[#3b0080] font-bold hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
