import React, { useEffect, useState } from 'react';
import {
  Package,
  Navigation,
  ArrowRight,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  ShoppingCart,
  Eye,
  EyeOff
} from 'lucide-react';
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
    desc: 'Browse available IndoFleet 700RPAV tactical quadcopter units and place consignment orders directly.',
    link: '/store',
    page: 'store'
  },
  {
    icon: ShieldCheck,
    title: 'Pre-Flight QC Diagnostics',
    desc: 'Mandatory airworthiness diagnostics across avionics, battery balance, DGCA compliance, and payload calibration before shipment.',
    link: '/fleet',
    page: 'fleet'
  },
  {
    icon: Package,
    title: 'Order Dispatch & Allocation',
    desc: 'Assign QC-certified aircraft to pending client consignments and manage real-time dispatch authorization records.',
    link: '/dispatch',
    page: 'dispatch'
  },
  {
    icon: Navigation,
    title: 'Live Transit & GPS Tracking',
    desc: 'Track dispatched drones in real time on interactive terrain maps with live route estimates, ETAs, and road logistics link.',
    link: '/track',
    page: 'track'
  }
];

const TRANSIT_STAGES = [
  {
    step: '01',
    icon: ShoppingCart,
    title: 'Selection & Booking',
    desc: 'Reserve verified 700RPAV aircraft from hangar inventory and set corridor coordinates.',
    tag: '1'
  },
  {
    step: '02',
    icon: Wrench,
    title: 'Pre-Delivery Diagnostics',
    desc: 'Mandatory 4-point bench inspection: dual IMU sensors, RTK centimeter fix, and battery impedance testing.',
    tag: '2'
  },
  {
    step: '03',
    icon: Navigation,
    title: 'In Transit',
    desc: 'BVLOS corridor dispatch with 5.8 GHz encrypted telemetry broadcasting real-time GPS & altitude.',
    tag: '3'
  },
  {
    step: '04',
    icon: Package,
    title: 'Client Technical Handover',
    desc: 'Physical seal inspection, serial tag audit, telemetry log verification, and digital sign-off.',
    tag: '4'
  }
];

/* Spec sheet — only the values already on the site */
const SPECS = [
  { label: 'Flight Endurance', value: '65', unit: 'Mins', note: 'AMSL cruising' },
  { label: 'Launch Ceiling', value: '18,000', unit: 'ft', note: 'High altitude' },
  { label: 'Telemetry Range', value: '10', unit: 'KM', note: 'Line of sight' },
  { label: 'Max MTOW', value: '5.0', unit: 'Kg', note: '2.2 Kg payload' }
];

const HARDWARE = [
  'PPK / RTK Centimetric Precision GPS',
  'Solid-State Slide & Lock Battery System',
  'IP 53 Weatherproof All-Terrain Rating',
  'H7 Edge Flight Computer & UART Hub'
];

