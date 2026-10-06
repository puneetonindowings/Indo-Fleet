import React from 'react';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const w = 96;
  const h = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / span) * (h - 4) - 2).toFixed(1)}`);
  const path = `M${points.join(' L')}`;
  const area = `${path} L${w},${h} L0,${h} Z`;
  const id = React.useId();
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon: Icon, tone = 'text-[#3b0080] bg-purple-50', subtitle, deltaPct, trend, sparkline, comparisonLabel = 'vs prev period' }) => {
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-400';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const sparkColor = trend === 'down' ? '#e11d48' : '#7c3aed';
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">{label}</p>
          <p className="text-2xl font-black text-slate-900 mt-1 leading-none">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {deltaPct !== undefined && trend ? (
            <p className={`flex items-center gap-1 text-[11px] font-bold ${trendColor}`}>
              <TrendIcon className="w-3.5 h-3.5" />
              {deltaPct > 0 ? '+' : ''}
              {deltaPct}% <span className="text-slate-400 font-semibold">{comparisonLabel}</span>
            </p>
          ) : subtitle ? (
            <p className="text-[11px] font-semibold text-slate-500 truncate">{subtitle}</p>
          ) : null}
        </div>
        {sparkline && sparkline.length >= 2 && <Sparkline data={sparkline} color={sparkColor} />}
      </div>
    </div>
  );
};
