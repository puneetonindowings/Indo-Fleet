import React, { useState, useEffect } from 'react';
import {
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  Search,
  Send,
  User,
  Mail,
  Package,
  Navigation,
  FileText,
  ArrowRight,
  ExternalLink,
  Check,
  Headphones,
  MessageCircle,
  AlertCircle,
  RefreshCw,
  Radio,
  Cpu,
  ShoppingCart,
  Wrench,
  Copy
} from 'lucide-react';
import { DeliveryUser } from '../types';
import { API_BASE_URL } from '../config/api';
import PhoneInput from '../components/PhoneInput';

interface SupportPageProps {
  onNavigate: (page: string) => void;
  currentUser: DeliveryUser | null;
  initialTab?: 'expert' | 'guide' | 'fix';
}

type Tab = 'expert' | 'guide' | 'fix';

const SUPPORT_EMAIL = 'connect@indowfleet.com';
const WHATSAPP_NUMBER = '917669478937';
const WHATSAPP_DISPLAY = '+91 7669478937';

const CALLBACK_TIMES = [
  'As soon as possible',
  'Morning (9 AM – 12 PM)',
  'Afternoon (12 PM – 4 PM)',
  'Evening (4 PM – 7 PM)'
];

/* ── Troubleshooting guides (text unchanged) ──────────────────────────────── */
interface FixItem {
  id: string;
  category: string;
  icon: React.ElementType;
  title: string;
  summary: string;
  solution: string;
  actionLabel: string;
  actionPage?: string;
}

const FIX_ITEMS: FixItem[] = [
  {
    id: 'fix-1',
    category: 'weather',
    icon: AlertTriangle,
    title: 'Corridor Sortie is showing "Weather Hold" — Meteorological Safety Thresholds',
    summary: 'Automated safety hold triggered by real-time anemometer or precipitation telemetry.',
    solution: `IndoFleet autonomous UAVs enforce DGCA safety limits. If corridor sustained winds exceed 38 km/h or active rainfall is detected, the Command Center immediately initiates Weather Hold.

 • Automatic Resumption: The telemetry engine polls environmental sensors every 2 minutes. Once wind levels normalize, cruising resumes automatically.
 • No Action Required: Technical teams receive real-time telemetry updates. The aircraft maintains safe loiter altitude until corridor clearance is confirmed.
 • Alternate Routing: If hold exceeds 20 minutes, Dispatch can divert the UAV via an alternate low-altitude green corridor or recall to base.`,
    actionLabel: 'Check Live Corridor Telemetry',
    actionPage: 'track'
  },
  {
    id: 'fix-2',
    category: 'gps',
    icon: Navigation,
    title: 'RTK Centimeter-Fix Latency or Low Satellite Constellation Count — Troubleshooting',
    summary: 'Standard procedure to resolve RTK baseline drift and achieve Fixed-Float precision.',
    solution: `If the UAV reports Float status or satellite count falls below 14:

 1. Verify Base Station Link: Ensure the RTK NTRIP caster is transmitting differential corrections over cellular/UHF link.
 2. Obstacle Clearance: Ensure the UAV launch area is clear of multi-path reflective metal structures or high-voltage lines.
 3. Antenna Lock: Wait 90 seconds for dual-band GNSS multi-constellation lock (GPS + GLONASS + NavIC).`,
    actionLabel: 'View Flight Telemetry',
    actionPage: 'track'
  },
  {
    id: 'fix-3',
    category: 'npnt',
    icon: ShieldCheck,
    title: 'DigitalSky Permission Artifact Mismatch or NPNT Validation Error',
    summary: 'How to regenerate and flash cryptographic flight permission tokens.',
    solution: `Under DGCA DigitalSky regulations, motors cannot be armed without a valid cryptographic flight permission token:

 • Expired Token: Permission tokens are valid for designated corridor flight windows. If launch is delayed, regenerate a clearance token from the Dispatch Board.
 • Cryptographic Checksum Error: Ensure the UAV firmware public key matches your registered IndoFleet DigitalSky vendor certificate.
 • Emergency Override: Ground Command Center can re-issue permission tokens within 60 seconds via the DGCA API bridge.`,
    actionLabel: 'Open Dispatch Board',
    actionPage: 'dispatch'
  },
  {
    id: 'fix-4',
    category: 'telemetry',
    icon: Radio,
    title: 'Primary 5G Cellular Telemetry Link Lost — Failover & RF Backup Protocol',
    summary: 'Automated dual-SIM APN switching and long-range UHF backup telemetry handshake.',
    solution: `IndoFleet flight controllers feature tri-redundant command links:

 1. Hot-Standby Cellular Failover: Upon primary carrier signal degradation, the system switches to secondary cellular APN in <120ms.
 2. 900MHz RF Backup: If cellular data drops entirely, the drone automatically switches to direct RF Ground Control telemetry.
 3. Failsafe RTH: If both links drop for more than 45 seconds, the UAV climbs to clearance ceiling (120m AGL) and returns autonomously to home base.`,
    actionLabel: 'Inspect Telemetry Radar',
    actionPage: 'track'
  },
  {
    id: 'fix-5',
    category: 'avionics',
    icon: Cpu,
    title: 'Dual-IMU Redundancy Warning or Compass Calibration Drift',
    summary: 'Avionics pre-flight sensor diagnostics and magnetic declination alignment.',
    solution: `If pre-flight health checks flag an IMU inconsistency or compass heading error:

 • Accelerometer Calibration: Place UAV on a level surface and execute 6-axis calibration via IndoFleet GCS.
 • Magnetic Interference: Keep the aircraft away from reinforced concrete slabs containing rebar.
 • Motor ESC Diagnostics: Verify all electronic speed controller telemetry reports uniform RPM and temperature before flight authorization.`,
    actionLabel: 'Open Operations Docs',
    actionPage: 'docs'
  }
];

