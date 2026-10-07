import React, { useState } from 'react';
import { 
  BookOpen, Shield, DownloadCloud, Book, Terminal, Compass, 
  MapPin, Truck, CheckCircle2, ChevronRight, ArrowRight, ExternalLink, 
  Sparkles, AlertCircle, Clock, Search, Layers, Radio, HelpCircle, 
  FileText, Zap, ShieldCheck, Check, Navigation, CreditCard, Award, User,
  Wrench, Activity, CheckSquare
} from 'lucide-react';

interface DocsPageProps {
  onNavigate: (page: string) => void;
  onOpenCommandCenter?: () => void;
  onOpenDemoBooking?: () => void;
}

export const DocsPage: React.FC<DocsPageProps> = ({ 
  onNavigate, 
  onOpenCommandCenter, 
  onOpenDemoBooking 
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'qc' | 'platform' | 'gcs' | 'admin' | 'safety'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const docCards = [
    {
      id: 'doc-platform',
      tag: 'Platform Architecture',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: ShieldCheck,
      title: 'How the IndoFleet Enterprise Ecosystem Works',
      desc: 'Centralized Command Center, GCS, role-based governance, secure telemetry downlinks, aircraft lifecycle records, releases, and operational audit trail.',
      linkText: 'Open platform overview',
      category: 'platform',
      targetPage: 'platform'
    },
    {
      id: 'doc-gcs-install',
      tag: 'Quick Start',
      tagColor: 'bg-teal-50 text-teal-700 border-teal-200',
      icon: DownloadCloud,
      title: 'Install & Configure IndoFleet GCS',
      desc: 'Start with the latest installer metadata, SHA-256 checksums, system prerequisites, Windows workstation setup, and ground control link guidance.',
      linkText: 'Open quick start',
      category: 'gcs',
      targetPage: 'downloads'
    },
    {
      id: 'doc-qc-dispatch',
      tag: 'Hardware QC & SOP',
      tagColor: 'bg-purple-50 text-[#5a00b8] border-purple-200',
      icon: Wrench,
      featured: true,
      title: 'Pre-Flight Hardware QC & Corridor Clearance SOP',
      desc: 'Complete technical standard operating procedure: 4-point avionics diagnostics, dual-IMU calibration, battery cell impedance testing, DGCA NPNT compliance token verification, and corridor transit clearance sign-off.',
      linkText: 'Open QC & Dispatch SOP',
      category: 'qc',
      targetPage: 'fleet'
    },
    {
      id: 'doc-admin',
      tag: 'Dispatch Command',
      tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Shield,
      title: 'Corridor Dispatch Board & Mission Control',
      desc: 'Corridor scheduling, escort assignment, live telemetry flight streams, active air corridor locks, and mission milestone broadcasting.',
      linkText: 'View dispatch guidance',
      category: 'admin',
      targetPage: 'dispatch'
    },
    {
      id: 'doc-operations',
      tag: 'GCS Operations Guide',
      tagColor: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: Compass,
      title: 'Mission Waypoints & Autonomous Corridor Flight',
      desc: 'Aircraft telemetry connection, corridor waypoint planning, pre-flight sensor zeroing, live RF/4G telemetry downlinks, and fail-safe geofence return.',
      linkText: 'Open operations guidance',
      category: 'gcs',
      targetPage: 'gcs'
    },
    {
      id: 'doc-safety',
      tag: 'Safety & DGCA',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Award,
      title: 'DGCA DigitalSky & Air Corridor Safety Compliance',
      desc: 'DigitalSky Green/Yellow zone flight permissions, NPNT (No Permission No Takeoff) cryptographic compliance, ADS-B transponder escort guidelines, and fail-safe geofencing protocols.',
      linkText: 'View compliance guidance',
      category: 'safety',
      targetPage: 'docs'
    }
  ];

  const filteredCards = docCards.filter(card => {
    if (activeTab !== 'all' && card.category !== activeTab) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return card.title.toLowerCase().includes(q) || card.desc.toLowerCase().includes(q) || card.tag.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#f7f4fb] text-[#171222]">
      {/* ── HERO SECTION ────────────────────────────────────────────────────── */}
      <section 
        className="relative text-white pt-28 sm:pt-36 pb-24 px-6 overflow-hidden" 
        style={{ background: 'linear-gradient(135deg, #1e0940 0%, #2b114d 50%, #1a0835 100%)' }}>
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 70% 80%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
        />
        
        <div className="relative max-w-6xl mx-auto">
          {/* Bookmark Icon Box */}
          <div className="w-14 h-14 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-slate-950/30">
            <BookOpen className="w-7 h-7 text-white" />
          </div>

          <p className="text-xs font-bold tracking-[0.25em] uppercase text-purple-300 mb-3">
            DOCUMENTATION &amp; SOP
          </p>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight max-w-3xl leading-[1.1]">
            IndoFleet technical library
          </h1>

          <p className="text-white/70 text-base sm:text-lg max-w-2xl leading-relaxed">
            Standard Operating Procedures (SOP), Hardware QC compliance, Air Corridor Dispatch protocols, and Telemetry Command references.
          </p>
        </div>
      </section>

      {/* ── PUBLIC GUIDE SHOWCASE BANNER ────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 -mt-10 relative z-10 mb-14">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-950/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#5a00b8] bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100 inline-block mb-2">
                OPERATIONAL MANUAL
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171222] tracking-tight">
                Standard Operating Procedures &amp; Hardware Clearance Manuals
              </h2>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => { onNavigate('track'); window.history.pushState({}, '', '/track'); }}
                className="flex items-center gap-2 bg-[#5a00b8] hover:bg-[#280058] text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer">
                <Navigation className="w-4 h-4" />
                <span>Live Corridor Telemetry</span>
              </button>
              <button
                onClick={() => { onNavigate('gcs'); window.history.pushState({}, '', '/gcs'); }}
                className="hidden sm:flex items-center gap-2 border border-slate-200 hover:border-[#5a00b8] text-slate-700 hover:text-[#5a00b8] text-xs sm:text-sm font-semibold px-4 py-3 rounded-xl transition-all cursor-pointer">
                <Book className="w-4 h-4" />
                <span>Open GCS Guide</span>
              </button>
            </div>
          </div>

          {/* 3 Visual Mini-Dashboards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Corridor Lock */}
            <div className="bg-gradient-to-b from-[#0f172a] to-[#1e1b4b] rounded-2xl p-5 text-white border border-slate-800 shadow-md flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                  <span className="font-mono">CORRIDOR LOCK</span>
                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold text-[10px]">LIVE RADAR</span>
                </div>
                <div className="grid grid-cols-2 gap-2 my-2">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">FLIGHT TIME</span>
                    <span className="text-xl font-bold font-mono text-purple-200">18 min</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">DISTANCE</span>
                    <span className="text-xl font-bold font-mono text-purple-200">14.8 km</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Transit &amp; Route Mapping</span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono text-purple-200">Step 1</span>
              </div>
            </div>

            {/* Card 2: Mission Telemetry */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600">ACTIVE MISSIONS</span>
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold text-[10px]">ACTIVE</span>
                </div>
                <div className="space-y-2.5 my-2">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <span className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      FLT-782190
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Completed</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <span className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                      FLT-419205
                    </span>
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">In-Corridor</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Flight Queue &amp; Archive</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-semibold">Step 2</span>
              </div>
            </div>

            {/* Card 3: Performance Insights */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600">PERFORMANCE INSIGHTS</span>
                  <span className="text-[10px] text-slate-400 font-mono">NCR Hub</span>
                </div>
                <div className="grid grid-cols-3 gap-2 my-2 text-center">
                  <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-2.5">
                    <span className="text-lg font-extrabold text-[#5a00b8] block">99.4%</span>
                    <span className="text-[9px] uppercase font-bold text-slate-500">QC Pass</span>
                  </div>
                  <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-2.5">
                    <span className="text-lg font-extrabold text-[#5a00b8] block">&lt;24m</span>
                    <span className="text-[9px] uppercase font-bold text-slate-500">Avg Transit</span>
                  </div>
                  <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-2.5">
                    <span className="text-lg font-extrabold text-[#5a00b8] block">0</span>
                    <span className="text-[9px] uppercase font-bold text-slate-500">Incidents</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Flight Safety Telemetry</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-semibold">Step 3</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STEP-BY-STEP OPERATIONAL SOP MANUAL ─────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 mb-16">
        <div className="bg-gradient-to-br from-white via-orange-50/40 to-blue-50/30 border-2 border-purple-200/80 rounded-3xl p-6 sm:p-10 shadow-lg">
          <div className="max-w-3xl mb-8">
            <div className="inline-flex items-center gap-2 bg-[#5a00b8] text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>STANDARD OPERATING PROCEDURE</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#171222] tracking-tight mb-3">
              Drone Pre-Flight Dispatch &amp; Corridor Clearance SOP
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Standard 6-step flight clearance protocol enforced across all IndoFleet assembly depots and transit corridors to guarantee 100% DGCA compliance and flight safety.
            </p>
          </div>

          {/* 6 Step SOP Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Step 1 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-bold text-sm font-mono mb-3">
                  01
                </div>
                <h3 className="text-base font-bold text-[#171222] mb-1.5 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-[#5a00b8]" />
                  <span>Hardware &amp; Avionics QC</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Fleet technician conducts mandatory 4-point hardware diagnostics: Dual IMU redundancy, magnetometer calibration, motor RPM response, and battery cell internal impedance test.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-semibold">
                SOP Standard: Verified via Fleet Manager Desk
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-bold text-sm font-mono mb-3">
                  02
                </div>
                <h3 className="text-base font-bold text-[#171222] mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#5a00b8]" />
                  <span>DGCA NPNT Authorization</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  DigitalSky No-Permission-No-Takeoff (NPNT) cryptographic token is validated on onboard flight hardware. Autonomous motors remain locked until the digital flight permission is active.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-semibold">
                Compliant with DGCA Drone Rules 2021
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-bold text-sm font-mono mb-3">
                  03
                </div>
                <h3 className="text-base font-bold text-[#171222] mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#5a00b8]" />
                  <span>Corridor Waypoints Lock</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Flight path is mapped through approved airspace corridors between base depots. Geofencing buffers and 120m AGL ceiling constraints are loaded into the autopilot.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-semibold">
                Autonomous geofence &amp; RTL enabled
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-bold text-sm font-mono mb-3">
                  04
                </div>
                <h3 className="text-base font-bold text-[#171222] mb-1.5 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-[#5a00b8]" />
                  <span>Escort Crew Assignment</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dispatcher assigns certified flight operations personnel and a field escort vehicle with handheld telemetry override controller. Digital pre-departure manifest is recorded in the system ledger.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-semibold">
                Dual redundant link: 4G LTE + RF Telemetry
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-bold text-sm font-mono mb-3">
                  05
                </div>
                <h3 className="text-base font-bold text-[#171222] mb-1.5 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-[#5a00b8]" />
                  <span>Live Radar Telemetry</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Once airborne, real-time telemetry streams into the Command Center radar. Operators monitor GPS position, altitude, airspeed, battery drain, and wind vector milestones every 4 seconds.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-semibold">
                Continuous ADS-B transponder broadcast
              </div>
            </div>

            {/* Step 6 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-bold text-sm font-mono mb-3">
                  06
                </div>
                <h3 className="text-base font-bold text-[#171222] mb-1.5 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-[#5a00b8]" />
                  <span>Arrival &amp; Mission Sign-Off</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upon landing at the designated hub, hardware condition checklist is reviewed, flight data logs are archived into the telemetry cloud, and the mission is formally completed in the registry.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-semibold">
                Permanent flight log &amp; sensor audit record
              </div>
            </div>
          </div>

          {/* Direct Action Banner inside Guide */}
          <div className="mt-8 pt-6 border-t border-purple-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5a00b8] text-white flex items-center justify-center shrink-0">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#171222]">Monitor Active Corridors in Real Time</p>
                <p className="text-xs text-slate-500">Live ADS-B flight telemetry and transit tracking across Delhi-NCR airspace.</p>
              </div>
            </div>
            <button
              onClick={() => { onNavigate('track'); window.history.pushState({}, '', '/track'); }}
              className="bg-[#5a00b8] hover:bg-[#260052] text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer shrink-0">
              <span>Open Live Radar Telemetry</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── DOCUMENTATION CATEGORY FILTER & SEARCH BAR ──────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Manuals' },
              { id: 'qc', label: 'Hardware QC & SOP' },
              { id: 'platform', label: 'Platform Architecture' },
              { id: 'gcs', label: 'GCS Workstation' },
              { id: 'admin', label: 'Dispatch & Ops' },
              { id: 'safety', label: 'Safety & DGCA' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#5a00b8] text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-purple-200 hover:text-[#5a00b8]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search documentation..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#5a00b8] transition-all shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* ── CORE DOCUMENTATION CARDS ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map(card => {
            const Icon = card.icon;
            return (
              <div 
                key={card.id}
                className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  {/* Card Tag Pill */}
                  <div className="flex items-center gap-2 mb-5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${card.tagColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${card.tagColor}`}>
                      {card.tag}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-[#171222] mb-3 group-hover:text-[#5a00b8] transition-colors leading-snug">
                    {card.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-6">
                    {card.desc}
                  </p>
                </div>

                {/* Footer Link */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (card.targetPage) {
                        onNavigate(card.targetPage);
                        window.history.pushState({}, '', `/${card.targetPage}`);
                      } else {
                        onNavigate('support');
                        window.history.pushState({}, '', '/support');
                      }
                    }}
                    className="text-xs font-bold text-[#5a00b8] hover:text-[#250052] flex items-center gap-1.5 transition-colors cursor-pointer group-hover:translate-x-1 duration-150"
                  >
                    <span>{card.linkText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
