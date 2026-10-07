import React, { useState, useEffect } from 'react';
import {
  Package,
  Navigation,
  ArrowRight,
  ShieldCheck,
  Wrench,
  ChevronRight,
  CheckCircle2,
  Cpu,
  Clock,
  Radio,
  Zap,
  Compass,
  Headphones,
  ShoppingCart,
  Truck,
  FileText,
  Plane,
  Activity,
  Sparkles,
  Check
} from 'lucide-react';
import { InteractiveDrone } from './InteractiveDrone';
import { ElevationMeshBackground } from './ElevationMeshBackground';
import { DeliveryUser } from '../types';

interface HeroProps {
  currentUser?: DeliveryUser | null;
  onOpenCommandCenter?: () => void;
  onOpenDemoBooking?: () => void;
  onNavigate?: (page: string) => void;
}

const PLATFORM_FEATURES = [
  {
    icon: ShoppingCart,
    title: 'Fleet Store & Booking',
    desc: 'Browse available IndoWings Cyberone Max (700RPAV) tactical quadcopter units and place consignment orders directly.',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    link: '/store',
    page: 'store'
  },
  {
    icon: ShieldCheck,
    title: 'Pre-Flight QC Diagnostics',
    desc: 'Mandatory airworthiness diagnostics across avionics, battery balance, DGCA compliance, and payload calibration before shipment.',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    link: '/fleet',
    page: 'fleet'
  },
  {
    icon: Package,
    title: 'Order Dispatch & Allocation',
    desc: 'Assign QC-certified aircraft to pending client consignments and manage real-time dispatch authorization records.',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    link: '/dispatch',
    page: 'dispatch'
  },
  {
    icon: Navigation,
    title: 'Live Transit & GPS Tracking',
    desc: 'Track dispatched drones in real time on interactive terrain maps with live route estimates, ETAs, and road logistics link.',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    link: '/track',
    page: 'track'
  }
];

