import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Minimize2, Maximize2, RefreshCw, Bot, User, Plane, Radar, Sparkles, Phone, Building2, Package, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  cardType?: 'order_detail' | 'order_list' | 'otp_prompt' | 'drones_info' | 'company_info';
  cardData?: any;
}

interface ChatbotProps {
  onNavigate?: (page: string) => void;
}

const QUICK_ACTIONS = [
  {
    icon: Package,
    label: 'Track Flight',
    query: 'Track my delivery order',
    desc: 'Live telemetry & ETA'
  },
  {
    icon: Phone,
    label: 'Find Order ID',
    query: 'Find my Order ID (Mobile/Email)',
    desc: 'Verify via Mobile OTP'
  },
  {
    icon: Plane,
    label: 'Drone Fleet',
    query: 'IndoWings Drone Fleet & Specs',
    desc: 'Cyberone & S-500 specs'
  },
  {
    icon: Building2,
    label: 'About IndoWings',
    query: 'About IndoWings Company & DGCA',
    desc: 'Company, DGCA & Founder'
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
    step: 'idle' | 'awaiting_name' | 'awaiting_identifier' | 'awaiting_otp';
    pendingOrderId?: string;
    pendingIdentifier?: string;
  }>({ step: 'idle' });

  const pendingIdentifierRef = useRef<string>(sessionStorage.getItem('cb_pending_identifier') || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial welcome message in English
  useEffect(() => {
    const welcomeTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages([
      {
        id: 'msg-welcome-1',
        sender: 'bot',
        text: 'Hello! Welcome to IndoWings AI Copilot.\n\nYou can track any delivery flight in real-time, retrieve your Order ID using your mobile number, or explore our DGCA-certified drone fleet.',
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
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        text: 'Chat history has been reset. How can I assist you today?',
        time
      }
    ]);
    setConvState({ step: 'idle' });
    pendingIdentifierRef.current = '';
    sessionStorage.removeItem('cb_pending_identifier');
  };

  // Helper to trigger OTP request for phone or email
  const requestOtpForIdentifier = async (rawIdentifier: string) => {
    const identifier = rawIdentifier.trim();
    if (!identifier) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/chatbot/request-id-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();

      if (data.success) {
        const iden = data.identifier || identifier;
        pendingIdentifierRef.current = iden;
        sessionStorage.setItem('cb_pending_identifier', iden);
        setConvState({ step: 'awaiting_otp', pendingIdentifier: iden });
        addMessage({
          sender: 'bot',
          text: `${data.message || `A 6-digit verification code has been dispatched to ${iden}.`}\n\nPlease enter the 6-digit OTP code below (or type "cancel"):`,
          cardType: 'otp_prompt'
        });
      } else {
        addMessage({
          sender: 'bot',
          text: data.message || `Unable to send verification code. Please enter a valid 10-digit mobile number or email address.`
        });
      }
    } catch (err: any) {
      addMessage({
        sender: 'bot',
        text: `Connection error: ${err.message}. Please try again.`
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to render bold markdown cleanly without showing raw asterisks
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && <br />}
          {parts.map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={partIdx} className="font-semibold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code key={partIdx} className="bg-orange-50 text-[#ef7f1a] px-1 py-0.5 rounded font-mono text-[11px]">
                  {part.slice(1, -1)}
                </code>
              );
            }
            return part;
          })}
        </React.Fragment>
      );
    });
  };

  // ── CORE INTELLIGENCE & API HANDLER ─────────────────────────────────────────
  const processUserQuery = async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean) return;

    // Direct Cancel command
    if (clean.toLowerCase() === 'cancel') {
      setConvState({ step: 'idle' });
      pendingIdentifierRef.current = '';
      sessionStorage.removeItem('cb_pending_identifier');
      addMessage({ sender: 'bot', text: 'Action cancelled. How else can I assist you today?' });
      return;
    }

    setLoading(true);

    try {
      // 1. STATE: Awaiting customer name for Order ID verification
      if (convState.step === 'awaiting_name' && convState.pendingOrderId) {
        const orderId = convState.pendingOrderId;
        const res = await fetch(`${API_BASE_URL}/api/delivery/chatbot/track-by-id`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, customer_name: clean })
        });
        const data = await res.json();

        if (data.success && data.verified && data.order) {
          setConvState({ step: 'idle' });
          addMessage({
            sender: 'bot',
            text: `Identity verified! Here is the live telemetry for Order #${orderId}:`,
            cardType: 'order_detail',
            cardData: data.order
          });
        } else {
          addMessage({
            sender: 'bot',
            text: data.message || `Customer name did not match the booking records. Please enter the name registered with the order (or type "cancel"):`
          });
        }
        setLoading(false);
        return;
      }

      // 2. CHECK FOR 6-DIGIT OTP (either explicitly in awaiting_otp or entered directly as 6 digits)
      const pureDigits = clean.replace(/[^0-9]/g, '');
      const is6DigitOtp = /^\d{6}$/.test(pureDigits);

      if (is6DigitOtp || convState.step === 'awaiting_otp') {
        const targetIden = convState.pendingIdentifier || pendingIdentifierRef.current || sessionStorage.getItem('cb_pending_identifier');

        if (!targetIden) {
          addMessage({
            sender: 'bot',
            text: 'You entered a verification code, but no pending session was found. Please enter your 10-digit mobile number or email address first:'
          });
          setConvState({ step: 'awaiting_identifier' });
          setLoading(false);
          return;
        }

        const otpCode = is6DigitOtp ? pureDigits : clean.replace(/[^0-9]/g, '');
        const res = await fetch(`${API_BASE_URL}/api/delivery/chatbot/verify-id-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: targetIden, otp: otpCode || clean })
        });
        const data = await res.json();

        if (data.success && data.verified) {
          setConvState({ step: 'idle' });
          pendingIdentifierRef.current = '';
          sessionStorage.removeItem('cb_pending_identifier');

          if (!data.orders || data.orders.length === 0) {
            addMessage({
              sender: 'bot',
              text: `OTP verified! However, no active delivery orders were found specifically for ${targetIden}. If you placed orders under another number or email, you can enter it anytime.`
            });
          } else {
            addMessage({
              sender: 'bot',
              text: `OTP verified successfully! Found ${data.orders.length} order(s) for your account. Click any order below to view live flight telemetry:`,
              cardType: 'order_list',
              cardData: data.orders
            });
          }
        } else {
          addMessage({
            sender: 'bot',
            text: data.message || `Invalid or expired verification code. Please enter the correct 6-digit OTP (or type "cancel"):`
          });
        }
        setLoading(false);
        return;
      }

      // 3. STATE: Awaiting phone number or email
      if (convState.step === 'awaiting_identifier') {
        await requestOtpForIdentifier(clean);
        return;
      }

      // 4. CHECK IF QUERY CONTAINS AN EMAIL OR 10-DIGIT MOBILE NUMBER
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const emailMatch = clean.match(emailRegex);
      const phoneRegex = /(?:\+?91[\s-]?)?([6-9]\d{9})/;
      const phoneMatch = clean.match(phoneRegex);

      if (emailMatch && !clean.toUpperCase().includes('INW-')) {
        const iden = emailMatch[0].toLowerCase();
        await requestOtpForIdentifier(iden);
        return;
      }

      if (phoneMatch && !clean.toUpperCase().includes('INW-')) {
        const iden = phoneMatch[1];
        await requestOtpForIdentifier(iden);
        return;
      }

      // 5. CHECK IF QUERY CONTAINS AN ORDER ID DIRECTLY (e.g. INW-2026-001 or INW-2024-1001)
      const orderIdRegex = /(INW-?\d{4}-?\d{1,6}|IW-?\d{3,6})/i;
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
            text: `Order #${foundId} located!\n\nFor security verification, please enter the Customer Name provided during booking:`
          });
        } else if (!data.success) {
          addMessage({
            sender: 'bot',
            text: data.message || `Order #${foundId} was not found in our dispatch system. Please verify the ID.`
          });
        }
        setLoading(false);
        return;
      }

      // 6. CHECK IF USER WANTS TO FIND / GET THEIR ORDER ID VIA PHONE OR EMAIL
      const findIdKeywords = ['find my order', 'find order', 'order id', 'forgot order', 'lost order', 'mobile number', 'phone', 'email'];
      const wantsOrderId = findIdKeywords.some((kw) => clean.toLowerCase().includes(kw));

      if (wantsOrderId) {
        setConvState({ step: 'awaiting_identifier' });
        addMessage({
          sender: 'bot',
          text: 'Retrieve Order ID:\n\nPlease enter your 10-digit mobile number or email address. We will send you a 6-digit OTP code to verify and display your orders.'
        });
        setLoading(false);
        return;
      }

      // 7. CHECK IF USER ASKS TO TRACK ORDER (GENERIC)
      const trackKeywords = ['track', 'status', 'where is', 'eta'];
      if (trackKeywords.some((kw) => clean.toLowerCase().includes(kw)) && clean.length < 35) {
        addMessage({
          sender: 'bot',
          text: 'Live Flight Tracking:\n\nPlease enter your Order ID (e.g. INW-2026-001).\n\nIf you do not have your Order ID, click "Find Order ID" or type your 10-digit mobile number.'
        });
        setLoading(false);
        return;
      }

      // 8. KNOWLEDGE BASE: DRONES & FLEET
      const droneKeywords = ['drone', 'fleet', 'cyberone', 's-500', 's500', 'aircraft', 'uav', 'vtol', 'payload', 'sortie'];
      if (droneKeywords.some((kw) => clean.toLowerCase().includes(kw))) {
        addMessage({
          sender: 'bot',
          text: "IndoWings Drone Fleet Overview:\n\nIndoWings operates India's premier DGCA type-certified delivery fleet. Key specifications:",
          cardType: 'drones_info'
        });
        setLoading(false);
        return;
      }

      // 9. KNOWLEDGE BASE: COMPANY & FOUNDER & DGCA
      const companyKeywords = ['indowings', 'company', 'founder', 'ceo', 'paras jain', 'headquarter', 'office', 'dgca', 'address', 'cin'];
      if (companyKeywords.some((kw) => clean.toLowerCase().includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'IndoWings Corporate Profile:\n\nIndoWings Private Limited is a premier aerospace and autonomous drone logistics company in India:',
          cardType: 'company_info'
        });
        setLoading(false);
        return;
      }

      // 10. KNOWLEDGE BASE: MEDICAL COLD-CHAIN & EMERGENCY
      const medicalKeywords = ['medical', 'hospital', 'blood', 'medicine', 'cold chain', 'emergency'];
      if (medicalKeywords.some((kw) => clean.toLowerCase().includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'Medical Drone Transit Corridors:\n\n• Active Cold-Chain: 2°C to 8°C temperature control for blood units, vaccines, and diagnostic samples.\n• Sub-15 Minute Transit: Direct emergency hospital-to-hospital corridors.\n• Precision Payload Release: Motorized tether gently lowers payloads from 15 meters without rotor blast.'
        });
        setLoading(false);
        return;
      }

      // 11. KNOWLEDGE BASE: SUPPORT & EXPERT
      const expertKeywords = ['expert', 'support', 'contact', 'call', 'phone', 'help', 'customer care'];
      if (expertKeywords.some((kw) => clean.toLowerCase().includes(kw))) {
        addMessage({
          sender: 'bot',
          text: 'IndoWings Dispatch & Support:\n\n• Air Dispatch Desk: 24/7 Operations Helpdesk\n• Email: support@indowings.com\n• Helpline: +91 99999 99999\n• Operations Consultation: Speak with the IndoWings operations team on the Support page.'
        });
        setLoading(false);
        return;
      }

      // 12. DEFAULT INTELLIGENT FALLBACK
      addMessage({
        sender: 'bot',
        text: 'I am here to assist you! You can ask about:\n\n1. Track Sortie: Enter your Sortie ID (e.g. INW-2026-001).\n2. Find Sortie ID: Enter your 10-digit mobile number to verify via OTP.\n3. Drone Fleet: Inquire about speed, payload, range, or precision release.\n4. About IndoWings: DGCA approvals, headquarters, or corporate details.'
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

  const handleActionCardClick = (query: string) => {
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
        {/* Minimal Interactive Teaser Pill */}
        {!isOpen && showTeaser && (
          <div className="hidden sm:flex items-center gap-2 bg-white text-slate-800 text-xs font-medium px-3.5 py-2 rounded-full border border-slate-200/90 shadow-md animate-in fade-in slide-in-from-right-2 duration-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span onClick={() => setIsOpen(true)} className="cursor-pointer hover:text-[#ef7f1a] transition-colors">
              Track flight or chat with AI
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

        {/* Minimal Clean Purple Trigger Button */}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (isMinimized) setIsMinimized(false);
          }}
          className={`relative group w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shadow-[0_6px_20px_rgba(90,0,184,0.35)] hover:shadow-[0_8px_25px_rgba(90,0,184,0.45)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ${
            isOpen ? 'bg-slate-900 rotate-90' : 'bg-[#ef7f1a] hover:bg-[#4a0099]'
          }`}
          title={isOpen ? 'Close Copilot' : 'Open IndoWings AI Copilot'}
        >
          {isOpen ? (
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white transition-transform -rotate-90" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 border-2 border-[#ef7f1a]" />
            </div>
          )}
        </button>
      </div>

      {/* ── CHAT WINDOW (ELEGANT, COMFORTABLE HEIGHT, ENGLISH & MINIMAL) ────────────────── */}
      {isOpen && (
        <div
          className={`fixed bottom-20 right-4 sm:bottom-20 sm:right-6 z-50 w-[92vw] sm:w-[380px] bg-white border border-slate-200/90 rounded-2xl shadow-[0_12px_40px_-5px_rgba(0,0,0,0.16)] overflow-hidden flex flex-col transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
            isMinimized ? 'h-[56px]' : 'h-[530px] sm:h-[545px] max-h-[76vh]'
          }`}
        >
          {/* ── Window Header ── */}
          <div className="bg-white px-3.5 py-2.5 flex items-center justify-between shrink-0 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#ef7f1a] border border-orange-100 flex items-center justify-center">
                <Plane className="w-3.5 h-3.5 text-[#ef7f1a]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight">IndoWings AI Copilot</h3>
                  <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200">Active</span>
                </div>
                <p className="text-[10px] text-slate-400 font-normal leading-none">DGCA Green Corridor Network</p>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-0.5">
              <button onClick={handleResetChat} title="Reset Chat" className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                <RefreshCw className="w-3 h-3" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </button>
              <button onClick={() => setIsOpen(false)} title="Close" className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Window Body ── */}
          {!isMinimized && (
            <>
              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#fafafc] text-xs">
                {/* 2x2 Quick Action Grid */}
                {messages.length <= 1 && (
                  <div className="mb-1 p-2 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Instant Services:</span>
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {QUICK_ACTIONS.map((act, i) => {
                        const Icon = act.icon;
                        return (
                          <button
                            key={i}
                            onClick={() => handleActionCardClick(act.query)}
                            disabled={loading}
                            className="p-2 rounded-lg bg-slate-50 hover:bg-orange-50/70 border border-slate-100 hover:border-orange-200 text-left transition-all group cursor-pointer"
                          >
                            <div className="flex items-center gap-1 text-[#ef7f1a] mb-0.5">
                              <Icon className="w-3 h-3" />
                              <span className="font-semibold text-[11px] truncate">{act.label}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 block leading-tight truncate">{act.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Render Messages */}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender === 'bot' && (
                      <div className="w-5 h-5 rounded-md bg-orange-50 text-[#ef7f1a] border border-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3 h-3" />
                      </div>
                    )}

                    <div className="max-w-[86%] space-y-1.5">
                      {/* Message Bubble */}
                      <div
                        className={`p-2.5 rounded-xl leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-[#ef7f1a] text-white rounded-tr-xs shadow-xs font-medium text-xs'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs shadow-xs text-xs'
                        }`}
                      >
                        {renderFormattedText(msg.text)}
                      </div>

                      {/* ── CARD: LIVE FLIGHT TELEMETRY & HUD ── */}
                      {msg.cardType === 'order_detail' && msg.cardData && (
                        <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs space-y-2 animate-in fade-in">
                          {/* Order Header */}
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Order ID</span>
                              <span className="text-xs font-mono font-bold text-slate-800">#{msg.cardData.id}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
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
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span className="truncate max-w-[100px] font-medium">{msg.cardData.pickup_address?.split(',')[0]}</span>
                              <Plane className="w-3 h-3 text-[#ef7f1a]" />
                              <span className="truncate max-w-[100px] font-medium">{msg.cardData.drop_address?.split(',')[0]}</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                              <div
                                className="bg-[#ef7f1a] h-full rounded-full transition-all"
                                style={{ width: msg.cardData.status === 'delivered' ? '100%' : msg.cardData.status === 'approaching' ? '85%' : '50%' }}
                              />
                            </div>
                          </div>

                          {/* 4-Metric Clean Gauges */}
                          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="text-slate-400 block">Remaining ETA:</span>
                              <span className="font-bold text-slate-800">{msg.cardData.estimated_remaining_time}</span>
                            </div>
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="text-slate-400 block">Distance:</span>
                              <span className="font-bold text-slate-800 font-mono">{msg.cardData.distance_remaining}</span>
                            </div>
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="text-slate-400 block">Altitude:</span>
                              <span className="font-bold text-slate-700 font-mono">{msg.cardData.altitude}</span>
                            </div>
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="text-slate-400 block">Speed:</span>
                              <span className="font-bold text-slate-700 font-mono">{msg.cardData.speed}</span>
                            </div>
                          </div>

                          {/* Drone Specs Strip */}
                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-orange-50/60 border border-orange-100 text-[10px]">
                            <div className="flex items-center gap-1 truncate">
                              <Plane className="w-3 h-3 text-[#ef7f1a]" />
                              <span className="font-semibold text-slate-800 truncate">{msg.cardData.drone?.model}</span>
                            </div>
                            <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{msg.cardData.drone?.battery}% Battery</span>
                          </div>

                          {/* Open Full Live Radar Button */}
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              nav('track', `/track?orderId=${msg.cardData.id}`);
                            }}
                            className="w-full py-1.5 bg-[#ef7f1a] hover:bg-[#4a0099] text-white font-semibold text-[11px] rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Radar className="w-3 h-3" />
                            <span>Open Radar Tracking Map</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* ── CARD: ORDER LIST FROM OTP ── */}
                      {msg.cardType === 'order_list' && Array.isArray(msg.cardData) && (
                        <div className="space-y-1.5">
                          {msg.cardData.map((ord: any) => (
                            <div key={ord.id} className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-slate-800 text-[11px]">#{ord.id}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-50 text-[#ef7f1a] border border-orange-200 font-semibold uppercase">{ord.status}</span>
                              </div>
                              <p className="text-[10px] text-slate-600 truncate">
                                {ord.package_type} • {ord.drone_model}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">To: {ord.drop_address}</p>
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <button
                                  onClick={async () => {
                                    setLoading(true);
                                    try {
                                      const res = await fetch(`${API_BASE_URL}/api/delivery/chatbot/track-by-id`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ order_id: ord.id, skip_name_check: true })
                                      });
                                      const data = await res.json();
                                      if (data.success && data.order) {
                                        addMessage({
                                          sender: 'bot',
                                          text: `Live flight telemetry for Order #${ord.id}:`,
                                          cardType: 'order_detail',
                                          cardData: data.order
                                        });
                                      } else {
                                        addMessage({
                                          sender: 'bot',
                                          text: `Order #${ord.id} details could not be retrieved.`
                                        });
                                      }
                                    } catch (err: any) {
                                      addMessage({ sender: 'bot', text: `Connection error: ${err.message}` });
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                  className="flex-1 py-1 bg-[#ef7f1a] hover:bg-[#4a0099] text-white font-semibold text-[10px] rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                                >
                                  <Plane className="w-3 h-3" />
                                  <span>Live Telemetry</span>
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setIsOpen(false);
                                    nav('track', `/track?orderId=${ord.id}`);
                                  }}
                                  className="py-1 px-2.5 bg-orange-50 hover:bg-orange-100 text-[#ef7f1a] font-semibold text-[10px] rounded-md transition-colors cursor-pointer border border-orange-200 flex items-center gap-1"
                                  title="Open Radar Tracking Map"
                                >
                                  <Radar className="w-3 h-3" />
                                  <span>Radar</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ── CARD: DRONES OVERVIEW ── */}
                      {msg.cardType === 'drones_info' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-2.5 space-y-1.5 shadow-xs">
                          <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="font-bold text-slate-800 text-[11px]">Cyberone Pro (Medical Transit)</p>
                            <p className="text-[10px] text-slate-500">5 kg payload • 45 km range • 65 km/h • 2°C–8°C cold box</p>
                          </div>
                          <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="font-bold text-slate-800 text-[11px]">Cyberone Max (Heavy Cargo)</p>
                            <p className="text-[10px] text-slate-500">15 kg payload • 60 km range • 70 km/h • Heavy cargo hexacopter</p>
                          </div>
                          <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="font-bold text-slate-800 text-[11px]">Cyberone Lite (Metro Express)</p>
                            <p className="text-[10px] text-slate-500">3 kg payload • 35 km range • 85 km/h • Rapid corridor transit</p>
                          </div>
                          <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="font-bold text-slate-800 text-[11px]">S-500 Logistics VTOL</p>
                            <p className="text-[10px] text-slate-500">10 kg payload • 120 km range • 110 km/h • Fixed-wing inter-city</p>
                          </div>
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              nav('track', '/track');
                            }}
                            className="w-full py-1.5 bg-[#ef7f1a] hover:bg-[#4a0099] text-white font-semibold text-[11px] rounded-lg cursor-pointer transition-colors"
                          >
                            View Live Corridor Radar
                          </button>
                        </div>
                      )}

                      {/* ── CARD: COMPANY INFO ── */}
                      {msg.cardType === 'company_info' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-2.5 space-y-1 shadow-xs text-[11px] text-slate-600">
                          <p>
                            <strong className="text-slate-800">Legal Name:</strong> Indo Wings Private Limited
                          </p>
                          <p>
                            <strong className="text-slate-800">Founder & CEO:</strong> Paras Jain
                          </p>
                          <p>
                            <strong className="text-slate-800">Headquarters:</strong> Plot No. 11, Sector 62, Noida, UP - 201309
                          </p>
                          <p>
                            <strong className="text-slate-800">CIN:</strong> U35999UP2020PTC126589
                          </p>
                          <p>
                            <strong className="text-slate-800">Certifications:</strong> DGCA Type-Certified, DigitalSky Green Corridors
                          </p>
                          <p>
                            <strong className="text-slate-800">Official Portal:</strong> indowings.com
                          </p>
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              nav('company', '/company');
                            }}
                            className="w-full py-1 bg-[#ef7f1a] hover:bg-[#4a0099] text-white font-semibold text-[11px] rounded-md cursor-pointer mt-1 transition-colors"
                          >
                            View Company Profile
                          </button>
                        </div>
                      )}

                      <span className="text-[9px] text-slate-400 block px-1">{msg.time}</span>
                    </div>

                    {msg.sender === 'user' && (
                      <div className="w-5 h-5 rounded-md bg-[#ef7f1a] text-white flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] italic p-1.5 bg-white rounded-lg border border-slate-200 w-fit shadow-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ef7f1a] animate-ping" />
                    <span>Copilot processing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ── Quick Question Pills Strip ── */}
              <div className="px-2.5 py-1.5 bg-white border-t border-slate-100 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
                {QUICK_ACTIONS.map((act, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleActionCardClick(act.query)}
                    disabled={loading}
                    className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-[#ef7f1a] text-[10px] font-medium whitespace-nowrap transition-colors border border-slate-200/60 cursor-pointer disabled:opacity-50"
                  >
                    {act.label}
                  </button>
                ))}
              </div>

              {/* ── Input Bar ── */}
              <form onSubmit={handleSend} className="p-2 bg-white border-t border-slate-100 flex items-center gap-1.5 shrink-0">
                <div className="flex-1 relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:bg-white focus-within:border-orange-400 focus-within:ring-1 focus-within:ring-orange-200 transition-all">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      convState.step === 'awaiting_name'
                        ? 'Enter customer name...'
                        : convState.step === 'awaiting_identifier'
                          ? 'Enter mobile number or email...'
                          : convState.step === 'awaiting_otp'
                            ? 'Enter 6-digit OTP code...'
                            : 'Enter Order ID, phone or question...'
                    }
                    className="w-full bg-transparent text-slate-800 placeholder-slate-400 text-xs focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-7 h-7 rounded-lg bg-[#ef7f1a] hover:bg-[#4a0099] text-white flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer shrink-0 shadow-xs"
                >
                  <Send className="w-3 h-3" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
