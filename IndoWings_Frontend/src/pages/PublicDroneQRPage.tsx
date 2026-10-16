import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  Wrench,
  Loader2,
  UserCheck,
  CheckSquare,
  AlertCircle,
  Camera,
  Video,
  X,
  FileCheck2,
  Package,
  Truck,
  HelpCircle,
  Sparkles,
  MapPin,
  Clock
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

  // Customer Feedback & Support Form State (Name & Number auto-fetched from order/drone ID)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [selectedPartIssue, setSelectedPartIssue] = useState('Cargo Bay & Electronic Latch');
  const [customIssueText, setCustomIssueText] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  // Check if current user is an authorized operator/staff
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
    if (!feedbackMessage.trim()) {
      setFeedbackError('Please enter a description of the issue or feedback.');
      return;
    }

    setSubmittingFeedback(true);
    setFeedbackError('');
    setFeedbackSuccess('');

    try {
      const issueCategory = selectedPartIssue === 'Other / Unlisted Issue'
        ? (customIssueText.trim() ? `Custom Issue: ${customIssueText.trim()}` : 'Other Unlisted Issue')
        : selectedPartIssue;

      // Contact info is automatically resolved from the order linked to this drone
      const autoCustomerName = droneData?.customer_name || 'Verified Customer';
      const autoCustomerPhone = droneData?.customer_phone || null;
      const autoCustomerEmail = droneData?.customer_email || 'connect@indowings.com';

      const res = await fetch(`${API_BASE_URL}/api/delivery/support/expert-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'customer_qr_scan',
          name: autoCustomerName,
          email: autoCustomerEmail,
          phone: autoCustomerPhone,
          drone_serial: droneData?.serial_number || droneId,
          order_id: droneData?.assigned_order || droneData?.order_number || null,
          category: `Drone Delivery Support: ${issueCategory}`,
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

      setFeedbackSuccess('Thank you! Your issue report has been logged with IndoWings Support. Our team will review the details.');
      setFeedbackMessage('');
      setCustomIssueText('');
      setUploadedMedia([]);
      setTimeout(() => setShowFeedbackForm(false), 4500);
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
          throw new Error(data.error || 'Drone verification link not valid or record expired.');
        }
        setDroneData(data.drone);
      } catch (err: any) {
        setError(err.message || 'Unable to verify drone record.');
      } finally {
        setLoading(false);
      }
    };

    fetchDrone();
  }, []);

  const hasActiveOrder = Boolean(droneData?.assigned_order || droneData?.order_number || droneData?.assigned_pilot_name);
  const driverName = droneData?.assigned_pilot_name || droneData?.pilot_name;
  const driverPhone = droneData?.assigned_pilot_phone || droneData?.pilot_phone;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-start py-6 px-4 sm:px-6 font-sans antialiased">
      {/* Container - Clean, Responsive, Full-width mobile and centered desktop */}
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-lg shadow-slate-100 overflow-hidden my-2 animate-fadeIn">
        
        {/* Top Header Section - Light Modern Style */}
        <div className="p-6 sm:p-8 text-center border-b border-slate-100 bg-gradient-to-b from-purple-50/80 via-white to-white relative">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-100 border border-purple-200/80 flex items-center justify-center text-purple-700 mb-3.5 shadow-sm">
            <Truck className="w-8 h-8" />
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>IndoWings DGCA Certified Drone Fleet</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            IndoWings Customer Delivery Portal
          </h2>

          <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Drone ID:</span>
            <span className="text-xs font-mono font-bold text-purple-800">{droneId ? droneId.toUpperCase() : 'UNKNOWN'}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <p className="text-xs font-semibold">Verifying drone credentials &amp; active order records…</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Verification Link Not Valid</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                The requested drone QR link is either invalid or no matching active record exists in the IndoWings fleet registry.
              </p>
              <div className="pt-2 text-xs text-slate-500">
                Support Helpline: <a href="tel:18005727363" className="text-purple-700 font-bold hover:underline">1800 572 7363</a> • <a href="mailto:connect@indowings.com" className="text-purple-700 font-bold hover:underline">connect@indowings.com</a>
              </div>
            </div>
          ) : droneData ? (
            <>
              {/* SECTION 1: Dynamic Delivery Person / Driver Details (From Real Order) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-purple-600" />
                    <span>Assigned Delivery Person</span>
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${hasActiveOrder ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-200/70 text-slate-600 border-slate-300'}`}>
                    {hasActiveOrder ? 'Verified Delivery Driver' : 'Standby Fleet'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {driverName || 'IndoWings Central Road Logistics'}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {hasActiveOrder
                        ? 'Vehicle Delivery Fleet • Road Transit Division'
                        : 'No active delivery currently en route for this airframe'}
                    </p>
                  </div>
                  {driverPhone ? (
                    <a
                      href={`tel:${driverPhone}`}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Driver</span>
                    </a>
                  ) : (
                    <a
                      href="tel:18005727363"
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-purple-600" />
                      <span>Helpline</span>
                    </a>
                  )}
                </div>
              </div>

              {/* SECTION 2: Road Delivery & Unloading Instructions */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    Drone Delivery &amp; Unloading Instructions
                  </h4>
                </div>

                <ul className="text-xs text-slate-700 space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">1</span>
                    <span><strong>Vehicle Unloading:</strong> Drones are transported by road in dedicated secure transit cases. Allow the delivery driver to carefully unload and unbox the crate.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">2</span>
                    <span><strong>Fragile Electronics:</strong> Inspect the outer packaging and tamper-proof security seals for any transit impact or crushing before signing.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">3</span>
                    <span><strong>Battery Transport Safety:</strong> Li-Po power cells are shipped in isolated fire-retardant enclosures. Keep dry and store away from direct heat.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">4</span>
                    <span><strong>Handover &amp; OTP:</strong> Only share your 4-digit Delivery Handshake OTP with the driver after inspecting the physical package.</span>
                  </li>
                </ul>
              </div>

              {/* SECTION 3: Pre-Delivery Acceptance Checklist */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <CheckSquare className="w-4 h-4 text-purple-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    Pre-Acceptance Verification Checklist
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500">
                  Please verify these 4 items before accepting the delivery consignment:
                </p>

                <div className="space-y-2 pt-1">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-3 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-slate-700">
                      <strong>Tamper-Proof Seal:</strong> Ensure the cargo compartment security seal is intact and unbroken.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-3 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-slate-700">
                      <strong>Consignment ID Match:</strong> Match parcel tag with your order confirmation SMS / email.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-3 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-slate-700">
                      <strong>No Box Damage:</strong> Inspect the outer carton for crushing, punctures, or transit wetness.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-3 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-slate-700">
                      <strong>4-Digit Handshake OTP:</strong> Share your OTP with the delivery partner ONLY after physical inspection.
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Customer Support Form with Auto-Fetched Name/Phone & Drone Parts Issue */}
              <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-purple-600" />
                      <span>Report Drone Part Issue / Contact Support</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Select specific drone parts to raise an issue with photo/video proof
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-sm cursor-pointer"
                  >
                    {showFeedbackForm ? 'Hide Form' : 'Raise Issue'}
                  </button>
                </div>

                {showFeedbackForm && (
                  <form onSubmit={handleSubmitCustomerFeedback} className="pt-3.5 border-t border-slate-100 space-y-3.5">
                    {feedbackError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{feedbackError}</span>
                      </div>
                    )}
                    {feedbackSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{feedbackSuccess}</span>
                      </div>
                    )}

                    {/* Auto-Linked Order & Customer Pill (No manual typing required) */}
                    <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/70 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Order Customer</span>
                            {droneData.order_number && (
                              <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-purple-200 text-purple-800">
                                #{droneData.order_number}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">
                            {droneData.customer_name || 'Verified Customer'}
                            {droneData.customer_phone ? ` • ${droneData.customer_phone}` : droneData.customer_email ? ` • ${droneData.customer_email}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                        Auto-Fetched
                      </span>
                    </div>

                    {/* Drone Parts Selector */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Select Drone Part / Issue Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={selectedPartIssue}
                        onChange={(e) => setSelectedPartIssue(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white cursor-pointer"
                      >
                        <option value="Cargo Bay & Electronic Latch">Cargo Bay &amp; Electronic Latch</option>
                        <option value="Propellers & Rotor Blades">Propellers &amp; Rotor Blades</option>
                        <option value="Landing Gear & Dampers">Landing Struts &amp; Foot Dampers</option>
                        <option value="Airframe Body & Shell">Airframe Shell &amp; Carbon Body</option>
                        <option value="Battery & Connectors">Battery Pack &amp; Power Connectors</option>
                        <option value="Delivery Package Damage">Damaged Package / Crushed Parcel</option>
                        <option value="Delivery Person Conduct">Delivery Driver Conduct / Delay</option>
                        <option value="Other / Unlisted Issue">Other / Unlisted Issue (Write Below)</option>
                      </select>
                    </div>

                    {/* Unlisted Problem Custom Field */}
                    {selectedPartIssue === 'Other / Unlisted Issue' && (
                      <div className="animate-fadeIn">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block mb-1">
                          Specify Unlisted Problem <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={customIssueText}
                          onChange={(e) => setCustomIssueText(e.target.value)}
                          placeholder="e.g. Broken latch or scratched surface"
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-purple-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white"
                        />
                      </div>
                    )}

                    {/* Detailed Message Box */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Detailed Description <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        placeholder="Please describe what you observed on the drone, cargo hatch, or delivery crate..."
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white resize-none"
                      />
                    </div>

                    {/* Photo & Video Upload Field */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Upload Photos &amp; Videos (Proof of Issue)
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer transition-colors">
                          <Camera className="w-3.5 h-3.5 text-purple-600" />
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
                              className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-1 text-[11px]"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                {m.type.startsWith('video/') ? (
                                  <Video className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                ) : (
                                  <Camera className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                )}
                                <span className="truncate text-slate-700 font-mono text-[10px]">
                                  {m.name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeMedia(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
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
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {submittingFeedback ? 'Uploading & Submitting...' : 'Submit Support Ticket to IndoWings'}
                    </button>
                  </form>
                )}
              </div>

              {/* Staff Airframe QC Suite (Only for Authorized Logged-In Roles) */}
              {canInspect && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900">Staff Airframe QC Suite</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                      {deliveryUser?.role}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInspectionModal(true)}
                    className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Perform Pre/Post-Transit Airframe Inspection</span>
                  </button>
                </div>
              )}

              {/* Support & Contact Strip */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <a
                  href="tel:18005727363"
                  className="flex items-center gap-1.5 hover:text-purple-700 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-purple-600" />
                  <span>1800 572 7363 (Toll Free)</span>
                </a>
                <a
                  href="mailto:connect@indowings.com"
                  className="flex items-center gap-1.5 hover:text-purple-700 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-purple-600" />
                  <span>connect@indowings.com</span>
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
