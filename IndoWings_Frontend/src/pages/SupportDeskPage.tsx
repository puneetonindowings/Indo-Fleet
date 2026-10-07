import React, { useState, useEffect, useRef } from 'react';
import {
  Headphones,
  MessageSquare,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
  Send,
  RefreshCw,
  User,
  MapPin,
  Package,
  ShieldCheck,
  FileText,
  Volume2,
  VolumeX,
  LogOut,
  ExternalLink,
  ChevronRight,
  X,
  Check,
  Calendar,
  Hash,
  Download,
  Zap,
  CheckCheck,
  PhoneCall,
  AlertCircle,
  PhoneIncoming,
  MessageCircle
} from 'lucide-react';
import { DeliveryUser } from '../types';
import { API_BASE_URL } from '../config/api';

interface SupportDeskPageProps {
  currentUser: DeliveryUser | null;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  embedded?: boolean;
}

export const SupportDeskPage: React.FC<SupportDeskPageProps> = ({ currentUser, onNavigate, onLogout, embedded = false }) => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'urgent'>('all');
  const [activeTab, setActiveTab] = useState<'tickets' | 'calls' | 'emails'>('tickets');
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [lastTicketCount, setLastTicketCount] = useState<number>(0);
  const [newTicketAlert, setNewTicketAlert] = useState<string | null>(null);
  const [supportError, setSupportError] = useState('');
  const supportToken = localStorage.getItem('iw_delivery_token') || '';
  const supportHeaders = { Authorization: `Bearer ${supportToken}` };

  // Modals State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [internalNoteDraft, setInternalNoteDraft] = useState('');
  const [resolvingTicket, setResolvingTicket] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Call Logging Modal
  const [callingTicket, setCallingTicket] = useState<any | null>(null);
  const [callDuration, setCallDuration] = useState('120');
  const [callOutcome, setCallOutcome] = useState('Customer Answered - Issue Resolved');
  const [callRemarks, setCallRemarks] = useState('');
  const [callType, setCallType] = useState<'incoming' | 'outgoing'>('outgoing');
  const [isLoggingCall, setIsLoggingCall] = useState(false);
  const [addCallOpen, setAddCallOpen] = useState(false);
  const [newCall, setNewCall] = useState({
    name: '',
    phone: '',
    email: '',
    call_type: 'incoming',
    call_date: new Date().toISOString().slice(0, 10),
    call_time: new Date().toTimeString().slice(0, 5),
    duration_seconds: '0',
    outcome: 'Call logged',
    remarks: '',
    category: 'General Query',
    priority: 'medium',
    order_id: '',
    drone_serial: ''
  });

  // Direct Email Modal
  const [emailingTicket, setEmailingTicket] = useState<any | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState('');

  // Play sound using Web Audio API Synthesizer
  const playAlertSound = () => {
    if (!audioAlerts) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {}
  };

  const fetchTickets = async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/tickets`, { headers: supportHeaders });
      if (res.ok) {
        const data = await res.json();
        const incoming = data.requests || [];
        setAgents(data.agents || []);

        // Check for new incoming ticket
        if (lastTicketCount > 0 && incoming.length > lastTicketCount) {
          const newest = incoming[0];
          setNewTicketAlert(`New Query: ${newest.name} (${newest.category || 'General'})`);
          playAlertSound();
          setTimeout(() => setNewTicketAlert(null), 6000);
        }

        setTickets(incoming);
        setLastTicketCount(incoming.length);
      } else {
        const result = await res.json();
        setSupportError(result.error || 'Could not load Support Desk tickets.');
      }
    } catch (err) {
      console.error('[support] Error fetching tickets:', err);
    } finally {
      setLoading(false);
      if (!isBackground) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    // Auto-polling every 5 seconds for real-time ticket alerts
    const interval = setInterval(() => {
      fetchTickets(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [lastTicketCount, audioAlerts]);

  const updateTicket = async (ticket: any, updates: Record<string, unknown>) => {
    try {
      setSupportError('');
      const response = await fetch(`${API_BASE_URL}/api/delivery/support/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...supportHeaders },
        body: JSON.stringify(updates)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update ticket.');
      await fetchTickets();
      return true;
    } catch (err) {
      setSupportError(err instanceof Error ? err.message : 'Could not update ticket.');
      return false;
    }
  };

  const handleCreateCallLog = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoggingCall(true);
    setSupportError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery/support/call-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...supportHeaders },
        body: JSON.stringify({ ...newCall, duration_seconds: Number(newCall.duration_seconds) || 0 })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save call log.');
      setAddCallOpen(false);
      setNewCall({
        name: '',
        phone: '',
        email: '',
        call_type: 'incoming',
        call_date: new Date().toISOString().slice(0, 10),
        call_time: new Date().toTimeString().slice(0, 5),
        duration_seconds: '0',
        outcome: 'Call logged',
        remarks: '',
        category: 'General Query',
        priority: 'medium',
        order_id: '',
        drone_serial: ''
      });
      await fetchTickets();
    } catch (err) {
      setSupportError(err instanceof Error ? err.message : 'Could not save call log.');
    } finally {
      setIsLoggingCall(false);
    }
  };

  // Handle Resolve & Send Email
  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTicket) return;
    setIsResolving(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/tickets/${resolvingTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...supportHeaders },
        body: JSON.stringify({
          status: 'resolved',
          resolution_notes: resolutionNotes.trim() || 'Your issue has been diagnosed and cleared by the flight support desk.',
          agent_name: currentUser?.name || 'IndoFleet Support Desk'
        })
      });

      if (res.ok) {
        setResolvingTicket(null);
        setResolutionNotes('');
        await fetchTickets();
      }
    } catch (err) {
      console.error('[support] Failed to resolve ticket:', err);
    } finally {
      setIsResolving(false);
    }
  };

  // Handle Log Call
  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callingTicket) return;
    setIsLoggingCall(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/tickets/${callingTicket.id}/call-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...supportHeaders },
        body: JSON.stringify({
          duration_seconds: Number(callDuration) || 60,
          outcome: callOutcome,
          remarks: callRemarks.trim(),
          call_type: callType,
          agent_name: currentUser?.name || 'Support Agent'
        })
      });

      if (res.ok) {
        setCallingTicket(null);
        setCallRemarks('');
        await fetchTickets();
      }
    } catch (err) {
      console.error('[support] Failed to log call:', err);
    } finally {
      setIsLoggingCall(false);
    }
  };

  // Handle Send Direct Email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailingTicket || !emailBody.trim()) return;
    setIsSendingEmail(true);
    setEmailFeedback('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/tickets/${emailingTicket.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...supportHeaders },
        body: JSON.stringify({
          subject: emailSubject.trim() || `Re: Support Ticket [${emailingTicket.id}] - IndoFleet Operations`,
          message: emailBody.trim(),
          agent_name: currentUser?.name || 'IndoFleet Support Desk'
        })
      });

      if (res.ok) {
        setEmailingTicket(null);
        setEmailSubject('');
        setEmailBody('');
      } else {
        const result = await res.json().catch(() => ({}));
        setEmailFeedback(result.error || 'Resend could not deliver this reply. It has been recorded as failed.');
      }
      await fetchTickets();
    } catch (err) {
      setEmailFeedback(err instanceof Error ? err.message : 'Could not send the support reply.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const downloadEmailAttachment = async (ticketId: string, emailId: string, attachment: any) => {
    setSupportError('');
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/delivery/support/tickets/${encodeURIComponent(ticketId)}/emails/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachment.id)}`,
        { headers: supportHeaders }
      );
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Could not download this attachment.');
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.filename || 'support-attachment';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      setSupportError(err instanceof Error ? err.message : 'Could not download this attachment.');
    }
  };

  // Metrics
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'open' || t.status === 'pending').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress' || t.status === 'in-progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const urgentCount = tickets.filter((t) => t.priority === 'urgent' && t.status !== 'resolved').length;
  const allCalls = tickets.flatMap((t) => (t.call_logs || []).map((c: any) => ({ ...c, ticket_id: t.id, customer_name: t.name, phone: t.phone })));
  const allEmails = tickets.flatMap((t) => (t.email_thread || []).map((m: any) => ({ ...m, ticket_id: t.id, customer_name: t.name, email: t.email })));

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    // Status filter
    if (statusFilter === 'open' && t.status !== 'open' && t.status !== 'pending') return false;
    if (statusFilter === 'in_progress' && t.status !== 'in_progress' && t.status !== 'in-progress') return false;
    if (statusFilter === 'resolved' && t.status !== 'resolved' && t.status !== 'closed') return false;
    if (statusFilter === 'urgent' && t.priority !== 'urgent') return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.id?.toLowerCase().includes(q) ||
      t.name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.phone?.toLowerCase().includes(q) ||
      t.order_id?.toLowerCase().includes(q) ||
      t.delivery_address?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      t.message?.toLowerCase().includes(q)
    );
  });

  return (
    <div className={embedded ? 'space-y-6 bg-[#f8fafc] pb-6 font-sans text-slate-900' : 'min-h-screen bg-[#f8fafc] text-slate-900 pt-24 sm:pt-28 pb-16 font-sans'}>
      {/* ── TOP BANNER / IDENTITY ────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mb-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#3b0080] flex items-center justify-center font-black shadow-xs">
              <Headphones className="w-5 h-5 text-[#3b0080]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900">IndoFleet Support Desk</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => setAudioAlerts(!audioAlerts)}
              title={audioAlerts ? 'Turn off the sound played when a new ticket arrives' : 'Turn on the sound played when a new ticket arrives'}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 ${
                audioAlerts ? 'bg-purple-50 border-purple-200 text-[#3b0080]' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              {audioAlerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden md:inline">New ticket sound: {audioAlerts ? 'On' : 'Off'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => fetchTickets()}
              disabled={refreshing}
              className="p-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#3b0080]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Home Link */}
            {!embedded && <button
              onClick={() => {
                onNavigate('home');
                window.history.pushState({}, '', '/');
              }}
              className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
            >
              Home Gateway
            </button>}

            {/* Logout */}
            {!embedded && <button onClick={onLogout} className="p-2 px-3 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 text-xs font-bold transition-colors flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>}
          </div>
        </div>
      </div>

      {/* ── REAL-TIME NEW QUERY BANNER ───────────────────────────────── */}
      {newTicketAlert && (
        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-2.5 px-4 text-center text-xs font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top duration-200 shadow-md">
          <Zap className="w-4 h-4 text-amber-300 animate-bounce" />
          <span>{newTicketAlert}</span>
          <button onClick={() => setNewTicketAlert(null)} className="ml-3 hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {supportError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {supportError}
          </div>
        )}
        {/* ── KPI METRICS CARDS ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Queries</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
            <span className="text-[10px] text-slate-400">All registered inquiries</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Pending / Open
            </p>
            <p className="text-2xl font-black text-amber-600 mt-1">{openCount}</p>
            <span className="text-[10px] text-slate-400">Needs immediate reply</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600">In Progress</p>
            <p className="text-2xl font-black text-purple-600 mt-1">{inProgressCount}</p>
            <span className="text-[10px] text-slate-400">Under investigation</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Resolved
            </p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{resolvedCount}</p>
            <span className="text-[10px] text-slate-400">Email dispatched to user</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Urgent Priority
            </p>
            <p className="text-2xl font-black text-rose-600 mt-1">{urgentCount}</p>
            <span className="text-[10px] text-slate-400">Active flight / safety</span>
          </div>
        </div>

        {/* ── WORKSPACE TABS & CONTROLS ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'tickets' ? 'bg-white text-[#3b0080] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tickets &amp; Inquiries</span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-[#3b0080] text-[10px]">{totalCount}</span>
            </button>

            <button
              onClick={() => setActiveTab('calls')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'calls' ? 'bg-white text-[#3b0080] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call Center &amp; Logs</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">{allCalls.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('emails')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'emails' ? 'bg-white text-[#3b0080] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Direct Outbox</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">{allEmails.length}</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, order, phone, address..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
 TAB 1: TICKETS & INQUIRIES VIEW
 ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: `All (${totalCount})` },
                { id: 'open', label: `Open (${openCount})` },
                { id: 'in_progress', label: `In Progress (${inProgressCount})` },
                { id: 'resolved', label: `Resolved (${resolvedCount})` },
                { id: 'urgent', label: `Urgent (${urgentCount})` }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === f.id ? 'bg-[#3b0080] text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin text-[#3b0080] mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-bold">Synchronizing Support Desk records...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No Inquiries Found</h3>
                <p className="text-xs text-slate-400">{searchQuery ? 'No queries matched your search filter.' : 'All incoming customer tickets are cleared.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredTickets.map((t) => {
                  const isResolved = t.status === 'resolved' || t.status === 'closed';
                  const isUrgent = t.priority === 'urgent';
                  const isHigh = t.priority === 'high';

                  return (
                    <div
                      key={t.id}
                      className={`bg-white border rounded-2xl p-5 shadow-xs transition-all hover:shadow-md ${
                        isUrgent ? 'border-rose-300 ring-1 ring-rose-100' : isResolved ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        {/* Left: Customer & Query Details */}
                        <div className="space-y-3 flex-1 min-w-0">
                          {/* Ticket Header & Badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-[#3b0080] bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">{t.id}</span>

                            {/* Priority Badge */}
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isUrgent
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : isHigh
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-sky-100 text-sky-800 border border-sky-200'
                              }`}
                            >
                              {t.priority || 'Normal'} Priority
                            </span>

                            {/* Status Badge */}
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                isResolved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : t.status === 'in_progress' || t.status === 'in-progress'
                                    ? 'bg-purple-100 text-[#3b0080]'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              ● {t.status || 'Open'}
                            </span>

                            <span className="text-[11px] text-slate-400 ml-auto">{new Date(t.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">
                              {t.source === 'email' ? 'Email' : t.source === 'call' ? 'Call' : 'Web'}
                            </span>
                            <select
                              aria-label={`Status for ${t.id}`}
                              value={t.status || 'pending'}
                              onChange={(event) => {
                                if (event.target.value === 'resolved' || event.target.value === 'closed') {
                                  setResolvingTicket(t);
                                  setResolutionNotes(t.resolution_notes || '');
                                } else {
                                  void updateTicket(t, { status: event.target.value });
                                }
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700"
                            >
                              {[
                                ['pending', 'Pending'],
                                ['in_progress', 'In progress'],
                                ['waiting_for_customer', 'Waiting for customer'],
                                ['waiting_for_internal_team', 'Waiting for team'],
                                ['unresolved', 'Unresolved'],
                                ['reopened', 'Reopened']
                              ].map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                              {['resolved', 'closed'].includes(t.status) && <option value={t.status}>{t.status === 'closed' ? 'Closed' : 'Resolved'}</option>}
                            </select>
                            <select
                              aria-label={`Priority for ${t.id}`}
                              value={t.priority === 'normal' ? 'medium' : t.priority || 'medium'}
                              onChange={(event) => void updateTicket(t, { priority: event.target.value })}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700"
                            >
                              {['low', 'medium', 'high', 'urgent'].map((priority) => (
                                <option key={priority} value={priority}>
                                  {priority[0].toUpperCase() + priority.slice(1)}
                                </option>
                              ))}
                            </select>
                            {currentUser?.role === 'admin' && (
                              <select
                                aria-label={`Assign ${t.id}`}
                                value={t.assigned_to || ''}
                                onChange={(event) => void updateTicket(t, { assigned_to: event.target.value || null })}
                                className="max-w-52 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700"
                              >
                                <option value="">Unassigned</option>
                                {agents.map((agent) => (
                                  <option key={agent.id} value={agent.id}>
                                    {agent.name}
                                  </option>
                                ))}
                              </select>
                            )}
                            {t.assigned_agent_name && <span className="text-[10px] text-slate-500">Assigned to {t.assigned_agent_name}</span>}
                          </div>

                          {/* Customer Profile & Associated Order Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl text-xs border border-slate-100">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Customer Name</span>
                              <strong className="text-slate-800 font-bold">{t.name || 'Anonymous Client'}</strong>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Phone &amp; Direct Dial</span>
                              <a href={`tel:${t.phone}`} className="font-mono text-[#3b0080] font-bold hover:underline">
                                {t.phone || 'N/A'}
                              </a>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Customer Email</span>
                              <a href={`mailto:${t.email}`} className="text-slate-700 hover:text-[#3b0080] truncate block">
                                {t.email || 'N/A'}
                              </a>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Linked Order ID</span>
                              <span className="font-mono font-bold text-purple-900">{t.order_id ? t.order_id : <span className="text-slate-400 font-normal">No order linked</span>}</span>
                            </div>
                          </div>

                          {/* Address / Drone Details if provided */}
                          {(t.delivery_address || t.drone_serial) && (
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 px-1">
                              {t.delivery_address && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  <span>
                                    Site Drop: <strong className="text-slate-800">{t.delivery_address}</strong>
                                  </span>
                                </div>
                              )}
                              {t.drone_serial && (
                                <div className="flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                  <span>
                                    Drone Serial: <strong className="font-mono text-slate-800">{t.drone_serial}</strong>
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Category & Message */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-[#3b0080] bg-purple-50 px-2 py-0.5 rounded">Topic: {t.category}</span>
                            <p className="text-xs text-slate-700 leading-relaxed font-normal bg-white p-3 rounded-xl border border-slate-100">{t.message || 'No description provided.'}</p>
                          </div>

                          {/* Past Resolution Note if resolved */}
                          {t.resolution_notes && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
                              <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700 flex items-center gap-1">
                                <CheckCheck className="w-3.5 h-3.5" />
                                Official Resolution ({t.resolved_by || 'Support'})
                              </span>
                              <p className="text-emerald-800 leading-relaxed">{t.resolution_notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Right: Quick Operational Actions */}
                        <div className="flex lg:flex-col items-center lg:items-end gap-2 shrink-0 pt-2 lg:pt-0">
                          {/* Resolve Button */}
                          {!isResolved ? (
                            <button
                              onClick={() => {
                                setResolvingTicket(t);
                                setResolutionNotes('');
                              }}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Resolve &amp; Notify User</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setResolvingTicket(t);
                                setResolutionNotes(t.resolution_notes || '');
                              }}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Edit Resolution</span>
                            </button>
                          )}

                          {/* Call Button */}
                          <button
                            onClick={() => {
                              setCallingTicket(t);
                              setCallRemarks('');
                            }}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#3b0080] bg-purple-50 hover:bg-purple-100 transition-colors flex items-center gap-1.5"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Log / Start Call</span>
                          </button>

                          {/* Email Reply Button */}
                          <button
                            onClick={() => {
                              setEmailingTicket(t);
                              setEmailFeedback('');
                              setEmailSubject(`Re: Support Ticket [${t.id}] - IndoFleet Operations`);
                              setEmailBody(
                                `Hello ${t.name || 'Valued Customer'},\n\nRegarding your query about ${t.category || 'our drone flight operations'}...\n\nBest regards,\nIndoFleet Support Desk`
                              );
                            }}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span>Send Email</span>
                          </button>

                          {/* View Full Card Modal */}
                          <button
                            onClick={() => {
                              setSelectedTicket(t);
                              setInternalNoteDraft('');
                            }}
                            className="px-2.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Inspect complete history"
                          >
                            Details →
                          </button>
                        </div>
                      </div>

                      {/* Footer: Call Logs & Email Thread Summary */}
                      {((t.call_logs && t.call_logs.length > 0) || (t.email_thread && t.email_thread.length > 0)) && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          {t.call_logs && t.call_logs.length > 0 && (
                            <span className="flex items-center gap-1 font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{t.call_logs.length} Phone Calls Logged</span>
                          )}
                          {t.email_thread && t.email_thread.length > 0 && (
                            <span className="flex items-center gap-1 font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                              {t.email_thread.filter((email: any) => email.direction === 'inbound').length} received · {t.email_thread.filter((email: any) => email.direction !== 'inbound').length} sent
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
 TAB 2: CALL CENTER & LOGS VIEW
 ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'calls' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Phone Calls &amp; Callback Audit Log</h2>
                <p className="text-xs text-slate-500">Total {allCalls.length} voice consultations completed with customers across India.</p>
              </div>
              <button type="button" onClick={() => setAddCallOpen(true)} className="rounded-xl bg-[#3b0080] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#2c0060]">
                + Add Call Log
              </button>
            </div>

            {allCalls.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No phone calls logged yet. Click &quot;Log / Start Call&quot; on any ticket to record call history.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Ticket</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Outcome</th>
                      <th className="py-3 px-4">Agent Remarks</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {allCalls.map((c: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#3b0080]">{c.ticket_id}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{c.customer_name}</td>
                        <td className="py-3 px-4 font-mono">
                          <a href={`tel:${c.phone}`} className="text-purple-700 hover:underline">
                            {c.phone}
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          {Math.round(c.duration_seconds / 60)} min ({c.duration_seconds}s)
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">{c.outcome}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{c.remarks || '-'}</td>
                        <td className="py-3 px-4 text-slate-400">{new Date(c.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
 TAB 3: DIRECT EMAIL COMMUNICATIONS VIEW
 ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'emails' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Support Email Inbox & Outbox</h2>
                <p className="text-xs text-slate-500">{allEmails.filter((email: any) => email.direction === 'inbound').length} received · {allEmails.filter((email: any) => email.direction !== 'inbound').length} sent or pending.</p>
              </div>
            </div>

            {allEmails.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No support email messages yet.</div>
            ) : (
              <div className="space-y-3">
                {allEmails.map((m: any, idx: number) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#3b0080]">{m.ticket_id}</span>
                        <span className="text-slate-400">{m.direction === 'inbound' ? '←' : '→'}</span>
                        <strong className="text-slate-800">{m.customer_name}</strong>
                        <span className="text-slate-400">({m.direction === 'inbound' ? m.from : m.to})</span>
                      </div>
                      <span className="text-slate-400 text-[11px]">{new Date(m.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                    </div>
                    <p className={`text-[10px] font-bold uppercase ${m.direction === 'inbound' ? 'text-emerald-700' : 'text-sky-700'}`}>
                      {m.direction === 'inbound' ? 'Received from customer' : `Outbound · ${m.delivery_status || 'sent'}`}
                    </p>
                    <p className="text-xs font-bold text-slate-900">{m.subject}</p>
                    <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-100 white-space-pre-wrap">{m.message}</p>
                    {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {m.attachments.map((attachment: any) => (
                          <button
                            key={attachment.id}
                            type="button"
                            onClick={() => void downloadEmailAttachment(m.ticket_id, m.id, attachment)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Download className="h-3 w-3" />{attachment.filename || 'Attachment'}
                          </button>
                        ))}
                      </div>
                    )}
                    {m.direction !== 'inbound' && (
                      <p className="text-[10px] text-slate-400">
                        Dispatched by: <strong className="text-slate-600">{m.agent_name}</strong> via connect@indowings.com
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {addCallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateCallLog} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Add Call Log</h3>
                <p className="text-xs text-slate-500">Creates a support ticket with the call in its history.</p>
              </div>
              <button type="button" onClick={() => setAddCallOpen(false)} className="text-slate-400 hover:text-slate-700" aria-label="Close call log form">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ['name', 'Customer name', true],
                  ['phone', 'Phone number', false],
                  ['email', 'Email', false],
                  ['order_id', 'Order ID', false],
                  ['drone_serial', 'Drone ID', false],
                  ['category', 'Category', true]
                ] as const
              ).map(([field, label, required]) => (
                <label key={field} className="space-y-1 text-[11px] font-bold text-slate-600">
                  {label}
                  <input
                    required={required}
                    type={field === 'email' ? 'email' : 'text'}
                    value={newCall[field]}
                    onChange={(event) => setNewCall((current) => ({ ...current, [field]: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium"
                  />
                </label>
              ))}
              <label className="space-y-1 text-[11px] font-bold text-slate-600">
                Call direction
                <select
                  value={newCall.call_type}
                  onChange={(event) => setNewCall((current) => ({ ...current, call_type: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs"
                >
                  <option value="incoming">Incoming</option>
                  <option value="outgoing">Outgoing</option>
                </select>
              </label>
              <label className="space-y-1 text-[11px] font-bold text-slate-600">
                Priority
                <select
                  value={newCall.priority}
                  onChange={(event) => setNewCall((current) => ({ ...current, priority: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label className="space-y-1 text-[11px] font-bold text-slate-600">
                Call date
                <input
                  type="date"
                  value={newCall.call_date}
                  onChange={(event) => setNewCall((current) => ({ ...current, call_date: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs"
                />
              </label>
              <label className="space-y-1 text-[11px] font-bold text-slate-600">
                Call time
                <input
                  type="time"
                  value={newCall.call_time}
                  onChange={(event) => setNewCall((current) => ({ ...current, call_time: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs"
                />
              </label>
              <label className="space-y-1 text-[11px] font-bold text-slate-600">
                Duration (seconds)
                <input
                  type="number"
                  min="0"
                  value={newCall.duration_seconds}
                  onChange={(event) => setNewCall((current) => ({ ...current, duration_seconds: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs"
                />
              </label>
              <label className="space-y-1 text-[11px] font-bold text-slate-600">
                Outcome
                <input
                  value={newCall.outcome}
                  onChange={(event) => setNewCall((current) => ({ ...current, outcome: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs"
                />
              </label>
            </div>
            <label className="block space-y-1 text-[11px] font-bold text-slate-600">
              Call notes <span className="text-rose-600">*</span>
              <textarea
                required
                rows={4}
                value={newCall.remarks}
                onChange={(event) => setNewCall((current) => ({ ...current, remarks: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAddCallOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">
                Cancel
              </button>
              <button disabled={isLoggingCall} className="rounded-xl bg-[#3b0080] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                {isLoggingCall ? 'Saving...' : 'Save Call Log'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
 MODAL 1: RESOLVE TICKET & DISPATCH EMAIL
 ════════════════════════════════════════════════════════════════ */}
      {resolvingTicket && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Resolve Ticket {resolvingTicket.id}</h3>
                  <p className="text-[11px] text-slate-500">
                    Customer: {resolvingTicket.name} ({resolvingTicket.email || resolvingTicket.phone})
                  </p>
                </div>
              </div>
              <button onClick={() => setResolvingTicket(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Resolution Summary &amp; Corrective Actions</label>
                <textarea
                  rows={4}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Detail the steps taken (e.g. Cleared avionics calibration error, verified corridor clearance with ATC, updated drop address to Gate 3...)"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 resize-none font-medium"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-800 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Automated Customer Email Notice
                </span>
                <p>
                  Upon submission, an official resolution email with your diagnostic notes and order context will be immediately sent to <strong>{resolvingTicket.email || 'customer email'}</strong>.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setResolvingTicket(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolving || !resolutionNotes.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isResolving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Email...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Resolved &amp; Send Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
 MODAL 2: LOG / START PHONE CALL
 ════════════════════════════════════════════════════════════════ */}
      {callingTicket && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#3b0080] flex items-center justify-center font-bold">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Phone Consultation: {callingTicket.name}</h3>
                  <a href={`tel:${callingTicket.phone}`} className="text-xs font-mono font-bold text-[#3b0080] hover:underline">
                    {callingTicket.phone}
                  </a>
                </div>
              </div>
              <button onClick={() => setCallingTicket(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogCall} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Call Direction</label>
                <select
                  value={callType}
                  onChange={(event) => setCallType(event.target.value as 'incoming' | 'outgoing')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium"
                >
                  <option value="incoming">Incoming</option>
                  <option value="outgoing">Outgoing</option>
                </select>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl flex items-center justify-between">
                <span>Click to initiate direct call:</span>
                <a href={`tel:${callingTicket.phone}`} className="px-3.5 py-1.5 bg-[#3b0080] text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call {callingTicket.phone}</span>
                </a>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Call Outcome</label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:outline-none focus:border-[#3b0080]"
                >
                  <option value="Customer Answered - Issue Resolved">Customer Answered - Issue Resolved</option>
                  <option value="Customer Requested Later Callback">Customer Requested Later Callback</option>
                  <option value="Number Busy / No Answer">Number Busy / No Answer</option>
                  <option value="Left Voicemail / SMS Notice">Left Voicemail / SMS Notice</option>
                  <option value="Technical Escalation Required">Technical Escalation Required</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Duration (Seconds)</label>
                <input
                  type="number"
                  value={callDuration}
                  onChange={(e) => setCallDuration(e.target.value)}
                  placeholder="e.g. 120"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3b0080]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Agent Remarks &amp; Customer Response</label>
                <textarea
                  rows={3}
                  value={callRemarks}
                  onChange={(e) => setCallRemarks(e.target.value)}
                  placeholder="Customer confirmed terrace coordinates; clarified wind hold limits..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3b0080] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCallingTicket(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingCall}
                  className="px-5 py-2.5 rounded-xl bg-[#3b0080] hover:bg-[#2c0060] text-white font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {isLoggingCall ? 'Saving...' : 'Save Call Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
 MODAL 3: DIRECT EMAIL MESSAGE COMPOSER
 ════════════════════════════════════════════════════════════════ */}
      {emailingTicket && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#3b0080] flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Direct Email to {emailingTicket.name}</h3>
                  <p className="text-xs text-slate-400">Destination: {emailingTicket.email}</p>
                </div>
              </div>
              <button onClick={() => setEmailingTicket(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4 text-xs">
              {emailFeedback && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 font-semibold text-rose-800">{emailFeedback}</p>}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email Subject</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3b0080] font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Message Content</label>
                <textarea
                  rows={6}
                  required
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3b0080] resize-none font-medium leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEmailingTicket(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail || !emailBody.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#3b0080] hover:bg-[#2c0060] text-white font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Direct Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
 MODAL 4: FULL TICKET DETAIL DRAWER
 ════════════════════════════════════════════════════════════════ */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-black text-[#3b0080] bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">{selectedTicket.id}</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedTicket.category}</h3>
                  <p className="text-xs text-slate-400">Created: {new Date(selectedTicket.created_at).toLocaleString('en-IN')}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Customer & Order Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Customer Identity</span>
                <p className="font-bold text-slate-900 text-sm">{selectedTicket.name}</p>
                <p className="text-slate-600">
                  <a href={`tel:${selectedTicket.phone}`} className="font-mono text-[#3b0080] font-bold hover:underline">
                    {selectedTicket.phone}
                  </a>
                </p>
                <p className="text-slate-600">
                  <a href={`mailto:${selectedTicket.email}`} className="text-slate-800 hover:underline">
                    {selectedTicket.email || 'N/A'}
                  </a>
                </p>
              </div>

              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3b0080] block">Associated Order Reference</span>
                <p className="font-mono font-bold text-sm text-[#3b0080]">{selectedTicket.order_id || 'Not Linked to Order'}</p>
                {selectedTicket.delivery_address && (
                  <p className="text-slate-700">
                    Drop: <strong>{selectedTicket.delivery_address}</strong>
                  </p>
                )}
                {selectedTicket.drone_serial && (
                  <p className="text-slate-700">
                    Drone Serial: <strong className="font-mono">{selectedTicket.drone_serial}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Query Message */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">Inquiry Description</span>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                {selectedTicket.message || 'No description provided.'}
              </div>
            </div>

            {/* Resolution Note */}
            {selectedTicket.resolution_notes && (
              <div className="space-y-1.5 text-xs">
                <span className="font-bold uppercase tracking-wider text-[11px] text-emerald-700">Resolution Applied</span>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 leading-relaxed font-medium whitespace-pre-wrap">{selectedTicket.resolution_notes}</div>
              </div>
            )}

            {Array.isArray(selectedTicket.timeline) && selectedTicket.timeline.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Activity timeline</h4>
                <div className="space-y-2">
                  {selectedTicket.timeline.map((entry: any, index: number) => (
                    <div key={entry.id || `${entry.type}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-slate-800">{String(entry.type || 'activity').replace(/_/g, ' ')}</strong>
                        <span className="text-[10px] text-slate-400">{entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-IN') : ''}</span>
                      </div>
                      <p className="mt-1 text-slate-600">
                        {entry.note || entry.details || (entry.from ? `${entry.from} → ${entry.to}` : '')}
                        {entry.actor_name ? ` · ${entry.actor_name}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(selectedTicket.audit_log) && selectedTicket.audit_log.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Audit log</h4>
                <div className="space-y-2">
                  {selectedTicket.audit_log.map((entry: any, index: number) => (
                    <div key={entry.id || index} className="rounded-xl border border-slate-100 p-3 text-xs text-slate-600">
                      <strong className="text-slate-800">{String(entry.action || 'activity').replace(/_/g, ' ')}</strong>
                      {' · '}
                      {entry.actor_name || 'System'}
                      {' · '}
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-IN') : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
              <label htmlFor="support-internal-note" className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Internal note (team only)
              </label>
              <textarea
                id="support-internal-note"
                rows={3}
                value={internalNoteDraft}
                onChange={(event) => setInternalNoteDraft(event.target.value)}
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs"
                placeholder="Add a private note for the support team..."
              />
              <button
                type="button"
                disabled={!internalNoteDraft.trim()}
                onClick={async () => {
                  const saved = await updateTicket(selectedTicket, { internal_note: internalNoteDraft.trim() });
                  if (saved) {
                    setSelectedTicket(null);
                    setInternalNoteDraft('');
                  }
                }}
                className="rounded-lg bg-amber-700 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"
              >
                Save internal note
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setSelectedTicket(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs">
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
