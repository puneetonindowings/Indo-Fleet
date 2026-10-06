import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export interface DateRange {
  key: string;
  label: string;
  from: string;
  to: string;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function presetRange(key: string): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const add = (base: Date, days: number) => new Date(base.getTime() + days * 86400000);
  switch (key) {
    case 'today':
      return { from: toISODate(today), to: toISODate(today) };
    case 'yesterday': {
      const y = add(today, -1);
      return { from: toISODate(y), to: toISODate(y) };
    }
    case 'last7':
      return { from: toISODate(add(today, -6)), to: toISODate(today) };
    case 'last30':
      return { from: toISODate(add(today, -29)), to: toISODate(today) };
    case 'thisMonth':
      return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISODate(today) };
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toISODate(start), to: toISODate(end) };
    }
    case 'thisYear':
      return { from: toISODate(new Date(now.getFullYear(), 0, 1)), to: toISODate(today) };
    case 'lastYear': {
      const y = now.getFullYear() - 1;
      return { from: toISODate(new Date(y, 0, 1)), to: toISODate(new Date(y, 11, 31)) };
    }
    default:
      return { from: toISODate(add(today, -29)), to: toISODate(today) };
  }
}

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'lastYear', label: 'Last Year' },
  { key: 'custom', label: 'Custom Range' }
];

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export const TimeRangeSelector: React.FC<Props> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);

  const select = (key: string) => {
    if (key === 'custom') {
      setOpen(true);
      return;
    }
    const { from, to } = presetRange(key);
    const label = PRESETS.find((p) => p.key === key)?.label || key;
    onChange({ key, label, from, to });
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    onChange({ key: 'custom', label: `${customFrom} → ${customTo}`, from: customFrom, to: customTo });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:border-purple-300 hover:text-[#3b0080] transition-colors shadow-xs"
      >
        <Calendar className="w-4 h-4 text-[#3b0080]" />
        <span>{value.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-lg p-3 z-40">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Quick presets</p>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {PRESETS.filter((p) => p.key !== 'custom').map((p) => (
              <button
                key={p.key}
                onClick={() => select(p.key)}
                className={`px-2.5 py-2 rounded-lg text-[11px] font-bold transition-colors ${value.key === p.key ? 'bg-[#3b0080] text-white' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-purple-300 hover:text-[#3b0080]'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Custom date range</p>
          <div className="space-y-2">
            <label className="block">
              <span className="text-[10px] font-bold text-slate-500">From</span>
              <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className="mt-0.5 w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-400" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold text-slate-500">To</span>
              <input type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} className="mt-0.5 w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-400" />
            </label>
            <div className="flex gap-2 pt-1">
              <button onClick={applyCustom} className="flex-1 py-2 rounded-lg bg-[#3b0080] text-white text-xs font-bold hover:bg-purple-800 transition-colors">Apply</button>
              <button onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
