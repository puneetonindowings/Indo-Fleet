import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  BatteryCharging,
  Plane,
  Camera,
  FileText,
  Loader2,
  Check,
  AlertCircle
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

      setSuccessMsg(`Inspection recorded successfully! Result: ${overallInspection}`);
      if (onSuccess) {
        onSuccess(data.inspection);
      }
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error recording inspection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 via-white to-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5a00b8]/10 text-[#5a00b8] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Depot Airframe Inspection</h3>
              <p className="text-xs text-slate-500 font-medium">Dispatcher &amp; Fleet Manager Maintenance Clearance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Drone & Delivery Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Drone Airframe ID <span className="text-rose-500">*</span>
              </label>
              {availableDrones.length > 0 ? (
                <select
                  value={selectedDroneId}
                  onChange={(e) => setSelectedDroneId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#5a00b8] focus:ring-2 focus:ring-[#5a00b8]/20 transition-all"
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
                  placeholder="e.g. RPAV-000001"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#5a00b8] focus:ring-2 focus:ring-[#5a00b8]/20 transition-all font-mono"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Delivery / Order Reference
              </label>
              <input
                type="text"
                value={deliveryId}
                onChange={(e) => setDeliveryId(e.target.value)}
                placeholder="e.g. ORD-2026-XXXX (Optional)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#5a00b8] focus:ring-2 focus:ring-[#5a00b8]/20 transition-all font-mono"
              />
            </div>
          </div>

          {/* Inspection Checklist */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Inspection Checklist Items
            </h4>

            {/* 1. Body Condition */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">1. Airframe / Body</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['GOOD', 'SCRATCHED', 'DAMAGED', 'NOT_INSPECTED'] as const).map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => setBodyCondition(opt)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      bodyCondition === opt
                        ? opt === 'GOOD'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                          : opt === 'DAMAGED'
                          ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20'
                          : 'bg-purple-50 border-[#5a00b8] text-[#5a00b8] ring-2 ring-[#5a00b8]/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt === 'NOT_INSPECTED' ? 'Not Checked' : opt}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Propellers */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">2. Propellers & Rotors</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['GOOD', 'DAMAGED', 'REPLACE', 'NOT_INSPECTED'] as const).map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => setPropellerCondition(opt)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      propellerCondition === opt
                        ? opt === 'GOOD'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                          : 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt === 'NOT_INSPECTED' ? 'Not Checked' : opt}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Battery */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">3. Battery Pack Condition</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['NORMAL', 'NEEDS_CHARGING', 'NEEDS_ASSESSMENT', 'NOT_INSPECTED'] as const).map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => setBatteryCondition(opt)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      batteryCondition === opt
                        ? opt === 'NORMAL'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                          : 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt === 'NEEDS_CHARGING' ? 'Needs Charge' : opt === 'NEEDS_ASSESSMENT' ? 'Needs Review' : opt}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Landing Gear */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">4. Landing Gear & Struts</label>
              <div className="grid grid-cols-3 gap-2">
                {(['GOOD', 'DAMAGED', 'NOT_INSPECTED'] as const).map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => setLandingGearCondition(opt)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      landingGearCondition === opt
                        ? opt === 'GOOD'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                          : 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt === 'NOT_INSPECTED' ? 'Not Checked' : opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Overall Result Decision */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Overall Inspection Verdict <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setOverallInspection('PASSED')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  overallInspection === 'PASSED'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/30'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 ${overallInspection === 'PASSED' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-xs font-black">PASSED</span>
                <span className="text-[10px] text-emerald-600 font-medium">Releases to Available</span>
              </button>

              <button
                type="button"
                onClick={() => setOverallInspection('FAILED')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  overallInspection === 'FAILED'
                    ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/30'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className={`w-5 h-5 ${overallInspection === 'FAILED' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span className="text-xs font-black">FAILED</span>
                <span className="text-[10px] text-rose-600 font-medium">Flags Maintenance</span>
              </button>

              <button
                type="button"
                onClick={() => setOverallInspection('PENDING')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  overallInspection === 'PENDING'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/30'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Loader2 className={`w-5 h-5 ${overallInspection === 'PENDING' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className="text-xs font-black">PENDING</span>
                <span className="text-[10px] text-amber-600 font-medium">Awaiting QA Check</span>
              </button>
            </div>
          </div>

          {/* Internal Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Internal Technical Remarks (Confidential)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="e.g. Clean landing, battery cells balanced, zero propeller micro-fractures detected."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-[#5a00b8] focus:ring-2 focus:ring-[#5a00b8]/20 transition-all resize-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Internal only. Remarks are never displayed to customers scanning the public QR code.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#5a00b8] hover:bg-[#2e0066] text-white text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Inspection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
