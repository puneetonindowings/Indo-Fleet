import React, { useEffect, useState, useCallback } from 'react';
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
  RefreshCw,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { API_BASE_URL, SUPPORT_EMAIL, SUPPORT_PHONE } from '../config/api';
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const [showFeedbackForm, setShowFeedbackForm] = useState(true); // Open by default for easy reporting
  const [selectedPartIssue, setSelectedPartIssue] = useState('Cargo Bay & Electronic Latch');
  const [customIssueText, setCustomIssueText] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

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

  const fetchDroneData = useCallback(async (isSilent = false) => {
    if (!droneId) return;
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError('');
      const res = await fetch(`${API_BASE_URL}/api/delivery/public/drone/${encodeURIComponent(droneId)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Drone verification link not valid or record expired.');
      }
      setDroneData(data.drone);
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      if (!isSilent) {
        setError(err.message || 'Unable to verify drone record.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [droneId]);

  useEffect(() => {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const id = parts[parts.indexOf('drone') + 1] || '';
    setDroneId(id);

    if (!id) {
      setError('No Drone ID provided in the scan URL.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (droneId) {
      fetchDroneData(false);

      const interval = setInterval(() => {
        fetchDroneData(true);
      }, 8000);

      return () => clearInterval(interval);
    }
  }, [droneId, fetchDroneData]);

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

      const autoCustomerName = droneData?.customer_name || 'Verified Customer';
      const autoCustomerPhone = droneData?.customer_phone || null;
      const autoCustomerEmail = droneData?.customer_email || SUPPORT_EMAIL;

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

      setFeedbackSuccess('Thank you! Your issue report has been logged with IndoWings Support. Our technical team has been notified.');
      setFeedbackMessage('');
      setCustomIssueText('');
      setUploadedMedia([]);
    } catch (err: any) {
      setFeedbackError(err.message || 'Error submitting feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const hasActiveOrder = Boolean(droneData?.assigned_order || droneData?.order_number || droneData?.assigned_pilot_name);
  const driverName = droneData?.assigned_pilot_name || droneData?.pilot_name;
  const driverPhone = droneData?.assigned_pilot_phone || droneData?.pilot_phone;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased w-full pt-28 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8">

      <div className="w-full max-w-7xl mx-auto space-y-6">


        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-50/60 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-100/90 border border-purple-200 flex items-center justify-center text-purple-700 shadow-xs shrink-0">
                <Truck className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>IndoWings DGCA Certified Fleet</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-mono font-bold">
                    DRONE ID: {droneId ? droneId.toUpperCase() : 'UNKNOWN'}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                  IndoWings Customer Delivery &amp; Drone Portal
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Official digital consignment verification, road logistics handover, and technical assistance desk
                </p>
              </div>
            </div>


            <div className="flex items-center gap-3 self-start md:self-center shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-semibold text-slate-400">STATUS AUTO-SYNC</p>
                <p className="text-xs font-bold text-slate-700">
                  {refreshing ? 'Updating live records…' : 'Active • Auto-refreshing'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchDroneData(false)}
                disabled={loading || refreshing}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                title="Refresh delivery status"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-purple-600' : ''}`} />
              </button>
            </div>
          </div>


          {hasActiveOrder && (
            <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-purple-700 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Linked Consignment Order</span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                    Order #{droneData.order_number || droneData.assigned_order}
                    {droneData.drop_address && (
                      <span className="text-slate-500 font-normal"> &bull; Destination: {droneData.drop_address}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-600 text-white shadow-2xs">
                  {droneData.order_status === 'in-flight' ? '🚚 In Road Transit' : '📦 Assigned for Delivery'}
                </span>
              </div>
            </div>
          )}
        </div>


        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center gap-3 text-slate-500 shadow-sm">
            <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
            <p className="text-sm font-bold text-slate-700">Connecting to IndoWings Fleet Registry…</p>
            <p className="text-xs text-slate-400">Verifying airframe credentials and active road delivery records</p>
          </div>
        ) : error ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Verification Link Not Valid</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              The requested drone QR link is either invalid or no matching active record exists in the IndoWings fleet registry.
            </p>
            <div className="pt-2 text-xs text-slate-600">
              Support Helpline: <a href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`} className="text-purple-700 font-bold hover:underline">{SUPPORT_PHONE}</a> • <a href={`mailto:${SUPPORT_EMAIL}`} className="text-purple-700 font-bold hover:underline">{SUPPORT_EMAIL}</a>
            </div>
          </div>
        ) : droneData ? (

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">


            <div className="lg:col-span-7 space-y-6">


              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-purple-700" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Assigned Delivery Person &amp; Vehicle
                    </h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${hasActiveOrder && driverName ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {hasActiveOrder && driverName ? 'Verified Delivery Driver' : 'Standby Fleet'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Driver / Logistics Partner</p>
                    <h4 className="text-base sm:text-lg font-bold text-slate-900">
                      {driverName || 'IndoWings Central Road Logistics'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {hasActiveOrder && driverName
                        ? 'Vehicle Delivery Fleet • Road Transit Division'
                        : 'No active delivery currently in transit for this drone'}
                    </p>
                  </div>

                  {driverPhone ? (
                    <a
                      href={`tel:${driverPhone}`}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Driver ({driverPhone})</span>
                    </a>
                  ) : (
                    <a
                      href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
                      className="px-4 py-2.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors shrink-0 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5 text-purple-700" />
                      <span>Helpline ({SUPPORT_PHONE})</span>
                    </a>
                  )}
                </div>


                <p className="text-[11px] text-slate-500 leading-relaxed">
                  As soon as a logistics driver is assigned at dispatch, their name and direct phone line appear here automatically.
                </p>
              </div>


              <div className="bg-white border border-amber-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Drone Delivery &amp; Road Unloading Instructions
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-[10px]">1</span>
                      <h4 className="text-xs font-bold text-amber-950">Vehicle Unloading</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Drones are transported by road in dedicated secure transit cases. Allow the delivery driver to carefully unload and unbox the crate.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-[10px]">2</span>
                      <h4 className="text-xs font-bold text-amber-950">Fragile Electronics</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Inspect the outer packaging and tamper-proof security seals for any transit impact or crushing before signing.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-[10px]">3</span>
                      <h4 className="text-xs font-bold text-amber-950">Battery Safety</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Li-Po power cells are shipped in isolated fire-retardant enclosures. Keep dry and store away from direct heat.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-[10px]">4</span>
                      <h4 className="text-xs font-bold text-amber-950">Handover &amp; OTP</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Only share your 4-digit Delivery Handshake OTP with the driver after inspecting the physical package.
                    </p>
                  </div>
                </div>
              </div>


              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 text-slate-800">
                  <CheckSquare className="w-4 h-4 text-purple-700" />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Customer Pre-Acceptance Verification Checklist
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500">
                  Please verify these 4 items before accepting the delivery consignment from the driver:
                </p>

                <div className="space-y-2 pt-1">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-slate-700">
                      <strong>Tamper-Proof Seal:</strong> Ensure the cargo compartment security seal is intact and unbroken.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-slate-700">
                      <strong>Consignment ID Match:</strong> Match parcel tag with your order confirmation SMS / email.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-slate-700">
                      <strong>No Box Damage:</strong> Inspect the outer carton for crushing, punctures, or transit wetness.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-slate-700">
                      <strong>4-Digit Handshake OTP:</strong> Share your OTP with the delivery partner ONLY after physical inspection.
                    </span>
                  </div>
                </div>
              </div>


              {canInspect && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-purple-900 block">Staff Airframe QC Suite</span>
                    <span className="text-[11px] text-purple-700">Authorized Operator: {deliveryUser?.name || deliveryUser?.role}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInspectionModal(true)}
                    className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Run Airframe QC</span>
                  </button>
                </div>
              )}
            </div>


            <div className="lg:col-span-5 space-y-6">


              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-purple-700" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Report Drone Part Issue
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Direct Support
                  </span>
                </div>

                <p className="text-xs text-slate-500">
                  Select specific drone parts to raise an issue with photo/video evidence. No need to re-enter your contact info.
                </p>

                <form onSubmit={handleSubmitCustomerFeedback} className="space-y-4 pt-1">
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


                  <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/70 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Order Customer</span>
                          {droneData.order_number && (
                            <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.2 rounded border border-purple-200 text-purple-800">
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


                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                      Select Drone Part / Issue Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedPartIssue}
                      onChange={(e) => setSelectedPartIssue(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white cursor-pointer"
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
                        placeholder="e.g. Broken latch or surface damage"
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-purple-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white"
                      />
                    </div>
                  )}


                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                      Detailed Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Please describe what you observed on the drone, cargo hatch, or delivery crate..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white resize-none"
                    />
                  </div>


                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Upload Photos &amp; Videos (Proof of Issue)
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer transition-colors shadow-2xs">
                        <Camera className="w-3.5 h-3.5 text-purple-700" />
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


                    {uploadedMedia.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
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
                    className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submittingFeedback ? 'Uploading & Submitting...' : 'Submit Support Ticket to IndoWings'}
                  </button>
                </form>
              </div>


              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  IndoWings Official Support Desk
                </h4>
                <div className="space-y-2.5 text-xs">
                  <a
                    href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-purple-700" />
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Toll Free Hotline</span>
                        <span className="font-bold text-slate-900">{SUPPORT_PHONE}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                      Toll Free
                    </span>
                  </a>

                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-purple-700" />
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Official Inquiries</span>
                        <span className="font-bold text-slate-900">{SUPPORT_EMAIL}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700">
                      Email
                    </span>
                  </a>
                </div>

                <p className="text-[11px] text-slate-400 pt-1 text-center">
                  Mon – Sat &bull; 09:00 AM – 08:00 PM IST &bull; DGCA Verified
                </p>
              </div>

            </div>

          </div>
        ) : null}

      </div>


      <PostDeliveryInspectionModal
        isOpen={showInspectionModal}
        onClose={() => setShowInspectionModal(false)}
        droneId={droneId}
        onSuccess={() => {
          fetchDroneData(false);
        }}
      />
    </div>
  );
};
