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
  Wrench,
  CheckCircle2,
  AlertTriangle
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
  const condition = drone.current_condition || 'GOOD';
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
              padding: 1.5mm;
              font-family: Arial, sans-serif;
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
              font-size: 5pt;
              font-weight: 900;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              margin-bottom: 0.5mm;
            }
            .qr-img {
              width: 15mm;
              height: 15mm;
              display: block;
              margin: 0 auto;
            }
            .drone-id {
              font-size: 5pt;
              font-weight: 800;
              font-family: monospace;
              margin-top: 0.5mm;
            }
            .serial {
              font-size: 3.5pt;
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="brand">INDOFLEET 700RPAV</div>
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-purple-900 via-[#5a00b8] to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                Airframe QR Identity Label
              </h3>
              <p className="text-[11px] text-purple-200 font-mono">
                Permanent 700 RPAV Specification
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Printable Label Box (Specification: 25mm x 25mm airframe sticker) */}
          <div className="flex flex-col items-center justify-center p-5 bg-slate-50 border-2 border-dashed border-purple-200 rounded-2xl">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center max-w-[240px]">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#5a00b8] mb-1">
                IndoFleet 700 RPAV
              </div>
              <img
                src={qrImageUrl}
                alt={`QR code for ${droneId}`}
                className="w-44 h-44 object-contain rounded-lg border border-slate-100"
              />
              <div className="mt-2 text-xs font-mono font-black text-slate-900 tracking-wider">
                {droneId}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                S/N: {serialNumber}
              </div>
              <div className="mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  condition === 'GOOD'
                    ? 'bg-emerald-100 text-emerald-800'
                    : condition === 'DAMAGED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {condition === 'GOOD' ? '● Condition: GOOD' : `● ${condition}`}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Adhesive airframe label &bull; Level M &bull; 4-module quiet zone
            </p>
          </div>

          {/* Airframe Details Card */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Model / Series:</span>
              <strong className="text-slate-800">{modelName}</strong>
            </div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Operational Status:</span>
              <span className="font-bold text-slate-800 capitalize">{drone.status || 'Available'}</span>
            </div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Airframe Condition:</span>
              <span className={`font-bold ${
                condition === 'GOOD' ? 'text-emerald-700' : 'text-amber-700'
              }`}>{condition}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Last Inspection:</span>
              <span className="font-bold text-slate-800">
                {drone.last_inspection_result
                  ? `${drone.last_inspection_result} (${new Date(drone.last_inspected_at || '').toLocaleDateString()})`
                  : 'Pre-flight QC Approved'}
              </span>
            </div>
          </div>

          {/* Permanent URL Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Permanent QR Scan URL (Open to any phone camera)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={permanentUrl}
                className="flex-1 px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded-xl text-slate-700 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-[#5a00b8] border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4 text-purple-300" />
              <span>Print 25mm Label</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Download PNG</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleOpenPublicPage}
              className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-[#5a00b8] border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Public Page</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenInspection) onOpenInspection(droneId);
              }}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-emerald-600" />
              <span>Record Inspection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
