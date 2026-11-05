import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Video,
  FileText,
  Upload,
  Cpu,
  Hash,
  ShieldCheck,
  Plane
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface UploadedMedia {
  name: string;
  type: string;
  size: number;
  data: string;
}

interface PostDeliveryInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  droneId?: string;
  deliveryId?: string;
  onSuccess?: (inspection: any) => void;
  availableDrones?: Array<{ id: string; model_name?: string; status?: string }>;
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

  const [overallInspection, setOverallInspection] = useState<'PASSED' | 'FAILED'>('PASSED');
  const [remarks, setRemarks] = useState('OK Tested');

  const [photoFiles, setPhotoFiles] = useState<UploadedMedia[]>([]);
  const [videoFiles, setVideoFiles] = useState<UploadedMedia[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 3 - photoFiles.length;
    if (remainingSlots <= 0) {
      setError('Maximum 3 photos allowed per inspection.');
      e.target.value = '';
      return;
    }

    const maxPhotoBytes = 2 * 1024 * 1024; // 2 MB
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (file.size > maxPhotoBytes) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        setError(`Photo "${file.name}" exceeds 2 MB upload limit (${sizeMb} MB). Please choose a photo under 2 MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setPhotoFiles((prev) => prev.length < 3 ? [
          ...prev,
          {
            name: file.name,
            type: file.type || 'image/jpeg',
            size: file.size,
            data: base64Data
          }
        ] : prev);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (videoFiles.length >= 1) {
      setError('Maximum 1 video allowed per inspection.');
      e.target.value = '';
      return;
    }

    const file = files[0];
    const maxVideoBytes = 5 * 1024 * 1024; // 5 MB

    if (file.size > maxVideoBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setError(`Video "${file.name}" exceeds 5 MB upload limit (${sizeMb} MB). Please choose a video under 5 MB.`);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setVideoFiles([
        {
          name: file.name,
          type: file.type || 'video/mp4',
          size: file.size,
          data: base64Data
        }
      ]);
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideoFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetDrone = (selectedDroneId || defaultDroneId).trim();
    if (!targetDrone) {
      setError('Please select or enter the Drone ID.');
      return;
    }

    const cleanRemarks = remarks.trim();
    if (!cleanRemarks) {
      setError('Remarks are mandatory. Please enter "OK Tested" if all is clear or describe any issue.');
      return;
    }

    if (photoFiles.length > 3) {
      setError('Maximum 3 photos are allowed per inspection.');
      return;
    }
    if (videoFiles.length > 1) {
      setError('Maximum 1 video is allowed per inspection.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('iw_delivery_token') || localStorage.getItem('iw_token') || '';
      const isPassed = overallInspection === 'PASSED';

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
          stage: 'depot_dispatch',
          body_condition: isPassed ? 'GOOD' : 'DAMAGED',
          propeller_condition: isPassed ? 'GOOD' : 'DAMAGED',
          battery_condition: 'NORMAL',
          landing_gear_condition: isPassed ? 'GOOD' : 'DAMAGED',
          cargo_bay_condition: 'CLEAN_RELEASE',
          overall_inspection: overallInspection,
          remarks: cleanRemarks,
          zero_defect_certified: isPassed,
          photo_references: photoFiles.map((m) => ({
            name: m.name,
            mimetype: m.type,
            size: m.size,
            data: m.data
          })),
          video_references: videoFiles.map((m) => ({
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
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error recording inspection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#5a00b8] flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Airframe & QC Inspection
                </h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Simplified QC
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Mandatory remarks & media verification (Up to 3 Photos, 1 Video)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Drone and Consignment Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#5a00b8]" />
                <span>Target Drone Serial / ID</span>
                <span className="text-rose-500">*</span>
              </label>

              {availableDrones.length > 0 ? (
                <select
                  value={selectedDroneId}
                  onChange={(e) => setSelectedDroneId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5a00b8]/20 focus:border-[#5a00b8] transition-all"
                >
                  <option value="">Select Aircraft Unit...</option>
                  {availableDrones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.id} ({d.model_name || 'Drone'}) · {d.status || 'Active'}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedDroneId}
                  onChange={(e) => setSelectedDroneId(e.target.value)}
                  placeholder="e.g. INW-700RPAV-0001"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5a00b8]/20 focus:border-[#5a00b8] transition-all"
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                <span>Delivery / Consignment ID</span>
                <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>

              <input
                type="text"
                value={deliveryId}
                onChange={(e) => setDeliveryId(e.target.value)}
                placeholder="e.g. IW-20261104-XXXX"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5a00b8]/20 focus:border-[#5a00b8] transition-all"
              />
            </div>
          </div>

          {/* 1. Overall Inspection Verdict */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">
              1. Inspection Verdict <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setOverallInspection('PASSED');
                  if (!remarks.trim() || remarks === 'Defect / Issue Observed') setRemarks('OK Tested');
                }}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center gap-3 ${
                  overallInspection === 'PASSED'
                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-md shadow-emerald-600/20 font-black'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-black">PASSED / ZERO DEFECT</div>
                  <div className="text-[10px] opacity-80">Hardware cleared for sortie</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOverallInspection('FAILED');
                  if (remarks === 'OK Tested') setRemarks('');
                }}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center gap-3 ${
                  overallInspection === 'FAILED'
                    ? 'bg-rose-600 border-rose-700 text-white shadow-md shadow-rose-600/20 font-black'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
                }`}
              >
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-black">ISSUE FOUND / FLAGGED</div>
                  <div className="text-[10px] opacity-80">Grounded for maintenance</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Media Evidence (Max 3 Photos, Max 1 Video) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  2. Media Evidence (Up to 3 Photos & 1 Video)
                </label>
                <p className="text-[11px] text-slate-500">
                  Upload photos (max 2 MB each, up to 3) and video (max 5 MB, up to 1)
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                  {photoFiles.length}/3 Photos
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                  {videoFiles.length}/1 Video
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Photo Upload Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#5a00b8]" />
                    <span>Photos ({photoFiles.length}/3)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Max 2 MB / photo</span>
                </div>

                {photoFiles.length < 3 ? (
                  <label className="p-3 border-2 border-dashed border-slate-200 hover:border-[#5a00b8] rounded-xl bg-white text-center flex flex-col items-center justify-center cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-purple-600 mb-0.5" />
                    <span className="text-xs font-bold text-slate-700">Add Photo</span>
                    <span className="text-[10px] text-slate-400">Up to 3 photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500 text-[11px] text-center font-medium">
                    Maximum 3 photos reached
                  </div>
                )}

                {photoFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {photoFiles.map((m, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                        <img src={m.data} alt={`photo-${idx}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0.5 left-0.5 px-1 rounded bg-black/70 text-white text-[8px] font-bold">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-0.5 right-0.5 bg-rose-600 text-white p-0.5 rounded-full shadow"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video Upload Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-[#5a00b8]" />
                    <span>Video ({videoFiles.length}/1)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Max 5 MB / video</span>
                </div>

                {videoFiles.length < 1 ? (
                  <label className="p-3 border-2 border-dashed border-slate-200 hover:border-[#5a00b8] rounded-xl bg-white text-center flex flex-col items-center justify-center cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-purple-600 mb-0.5" />
                    <span className="text-xs font-bold text-slate-700">Add Video</span>
                    <span className="text-[10px] text-slate-400">1 clip (Max 5 MB)</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500 text-[11px] text-center font-medium">
                    Maximum 1 video attached
                  </div>
                )}

                {videoFiles.length > 0 && (
                  <div className="pt-1">
                    {videoFiles.map((v, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-[#5a00b8] text-xs font-bold flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Video className="w-3.5 h-3.5 shrink-0 text-purple-600" />
                          <span className="truncate text-[11px]">{v.name || 'Inspection Video'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={removeVideo}
                          className="p-1 rounded bg-rose-100 text-rose-600 hover:bg-rose-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Mandatory Remarks */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                3. Technical Remarks & Observations <span className="text-rose-500">* (MANDATORY)</span>
              </label>
              <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                Required
              </span>
            </div>

            {/* Quick Helper Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'OK Tested',
                'Zero Defect - Hardware Clear',
                'Clean Delivery Accepted',
                'Minor Surface Scratch',
                'Propeller Nick / Defect',
                'Defect / Issue Observed'
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setRemarks(chip)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    remarks === chip
                      ? 'bg-[#5a00b8] text-white border-[#5a00b8]'
                      : 'bg-slate-50 hover:bg-purple-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Write remarks here... (e.g. OK Tested, or describe any issue found with this airframe)"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-[#5a00b8] focus:ring-2 focus:ring-[#5a00b8]/20 transition-all resize-none outline-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white text-xs font-black shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Submit Airframe QC</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
