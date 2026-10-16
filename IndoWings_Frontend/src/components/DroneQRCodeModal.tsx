import React, { useState } from 'react';
import {
  X,
  QrCode,
  Printer,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { downloadSingleDroneQR } from '../utils/droneQrGenerator';
import { PUBLIC_PORTAL_URL } from '../config/api';

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

// Exact official IndoWings center pill SVG badge from Reference Image 2
const INDOWINGS_PILL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="40" viewBox="0 0 144 40">
  <rect width="144" height="40" rx="9" fill="#000000"/>
  <g transform="translate(13, 10.5) scale(0.62)">
    <!-- Top Orange Accent -->
    <path d="M433.185.01h7.072a.541.541,0,0,1,.55.748l-.262.811a1.158,1.158,0,0,1-1.032.749h-7.072a.541.541,0,0,1-.55-.749l.262-.811A1.156,1.156,0,0,1,433.185.01Z" transform="translate(-424.348 -0.01)" fill="#ef7f1a" fill-rule="evenodd"/>
    <!-- Main Aerodynamic Body -->
    <path d="M55.862,7.511,50.919,22.646c-.949,2.9-2,7.6-9.565,7.6H5.81c-2.736,0-7.343-1.618-5.307-7.6L4.6,10.607c.243-.712.9-2.551,2.893-2.552l4.017,0c1.623.083,2.231.58,1.693,2.591L8.783,23.76c-.715,2.876,1.31,4.138,3.925,4.138H40.464c3.3,0,5.224-2.23,5.988-5.094l4.687-14c1.544-4.612-.893-6.312-5.21-6.312H24.086C21.6,2.491,16.361.129,19.238.125,27.956.112,38.8.133,47.513.127c8.612-.006,9.225,4.7,8.348,7.384ZM43.655,22.649c-.8,2.719-2.166,4.155-5.542,4.175H30c-2.335,0-3.007-1.492-2.6-2.9l4.323-12.879c.283-.816-1.1-.9-1.4.055L26.014,23.817c-.728,2.389-2,2.954-3.858,3.006H13.845c-2.313,0-2.471-1.895-1.978-3.716L16.317,9.953c.572-1.691,1.243-1.9,2.274-1.9h.769c1.764,0,1.631.981,1.234,2.172L16.527,22.369c-.266.8.1,1.44.831,1.44h1.933A1.528,1.528,0,0,0,20.9,22.568l4.089-12.035c.758-2.231,2.045-2.559,3.375-2.559h4.611c2.19,0,2.058,1.569,1.722,2.56L30.75,22.182c-.309.916.1,1.595.97,1.609l1.712.028c.715.012,1.278-.239,1.659-1.355L38.543,12.35c1.068-3.129,1.623-6.442-2.656-6.442H27.17c-2.487,0-7.625-2.366-4.848-2.366H44.669c3.115,0,4.778,1.962,3.836,4.668l-4.85,14.44Z" transform="translate(0.001 -0.118)" fill="#ffffff" fill-rule="evenodd"/>
    <!-- Bottom Orange Accent -->
    <path d="M363.23,197.13h7.149a.541.541,0,0,1,.55.748l-.262.811a1.158,1.158,0,0,1-1.032.749h-7.149a.541.541,0,0,1-.55-.749l.262-.811A1.156,1.156,0,0,1,363.23,197.13Z" transform="translate(-355.608 -193.703)" fill="#ef7f1a" fill-rule="evenodd"/>
  </g>
  <!-- Wordmark -->
  <text x="54" y="24.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" letter-spacing="1.4px" fill="#ffffff">INDOWINGS</text>
</svg>`;

const BADGE_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(INDOWINGS_PILL_SVG)}`;

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
  const modelName = drone.model_name || drone.model || '700 RPAV';
  const permanentUrl = `${PUBLIC_PORTAL_URL}/drone/${encodeURIComponent(droneId)}`;
  
  // High-density QR Code with Level H error correction
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&ecc=H&margin=4&data=${encodeURIComponent(permanentUrl)}`;

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
    const printWindow = window.open('', '_blank', 'width=520,height=560');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>IndoWings Label - ${droneId}</title>
          <style>
            @page {
              size: 25mm 27mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 1.2mm 0.8mm;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              text-align: center;
              background: #fff;
              color: #000;
              width: 25mm;
              height: 27mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            .qr-wrapper {
              position: relative;
              width: 18mm;
              height: 18mm;
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
            .qr-center-pill {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 6.8mm;
              height: auto;
              display: block;
            }
            .footer-info {
              margin-top: 1.2mm;
              width: 100%;
              line-height: 1.2;
            }
            .drone-id-label {
              font-size: 5.2pt;
              font-weight: 900;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", monospace;
              letter-spacing: 0.3px;
              color: #0f172a;
              white-space: nowrap;
            }
            .model-label {
              font-size: 3.4pt;
              color: #64748b;
              font-weight: 700;
              white-space: nowrap;
              margin-top: 0.2mm;
            }
          </style>
        </head>
        <body>
          <div class="qr-wrapper">
            <img class="qr-img" src="${qrImageUrl}" alt="QR" />
            <img class="qr-center-pill" src="${BADGE_DATA_URI}" alt="IndoWings" />
          </div>
          <div class="footer-info">
            <div class="drone-id-label">${droneId}</div>
            <div class="model-label">Model: ${modelName}</div>
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
      await downloadSingleDroneQR({ id: droneId, model_name: modelName });
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
                Official IndoWings Identity &bull; {droneId}
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
          {/* Minimalist QR Card: No Top Text, Official Black IndoWings Pill in Center, Only ID & Model Below */}
          <div className="flex flex-col items-center justify-center p-5 bg-slate-50/90 border border-slate-200/90 rounded-3xl">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/90 text-center flex flex-col items-center w-full max-w-[280px]">
              
              {/* QR Container with Centered Official IndoWings Pill Badge (Matching Reference Image 2) */}
              <div className="relative p-2 bg-white rounded-xl border border-slate-100 shadow-2xs">
                <img
                  src={qrImageUrl}
                  alt={`QR code for ${droneId}`}
                  className="w-48 h-48 object-contain rounded-lg"
                />

                {/* Exact IndoWings Black Pill Badge Overlay from Image 2 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none drop-shadow-md">
                  <img
                    src={BADGE_DATA_URI}
                    alt="IndoWings"
                    className="w-32 h-auto"
                  />
                </div>
              </div>

              {/* OUTSIDE Below QR: Only Drone ID & Model (Clean & uncluttered) */}
              <div className="mt-4 w-full text-center">
                <span className="font-mono font-black text-slate-900 text-base tracking-wider block whitespace-nowrap select-all">
                  {droneId}
                </span>
                <span className="text-xs text-slate-500 font-semibold block mt-0.5 select-all">
                  Model: {modelName}
                </span>
              </div>
            </div>
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
              <span className="text-xs font-bold text-emerald-700 mt-0.5 block truncate">
                {drone.current_condition || 'GOOD'}
              </span>
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
              Direct Airframe Link
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
