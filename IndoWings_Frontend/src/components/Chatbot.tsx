import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  X,
  Minimize2,
  Maximize2,
  RefreshCw,
  Bot,
  User,
  Plane,
  Radar,
  Sparkles,
  Phone,
  Building2,
  Package,
  ArrowRight,
  Search,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  ShoppingBag,
  Truck
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  cardType?: 'order_detail' | 'order_list' | 'drones_info' | 'company_info' | 'support_info' | 'store_guide' | 'qc_guide' | 'fix_weather' | 'fix_gps' | 'fix_npnt' | 'fix_telemetry' | 'fix_avionics';
  cardData?: any;
}

interface ChatbotProps {
  onNavigate?: (page: string) => void;
}

/* ── Starter topics (shown as tiles under the welcome message) ─────────────── */
const SUGGESTED_TOPICS = [
  {
    icon: Package,
    label: 'Track Order with Live GPS',
    query: 'Track my delivery order',
    desc: 'Enter Order ID to view real-time delivery GPS route & ETA'
  },
  {
    icon: Search,
    label: 'I lost my Order ID — Help me find it',
    query: 'order id dedo',
    desc: '3-step recovery using Name, Phone & Booking Date'
  },
  {
    icon: Plane,
    label: '700RPAV Hardware Specifications',
    query: '700RPAV specs and performance',
    desc: 'IndoWings 700RPAV commercial drone hardware specs'
  },
  {
    icon: ShieldCheck,
    label: 'Troubleshooting & Hardware Support',
    query: 'Hardware diagnostics and fix guides',
    desc: 'Road delivery updates, RTK calibration, and support'
  },
  {
    icon: ShoppingBag,
    label: 'How to Book Drones from Store?',
    query: 'How to book 700RPAV consignment',
    desc: 'Browse available inventory & schedule road delivery'
  },
  {
    icon: Building2,
    label: 'About IndoWings & DGCA Certifications',
    query: 'About IndoWings Company & DGCA',
    desc: 'Noida HQ, Make in India, Type Certificates'
  }
];

/* Small shortcut chips above the input once the chat has started */
const QUICK_CHIPS = [
  { label: 'Track order', query: 'Track my delivery order' },
  { label: '700RPAV specs', query: '700RPAV specs and performance' },
  { label: 'How to book', query: 'How to book 700RPAV consignment' },
  { label: 'Support', query: 'Support contact' }
];

/* ── Guide cards (text kept exactly as before) ─────────────────────────────── */
type Tone = 'amber' | 'purple' | 'blue' | 'emerald' | 'indigo';

const TONES: Record<Tone, { box: string; title: string; icon: string; text: string }> = {
  amber: { box: 'bg-amber-50 border-amber-200', title: 'text-amber-900', icon: 'text-amber-600', text: 'text-amber-800' },
  purple: { box: 'bg-purple-50 border-purple-200', title: 'text-purple-950', icon: 'text-[#5a00b8]', text: 'text-purple-900' },
  blue: { box: 'bg-blue-50 border-blue-200', title: 'text-blue-950', icon: 'text-blue-600', text: 'text-blue-800' },
  emerald: { box: 'bg-emerald-50 border-emerald-200', title: 'text-emerald-950', icon: 'text-emerald-600', text: 'text-emerald-800' },
  indigo: { box: 'bg-indigo-50 border-indigo-200', title: 'text-indigo-950', icon: 'text-indigo-600', text: 'text-indigo-800' }
};

interface GuideDef {
  icon: React.ElementType;
  tone: Tone;
  title: string;
  intro?: string;
  points?: { label: string; text: string }[];
  numbered?: boolean;
  cta?: { label: string; page: string; url: string };
}

