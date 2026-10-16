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
  FileText
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
  const [bodyCondition, setBodyCondition] = useState<'GOOD' | 'SCRATCHED' | 'DAMAGED' | 'NOT_INSPECTED'>('GOOD');
  const [propellerCondition, setPropellerCondition] = useState<'GOOD' | 'DAMAGED' | 'REPLACE' | 'NOT_INSPECTED'>('GOOD');
  const [batteryCondition, setBatteryCondition] = useState<'NORMAL' | 'NEEDS_CHARGING' | 'NEEDS_ASSESSMENT' | 'NOT_INSPECTED'>('NORMAL');
  const [landingGearCondition, setLandingGearCondition] = useState<'GOOD' | 'DAMAGED' | 'NOT_INSPECTED'>('GOOD');
  const [overallInspection, setOverallInspection] = useState<'PASSED' | 'FAILED' | 'PENDING'>('PASSED');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

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
          remarks: remarks.trim()
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-[#3a0075] to-slate-950 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Depot Airframe Inspection
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/20">
                  QC Standard
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80 mt-0.5">
                700 RPAV Post-Sortie Quality Control &amp; Airworthiness Clearance
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
                      {d.id} ({d.serial_number || d.model_name || '700RPAV'})
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

          {/* Inspection Checklist Items */}
          <div className="space-y-3.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Aerospace QC Checklist (Standardized Options)
              </span>
              <span className="text-[10px] text-purple-700 font-bold">4 System Modules</span>
            </div>

            {/* 1. Body / Airframe */}
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-[#5a00b8]" />
                  <span>1. Airframe &amp; Carbon Chassis</span>
                </span>
                <span className="text-[11px] font-semibold text-purple-700 font-mono">
                  {bodyCondition}
                </span>
              </div>

              <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1">
                {(
                  [
                    { key: 'GOOD', label: 'Good' },
                    { key: 'SCRATCHED', label: 'Scratched' },
                    { key: 'DAMAGED', label: 'Damaged' },
                    { key: 'NOT_INSPECTED', label: 'Not Checked' }
                  ] as const
                ).map(({ key, label }) => {
                  const active = bodyCondition === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setBodyCondition(key)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                        active
                          ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60 font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {active && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            key === 'GOOD'
                              ? 'bg-emerald-500'
                              : key === 'DAMAGED'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                        />
                      )}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Propellers & Rotors */}
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-[#5a00b8]" />
                  <span>2. Propellers &amp; Motor Balance</span>
                </span>
                <span className="text-[11px] font-semibold text-purple-700 font-mono">
                  {propellerCondition}
                </span>
              </div>

              <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1">
                {(
                  [
                    { key: 'GOOD', label: 'Good' },
                    { key: 'DAMAGED', label: 'Damaged' },
                    { key: 'REPLACE', label: 'Replace' },
                    { key: 'NOT_INSPECTED', label: 'Not Checked' }
                  ] as const
                ).map(({ key, label }) => {
                  const active = propellerCondition === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setPropellerCondition(key)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                        active
                          ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60 font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {active && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            key === 'GOOD' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                      )}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Battery Pack Condition */}
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <BatteryCharging className="w-3.5 h-3.5 text-[#5a00b8]" />
                  <span>3. Battery Cell Health</span>
                </span>
                <span className="text-[11px] font-semibold text-purple-700 font-mono">
                  {batteryCondition}
                </span>
              </div>

              <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1">
                {(
                  [
                    { key: 'NORMAL', label: 'Normal' },
                    { key: 'NEEDS_CHARGING', label: 'Needs Charge' },
                    { key: 'NEEDS_ASSESSMENT', label: 'Needs Review' },
                    { key: 'NOT_INSPECTED', label: 'Not Checked' }
                  ] as const
                ).map(({ key, label }) => {
                  const active = batteryCondition === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setBatteryCondition(key)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                        active
                          ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60 font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {active && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            key === 'NORMAL' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                      )}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Landing Gear & Struts */}
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#5a00b8]" />
                  <span>4. Landing Gear &amp; Dampers</span>
                </span>
                <span className="text-[11px] font-semibold text-purple-700 font-mono">
                  {landingGearCondition}
                </span>
              </div>

              <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1">
                {(
                  [
                    { key: 'GOOD', label: 'Good' },
                    { key: 'DAMAGED', label: 'Damaged' },
                    { key: 'NOT_INSPECTED', label: 'Not Checked' }
                  ] as const
                ).map(({ key, label }) => {
                  const active = landingGearCondition === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setLandingGearCondition(key)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                        active
                          ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60 font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {active && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            key === 'GOOD' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                      )}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Overall Result Decision (Aerospace Verdict Cards) */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="block text-xs font-bold text-slate-700">
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

          {/* Internal Remarks */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Technical Remarks &amp; Log Notes (Confidential)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="e.g. Clean landing, battery cells balanced, zero propeller micro-fractures detected."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-[#5a00b8] focus:ring-2 focus:ring-[#5a00b8]/20 transition-all resize-none"
            />
            <p className="text-[10px] text-slate-400 font-medium">
              Internal QC log. Remarks are recorded in immutable audit logs and hidden from customer QR views.
            </p>
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
