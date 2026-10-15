import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Plane,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  QrCode,
  Calendar,
  Layers,
  Wrench,
  Loader2,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { PostDeliveryInspectionModal } from '../components/PostDeliveryInspectionModal';

interface PublicDroneQRPageProps {
  onNavigate?: (page: string) => void;
}

export const PublicDroneQRPage: React.FC<PublicDroneQRPageProps> = ({ onNavigate }) => {
  const [droneId, setDroneId] = useState<string>('');
  const [droneData, setDroneData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInspectionModal, setShowInspectionModal] = useState(false);

  // Customer Feedback State
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('Airframe Observation');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  // Check if current user is an authorized operator/pilot
  const deliveryUser = (() => {
    try {
      const str = localStorage.getItem('iw_delivery_user');
      return str ? JSON.parse(str) : null;
    } catch {
      return null;
    }
  })();

  const canInspect = Boolean(
    deliveryUser && ['admin', 'fleet_manager', 'dispatcher', 'delivery', 'pilot'].includes(deliveryUser.role)
  );

  const handleSubmitCustomerFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackName.trim() || !feedbackContact.trim() || !feedbackMessage.trim()) {
      setFeedbackError('Please enter your name, contact details, and message.');
      return;
    }

    setSubmittingFeedback(true);
    setFeedbackError('');
    setFeedbackSuccess('');

    try {
      const isEmail = feedbackContact.includes('@');
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/expert-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'drone_qr_scan',
          name: feedbackName.trim(),
          email: isEmail ? feedbackContact.trim() : null,
          phone: !isEmail ? feedbackContact.trim() : null,
          drone_serial: droneData?.serial_number || droneId,
          order_id: droneData?.assigned_order || null,
          category: feedbackCategory,
          message: `[Drone QR Scan Feedback on ${droneId}] ${feedbackMessage.trim()}`,
          priority: 'normal'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback.');
      }

      setFeedbackSuccess('Thank you! Your feedback has been received by IndoFleet Support.');
      setFeedbackMessage('');
      setTimeout(() => setShowFeedbackForm(false), 3000);
    } catch (err: any) {
      setFeedbackError(err.message || 'Error submitting feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  useEffect(() => {
    const path = window.location.pathname;
    // URL pattern: /drone/:drone_id
    const parts = path.split('/').filter(Boolean);
    const id = parts[parts.indexOf('drone') + 1] || '';
    setDroneId(id);

    if (!id) {
      setError('No Drone ID provided in the scan URL.');
      setLoading(false);
      return;
    }

    const fetchDrone = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_BASE_URL}/api/delivery/public/drone/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Airframe link not valid or record has expired.');
        }
        setDroneData(data.drone);
      } catch (err: any) {
        setError(err.message || 'Unable to verify drone airframe.');
      } finally {
        setLoading(false);
      }
    };

    fetchDrone();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans antialiased">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
        {/* Top Header Badge */}
        <div className="p-6 text-center border-b border-slate-800 bg-gradient-to-b from-purple-900/30 via-slate-900 to-slate-900 relative">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#5a00b8]/20 border border-[#5a00b8]/40 flex items-center justify-center text-[#a855f7] mb-3 shadow-lg shadow-purple-950/50">
            <Plane className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Indo Fleet Verified Airframe</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">RPAV Airframe Verification</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            ID: {droneId ? droneId.toUpperCase() : 'UNKNOWN'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#a855f7]" />
              <p className="text-xs font-semibold">Verifying airframe credentials against central fleet register…</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Verification Link Not Valid</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                The requested airframe QR link is either invalid, revoked, or no matching drone record exists in the 700 RPAV registry.
              </p>
              <div className="pt-2 text-[11px] text-slate-500">
                Support: <span className="text-slate-300 font-mono">1800 572 7363</span>
              </div>
            </div>
          ) : droneData ? (
            <>
              {/* Approved Public Summary Fields */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                  <span className="text-xs text-slate-400 font-medium">Model / Specification</span>
                  <span className="text-xs font-bold text-white">{droneData.model_name || '700RPAV'}</span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                  <span className="text-xs text-slate-400 font-medium">Serial Number</span>
                  <span className="text-xs font-mono font-bold text-purple-300">{droneData.serial_number}</span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                  <span className="text-xs text-slate-400 font-medium">Current Airframe Condition</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      droneData.current_condition === 'GOOD'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {droneData.current_condition || 'GOOD'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                  <span className="text-xs text-slate-400 font-medium">Fleet Operational Status</span>
                  <span className="text-xs font-semibold capitalize text-slate-200">
                    {droneData.status === 'ready' ? 'Available for Sorties' : droneData.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Last Inspection Result</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {droneData.last_inspection_result || 'PASSED'}
                  </span>
                </div>
              </div>

              {/* Operator / Pilot Quick Actions */}
              {canInspect ? (
                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-200">Operator Tools Available</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                      {deliveryUser?.role}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInspectionModal(true)}
                    className="w-full py-2.5 rounded-xl bg-[#5a00b8] hover:bg-[#2e0066] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Conduct Post-Delivery Inspection</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 text-center leading-relaxed">
                  Notice: Public scanner view shows verified airframe condition summary. Customer identity and private sortie telemetry remain restricted.
                </div>
              )}

              {/* Customer QR Scan Feedback / Issue Reporting */}
              <div className="rounded-2xl bg-slate-800/50 border border-slate-700/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Customer Feedback & Support</h4>
                    <p className="text-[11px] text-slate-400">Report airframe observation or delivery inquiry</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
                  >
                    {showFeedbackForm ? 'Close' : 'Send Feedback'}
                  </button>
                </div>

                {showFeedbackForm && (
                  <form onSubmit={handleSubmitCustomerFeedback} className="pt-2 border-t border-slate-700/40 space-y-3">
                    {feedbackError && (
                      <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-[11px] text-rose-300">
                        {feedbackError}
                      </div>
                    )}
                    {feedbackSuccess && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-[11px] text-emerald-300">
                        {feedbackSuccess}
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        value={feedbackName}
                        onChange={(e) => setFeedbackName(e.target.value)}
                        placeholder="e.g. Aditi Sharma"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Contact Email or Mobile</label>
                      <input
                        type="text"
                        required
                        value={feedbackContact}
                        onChange={(e) => setFeedbackContact(e.target.value)}
                        placeholder="aditi@example.com or +91 9876543210"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Category</label>
                      <select
                        value={feedbackCategory}
                        onChange={(e) => setFeedbackCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="Safe Handover / Verified">Safe Handover / Verified Delivery</option>
                        <option value="Airframe Observation">Airframe Observation / Sound</option>
                        <option value="Delivery Package Issue">Delivery Package / Box Issue</option>
                        <option value="General Query">General Customer Query</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Details / Message</label>
                      <textarea
                        required
                        rows={3}
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        placeholder="Please share what you observed or any questions regarding this airframe or delivery..."
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="w-full py-2.5 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {submittingFeedback ? 'Submitting to Support...' : 'Submit to IndoFleet Support Desk'}
                    </button>
                  </form>
                )}
              </div>

              {/* Support & Contact Strip */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <a
                  href="tel:18005727363"
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-purple-400" />
                  <span>1800 572 7363</span>
                </a>
                <a
                  href="mailto:support@indowings.com"
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  <span>support@indowings.com</span>
                </a>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Modal for Logged-In Operator Inspection */}
      <PostDeliveryInspectionModal
        isOpen={showInspectionModal}
        onClose={() => setShowInspectionModal(false)}
        droneId={droneId}
        onSuccess={() => {
          // Re-fetch drone state
          window.location.reload();
        }}
      />
    </div>
  );
};
