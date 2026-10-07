import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Minimize2, Maximize2, RefreshCw, Bot, User, Plane, Radar, Sparkles, Phone, Building2, Package, ArrowRight, Search, ShieldCheck, ChevronRight, HelpCircle, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
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

// Interactive Starter Suggestions displayed vertically inside the chat
const SUGGESTED_TOPICS = [
  {
    icon: Package,
    label: 'Track Order with Live Telemetry',
    query: 'Track my delivery order',
    desc: 'Enter Order ID to view real-time flight HUD & ETA'
  },
  {
    icon: Search,
    label: 'I lost my Order ID — Help me find it',
    query: 'order id dedo',
    desc: '3-step recovery using Name, Phone & Booking Date'
  },
  {
    icon: Plane,
    label: '700RPAV Specifications & Range',
    query: '700RPAV specs and performance',
    desc: '65 mins endurance, 10 km range, PPK/RTK payload'
  },
  {
    icon: ShieldCheck,
    label: 'Troubleshooting & Hardware Fix Guides',
    query: 'Hardware diagnostics and fix guides',
    desc: 'Weather hold, RTK drift, NPNT permissions & avionics'
  },
  {
    icon: Package,
    label: 'How to Book Drones from Store?',
    query: 'How to book 700RPAV consignment',
    desc: 'Browse verified inventory & schedule instant dispatch'
  },
  {
    icon: Building2,
    label: 'About IndoWings & DGCA Certifications',
    query: 'About IndoWings Company & DGCA',
    desc: 'Noida HQ, Make in India, Type Certificates'
  }
];

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
        text: 'Hello! I am your IndoWings Flight & Logistics Assistant.\n\nHow can I help you today? Choose one of the common topics below, or type your question:',
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
        text: 'Chat history reset. How can I assist you with your IndoWings 700RPAV flights today?',
        time
      }
    ]);
  };

  // Helper for formatting markdown-style bold, italic, and clean structure without raw asterisks
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, lIdx) => {
      // Process bold (**...**) and italic (*...*) cleanly
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      return (
        <React.Fragment key={lIdx}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
              return (
                <strong key={pIdx} className="font-bold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
              return (
                <em key={pIdx} className="italic text-slate-700">
                  {part.slice(1, -1)}
                </em>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
          {lIdx < text.split('\n').length - 1 && <br />}
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
            text: `Found **${data.orders.length} matching consignment${data.orders.length > 1 ? 's' : ''}** for **${finalLookup.name}**!\n\nSelect any order below to track its live flight telemetry:`,
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
            text: `Identity verified for **${clean}**! Live flight telemetry for Order **#${orderId}**:`,
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
            text: `Order **#${foundId}** located in flight dispatch records.\n\nFor security verification, please enter the registered **Customer Name**:`
          });
        } else if (data.success && data.order) {
          addMessage({
            sender: 'bot',
            text: `Live flight telemetry for Order **#${foundId}**:`,
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
          text: 'Hello! I am your IndoWings Flight & Logistics Assistant.\n\nI can help you track live flights, recover lost order IDs, check 700RPAV specifications, resolve diagnostic issues, or connect with our support desk. What would you like assistance with?'
        });
        setLoading(false);
        return;
      }

      // 8. COURTESY / THANK YOU
      const thankKeywords = ['thank', 'thanks', 'dhanyawad', 'shukriya', 'thankyou', 'thx'];
      if (thankKeywords.some((kw) => lower.includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'You are welcome! Let me know if you need anything else for your 700RPAV drone flights or consignments.'
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

      // 17. KNOWLEDGE BASE: 700RPAV DRONE FLEET & SPECS
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

      // 18. KNOWLEDGE BASE: STORE / HOW TO BOOK DRONES
      const bookingKeywords = ['book', 'buy', 'purchase', 'store', 'order kaise', 'kaise kharide', 'inventory', 'consignment', 'shop', 'price', 'pricing', 'fare', 'cost'];
      if (bookingKeywords.some((kw) => lower.includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'How to Book 700RPAV Drones from IndoWings Store:\n\n1. Visit the Store page to view available 700RPAV inventory.\n2. Add the required units to your Consignment Cart.\n3. Enter your Delivery Facility Address and schedule corridor dispatch.\n4. Aircraft undergo automated pre-flight diagnostics before takeoff.',
          cardType: 'store_guide'
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
          text: 'IndoWings Consignment Cancellation Policy:\n\n• Customer Cancellation: You can cancel an order from your Profile / Orders tab at any time prior to physical airway dispatch.\n• Operations Cancellation: When cancelled, reserved 700RPAV aircraft units are automatically returned to factory hangar inventory.'
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
    addMessage({ sender: 'user', text: query });
    processUserQuery(query);
  };

  const nav = (page: string, url: string) => {
    onNavigate?.(page);
    window.history.pushState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* ── FLOATING TRIGGER LAUNCHER (Bottom-Right) ─────────────────────────── */}
      <div className="fixed bottom-3.5 right-3.5 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 select-none">
        {/* Interactive Teaser Pill */}
        {!isOpen && showTeaser && (
          <div className="hidden sm:flex items-center gap-2 bg-white/95 text-slate-800 text-xs font-medium px-3.5 py-2 rounded-full border border-purple-200 shadow-lg shadow-purple-900/10 animate-in fade-in slide-in-from-right-2 duration-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span onClick={() => setIsOpen(true)} className="cursor-pointer hover:text-[#5a00b8] transition-colors font-semibold">
              Track flight or ask AI Copilot
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTeaser(false);
              }}
              className="text-slate-400 hover:text-slate-600 ml-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Floating Launcher Button */}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (isMinimized) setIsMinimized(false);
          }}
          className={`relative group w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shadow-[0_8px_25px_rgba(90,0,184,0.35)] hover:shadow-[0_10px_30px_rgba(90,0,184,0.45)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ${
            isOpen ? 'bg-slate-900 rotate-90' : 'bg-[#5a00b8] hover:bg-[#4a0099]'
          }`}
          title={isOpen ? 'Close Copilot' : 'Open IndoWings Copilot'}
        >
          {isOpen ? (
            <X className="w-5 h-5 text-white transition-transform -rotate-90" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#5a00b8]" />
            </div>
          )}
        </button>
      </div>

      {/* ── CHAT WINDOW (ELEGANT PURPLE THEME, STREAMLINED UI) ────────────────── */}
      {isOpen && (
        <div
          className={`fixed bottom-20 right-3.5 sm:bottom-20 sm:right-6 z-50 w-[94vw] sm:w-[400px] bg-white border border-slate-200/90 rounded-3xl shadow-[0_16px_48px_-8px_rgba(23,18,34,0.22)] overflow-hidden flex flex-col transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${
            isMinimized ? 'h-[60px]' : 'h-[560px] sm:h-[580px] max-h-[80vh]'
          }`}
        >
          {/* ── Window Header ── */}
          <div className="bg-gradient-to-r from-slate-900 via-[#1c0836] to-[#3b0080] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md text-purple-200 border border-white/15 flex items-center justify-center shadow-inner">
                <Plane className="w-4 h-4 text-purple-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">IndoWings Copilot</h3>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <button onClick={handleResetChat} title="Reset Chat" className="p-1.5 text-purple-200/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                className="p-1.5 text-purple-200/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setIsOpen(false)} title="Close" className="p-1.5 text-purple-200/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Window Body ── */}
          {!isMinimized && (
            <>
              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#fbfafd] text-xs">
                {/* Render Messages */}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender === 'bot' && (
                      <div className="w-6 h-6 rounded-lg bg-purple-50 text-[#5a00b8] border border-purple-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div className="max-w-[85%] space-y-1.5">
                      {/* Message Bubble */}
                      <div
                        className={`p-3 rounded-2xl leading-relaxed text-xs ${
                          msg.sender === 'user'
                            ? 'bg-[#5a00b8] text-white rounded-tr-xs shadow-md shadow-purple-950/15 font-medium'
                            : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs shadow-xs'
                        }`}
                      >
                        {renderFormattedText(msg.text)}
                      </div>

                      {/* ── CARD: LIVE FLIGHT TELEMETRY & HUD ── */}
                      {msg.cardType === 'order_detail' && msg.cardData && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-2.5 animate-in fade-in">
                          {/* Order Header */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Order ID</span>
                              <span className="text-xs font-mono font-bold text-slate-900">#{msg.cardData.id}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                msg.cardData.status === 'delivered'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : msg.cardData.status === 'in-flight'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {msg.cardData.status}
                            </span>
                          </div>

                          {/* Route Progress */}
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-600 font-semibold">
                              <span className="truncate max-w-[110px]">{msg.cardData.pickup_address?.split(',')[0]}</span>
                              <Plane className="w-3.5 h-3.5 text-[#5a00b8]" />
                              <span className="truncate max-w-[110px]">{msg.cardData.drop_address?.split(',')[0]}</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#5a00b8] h-full transition-all duration-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(10, msg.cardData.route_progress || 45))}%` }}
                              />
                            </div>
                          </div>

                          {/* Telemetry Grid */}
                          <div className="grid grid-cols-3 gap-1.5 text-center">
                            <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 block font-medium">Speed</span>
                              <span className="text-[11px] font-bold text-slate-800 font-mono">{msg.cardData.speed_kmh || 58} km/h</span>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 block font-medium">Altitude</span>
                              <span className="text-[11px] font-bold text-slate-800 font-mono">{msg.cardData.altitude_m || 120} m</span>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 block font-medium">ETA</span>
                              <span className="text-[11px] font-bold text-[#5a00b8] font-mono">{msg.cardData.eta_mins || 18} mins</span>
                            </div>
                          </div>

                          {/* Assigned Drone & Customer */}
                          <div className="p-2 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between text-[10px]">
                            <div>
                              <span className="text-slate-500 block font-medium">Assigned Aircraft:</span>
                              <span className="font-bold text-[#5a00b8]">{msg.cardData.drone_model || '700RPAV'} ({msg.cardData.drone_id || 'UAV-SYS-01'})</span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-500 block font-medium">Recipient:</span>
                              <span className="font-bold text-slate-800">{msg.cardData.customer_name}</span>
                            </div>
                          </div>

                          {/* View Full Radar button */}
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              nav('track', `/track?orderId=${msg.cardData.id}`);
                            }}
                            className="w-full py-2 bg-[#5a00b8] hover:bg-[#4a0099] text-white font-bold text-[11px] rounded-xl cursor-pointer transition-all shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <span>Open Full Terrain Tracking View</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* ── CARD: ORDER LIST LOOKUP RESULTS ── */}
                      {msg.cardType === 'order_list' && msg.cardData?.orders && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Orders found for {msg.cardData.customerName}:
                          </p>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {msg.cardData.orders.map((ord: any) => (
                              <div
                                key={ord.id}
                                className="p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200/80 transition-all flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-xs text-slate-900">#{ord.id}</span>
                                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${
                                      ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {ord.status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                    Booked: {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recent'} · {ord.drone_model || '700RPAV'}
                                  </p>
                                </div>

                                <button
                                  onClick={async () => {
                                    setLoading(true);
                                    const res = await fetch(`${API_BASE_URL}/api/delivery/chatbot/track-by-id`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        order_id: ord.id,
                                        customer_name: msg.cardData.customerName,
                                        skip_name_check: true
                                      })
                                    });
                                    const data = await res.json();
                                    setLoading(false);
                                    if (data.success && data.order) {
                                      addMessage({
                                        sender: 'bot',
                                        text: `Telemetry loaded for Order **#${ord.id}**:`,
                                        cardType: 'order_detail',
                                        cardData: data.order
                                      });
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-[#5a00b8] hover:bg-[#4a0099] text-white text-[10px] font-bold rounded-lg cursor-pointer shrink-0 transition-colors"
                                >
                                  Track
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── CARD: 700RPAV DRONE FLEET SPECS ── */}
                      {msg.cardType === 'drones_info' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 shadow-xs text-xs">
                          <div className="p-2.5 bg-purple-50/60 rounded-xl border border-purple-100">
                            <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <Plane className="w-3.5 h-3.5 text-[#5a00b8]" />
                              <span>700RPAV Type-Certified Tactical Quadcopter</span>
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 mt-2 text-[10px] text-slate-600">
                              <div>• <strong>Endurance:</strong> 65 mins flight</div>
                              <div>• <strong>Range:</strong> 10 km operational</div>
                              <div>• <strong>Payload:</strong> 5.0 kg capacity</div>
                              <div>• <strong>Positioning:</strong> PPK / RTK Centimeter</div>
                            </div>
                          </div>

                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="font-bold text-slate-900 text-xs">Applications & Deployments</p>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                              High-altitude mountain BVLOS corridors, medical cold-chain logistics, tactical perimeter reconnaissance, and automated pipeline inspection.
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              setIsOpen(false);
                              nav('store', '/store');
                            }}
                            className="w-full py-2 bg-[#5a00b8] hover:bg-[#4a0099] text-white font-bold text-[11px] rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                          >
                            <span>Browse 700RPAV Fleet Store</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* ── CARD: FIX GUIDE: WEATHER HOLD ── */}
                      {msg.cardType === 'fix_weather' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 shadow-xs text-xs">
                          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                            <p className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>Corridor Weather Hold Protocol</span>
                            </p>
                            <p className="text-[10px] text-amber-800 mt-1 leading-relaxed">
                              Automated DGCA safety threshold triggered when sustained winds exceed 38 km/h or active precipitation is detected.
                            </p>
                          </div>
                          <div className="space-y-1 text-[10.5px] text-slate-600">
                            <p>• <strong>Resumption:</strong> Sensors poll conditions every 2 mins; cruising resumes automatically upon normalization.</p>
                            <p>• <strong>Loiter Safety:</strong> Aircraft loiters safely at holding ceiling (120m AGL).</p>
                          </div>
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              nav('track', '/track');
                            }}
                            className="w-full py-1.5 bg-[#5a00b8] hover:bg-[#4a0099] text-white font-bold text-[11px] rounded-xl cursor-pointer transition-colors"
                          >
                            Check Live Flight Radar
                          </button>
                        </div>
                      )}

                      {/* ── CARD: FIX GUIDE: RTK / GPS ── */}
                      {msg.cardType === 'fix_gps' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 shadow-xs text-xs">
                          <div className="p-2.5 bg-purple-50/70 rounded-xl border border-purple-200">
                            <p className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                              <Radar className="w-3.5 h-3.5 text-[#5a00b8]" />
                              <span>RTK Centimeter-Fix Precision Guide</span>
                            </p>
                            <div className="space-y-1 text-[10.5px] text-slate-700 mt-1.5">
                              <p>1. <strong>NTRIP Caster:</strong> Check base station UHF/cellular correction stream.</p>
                              <p>2. <strong>Clear Obstacles:</strong> Ensure launch area is free from heavy metal rebar or powerlines.</p>
                              <p>3. <strong>Satellite Lock:</strong> Allow 90s for dual-band GNSS lock (GPS + GLONASS + NavIC &gt; 14 sats).</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── CARD: FIX GUIDE: NPNT DIGITALSKY ── */}
                      {msg.cardType === 'fix_npnt' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 shadow-xs text-xs">
                          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                            <p className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              <span>DigitalSky NPNT Permission Token</span>
                            </p>
                            <p className="text-[10px] text-blue-800 mt-1 leading-relaxed">
                              Under DGCA regulations, motors arm only with valid cryptographic flight tokens. If expired, token can be refreshed in &lt;60s from the Dispatch Console.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ── CARD: FIX GUIDE: TELEMETRY 5G ── */}
                      {msg.cardType === 'fix_telemetry' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 shadow-xs text-xs">
                          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                            <p className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                              <Radar className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Tri-Redundant Telemetry Failover</span>
                            </p>
                            <p className="text-[10px] text-emerald-800 mt-1 leading-relaxed">
                              Hot-standby secondary cellular SIM switches in &lt;120ms. If cellular drops, direct 900MHz RF ground telemetry engages automatically.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ── CARD: FIX GUIDE: AVIONICS & IMU ── */}
                      {msg.cardType === 'fix_avionics' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 shadow-xs text-xs">
                          <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200">
                            <p className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Dual-IMU & Sensor Diagnostics</span>
                            </p>
                            <p className="text-[10px] text-indigo-800 mt-1 leading-relaxed">
                              Execute 6-axis accelerometer calibration on a level surface via IndoWings GCS. Keep aircraft away from electromagnetic interference.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ── CARD: COMPANY & DGCA INFO ── */}
                      {msg.cardType === 'company_info' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 shadow-xs text-[11px] text-slate-600">
                          <div className="space-y-1">
                            <p><strong className="text-slate-900">Legal Name:</strong> Indo Wings Private Limited</p>
                            <p><strong className="text-slate-900">Founder & CEO:</strong> Paras Jain</p>
                            <p><strong className="text-slate-900">Manufacturing Facility:</strong> Sector 62, Noida, UP - 201309</p>
                            <p><strong className="text-slate-900">CIN:</strong> U35999UP2020PTC126589</p>
                            <p><strong className="text-slate-900">Certifications:</strong> DGCA Type-Certified, DigitalSky Green Corridors</p>
                          </div>

                          <button
                            onClick={() => {
                              setIsOpen(false);
                              nav('company', '/company');
                            }}
                            className="w-full py-1.5 bg-[#5a00b8] hover:bg-[#4a0099] text-white font-bold text-[11px] rounded-xl cursor-pointer transition-colors"
                          >
                            View Company Profile
                          </button>
                        </div>
                      )}

                      {/* ── CARD: SUPPORT TEAM & 24/7 HELPLINE (Shown when asked) ── */}
                      {msg.cardType === 'support_info' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2.5 shadow-xs text-xs">
                          <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-900 text-xs">24/7 Command Center Helpline</p>
                              <p className="text-[11px] text-[#5a00b8] font-bold font-mono mt-0.5">+91 98765 43210 / 1800 572 7363</p>
                            </div>
                            <Phone className="w-4 h-4 text-[#5a00b8]" />
                          </div>

                          <div className="space-y-1 text-[11px] text-slate-600 px-1">
                            <p><strong className="text-slate-900">Support Email:</strong> connect@indowings.com / support@indowings.com</p>
                            <p><strong className="text-slate-900">Command Center:</strong> Sector 62, Noida Plant, Uttar Pradesh</p>
                            <p><strong className="text-slate-900">Operations:</strong> Live Flight Telemetry & Airway Approvals</p>
                          </div>

                          <button
                            onClick={() => {
                              setIsOpen(false);
                              nav('support', '/support');
                            }}
                            className="w-full py-2 bg-[#5a00b8] hover:bg-[#4a0099] text-white font-bold text-[11px] rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <span>Open Support Desk & Raise Ticket</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* ── CARD: STORE BOOKING GUIDE ── */}
                      {msg.cardType === 'store_guide' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 shadow-xs text-xs">
                          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                            <p className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-emerald-600" />
                              <span>700RPAV Consignment Booking</span>
                            </p>
                            <p className="text-[10px] text-emerald-700 mt-0.5">
                              Browse 1000+ verified idle aircraft, add to consignment cart, and schedule instant delivery.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              nav('store', '/store');
                            }}
                            className="w-full py-2 bg-[#5a00b8] hover:bg-[#4a0099] text-white font-bold text-[11px] rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                          >
                            <span>Visit Store & Book Drone</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* ── CARD: PRE-FLIGHT QC & CORRIDORS GUIDE ── */}
                      {msg.cardType === 'qc_guide' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 shadow-xs text-xs">
                          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                            <p className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Pre-Flight Diagnostics & BVLOS</span>
                            </p>
                            <p className="text-[10px] text-indigo-700 mt-0.5">
                              Automated sensor calibration, RTK centimeter fix, and DigitalSky green corridor approvals before dispatch.
                            </p>
                          </div>
                        </div>
                      )}

                      <span className="text-[9px] text-slate-400 block px-1">{msg.time}</span>
                    </div>

                    {msg.sender === 'user' && (
                      <div className="w-6 h-6 rounded-lg bg-[#5a00b8] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                ))}

                {/* ── Interactive Starter Suggested Questions List (Floating in chat flow) ── */}
                {messages.length <= 1 && (
                  <div className="mt-2 space-y-1.5 animate-in fade-in duration-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Suggested Topics:</span>
                    </p>
                    <div className="space-y-1.5">
                      {SUGGESTED_TOPICS.map((topic, idx) => {
                        const Icon = topic.icon;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleTopicClick(topic.query)}
                            disabled={loading}
                            className="w-full p-2.5 rounded-2xl bg-white hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-300 text-left transition-all group cursor-pointer flex items-center justify-between gap-2.5 shadow-2xs hover:shadow-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-xl bg-purple-50 text-[#5a00b8] group-hover:bg-[#5a00b8] group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-[11px] text-slate-800 group-hover:text-[#5a00b8] transition-colors block truncate">
                                  {topic.label}
                                </span>
                                <span className="text-[9px] text-slate-400 block truncate">
                                  {topic.desc}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#5a00b8] group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] italic p-2 bg-white rounded-xl border border-slate-200 w-fit shadow-xs">
                    <div className="w-2 h-2 rounded-full bg-[#5a00b8] animate-ping" />
                    <span>Copilot processing request...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ── Input Bar ── */}
              <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
                <div className="flex-1 relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 focus-within:bg-white focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      convState.step === 'awaiting_name'
                        ? 'Enter registered customer name...'
                        : convState.step === 'lookup_name'
                          ? 'Enter registered full name...'
                          : convState.step === 'lookup_phone'
                            ? 'Enter 10-digit mobile or email...'
                            : convState.step === 'lookup_date'
                              ? 'Enter booking date (or type "skip")...'
                              : 'Ask anything, enter Order ID, or search...'
                    }
                    className="w-full bg-transparent text-slate-800 placeholder-slate-400 text-xs focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-2xl bg-[#5a00b8] hover:bg-[#4a0099] text-white flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer shrink-0 shadow-md shadow-purple-950/20 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
