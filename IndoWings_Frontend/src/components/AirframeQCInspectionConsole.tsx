import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Camera,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Plane,
  Battery,
  Wrench,
  RotateCcw,
  RefreshCw,
  Eye,
  FileText,
  Video,
  Sparkles,
  User,
  Sliders,
  ChevronRight,
  X,
  Volume2,
  FlipHorizontal,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import jsQR from 'jsqr';
import { API_BASE_URL } from '../config/api';
import { DeliveryUser } from '../types';

interface AirframeQCInspectionConsoleProps {
  currentUser: DeliveryUser | null;
  availableDrones?: any[];
  orders?: any[];
  onInspectionCompleted?: (inspection: any) => void;
  onOpenAuditLogs?: () => void;
}

export const AirframeQCInspectionConsole: React.FC<AirframeQCInspectionConsoleProps> = ({
  currentUser,
  availableDrones = [],
  orders = [],
  onInspectionCompleted,
  onOpenAuditLogs
}) => {
  // Navigation / Scan Mode
  const [scanMode, setScanMode] = useState<'camera' | 'upload' | 'snapshot' | 'manual'>('camera');
  const [selectedDrone, setSelectedDrone] = useState<any | null>(null);
  const [scannedDroneRawId, setScannedDroneRawId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanningLive, setIsScanningLive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');

  // Snapshot mode camera state
  const snapshotVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isSnapshotCamActive, setIsSnapshotCamActive] = useState(false);
  const snapshotStreamRef = useRef<MediaStream | null>(null);

  // Html5Qrcode live scanner ref
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const liveScannerContainerId = 'admin-qc-live-scanner-box';

  // Form State for Airframe Inspection
  const [bodyCondition, setBodyCondition] = useState<'GOOD' | 'MINOR_SCRATCH' | 'CRACKED'>('GOOD');
  const [propellerCondition, setPropellerCondition] = useState<'GOOD' | 'HAIRLINE_NICK' | 'DAMAGED'>('GOOD');
  const [landingGearCondition, setLandingGearCondition] = useState<'GOOD' | 'LOOSE' | 'DAMAGED'>('GOOD');
  const [cargoBayCondition, setCargoBayCondition] = useState<'CLEAN_RELEASE' | 'LATCH_STICKY' | 'DAMAGED'>('CLEAN_RELEASE');
  const [batteryLevel, setBatteryLevel] = useState<number>(98);
  const [batteryHealth, setBatteryHealth] = useState<'NORMAL' | 'WARM' | 'SWOLLEN'>('NORMAL');
  const [gpsCompassFix, setGpsCompassFix] = useState<'HEALTHY_3D_LOCK' | 'CALIBRATION_NEEDED' | 'NO_FIX'>('HEALTHY_3D_LOCK');
  const [hoverFlightStability, setHoverFlightStability] = useState<'STABLE_HOVER' | 'SLIGHT_DRIFT' | 'UNSTABLE'>('STABLE_HOVER');
  const [motorTempVibration, setMotorTempVibration] = useState<'NORMAL' | 'HIGH_VIBRATION' | 'OVERHEATING'>('NORMAL');
  const [defectClassification, setDefectClassification] = useState<'ZERO_DEFECT' | 'MINOR_COSMETIC' | 'GROUNDING_DEFECT'>('ZERO_DEFECT');
  const [overallVerdict, setOverallVerdict] = useState<'PASSED' | 'FAILED'>('PASSED');
  const [notes, setNotes] = useState('');
  const [photoReferences, setPhotoReferences] = useState<{ url: string; name: string }[]>([]);
  const [videoReferences, setVideoReferences] = useState<{ url: string; name: string }[]>([]);

  // Submitting State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const token = localStorage.getItem('iw_delivery_token') || '';

  // Audio confirmation beep
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } catch {}
  };

  // Robust drone ID parser from QR text / payload / URL
  const extractDroneIdFromText = (rawText: string): string => {
    const text = (rawText || '').trim();
    if (!text) return '';

    // If it's a URL like https://.../drone/DRN-700-001
    if (text.includes('/drone/')) {
      const seg = text.split('/drone/')[1];
      const clean = seg.split('?')[0].split('#')[0].trim();
      return decodeURIComponent(clean);
    }

    // If it's JSON encoded
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.id || parsed.drone_id || parsed.droneId) {
          return String(parsed.id || parsed.drone_id || parsed.droneId).trim();
        }
      } catch {}
    }

    // Direct string or DRN code
    return text;
  };

  // Find drone in availableDrones
  const resolveDrone = (rawQuery: string) => {
    const extracted = extractDroneIdFromText(rawQuery);
    const cleanTarget = extracted.toLowerCase().trim();

    // 1. Exact match on ID or serial number
    let matched = availableDrones.find((d) => {
      const dId = String(d.id || '').toLowerCase().trim();
      const dSerial = String(d.serial_number || '').toLowerCase().trim();
      return dId === cleanTarget || dSerial === cleanTarget;
    });

    // 2. Substring or numeric index match
    if (!matched) {
      matched = availableDrones.find((d) => {
        const dId = String(d.id || '').toLowerCase().trim();
        return dId.includes(cleanTarget) || cleanTarget.includes(dId);
      });
    }

    // 3. Fallback: Check if target matches order drones
    let linkedOrder: any = null;
    if (orders && orders.length > 0) {
      linkedOrder = orders.find((o) => {
        const allocated = Array.isArray(o.allocated_drone_ids) ? o.allocated_drone_ids : [];
        return allocated.some((id: string) => String(id).toLowerCase() === cleanTarget);
      });
    }

    if (matched) {
      playBeep();
      setSelectedDrone({ ...matched, linkedOrder });
      setScannedDroneRawId(matched.id);
      setScanError(null);
      stopLiveScanner();
      stopSnapshotCamera();
    } else {
      // Even if not in loaded availableDrones list, create an airframe record object so technician can still inspect it!
      playBeep();
      const syntheticDrone = {
        id: extracted.toUpperCase(),
        model: 'IndoWings 700 RPAV Heavy-Lift',
        status: 'depot_inspection',
        battery_level: 98,
        synthetic: true,
        linkedOrder
      };
      setSelectedDrone(syntheticDrone);
      setScannedDroneRawId(extracted);
      setScanError(null);
      stopLiveScanner();
      stopSnapshotCamera();
    }
  };

  // --- 1. Live Camera Scanning via Html5Qrcode ---
  const startLiveScanner = async () => {
    setScanError(null);
    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {}
      }

      const html5Qr = new Html5Qrcode(liveScannerContainerId);
      html5QrCodeRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: cameraFacing },
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          resolveDrone(decodedText);
        },
        () => {
          // ignore frame errors
        }
      );
      setIsScanningLive(true);
    } catch (err: any) {
      setIsScanningLive(false);
      setScanError(err.message || 'Camera permission denied or camera not accessible.');
    }
  };

  const stopLiveScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setIsScanningLive(false);
  };

  // --- 2. Robust Image QR Decoding (with jsQR and canvas fallback) ---
  const decodeQRFromImageFile = async (file: File) => {
    setScanError(null);
    try {
      // Step A: First try jsQR with Canvas (highest reliability for custom graphics & central logos)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      // Canvas pass 1: Normal scale
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      ctx.drawImage(img, 0, 0, img.width, img.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let code = jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: 'attemptBoth'
      });

      // Canvas pass 2: If failed, try normalized 500x500 box
      if (!code) {
        const normCanvas = document.createElement('canvas');
        normCanvas.width = 600;
        normCanvas.height = 600;
        const nCtx = normCanvas.getContext('2d');
        if (nCtx) {
          nCtx.drawImage(img, 0, 0, 600, 600);
          const nData = nCtx.getImageData(0, 0, 600, 600);
          code = jsQR(nData.data, nData.width, nData.height, {
            inversionAttempts: 'attemptBoth'
          });
        }
      }

      if (code && code.data) {
        resolveDrone(code.data);
        return;
      }

      // Step B: Fallback to Html5Qrcode.scanFile
      const tempScanner = new Html5Qrcode('admin-qc-temp-reader');
      try {
        const res = await tempScanner.scanFile(file, false);
        tempScanner.clear();
        if (res) {
          resolveDrone(res);
          return;
        }
      } catch (h5Err) {
        tempScanner.clear();
      }

      setScanError('QR Code could not be detected in this image. Please ensure the QR is clear and well-lit.');
    } catch (err: any) {
      setScanError(err.message || 'Failed to process QR image file.');
    }
  };

  // --- 3. Snapshot / Live Camera Photo Mode ---
  const startSnapshotCamera = async () => {
    setScanError(null);
    try {
      if (snapshotStreamRef.current) {
        snapshotStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      snapshotStreamRef.current = stream;
      if (snapshotVideoRef.current) {
        snapshotVideoRef.current.srcObject = stream;
        await snapshotVideoRef.current.play();
      }
      setIsSnapshotCamActive(true);
    } catch (err: any) {
      setIsSnapshotCamActive(false);
      setScanError('Webcam access was denied. You can also upload a photo below.');
    }
  };

  const stopSnapshotCamera = () => {
    if (snapshotStreamRef.current) {
      snapshotStreamRef.current.getTracks().forEach((t) => t.stop());
      snapshotStreamRef.current = null;
    }
    setIsSnapshotCamActive(false);
  };

  const handleTakeSnapshotAndDecode = () => {
    if (!snapshotVideoRef.current) return;
    const video = snapshotVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: 'attemptBoth'
    });

    if (code && code.data) {
      resolveDrone(code.data);
    } else {
      setScanError('Photo captured, but no clear QR Code found. Please hold the QR code steady in frame.');
    }
  };

  // Handle Tab Switch
  useEffect(() => {
    if (selectedDrone) return;

    if (scanMode === 'camera') {
      stopSnapshotCamera();
      const timer = setTimeout(() => {
        startLiveScanner();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopLiveScanner();
      };
    } else if (scanMode === 'snapshot') {
      stopLiveScanner();
      startSnapshotCamera();
      return () => {
        stopSnapshotCamera();
      };
    } else {
      stopLiveScanner();
      stopSnapshotCamera();
    }
  }, [scanMode, cameraFacing, selectedDrone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLiveScanner();
      stopSnapshotCamera();
    };
  }, []);

  // Handle Evidence Uploads (Base64) - Optional
  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const resultUrl = reader.result as string;
        if (type === 'photo') {
          setPhotoReferences((prev) => [...prev, { url: resultUrl, name: file.name }]);
        } else {
          setVideoReferences((prev) => [...prev, { url: resultUrl, name: file.name }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Submit Inspection
  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrone) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      drone_id: selectedDrone.id,
      delivery_id: selectedDrone.linkedOrder?.id || null,
      inspection_type: 'DEPOT_MAINTENANCE',
      stage: 'depot_dispatch',

      // Depot technical checks
      body_condition: bodyCondition,
      propeller_condition: propellerCondition,
      battery_condition: batteryHealth,
      landing_gear_condition: landingGearCondition,
      cargo_bay_condition: cargoBayCondition,
      field_battery_level: batteryLevel,
      depot_avionics_cleared: gpsCompassFix === 'HEALTHY_3D_LOCK',
      ready_for_next_sortie: overallVerdict === 'PASSED',

      // Defect & Stability
      hover_stability: hoverFlightStability,
      motor_temperature: motorTempVibration,
      defect_classification: defectClassification,
      zero_defect_certified: defectClassification === 'ZERO_DEFECT' && overallVerdict === 'PASSED',

      overall_inspection: overallVerdict,
      remarks: notes || `Depot flight clearance certified by ${currentUser?.name || 'Inspector'}.`,

      // Evidence (Optional)
      photo_references: photoReferences,
      video_references: videoReferences,

      // Inspector Credentials
      inspected_by: currentUser?.email || currentUser?.id,
      inspector_name: currentUser?.name || 'Authorized Inspector',
      inspector_role: currentUser?.role || 'fleet_manager'
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/inspections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit inspection');
      }

      setSubmitSuccess(data.inspection || payload);
      if (onInspectionCompleted) {
        onInspectionCompleted(data.inspection || payload);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Inspection submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToScanAnother = () => {
    setSelectedDrone(null);
    setScannedDroneRawId('');
    setSubmitSuccess(null);
    setSubmitError(null);
    setNotes('');
    setPhotoReferences([]);
    setVideoReferences([]);
    setOverallVerdict('PASSED');
    setDefectClassification('ZERO_DEFECT');
    setScanMode('camera');
  };

  // Format role label
  const formatRoleLabel = (role?: string) => {
    if (!role) return 'Operations Inspector';
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Super Administrator';
      case 'fleet_manager':
        return 'Fleet & Maintenance Manager';
      case 'dispatcher':
        return 'Flight Mission Dispatcher';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hidden container for file scanning fallback */}
      <div id="admin-qc-temp-reader" className="hidden" />

      {/* TOP INSPECTOR IDENTITY BAR */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#5a00b8] to-purple-600 text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-md shadow-purple-600/20 shrink-0">
            {currentUser?.name?.[0]?.toUpperCase() || 'I'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Drone QR Scanning & Airframe Inspection
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-[#5a00b8] border border-purple-200">
                Depot QC Desk
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Inspector: <strong className="text-slate-900">{currentUser?.name || 'Puneet Kushwaha'}</strong> · Role:{' '}
              <span className="inline-flex items-center font-bold text-[#5a00b8]">
                {formatRoleLabel(currentUser?.role)}
              </span>{' '}
              · Station: <span className="font-semibold text-slate-700">Hub Alpha (Sector 4)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {onOpenAuditLogs && (
            <button
              onClick={onOpenAuditLogs}
              className="w-full md:w-auto justify-center px-4 py-2.5 rounded-xl border border-slate-200 hover:border-purple-300 bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-[#5a00b8] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <FileText className="w-4 h-4 text-purple-600 shrink-0" />
              <span>View Audit Logs</span>
            </button>
          )}
          {selectedDrone && (
            <button
              onClick={handleResetToScanAnother}
              className="w-full md:w-auto justify-center px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Scan Another Aircraft</span>
            </button>
          )}
        </div>
      </div>

      {/* STAGE 1: SCANNER & DRONE SELECTOR (Visible when no drone is selected) */}
      {!selectedDrone && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#5a00b8]" />
              Select or Scan Drone QR Code
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Choose your preferred scan method: Live Webcam, Image File Upload, Snap a Photo, or Manual Fleet Selection.
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
            <button
              onClick={() => {
                setScanError(null);
                setScanMode('camera');
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                scanMode === 'camera'
                  ? 'bg-white text-[#5a00b8] shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">1. Live Camera</span>
            </button>

            <button
              onClick={() => {
                setScanError(null);
                setScanMode('upload');
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                scanMode === 'upload'
                  ? 'bg-white text-[#5a00b8] shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">2. Upload QR</span>
            </button>

            <button
              onClick={() => {
                setScanError(null);
                setScanMode('snapshot');
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                scanMode === 'snapshot'
                  ? 'bg-white text-[#5a00b8] shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">3. Snap Photo</span>
            </button>

            <button
              onClick={() => {
                setScanError(null);
                setScanMode('manual');
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                scanMode === 'manual'
                  ? 'bg-white text-[#5a00b8] shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">4. Fleet Search</span>
            </button>
          </div>

          {/* Alert / Error Bar */}
          {scanError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{scanError}</span>
              </div>
              <button
                onClick={() => setScanError(null)}
                className="text-rose-500 hover:text-rose-700 text-xs font-bold underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* MODE 1: LIVE WEBCAM SCAN */}
          {scanMode === 'camera' && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-full max-w-md h-80 rounded-3xl bg-slate-900 overflow-hidden border-4 border-slate-800 shadow-xl flex items-center justify-center">
                <div id={liveScannerContainerId} className="w-full h-full" />
                {/* Visual Scanner HUD Reticle */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 border-2 border-[#5a00b8] rounded-3xl relative shadow-[0_0_20px_rgba(90,0,184,0.4)]">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-purple-400 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-purple-400 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-purple-400 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-purple-400 rounded-br-xl" />
                    <div className="absolute inset-x-4 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <FlipHorizontal className="w-4 h-4 text-[#5a00b8]" />
                  <span>Switch Camera ({cameraFacing === 'environment' ? 'Back' : 'Front'})</span>
                </button>
                <button
                  type="button"
                  onClick={startLiveScanner}
                  className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#5a00b8] text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  <RefreshCw className="w-4 h-4 text-[#5a00b8]" />
                  <span>Restart Camera</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: UPLOAD QR IMAGE FILE */}
          {scanMode === 'upload' && (
            <div className="p-8 border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-3xl bg-purple-50/30 text-center flex flex-col items-center justify-center space-y-4 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 text-[#5a00b8] flex items-center justify-center shadow-inner">
                <Upload className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h4 className="text-sm font-black text-slate-900">Upload Drone QR Image / Screenshot</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Supports downloaded PNG badges, batch QR stickers, camera screenshots, and JPEG/WEBP drone label photos.
                </p>
              </div>
              <label className="px-6 py-3 rounded-2xl bg-[#5a00b8] hover:bg-[#4a0099] text-white text-xs font-bold shadow-lg shadow-purple-600/20 cursor-pointer transition-all flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Browse QR Image File</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) decodeQRFromImageFile(file);
                  }}
                />
              </label>
            </div>
          )}

          {/* MODE 3: SNAP PHOTO (Instant Webcam Shot or Mobile Cam Capture) */}
          {scanMode === 'snapshot' && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-full max-w-md h-72 rounded-3xl bg-slate-900 overflow-hidden border-4 border-slate-800 shadow-xl flex items-center justify-center">
                <video ref={snapshotVideoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
                {!isSnapshotCamActive && (
                  <div className="text-slate-400 text-xs font-medium text-center px-4">
                    Webcam preview starting...
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleTakeSnapshotAndDecode}
                  className="px-6 py-3 rounded-2xl bg-[#5a00b8] hover:bg-[#4a0099] text-white text-xs font-black shadow-lg shadow-purple-600/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Snap Photo & Decode QR</span>
                </button>

                {/* Direct Mobile Camera Capture Fallback */}
                <label className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>Use Device Camera App</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) decodeQRFromImageFile(file);
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* MODE 4: QUICK FLEET / ORDER SEARCH */}
          {scanMode === 'manual' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type Drone ID (e.g. DRN-700-001) or Serial Number..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#5a00b8] focus:ring-2 focus:ring-purple-200 text-sm font-semibold text-slate-900 transition-all outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
                {availableDrones
                  .filter((d) => {
                    const q = searchQuery.toLowerCase();
                    return (
                      !q ||
                      String(d.id || '').toLowerCase().includes(q) ||
                      String(d.model || '').toLowerCase().includes(q) ||
                      String(d.serial_number || '').toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 15)
                  .map((drone) => (
                    <button
                      key={drone.id}
                      onClick={() => resolveDrone(drone.id)}
                      className="p-3.5 rounded-2xl border border-slate-200 hover:border-[#5a00b8] bg-white hover:bg-purple-50/50 text-left transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-[#5a00b8] shrink-0" />
                          <span className="font-black text-xs text-slate-900 group-hover:text-[#5a00b8]">
                            {drone.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{drone.model || '700 RPAV'}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {drone.status || 'Ready'}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STAGE 2: DEDICATED AIRFRAME INSPECTION PAGE (Shown when a Drone is Scanned/Selected) */}
      {selectedDrone && (
        <div className="space-y-6">
          {/* SUCCESS BANNER: AIRCRAFT IDENTIFIED */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-emerald-950">
                    Aircraft Locked: {selectedDrone.id}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-200 text-emerald-900">
                    Ready for Airframe Inspection
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Model: <strong>{selectedDrone.model || 'IndoWings 700 RPAV'}</strong>
                  {selectedDrone.linkedOrder && (
                    <span className="ml-2 font-semibold">
                      · Linked Order: #{selectedDrone.linkedOrder.order_id || selectedDrone.linkedOrder.id}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={handleResetToScanAnother}
              className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-xs font-bold transition-all flex items-center gap-2 self-start sm:self-center cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-4 h-4 text-emerald-700" />
              <span>Change / Re-Scan</span>
            </button>
          </div>

          {/* INSPECTION FORM */}
          {submitSuccess ? (
            <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Airframe Inspection Certified & Authorized!
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  The inspection record for aircraft <strong>{selectedDrone.id}</strong> was successfully recorded by{' '}
                  <strong>{currentUser?.name || 'Inspector'}</strong> ({formatRoleLabel(currentUser?.role)}) with verdict{' '}
                  <strong className={submitSuccess.overall_inspection === 'PASSED' ? 'text-emerald-600' : 'text-rose-600'}>
                    {submitSuccess.overall_inspection}
                  </strong>
                  .
                </p>
              </div>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleResetToScanAnother}
                  className="px-5 py-2.5 rounded-2xl bg-[#5a00b8] hover:bg-[#4a0099] text-white text-xs font-black shadow-md cursor-pointer transition-all"
                >
                  Scan Next Drone
                </button>
                {onOpenAuditLogs && (
                  <button
                    onClick={onOpenAuditLogs}
                    className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer transition-all"
                  >
                    View in Audit Console
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitInspection} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
              {/* SECTION 1: PHYSICAL PARTS CHECK */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-[#5a00b8]" />
                      1. Physical Airframe & Parts Condition
                    </h4>
                    <p className="text-xs text-slate-500">
                      Check chassis, motor arms, propellers, and landing skids for physical integrity.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
                    Checklist 1/4
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Airframe Body & Arms */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-900 block">
                      Body & Arms Integrity
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'GOOD', label: 'Good / Perfect', sub: 'No visible scratches', color: 'emerald' },
                        { id: 'MINOR_SCRATCH', label: 'Minor Scratch', sub: 'Minor surface mark', color: 'amber' },
                        { id: 'CRACKED', label: 'Crack / Bend', sub: 'Cracked or bent', color: 'rose' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setBodyCondition(item.id as any)}
                          className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                            bodyCondition === item.id
                              ? 'bg-white border-[#5a00b8] text-[#5a00b8] shadow-xs'
                              : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <div>{item.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{item.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Propellers & Rotors */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-900 block">
                      Propellers & Blades
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'GOOD', label: 'Free Spin Clean', sub: 'Clean & spins free', color: 'emerald' },
                        { id: 'HAIRLINE_NICK', label: 'Hairline Nick', sub: 'Hairline nick', color: 'amber' },
                        { id: 'DAMAGED', label: 'Chipped/Damaged', sub: 'Chipped or damaged', color: 'rose' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPropellerCondition(item.id as any)}
                          className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                            propellerCondition === item.id
                              ? 'bg-white border-[#5a00b8] text-[#5a00b8] shadow-xs'
                              : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <div>{item.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{item.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Landing Gear Skid */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-900 block">
                      Landing Gear & Skids
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'GOOD', label: 'Stable & Tight', sub: 'Stable & secure', color: 'emerald' },
                        { id: 'LOOSE', label: 'Loose Screws', sub: 'Loose fasteners', color: 'amber' },
                        { id: 'DAMAGED', label: 'Bent Skid', sub: 'Bent or damaged', color: 'rose' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setLandingGearCondition(item.id as any)}
                          className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                            landingGearCondition === item.id
                              ? 'bg-white border-[#5a00b8] text-[#5a00b8] shadow-xs'
                              : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <div>{item.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{item.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payload & Cargo Bay */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-900 block">
                      Payload & Cargo Bay Lock
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'CLEAN_RELEASE', label: 'Operational Lock', sub: 'Locks securely', color: 'emerald' },
                        { id: 'LATCH_STICKY', label: 'Sticky Latch', sub: 'Sticky latch', color: 'amber' },
                        { id: 'DAMAGED', label: 'Faulty / Jammed', sub: 'Faulty or jammed', color: 'rose' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCargoBayCondition(item.id as any)}
                          className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                            cargoBayCondition === item.id
                              ? 'bg-white border-[#5a00b8] text-[#5a00b8] shadow-xs'
                              : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <div>{item.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{item.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: AVIONICS, BATTERY & FLYING/HOVER TEST */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Plane className="w-4 h-4 text-[#5a00b8]" />
                      2. Flight, Avionics & Battery Test
                    </h4>
                    <p className="text-xs text-slate-500">
                      Hover bench stability, motor vibration, GPS 3D fix, and battery cell health.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
                    Checklist 2/4
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Battery Charge Slider */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <Battery className="w-4 h-4 text-emerald-600" />
                        <span>Battery Charge Level %</span>
                      </label>
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        {batteryLevel}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={batteryLevel}
                      onChange={(e) => setBatteryLevel(Number(e.target.value))}
                      className="w-full accent-[#5a00b8] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>Min Safe: 80%</span>
                      <span>Target: 98%+</span>
                    </div>
                  </div>

                  {/* Battery Health Condition */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-900 block">
                      Battery Cell Health
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'NORMAL', label: 'Normal / Cool', sub: 'Cool & normal' },
                        { id: 'WARM', label: 'Slightly Warm', sub: 'Slightly warm' },
                        { id: 'SWOLLEN', label: 'Swollen / Reject', sub: 'Swollen / Reject' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setBatteryHealth(item.id as any)}
                          className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                            batteryHealth === item.id
                              ? 'bg-white border-[#5a00b8] text-[#5a00b8] shadow-xs'
                              : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <div>{item.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{item.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hover & Flight Test */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-900 block">
                      Hover & Flight Stability
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'STABLE_HOVER', label: 'Stable Hover', sub: 'Stable hover' },
                        { id: 'SLIGHT_DRIFT', label: 'Slight Drift', sub: 'Slight drift' },
                        { id: 'UNSTABLE', label: 'Oscillation', sub: 'Unstable oscillation' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setHoverFlightStability(item.id as any)}
                          className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                            hoverFlightStability === item.id
                              ? 'bg-white border-[#5a00b8] text-[#5a00b8] shadow-xs'
                              : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <div>{item.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{item.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Motor Vibration & Temp */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-900 block">
                      Motor Temp & Vibration
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'NORMAL', label: 'Normal Running', sub: 'Smooth & normal' },
                        { id: 'HIGH_VIBRATION', label: 'High Vibration', sub: 'High vibration' },
                        { id: 'OVERHEATING', label: 'Overheating', sub: 'Overheating' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setMotorTempVibration(item.id as any)}
                          className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                            motorTempVibration === item.id
                              ? 'bg-white border-[#5a00b8] text-[#5a00b8] shadow-xs'
                              : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <div>{item.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{item.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: DEFECT CLASSIFICATION & OVERALL VERDICT */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-[#5a00b8]" />
                      3. Defect Classification & Overall Verdict
                    </h4>
                    <p className="text-xs text-slate-500">
                      Classify technical findings and declare flight readiness clearance.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
                    Checklist 3/4
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Defect Classification */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-900 block">
                      Defect Classification
                    </label>
                    <div className="space-y-2">
                      {[
                        {
                          id: 'ZERO_DEFECT',
                          label: 'Zero Defect Certified',
                          desc: '100% clean airframe, ready for all commercial delivery sorties.'
                        },
                        {
                          id: 'MINOR_COSMETIC',
                          label: 'Minor Cosmetic',
                          desc: 'Minor paint or surface scratch, does not impact aerodynamics or safety.'
                        },
                        {
                          id: 'GROUNDING_DEFECT',
                          label: 'Grounding Defect',
                          desc: 'Critical issue detected. Aircraft must NOT fly until repaired.'
                        }
                      ].map((defect) => (
                        <button
                          key={defect.id}
                          type="button"
                          onClick={() => {
                            setDefectClassification(defect.id as any);
                            if (defect.id === 'GROUNDING_DEFECT') setOverallVerdict('FAILED');
                            if (defect.id === 'ZERO_DEFECT') setOverallVerdict('PASSED');
                          }}
                          className={`w-full p-3 rounded-xl text-left border transition-all cursor-pointer ${
                            defectClassification === defect.id
                              ? 'bg-white border-[#5a00b8] text-slate-900 ring-2 ring-purple-100'
                              : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <div className="text-xs font-black text-slate-900">{defect.label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{defect.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Overall Verdict */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-900 block mb-2">
                        Overall Inspection Verdict
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setOverallVerdict('PASSED')}
                          className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                            overallVerdict === 'PASSED'
                              ? 'bg-emerald-600 border-emerald-700 text-white shadow-lg shadow-emerald-600/20 font-black'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                          }`}
                        >
                          <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5" />
                          <div className="text-sm font-black">PASSED</div>
                          <div className="text-[11px] opacity-80 mt-0.5">Flight Cleared</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setOverallVerdict('FAILED')}
                          className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                            overallVerdict === 'FAILED'
                              ? 'bg-rose-600 border-rose-700 text-white shadow-lg shadow-rose-600/20 font-black'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
                          }`}
                        >
                          <AlertTriangle className="w-6 h-6 mx-auto mb-1.5" />
                          <div className="text-sm font-black">FAILED</div>
                          <div className="text-[11px] opacity-80 mt-0.5">Needs Maintenance</div>
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-[11px] text-purple-900">
                      <strong>QC Clearance Notice:</strong> Passing this inspection marks this drone operational in the
                      depot and prepares it for secure pilot handover.
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: PHOTO / VIDEO EVIDENCE (OPTIONAL) & REMARKS */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#5a00b8]" />
                      4. Media Evidence & Remarks (Optional)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Photos and videos are strictly <strong>optional / not mandatory</strong>. You can submit without uploading files.
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Optional
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Photo Evidence (Optional) */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-purple-600" />
                        <span>Photos (Optional)</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">Max 5 photos</span>
                    </div>

                    <label className="p-4 border-2 border-dashed border-slate-200 hover:border-[#5a00b8] rounded-xl bg-white text-center flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Add Photo Evidence (Optional)</span>
                      <span className="text-[10px] text-slate-400">Click or tap to upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleEvidenceUpload(e, 'photo')}
                      />
                    </label>

                    {photoReferences.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {photoReferences.map((ref, idx) => (
                          <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200">
                            <img src={ref.url} alt="photo" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setPhotoReferences((prev) => prev.filter((_, i) => i !== idx))}
                              className="absolute top-0 right-0 bg-slate-900/80 text-white p-0.5 rounded-bl"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Video Evidence (Optional) */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-purple-600" />
                        <span>Video Clip (Optional)</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">Max 10s clip</span>
                    </div>

                    <label className="p-4 border-2 border-dashed border-slate-200 hover:border-[#5a00b8] rounded-xl bg-white text-center flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Add Short Video (Optional)</span>
                      <span className="text-[10px] text-slate-400">Click or tap to upload</span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => handleEvidenceUpload(e, 'video')}
                      />
                    </label>

                    {videoReferences.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {videoReferences.map((ref, idx) => (
                          <div
                            key={idx}
                            className="relative px-3 py-1.5 rounded-lg bg-purple-100 text-[#5a00b8] text-xs font-bold flex items-center gap-2"
                          >
                            <span>Video #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setVideoReferences((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-slate-500 hover:text-slate-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Remarks Textarea */}
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1.5">
                    Inspector Notes & Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter any additional observations, battery serial, or maintenance advice..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#5a00b8] focus:ring-2 focus:ring-purple-200 text-xs text-slate-900 transition-all outline-hidden"
                  />
                </div>
              </div>

              {/* ERROR MESSAGE IF SUBMIT FAILS */}
              {submitError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* INSPECTOR SIGN-OFF & SUBMIT BUTTON */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-bold text-sm">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Certified by: {currentUser?.name || 'Authorized Personnel'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Official Role: {formatRoleLabel(currentUser?.role)} · Timestamp will be digitally signed
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-4 rounded-2xl bg-[#5a00b8] hover:bg-[#4a0099] disabled:opacity-50 text-white text-xs font-black tracking-wide shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Saving & Authorizing Inspection...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Complete & Authorize Airframe Inspection</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
