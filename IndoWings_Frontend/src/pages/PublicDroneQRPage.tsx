import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  RefreshCw,
  BatteryCharging,
  Plane,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { API_BASE_URL, SUPPORT_EMAIL, SUPPORT_PHONE } from '../config/api';
import { PostDeliveryInspectionModal } from '../components/PostDeliveryInspectionModal';

interface PublicDroneQRPageProps {
  onNavigate?: (page: string) => void;
}

export const PublicDroneQRPage: React.FC<PublicDroneQRPageProps> = ({ onNavigate }) => {
  const [droneId, setDroneId] = useState<string>('');
  const [droneData, setDroneData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionSuccessMsg, setInspectionSuccessMsg] = useState('');

  // Staff Authentication State
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const str = localStorage.getItem('iw_delivery_user');
      return str ? JSON.parse(str) : null;
    } catch {
      return null;
    }
  });

  const canInspect = Boolean(
    currentUser && ['admin', 'fleet_manager', 'dispatcher', 'delivery', 'pilot'].includes(currentUser.role)
  );

  // Quick Staff Login Form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Extract Drone ID from URL path: /drone/:droneId

  useEffect(() => {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const id = parts[parts.indexOf('drone') + 1] || '';
    setDroneId(id);

    if (!id) {
      setError('No Drone ID provided in the scan URL.');
    }
  }, []);

  // Fetch Drone Data (Requires Staff Auth Token)
  
  const fetchDroneData = useCallback(async (tokenOverride?: string, isSilent = false) => {
    if (!droneId) return;
    const token = tokenOverride || localStorage.getItem('iw_delivery_token') || '';

    if (!token) {
      // Unauthenticated - do not make request to protect private flight assets
      return;
    }

    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError('');

      const res = await fetch(`${API_BASE_URL}/api/delivery/public/drone/${encodeURIComponent(droneId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (res.status === 401 || data.requires_auth) {
        // Staff token is invalid or expired
        localStorage.removeItem('iw_delivery_token');
        localStorage.removeItem('iw_delivery_user');
        setCurrentUser(null);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Airframe record not found or link expired.');
      }

      setDroneData(data.drone);
    } catch (err: any) {
      if (!isSilent) {
        setError(err.message || 'Unable to fetch airframe record.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [droneId]);

  // Load data once user is authenticated
  useEffect(() => {
    if (canInspect && droneId) {
      fetchDroneData();
    }
  }, [canInspect, droneId, fetchDroneData]);

  // Handle Quick Staff Login
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter your staff email/phone and password.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid credentials.');
      }

      const user = data.user;
      const token = data.token;

      if (!['admin', 'fleet_manager', 'dispatcher', 'delivery', 'pilot'].includes(user.role)) {
        throw new Error('Access Denied: This account is not authorized for airframe QC and flight operations.');
      }

      localStorage.setItem('iw_delivery_token', token);
      localStorage.setItem('iw_delivery_user', JSON.stringify(user));
      setCurrentUser(user);

      // Immediately fetch drone info with newly issued token
      await fetchDroneData(token);
    } catch (err: any) {
      setLoginError(err.message || 'Staff authentication failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleStaffLogout = () => {
    localStorage.removeItem('iw_delivery_token');
    localStorage.removeItem('iw_delivery_user');
    setCurrentUser(null);
    setDroneData(null);
  };

  const handleInspectionComplete = (inspection: any) => {
    setShowInspectionModal(false);
    setInspectionSuccessMsg(`Airframe inspection logged successfully (${inspection.overall_inspection || 'PASSED'}).`);
    fetchDroneData(undefined, true);
    setTimeout(() => setInspectionSuccessMsg(''), 6000);
  };

  // UNAUTHENTICATED / NORMAL SCANNER (RESTRICTED ASSET GATE)

  if (!canInspect) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased w-full pt-28 sm:pt-36 pb-20 px-4 sm:px-6 flex items-center justify-center relative overflow-hidden">
        {/* Subtle high-tech background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-20 right-1/4 w-[400px] h-[400px] bg-indigo-900/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md mx-auto space-y-6 relative z-10">
          
          {/* Access Restricted Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            
            {/* Shield & Lock Header */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-purple-950/80 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto shadow-inner shadow-purple-900/40">
                <Lock className="w-8 h-8 text-purple-400" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-bold tracking-wider uppercase">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Restricted Enterprise Asset</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                IndoWings Flight Operations
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                This QR tag is attached to an enterprise airframe asset. Public scanning and external tracking are disabled under IndoWings Flight Security protocols.
              </p>
            </div>

            {/* Quick Staff Login Form */}
            <div className="border-t border-slate-800/80 pt-5 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-purple-400">
                  <LogIn className="w-3.5 h-3.5" /> Authorized Staff Sign In
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Ground Crew &amp; QC</span>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleStaffLogin} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Staff Email / Phone
                  </label>
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="pilot@indowings.com"
                    autoComplete="username"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm focus:outline-hidden focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Security Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm focus:outline-hidden focus:border-purple-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#5a00b8] hover:bg-[#480094] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating Credentials…</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Sign In &amp; Unlock Airframe QC</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Support / Help link */}
            <div className="border-t border-slate-800/80 pt-4 text-center">
              <p className="text-[11px] text-slate-500">
                Technical queries or emergency fleet support:
              </p>
              <div className="text-xs text-slate-400 mt-1 space-x-2 font-mono">
                <span>{SUPPORT_PHONE}</span>
                <span>&bull;</span>
                <span>{SUPPORT_EMAIL}</span>
              </div>
            </div>

          </div>

          {/* Footer note */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('home');
                else window.location.href = '/';
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              &larr; Return to IndoWings Public Portal
            </button>
          </div>

        </div>
      </div>
    );
  }

  //AUTHENTICATED STAFF (AIRFRAME QC & OPERATIONS CONSOLE)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased w-full pt-28 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto space-y-6">

        {/* Staff Operations Header */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-50/60 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-100/90 border border-purple-200 flex items-center justify-center text-purple-700 shadow-xs shrink-0">
                <Plane className="w-7 h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-mono font-bold">
                    AIRFRAME ID: {droneId ? droneId.toUpperCase() : 'UNKNOWN'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Staff Verified
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  IndoWings Airframe Operations &amp; QC Suite
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Logged in as <strong className="text-slate-700">{currentUser?.name || currentUser?.email}</strong> ({currentUser?.role?.toUpperCase()})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => fetchDroneData(undefined, false)}
                disabled={loading || refreshing}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                title="Refresh Airframe Status"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-purple-600' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handleStaffLogout}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-slate-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Sign out of staff session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notification Banner */}
        {inspectionSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{inspectionSuccessMsg}</span>
          </div>
        )}

        {/* Loading / Error States */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center gap-3 text-slate-500 shadow-sm">
            <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
            <p className="text-sm font-bold text-slate-700">Connecting to IndoWings Fleet Registry…</p>
            <p className="text-xs text-slate-400">Loading airframe telemetry, hardware checks, and previous inspection history</p>
          </div>
        ) : error ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Airframe Record Unavailable</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              {error}
            </p>
          </div>
        ) : droneData ? (
          <div className="space-y-6">

            {/* Drone Vital Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">QC Status</span>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${
                    droneData.last_inspection_result === 'PASSED'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-amber-50 border border-amber-200 text-amber-700'
                  }`}>
                    {droneData.last_inspection_result === 'PASSED' ? 'SORTIE-READY PASSED' : 'PENDING QC VERIFICATION'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Physical verification required before sortie</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Model &amp; Serial</span>
                <p className="text-sm font-black text-slate-900 truncate">
                  {droneData.model_name || 'IndoWings 700 RPAV'}
                </p>
                <p className="text-[11px] font-mono text-slate-500">
                  S/N: {droneData.serial_number || 'N/A'}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Condition</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-slate-800">
                    {droneData.current_condition || 'Depot Serviceable'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Status: {droneData.status || 'idle'}</p>
              </div>
            </div>

            {/* Run Airframe QC Primary Action */}
            <div className="bg-gradient-to-br from-purple-900 to-[#3b0078] rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 border border-white/20 text-purple-200 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Physical Pre-Flight / Post-Delivery Verification</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Execute Airframe Hardware Checklist
                  </h2>
                  <p className="text-xs sm:text-sm text-purple-200 leading-relaxed">
                    Perform physical verification of motor arm locking pins, avionics seals, propeller torques, and payload latches for {droneData.drone_id}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowInspectionModal(true)}
                  className="px-6 py-3.5 rounded-2xl bg-white hover:bg-purple-50 text-[#5a00b8] font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Wrench className="w-4 h-4 text-[#5a00b8]" />
                  <span>Launch Inspection Form</span>
                </button>
              </div>
            </div>

            {/* Linked Logistics / Sortie Details if assigned */}
            {droneData.assigned_order && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Layers className="w-4 h-4 text-purple-700" />
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      Assigned Flight / Delivery Mission
                    </h3>
                  </div>
                  <span className="px-3 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold">
                    Order #{droneData.order_number || droneData.assigned_order}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block mb-0.5 font-bold uppercase text-[10px]">Mission Pilot / Driver</span>
                    <span className="text-slate-800 font-bold">{droneData.assigned_pilot_name || 'Unassigned'}</span>
                    {droneData.assigned_pilot_phone && (
                      <span className="text-slate-500 block text-[11px] font-mono">{droneData.assigned_pilot_phone}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 font-bold uppercase text-[10px]">Destination Hub</span>
                    <span className="text-slate-800 font-bold">{droneData.drop_address || 'Depot Hub'}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : null}

        {/* Modal for Performing Physical QC Checklist */}
        {showInspectionModal && (
          <PostDeliveryInspectionModal
            isOpen={showInspectionModal}
            onClose={() => setShowInspectionModal(false)}
            droneId={droneId}
            onSuccess={handleInspectionComplete}
          />
        )}

      </div>
    </div>
  );
};