const GUIDES: Record<string, GuideDef> = {
  fix_weather: {
    icon: AlertCircle,
    tone: 'amber',
    title: 'Corridor Weather Hold Protocol',
    intro: 'Automated DGCA safety threshold triggered when sustained winds exceed 38 km/h or active precipitation is detected.',
    points: [
      { label: 'Resumption:', text: 'Sensors poll conditions every 2 mins; cruising resumes automatically upon normalization.' },
      { label: 'Loiter Safety:', text: 'Aircraft loiters safely at holding ceiling (120m AGL).' }
    ],
    cta: { label: 'Check Live Flight Radar', page: 'track', url: '/track' }
  },
  fix_gps: {
    icon: Radar,
    tone: 'purple',
    title: 'RTK Centimeter-Fix Precision Guide',
    numbered: true,
    points: [
      { label: 'NTRIP Caster:', text: 'Check base station UHF/cellular correction stream.' },
      { label: 'Clear Obstacles:', text: 'Ensure launch area is free from heavy metal rebar or powerlines.' },
      { label: 'Satellite Lock:', text: 'Allow 90s for dual-band GNSS lock (GPS + GLONASS + NavIC > 14 sats).' }
    ]
  },
  fix_npnt: {
    icon: ShieldCheck,
    tone: 'blue',
    title: 'DigitalSky NPNT Permission Token',
    intro: 'Under DGCA regulations, motors arm only with valid cryptographic flight tokens. If expired, token can be refreshed in <60s from the Dispatch Console.'
  },
  fix_telemetry: {
    icon: Radar,
    tone: 'emerald',
    title: 'Tri-Redundant Telemetry Failover',
    intro: 'Hot-standby secondary cellular SIM switches in <120ms. If cellular drops, direct 900MHz RF ground telemetry engages automatically.'
  },
  fix_avionics: {
    icon: ShieldCheck,
    tone: 'indigo',
    title: 'Dual-IMU & Sensor Diagnostics',
    intro: 'Execute 6-axis accelerometer calibration on a level surface via IndoWings GCS. Keep aircraft away from electromagnetic interference.'
  },
  qc_guide: {
    icon: ShieldCheck,
    tone: 'indigo',
    title: 'Pre-Flight Diagnostics & BVLOS',
    intro: 'Automated sensor calibration, RTK centimeter fix, and DigitalSky green corridor approvals before dispatch.'
  },
  store_guide: {
    icon: Package,
    tone: 'emerald',
    title: '700RPAV Consignment Booking',
    intro: 'Browse available fleet aircraft, add to consignment cart, and schedule instant delivery.',
    cta: { label: 'Visit Store & Book Drone', page: 'store', url: '/store' }
  }
};

/* ── Status helpers ────────────────────────────────────────────────────────── */
const statusStyle = (status?: string) =>
  status === 'delivered'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : status === 'in-flight' || status === 'on-hold'
      ? 'bg-purple-50 text-[#5a00b8] border-purple-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';

const statusLabel = (status?: string) => (status === 'on-hold' ? 'On The Way' : status || 'Unknown');

