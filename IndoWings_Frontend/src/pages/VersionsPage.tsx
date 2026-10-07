import React, { useState } from 'react';
import { 
  SlidersHorizontal, Sparkles, TrendingUp, Wrench, AlertTriangle, 
  DownloadCloud, CheckCircle2, Calendar, ChevronDown, ChevronUp, 
  ExternalLink, ArrowRight, ShieldCheck, Tag, Copy, Check, Filter,
  Package, Truck, Radio, MapPin, Award
} from 'lucide-react';

interface VersionsPageProps {
  onNavigate: (page: string) => void;
  onOpenDemoBooking?: () => void;
}

interface ReleaseNote {
  version: string;
  date: string;
  isLatest?: boolean;
  status: 'Stable' | 'LTS' | 'Beta';
  summary: string;
  installerName?: string;
  sha256?: string;
  newFeatures: string[];
  improvements: string[];
  bugFixes: string[];
  limitations: string[];
}

const RELEASES: ReleaseNote[] = [
  {
    version: 'IndoWings Fleet Command & GCS v3.4.4',
    date: 'SEPTEMBER 19, 2026',
    isLatest: true,
    status: 'Stable',
    summary: 'IndoWings v3.4.4 delivers enterprise corridor dispatch locks, Dual-IMU redundancy calibration, DGCA DigitalSky NPNT cryptographic clearance integration, and real-time ADS-B radar telemetry streaming.',
    installerName: 'IndoWings-GCS-v3.4.4-Win64.exe',
    sha256: 'B2AC90D806AFD53E89CB5F288083EAC07CDF8AAB3F5D9112A8A794402AECB69F',
    newFeatures: [
      'DigitalSky NPNT Integration: Cryptographic flight permission artifact validation before motor arming is permitted.',
      'Corridor Waypoint Locking: Enforces regulated 120m AGL ceiling constraints and geofenced no-fly corridor buffers.',
      'Dual-IMU Redundancy Calibrations: Automated pre-flight sensor diagnostics verifying gyroscope and accelerometer thresholds.',
      'Escort Ground Logistics Assignment: Real-time coordination and dispatch tracking for base technical crews.'
    ],
    improvements: [
      'Telemetry Stream Frequency: Live UAV GPS coordinates, altitude, airspeed, and dual battery cell voltages sync every 2 seconds.',
      'Payload Balance Diagnostics: Real-time center-of-gravity (CoG) and motor thrust differential monitoring prior to takeoff.',
      'Cross-wind Stabilization: Adaptive flight controller PID loops maintaining corridor stability in gusts up to 38 km/h.',
      'Automated Support Escalation: Instant alerting to Support Desk engineers upon failover or anomalous motor current draw.'
    ],
    bugFixes: [
      'RTK Coordinate Snapping: Fixed centimeter-level RTK fix drift when switching between primary and secondary base stations.',
      'Compass Calibration Drift: Mitigated electromagnetic interference near high-voltage industrial transmission lines.',
      'Battery Cell Voltage Variance: Corrected nonlinear discharge calculation on cold-weather early morning sorties.',
      'Telemetry Reconnection Logic: Accelerated automatic 4G/5G socket re-handshake latency upon corridor cell handover.'
    ],
    limitations: [
      'DGCA Airspace Corridor Mandate: Sorties are strictly restricted to authorized Green & Yellow corridors.',
      'Pre-Flight Checklist Requirement: All 6 stages of hardware inspection must be completed before arming authorization.',
      'Severe Weather Protocol: Operations automatically enter safety hold when sustained winds exceed 40 km/h or during precipitation.'
    ]
  },
  {
    version: 'IndoWings Fleet Command v3.4.0',
    date: 'JULY 15, 2026',
    isLatest: false,
    status: 'LTS',
    summary: 'Core enterprise UAV fleet telemetry platform delivering encrypted Ground Control Station (GCS) telemetry, multi-aircraft airspace monitoring, and automated Return-to-Hub (RTH) failsafes.',
    installerName: 'IndoWings-GCS-v3.4.0-Win64.exe',
    sha256: 'F92C784198234DBC89021E47983210ABCE891745678912344567891234567890',
    newFeatures: [
      'Multi-UAV Fleet Command: Centralized dispatch board tracking up to 50 active airborne missions across NCR corridors.',
      'Dual LTE/5G Telemetry Failsafe: Redundant cellular data uplink with automatic hot-standby failover upon signal drop.',
      'Hardware Avionics Telemetry: Real-time ESC temperature, RPM, and vibration spectrum logging.'
    ],
    improvements: [
      '3D Terrain Elevation Mapping: Integrated surveyor-grade LiDAR elevation data preventing low-altitude obstacle risks.',
      'Sub-80ms Command Latency: Optimized GCS telemetry socket throughput over 5G enterprise private APN networks.',
      'Battery Thermal Conditioning: Cold-weather battery thermal management for consistent high-discharge cruising.'
    ],
    bugFixes: [
      'Fixed compass calibration drift caused by proximity to high-voltage ground transformers.',
      'Resolved timestamp desynchronization between drone on-board flight computer and server event logs.',
      'Corrected false positive obstacle warning when flying over reflective solar panel arrays.'
    ],
    limitations: [
      'Requires active cellular telemetry coverage (LTE/5G) across the designated flight transit corridor.',
      'Pre-flight motor and sensor diagnostics must pass 100% before autonomous launch authorization is granted.'
    ]
  }
];