const FIX_CATEGORIES = [
  { id: 'all', label: 'All Operations' },
  { id: 'weather', label: 'Weather & Holds' },
  { id: 'gps', label: 'RTK & GPS Sync' },
  { id: 'npnt', label: 'DGCA DigitalSky' },
  { id: 'telemetry', label: '5G Telemetry' },
  { id: 'avionics', label: 'Avionics & IMU' }
];

/* ── Customer guide content: how this platform actually works ─────────────── */
const ORDER_STEPS = [
  {
    icon: User,
    title: 'Sign in with a customer account',
    desc: 'The Fleet Store and consignment bookings are available to signed-in customer accounts.'
  },
  {
    icon: ShoppingCart,
    title: 'Choose your units',
    desc: 'Browse the 700RPAV Fleet Store, open Details to inspect a unit, and add the ones you need to your consignment cart.'
  },
  {
    icon: Package,
    title: 'Add delivery details',
    desc: 'Pick a saved address or enter your destination facility address, recipient details, and optional logistics notes.'
  },
  {
    icon: CheckCircle2,
    title: 'Confirm your booking',
    desc: 'You receive a Consignment Order ID. You can find your bookings under Profile → Orders.'
  }
];

const PROTOCOL = [
  {
    step: '01',
    title: 'Selection & Booking',
    desc: 'Reserve verified 700RPAV aircraft from hangar inventory and set corridor coordinates.'
  },
  {
    step: '02',
    title: 'Pre-Delivery Diagnostics',
    desc: 'Mandatory 4-point bench inspection: dual IMU sensors, RTK centimeter fix, and battery impedance testing.'
  },
  {
    step: '03',
    title: 'Air Corridor Transit',
    desc: 'BVLOS corridor dispatch with 5.8 GHz encrypted telemetry broadcasting real-time GPS & altitude.'
  },
  {
    step: '04',
    title: 'Client Technical Handover',
    desc: 'Physical seal inspection, serial tag audit, telemetry log verification, and digital sign-off.'
  }
];

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#5a00b8] focus:ring-4 focus:ring-purple-100';

