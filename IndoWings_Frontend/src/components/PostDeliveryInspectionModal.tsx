import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  BatteryCharging,
  Plane,
  RotateCcw,
  Shield,
  Clock3,
  Loader2,
  Check,
  AlertCircle,
  Hash,
  FileText,
  Camera,
  Video,
  Radio,
  Compass,
  Gauge,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface PostDeliveryInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  droneId?: string;
  deliveryId?: string;
  onSuccess?: (inspection: any) => void;
  availableDrones?: Array<{ id: string; model_name?: string; serial_number?: string }>;
}

interface UploadedMedia {
  name: string;
  type: string;
  size: number;
  data: string;
}

export const PostDeliveryInspectionModal: React.FC<PostDeliveryInspectionModalProps> = ({
  isOpen,
  onClose,
  droneId: defaultDroneId = '',
  deliveryId: defaultDeliveryId = '',
  onSuccess,
  availableDrones = []
}) => {
  const [selectedDroneId, setSelectedDroneId] = useState(defaultDroneId);
  const [deliveryId, setDeliveryId] = useState(defaultDeliveryId);

  // 8 Comprehensive Parts Checklists with Checkmarks
  const [checkAirframe, setCheckAirframe] = useState(true);
  const [checkPropellers, setCheckPropellers] = useState(true);
  const [checkBattery, setCheckBattery] = useState(true);
  const [checkFlightControl, setCheckFlightControl] = useState(true);
  const [checkFlyReadiness, setCheckFlyReadiness] = useState(true);
  const [checkLandingGear, setCheckLandingGear] = useState(true);
  const [checkPayloadBay, setCheckPayloadBay] = useState(true);
  const [checkSensorsOthers, setCheckSensorsOthers] = useState(true);

  // Conditions
  const [bodyCondition, setBodyCondition] = useState<'GOOD' | 'SCRATCHED' | 'DAMAGED' | 'NOT_INSPECTED'>('GOOD');
  const [propellerCondition, setPropellerCondition] = useState<'GOOD' | 'DAMAGED' | 'REPLACE' | 'NOT_INSPECTED'>('GOOD');
  const [batteryCondition, setBatteryCondition] = useState<'NORMAL' | 'NEEDS_CHARGING' | 'NEEDS_ASSESSMENT' | 'NOT_INSPECTED'>('NORMAL');
  const [landingGearCondition, setLandingGearCondition] = useState<'GOOD' | 'DAMAGED' | 'NOT_INSPECTED'>('GOOD');

  // Overall Decision & Remarks
  const [overallInspection, setOverallInspection] = useState<'PASSED' | 'FAILED' | 'PENDING'>('PASSED');
  const [remarks, setRemarks] = useState('');

  // Media (Photo and Video) Upload
  const [mediaFiles, setMediaFiles] = useState<UploadedMedia[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 6 - mediaFiles.length;
    if (remainingSlots <= 0) {
      setError('Maximum 6 inspection photos/videos allowed.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (file.size > 25 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds maximum allowed size of 25 MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setMediaFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64Data
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetDrone = (selectedDroneId || defaultDroneId).trim();
    if (!targetDrone) {
      setError('Please select or enter the Drone ID.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('iw_delivery_token') || localStorage.getItem('iw_token') || '';
      
      const checklistSummary = [
        `1. Airframe: ${checkAirframe ? 'PASSED' : 'FLAGGED'}`,
        `2. Propellers & Rotors: ${checkPropellers ? 'PASSED' : 'FLAGGED'}`,
        `3. Battery & Voltage: ${checkBattery ? 'PASSED' : 'FLAGGED'}`,
        `4. Flight Control & Avionics: ${checkFlightControl ? 'PASSED' : 'FLAGGED'}`,
        `5. Fly Readiness & Motors: ${checkFlyReadiness ? 'PASSED' : 'FLAGGED'}`,
        `6. Landing Gear & Dampers: ${checkLandingGear ? 'PASSED' : 'FLAGGED'}`,
        `7. Payload Bay & Lock: ${checkPayloadBay ? 'PASSED' : 'FLAGGED'}`,
        `8. Sensors & Others: ${checkSensorsOthers ? 'PASSED' : 'FLAGGED'}`
      ].join(' | ');

      const combinedRemarks = `${remarks.trim() ? `${remarks.trim()}\n\n` : ''}[Technical Checklist]: ${checklistSummary}`;

      const res = await fetch(`${API_BASE_URL}/api/delivery/inspections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          drone_id: targetDrone,
          delivery_id: deliveryId.trim() || undefined,
          inspection_type: 'DEPOT_MAINTENANCE',
          body_condition: bodyCondition,
          propeller_condition: propellerCondition,
          battery_condition: batteryCondition,
          landing_gear_condition: landingGearCondition,
          overall_inspection: overallInspection,
          remarks: combinedRemarks,
          photo_references: mediaFiles.map((m) => ({
            name: m.name,
            mimetype: m.type,
            size: m.size,
            data: m.data
          }))
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record inspection.');
      }

      setSuccessMsg(`Airframe inspection recorded: ${overallInspection}`);
      if (onSuccess) {
        onSuccess(data.inspection);
      }
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error recording inspection.');
    } finally {
      setLoading(false);
    }
  };

  const checklistItems = [
    {
      id: 'airframe',
      title: '1. Airframe Structure & Carbon Shell',
      desc: 'Carbon fiber arms, fuselage bolts, motor mounts, structural stiffness',
      checked: checkAirframe,
      toggle: () => setCheckAirframe(!checkAirframe),
      icon: Plane
    },
    {
      id: 'propellers',
      title: '2. Propellers & Rotor Blades',
      desc: 'Leading edges, pitch balance, motor bearings, zero cracks or nicks',
      checked: checkPropellers,
      toggle: () => setCheckPropellers(!checkPropellers),
      icon: RotateCcw
    },
    {
      id: 'battery',
      title: '3. Battery Health & Cell Voltage',
      desc: 'Cell voltage delta, thermal sensors, physical latch locking mechanism',
      checked: checkBattery,
      toggle: () => setCheckBattery(!checkBattery),
      icon: BatteryCharging
    },
    {
      id: 'flight_control',
      title: '4. Flight Control & Avionics',
      desc: '6-axis IMU, electronic compass calibration, dual-band RTK/GPS lock',
      checked: checkFlightControl,
      toggle: () => setCheckFlightControl(!checkFlightControl),
      icon: Compass
    },
    {
      id: 'fly_readiness',
      title: '5. Motor Takeoff & Fly Readiness',
      desc: 'ESC spin direction, idle RPM balance, throttle response, 5G link',
      checked: checkFlyReadiness,
      toggle: () => setCheckFlyReadiness(!checkFlyReadiness),
      icon: Gauge
    },
    {
      id: 'landing_gear',
      title: '6. Landing Gear & Dampers',
      desc: 'Carbon skids, ground shock absorption, silicone dampening mounts',
      checked: checkLandingGear,
      toggle: () => setCheckLandingGear(!checkLandingGear),
      icon: Shield
    },
    {
      id: 'payload_bay',
      title: '7. Payload Bay & Cargo Lock',
      desc: 'Electronic latch solenoid, bay sensor, weather gasket seal',
      checked: checkPayloadBay,
      toggle: () => setCheckPayloadBay(!checkPayloadBay),
      icon: Lock
    },
    {
      id: 'sensors_others',
      title: '8. Optical & Obstacle Sensors (Others)',
      desc: 'LiDAR / collision radar, downward optical flow, navigation beacons',
      checked: checkSensorsOthers,
      toggle: () => setCheckSensorsOthers(!checkSensorsOthers),
      icon: Radio
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-[#3a0075] to-slate-950 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Fleet Pre-Flight &amp; Depot Testing
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/20">
                  QC Checklist
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80 mt-0.5">
                Full 8-Module Testing Checklist &bull; Photo &amp; Video Proofs &bull; Airworthiness Clearance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Identification Section: Drone & Order Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-[#5a00b8]" />
                <span>Drone Airframe ID</span>
                <span className="text-rose-500">*</span>
              </label>

              {availableDrones.length > 0 ? (
                <select
                  value={selectedDroneId}
                  onChange={(e) => setSelectedDroneId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5a00b8]/20 focus:border-[#5a00b8] transition-all cursor-pointer"
                  required
                >
                  <option value="">Select RPAV Drone</option>
                  {availableDrones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.id} ({d.serial_number || d.model_name || '700 RPAV'})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedDroneId}
                  onChange={(e) => setSelectedDroneId(e.target.value)}
                  placeholder="e.g. INW-700RPAV-0004"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5a00b8]/20 focus:border-[#5a00b8] transition-all"
                  required
                />
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                <span>Delivery / Consignment ID</span>
                <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>

              <input
                type="text"
                value={deliveryId}
                onChange={(e) => setDeliveryId(e.target.value)}
                placeholder="e.g. ORD-2026-XXXX"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5a00b8]/20 focus:border-[#5a00b8] transition-all"
              />
            </div>
          </div>

          {/* SECTION 1: Parts Checkmarks (Fly, Landing, Battery, Control, Propellers, Airframe, etc.) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                  Mandatory Airframe Checklist (Check All Parts)
                </span>
                <p className="text-[11px] text-slate-500">
                  Click each part to verify and mark approved for flight
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                8 System Checks
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {checklistItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.toggle}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      item.checked
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/20 shadow-2xs'
                        : 'bg-rose-50/60 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        item.checked
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-rose-100 text-rose-500 border border-rose-300'
                      }`}
                    >
                      {item.checked ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {item.title}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            item.checked
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-rose-200 text-rose-900'
                          }`}
                        >
                          {item.checked ? 'Passed' : 'Flagged'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: Photo & Video Upload (Visual Evidence) */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  Testing Evidence: Photo &amp; Video Proofs
                </label>
                <p className="text-[11px] text-slate-500">
                  Upload propeller spin test videos, battery cell readings, or airframe photos
                </p>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {mediaFiles.length}/6 files
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#5a00b8] border border-purple-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs">
                <Camera className="w-4 h-4 text-[#5a00b8]" />
                <span>Upload Photos / Videos</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-slate-400">
                Supports MP4, WebM, MOV, JPG, PNG (Max 25 MB)
              </span>
            </div>

            {/* Media Badges */}
            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {mediaFiles.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-1.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {m.type.startsWith('video/') ? (
                        <Video className="w-4 h-4 text-purple-600 shrink-0" />
                      ) : (
                        <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-mono text-slate-800 text-[11px] font-bold block truncate">
                          {m.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {(m.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                      title="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: Technical Remarks / Notes */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">
              Technical Remarks &amp; Inspection Message
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="e.g. Rotor spin test passed at 3800 RPM. Battery cell delta < 0.02V. Clearance granted for flight."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-[#5a00b8] focus:ring-2 focus:ring-[#5a00b8]/20 transition-all resize-none"
            />
            <p className="text-[10px] text-slate-400 font-medium">
              Confidential operational QC log. Recorded in immutable audit trail.
            </p>
          </div>

          {/* SECTION 4: Overall Airworthiness Verdict */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Overall Airworthiness Verdict <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setOverallInspection('PASSED')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  overallInspection === 'PASSED'
                    ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <CheckCircle2
                    className={`w-5 h-5 ${
                      overallInspection === 'PASSED' ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      overallInspection === 'PASSED'
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Optimal
                  </span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">PASSED</span>
                  <span className="text-[11px] text-emerald-700 font-medium leading-tight block mt-0.5">
                    Clear for Sorties (Ready)
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOverallInspection('FAILED')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  overallInspection === 'FAILED'
                    ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <AlertTriangle
                    className={`w-5 h-5 ${
                      overallInspection === 'FAILED' ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  />
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      overallInspection === 'FAILED'
                        ? 'bg-rose-200 text-rose-900'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Grounded
                  </span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">FAILED</span>
                  <span className="text-[11px] text-rose-700 font-medium leading-tight block mt-0.5">
                    Move to Maintenance
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOverallInspection('PENDING')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  overallInspection === 'PENDING'
                    ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Clock3
                    className={`w-5 h-5 ${
                      overallInspection === 'PENDING' ? 'text-amber-600' : 'text-slate-400'
                    }`}
                  />
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      overallInspection === 'PENDING'
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Hold
                  </span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">PENDING</span>
                  <span className="text-[11px] text-amber-700 font-medium leading-tight block mt-0.5">
                    Awaiting Supervisor QC
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5a00b8] to-[#7928ca] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-purple-950/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit &amp; Sign Inspection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
