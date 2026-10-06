import React, { useState } from 'react';
import {
  Package,
  Navigation,
  ArrowRight,
  Shield,
  Lock,
  Wrench,
  LayoutDashboard,
  ChevronRight,
  CheckCircle2,
  Cpu,
  Clock,
  Gauge,
  Compass,
  Headphones,
  ShoppingBag,
} from 'lucide-react';
import { InteractiveDrone } from './InteractiveDrone';
import { ElevationMeshBackground } from './ElevationMeshBackground';
import { StorePage } from '../pages/StorePage';

import { DeliveryUser } from './AuthModal';

interface HeroProps {
  currentUser?: DeliveryUser | null;
  onOpenCommandCenter?: () => void;
  onOpenDemoBooking?: () => void;
  onNavigate?: (page: string) => void;
}

const ROLES_OVERVIEW = [
  {
    role: 'Super Admin',
    roleKey: 'admin',
    page: 'admin',
    path: '/admin',
    icon: Shield,
    badge: 'Security Level 1',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    title: 'Admin Command Console',
    desc: 'Provision authorized personnel IDs, manage role-based credentials, configure transit corridors, and audit global fleet deliveries.',
    cta: 'Enter Admin Console',
  },
  {
    role: 'Fleet Manager',
    roleKey: 'fleet_manager',
    page: 'fleet',
    path: '/fleet',
    icon: Wrench,
    badge: 'Hardware & QC',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    title: 'Fleet & Pre-Delivery QC Deck',
    desc: 'Register newly manufactured drone units, conduct mandatory 4-point technical diagnostics (dual avionics, battery impedance, NPNT), and issue Pre-Delivery Clearances.',
    cta: 'Access Fleet Desk',
  },
  {
    role: 'Dispatcher',
    roleKey: 'dispatcher',
    page: 'dispatch',
    path: '/dispatch',
    icon: LayoutDashboard,
    badge: 'Airspace & Transit',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    title: 'Corridor Dispatch Board',
    desc: 'Schedule and clear transit shipments, assign escort personnel, monitor live corridor telemetry, and broadcast real-time milestone checkpoints.',
    cta: 'Open Dispatcher Board',
  },
  {
    role: 'Support Desk Officer',
    roleKey: 'support',
    page: 'support-desk',
    path: '/support-desk',
    icon: Headphones,
    badge: 'Operations Support',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    title: 'Operations Support Desk',
    desc: 'Manage ground support tickets, client queries, technical escalations, and operations assistance during transit sorties.',
    cta: 'Open Support Desk',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Wrench,
    title: 'Assembly & Hardware Registry',
    desc: 'Aerospace engineers complete airframe fabrication, calibrate dual-avionics, and register unique drone serial numbers into the centralized hardware ledger.',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    step: '02',
    icon: Shield,
    title: 'Fleet Pre-Delivery QC Clearance',
    desc: 'Fleet Manager conducts rigorous bench diagnostics: battery impedance, dual-redundant IMU sensors, DGCA NPNT firmware, and emergency parachute release.',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    step: '03',
    icon: Navigation,
    title: 'Secured Corridor Dispatch',
    desc: 'Dispatcher provisions the authorized airspace corridor, links secure telemetry transponders, assigns technical escort teams, and activates transit tracking.',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    step: '04',
    icon: Package,
    title: 'Client Technical Acceptance',
    desc: 'Receiving Officer verifies packaging seals, audits serial tags, submits physical quality score (1-5 stars), and signs digital handover certificates.',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
];

const FLEET_MODELS_DATA = [
  {
    id: 'cyberone',
    name: 'Cyberone Max',
    category: 'Heavy Lift & Precision Payload UAV',
    desc: 'Engineered for industrial heavy payload transit, emergency defense transport, and precision payload operations in harsh terrains.',
    badge: 'Heavy Cargo',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    stats: [
      { label: 'Payload Capacity', val: '5.0 kg', sub: 'Precision Release System' },
      { label: 'Cruising Speed', val: '65 km/h', sub: 'Automated Throttle' },
      { label: 'BVLOS Flight Range', val: '25 km', sub: 'Corridor Transit' },
      { label: 'Airborne Endurance', val: '45 mins', sub: 'Dual Smart Battery' },
    ],
    features: [
      'Dual RTK-GPS + Triple Redundant IMU',
      'Toray Aerospace-Grade Carbon Fiber Structure',
      'IP55 All-Weather Operational Ingress Rating',
      'DGCA Type-Certified & NPNT Enabled',
    ],
    currentStation: 'Noida Assembly Plant',
    targetStation: 'Northern Airbase Depot',
    corridor: 'Corridor Alpha-4 (Active)',
  },
  {
    id: 'indohawk',
    name: 'IndoHawk Alpha',
    category: 'High-Altitude Tactical Recon UAV',
    desc: 'High-endurance tactical quadcopter with dual EO/IR night-vision payload and encrypted military-grade communication link.',
    badge: 'Tactical Recon',
    badgeColor: 'bg-sky-100 text-sky-700 border-sky-200',
    stats: [
      { label: 'Payload Capacity', val: '3.2 kg', sub: 'Dual Thermal Gimbal' },
      { label: 'Cruising Speed', val: '85 km/h', sub: 'High-Altitude Thrust' },
      { label: 'BVLOS Flight Range', val: '40 km', sub: 'Secured Air Link' },
      { label: 'Airborne Endurance', val: '75 mins', sub: 'Hybrid High-Density Cell' },
    ],
    features: [
      'Encrypted 5.8 GHz Telemetry Datalink',
      'High-Altitude Propellers (Up to 5,500m AMSL)',
      'Dual Redundant Auto-Deploy Parachute',
      'Pre-Delivery Avionics QC Signed Off',
    ],
    currentStation: 'Noida Technical Facility',
    targetStation: 'Frontier Surveillance Station',
    corridor: 'Corridor Bravo-7 (Clear)',
  },
  {
    id: 'stealthpro',
    name: 'StealthPro VTOL',
    category: 'Long-Range Fixed-Wing Hybrid UAV',
    desc: 'Combines the vertical takeoff convenience of a quadcopter with the extended high-speed range of a fixed-wing airplane.',
    badge: 'Long Range VTOL',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    stats: [
      { label: 'Payload Capacity', val: '4.0 kg', sub: 'Modular Sensor Bay' },
      { label: 'Cruising Speed', val: '110 km/h', sub: 'Fixed-Wing Glide' },
      { label: 'BVLOS Flight Range', val: '120 km', sub: 'Inter-City Transit' },
      { label: 'Airborne Endurance', val: '150 mins', sub: 'Long-Range Cruising' },
    ],
    features: [
      'Hybrid VTOL Automatic Transition Engine',
      'Triple-Redundant Flight Control Computer',
      'Optical Collision Avoidance & AI Nav',
      'Zero-Defect Technical Acceptance Certificate',
    ],
    currentStation: 'Faridabad Testing Range',
    targetStation: 'State Logistics Hub',
    corridor: 'Corridor Charlie-2 (Scheduled)',
  },
  {
    id: 'agriwing',
    name: 'AgriWing X',
    category: 'Precision Industrial Agriculture UAV',
    desc: 'Centimeter-precision agricultural payload delivery platform with automatic terrain-following radar and high-pressure spray nozzles.',
    badge: 'Agro Industrial',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    stats: [
      { label: 'Tank Capacity', val: '10.0 L', sub: 'High-Pressure Swath' },
      { label: 'Cruising Speed', val: '45 km/h', sub: 'Precision Spraying' },
      { label: 'BVLOS Flight Range', val: '15 km', sub: 'Farm Sector Transit' },
      { label: 'Airborne Endurance', val: '35 mins', sub: 'Rapid Swap Battery' },
    ],
    features: [
      'Centimeter-Accurate RTK Swath Guidance',
      'Millimeter-Wave Terrain Following Radar',
      'Corrosion-Resistant Composite Material',
      'Factory Calibrated & Ready for Delivery',
    ],
    currentStation: 'Noida Assembly Plant',
    targetStation: 'Punjab Agronomy Station',
    corridor: 'Corridor Delta-1 (Assigned)',
  },
];

export const Hero: React.FC<HeroProps> = ({ onNavigate, currentUser }) => {
  const [selectedModel, setSelectedModel] = useState(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const model = FLEET_MODELS_DATA[selectedModel];

  const go = (page: string, url: string) => {
    onNavigate?.(page);
    window.history.pushState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getRoleDashboard = (role?: string) => {
    switch (role) {
      case 'admin':
        return { page: 'admin', path: '/admin', label: 'Enter Admin Console' };
      case 'fleet_manager':
        return { page: 'fleet', path: '/fleet', label: 'Access Fleet Desk' };
      case 'dispatcher':
        return { page: 'dispatch', path: '/dispatch', label: 'Open Dispatcher Board' };
      case 'support':
        return { page: 'support-desk', path: '/support-desk', label: 'Enter Support Desk' };
      default:
        return { page: 'profile', path: '/profile', label: 'Open Operations Desk' };
    }
  };

  const handlePrimaryAuthAction = () => {
    if (currentUser) {
      const desk = getRoleDashboard(currentUser.role);
      go(desk.page, desk.path);
    } else {
      go('login', '/login');
    }
  };

  const handleRoleDeskClick = (r: (typeof ROLES_OVERVIEW)[0]) => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        go(r.page, r.path);
      } else if (currentUser.role === r.roleKey) {
        go(r.page, r.path);
      } else {
        const desk = getRoleDashboard(currentUser.role);
        go(desk.page, desk.path);
      }
    } else {
      go('login', '/login');
    }
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          HERO — Clean Operations Gateway
         ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden flex items-center"
        style={{
          background: 'linear-gradient(135deg, #06010f 0%, #0d0520 45%, #10062a 100%)',
        }}
      >
        {/* 3D Interactive Elevation Mesh */}
        <ElevationMeshBackground />

        {/* Ambient atmospheric glows */}
        <div
          className="absolute top-1/4 left-1/3 w-[650px] h-[650px] rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 w-full pt-28 pb-16 sm:pt-36 sm:pb-24 pointer-events-none [&_button]:pointer-events-auto [&_a]:pointer-events-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-12 lg:gap-16 items-center">
            {/* ── Left Column: Operations Banner ── */}
            <div className="space-y-6">
              {/* Title */}
              <h1 className="text-3xl sm:text-5xl lg:text-[56px] font-black leading-[1.1] tracking-tight text-white">
                IndoFleet Operations Gateway
                <span
                  className="block mt-2 text-transparent bg-clip-text"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #c084fc, #818cf8)',
                  }}
                >
                  UAV Fleet Command &amp; Corridor Control
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-white/70 max-w-xl leading-relaxed">
                Centralized mission control platform managing factory assembly, multi-point QC clearance, secured air corridor transit, and technical handover to client receiving stations.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handlePrimaryAuthAction}
                  className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-black text-sm text-white shadow-xl shadow-purple-900/40 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  }}
                >
                  {currentUser ? (
                    <>
                      <Shield className="w-4 h-4 text-purple-200" />
                      <span>{getRoleDashboard(currentUser.role).label}</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Personnel OTP Login</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>

                <button
                  onClick={() => go('track', '/track')}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white border border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-purple-300" />
                  <span>Track Drone Transit</span>
                </button>

                <button
                  onClick={() => document.getElementById('drone-store')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-purple-950 bg-white hover:bg-purple-50 transition-all active:scale-95 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Explore available drones</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Right Column: Floating Cyber Mascot ── */}
            <div className="flex flex-col items-center justify-center">
              <InteractiveDrone onOrderClick={handlePrimaryAuthAction} />
            </div>
          </div>
        </div>
      </section>

      <StorePage embedded currentUser={currentUser || null} onNavigate={page => go(page, page === 'login' ? '/login' : '/profile?tab=orders')} />

      {/* ══════════════════════════════════════════════════════════════════════
          OPERATIONAL ROLES & WORKSPACES
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Enterprise Role Workspaces
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-3 leading-relaxed">
              Select your assigned operational desk to log in via your pre-provisioned enterprise credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ROLES_OVERVIEW.map((r) => (
              <div
                key={r.role}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-purple-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-purple-700 group-hover:border-purple-200 transition-colors">
                      <r.icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${r.badgeColor}`}
                    >
                      {r.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 leading-snug">{r.title}</h3>
                  <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">{r.desc}</p>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <button
                    onClick={() => handleRoleDeskClick(r)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-[#3b0080] hover:text-white border border-slate-200 hover:border-[#3b0080] transition-all cursor-pointer"
                  >
                    <span>
                      {currentUser && (currentUser.role === 'admin' || currentUser.role === r.roleKey)
                        ? `Open ${r.role} Desk`
                        : r.cta}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          4-STAGE DELIVERY & HANDOVER PROTOCOL (SOP)
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-[#f9f7fd]" id="protocol">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Factory-to-Base Handover Protocol
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-3 leading-relaxed">
              Every IndoWings enterprise drone unit follows a strict four-stage chain of custody from assembly to physical client acceptance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.step}
                className="relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all"
              >
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:flex absolute top-10 right-[-14px] z-10 text-slate-300">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                )}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 border ${step.color}`}>
                  <step.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {step.step}
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-1 mb-2">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          MINIMAL & ELEGANT LIGHT-THEMED FLEET SHOWCASE
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">

          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Enterprise Fleet Models
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-2.5 leading-relaxed">
              DGCA type-certified UAV platforms built for heavy cargo transport, tactical reconnaissance, and precision operations.
            </p>

            {/* Clean Minimal Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
              {FLEET_MODELS_DATA.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(idx);
                    setShowDiagnostics(false);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    selectedModel === idx
                      ? 'bg-[#3b0080] text-white border-[#3b0080] shadow-md shadow-purple-900/10'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Main Showcase Card */}
          <div className="bg-[#fbfafd] rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

              {/* Left Column: Drone Overview & Specs (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border ${model.badgeColor}`}>
                      {model.badge}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      IndoWings Certified Platform
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {model.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    {model.desc}
                  </p>
                </div>

                {/* 4 Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {model.stats.map((s) => (
                    <div
                      key={s.label}
                      className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm text-center"
                    >
                      <p className="text-[11px] font-bold text-slate-400">{s.label}</p>
                      <p className="text-lg font-black text-slate-900 mt-1">{s.val}</p>
                      <p className="text-[10px] text-purple-700 font-medium mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Features Checklist */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2.5">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Avionics &amp; Hardware Standard
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {model.features.map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => go('track', '/track')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs text-white bg-[#3b0080] hover:bg-[#2c0060] transition-all shadow-sm active:scale-95"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Track Active Corridor</span>
                  </button>

                  <button
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all active:scale-95"
                  >
                    <Cpu className="w-3.5 h-3.5 text-purple-600" />
                    <span>{showDiagnostics ? 'Hide Diagnostics' : 'View QC Diagnostics'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Transit Journey & Clean Card (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Transit Route Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#3b0080]" />
                      Corridor Transit Status
                    </p>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Airworthy
                    </span>
                  </div>

                  {/* Clean Visual Steps */}
                  <div className="space-y-4 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                    <div className="relative">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm absolute -left-6 top-0.5" />
                      <p className="text-xs font-bold text-slate-900">Departure Facility</p>
                      <p className="text-xs text-slate-500">{model.currentStation}</p>
                      <span className="text-[10px] text-emerald-600 font-semibold">● Assembly &amp; Diagnostics Passed</span>
                    </div>

                    <div className="relative">
                      <div className="w-4 h-4 rounded-full bg-[#3b0080] border-2 border-white shadow-sm absolute -left-6 top-0.5 animate-pulse" />
                      <p className="text-xs font-bold text-slate-900">Transit Corridor</p>
                      <p className="text-xs text-slate-500">{model.corridor}</p>
                      <span className="text-[10px] text-purple-600 font-semibold">● 5.8 GHz Telemetry Linked</span>
                    </div>

                    <div className="relative">
                      <div className="w-4 h-4 rounded-full bg-slate-300 border-2 border-white shadow-sm absolute -left-6 top-0.5" />
                      <p className="text-xs font-bold text-slate-900">Receiving Base</p>
                      <p className="text-xs text-slate-500">{model.targetStation}</p>
                      <span className="text-[10px] text-slate-400 font-semibold">● Pending Acceptance Inspection</span>
                    </div>
                  </div>
                </div>

                {/* Diagnostics Toggle Card */}
                {showDiagnostics && (
                  <div className="bg-purple-50/70 rounded-2xl p-5 border border-purple-200/80 animate-in fade-in duration-150 space-y-2.5 text-xs">
                    <p className="font-bold text-purple-900 flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-[#3b0080]" />
                      Pre-Delivery QC Bench Results
                    </p>
                    <div className="space-y-1.5 pt-1 text-slate-600 font-medium">
                      <div className="flex justify-between">
                        <span>Dual RTK Satellite Lock:</span>
                        <span className="font-bold text-emerald-600">28 Satellites (Fix 3D)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Battery Cell Impedance:</span>
                        <span className="font-bold text-emerald-600">99.4% (Optimal Balance)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Emergency Parachute Ejection:</span>
                        <span className="font-bold text-purple-700">Armed &amp; Verified</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DGCA NPNT Cryptographic Tag:</span>
                        <span className="font-bold text-emerald-600">Verified &amp; Stamped</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </section>
    </>
  );
};
