import React from 'react';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const w = 48;
  const h = 18;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / span) * (h - 4) - 2).toFixed(1)}`);
  const path = `M${points.join(' L')}`;
  const area = `${path} L${w},${h} L0,${h} Z`;
  const id = React.useId();
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible block">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: string;
  subtitle?: string;
  deltaPct?: number;
  trend?: 'up' | 'down' | 'flat';
  sparkline?: number[];
  comparisonLabel?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon: Icon,
  tone = 'text-[#5a00b8] bg-purple-50',
  subtitle,
  deltaPct,
  trend,
  sparkline,
  comparisonLabel = 'vs prev'
}) => {
  const isUp = trend === 'up';
  const isDown = trend === 'down';
  const trendBadge = isUp
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
    : isDown
      ? 'bg-rose-50 text-rose-700 border-rose-200/60'
      : 'bg-slate-50 text-slate-600 border-slate-200/60';
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const sparkColor = isDown ? '#e11d48' : '#5a00b8';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">{label}</p>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className="text-2xl font-black text-slate-900 mt-1 tracking-tight leading-tight">{value}</p>
        {subtitle && (
          <p className="text-[10.5px] font-semibold text-slate-500 mt-0.5 truncate" title={subtitle}>{subtitle}</p>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
        <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
          {deltaPct !== undefined && trend ? (
            <>
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md border ${trendBadge}`}>
                <TrendIcon className="w-2.5 h-2.5" />
                {deltaPct > 0 ? '+' : ''}{deltaPct}%
              </span>
              <span className="text-[10px] font-semibold text-slate-400 truncate">{comparisonLabel}</span>
            </>
          ) : (
            <span className="text-[10px] font-bold text-slate-400">Live Status</span>
          )}
        </div>
        {sparkline && sparkline.length >= 2 && (
          <div className="shrink-0">
            <Sparkline data={sparkline} color={sparkColor} />
          </div>
        )}
      </div>
    </div>
  );
};
