import React, { useState } from 'react';
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
  Printer
} from 'lucide-react';

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
  const [searchInput, setSearchInput] = useState('');
  const [matchedDrone, setMatchedDrone] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);

  if (!isOpen) return null;

  const handleSearch = (query: string) => {
    setSearchInput(query);
    const clean = query.trim().toLowerCase();
    if (!clean) {
      setMatchedDrone(null);
      setNotFound(false);
      return;
    }

    // Match by ID, serial_number, or if full URL was pasted (e.g. https://indo-fleet.vercel.app/drone/INW-700RPAV-0001)
    let target = clean;
    if (clean.includes('/drone/')) {
      target = clean.split('/drone/')[1].split('?')[0].replace(/[^a-z0-9_-]/g, '');
    }

    const found = availableDrones.find(
      (d) =>
        String(d.id || '').toLowerCase() === target ||
        String(d.serial_number || '').toLowerCase() === target ||
        String(d.id || '').toLowerCase().includes(target)
    );

    if (found) {
      setMatchedDrone(found);
      setNotFound(false);
    } else {
      setMatchedDrone(null);
      setNotFound(true);
    }
  };

  const handleSimulateScan = (droneId: string) => {
    handleSearch(droneId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-900 via-[#5a00b8] to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                Scan Airframe QR Code
              </h3>
              <p className="text-[11px] text-purple-200">
                Identify UAV airframe, inspect condition &amp; delivery records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Scanner Input / Search */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Enter Drone ID, Serial, or Scanned QR URL:
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="e.g. INW-700RPAV-0004 or RPAV-000001"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-purple-200 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#5a00b8] focus:ring-2 focus:ring-purple-200"
                autoFocus
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
            <p className="text-[11px] text-slate-400">
              💡 Tip: Scanning the printed 25mm airframe sticker opens this drone record immediately.
            </p>
          </div>

          {/* Quick Select from Fleet */}
          {!matchedDrone && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Quick Select Sample Airframe to Inspect:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                {availableDrones.slice(0, 10).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSimulateScan(d.id)}
                    className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-[#5a00b8] border border-slate-200 rounded-lg transition cursor-pointer"
                  >
                    {d.id}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Not Found Alert */}
          {notFound && searchInput.trim() && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong>No airframe matched: &ldquo;{searchInput}&rdquo;</strong>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Verify the ID format matches RPAV-000001 or INW-700RPAV-XXXX.
                </p>
              </div>
            </div>
          )}

          {/* Matched Drone Card */}
          {matchedDrone && (
            <div className="p-5 bg-gradient-to-br from-purple-50/50 to-indigo-50/30 border border-purple-200 rounded-2xl space-y-4 animate-fadeIn">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black font-mono text-slate-900">
                      {matchedDrone.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      matchedDrone.current_condition === 'GOOD'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {matchedDrone.current_condition || 'GOOD'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    S/N: {matchedDrone.serial_number || matchedDrone.id} &bull; Model: {matchedDrone.model_name || matchedDrone.model || '700RPAV'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#5a00b8] flex items-center justify-center font-bold text-xs">
                  <Plane className="w-5 h-5" />
                </div>
              </div>

              {/* Specs & History Summary */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                  <span className="text-[10px] text-slate-400 block font-semibold">BATTERY HEALTH</span>
                  <strong className="text-slate-800">{matchedDrone.battery ?? 100}%</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                  <span className="text-[10px] text-slate-400 block font-semibold">STATUS</span>
                  <strong className="text-slate-800 capitalize">{matchedDrone.status || 'Available'}</strong>
                </div>
              </div>

              {/* Action Buttons for this Drone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onSelectDroneForInspection) onSelectDroneForInspection(matchedDrone.id);
                  }}
                  className="px-4 py-2.5 bg-[#5a00b8] hover:bg-[#4a0099] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Record Inspection</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onSelectDroneForQRLabel) onSelectDroneForQRLabel(matchedDrone);
                  }}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition"
                >
                  <Printer className="w-4 h-4 text-purple-600" />
                  <span>View &amp; Print QR</span>
                </button>
              </div>

              <div className="text-center">
                <a
                  href={`/drone/${encodeURIComponent(matchedDrone.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#5a00b8] hover:underline font-bold"
                >
                  <span>Open Public Scanned View</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
