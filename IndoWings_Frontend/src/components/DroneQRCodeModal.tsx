import React, { useState } from 'react';
import {
  X,
  QrCode,
  Printer,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Plane,
  Radio,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Layers
} from 'lucide-react';

interface DroneQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  drone: {
    id: string;
    model?: string;
    model_name?: string;
    serial_number?: string;
    status?: string;
    current_condition?: string;
    battery?: number;
    flight_hours?: number;
    last_inspection_result?: string;
    last_inspected_at?: string;
  } | null;
  onOpenInspection?: (droneId: string) => void;
  onNavigate?: (page: string) => void;
}

export const DroneQRCodeModal: React.FC<DroneQRCodeModalProps> = ({
  isOpen,
  onClose,
  drone,
  onOpenInspection,
  onNavigate
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !drone) return null;

  const droneId = drone.id;
  const serialNumber = drone.serial_number || droneId;
  const modelName = drone.model_name || drone.model || '700RPAV';
  const condition = (drone.current_condition || 'GOOD').toUpperCase();
  const permanentUrl = `https://indo-fleet.vercel.app/drone/${encodeURIComponent(droneId)}`;
  
  // 300x300 QR Code with error correction level M and 4-module quiet zone (per Section 3 specification)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=M&margin=4&data=${encodeURIComponent(permanentUrl)}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(permanentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=500,height=500');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Airframe Label - ${droneId}</title>
          <style>
            @page {
              size: 25mm 25mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 1mm;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              text-align: center;
              background: #fff;
              color: #000;
              width: 25mm;
              height: 25mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .brand {
              font-size: 4.5pt;
              font-weight: 900;
              letter-spacing: 0.4px;
              text-transform: uppercase;
              margin-bottom: 0.4mm;
            }
            .qr-img {
              width: 14.5mm;
              height: 14.5mm;
              display: block;
              margin: 0 auto;
            }
            .drone-id {
              font-size: 4.5pt;
              font-weight: 800;
              font-family: monospace;
              margin-top: 0.4mm;
              white-space: nowrap;
            }
            .serial {
              font-size: 3.2pt;
              color: #444;
              font-family: monospace;
              white-space: nowrap;
            }
          </style>
        </head>
        <body>
          <div class="brand">INDOFLEET 700 RPAV</div>
          <img class="qr-img" src="${qrImageUrl}" alt="QR" />
          <div class="drone-id">${droneId}</div>
          <div class="serial">S/N: ${serialNumber}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(qrImageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_LABEL_${droneId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(qrImageUrl, '_blank');
    }
  };

  const handleOpenPublicPage = () => {
    window.open(`/drone/${encodeURIComponent(droneId)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200/90 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-[#3a0075] to-slate-950 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <QrCode className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Airframe QR Identity Label
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 text-[10px] font-bold border border-purple-400/20">
                  700 RPAV Spec
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80 font-mono mt-0.5">
                Permanent Airframe Identification • Fixed Life Cycle
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Printable Label Box (Specification: 25mm x 25mm airframe sticker) */}
          <div className="flex flex-col items-center justify-center p-5 bg-slate-50/80 border-2 border-dashed border-purple-200/80 rounded-3xl">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/90 text-center flex flex-col items-center w-full max-w-[270px]">
              <div className="text-[11px] font-black uppercase tracking-wider text-[#5a00b8] mb-1.5 flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 transform -rotate-45" />
                <span>IndoFleet 700 RPAV</span>
              </div>
              
              <div className="p-2 bg-slate-50/50 rounded-xl border border-slate-100 shadow-2xs">
                <img
                  src={qrImageUrl}
                  alt={`QR code for ${droneId}`}
                  className="w-44 h-44 object-contain rounded-lg"
                />
              </div>

              <div className="mt-3 w-full px-1">
                <span className="font-mono font-black text-slate-900 text-sm tracking-tight block whitespace-nowrap select-all">
                  {droneId}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block whitespace-nowrap mt-0.5 select-all">
                  S/N: {serialNumber}
                </span>
              </div>

              <div className="mt-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                    condition === 'GOOD'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : condition === 'DAMAGED'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      condition === 'GOOD'
                        ? 'bg-emerald-500'
                        : condition === 'DAMAGED'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <span>Condition: {condition}</span>
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2.5 text-center font-medium">
              25mm × 25mm adhesive sticker &bull; Level M ECC &bull; 4-module quiet zone
            </p>
          </div>

          {/* Airframe Details Grid (2x2 sleek cards) */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Model / Series</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">{modelName}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operational Status</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 flex items-center gap-1.5 capitalize">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  drone.status === 'maintenance' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <span className="truncate">{drone.status || 'Available'}</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Airframe Condition</span>
              <span className={`text-xs font-bold mt-0.5 block truncate ${
                condition === 'GOOD' ? 'text-emerald-700' : 'text-amber-700'
              }`}>{condition}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">QC Inspection</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                {drone.last_inspection_result
                  ? `${drone.last_inspection_result}`
                  : 'Pre-flight QC Approved'}
              </span>
            </div>
          </div>

          {/* Permanent URL Box */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700">
              Permanent QR Scan URL (Open in any phone camera)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={permanentUrl}
                className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800 select-all focus:outline-none focus:border-[#5a00b8]"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-[#5a00b8] border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                title="Copy URL to Clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons: 2x2 Grid */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2.5 bg-gradient-to-r from-[#5a00b8] to-[#7928ca] hover:opacity-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-950/20 active:scale-98"
              >
                <Printer className="w-4 h-4 text-purple-200" />
                <span>Print 25mm Label</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-98"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Download PNG</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleOpenPublicPage}
                className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100/80 text-[#5a00b8] border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#5a00b8]" />
                <span>Open Public Page</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenInspection) onOpenInspection(droneId);
                }}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Record Inspection</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
