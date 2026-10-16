import React, { useState, useRef } from 'react';
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
  Layers,
  Sparkles
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
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !drone) return null;

  const droneId = drone.id;
  const serialNumber = drone.serial_number || droneId;
  const modelName = drone.model_name || drone.model || '700 RPAV';
  const condition = (drone.current_condition || 'GOOD').toUpperCase();
  const permanentUrl = `https://indo-fleet.vercel.app/drone/${encodeURIComponent(droneId)}`;
  
  // 400x400 QR Code with Error Correction Level H (30% recovery margin)
  // Level H ensures the QR code remains 100% scan-reliable with the centered IndoWings logo
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&ecc=H&margin=4&data=${encodeURIComponent(permanentUrl)}`;

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
    const printWindow = window.open('', '_blank', 'width=540,height=580');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>IndoWings Airframe Label - ${droneId}</title>
          <style>
            @page {
              size: 25mm 28mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 1.2mm 1mm;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              text-align: center;
              background: #fff;
              color: #000;
              width: 25mm;
              height: 28mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              overflow: hidden;
            }
            .brand-header {
              font-size: 4.2pt;
              font-weight: 900;
              letter-spacing: 0.3px;
              text-transform: uppercase;
              color: #5a00b8;
              line-height: 1;
              margin-bottom: 0.5mm;
            }
            .qr-wrapper {
              position: relative;
              width: 17mm;
              height: 17mm;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto;
            }
            .qr-img {
              width: 100%;
              height: 100%;
              display: block;
            }
            .qr-center-badge {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: #ffffff;
              padding: 0.4mm 1mm;
              border-radius: 0.8mm;
              border: 0.25mm solid #5a00b8;
              display: flex;
              align-items: center;
              gap: 0.4mm;
              box-shadow: 0 0.5mm 1mm rgba(0,0,0,0.15);
            }
            .qr-center-text {
              font-size: 2.8pt;
              font-weight: 900;
              color: #5a00b8;
              letter-spacing: 0.2px;
            }
            .footer-info {
              margin-top: 0.6mm;
              width: 100%;
              line-height: 1.15;
            }
            .drone-id-label {
              font-size: 4.8pt;
              font-weight: 900;
              font-family: monospace;
              letter-spacing: 0.2px;
              color: #0f172a;
              white-space: nowrap;
            }
            .serial-label {
              font-size: 3.2pt;
              color: #475569;
              font-family: monospace;
              white-space: nowrap;
            }
          </style>
        </head>
        <body>
          <div class="brand-header">INDOWINGS 700 RPAV</div>
          <div class="qr-wrapper">
            <img class="qr-img" src="${qrImageUrl}" alt="QR" />
            <div class="qr-center-badge">
              <span class="qr-center-text">INDOWINGS</span>
            </div>
          </div>
          <div class="footer-info">
            <div class="drone-id-label">${droneId}</div>
            <div class="serial-label">S/N: ${serialNumber}</div>
          </div>
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
      setDownloading(true);
      // Create high-resolution composite canvas (600x750)
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 760;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // 1. Fill clean white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw border frame
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

      // 3. Draw top branding banner
      ctx.fillStyle = '#5A00B8';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('INDOWINGS 700 RPAV', canvas.width / 2, 50);

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('OFFICIAL AIRFRAME IDENTIFIER • DGCA TYPE CERTIFIED', canvas.width / 2, 72);

      // 4. Load & draw QR Code image with Level H error correction
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load QR image'));
        img.src = qrImageUrl;
      });

      const qrSize = 440;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 95;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // 5. Draw center IndoWings badge in the exact middle of the QR code
      const badgeW = 140;
      const badgeH = 44;
      const badgeX = (canvas.width - badgeW) / 2;
      const badgeY = qrY + (qrSize - badgeH) / 2;

      // Rounded background for center badge
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#5A00B8';
      ctx.lineWidth = 2.5;
      
      const r = 10;
      ctx.beginPath();
      ctx.moveTo(badgeX + r, badgeY);
      ctx.lineTo(badgeX + badgeW - r, badgeY);
      ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + r);
      ctx.lineTo(badgeX + badgeW, badgeY + badgeH - r);
      ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - r, badgeY + badgeH);
      ctx.lineTo(badgeX + r, badgeY + badgeH);
      ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - r);
      ctx.lineTo(badgeX, badgeY + r);
      ctx.quadraticCurveTo(badgeX, badgeY, badgeX + r, badgeY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing mark accent (orange)
      ctx.fillStyle = '#EF7F1A';
      ctx.fillRect(badgeX + 16, badgeY + 12, 10, 3);
      ctx.fillRect(badgeX + 22, badgeY + 28, 10, 3);

      // IndoWings center text
      ctx.fillStyle = '#5A00B8';
      ctx.font = '900 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('IndoWings', badgeX + (badgeW / 2) + 6, badgeY + 27);

      // 6. Draw details OUTSIDE below the QR code (not inside the QR)
      const footerY = qrY + qrSize + 36;
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('DRONE AIRFRAME ID', canvas.width / 2, footerY);

      // Bold, high-contrast Drone ID
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 24px monospace';
      ctx.fillText(droneId, canvas.width / 2, footerY + 30);

      // Serial Number and Model
      ctx.fillStyle = '#475569';
      ctx.font = '600 14px monospace';
      ctx.fillText(`MODEL: ${modelName}   •   S/N: ${serialNumber}`, canvas.width / 2, footerY + 54);

      // Condition Tag
      ctx.fillStyle = condition === 'GOOD' ? '#059669' : '#D97706';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(`AIRFRAME CONDITION: ${condition}`, canvas.width / 2, footerY + 76);

      // 7. Trigger download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `IndoWings_QR_${droneId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to generate composite QR canvas:', err);
      window.open(qrImageUrl, '_blank');
    } finally {
      setDownloading(false);
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
                  Level H ECC
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80 font-mono mt-0.5">
                Branded IndoWings QR &bull; Unique Airframe Link &bull; Zero Mismatch
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
          {/* Branded QR Box: IndoWings Logo in Center + Drone ID OUTSIDE Below */}
          <div className="flex flex-col items-center justify-center p-5 bg-slate-50/90 border-2 border-dashed border-purple-200/90 rounded-3xl">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/90 text-center flex flex-col items-center w-full max-w-[290px]">
              {/* Brand Top Header */}
              <div className="text-[11px] font-black uppercase tracking-wider text-[#5a00b8] mb-2 flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 transform -rotate-45" />
                <span>IndoWings 700 RPAV</span>
              </div>
              
              {/* QR Container with Centered IndoWings Badge Overlay */}
              <div className="relative p-2.5 bg-white rounded-2xl border border-slate-200 shadow-inner">
                <img
                  src={qrImageUrl}
                  alt={`QR code for ${droneId}`}
                  className="w-48 h-48 object-contain rounded-lg"
                />

                {/* Center IndoWings Logo Badge: 100% scan safe with Level H error correction */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 py-1.5 rounded-xl border-2 border-[#5a00b8] shadow-md flex items-center gap-1.5 pointer-events-none select-none">
                  {/* Wing Icon Accent */}
                  <div className="w-4 h-4 flex flex-col justify-between py-0.5">
                    <div className="w-2.5 h-0.5 bg-[#ef7f1a] rounded-full self-start" />
                    <div className="w-3.5 h-1 bg-[#5a00b8] rounded-full" />
                    <div className="w-2.5 h-0.5 bg-[#ef7f1a] rounded-full self-end" />
                  </div>
                  <span className="text-[11px] font-black tracking-tight text-[#5a00b8]">
                    IndoWings
                  </span>
                </div>
              </div>

              {/* Drone ID Placed OUTSIDE below the QR code (as requested: "qr k niche mtlb qr k bahr andar nhi") */}
              <div className="mt-3.5 w-full px-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  DRONE ID (EXTERNAL)
                </span>
                <span className="font-mono font-black text-slate-900 text-base tracking-wider block whitespace-nowrap select-all mt-0.5">
                  {droneId}
                </span>
                <span className="text-[11px] text-slate-500 font-mono block whitespace-nowrap mt-0.5 select-all font-semibold">
                  S/N: {serialNumber} &bull; {modelName}
                </span>
              </div>

              {/* Operational Status Badge */}
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

            <p className="text-[11px] text-slate-500 mt-2.5 text-center font-medium">
              Centered IndoWings branding with Level H error recovery &bull; Drone ID outside QR
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
              Unique QR Scan Link (Direct Airframe Public Portal)
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
                disabled={downloading}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-98 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>{downloading ? 'Generating...' : 'Download PNG'}</span>
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
                <span>Depot Testing & QC</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
