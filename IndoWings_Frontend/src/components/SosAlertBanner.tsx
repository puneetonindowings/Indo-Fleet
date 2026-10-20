import React from 'react';
import { AlertTriangle, MapPin, CheckCircle2, Loader2, ArrowRight, Phone } from 'lucide-react';

interface SosAlertBannerProps {
  alerts: any[];
  onResolve: (id: string) => void;
  resolvingId: string | null;
  onViewDetails?: () => void;
}

export const SosAlertBanner: React.FC<SosAlertBannerProps> = ({
  alerts,
  onResolve,
  resolvingId,
  onViewDetails,
}) => {
  const activeAlerts = alerts.filter((a) => a.status === 'active');
  if (activeAlerts.length === 0) return null;

  const latest = activeAlerts[0];

  return (
    <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-xl shadow-red-500/20 border-2 border-red-300/40 animate-pulse-subtle overflow-hidden max-w-full">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        {/* Left Side: Alert Icon & Info */}
        <div className="flex items-start gap-3.5 min-w-0 max-w-full flex-1">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
            <AlertTriangle className="w-7 h-7 text-white animate-bounce" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white text-red-700 text-[11px] font-black uppercase tracking-wider shadow-xs whitespace-nowrap">
                🚨 CRITICAL SOS BEACON ({activeAlerts.length} ACTIVE)
              </span>
              <span className="text-xs text-red-100 font-medium">
                Pilot emergency broadcast received from Mobile App
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-bold text-white bg-red-900/40 px-2 py-0.5 rounded-md whitespace-nowrap">
                Pilot: {latest.pilot_name || 'Pilot'}
              </span>
              {latest.pilot_phone && (
                <a
                  href={`tel:${latest.pilot_phone}`}
                  className="font-bold text-white hover:text-red-200 underline flex items-center gap-1 whitespace-nowrap"
                >
                  <Phone className="w-3 h-3" />
                  <span>{latest.pilot_phone}</span>
                </a>
              )}
              <span className="text-red-100 whitespace-nowrap">
                Vehicle: <strong className="text-white">{latest.vehicle_id || 'UAV-SYS'}</strong>
              </span>
              <span className="text-red-100 whitespace-nowrap">
                Battery: <strong className="text-white">{latest.battery_pct}%</strong>
              </span>
              <span className="text-red-200 opacity-90 text-[11px] whitespace-nowrap">
                {new Date(latest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            {latest.notes && (
              <p className="mt-1 text-[11px] text-red-100/90 italic truncate max-w-2xl">
                &ldquo;{latest.notes}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Quick Action Buttons - Fully constrained inside banner */}
        <div className="flex items-center gap-2 w-full xl:w-auto flex-wrap justify-start xl:justify-end shrink-0">
          {latest.latitude && latest.longitude && (
            <a
              href={`https://www.google.com/maps?q=${latest.latitude},${latest.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 border border-white/30 transition-all cursor-pointer whitespace-nowrap"
            >
              <MapPin className="w-3.5 h-3.5 text-white" />
              <span>GPS ({Number(latest.latitude).toFixed(3)}, {Number(latest.longitude).toFixed(3)})</span>
            </a>
          )}

          <button
            onClick={() => onResolve(latest.id)}
            disabled={resolvingId === latest.id}
            className="px-3.5 py-1.5 rounded-xl bg-white text-red-700 hover:bg-red-50 text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {resolvingId === latest.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Resolve Emergency</span>
          </button>

          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-950/60 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-white/20 whitespace-nowrap"
            >
              <span>SOS Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
