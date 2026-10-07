import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import {
  COUNTRIES,
  Country,
  DEFAULT_COUNTRY,
  countryByIso,
  flagEmoji,
  flagUrl,
  parsePhone,
  toInternational
} from '../data/countries';

function Flag({ iso, className = 'w-5 h-3.5' }: { iso: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [iso]);
  if (failed) {
    return <span className="text-base leading-none">{flagEmoji(iso)}</span>;
  }
  return (
    <img
      src={flagUrl(iso)}
      alt={iso}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} rounded-[3px] object-cover shrink-0 border border-black/10`}
    />
  );
}

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  defaultIso?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  onCountryChange?: (country: Country) => void;
  className?: string;
  inputClassName?: string;
  size?: 'sm' | 'md';
  dark?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  defaultIso,
  placeholder = 'Phone number',
  required,
  disabled,
  maxLength = 15,
  id,
  name,
  autoFocus,
  onCountryChange,
  className = '',
  inputClassName = '',
  size = 'md',
  dark = false
}: PhoneInputProps) {
  const initial = useMemo(() => parsePhone(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<Country>(
    value?.trim() ? initial.country : (defaultIso ? countryByIso(defaultIso) : DEFAULT_COUNTRY)
  );
  const [national, setNational] = useState(initial.national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keep in sync when the parent value changes externally.
  useEffect(() => {
    const parsed = parsePhone(value);
    setNational(parsed.national);
    if (value && value.trim()) setCountry(parsed.country);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    setTimeout(() => searchRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const emit = (nextCountry: Country, nextNational: string) => {
    onChange(toInternational(nextCountry, nextNational));
  };

  const selectCountry = (c: Country) => {
    setCountry(c);
    setOpen(false);
    setQuery('');
    onCountryChange?.(c);
    emit(c, national);
  };

  const onNationalChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, maxLength);
    setNational(digits);
    emit(country, digits);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.iso.toLowerCase() === q ||
      c.iso.toLowerCase().startsWith(q) ||
      c.dial.startsWith(q.replace('+', ''))
    );
  }, [query]);

  const pad = size === 'sm' ? 'py-2' : 'py-3';

  return (
    <div ref={rootRef} className={`relative flex ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`flex items-center gap-1.5 pl-3 pr-2 ${pad} rounded-l-xl border border-r-0 text-xs font-bold transition-colors disabled:opacity-60 shrink-0 ${
          dark
            ? 'border-slate-900/50 bg-black/40 text-slate-200 hover:bg-black/60'
            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Flag iso={country.iso} />
        <span className="whitespace-nowrap">+{country.dial}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <input
        id={id}
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={national}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={e => onNationalChange(e.target.value)}
        className={`flex-1 min-w-0 px-3.5 ${pad} rounded-r-xl border text-sm font-medium transition-all focus:outline-none ${
          dark
            ? 'border-slate-900/50 bg-black/40 text-white placeholder:text-slate-500 focus:border-orange-500'
            : 'border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#5a00b8] focus:ring-4 focus:ring-orange-50'
        } ${inputClassName}`}
      />

      {open && (
        <div className="absolute z-50 left-0 top-full mt-1.5 w-72 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search country or code…"
              className="w-full text-sm focus:outline-none placeholder:text-slate-400"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-slate-400">No country found</li>
            )}
            {filtered.map(c => (
              <li key={c.iso + c.dial}>
                <button
                  type="button"
                  onClick={() => selectCountry(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-purple-50 transition-colors ${c.iso === country.iso ? 'bg-purple-50/60' : ''}`}
                  role="option"
                  aria-selected={c.iso === country.iso}
                >
                  <Flag iso={c.iso} />
                  <span className="flex-1 truncate text-xs font-medium text-slate-700">{c.name}</span>
                  <span className="text-xs text-slate-400 font-semibold">+{c.dial}</span>
                  {c.iso === country.iso && <Check className="w-3.5 h-3.5 text-[#5a00b8]" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
