import React, { useState, useEffect } from 'react';
import {
  Phone,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Send,
  Clock,
  User,
  Mail,
  Package,
  Truck,
  Navigation,
  FileText,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Check,
  Headphones,
  MessageCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { DeliveryUser } from '../components/AuthModal';
import { API_BASE_URL } from '../config/api';
import PhoneInput from '../components/PhoneInput';

interface SupportPageProps {
  onNavigate: (page: string) => void;
  currentUser: DeliveryUser | null;
  initialTab?: 'expert' | 'guide' | 'fix';
}

export const SupportPage: React.FC<SupportPageProps> = ({ onNavigate, currentUser, initialTab = 'expert' }) => {
  const [activeTab, setActiveTab] = useState<'expert' | 'guide' | 'fix'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Talk to Expert Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [orderId, setOrderId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [droneSerial, setDroneSerial] = useState('');
  const [priority, setPriority] = useState('normal');
  const [category, setCategory] = useState('Corridor Flight & Dispatch Inquiries');
  const [preferredTime, setPreferredTime] = useState('Immediate Callback (15 mins)');
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

  const handleTabSwitch = (tab: 'expert' | 'guide' | 'fix') => {
    setActiveTab(tab);
    window.history.pushState({}, '', `/support?tab=${tab}`);
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

  interface FixItem {
    id: string;
    category: string;
    title: string;
    summary: string;
    solution: string;
    actionLabel: string;
    actionPage?: string;
    tabSwitch?: string;
  }

  const FIX_ITEMS: FixItem[] = [
    {
      id: 'fix-1',
      category: 'weather',
      title: 'Corridor Sortie is showing "Weather Hold" — Meteorological Safety Thresholds',
      summary: 'Automated safety hold triggered by real-time anemometer or precipitation telemetry.',
      solution: `IndoWings autonomous UAVs enforce DGCA safety limits. If corridor sustained winds exceed 38 km/h or active rainfall is detected, the Command Center immediately initiates Weather Hold.

 • Automatic Resumption: The telemetry engine polls environmental sensors every 2 minutes. Once wind levels normalize, cruising resumes automatically.
 • No Action Required: Technical teams receive real-time telemetry updates. The aircraft maintains safe loiter altitude until corridor clearance is confirmed.
 • Alternate Routing: If hold exceeds 20 minutes, Dispatch can divert the UAV via an alternate low-altitude green corridor or recall to base.`,
      actionLabel: 'Check Live Corridor Telemetry',
      actionPage: 'track'
    },
    {
      id: 'fix-2',
      category: 'gps',
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
      title: 'DigitalSky Permission Artifact Mismatch or NPNT Validation Error',
      summary: 'How to regenerate and flash cryptographic flight permission tokens.',
      solution: `Under DGCA DigitalSky regulations, motors cannot be armed without a valid cryptographic flight permission token:

 • Expired Token: Permission tokens are valid for designated corridor flight windows. If launch is delayed, regenerate a clearance token from the Dispatch Board.
 • Cryptographic Checksum Error: Ensure the UAV firmware public key matches your registered IndoWings DigitalSky vendor certificate.
 • Emergency Override: Ground Command Center can re-issue permission tokens within 60 seconds via the DGCA API bridge.`,
      actionLabel: 'Open Dispatch Board',
      actionPage: 'dispatch'
    },
    {
      id: 'fix-4',
      category: 'telemetry',
      title: 'Primary 5G Cellular Telemetry Link Lost — Failover & RF Backup Protocol',
      summary: 'Automated dual-SIM APN switching and long-range UHF backup telemetry handshake.',
      solution: `IndoWings flight controllers feature tri-redundant command links:

 1. Hot-Standby Cellular Failover: Upon primary carrier signal degradation, the system switches to secondary cellular APN in <120ms.
 2. 900MHz RF Backup: If cellular data drops entirely, the drone automatically switches to direct RF Ground Control telemetry.
 3. Failsafe RTH: If both links drop for more than 45 seconds, the UAV climbs to clearance ceiling (120m AGL) and returns autonomously to home base.`,
      actionLabel: 'Inspect Telemetry Radar',
      actionPage: 'track'
    },
    {
      id: 'fix-5',
      category: 'avionics',
      title: 'Dual-IMU Redundancy Warning or Compass Calibration Drift',
      summary: 'Avionics pre-flight sensor diagnostics and magnetic declination alignment.',
      solution: `If pre-flight health checks flag an IMU inconsistency or compass heading error:

 • Accelerometer Calibration: Place UAV on a level surface and execute 6-axis calibration via IndoWings GCS.
 • Magnetic Interference: Keep the aircraft away from reinforced concrete slabs containing rebar.
 • Motor ESC Diagnostics: Verify all electronic speed controller telemetry reports uniform RPM and temperature before flight authorization.`,
      actionLabel: 'Open Operations Docs',
      actionPage: 'docs'
    }
  ];

  const filteredFixes = FIX_ITEMS.filter((item) => {
    const matchesCategory = fixCategoryFilter === 'all' || item.category === fixCategoryFilter;
    const matchesSearch =
      searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.solution.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f8f6fc]">
      {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
      <section className="relative text-white pt-28 sm:pt-36 pb-24 px-6 overflow-hidden text-center" style={{ background: 'linear-gradient(135deg, #1b073a 0%, #2b114d 50%, #15062a 100%)' }}>
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #fff 1px, transparent 1px)', backgroundSize: '36px 36px' }} />

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/15 rounded-full text-xs font-bold text-purple-200 mb-4 shadow-sm">
            <Headphones className="w-3.5 h-3.5 text-emerald-400" />
            <span>IndoWings Flight Operations & Knowledge Center</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">How can our flight desk help you today?</h1>
          <p className="text-white/75 text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-8">
            Connect directly with Flight Operations Engineers, explore the Flight Operations User Manual, or find instant self-serve fixes.
          </p>

          {/* Quick Search Input */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues, packaging rules, terrace safety, refunds..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-[#171222] placeholder-slate-400 text-sm font-medium shadow-xl focus:outline-none focus:ring-4 focus:ring-purple-400/30 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600">
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── 3 PRIMARY TABS BAR ──────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8 relative z-20">
        <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xl flex items-center justify-between gap-1 sm:gap-2">
          {[
            { id: 'expert', label: 'Talk to Expert', icon: Phone, badge: 'Live Engineers' },
            { id: 'guide', label: 'Customer Guide', icon: FileText, badge: 'User Manual' },
            { id: 'fix', label: 'Fix Guide & Help', icon: HelpCircle, badge: 'Self-Serve' }
          ].map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => handleTabSwitch(id as any)}
              className={`flex-1 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === id ? 'bg-[#3b0080] text-white shadow-md shadow-purple-900/20' : 'text-slate-600 hover:text-[#3b0080] hover:bg-purple-50/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono hidden md:inline ${activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{badge}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ─────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* ══════════════════════════════════════════════════════════════════════
 TAB 1: TALK TO EXPERT (LIVE CONSULTATION DESK)
 ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'expert' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
            {/* Left: Consultation Request Form */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="mb-6">
                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full uppercase tracking-wider">Direct Flight Operations Desk</span>
                <h2 className="text-2xl font-black text-[#171222] mt-2 tracking-tight">Consult a Drone Logistics Engineer</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Have specific rooftop landing questions, bulk pharmaceutical shipments, or corridor setup needs? Our engineers call you back directly.
                </p>
              </div>

              {submittedRequest ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/20">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-900">Consultation Request Confirmed!</h3>
                    <p className="text-xs text-emerald-700 mt-1">
                      Reference: <strong className="font-mono">{submittedRequest.id}</strong> • Assigned to Senior Operations Lead
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-emerald-200 text-left text-xs space-y-1.5 text-slate-700">
                    <p>
                      <strong>Client Name:</strong> {submittedRequest.name}
                    </p>
                    <p>
                      <strong>Target Phone:</strong> {submittedRequest.phone}
                    </p>
                    <p>
                      <strong>Topic:</strong> {submittedRequest.category}
                    </p>
                    <p>
                      <strong>Expected Callback:</strong> {submittedRequest.preferred_time}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">Need instant communication right now? Tap the WhatsApp button on the right to chat live!</p>
                  <button type="button" onClick={() => setSubmittedRequest(null)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors">
                    Submit Another Query
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitExpertRequest} className="space-y-6">
                  {formError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Step 1: Contact Details */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-600" />
                      1. Contact Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name *</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Ramesh Chandra"
                            required
                            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Phone *</label>
                        <div className="relative">
                          <PhoneInput value={phone} onChange={(v) => setPhone(v)} placeholder="Mobile number" required size="sm" inputClassName="text-sm" />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address *</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Query & Urgency */}
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-600" />
                      2. Issue &amp; Priority Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Category *</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100 font-medium"
                        >
                          <option value="Corridor Flight & Dispatch Inquiries">Corridor Flight &amp; Dispatch Inquiries</option>
                          <option value="Hardware QC & Diagnostics Inspection">Hardware QC &amp; Diagnostics Inspection</option>
                          <option value="Delivery Site Acceptance & Sign-off">Delivery Site Acceptance &amp; Sign-off</option>
                          <option value="Transit Weather & Airspace Hold">Transit Weather &amp; Airspace Hold</option>
                          <option value="Billing, Invoicing & Challans">Billing, Invoicing &amp; Challans</option>
                          <option value="General Enterprise UAV Support">General Enterprise UAV Support</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Priority Level</label>
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
                              className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                                priority === p.id ? 'bg-[#3b0080] text-white border-[#3b0080] shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Describe Your Query / Issue *</label>
                      <textarea
                        rows={3}
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Provide details about your query so our flight operations engineers can review background telemetry..."
                        className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100 resize-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Optional Order / Drone Reference */}
                  <details className="group border border-slate-200 rounded-2xl bg-slate-50/50 overflow-hidden">
                    <summary className="px-4 py-3 text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-between group-open:bg-white group-open:border-b group-open:border-slate-200">
                      <span>Add Order / Drone Serial Reference (Optional)</span>
                      <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Order ID / Challan</label>
                        <input
                          type="text"
                          value={orderId}
                          onChange={(e) => setOrderId(e.target.value)}
                          placeholder="e.g. INW-2026-005"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[#3b0080]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Drone Serial Number</label>
                        <input
                          type="text"
                          value={droneSerial}
                          onChange={(e) => setDroneSerial(e.target.value)}
                          placeholder="e.g. INDO-UAV-1001"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[#3b0080]"
                        />
                      </div>
                    </div>
                  </details>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-[#3b0080] hover:bg-[#2c0060] text-white rounded-xl text-sm font-bold shadow-md shadow-purple-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Support Query</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Right: Direct Contact & Emergency Action Hub */}
            <div className="lg:col-span-5 space-y-5">
              {/* WhatsApp Instant Desk */}
              <div className="bg-gradient-to-br from-emerald-900 via-[#0b291a] to-emerald-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-emerald-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Live Chat Dispatch</span>
                    <h3 className="text-lg font-bold">Chat on WhatsApp</h3>
                  </div>
                </div>
                <p className="text-xs text-white/80 leading-relaxed mb-5">Skip the phone queue! Send your location pin or delivery question directly to our Active Flight Control room via WhatsApp.</p>
                <a
                  href={`https://wa.me/917669478937?text=${encodeURIComponent('Hi IndoFleet Support Operations Desk, I need assistance with my drone delivery and corridor status.')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Start WhatsApp (+91 7669478937)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Direct Toll-Free & Direct Operations Hotline */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#3b0080] flex items-center justify-center">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#171222]">24/7 Operations Support</h4>
                    <p className="text-xs text-slate-400">Emergency &amp; Technical Helpdesk</p>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Digital Ticketing:</span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Active (24/7 Monitored)</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-500">Support Desk Email:</span>
                    <a href="mailto:connect@indowings.com" className="text-xs font-bold text-[#3b0080] hover:underline font-mono">
                      connect@indowings.com
                    </a>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">Active during all scheduled India airspace flight corridor hours.</p>
              </div>

              {/* Operations Readiness Guarantee */}
              <div className="bg-purple-50/70 border border-purple-100 rounded-3xl p-6 text-xs text-slate-600 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-[#3b0080]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>DGCA Certified Flight Engineers</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  All IndoFleet flight advisors hold Remote Pilot Licences (RPL) certified under DGCA Drone Rules, ensuring safety-critical aerial compliance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
 TAB 2: CUSTOMER GUIDE (DRONE DELIVERY USER MANUAL)
 ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'guide' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Guide Header Banner */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="max-w-2xl">
                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full uppercase tracking-wider">IndoWings Standard Operating Procedure (SOP)</span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#171222] mt-3 tracking-tight">Autonomous UAV Delivery: Customer Guide</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                  Learn how IndoWings delivers cargo in under 24 minutes, packaging limits, and how to prepare your terrace for safe, contactless tether drop.
                </p>
              </div>
            </div>

            {/* 4 In-Depth Visual Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Module 1: Packaging Guidelines */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">1</div>
                  <div>
                    <h3 className="text-base font-bold text-[#171222]">Packaging & Weight Rules</h3>
                    <p className="text-xs text-slate-400">Cyberone Pro Payload Specifications</p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <span className="text-slate-500 font-medium">Maximum Flight Payload:</span>
                    <strong className="text-purple-900 font-bold">5.0 kg Max</strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <span className="text-slate-500 font-medium">Standard Box Dimension:</span>
                    <strong className="text-slate-800 font-mono">30 × 25 × 20 cm</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Weather Protection:</span>
                    <strong className="text-emerald-700 font-bold">Waterproof Seal Required</strong>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="font-bold text-slate-700 block">Allowed vs Prohibited Cargo:</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                      <strong className="block text-emerald-800 font-bold">✓ ALLOWED:</strong>
                      <p>• Medicines & Lab Samples</p>
                      <p>• Documents & Contracts</p>
                      <p>• Electronics & Small Spares</p>
                      <p>• Scientific & Survey Payloads</p>
                    </div>
                    <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                      <strong className="block text-rose-800 font-bold">✗ PROHIBITED:</strong>
                      <p>• Flammable liquids / gas</p>
                      <p>• Loose lithium batteries</p>
                      <p>• Unpadded glass items</p>
                      <p>• Weight &gt; 5 kg</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Module 2: Launch Port & Ground Crew Safety */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#3b0080] flex items-center justify-center font-black">2</div>
                  <div>
                    <h3 className="text-base font-bold text-[#171222]">Launch Port Safety (5m Perimeter Rule)</h3>
                    <p className="text-xs text-slate-400">Hub Ground Pad Clearance & Crew Protocols</p>
                  </div>
                </div>

                <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 text-xs space-y-2">
                  <p className="font-bold text-[#3b0080]">Rotor Blast & Takeoff Safety Zone:</p>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Ground crew must maintain an active <strong>5-meter perimeter buffer</strong> during vertical climb and landing. High-velocity rotor downwash requires eye protection and clear
                    landing pads.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Landing Pad Clear:</strong> Ensure zero loose debris, tools, or obstacles within the circular launch perimeter.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Overhead Clearance:</strong> Verify zero power lines, antennas, or crane booms along the ascent vector.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>RTK Base Link:</strong> Confirm stable RTK GNSS fix before dispatch clearance sign-off.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Module 3: 3-Stage Flight Lifecycle */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-black">3</div>
                  <div>
                    <h3 className="text-base font-bold text-[#171222]">Autonomous Sortie Stages</h3>
                    <p className="text-xs text-slate-400">DGCA corridor transit execution workflow</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-[#3b0080] text-white text-[10px] font-bold flex items-center justify-center">1</span>
                    <div>
                      <strong className="text-[#171222]">NPNT Handshake & Vertical Climb</strong>
                      <p className="text-[11px] text-slate-500">Autonomous motor arming upon token validation and climb to 120m AGL.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-[#3b0080] text-white text-[10px] font-bold flex items-center justify-center">2</span>
                    <div>
                      <strong className="text-[#171222]">Corridor Cruise @ 65–85 km/h</strong>
                      <p className="text-[11px] text-slate-500">Encrypted 5G telemetry link and geofenced waypoint navigation.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-[#3b0080] text-white text-[10px] font-bold flex items-center justify-center">3</span>
                    <div>
                      <strong className="text-[#171222]">Terminal Descent & Hub Recovery</strong>
                      <p className="text-[11px] text-slate-500">RTK precision approach and automated motor shutdown on pad touchdown.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Module 4: Mission Debrief & Telemetry Audit */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">4</div>
                  <div>
                    <h3 className="text-base font-bold text-[#171222]">Mission Telemetry Audit & Log</h3>
                    <p className="text-xs text-slate-400">Post-flight compliance & engineering sign-off</p>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs space-y-2">
                  <p className="font-bold text-amber-900">DGCA Flight Log Compliance:</p>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    Following touchdown, blackbox flight telemetry and battery cell impedance metrics are automatically synced with DGCA DigitalSky and the IndoFleet Command Center.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
                  <p>
                    • <strong>Arrival Radar Notification:</strong> Automated corridor transponder proximity alerts.
                  </p>
                  <p>
                    • <strong>Live Telemetry Confirmation:</strong> Downward sensor records touchdown timestamp.
                  </p>
                  <p>
                    • <strong>Mission Sign-off:</strong> Base technician and pilot verify return-to-hub telemetry.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Button to Track Telemetry */}
            <div className="p-6 bg-gradient-to-r from-purple-900 to-[#3b0080] rounded-3xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div>
                <h3 className="text-lg font-bold">Monitor Active Drone Corridors & Telemetry</h3>
                <p className="text-xs text-white/70 mt-0.5">Real-time GPS tracking and avionics diagnostics across Delhi-NCR airspace.</p>
              </div>
              <button
                onClick={() => {
                  onNavigate('track');
                  window.history.pushState({}, '', '/track');
                }}
                className="px-6 py-3 bg-white text-[#3b0080] font-black rounded-xl text-xs sm:text-sm hover:bg-slate-100 transition-all shrink-0 cursor-pointer shadow-md"
              >
                Live Flight Radar →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
 TAB 3: FIX GUIDE (TROUBLESHOOTING & ISSUE RESOLUTION)
 ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'fix' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Category Pills */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full uppercase tracking-wider">Instant Self-Serve Troubleshooting</span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#171222] mt-2 tracking-tight">Fix Common Issues</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">Resolve weather holds, RTK satellite fix, DGCA permission tokens, and telemetry links instantly.</p>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all', label: 'All Operations' },
                  { id: 'weather', label: 'Weather & Holds' },
                  { id: 'gps', label: 'RTK & GPS Sync' },
                  { id: 'npnt', label: 'DGCA DigitalSky' },
                  { id: 'telemetry', label: '5G Telemetry' },
                  { id: 'avionics', label: 'Avionics & IMU' }
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setFixCategoryFilter(c.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      fixCategoryFilter === c.id ? 'bg-[#3b0080] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-[#3b0080]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Accordion List */}
            <div className="space-y-3">
              {filteredFixes.map((fix) => {
                const isOpen = openFixId === fix.id;
                return (
                  <div
                    key={fix.id}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                      isOpen ? 'border-[#3b0080]/60 ring-2 ring-purple-100 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <button type="button" onClick={() => setOpenFixId(isOpen ? null : fix.id)} className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer">
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-[#171222]">{fix.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{fix.summary}</p>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isOpen ? 'bg-purple-100 text-[#3b0080]' : 'bg-slate-100 text-slate-400'}`}>
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/50 animate-in fade-in duration-150 space-y-4">
                        <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{fix.solution}</div>

                        <div className="pt-2 flex items-center gap-3">
                          {fix.actionPage && (
                            <button
                              onClick={() => onNavigate(fix.actionPage!)}
                              className="px-4 py-2 bg-[#3b0080] hover:bg-[#2c0060] text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>{fix.actionLabel}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {fix.tabSwitch && (
                            <button
                              onClick={() => handleTabSwitch(fix.tabSwitch as any)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>{fix.actionLabel}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredFixes.length === 0 && (
                <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                  No issues found matching your search. Tap <strong>Talk to Expert</strong> to ask our team directly.
                </div>
              )}
            </div>

            {/* Need More Help Box */}
            <div className="p-6 bg-white rounded-3xl border border-purple-100 text-center space-y-2">
              <h4 className="text-sm font-bold text-[#171222]">Still experiencing issues?</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">Our operations control desk can manually override coordinates, inspect flight telemetry, or dispatch backup UAV frames.</p>
              <button
                onClick={() => handleTabSwitch('expert')}
                className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 bg-purple-50 hover:bg-purple-100 text-[#3b0080] font-bold text-xs rounded-xl transition-all border border-purple-200 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Talk to Flight Operations Desk</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