/* Turns a guide's text into a clean paragraph + step list */
const SolutionBody: React.FC<{ text: string }> = ({ text }) => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-slate-700">
      {lines.map((line, i) => {
        const bullet = line.startsWith('•');
        const numbered = /^\d+\.\s/.test(line);
        if (!bullet && !numbered) return <p key={i}>{line}</p>;

        const marker = bullet ? '•' : line.match(/^\d+/)![0];
        const body = bullet ? line.slice(1).trim() : line.replace(/^\d+\.\s*/, '');
        const idx = body.indexOf(': ');
        const label = idx > -1 ? body.slice(0, idx) : '';
        const rest = idx > -1 ? body.slice(idx + 2) : body;
        return (
          <div key={i} className="flex gap-3 rounded-xl border border-slate-100 bg-white p-3">
            <span className="flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-bold text-[#5a00b8]">
              {marker}
            </span>
            <p>
              {label && <strong className="text-slate-900">{label}: </strong>}
              {rest}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export const SupportPage: React.FC<SupportPageProps> = ({ onNavigate, currentUser, initialTab = 'expert' }) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  // Talk to Expert Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [orderId, setOrderId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [droneSerial, setDroneSerial] = useState('');
  const [priority, setPriority] = useState('normal');
  const [category, setCategory] = useState('Corridor Flight & Dispatch Inquiries');
  const [preferredTime, setPreferredTime] = useState(CALLBACK_TIMES[0]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<any>(null);
  const [formError, setFormError] = useState('');

  // Fix Guide Accordion State
  const [openFixId, setOpenFixId] = useState<string | null>('fix-1');
  const [fixCategoryFilter, setFixCategoryFilter] = useState('all');

  // Handle URL query param on mount or change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'expert' || tabParam === 'guide' || tabParam === 'fix') {
      setActiveTab(tabParam);
    }
  }, []);

  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
    window.history.pushState({}, '', `/support?tab=${tab}`);
  };

  const scrollToContent = () => {
    setTimeout(() => {
      document.getElementById('support-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const goTo = (page: string) => {
    onNavigate(page);
    window.history.pushState({}, '', `/${page}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1800);
    } catch {
      /* clipboard not available */
    }
  };

  // The search box searches the troubleshooting guides, so typing jumps there
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim() && activeTab !== 'fix') {
      handleTabSwitch('fix');
      setFixCategoryFilter('all');
    }
  };

  const handleSubmitExpertRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() && !email.trim()) {
      setFormError('Please enter your mobile phone number or email address');
      return;
    }
    setIsSubmitting(true);
    setFormError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/expert-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Client',
          phone: phone.trim(),
          email: email.trim(),
          category,
          priority,
          order_id: orderId.trim() || null,
          delivery_address: deliveryAddress.trim() || null,
          drone_serial: droneSerial.trim() || null,
          preferred_time: preferredTime,
          message: message.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit request');
      setSubmittedRequest(data.request);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFixes = FIX_ITEMS.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesCategory = fixCategoryFilter === 'all' || item.category === fixCategoryFilter;
    const matchesSearch =
      q === '' ||
      item.title.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.solution.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const contactCards = [
    {
      icon: Phone,
      title: 'Request a callback',
      sub: 'Send us a short request',
      onClick: () => {
        handleTabSwitch('expert');
        scrollToContent();
      }
    },
    {
      icon: MessageCircle,
      title: 'Chat on WhatsApp',
      sub: WHATSAPP_DISPLAY,
      href: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi IndoFleet Support, I need assistance with my drone delivery.')}`
    },
    {
      icon: Mail,
      title: 'Email the support desk',
      sub: SUPPORT_EMAIL,
      href: `mailto:${SUPPORT_EMAIL}`
    }
  ];

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge: string }[] = [
    { id: 'expert', label: 'Talk to Expert', icon: Phone, badge: 'Callback request' },
    { id: 'guide', label: 'Customer Guide', icon: FileText, badge: 'How it works' },
    { id: 'fix', label: 'Fix Guide & Help', icon: HelpCircle, badge: 'Self-serve' }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-purple-50 via-white to-white px-4 pb-24 pt-28 sm:px-6 sm:pt-36">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-purple-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />

        <div className="relative mx-auto max-w-5xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white px-3.5 py-1.5 text-xs font-bold text-[#5a00b8] shadow-sm">
            <Headphones className="h-3.5 w-3.5" />
            <span>IndoFleet Flight Operations &amp; Knowledge Center</span>
          </div>

          <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
            How can our flight desk help you today?
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
            Request a callback from our team, read the customer guide, or find instant self-serve fixes.
          </p>

          <div className="relative mt-8 max-w-xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search troubleshooting guides (weather hold, RTK, NPNT…)"
              aria-label="Search troubleshooting guides"
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-20 text-sm font-medium text-slate-900 shadow-lg shadow-purple-900/5 outline-none transition-all placeholder:text-slate-400 focus:border-[#5a00b8] focus:ring-4 focus:ring-purple-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── CONTACT CARDS ────────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto -mt-12 max-w-5xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {contactCards.map((c) => {
            const Icon = c.icon;
            const inner = (
              <>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#5a00b8] transition-colors group-hover:bg-[#5a00b8] group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-slate-900">{c.title}</span>
                  <span className="block truncate text-xs text-slate-500">{c.sub}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-[#5a00b8]" />
              </>
            );
            const cls =
              'group flex cursor-pointer items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-md transition-all hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a00b8]';
            return c.href ? (
              <a
                key={c.title}
                href={c.href}
                target={c.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className={cls}
              >
                {inner}
              </a>
            ) : (
              <button key={c.title} type="button" onClick={c.onClick} className={cls}>
                {inner}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────────────────────────── */}
      <div id="support-content" className="mx-auto max-w-5xl scroll-mt-24 px-4 pt-10 sm:px-6">
        <div
          className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:gap-2"
          role="tablist"
        >
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => handleTabSwitch(id)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5a00b8] sm:px-4 sm:text-sm ${
                activeTab === id
                  ? 'bg-[#5a00b8] text-white shadow-md shadow-purple-900/20'
                  : 'text-slate-600 hover:bg-purple-50 hover:text-[#5a00b8]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
              <span
                className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold md:inline ${
                  activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-10 pb-24 sm:px-6">
        {/* ═══════════ TAB 1: TALK TO EXPERT ═══════════ */}
        {activeTab === 'expert' && (
          <div className="grid animate-in fade-in grid-cols-1 items-start gap-8 duration-200 lg:grid-cols-12">
            {/* Form */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-7">
              <div className="mb-6">
                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">Support request</span>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">Talk to our support team</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  Have a question about your order, the hardware, or corridor setup? Send us the details and we&apos;ll get back to you.
                </p>
              </div>

              {submittedRequest ? (
                <div className="animate-in zoom-in-95 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center duration-200">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-900/20">
                    <Check className="h-7 w-7 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-emerald-900">Request received!</h3>
                    <p className="mt-1 text-xs text-emerald-700">
                      Reference: <strong className="font-mono">{submittedRequest.id}</strong>
                    </p>
                  </div>
                  <dl className="space-y-1.5 rounded-xl border border-emerald-200 bg-white p-4 text-left text-xs text-slate-700">
                    {[
                      ['Name', submittedRequest.name],
                      ['Phone', submittedRequest.phone],
                      ['Topic', submittedRequest.category],
                      ['Preferred callback time', submittedRequest.preferred_time]
                    ]
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4">
                          <dt className="font-bold text-slate-900">{k}</dt>
                          <dd className="text-right">{v}</dd>
                        </div>
                      ))}
                  </dl>
                  <p className="text-xs text-slate-500">Need to reach us right away? Use WhatsApp from the cards at the top of this page.</p>
                  <button
                    type="button"
                    onClick={() => setSubmittedRequest(null)}
                    className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                  >
                    Submit Another Query
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitExpertRequest} className="space-y-6">
                  {formError && (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* 1. Contact */}
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-xs font-black text-slate-400">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[10px] text-[#5a00b8]">1</span>
                      Contact information
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">Full Name *</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Puneet Kushwaha"
                            required
                            className={`${inputCls} pl-10`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">Mobile Phone *</label>
                        <PhoneInput value={phone} onChange={(v) => setPhone(v)} placeholder="Mobile number" required size="sm" inputClassName="text-sm" />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">Email Address *</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            className={`${inputCls} pl-10`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Issue */}
                  <div className="space-y-4 border-t border-slate-100 pt-5">
                    <h3 className="flex items-center gap-2 text-xs font-black text-slate-400">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[10px] text-[#5a00b8]">2</span>
                      Issue &amp; priority
                    </h3>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">Category *</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} cursor-pointer`}>
                          <option value="Corridor Flight & Dispatch Inquiries">Corridor Flight &amp; Dispatch Inquiries</option>
                          <option value="Hardware QC & Diagnostics Inspection">Hardware QC &amp; Diagnostics Inspection</option>
                          <option value="Delivery Site Acceptance & Sign-off">Delivery Site Acceptance &amp; Sign-off</option>
                          <option value="Transit Weather & Airspace Hold">Transit Weather &amp; Airspace Hold</option>
                          <option value="Billing, Invoicing & Challans">Billing, Invoicing &amp; Challans</option>
                          <option value="General Enterprise UAV Support">General Enterprise UAV Support</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">Priority Level</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'normal', label: 'Normal' },
                            { id: 'high', label: 'High' },
                            { id: 'urgent', label: 'Critical' }
                          ].map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPriority(p.id)}
                              aria-pressed={priority === p.id}
                              className={`cursor-pointer rounded-xl border px-2 py-3 text-center text-xs font-bold transition-all ${
                                priority === p.id
                                  ? 'border-[#5a00b8] bg-[#5a00b8] text-white shadow-sm'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700">Preferred callback time</label>
                      <select value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} className={`${inputCls} cursor-pointer`}>
                        {CALLBACK_TIMES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700">Describe Your Query / Issue *</label>
                      <textarea
                        rows={4}
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Share details about your query so our team can review it before getting back to you..."
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  </div>

                  {/* Optional references */}
                  <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold text-slate-700 group-open:border-b group-open:border-slate-200 group-open:bg-white">
                      <span>Add Order / Drone Serial Reference (Optional)</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="grid grid-cols-1 gap-3 bg-white p-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-slate-500">Order ID / Challan</label>
                        <input
                          type="text"
                          value={orderId}
                          onChange={(e) => setOrderId(e.target.value)}
                          placeholder="e.g. INW-2026-005"
                          className={`${inputCls} py-2.5 font-mono text-xs`}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-slate-500">Drone Serial Number</label>
                        <input
                          type="text"
                          value={droneSerial}
                          onChange={(e) => setDroneSerial(e.target.value)}
                          placeholder="e.g. INDO-UAV-1001"
                          className={`${inputCls} py-2.5 font-mono text-xs`}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-[11px] font-bold text-slate-500">Delivery Address</label>
                        <input
                          type="text"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Site / facility address, if relevant"
                          className={`${inputCls} py-2.5 text-xs`}
                        />
                      </div>
                    </div>
                  </details>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#5a00b8] py-3.5 text-sm font-bold text-white shadow-md shadow-purple-900/20 transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a00b8] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Submit Support Query</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Side cards */}
            <div className="space-y-5 lg:col-span-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[#5a00b8]">
                    <Headphones className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Support desk</h4>
                    <p className="text-xs text-slate-400">Reach us directly</p>
                  </div>
                </div>

                <ul className="divide-y divide-slate-100 text-sm">
                  <li className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">Email</p>
                      <a href={`mailto:${SUPPORT_EMAIL}`} className="block truncate font-mono text-xs font-bold text-[#5a00b8] hover:underline">
                        {SUPPORT_EMAIL}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText('email', SUPPORT_EMAIL)}
                      className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-purple-300 hover:text-[#5a00b8]"
                    >
                      {copiedKey === 'email' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {copiedKey === 'email' ? 'Copied' : 'Copy'}
                    </button>
                  </li>
                  <li className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">WhatsApp</p>
                      <p className="font-mono text-xs font-bold text-slate-800">{WHATSAPP_DISPLAY}</p>
                    </div>
                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi IndoFleet Support, I need assistance with my drone delivery.')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-600"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                </ul>
              </div>

              <div className="rounded-3xl border border-purple-100 bg-purple-50/70 p-6">
                <div className="flex items-center gap-2 text-sm font-black text-[#5a00b8]">
                  <Package className="h-4 w-4" />
                  <span>Asking about an order?</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Keep your Order ID handy and add it under &ldquo;Order / Drone Serial Reference&rdquo;. Lost it? The Copilot chat (bottom-right) can look it up with your name and phone.
                </p>
                <button
                  type="button"
                  onClick={() => goTo('track')}
                  className="mt-4 flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#5a00b8] shadow-sm ring-1 ring-purple-200 transition-colors hover:bg-purple-100"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>Track an order</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ TAB 2: CUSTOMER GUIDE ═══════════ */}
        {activeTab === 'guide' && (
          <div className="animate-in fade-in space-y-8 duration-200">
            <div className="max-w-2xl">
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">Ordering &amp; delivery guide</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">From booking to handover</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                How an IndoFleet consignment works: ordering your 700RPAV units, what happens before they reach you, and how to track or manage your order.
              </p>
            </div>

            {/* Order steps */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="mb-6 text-lg font-black text-slate-900">Order in 4 steps</h3>
              <ol className="grid gap-4 sm:grid-cols-2">
                {ORDER_STEPS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <li key={s.title} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#5a00b8] text-white shadow-sm">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-mono text-[11px] font-bold text-[#5a00b8]">Step {i + 1}</p>
                        <p className="text-sm font-black text-slate-900">{s.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <button
                type="button"
                onClick={() => goTo('store')}
                className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#5a00b8] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#4a0099]"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Browse Fleet Store</span>
              </button>
            </section>

            {/* Protocol */}
            <section>
              <h3 className="mb-1 text-lg font-black text-slate-900">Factory to site transit protocol</h3>
              <p className="mb-5 text-sm text-slate-500">
                Standard operating procedure from manufacturing hangar assembly to final client acceptance.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {PROTOCOL.map((p) => (
                  <div
                    key={p.step}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-purple-300"
                  >
                    <span className="font-mono text-2xl font-black text-slate-300">{p.step}</span>
                    <p className="mt-2 text-sm font-black text-slate-900">{p.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{p.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Track & manage */}
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <Navigation className="h-5 w-5 text-[#5a00b8]" />
                <p className="mt-3 text-sm font-black text-slate-900">Track your order</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  Open Track Order, or type your Order ID in the Copilot chat to see its route and status.
                </p>
                <button
                  type="button"
                  onClick={() => goTo('track')}
                  className="mt-4 flex cursor-pointer items-center gap-1 text-xs font-bold text-[#5a00b8] hover:underline"
                >
                  Open Track Order <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <FileText className="h-5 w-5 text-[#5a00b8]" />
                <p className="mt-3 text-sm font-black text-slate-900">Lost your Order ID?</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  Ask the Copilot to find it. It looks your order up using your name, phone or email, and an approximate booking date.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <Wrench className="h-5 w-5 text-[#5a00b8]" />
                <p className="mt-3 text-sm font-black text-slate-900">Cancelling an order</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  You can cancel from your Profile / Orders tab any time before physical road dispatch. Cancelled units return to factory inventory.
                </p>
              </div>
            </section>
          </div>
        )}

        {/* ═══════════ TAB 3: FIX GUIDE ═══════════ */}
        {activeTab === 'fix' && (
          <div className="animate-in fade-in space-y-6 duration-200">
            <div>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">Instant self-serve troubleshooting</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Fix Common Issues</h2>
              <p className="mt-2 text-sm text-slate-500">Resolve weather holds, RTK satellite fix, DGCA permission tokens, and telemetry links.</p>

              {/* Category pills */}
              <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {FIX_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFixCategoryFilter(c.id)}
                    aria-pressed={fixCategoryFilter === c.id}
                    className={`cursor-pointer whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                      fixCategoryFilter === c.id
                        ? 'border-[#5a00b8] bg-[#5a00b8] text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:text-[#5a00b8]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {searchQuery.trim() && (
                <p className="mt-4 text-xs font-semibold text-slate-500">
                  {filteredFixes.length} {filteredFixes.length === 1 ? 'guide' : 'guides'} for &ldquo;{searchQuery.trim()}&rdquo;
                </p>
              )}
            </div>

            {/* Accordion */}
            <div className="space-y-3">
              {filteredFixes.map((fix) => {
                const isOpen = openFixId === fix.id;
                const Icon = fix.icon;
                return (
                  <div
                    key={fix.id}
                    className={`overflow-hidden rounded-2xl border bg-white transition-all ${
                      isOpen ? 'border-[#5a00b8]/50 shadow-md' : 'border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFixId(isOpen ? null : fix.id)}
                      aria-expanded={isOpen}
                      className="flex w-full cursor-pointer items-center gap-4 p-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#5a00b8]"
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          isOpen ? 'bg-[#5a00b8] text-white' : 'bg-purple-50 text-[#5a00b8]'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-slate-900 sm:text-base">{fix.title}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{fix.summary}</span>
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#5a00b8]' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="animate-in fade-in space-y-4 border-t border-slate-100 bg-slate-50/60 px-5 pb-5 pt-4 duration-150">
                        <SolutionBody text={fix.solution} />

                        {fix.actionPage && (
                          <button
                            type="button"
                            onClick={() => goTo(fix.actionPage!)}
                            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#5a00b8] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#4a0099]"
                          >
                            <span>{fix.actionLabel}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredFixes.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                  No guides match your search. Tap <strong>Talk to Expert</strong> to ask our team directly.
                </div>
              )}
            </div>

            {/* Need more help */}
            <div className="space-y-2 rounded-3xl border border-purple-100 bg-purple-50/60 p-6 text-center">
              <h4 className="text-sm font-black text-slate-900">Still experiencing issues?</h4>
              <p className="mx-auto max-w-md text-xs text-slate-500">Send us the details and our team will review your case.</p>
              <button
                type="button"
                onClick={() => {
                  handleTabSwitch('expert');
                  scrollToContent();
                }}
                className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-5 py-2.5 text-xs font-bold text-[#5a00b8] transition-colors hover:bg-purple-100"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Talk to Support</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};