const StatusPill: React.FC<{ status?: string }> = ({ status }) => (
  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${statusStyle(status)}`}>
    {statusLabel(status)}
  </span>
);

const CardButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#5a00b8] py-2.5 text-xs font-bold text-white shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a00b8] active:scale-[0.98]"
  >
    {children}
  </button>
);

const GuideCard: React.FC<{ def: GuideDef; onCta: (page: string, url: string) => void }> = ({ def, onCta }) => {
  const t = TONES[def.tone];
  const Icon = def.icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className={`rounded-xl border p-3 ${t.box}`}>
        <p className={`flex items-center gap-2 text-xs font-bold ${t.title}`}>
          <Icon className={`h-4 w-4 shrink-0 ${t.icon}`} />
          <span>{def.title}</span>
        </p>
        {def.intro && <p className={`mt-1.5 text-[11px] leading-relaxed ${t.text}`}>{def.intro}</p>}
        {def.points && (
          <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-slate-700">
            {def.points.map((p, i) => (
              <li key={p.label} className="flex gap-2">
                <span className={`shrink-0 font-bold ${t.icon}`}>{def.numbered ? `${i + 1}.` : '•'}</span>
                <span>
                  <strong>{p.label}</strong> {p.text}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {def.cta && (
        <CardButton onClick={() => onCta(def.cta!.page, def.cta!.url)}>
          <span>{def.cta.label}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </CardButton>
      )}
    </div>
  );
};

export const Chatbot: React.FC<ChatbotProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showTeaser, setShowTeaser] = useState(true);

  // Conversational state machine
  const [convState, setConvState] = useState<{
    step: 'idle' | 'awaiting_name' | 'lookup_name' | 'lookup_phone' | 'lookup_date';
    pendingOrderId?: string;
    lookupData?: {
      name?: string;
      phone?: string;
      date?: string;
    };
  }>({ step: 'idle' });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial welcome message
  useEffect(() => {
    const welcomeTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages([
      {
        id: 'msg-welcome-1',
        sender: 'bot',
        text: 'Hello! I am your IndoWings Logistics & Consignment Assistant.\n\nHow can I help you today? Choose one of the common topics below, or type your question:',
        time: welcomeTime
      }
    ]);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setShowTeaser(false);
    }
  }, [isOpen, isMinimized]);

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'time'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, newMsg]);
    return newMsg;
  };

  const handleResetChat = () => {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setConvState({ step: 'idle' });
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        text: 'Chat history reset. How can I assist you with your IndoWings 700RPAV consignments today?',
        time
      }
    ]);
  };

  // Helper for formatting markdown-style bold, italic, and clean structure without raw asterisks
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      // Process bold (**...**) and italic (*...*) cleanly
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      return (
        <React.Fragment key={lIdx}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
              return (
                <strong key={pIdx} className="font-bold">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
              return (
                <em key={pIdx} className="italic">
                  {part.slice(1, -1)}
                </em>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
          {lIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  // Conversational NLP & Step-by-Step Processing
  const processUserQuery = async (queryText: string) => {
    setLoading(true);
    const clean = queryText.trim();
    const lower = clean.toLowerCase();

    try {
      // 1. STEP 1 OF 3: LOST ORDER ID - ASKING FOR NAME
      if (convState.step === 'lookup_name') {
        setConvState({
          step: 'lookup_phone',
          lookupData: { name: clean }
        });
        addMessage({
          sender: 'bot',
          text: `Got it, **${clean}**.\n\n**Step 2 of 3**: Please enter your **10-digit mobile number** or registered email address:`
        });
        setLoading(false);
        return;
      }

      // 2. STEP 2 OF 3: LOST ORDER ID - ASKING FOR PHONE / EMAIL
      if (convState.step === 'lookup_phone') {
        const updatedLookup = { ...(convState.lookupData || {}), phone: clean };
        setConvState({
          step: 'lookup_date',
          lookupData: updatedLookup
        });
        addMessage({
          sender: 'bot',
          text: `Thank you.\n\n**Step 3 of 3**: What is the approximate **booking date**? (e.g. "Today", "Yesterday", "07 Oct", or type "skip"):`
        });
        setLoading(false);
        return;
      }

      // 3. STEP 3 OF 3: LOST ORDER ID - SUBMIT LOOKUP TO BACKEND
      if (convState.step === 'lookup_date') {
        const finalLookup = {
          name: convState.lookupData?.name || '',
          phone: convState.lookupData?.phone || '',
          date: clean.toLowerCase() === 'skip' ? '' : clean
        };
        setConvState({ step: 'idle' });

        const res = await fetch(`${API_BASE_URL}/api/delivery/chatbot/lookup-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalLookup)
        });
        const data = await res.json();

        if (data.success && data.orders && data.orders.length > 0) {
          addMessage({
            sender: 'bot',
            text: `Found **${data.orders.length} matching consignment${data.orders.length > 1 ? 's' : ''}** for **${finalLookup.name}**!\n\nSelect any order below to track its live delivery route:`,
            cardType: 'order_list',
            cardData: {
              orders: data.orders,
              customerName: finalLookup.name
            }
          });
        } else {
          addMessage({
            sender: 'bot',
            text: `No active orders found matching Name: **${finalLookup.name}** and Phone: **${finalLookup.phone}**.\n\nPlease check the spelling or type your exact Order ID if available.`
          });
        }
        setLoading(false);
        return;
      }

      // 4. IDENTITY VERIFICATION FOR ORDER TRACKING
      if (convState.step === 'awaiting_name' && convState.pendingOrderId) {
        const orderId = convState.pendingOrderId;
        setConvState({ step: 'idle' });

        const res = await fetch(`${API_BASE_URL}/api/delivery/chatbot/track-by-id`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: orderId,
            customer_name: clean,
            verification_name: clean
          })
        });
        const data = await res.json();

        if (data.success && data.order) {
          addMessage({
            sender: 'bot',
            text: `Identity verified for **${clean}**! Live delivery tracking for Order **#${orderId}**:`,
            cardType: 'order_detail',
            cardData: data.order
          });
        } else {
          addMessage({
            sender: 'bot',
            text: `Verification unsuccessful: ${data.message || 'The name provided does not match the customer record for this order.'}\n\nPlease verify and try again, or search by your details.`
          });
        }
        setLoading(false);
        return;
      }

      // 5. TRIGGER: FIND / RECOVER LOST ORDER ID (Natural Hindi & English matching)
      const lostIdKeywords = [
        'order id dedo', 'order id do', 'order id batao', 'order id bta do', 'order id de do',
        'order id chahiye', 'order id kya hai', 'order id nahi', 'order id bhul', 'order id bhool',
        'order kho gaya', 'lost order', 'find order', 'find my order', 'dont know order',
        "don't know order", 'forgot order', 'lookup order', 'recover order', 'order number dedo',
        'order id pata nahi', 'order number batao', 'order details dedo', 'kya order id hai',
        'order id search', 'get my order', 'order id dhundo', 'order id nikal'
      ];
      if (lostIdKeywords.some((kw) => lower.includes(kw))) {
        setConvState({ step: 'lookup_name' });
        addMessage({
          sender: 'bot',
          text: `Sure, let's find your Order ID in 3 quick steps.\n\n**Step 1 of 3**: Please enter the **Customer Full Name** used when placing the order:`
        });
        setLoading(false);
        return;
      }

      // 6. CHECK IF QUERY CONTAINS AN ORDER ID DIRECTLY (e.g. IW-20261007-4BB5E1 or INW-2026-001)
      const orderIdRegex = /(IW-?\d{4,8}-?[A-Z0-9]{3,8}|INW-?\d{4}-?\d{1,6})/i;
      const orderMatch = clean.match(orderIdRegex);
      if (orderMatch) {
        const foundId = orderMatch[0].toUpperCase();
        const res = await fetch(`${API_BASE_URL}/api/delivery/chatbot/track-by-id`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: foundId })
        });
        const data = await res.json();

        if (data.success && data.requires_name) {
          setConvState({ step: 'awaiting_name', pendingOrderId: foundId });
          addMessage({
            sender: 'bot',
            text: `Order **#${foundId}** located in consignment dispatch records.\n\nFor security verification, please enter the registered **Customer Name**:`
          });
        } else if (data.success && data.order) {
          addMessage({
            sender: 'bot',
            text: `Live delivery tracking for Order **#${foundId}**:`,
            cardType: 'order_detail',
            cardData: data.order
          });
        } else {
          addMessage({
            sender: 'bot',
            text: data.message || `Order #${foundId} was not found in our dispatch records. Please verify the ID or search using your Name & Phone.`
          });
        }
        setLoading(false);
        return;
      }

      // 7. GREETINGS & CASUAL
      const greetingKeywords = ['hi', 'hello', 'hey', 'namaste', 'pranam', 'good morning', 'good afternoon', 'good evening'];
      if (greetingKeywords.some((kw) => lower === kw || lower.startsWith(kw + ' ') || lower.endsWith(' ' + kw))) {
        addMessage({
          sender: 'bot',
          text: 'Hello! I am your IndoWings Logistics & Support Assistant.\n\nI can help you track live road deliveries, recover lost order IDs, check 700RPAV specifications, or connect with our support desk. What would you like assistance with?'
        });
        setLoading(false);
        return;
      }

      // 8. COURTESY / THANK YOU
      const thankKeywords = ['thank', 'thanks', 'dhanyawad', 'shukriya', 'thankyou', 'thx'];
      if (thankKeywords.some((kw) => lower.includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'You are welcome! Let me know if you need anything else for your 700RPAV drone hardware consignments.'
        });
        setLoading(false);
        return;
      }

      // 9. FIX GUIDE: WEATHER HOLD
      const weatherKeywords = ['weather', 'mausam', 'hawa', 'rain', 'barish', 'storm', 'wind', 'gust', 'weather hold'];
      if (weatherKeywords.some((kw) => lower.includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'Here is the diagnostic procedure for Weather Hold on corridor sorties:',
          cardType: 'fix_weather'
        });
        setLoading(false);
        return;
      }

      // 10. FIX GUIDE: RTK / GPS FIX
      const rtkKeywords = ['rtk', 'gps', 'satellite', 'accuracy', 'centimeter', 'float', 'drift', 'navic', 'glonass'];
      if (rtkKeywords.some((kw) => lower.includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'Here is the RTK Centimeter-Fix troubleshooting guide:',
          cardType: 'fix_gps'
        });
        setLoading(false);
        return;
      }

      // 11. FIX GUIDE: NPNT & DIGITALSKY PERMISSION
      const npntKeywords = ['npnt', 'digitalsky', 'permission', 'token', 'dgca token', 'green zone', 'yellow zone', 'airspace approval'];
      if (npntKeywords.some((kw) => lower.includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'Here is the DigitalSky NPNT permission token troubleshooting guide:',
          cardType: 'fix_npnt'
        });
        setLoading(false);
        return;
      }

      // 12. FIX GUIDE: TELEMETRY & 5G FAILOVER
      const telemetryKeywords = ['telemetry', '5g', 'signal', 'cellular', 'lost link', 'failover', 'apn', 'uhf', 'rf link', 'disconnect'];
      if (telemetryKeywords.some((kw) => lower.includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'Here is the Telemetry link failover and RF backup protocol:',
          cardType: 'fix_telemetry'
        });
        setLoading(false);
        return;
      }

      // 13. FIX GUIDE: DUAL-IMU & AVIONICS
      const avionicsKeywords = ['imu', 'compass', 'gyro', 'accelerometer', 'esc', 'motor', 'calibration', 'sensor', 'bench test'];
      if (avionicsKeywords.some((kw) => lower.includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'Here is the Dual-IMU redundancy and avionics calibration guide:',
          cardType: 'fix_avionics'
        });
        setLoading(false);
        return;
      }

      // 14. FIX GUIDE GENERAL SEARCH
      const fixGeneralKeywords = ['fix', 'troubleshoot', 'diagnostic', 'problem', 'issue', 'kharab', 'error', 'guide'];
      if (fixGeneralKeywords.some((kw) => lower.includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'IndoWings Standard Operating Procedures & Hardware Fix Guides:\n\nSelect a topic below or type your specific issue (e.g. "Weather hold", "RTK GPS drift", "NPNT token error", "5G telemetry lost", "IMU calibration"):\n\n• Weather Hold Meteorological Thresholds\n• RTK Centimeter Lock & Satellite Count\n• DigitalSky NPNT Permission Tokens\n• 5G Cellular Failover & UHF RF Backup\n• Dual-IMU Redundancy & Compass Alignment',
          cardType: 'qc_guide'
        });
        setLoading(false);
        return;
      }

      // 15. CHECK IF USER ASKS TO TRACK ORDER (GENERIC)
      const trackKeywords = ['track', 'tracking', 'status', 'where is', 'kahan hai', 'kya status', 'delivery status', 'eta', 'transit', 'order status'];
      if (trackKeywords.some((kw) => lower.includes(kw)) && clean.length < 60) {
        addMessage({
          sender: 'bot',
          text: `To track your live delivery:\n\n1. If you have your Order ID, type it directly (e.g. **IW-20261007-XXXX**).\n2. If you don't have your Order ID, type "order id dedo" or "Find my Order ID" to look it up using your Name & Phone.`
        });
        setLoading(false);
        return;
      }

      // 16. KNOWLEDGE BASE: SUPPORT TEAM & HELPLINE (ONLY ON-DEMAND)
      const supportKeywords = ['support', 'contact', 'call', 'phone', 'helpline', 'customer care', 'email', 'number', 'talk to human', 'agent', 'desk', 'complain', 'complaint', 'madad', 'helpdesk'];
      if (supportKeywords.some((kw) => lower.includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'Here are the official IndoWings Support & Command Center details:',
          cardType: 'support_info'
        });
        setLoading(false);
        return;
      }

      // 17. KNOWLEDGE BASE: STORE / HOW TO BOOK DRONES
      // (checked before the drone specs so "How to book 700RPAV consignment" opens the booking guide)
      const bookingKeywords = ['book', 'buy', 'purchase', 'store', 'order kaise', 'kaise kharide', 'inventory', 'consignment', 'shop', 'price', 'pricing', 'fare', 'cost'];
      if (bookingKeywords.some((kw) => lower.includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'How to Book 700RPAV Drones from IndoWings Store:\n\n1. Visit the Store page to view available 700RPAV hardware inventory.\n2. Add the required units to your Consignment Cart.\n3. Enter your Delivery Facility Address and schedule road dispatch.\n4. Hardware units undergo diagnostic inspection before handover to delivery partner.',
          cardType: 'store_guide'
        });
        setLoading(false);
        return;
      }

      // 18. KNOWLEDGE BASE: 700RPAV DRONE FLEET & SPECS
      const droneKeywords = ['drone', 'fleet', '700rpav', 'rpav', 'aircraft', 'uav', 'payload', 'specs', 'specification', 'battery', 'range', 'speed', 'endurance', 'camera', 'weight'];
      if (droneKeywords.some((kw) => lower.includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'IndoWings 700RPAV Technical Specifications & Performance:\n\nThe 700RPAV is a DGCA Type-Certified high-altitude tactical quadcopter engineered for extreme BVLOS logistics and precision operations:',
          cardType: 'drones_info'
        });
        setLoading(false);
        return;
      }

      // 19. KNOWLEDGE BASE: COMPANY & FOUNDER & DGCA
      const companyKeywords = ['indowings', 'company', 'founder', 'ceo', 'paras jain', 'headquarter', 'office', 'dgca', 'cin', 'about', 'make in india', 'location'];
      if (companyKeywords.some((kw) => lower.includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'IndoWings Corporate Profile & Manufacturing:\n\nIndo Wings Private Limited is an Indian aerospace and autonomous defense UAV manufacturer headquartered in Noida.',
          cardType: 'company_info'
        });
        setLoading(false);
        return;
      }

      // 20. KNOWLEDGE BASE: ORDER CANCELLATION / RETURN POLICY
      const cancelKeywords = ['cancel', 'cancellation', 'return', 'refund', 'by operations'];
      if (cancelKeywords.some((kw) => lower.includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'IndoWings Consignment Cancellation Policy:\n\n• Customer Cancellation: You can cancel an order from your Profile / Orders tab at any time prior to physical road dispatch.\n• Operations Cancellation: When cancelled, reserved 700RPAV hardware units are automatically returned to factory inventory.'
        });
        setLoading(false);
        return;
      }

      // 21. DEFAULT INTELLIGENT HELPFUL FALLBACK (Clean text, no cheese emoji soup)
      addMessage({
        sender: 'bot',
        text: 'I can assist you with:\n\n• Track Order: Type your Order ID (e.g. IW-20261007-4BB5E1)\n• Lost Order ID: Type "order id dedo" or "Find my Order ID"\n• 700RPAV Specs: Type "Drone specs"\n• Hardware Fixes: Type "Fix guide" or "Weather hold"\n• How to Book: Type "How to book"\n• Support Team: Type "Support contact"'
      });
    } catch (err: any) {
      addMessage({
        sender: 'bot',
        text: `Connection error: ${err.message}. Please try again.`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    addMessage({ sender: 'user', text });
    setInput('');
    processUserQuery(text);
  };

  const handleTopicClick = (query: string) => {
    if (loading) return;
    addMessage({ sender: 'user', text: query });
    processUserQuery(query);
  };

  const nav = (page: string, url: string) => {
    onNavigate?.(page);
    window.history.pushState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navAndClose = (page: string, url: string) => {
    setIsOpen(false);
    nav(page, url);
  };

  // Track a single order picked from the lookup list
  const trackFromList = async (ord: any, customerName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/chatbot/track-by-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: ord.id,
          customer_name: customerName,
          skip_name_check: true
        })
      });
      const data = await res.json();
      if (data.success && data.order) {
        addMessage({
          sender: 'bot',
          text: `Telemetry loaded for Order **#${ord.id}**:`,
          cardType: 'order_detail',
          cardData: data.order
        });
      }
    } catch (err: any) {
      addMessage({ sender: 'bot', text: `Connection error: ${err.message}. Please try again.` });
    } finally {
      setLoading(false);
    }
  };

  /* ── Card renderer ───────────────────────────────────────────────────────── */
  const renderCard = (msg: ChatMessage) => {
    if (!msg.cardType) return null;

    // Guides (weather, RTK, NPNT, telemetry, avionics, QC, store)
    const guide = GUIDES[msg.cardType];
    if (guide) return <GuideCard def={guide} onCta={navAndClose} />;

    // Live order tracking
    if (msg.cardType === 'order_detail' && msg.cardData) {
      const d = msg.cardData;
      const progress: number | null =
        typeof d.route_progress === 'number'
          ? Math.min(100, Math.max(0, d.route_progress))
          : d.status === 'delivered'
            ? 100
            : null;
      const partner = d.pilot_assigned || d.delivery_partner_name || 'Not assigned yet';
      return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-purple-50 to-white px-3.5 py-3">
            <div>
              <span className="block text-[10px] font-bold text-slate-400">Order ID</span>
              <span className="font-mono text-sm font-bold text-slate-900">#{d.id}</span>
            </div>
            <StatusPill status={d.status} />
          </div>

          <div className="space-y-3 px-3.5 py-3">
            {/* Route */}
            <div>
              <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-700">
                <span className="max-w-[45%] truncate">{d.pickup_address?.split(',')[0] || 'Pickup'}</span>
                <span className="max-w-[45%] truncate text-right">{d.drop_address?.split(',')[0] || 'Destination'}</span>
              </div>
              {progress !== null ? (
                <div className="relative mt-3 h-1.5 rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#5a00b8] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                  <span
                    className="absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#5a00b8] text-white shadow"
                    style={{ left: `${Math.min(94, Math.max(6, progress))}%` }}
                  >
                    <Truck className="h-3 w-3" />
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-[10px] text-slate-400">Route progress is not available yet.</p>
              )}
            </div>

            {/* Partner + ETA */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center">
                <span className="block text-[10px] font-medium text-slate-400">Delivery Partner</span>
                <span className="block truncate text-[11px] font-bold text-slate-800">{partner}</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center">
                <span className="block text-[10px] font-medium text-slate-400">Estimated Window</span>
                <span className="block font-mono text-[11px] font-bold text-[#5a00b8]">
                  {d.eta_mins ? `${d.eta_mins} mins` : '—'}
                </span>
              </div>
            </div>

            {/* Hardware + recipient */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-100 bg-purple-50/60 p-2.5 text-[11px]">
              <div className="min-w-0">
                <span className="block text-slate-500">Hardware Model</span>
                <span className="block truncate font-bold text-[#5a00b8]">
                  {d.drone_model || '700RPAV'}
                  {d.drone_id ? ` (${d.drone_id})` : ''}
                </span>
              </div>
              <div className="min-w-0 text-right">
                <span className="block text-slate-500">Recipient</span>
                <span className="block truncate font-bold text-slate-800">{d.customer_name}</span>
              </div>
            </div>

            <CardButton onClick={() => navAndClose('track', `/track?id=${d.id}`)}>
              <span>Open Full Live GPS Tracking View</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </CardButton>
          </div>
        </div>
      );
    }

    // Lookup results
    if (msg.cardType === 'order_list' && msg.cardData?.orders) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-[11px] font-bold text-slate-500">Orders found for {msg.cardData.customerName}</p>
          <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {msg.cardData.orders.map((ord: any) => (
              <div
                key={ord.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 transition-colors hover:border-purple-300 hover:bg-purple-50/50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">#{ord.id}</span>
                    <StatusPill status={ord.status} />
                  </div>
                  <p className="mt-1 truncate text-[10px] text-slate-500">
                    Booked: {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recent'} · {ord.drone_model || '700RPAV'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => trackFromList(ord, msg.cardData.customerName)}
                  className="shrink-0 cursor-pointer rounded-lg bg-[#5a00b8] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#4a0099] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a00b8]"
                >
                  Track
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 700RPAV specs
    if (msg.cardType === 'drones_info') {
      const specs = [
        { label: 'Endurance', value: '65 mins flight' },
        { label: 'Range', value: '10 km operational' },
        { label: 'Max MTOW', value: '5.0 kg (2.2 kg payload)' },
        { label: 'Positioning', value: 'PPK / RTK Centimeter' }
      ];
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3">
            <p className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Plane className="h-4 w-4 shrink-0 text-[#5a00b8]" />
              <span>700RPAV Type-Certified Tactical Quadcopter</span>
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {specs.map((s) => (
                <div key={s.label} className="rounded-lg border border-purple-100 bg-white p-2">
                  <span className="block text-[10px] font-medium text-slate-400">{s.label}</span>
                  <span className="block text-[11px] font-bold text-slate-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-900">Applications & Deployments</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              High-altitude mountain BVLOS corridors, medical cold-chain logistics, tactical perimeter reconnaissance, and automated pipeline inspection.
            </p>
          </div>

          <CardButton onClick={() => navAndClose('store', '/store')}>
            <span>Browse 700RPAV Fleet Store</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </CardButton>
        </div>
      );
    }

    // Company info
    if (msg.cardType === 'company_info') {
      const rows = [
        { label: 'Legal Name', value: 'Indo Wings Private Limited' },
        { label: 'Founder & CEO', value: 'Paras Jain' },
        { label: 'Manufacturing Facility', value: 'Sector 62, Noida, UP - 201309' },
        { label: 'CIN', value: 'U35999UP2020PTC126589' },
        { label: 'Certifications', value: 'DGCA Type-Certified, DigitalSky Green Corridors' }
      ];
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <dl className="divide-y divide-slate-100">
            {rows.map((r) => (
              <div key={r.label} className="flex items-start justify-between gap-3 py-2 text-[11px] first:pt-0">
                <dt className="shrink-0 font-bold text-slate-900">{r.label}</dt>
                <dd className="text-right text-slate-600">{r.value}</dd>
              </div>
            ))}
          </dl>
          <CardButton onClick={() => navAndClose('company', '/company')}>
            <span>View Company Profile</span>
          </CardButton>
        </div>
      );
    }

    // Support
    if (msg.cardType === 'support_info') {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-100 bg-purple-50/70 p-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900">24/7 Command Center Helpline</p>
              <p className="mt-0.5 font-mono text-[11px] font-bold text-[#5a00b8]">+91 98765 43210 / 1800 572 7363</p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5a00b8] text-white">
              <Phone className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-2.5 space-y-1.5 px-1 text-[11px] leading-relaxed text-slate-600">
            <p>
              <strong className="text-slate-900">Support Email:</strong> connect@indowings.com / support@indowings.com
            </p>
            <p>
              <strong className="text-slate-900">Command Center:</strong> Sector 62, Noida Plant, Uttar Pradesh
            </p>
            <p>
              <strong className="text-slate-900">Operations:</strong> Live Flight Telemetry & Airway Approvals
            </p>
          </div>

          <CardButton onClick={() => navAndClose('support', '/support')}>
            <span>Open Support Desk & Raise Ticket</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </CardButton>
        </div>
      );
    }

    return null;
  };

  const placeholder =
    convState.step === 'awaiting_name'
      ? 'Enter registered customer name...'
      : convState.step === 'lookup_name'
        ? 'Enter registered full name...'
        : convState.step === 'lookup_phone'
          ? 'Enter 10-digit mobile or email...'
          : convState.step === 'lookup_date'
            ? 'Enter booking date (or type "skip")...'
            : 'Ask anything, enter Order ID, or search...';

  return (
    <>
      {/* ── FLOATING LAUNCHER (bottom-right) ─────────────────────────────────── */}
      <div className="fixed bottom-4 right-4 z-50 flex select-none items-center gap-3 sm:bottom-6 sm:right-6">
        {!isOpen && showTeaser && (
          <div className="animate-in fade-in slide-in-from-right-2 hidden items-center gap-2 rounded-2xl border border-purple-100 bg-white py-2 pl-4 pr-2 text-xs font-semibold text-slate-800 shadow-[0_8px_30px_rgba(90,0,184,0.18)] duration-300 sm:flex">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="cursor-pointer transition-colors hover:text-[#5a00b8]"
            >
              Track flight or ask AI Copilot
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setShowTeaser(false)}
              className="cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (isMinimized) setIsMinimized(false);
          }}
          title={isOpen ? 'Close Copilot' : 'Open IndoWings Copilot'}
          aria-label={isOpen ? 'Close Copilot' : 'Open IndoWings Copilot'}
          className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-full text-white shadow-[0_10px_30px_rgba(90,0,184,0.45)] transition-all duration-200 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a00b8] active:scale-95 ${
            isOpen ? 'bg-slate-900' : 'bg-gradient-to-br from-[#7c3aed] to-[#5a00b8]'
          }`}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        </button>
      </div>

      {/* ── CHAT WINDOW ──────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="IndoWings Copilot"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          className={`animate-in fade-in slide-in-from-bottom-3 fixed bottom-24 right-4 z-50 flex w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_64px_-12px_rgba(60,10,120,0.4)] transition-[height] duration-200 sm:right-6 sm:w-[420px] ${
            isMinimized ? 'h-[68px]' : 'h-[620px] max-h-[calc(100svh-7.5rem)]'
          }`}
        >
          {/* Header */}
          <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#2a0a5e] via-[#4a0099] to-[#7c3aed] px-4 py-3.5 text-white">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 left-1/3 h-28 w-28 rounded-full bg-fuchsia-400/20 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur-md">
                  <Plane className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black leading-tight tracking-tight">IndoWings Copilot</h3>
                  <p className="truncate text-[11px] text-purple-100/80">Logistics & Consignment Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Reset Chat"
                  aria-label="Reset chat"
                  className="cursor-pointer rounded-xl p-2 text-purple-100/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  title={isMinimized ? 'Expand' : 'Minimize'}
                  aria-label={isMinimized ? 'Expand' : 'Minimize'}
                  className="cursor-pointer rounded-xl p-2 text-purple-100/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close"
                  aria-label="Close"
                  className="cursor-pointer rounded-xl p-2 text-purple-100/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-[#faf8ff] to-white p-4 text-[13px] [scrollbar-color:#d8c8f5_transparent] [scrollbar-width:thin]">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'bot' && (
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#5a00b8] text-white shadow-sm">
                        <Bot className="h-4 w-4" />
                      </span>
                    )}

                    <div className={`max-w-[86%] space-y-2 ${msg.sender === 'user' ? 'items-end' : ''}`}>
                      <div
                        className={`px-3.5 py-2.5 leading-relaxed ${
                          msg.sender === 'user'
                            ? 'rounded-2xl rounded-tr-md bg-gradient-to-br from-[#7c3aed] to-[#5a00b8] font-medium text-white shadow-md shadow-purple-900/20'
                            : 'rounded-2xl rounded-tl-md border border-slate-200 bg-white text-slate-800 shadow-sm'
                        }`}
                      >
                        {renderFormattedText(msg.text)}
                      </div>

                      {renderCard(msg)}

                      <span
                        className={`block px-1 text-[10px] text-slate-400 ${msg.sender === 'user' ? 'text-right' : ''}`}
                      >
                        {msg.time}
                      </span>
                    </div>

                    {msg.sender === 'user' && (
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                        <User className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                ))}

                {/* Starter topics */}
                {messages.length <= 1 && (
                  <div className="animate-in fade-in space-y-2 duration-300">
                    <p className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-slate-500">
                      <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" />
                      <span>Suggested topics</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {SUGGESTED_TOPICS.map((topic) => {
                        const Icon = topic.icon;
                        return (
                          <button
                            key={topic.label}
                            type="button"
                            onClick={() => handleTopicClick(topic.query)}
                            disabled={loading}
                            title={topic.desc}
                            className="group flex cursor-pointer flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all hover:border-[#7c3aed] hover:bg-purple-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a00b8] disabled:opacity-50"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-[#5a00b8] transition-colors group-hover:bg-[#5a00b8] group-hover:text-white">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="text-[11.5px] font-bold leading-snug text-slate-800 group-hover:text-[#5a00b8]">
                              {topic.label}
                            </span>
                            <span className="line-clamp-2 text-[10px] leading-snug text-slate-400">{topic.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Typing indicator */}
                {loading && (
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#5a00b8] text-white shadow-sm">
                      <Bot className="h-4 w-4" />
                    </span>
                    <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7c3aed] motion-reduce:animate-none"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick chips (only once the chat has started and no step-by-step flow is running) */}
              {messages.length > 1 && convState.step === 'idle' && (
                <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-slate-100 bg-white px-3 pb-1 pt-2.5 [scrollbar-width:none]">
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleTopicClick(chip.query)}
                      disabled={loading}
                      className="shrink-0 cursor-pointer rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-[11px] font-bold text-[#5a00b8] transition-colors hover:bg-[#5a00b8] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a00b8] disabled:opacity-50"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={handleSend}
                className="flex shrink-0 items-center gap-2 border-t border-slate-100 bg-white p-3"
              >
                <div className="flex flex-1 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 transition-all focus-within:border-[#7c3aed] focus-within:bg-white focus-within:ring-4 focus-within:ring-purple-100">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholder}
                    aria-label="Type your message"
                    className="w-full bg-transparent text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                  className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#5a00b8] text-white shadow-md shadow-purple-900/25 transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a00b8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};