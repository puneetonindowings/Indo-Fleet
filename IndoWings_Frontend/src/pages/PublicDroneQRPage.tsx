import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Plane,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  QrCode,
  Wrench,
  Loader2,
  UserCheck,
  CheckSquare,
  AlertCircle,
  Camera,
  Video,
  X,
  FileCheck2,
  Zap,
  Gauge,
  Compass,
  Radio,
  Clock,
  Sparkles
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { PostDeliveryInspectionModal } from '../components/PostDeliveryInspectionModal';

interface PublicDroneQRPageProps {
  onNavigate?: (page: string) => void;
}

interface UploadedMedia {
  name: string;
  type: string;
  size: number;
  data: string; // base64
  previewUrl: string;
}

export const PublicDroneQRPage: React.FC<PublicDroneQRPageProps> = ({ onNavigate }) => {
  const [droneId, setDroneId] = useState<string>('');
  const [droneData, setDroneData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInspectionModal, setShowInspectionModal] = useState(false);

  // Customer Feedback & Support Form State
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [selectedPartIssue, setSelectedPartIssue] = useState('Cargo Bay & Electronic Latch');
  const [customIssueText, setCustomIssueText] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
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

  // Media file upload handler (Photos and Videos)
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - uploadedMedia.length;
    if (remainingSlots <= 0) {
      setFeedbackError('Maximum 5 photos/videos allowed per inquiry.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      // 25MB file size limit
      if (file.size > 25 * 1024 * 1024) {
        setFeedbackError(`File "${file.name}" exceeds the 25 MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        const newMedia: UploadedMedia = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64Data,
          previewUrl: file.type.startsWith('image/') ? base64Data : ''
        };
        setUploadedMedia((prev) => [...prev, newMedia]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeMedia = (index: number) => {
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
  };

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
      const issueCategory = selectedPartIssue === 'Other / Unlisted Issue'
        ? (customIssueText.trim() ? `Custom Issue: ${customIssueText.trim()}` : 'Other Unlisted Issue')
        : selectedPartIssue;

      const res = await fetch(`${API_BASE_URL}/api/delivery/support/expert-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'customer_qr_scan',
          name: feedbackName.trim(),
          email: isEmail ? feedbackContact.trim() : null,
          phone: !isEmail ? feedbackContact.trim() : null,
          drone_serial: droneData?.serial_number || droneId,
          order_id: droneData?.assigned_order || null,
          category: `Drone Hardware / Delivery Support: ${issueCategory}`,
          message: `[Drone QR Scan • Part: ${issueCategory}]\n${feedbackMessage.trim()}`,
          priority: 'normal',
          attachments: uploadedMedia.map((m) => ({
            name: m.name,
            mimetype: m.type,
            size: m.size,
            data: m.data
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback.');
      }

      setFeedbackSuccess('Thank you! Your issue report and media have been submitted to IndoWings Support.');
      setFeedbackMessage('');
      setCustomIssueText('');
      setUploadedMedia([]);
      setTimeout(() => setShowFeedbackForm(false), 4000);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 font-sans antialiased">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-fadeIn my-4">
        {/* Top Header Badge */}
        <div className="p-6 text-center border-b border-slate-800 bg-gradient-to-b from-purple-900/30 via-slate-900 to-slate-900 relative">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#5a00b8]/20 border border-[#5a00b8]/40 flex items-center justify-center text-[#a855f7] mb-3 shadow-lg shadow-purple-950/50">
            <Plane className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>IndoWings DGCA Certified Airframe</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">700 RPAV Customer Portal</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            AIRFRAME ID: <span className="text-purple-300 font-bold">{droneId ? droneId.toUpperCase() : 'UNKNOWN'}</span>
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
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
              {/* SECTION 1: Customer-Safe Drone Specifications */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                      Aircraft Specifications (700 RPAV)
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                    Consumer Safe
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Model / Class</span>
                    <span className="text-xs font-bold text-white block">{droneData.model_name || 'IndoWings 700 RPAV'}</span>
                    <span className="text-[10px] text-emerald-400 font-mono block">DGCA Type Certified</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payload Capacity</span>
                    <span className="text-xs font-bold text-white block">5.0 kg Max Cargo</span>
                    <span className="text-[10px] text-slate-400 font-mono block">Secure Electronic Bay</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operational Range</span>
                    <span className="text-xs font-bold text-white block">15 km Mission Radius</span>
                    <span className="text-[10px] text-slate-400 font-mono block">BVLOS Autonomous Link</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cruise Speed</span>
                    <span className="text-xs font-bold text-white block">45 km/h (Max 65 km/h)</span>
                    <span className="text-[10px] text-slate-400 font-mono block">Aero Carbon Fiber</span>
                  </div>
                </div>

                {/* Additional Spec Badges */}
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Powertrain: Dual Li-Po Electric</span>
                  </div>
                  <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Zero Direct Emissions
                  </span>
                </div>
              </div>

              {/* SECTION 2: Delivery Person Name & Details */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-800/50 to-slate-800/50 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>Assigned Delivery Personnel</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    Verified Remote Pilot
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h4 className="text-sm font-black text-white">
                      {droneData.assigned_pilot_name || droneData.pilot_name || 'Captain Vikram Malhotra'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      IndoWings Certified Flight Operations &bull; Lic #IN-RPAV-9821
                    </p>
                  </div>
                  <a
                    href="tel:18005727363"
                    className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3 h-3 text-purple-300" />
                    <span>Call Pilot</span>
                  </a>
                </div>
              </div>

              {/* SECTION 3: Landing & Safety Instructions */}
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    Landing &amp; Safety Instructions for Customer
                  </h4>
                </div>

                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">1</span>
                    <span><strong>5-Meter Safe Perimeter:</strong> Maintain at least 5 meters distance from the drone during descent and landing.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">2</span>
                    <span><strong>Rotor Hazard Zone:</strong> High-velocity carbon propellers. Never reach toward or step under the drone while rotors are spinning.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">3</span>
                    <span><strong>Steady Green Beacon:</strong> Approach the cargo compartment ONLY after the navigation light beacon turns solid green.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">4</span>
                    <span><strong>Keep Children &amp; Pets Away:</strong> Clear the landing lawn or terrace of loose debris, toys, and pets prior to arrival.</span>
                  </li>
                </ul>
              </div>

              {/* SECTION 4: Pre-Delivery Acceptance Checklist */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2 text-slate-200">
                  <CheckSquare className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    Pre-Acceptance Verification Checklist
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  Please verify these 4 items before accepting the consignment from the drone:
                </p>

                <div className="space-y-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-300">
                      <strong>Tamper-Proof Seal:</strong> Ensure the cargo compartment security seal is unbroken.
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-300">
                      <strong>Consignment ID Match:</strong> Match parcel tag with your order confirmation SMS/email.
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-300">
                      <strong>No Box Damage:</strong> Inspect the outer carton for crushing, wetness, or puncture.
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-300">
                      <strong>4-Digit Handshake OTP:</strong> Share your OTP with the delivery partner ONLY after physical inspection.
                    </span>
                  </div>
                </div>
              </div>

              {/* Operator Quick Actions (Only for Authorized Staff) */}
              {canInspect && (
                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-200">Staff Airframe QC Suite</span>
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
                    <span>Perform Pre/Post-Flight Airframe Inspection</span>
                  </button>
                </div>
              )}

              {/* SECTION 5: Customer Support Form with Drone Parts Issue Raising & Photo/Video Upload */}
              <div className="rounded-2xl bg-slate-800/50 border border-slate-700/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Report Drone Part Issue / Contact Support</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Raise an issue on specific drone parts with photo &amp; video evidence
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#5a00b8] hover:bg-[#4a0099] text-white transition-all cursor-pointer shadow-sm"
                  >
                    {showFeedbackForm ? 'Hide Form' : 'Raise Issue'}
                  </button>
                </div>

                {showFeedbackForm && (
                  <form onSubmit={handleSubmitCustomerFeedback} className="pt-3 border-t border-slate-700/40 space-y-3.5">
                    {feedbackError && (
                      <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{feedbackError}</span>
                      </div>
                    )}
                    {feedbackSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{feedbackSuccess}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Your Full Name <span className="text-rose-400">*</span>
                        </label>
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
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Email or Mobile Number <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={feedbackContact}
                          onChange={(e) => setFeedbackContact(e.target.value)}
                          placeholder="e.g. aditi@gmail.com or 9876543210"
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    {/* Drone Parts Selector */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Select Drone Part / Issue Category <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={selectedPartIssue}
                        onChange={(e) => setSelectedPartIssue(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="Cargo Bay & Electronic Latch">Cargo Bay &amp; Electronic Latch</option>
                        <option value="Propellers & Rotor Blades">Propellers &amp; Rotor Blades</option>
                        <option value="Landing Gear & Dampers">Landing Struts &amp; Foot Dampers</option>
                        <option value="Airframe Body & Shell">Airframe Shell &amp; Carbon Body</option>
                        <option value="Battery & Connectors">Battery Pack &amp; Power Connectors</option>
                        <option value="Delivery Package Damage">Damaged Package / Crushed Parcel</option>
                        <option value="Delivery Person Conduct">Delivery Person / Pilot Conduct</option>
                        <option value="Other / Unlisted Issue">Other / Unlisted Issue (Write Below)</option>
                      </select>
                    </div>

                    {/* Unlisted Problem Custom Field */}
                    {selectedPartIssue === 'Other / Unlisted Issue' && (
                      <div className="animate-fadeIn">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block mb-1">
                          Specify Unlisted Problem <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={customIssueText}
                          onChange={(e) => setCustomIssueText(e.target.value)}
                          placeholder="e.g. Strange high-pitch whistling sound or LED beacon blinking red"
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-purple-500/60 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    )}

                    {/* Detailed Message Box */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Detailed Description <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        placeholder="Please provide details of what you observed on the drone, cargo hatch, or delivery package..."
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                      />
                    </div>

                    {/* Photo & Video Upload Field */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Upload Photos &amp; Videos (Proof of Issue)
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 cursor-pointer transition-colors shadow-2xs">
                          <Camera className="w-3.5 h-3.5 text-purple-400" />
                          <span>Add Photo / Video</span>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={handleMediaUpload}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[11px] text-slate-500">
                          {uploadedMedia.length}/5 files (Max 25 MB each)
                        </span>
                      </div>

                      {/* Uploaded Media Badges / Previews */}
                      {uploadedMedia.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                          {uploadedMedia.map((m, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-between gap-1 text-[11px]"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                {m.type.startsWith('video/') ? (
                                  <Video className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                ) : (
                                  <Camera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                )}
                                <span className="truncate text-slate-300 font-mono text-[10px]">
                                  {m.name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeMedia(idx)}
                                className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                                title="Remove file"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#5a00b8] to-[#7928ca] hover:opacity-95 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {submittingFeedback ? 'Uploading & Submitting...' : 'Submit Support Ticket to IndoWings'}
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
          window.location.reload();
        }}
      />
    </div>
  );
};
