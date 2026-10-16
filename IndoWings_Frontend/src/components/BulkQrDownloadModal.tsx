import React, { useState, useMemo } from 'react';
import {
  X,
  QrCode,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PackageCheck,
  Layers,
  FileArchive,
  Hash
} from 'lucide-react';
import { DroneQRInfo, downloadDronesAsZip } from '../utils/droneQrGenerator';

interface BulkQrDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  allDrones: DroneQRInfo[];
  defaultRangeMax?: number;
}

export const BulkQrDownloadModal: React.FC<BulkQrDownloadModalProps> = ({
  isOpen,
  onClose,
  allDrones,
  defaultRangeMax
}) => {
  const [mode, setMode] = useState<'range' | 'all' | 'custom'>('range');
  const [fromIndex, setFromIndex] = useState<number>(1);
  const [toIndex, setToIndex] = useState<number>(Math.min(100, allDrones.length || 100));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customInput, setCustomInput] = useState<string>('');

  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; currentId: string }>({
    current: 0,
    total: 0,
    currentId: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sort drones by ID or serial number logically
  const sortedDrones = useMemo(() => {
    return [...allDrones].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
  }, [allDrones]);

  // Compute targets based on selected mode
  const targetDrones = useMemo(() => {
    if (mode === 'all') {
      return sortedDrones;
    }
    if (mode === 'range') {
      const start = Math.max(0, fromIndex - 1);
      const end = Math.min(sortedDrones.length, toIndex);
      return sortedDrones.slice(start, end);
    }
    if (mode === 'custom') {
      if (customInput.trim()) {
        const parts = customInput.split(/[\n,;\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
        const set = new Set(parts);
        return sortedDrones.filter(d => set.has(d.id.toLowerCase()) || (d.serial_number && set.has(d.serial_number.toLowerCase())));
      }
      return sortedDrones.filter(d => selectedIds.has(d.id));
    }
    return [];
  }, [mode, fromIndex, toIndex, sortedDrones, customInput, selectedIds]);

  if (!isOpen) return null;

  const handleStartDownload = async () => {
    if (targetDrones.length === 0) {
      setError('No drones found in the selected range or criteria.');
      return;
    }

    setDownloading(true);
    setError('');
    setSuccess('');
    setProgress({ current: 0, total: targetDrones.length, currentId: '' });

    try {
      const zipName = mode === 'range'
        ? `IndoWings_Drone_QRs_Units_${fromIndex}_to_${toIndex}`
        : mode === 'all'
          ? `IndoWings_All_Drone_QRs_${targetDrones.length}_Units`
          : `IndoWings_Drone_QRs_Batch_${targetDrones.length}_Units`;

      await downloadDronesAsZip(targetDrones, zipName, (current, total, currentId) => {
        setProgress({ current, total, currentId });
      });

      setSuccess(`Successfully generated and downloaded ${targetDrones.length} drone QR codes in ZIP archive.`);
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 3500);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate bulk QR code zip.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-50 via-white to-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#5a00b8] flex items-center justify-center shadow-xs">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Bulk Drone QR Code Downloader</h3>
              <p className="text-xs text-slate-500">Serial-wise batch generation &amp; ZIP bundling (0 mismatch guarantee)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={downloading}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Mode Tabs */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Download Strategy:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('range')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'range'
                    ? 'border-[#5a00b8] bg-purple-50 text-[#5a00b8] shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Serial Range</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('all')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'all'
                    ? 'border-[#5a00b8] bg-purple-50 text-[#5a00b8] shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All ({allDrones.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'custom'
                    ? 'border-[#5a00b8] bg-purple-50 text-[#5a00b8] shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Paste IDs</span>
              </button>
            </div>
          </div>

          {/* Range Configuration */}
          {mode === 'range' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Sequential Unit Range (1 to N)</span>
                <span className="text-[11px] text-slate-500 font-semibold">Total Stock: {allDrones.length} Units</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">From Serial # (1-based)</label>
                  <input
                    type="number"
                    min={1}
                    max={allDrones.length || 1}
                    value={fromIndex}
                    onChange={(e) => setFromIndex(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">To Serial # (Up to 100+)</label>
                  <input
                    type="number"
                    min={fromIndex}
                    max={allDrones.length || 100}
                    value={toIndex}
                    onChange={(e) => setToIndex(Math.max(fromIndex, parseInt(e.target.value) || fromIndex))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {targetDrones.length > 0 && (
                <div className="pt-1 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>First: <strong className="font-mono text-purple-700">{targetDrones[0].id}</strong></span>
                  <span>Last: <strong className="font-mono text-purple-700">{targetDrones[targetDrones.length - 1].id}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* All Drones Overview */}
          {mode === 'all' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="font-bold text-slate-800">Download Entire Fleet Inventory</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Will generate official branded QR PNG codes for all <strong>{allDrones.length}</strong> active inventory units and package them into a single high-speed ZIP archive.
              </p>
            </div>
          )}

          {/* Custom Paste IDs */}
          {mode === 'custom' && (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Paste Drone IDs or Serial Numbers (Separated by comma or newline):
              </label>
              <textarea
                rows={3}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g. INW-700RPAV-0001, INW-700RPAV-0004, INW-700RPAV-0010"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-800 focus:outline-none focus:border-purple-600 resize-none"
              />
            </div>
          )}

          {/* Download Summary Pill */}
          <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-purple-900">
              <PackageCheck className="w-4 h-4 text-purple-700" />
              <span>{targetDrones.length} Drones Ready to Export</span>
            </div>
            <span className="text-[11px] font-mono text-purple-700">PNG Label Format (Level H)</span>
          </div>

          {/* Progress Bar (During Generation) */}
          {downloading && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                  <span>Processing: {progress.currentId}</span>
                </span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#5a00b8] to-purple-500 transition-all duration-150"
                  style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                Generating high-resolution canvas with IndoWings emblem and creating ZIP archive…
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={downloading}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartDownload}
              disabled={downloading || targetDrones.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-[#5a00b8] hover:bg-[#470091] text-white font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating ZIP...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download ZIP ({targetDrones.length})</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
