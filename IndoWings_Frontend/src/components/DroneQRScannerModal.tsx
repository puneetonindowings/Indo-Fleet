import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Camera,
  Search,
  Upload,
  Plane,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Printer,
  RefreshCw,
  Zap,
  Volume2,
  VolumeX,
  FlipHorizontal
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface DroneQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDrones: any[];
  onSelectDroneForInspection?: (droneId: string) => void;
  onSelectDroneForQRLabel?: (drone: any) => void;
}

export const DroneQRScannerModal: React.FC<DroneQRScannerModalProps> = ({
  isOpen,
  onClose,
  availableDrones = [],
  onSelectDroneForInspection,
  onSelectDroneForQRLabel
}) => {
  const [mode, setMode] = useState<'camera' | 'manual' | 'file'>('camera');
  const [searchInput, setSearchInput] = useState('');
  const [matchedDrone, setMatchedDrone] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'drone-qr-reader-container';

  // Synthesize a confirmation beep on successful scan using Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz (A5)
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {}
  };

  const parseAndMatchDrone = (scannedText: string) => {
    const clean = scannedText.trim();
    if (!clean) return;

    let target = clean.toLowerCase();
    if (clean.includes('/drone/')) {
      const parts = clean.split('/drone/');
      target = parts[1].split('?')[0].replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    }

    const found = availableDrones.find(
      (d) =>
        String(d.id || '').toLowerCase() === target ||
        String(d.serial_number || '').toLowerCase() === target ||
        String(d.id || '').toLowerCase().includes(target)
    );

    if (found) {
      playBeep();
      setMatchedDrone(found);
      setNotFound(false);
      stopCamera();
    } else {
      setMatchedDrone(null);
      setNotFound(true);
    }
  };

  // Start live camera QR scanner
  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}
      }

      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: facing },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          parseAndMatchDrone(decodedText);
        },
        () => {
          // Frame error (no QR in current frame) - ignore
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera launch error:', err);
      setIsCameraActive(false);
      setCameraError(
        err?.message?.includes('Permission')
          ? 'Camera permission was denied. Please allow camera access in browser permissions or use Manual ID search below.'
          : 'Unable to start camera. Please ensure no other app is using your webcam, or use Manual ID search.'
      );
    }
  };

  // Stop camera stream safely
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Switch between front & back camera
  const toggleFacingMode = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    await stopCamera();
    setTimeout(() => {
      startCamera(nextFacing);
    }, 200);
  };

  // Manage scanner lifecycle on modal open/close & mode change
  useEffect(() => {
    if (isOpen && mode === 'camera' && !matchedDrone) {
      // Delay slightly for DOM element render
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, mode, matchedDrone]);

  // Handle file upload scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('file-qr-temp');
      const result = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      parseAndMatchDrone(result);
    } catch (err: any) {
      setNotFound(true);
      setMatchedDrone(null);
    }
  };

  const handleManualSearch = (query: string) => {
    setSearchInput(query);
    parseAndMatchDrone(query);
  };

  const handleScanAnother = () => {
    setMatchedDrone(null);
    setNotFound(false);
    setSearchInput('');
    setMode('camera');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200/90 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-[#3a0075] to-slate-950 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Camera className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Live Airframe QR Scanner
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/20">
                  {isCameraActive ? 'Camera Live' : 'Hardware OCR'}
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80 mt-0.5">
                Scan 25mm airframe QR label to inspect drone condition &amp; history
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        {!matchedDrone && (
          <div className="flex border-b border-slate-100 bg-slate-50/70 p-2 gap-1.5 text-xs font-bold">
            <button
              onClick={() => setMode('camera')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'camera'
                  ? 'bg-white text-[#5a00b8] shadow-xs border border-purple-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Stream</span>
            </button>

            <button
              onClick={() => {
                stopCamera();
                setMode('manual');
              }}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'manual'
                  ? 'bg-white text-[#5a00b8] shadow-xs border border-purple-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Manual ID</span>
            </button>

            <button
              onClick={() => {
                stopCamera();
                setMode('file');
              }}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'file'
                  ? 'bg-white text-[#5a00b8] shadow-xs border border-purple-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Image</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* ── MODE 1: LIVE WEBCAM CAMERA SCANNER ── */}
          {mode === 'camera' && !matchedDrone && (
            <div className="space-y-4">
              <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex flex-col items-center justify-center min-h-[300px]">
                {/* HTML5 QR Code Mount Element */}
                <div id={readerElementId} className="w-full h-full min-h-[300px]" />

                {/* Viewfinder Target Overlays */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-56 h-56 border-2 border-purple-400/80 rounded-2xl relative shadow-2xl">
                      {/* Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#a855f7] rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#a855f7] rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#a855f7] rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#a855f7] rounded-br-lg" />

                      {/* Animated Laser Scanning Line */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_#a855f7] animate-pulse absolute top-1/2 -translate-y-1/2" />
                    </div>

                    <div className="mt-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/10">
                      Align 25mm Airframe QR inside frame
                    </div>
                  </div>
                )}

                {/* Camera Flip Control Bar */}
                {isCameraActive && (
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition cursor-pointer"
                      title="Switch Front/Back Camera"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Camera Fallback / Error State */}
                {cameraError && (
                  <div className="p-6 text-center text-white space-y-3 z-10 max-w-sm">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Camera Access Required</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{cameraError}</p>
                    </div>
                    <div className="flex justify-center gap-2 pt-2">
                      <button
                        onClick={() => startCamera()}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Camera</span>
                      </button>
                      <button
                        onClick={() => setMode('manual')}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Enter ID Manually
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#5a00b8]/10 text-[#5a00b8] flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">Universal 700 RPAV QR Scanner</span>
                  <p className="text-[11px] text-slate-500">
                    Works with phone cameras and webcams. Reads printed airframe labels instantly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── MODE 2: MANUAL ID SEARCH ── */}
          {mode === 'manual' && !matchedDrone && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Enter Drone ID, Serial Number, or Scanned URL:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => handleManualSearch(e.target.value)}
                    placeholder="e.g. INW-700RPAV-0004 or RPAV-000001"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#5a00b8] focus:ring-2 focus:ring-[#5a00b8]/20 transition-all"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Sample Quick Selection */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Quick Select Airframe from Central Fleet:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200/80">
                  {availableDrones.slice(0, 12).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleManualSearch(d.id)}
                      className="px-2.5 py-1 text-xs font-mono font-bold bg-white hover:bg-purple-50 text-slate-700 hover:text-[#5a00b8] border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                    >
                      {d.id}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── MODE 3: UPLOAD QR IMAGE ── */}
          {mode === 'file' && !matchedDrone && (
            <div className="space-y-4">
              <div id="file-qr-temp" className="hidden" />
              <label className="border-2 border-dashed border-purple-200 hover:border-[#5a00b8] rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all bg-slate-50/50 hover:bg-purple-50/20">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#5a00b8] flex items-center justify-center border border-purple-100 shadow-2xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-900 block">Click to upload QR code photo</span>
                  <span className="text-[11px] text-slate-500">Supports PNG, JPG, WEBP airframe sticker photos</span>
                </div>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}

          {/* Not Found Warning */}
          {notFound && searchInput.trim() && !matchedDrone && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong>No airframe matched: &ldquo;{searchInput}&rdquo;</strong>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Verify the ID format matches INW-700RPAV-XXXX or RPAV-000001.
                </p>
              </div>
            </div>
          )}

          {/* ── MATCHED DRONE CARD (POST-SCAN SUCCESS STATE) ── */}
          {matchedDrone && (
            <div className="p-6 bg-gradient-to-br from-purple-50/70 via-white to-slate-50 border border-purple-200/90 rounded-3xl space-y-5 animate-fadeIn shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black font-mono text-slate-950">
                      {matchedDrone.id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        (matchedDrone.current_condition || '').toUpperCase() === 'GOOD'
                          ? 'bg-emerald-100 text-emerald-800'
                          : (matchedDrone.current_condition || '').toUpperCase() === 'DAMAGED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{matchedDrone.current_condition || 'GOOD'}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    S/N: {matchedDrone.serial_number || matchedDrone.id} &bull; Model: {matchedDrone.model_name || matchedDrone.model || '700RPAV'}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-purple-100 text-[#5a00b8] flex items-center justify-center font-bold shadow-2xs">
                  <Plane className="w-5 h-5 transform -rotate-45" />
                </div>
              </div>

              {/* 2x2 Specs & QC Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-3 rounded-2xl border border-purple-100/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Battery System</span>
                  <strong className="text-slate-900 text-sm font-mono mt-0.5 block">{matchedDrone.battery ?? 100}%</strong>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-purple-100/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Operational Status</span>
                  <strong className="text-slate-900 text-sm capitalize mt-0.5 block">{matchedDrone.status || 'Available'}</strong>
                </div>
              </div>

              {/* Action Buttons for this Scanned Drone */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                      if (onSelectDroneForInspection) onSelectDroneForInspection(matchedDrone.id);
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#5a00b8] to-[#7928ca] hover:opacity-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-purple-950/20 cursor-pointer transition-all"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Record Inspection</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                      if (onSelectDroneForQRLabel) onSelectDroneForQRLabel(matchedDrone);
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4 text-[#5a00b8]" />
                    <span>View &amp; Print QR</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-purple-100">
                  <a
                    href={`/drone/${encodeURIComponent(matchedDrone.id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#5a00b8] hover:underline font-bold"
                  >
                    <span>Open Public Scanned View</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={handleScanAnother}
                    className="text-xs text-slate-500 hover:text-slate-900 font-bold cursor-pointer"
                  >
                    Scan Another Drone &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