export const VersionsPage: React.FC<VersionsPageProps> = ({ onNavigate }) => {
  const [filter, setFilter] = useState<'all' | 'stable' | 'lts'>('all');
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  const handleCopySha = (sha: string) => {
    navigator.clipboard.writeText(sha).then(() => {
      setCopiedSha(sha);
      setTimeout(() => setCopiedSha(null), 2000);
    });
  };

  const filteredReleases = RELEASES.filter(r => {
    if (filter === 'stable') return r.status === 'Stable';
    if (filter === 'lts') return r.status === 'LTS';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f7f4fb] text-[#171222]">
      {/* ── HERO SECTION (Aviation Dark Purple Aesthetics) ──────────────────── */}
      <section 
        className="relative text-white pt-28 sm:pt-36 pb-24 px-6 overflow-hidden" 
        style={{ background: 'linear-gradient(135deg, #1e0940 0%, #2b114d 50%, #1a0835 100%)' }}>
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 70% 80%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
        />
        
        <div className="relative max-w-5xl mx-auto">
          {/* Sliders / Toggle Icon Box */}
          <div className="w-14 h-14 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-slate-950/30">
            <SlidersHorizontal className="w-7 h-7 text-white" />
          </div>

          <p className="text-xs font-bold tracking-[0.25em] uppercase text-orange-300 mb-3">
            RELEASE NOTES & OPERATIONAL UPDATES
          </p>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight leading-[1.1]">
            What's new in IndoWings Flight & Dispatch Systems
          </h1>

          <p className="text-white/70 text-base sm:text-lg max-w-2xl leading-relaxed">
            Review firmware changelogs, DGCA DigitalSky compliance upgrades, hardware diagnostics, telemetry protocols, and GCS operating parameters for each release.
          </p>
        </div>
      </section>

      {/* ── MAIN RELEASE NOTES CONTAINER ────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 -mt-10 relative z-10 pb-20 space-y-8">
        
        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-4 bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'All Releases' },
              { id: 'stable', label: 'Production Stable' },
              { id: 'lts', label: 'LTS Channels' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === tab.id
                    ? 'bg-[#ef7f1a] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { onNavigate('track'); window.history.pushState({}, '', '/track'); }}
              className="flex items-center gap-1.5 text-xs font-bold text-[#ef7f1a] hover:underline cursor-pointer pr-2"
            >
              <Radio className="w-4 h-4 text-orange-600 animate-pulse" />
              <span>Live Corridor Telemetry</span>
            </button>
            <button
              onClick={() => { onNavigate('downloads'); window.history.pushState({}, '', '/downloads'); }}
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#ef7f1a] cursor-pointer pl-2 border-l border-slate-200"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Downloads</span>
            </button>
          </div>
        </div>

        {/* Releases List */}
        {filteredReleases.map(release => (
          <div 
            key={release.version}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-lg shadow-slate-950/5 transition-all">
            
            {/* Top Metadata Bar */}
            <div className="flex items-center justify-between pb-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider text-slate-400 uppercase font-mono">
                  {release.date}
                </span>
                {release.isLatest && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-300 font-mono">
                    LATEST ACTIVE DEPLOYMENT
                  </span>
                )}
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                release.status === 'Stable' 
                  ? 'bg-orange-100 text-[#ef7f1a] border border-orange-200' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {release.status}
              </span>
            </div>

            {/* Release Version Title */}
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#171222] tracking-tight mb-3">
              {release.version}
            </h2>

            {/* Summary Paragraph */}
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-8 max-w-4xl">
              {release.summary}
            </p>

            {/* 4 Quadrants Grid (IndoWings Specific Content) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              
              {/* Quadrant 1: New */}
              <div className="bg-[#fcfaff] border border-orange-100/90 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2 text-[#ef7f1a] font-bold text-sm mb-4">
                  <Sparkles className="w-4 h-4" />
                  <span>New Capabilities</span>
                </div>
                <ul className="space-y-3">
                  {release.newFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ef7f1a] mt-2 shrink-0"></span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quadrant 2: Improved */}
              <div className="bg-[#fcfaff] border border-orange-100/90 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2 text-[#ef7f1a] font-bold text-sm mb-4">
                  <TrendingUp className="w-4 h-4" />
                  <span>Performance & Systems</span>
                </div>
                <ul className="space-y-3">
                  {release.improvements.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ef7f1a] mt-2 shrink-0"></span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quadrant 3: Bug Fixes */}
              <div className="bg-[#fcfaff] border border-orange-100/90 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2 text-[#ef7f1a] font-bold text-sm mb-4">
                  <Wrench className="w-4 h-4" />
                  <span>Corrections & Bug Fixes</span>
                </div>
                <ul className="space-y-3">
                  {release.bugFixes.map((bug, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ef7f1a] mt-2 shrink-0"></span>
                      <span>{bug}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quadrant 4: Operational Parameters */}
              <div className="bg-[#fcfaff] border border-orange-100/90 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2 text-[#ef7f1a] font-bold text-sm mb-4">
                  <AlertTriangle className="w-4 h-4" />
                  <span>DGCA Operational Parameters</span>
                </div>
                <ul className="space-y-3">
                  {release.limitations.map((lim, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ef7f1a] mt-2 shrink-0"></span>
                      <span>{lim}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Actions: Installer & Checksum */}
            {release.installerName && (
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70 p-4 rounded-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 font-mono">{release.installerName}</span>
                    <span className="text-[10px] text-slate-400">Windows 64-bit Workstation</span>
                  </div>
                  {release.sha256 && (
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-md">
                      SHA-256: {release.sha256}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {release.sha256 && (
                    <button
                      onClick={() => handleCopySha(release.sha256!)}
                      className="px-3 py-2 bg-white border border-slate-200 hover:border-orange-300 text-slate-600 hover:text-[#ef7f1a] text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {copiedSha === release.sha256 ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Hash</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => { onNavigate('downloads'); window.history.pushState({}, '', '/downloads'); }}
                    className="px-4 py-2 bg-[#ef7f1a] hover:bg-[#280058] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                    <span>Download Installer</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
};
