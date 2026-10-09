import React, { useState } from 'react';
import { DownloadCloud, CheckCircle, Copy, Check, Monitor, Calendar, HardDrive, Package, Shield, User, ChevronRight, ArrowLeft } from 'lucide-react';

interface DownloadsPageProps {
  onNavigate: (page: string) => void;
  onOpenCommandCenter: () => void;
  onOpenDemoBooking: () => void;
}

const SHA256 = 'B2AC90D806AFD53E89CB5F288083EAC07CDF8AAB3F5D9112A8A794402AECB69F';

export const DownloadsPage: React.FC<DownloadsPageProps> = ({ onNavigate, onOpenCommandCenter, onOpenDemoBooking }) => {
  const [copied, setCopied] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SHA256).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    setDownloadStarted(true);
    setTimeout(() => setDownloadStarted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f7f4fb]">
      {/* Hero */}
      <section className="relative text-white pt-28 sm:pt-36 pb-20 px-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e0940 0%, #2b114d 50%, #1a0835 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 70% 80%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-6xl mx-auto">
          {/* Icon box — left aligned like SkyGrid */}
          <div className="w-14 h-14 bg-white/15 border border-white/20 rounded-xl flex items-center justify-center mb-5">
            <DownloadCloud className="w-7 h-7 text-white" />
          </div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/70 mb-3">Downloads</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight max-w-xl">IndoFleet GCS download center</h1>
          <p className="text-white/70 text-base max-w-xl leading-relaxed">Find the latest Windows installer metadata, system requirements, release summary, checksum, archive links, account requirements, and a clear download process.</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid gap-6" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', alignItems: 'start' }}>

          {/* LEFT CARD */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-sm">
            {/* Card header — Stable pill left, Latest Version right (matches SkyGrid) */}
            <div className="flex items-center justify-between px-7 py-4 border-b border-[#e2e8f0]">
              <div className="inline-flex items-center gap-1.5 bg-purple-50 text-[#5a00b8] text-xs font-bold px-3 py-1 rounded-full border border-purple-200">
                <CheckCircle className="w-3.5 h-3.5" />
                Stable
              </div>
              <span className="text-sm font-semibold text-slate-500">Latest Version</span>
            </div>

            <div className="p-7">
            <h2 className="text-2xl font-bold text-[#171222] mb-1">IndoFleet GCS v3.4.4</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              The latest stable release of IndoFleet Ground Control Station. Includes enhanced mission planning, real-time telemetry improvements, and DGCA compliance reporting tools.
            </p>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-5 my-7 py-7 border-y border-[#e2e8f0]">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Monitor className="w-4 h-4 text-[#5a00b8]" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Platform</div>
                  <div className="text-sm font-semibold text-[#171222] mt-0.5">Windows (x64)</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-[#5a00b8]" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Release Date</div>
                  <div className="text-sm font-semibold text-[#171222] mt-0.5">July 25, 2026</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <HardDrive className="w-4 h-4 text-[#5a00b8]" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">File Size</div>
                  <div className="text-sm font-semibold text-[#171222] mt-0.5">62.50 MB</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-[#5a00b8]" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Package</div>
                  <div className="text-sm font-semibold text-[#171222] mt-0.5">IndoFleetGCS_Setup_v3.4.4.msi</div>
                </div>
              </div>
            </div>

            {/* Download buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#5a00b8] hover:bg-[#2d006b] text-white font-semibold rounded-xl px-6 py-3.5 text-[15px] transition-colors min-h-[52px]"
              >
                {downloadStarted ? <Check className="w-5 h-5" /> : <DownloadCloud className="w-5 h-5" />}
                {downloadStarted ? 'Download Started!' : 'Download .msi Installer'}
              </button>
              <button
                onClick={() => { onNavigate('docs'); window.history.pushState({}, '', '/docs'); }}
                className="flex-1 inline-flex items-center justify-center gap-2 border border-[#e2e8f0] hover:border-[#5a00b8] hover:text-[#5a00b8] text-slate-600 font-semibold rounded-xl px-6 py-3.5 text-[15px] transition-colors min-h-[52px] bg-white cursor-pointer"
              >
                View Documentation
              </button>
            </div>
            </div>
          </div>

          {/* RIGHT ASIDE */}
          <div className="space-y-5">

            {/* Preview image */}
            <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-sm">
              <div style={{ aspectRatio: '16/9' }}>
                <img
                  src="/images/gcs-operator-standby.webp"
                  alt="IndoFleet GCS Interface"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="px-4 py-2.5 border-t border-[#e2e8f0]">
                <p className="text-xs text-slate-400">IndoFleet GCS — Operator view at mission standby</p>
              </div>
            </div>

            {/* System requirements */}
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#171222] mb-4 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#5a00b8]" />
                System Requirements
              </h3>
              <ul className="space-y-2.5">
                {[
                  ['OS', 'Windows 10 / 11 (64-bit)'],
                  ['Processor', 'Intel i5 (8th gen+) or AMD Ryzen 5'],
                  ['RAM', '8 GB minimum, 16 GB recommended'],
                  ['Storage', '500 MB available disk space'],
                  ['Network', 'Broadband for real-time telemetry'],
                  ['Display', '1920×1080 minimum resolution'],
                ].map(([label, value]) => (
                  <li key={label} className="flex justify-between text-sm border-b border-[#f1f5f9] pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium">{label}</span>
                    <span className="text-[#171222] font-medium text-right">{value}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account required */}
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-lg p-4">
                <User className="w-5 h-5 text-[#5a00b8] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#5a00b8] mb-1">Account Required</p>
                  <p className="text-xs text-slate-500 leading-relaxed">An active IndoFleet operator account is required to activate and use GCS. Contact your fleet administrator for access credentials.</p>
                </div>
              </div>
            </div>

            {/* Download process */}
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#171222] mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#5a00b8]" />
                Download Process
              </h3>
              <ol className="space-y-3">
                {[
                  'Click "Download .msi Installer" above',
                  'Verify the SHA-256 checksum below',
                  'Run the installer as Administrator',
                  'Log in with your IndoFleet credentials',
                  'Complete initial drone pairing setup',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-[#5a00b8] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* SHA-256 checksum */}
            <div className="bg-[#171222] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">SHA-256 Checksum</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-emerald-300 font-mono text-[11px] break-all leading-relaxed">{SHA256}</p>
            </div>

          </div>
        </div>

        {/* Back link */}
        <div className="mt-10 pt-6 border-t border-[#e2e8f0]">
          <button
            onClick={() => { onNavigate('home'); window.history.pushState({}, '', '/'); }}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#5a00b8] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to IndoFleet Platform
          </button>
        </div>
      </section>
    </div>
  );
};