const KEYFRAMES = `
@keyframes hfRise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
@keyframes hfLine { from { transform: translateY(105%); } to { transform: none; } }
@keyframes hfFill { from { width: 0%; } to { width: 100%; } }
.hf-rise { opacity: 0; animation: hfRise .8s cubic-bezier(.2,.7,.2,1) forwards; }
.hf-swap { animation: hfRise .45s cubic-bezier(.2,.7,.2,1) both; }
.hf-line { display: block; transform: translateY(105%); animation: hfLine .9s cubic-bezier(.2,.8,.2,1) forwards; }
@media (prefers-reduced-motion: reduce) {
  .hf-rise { opacity: 1; animation: none; }
  .hf-swap { animation: none; }
  .hf-line { transform: none; animation: none; }
  .hf-fill { animation: none !important; width: 100% !important; }
}
`;

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const go = (page: string, url: string) => {
    onNavigate?.(page);
    window.history.pushState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Hero: "view drone" toggle hides the text so the video is fully visible */
  const [clean, setClean] = useState(false);

  /* Protocol: auto-advancing stepper */
  const [proto, setProto] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setProto((p) => (p + 1) % TRANSIT_STAGES.length), 5000);
    return () => clearTimeout(id);
  }, [proto]);
  const ProtoIcon = TRANSIT_STAGES[proto].icon;

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* ════════════════════════════════════════════════════════════════════
          HERO — full-screen video, headline, ticker
         ════════════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[100svh] w-full flex-col justify-end overflow-hidden bg-black text-white">
        {/* Full-screen background video (original, untouched) */}
        <video
          src="/stick.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />

        {/* Text content */}
        <div
          className={`relative z-10 mx-auto w-full max-w-[1280px] px-4 pb-10 pt-32 transition-opacity duration-500 sm:px-6 sm:pt-36 ${
            clean ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <h1 className="text-[clamp(2.5rem,7vw,6rem)] font-black leading-[0.95] tracking-tighter drop-shadow-lg">
            <span className="block overflow-hidden pb-[0.12em]">
              <span className="hf-line" style={{ animationDelay: '60ms' }}>
                Enterprise UAV Fleet,
              </span>
            </span>
            <span className="-mt-[0.12em] block overflow-hidden pb-[0.12em]">
              <span className="hf-line" style={{ animationDelay: '170ms' }}>
                Booking &amp;
              </span>
            </span>
            <span className="-mt-[0.12em] block overflow-hidden pb-[0.12em]">
              <span
                className="hf-line bg-clip-text text-transparent"
                style={{
                  animationDelay: '280ms',
                  backgroundImage: 'linear-gradient(90deg, #c084fc, #818cf8)'
                }}
              >
                Live Transit Management
              </span>
            </span>
          </h1>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <p
              className="hf-rise max-w-xl text-sm leading-relaxed text-white/85 drop-shadow sm:text-lg"
              style={{ animationDelay: '480ms' }}
            >
              Discover IndoFleet 700RPAV tactical quadcopters, reserve verified aircraft units for
              your enterprise operations, and track real-time factory-to-site corridor telemetry.
            </p>

            <div
              className="hf-rise flex flex-wrap items-center gap-3"
              style={{ animationDelay: '600ms' }}
            >
              <button
                type="button"
                onClick={() => go('store', '/store')}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6366f1] px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-purple-900/40 transition-all hover:scale-[1.02] hover:from-[#6d28d9] hover:to-[#4f46e5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Explore Fleet Store</span>
                <ArrowRight className="ml-0.5 h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => go('track', '/track')}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
              >
                <Navigation className="h-4 w-4 text-purple-300" />
                <span>Track Drone Transit</span>
              </button>
            </div>
          </div>
        </div>


      </section>

      {/* ════════════════════════════════════════════════════════════════════
          CAPABILITIES — hover-sweep rows
         ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Enterprise Fleet Operations
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-500">
              An end-to-end platform managing drone manufacturing inventory, pre-delivery bench
              testing, and live corridor transit tracking.
            </p>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {PLATFORM_FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <button
                  key={feat.title}
                  type="button"
                  onClick={() => go(feat.page, feat.link)}
                  className="group relative flex w-full cursor-pointer items-center gap-4 overflow-hidden px-4 py-7 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#5a00b8] sm:gap-6 sm:px-6"
                >
                  {/* purple sweep */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 origin-left scale-x-0 bg-[#5a00b8] transition-transform duration-500 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
                  />

                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#5a00b8] transition-colors duration-300 group-hover:border-white/25 group-hover:bg-white/15 group-hover:text-white group-focus-visible:text-white">
                    <Icon className="h-6 w-6" />
                  </span>

                  <span className="relative min-w-0 flex-1">
                    <span className="block text-xl font-black tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-white group-focus-visible:text-white sm:text-3xl">
                      {feat.title}
                    </span>
                    <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-slate-500 transition-colors duration-300 group-hover:text-white/85 group-focus-visible:text-white/85">
                      {feat.desc}
                    </span>
                  </span>

                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-all duration-300 group-hover:border-white group-hover:bg-white group-hover:text-[#5a00b8] group-focus-visible:bg-white group-focus-visible:text-[#5a00b8]">
                    <ArrowRight className="h-5 w-5 -rotate-45 transition-transform duration-300 group-hover:rotate-0" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          PROTOCOL — auto-advancing stepper
         ════════════════════════════════════════════════════════════════════ */}
      <section
        id="protocol"
        className="border-y border-slate-200 bg-slate-50 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-bold text-[#5a00b8]">Delivery Workflow</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Factory to Site Transit Protocol
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-500">
              Standard operating procedure from manufacturing hangar assembly to final client
              acceptance.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Step list */}
            <div className="space-y-3 lg:col-span-5">
              {TRANSIT_STAGES.map((s, i) => {
                const active = proto === i;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setProto(i)}
                    aria-current={active}
                    className={`relative w-full cursor-pointer overflow-hidden rounded-xl border bg-white px-5 py-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5a00b8] ${
                      active
                        ? 'border-[#5a00b8] shadow-sm'
                        : 'border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`font-mono text-sm font-bold ${
                          active ? 'text-[#5a00b8]' : 'text-slate-400'
                        }`}
                      >
                        {s.step}
                      </span>
                      <span className={`font-bold ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                        {s.title}
                      </span>
                    </div>
                    {active && (
                      <span
                        key={proto}
                        className="hf-fill absolute bottom-0 left-0 h-[3px] bg-[#5a00b8]"
                        style={{ animation: 'hfFill 5s linear forwards' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Detail panel */}
            <div
              key={proto}
              className="hf-swap relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm lg:col-span-7"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-2 -top-6 select-none text-[160px] font-black leading-none text-slate-900/[0.05]"
              >
                {TRANSIT_STAGES[proto].step}
              </span>

              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5a00b8] text-white">
                <ProtoIcon className="h-7 w-7" />
              </div>

              <div className="relative mt-10">
                <h3 className="text-3xl font-black tracking-tight text-slate-900">
                  {TRANSIT_STAGES[proto].title}
                </h3>
                <p className="mt-3 max-w-lg text-base leading-relaxed text-slate-600">
                  {TRANSIT_STAGES[proto].desc}
                </p>
                <span className="mt-6 inline-block rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-xs font-medium text-[#5a00b8]">
                  {TRANSIT_STAGES[proto].tag}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FEATURED AIRCRAFT: 700RPAV — real footage + spec sheet
         ════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
              IndoFleet 700RPAV
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-500">
              Tactical surveillance, high-precision mapping and extreme high-altitude delivery
              quadcopter UAV.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-12 lg:items-stretch">
            {/* Left: the real aircraft */}
            <div className="relative min-h-[320px] overflow-hidden rounded-3xl bg-black lg:col-span-6">
              <video
                src="/rpav.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
              />
              <p className="absolute bottom-5 left-6 text-lg font-black text-white">
                IndoFleet 700RPAV
              </p>
            </div>

            {/* Right: spec sheet */}
            <div className="lg:col-span-6">
              <p className="max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
                Engineered for high-altitude BVLOS operations over mountains, near-silent acoustic
                surveillance, and rapid multi-payload logistics.
              </p>

              <dl className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
                {SPECS.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between gap-4 px-2 py-4 transition-colors hover:bg-purple-50"
                  >
                    <div>
                      <dt className="text-sm font-bold text-slate-900">{s.label}</dt>
                      <dd className="text-xs text-slate-500">{s.note}</dd>
                    </div>
                    <p className="text-3xl font-black tabular-nums text-slate-900">
                      {s.value}
                      <span className="ml-1.5 text-base font-bold text-[#5a00b8]">{s.unit}</span>
                    </p>
                  </div>
                ))}
              </dl>

              <p className="mt-8 text-sm font-black text-slate-900">Avionics &amp; Hardware Standard</p>
              <ul className="mt-3 space-y-3">
                {HARDWARE.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => go('store', '/store')}
                className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#5a00b8] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#4a0099] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a00b8] active:scale-95"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Browse Fleet Store</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};