const TRANSIT_STAGES = [
  {
    step: '01',
    icon: ShoppingCart,
    title: 'Selection & Booking',
    desc: 'Reserve verified Cyberone Max (700RPAV) aircraft from hangar inventory and set corridor coordinates.',
    tag: 'Noida Manufacturing Hangar'
  },
  {
    step: '02',
    icon: Wrench,
    title: 'Pre-Delivery Diagnostics',
    desc: 'Mandatory 4-point bench inspection: dual IMU sensors, RTK centimeter fix, and battery impedance testing.',
    tag: 'Pre-Flight Testing Bay'
  },
  {
    step: '03',
    icon: Navigation,
    title: 'Air Corridor Transit',
    desc: 'BVLOS corridor dispatch with 5.8 GHz encrypted telemetry broadcasting real-time GPS & altitude.',
    tag: 'Active Air Corridor'
  },
  {
    step: '04',
    icon: Package,
    title: 'Client Technical Handover',
    desc: 'Physical seal inspection, serial tag audit, telemetry log verification, and digital sign-off.',
    tag: 'Client Base Acceptance'
  }
];

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const go = (page: string, url: string) => {
    onNavigate?.(page);
    window.history.pushState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          HERO — Primary Platform Gateway
         ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden flex items-center"
        style={{
          background: 'linear-gradient(135deg, #090314 0%, #130626 50%, #1c0836 100%)'
        }}
      >
        {/* 3D Interactive Elevation Mesh */}
        <ElevationMeshBackground />

        {/* Ambient atmospheric glows */}
        <div
          className="absolute top-1/4 left-1/3 w-[650px] h-[650px] rounded-full opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #9333ea 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #bc13fe 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 w-full pt-28 pb-16 sm:pt-36 sm:pb-24 pointer-events-none [&_button]:pointer-events-auto [&_a]:pointer-events-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-12 lg:gap-16 items-center">
            {/* ── Left Column: Operations Banner ── */}
            <div className="space-y-6">
              {/* Title */}
              <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black leading-[1.15] tracking-tight text-white">
                Enterprise UAV Fleet,
                <br />
                Booking &amp;
                <span
                  className="block mt-1 text-transparent bg-clip-text"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #c084fc, #818cf8)'
                  }}
                >
                  Live Transit Management
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-white/75 max-w-xl leading-relaxed">
                Discover IndoWings Cyberone Max tactical quadcopters, reserve verified aircraft units for your enterprise operations, and track real-time factory-to-site corridor telemetry.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => go('store', '/store')}
                  className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#6d28d9] hover:to-[#4f46e5] shadow-xl shadow-purple-900/40 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 text-white" />
                  <span>Explore Fleet Store</span>
                  <ArrowRight className="w-4 h-4 text-white ml-0.5" />
                </button>

                <button
                  onClick={() => go('track', '/track')}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white border border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-purple-300" />
                  <span>Track Drone Transit</span>
                </button>
              </div>
            </div>

            {/* ── Right Column: Floating 3D Drone Mascot ── */}
            <div className="flex flex-col items-center justify-center">
              <InteractiveDrone onOrderClick={() => go('store', '/store')} />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          CORE PLATFORM CAPABILITIES
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Enterprise Fleet Operations
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-3 leading-relaxed">
              An end-to-end platform managing drone manufacturing inventory, pre-delivery bench testing, and live corridor transit tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLATFORM_FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  onClick={() => go(feat.page, feat.link)}
                  className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-orange-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group cursor-pointer"
                >
                  <div>
                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-[#ef7f1a] group-hover:bg-orange-50 group-hover:border-orange-200 transition-colors mb-4">
                      <Icon className="w-5 h-5" />
                    </div>

                    <h3 className="text-base font-black text-slate-900 leading-snug group-hover:text-[#ef7f1a] transition-colors">{feat.title}</h3>
                    <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">{feat.desc}</p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-[#ef7f1a]">
                    <span>Learn More</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          4-STAGE PROTOCOL — MINIMAL & CLEAN
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50/70 border-t border-slate-200/80" id="protocol">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          
          {/* Minimal Section Header */}
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#ef7f1a]">Delivery Workflow</p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5">
              Factory to Site Transit Protocol
            </h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Standard operating procedure from manufacturing hangar assembly to final client acceptance.
            </p>
          </div>

          {/* Minimal 4-Stage Grid with Curvy Connecting Thread */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {TRANSIT_STAGES.map((step, i) => (
              <div key={step.step} className="relative flex flex-col">
                <div className="group h-full bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-2xl font-black tracking-tighter text-slate-300 group-hover:text-[#ef7f1a] transition-colors">
                        {step.step}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-orange-50 group-hover:text-[#ef7f1a] group-hover:border-orange-200 transition-colors">
                        <step.icon className="w-5 h-5" />
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-[#ef7f1a] transition-colors mb-2">
                      {step.title}
                    </h3>
                    
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                    <span>{step.tag}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#ef7f1a] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {/* Curvy Thread Connector between cards (Desktop) */}
                {i < TRANSIT_STAGES.length - 1 && (
                  <div className="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-8 pointer-events-none z-10 text-slate-300">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M 0 12 C 6 4, 12 20, 18 12 C 20 9, 22 11, 24 12"
                        stroke="#cbd5e1"
                        strokeWidth="2"
                        strokeDasharray="3 3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURED AIRCRAFT: CYBERONE MAX (700RPAV)
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">

          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              IndoWings Cyberone Max (700RPAV)
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-2.5 leading-relaxed">
              Tactical surveillance, high-precision mapping and extreme high-altitude delivery quadcopter UAV.
            </p>
          </div>

          {/* Main Showcase Card */}
          <div className="bg-[#fbfafd] rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

              {/* Left Column: Drone Overview & Specs (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Cyberone Max (700RPAV)
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Engineered for high-altitude BVLOS operations over mountains, near-silent acoustic surveillance, and rapid multi-payload logistics.
                  </p>
                </div>

                {/* 4 Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm text-center">
                    <p className="text-[11px] font-bold text-slate-400">Flight Endurance</p>
                    <p className="text-lg font-black text-slate-900 mt-1">65 Mins</p>
                    <p className="text-[10px] text-[#ef7f1a] font-medium mt-0.5">AMSL Cruising</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm text-center">
                    <p className="text-[11px] font-bold text-slate-400">Launch Ceiling</p>
                    <p className="text-lg font-black text-slate-900 mt-1">18,000 ft</p>
                    <p className="text-[10px] text-[#ef7f1a] font-medium mt-0.5">High Altitude</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm text-center">
                    <p className="text-[11px] font-bold text-slate-400">Telemetry Range</p>
                    <p className="text-lg font-black text-slate-900 mt-1">10 KM</p>
                    <p className="text-[10px] text-[#ef7f1a] font-medium mt-0.5">Line of Sight</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm text-center">
                    <p className="text-[11px] font-bold text-slate-400">Max MTOW</p>
                    <p className="text-lg font-black text-slate-900 mt-1">5.0 Kg</p>
                    <p className="text-[10px] text-[#ef7f1a] font-medium mt-0.5">2.2 Kg Payload</p>
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2.5">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Avionics &amp; Hardware Standard
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {[
                      'PPK / RTK Centimetric Precision GPS',
                      'Solid-State Slide & Lock Battery System',
                      'IP 53 Weatherproof All-Terrain Rating',
                      'H7 Edge Flight Computer & UART Hub'
                    ].map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => go('store', '/store')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs text-white bg-[#ef7f1a] hover:bg-[#d96e11] transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Browse Fleet Store</span>
                  </button>

                  <button
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all active:scale-95 cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5 text-[#ef7f1a]" />
                    <span>{showDiagnostics ? 'Hide Diagnostics' : 'View QC Diagnostics'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Transit Corridor Status */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#ef7f1a]" />
                      Corridor Transit Status
                    </p>
                  </div>

                  {/* Visual Steps */}
                  <div className="space-y-4 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                    <div className="relative">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm absolute -left-6 top-0.5" />
                      <p className="text-xs font-bold text-slate-900">Departure Facility</p>
                      <p className="text-xs text-slate-500">Noida Manufacturing Hangar</p>
                      <span className="text-[10px] text-emerald-600 font-semibold">&bull; Assembly &amp; Diagnostics Passed</span>
                    </div>

                    <div className="relative">
                      <div className="w-4 h-4 rounded-full bg-[#ef7f1a] border-2 border-white shadow-sm absolute -left-6 top-0.5 animate-pulse" />
                      <p className="text-xs font-bold text-slate-900">Transit Air Corridor</p>
                      <p className="text-xs text-slate-500">Corridor Alpha-4 (Active)</p>
                      <span className="text-[10px] text-[#ef7f1a] font-semibold">&bull; 5.8 GHz Telemetry Linked</span>
                    </div>

                    <div className="relative">
                      <div className="w-4 h-4 rounded-full bg-slate-300 border-2 border-white shadow-sm absolute -left-6 top-0.5" />
                      <p className="text-xs font-bold text-slate-900">Receiving Base Station</p>
                      <p className="text-xs text-slate-500">Client Delivery Facility</p>
                      <span className="text-[10px] text-slate-400 font-semibold">&bull; Handover Certificate Ready</span>
                    </div>
                  </div>
                </div>

                {/* Diagnostics Toggle Card */}
                {showDiagnostics && (
                  <div className="bg-orange-50/70 rounded-2xl p-5 border border-orange-200/80 animate-in fade-in duration-150 space-y-2.5 text-xs">
                    <p className="font-bold text-[#191b30] flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-[#ef7f1a]" />
                      Pre-Delivery QC Bench Standards
                    </p>
                    <div className="space-y-1.5 pt-1 text-slate-600 font-medium">
                      <div className="flex justify-between">
                        <span>Dual RTK Satellite Lock:</span>
                        <span className="font-bold text-emerald-600">3D Fix Centimetric</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Solid-State Battery Cell:</span>
                        <span className="font-bold text-emerald-600">Optimal Balance (No Runaway)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ingress Protection:</span>
                        <span className="font-bold text-[#ef7f1a]">IP53 Weatherproof</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Flight Computer:</span>
                        <span className="font-bold text-emerald-600">H7 Processor Verified</span>
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

