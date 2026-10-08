import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronDown,
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
  MessageCircle,
  Menu,
  Activity,
  Layers,
  Inbox,
  PieChart,
  Sliders,
  Plane,
  Truck,
  Eye,
  Radio,
  Sparkles,
  SearchCode
} from 'lucide-react';
import { DeliveryUser } from '../types';
import { API_BASE_URL } from '../config/api';
import { ProfilePage } from './ProfilePage';
import { CustomerOrderLiveMap } from '../components/CustomerOrderLiveMap';

interface SupportDeskPageProps {
  currentUser: DeliveryUser | null;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  embedded?: boolean;
}

export const SupportDeskPage: React.FC<SupportDeskPageProps> = ({ currentUser, onNavigate, onLogout, embedded = false }) => {
  // Navigation & View State
  const [activeSidebarTab, setActiveSidebarTab] = useState<'overview' | 'tickets' | 'emails' | 'calls' | 'forms' | 'inspector' | 'profile'>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Tickets & Fleet Orders Data
  const [tickets, setTickets] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'urgent'>('all');
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [lastTicketCount, setLastTicketCount] = useState<number>(0);
  const [newTicketAlert, setNewTicketAlert] = useState<string | null>(null);
  const [supportError, setSupportError] = useState('');

  // 360° Inspector Search State
  const [inspectorQuery, setInspectorQuery] = useState('');
  const [inspectorSelectedCaseId, setInspectorSelectedCaseId] = useState<string | null>(null);
  const [inspectorSubTab, setInspectorSubTab] = useState<'overview' | 'flight' | 'calls' | 'emails' | 'form' | 'timeline'>('overview');

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

  // Direct Email Modal & Workbench State
  const [emailingTicket, setEmailingTicket] = useState<any | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState('');
  const [emailFilterTab, setEmailFilterTab] = useState<'inbound' | 'outbound' | 'all'>('inbound');
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [expandedEmailIds, setExpandedEmailIds] = useState<Record<string, boolean>>({});

  const toggleEmailExpand = (emailKey: string) => {
    setExpandedEmailIds(prev => ({
      ...prev,
      [emailKey]: !prev[emailKey]
    }));
  };

  // Call Workbench State
  const [callFilterTab, setCallFilterTab] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [callSearchQuery, setCallSearchQuery] = useState('');

  // Play sound using Web Audio API Synthesizer
  const playAlertSound = () => {
    if (!audioAlerts) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {}
  };

  const fetchTicketsAndOrders = async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const [ticketsRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/delivery/support/tickets`, { headers: supportHeaders }),
        fetch(`${API_BASE_URL}/api/delivery/dispatch/dashboard`, { headers: supportHeaders }).catch(() => null)
      ]);

      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        const incoming = data.requests || [];
        setAgents(data.agents || []);

        // Check for new incoming ticket
        if (lastTicketCount > 0 && incoming.length > lastTicketCount) {
          const newest = incoming[0];
          setNewTicketAlert(`New Inbound Case: ${newest.name} (${newest.category || 'General Inbound'})`);
          playAlertSound();
          setTimeout(() => setNewTicketAlert(null), 6000);
        }

        setTickets(incoming);
        setLastTicketCount(incoming.length);
      } else {
        const result = await ticketsRes.json().catch(() => ({}));
        setSupportError(result.error || 'Could not load Support Desk tickets.');
      }

      if (ordersRes && ordersRes.ok) {
        const orderData = await ordersRes.json();
        setOrders(orderData.orders || []);
      }
    } catch (err) {
      console.error('[support] Error fetching data:', err);
    } finally {
      setLoading(false);
      if (!isBackground) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTicketsAndOrders();
    const interval = setInterval(() => {
      fetchTicketsAndOrders(true);
    }, 6000);
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
      await fetchTicketsAndOrders();
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
      await fetchTicketsAndOrders();
    } catch (err) {
      setSupportError(err instanceof Error ? err.message : 'Could not save call log.');
    } finally {
      setIsLoggingCall(false);
    }
  };

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
        await fetchTicketsAndOrders();
      }
    } catch (err) {
      console.error('[support] Failed to resolve ticket:', err);
    } finally {
      setIsResolving(false);
    }
  };

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
        await fetchTicketsAndOrders();
      }
    } catch (err) {
      console.error('[support] Failed to log call:', err);
    } finally {
      setIsLoggingCall(false);
    }
  };

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
      await fetchTicketsAndOrders();
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

  // ─── GRANULAR KPI CALCULATIONS ──────────────────────────────────────────
  const isToday = (dateString?: string) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  // 1. Cases & Resolution
  const totalCases = tickets.length;
  const todaysCases = useMemo(() => tickets.filter(t => isToday(t.created_at)).length, [tickets]);

  const isPendingStatus = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === 'open' || s === 'pending' || s === 'in_progress' || s === 'in-progress' || s === 'waiting_for_customer' || s === 'waiting_for_internal_team' || s === 'unresolved' || s === 'reopened';
  };

  const isResolvedStatus = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === 'resolved' || s === 'closed';
  };

  const totalPending = useMemo(() => tickets.filter(t => isPendingStatus(t.status)).length, [tickets]);
  const todaysPending = useMemo(() => tickets.filter(t => isToday(t.created_at) && isPendingStatus(t.status)).length, [tickets]);

  const totalResolved = useMemo(() => tickets.filter(t => isResolvedStatus(t.status)).length, [tickets]);
  const todaysResolved = useMemo(() => tickets.filter(t => (isToday(t.resolved_at) || (isToday(t.created_at) && isResolvedStatus(t.status)))).length, [tickets]);

  // 2. Email Cases
  const emailTickets = useMemo(() => {
    return tickets.filter(t => t.source === 'email' || t.category === 'Email' || (t.email_thread && t.email_thread.length > 0));
  }, [tickets]);

  const totalEmailCases = emailTickets.length;
  const todaysEmailCases = useMemo(() => emailTickets.filter(t => isToday(t.created_at)).length, [emailTickets]);

  const totalEmailCasesPending = useMemo(() => emailTickets.filter(t => isPendingStatus(t.status)).length, [emailTickets]);
  const totalEmailCasesResolved = useMemo(() => emailTickets.filter(t => isResolvedStatus(t.status)).length, [emailTickets]);

  const todaysEmailCasesPending = useMemo(() => emailTickets.filter(t => isToday(t.created_at) && isPendingStatus(t.status)).length, [emailTickets]);
  const todaysEmailCasesResolved = useMemo(() => emailTickets.filter(t => isToday(t.created_at) && isResolvedStatus(t.status)).length, [emailTickets]);

  // 3. Call Logs
  const allCalls = useMemo(() => {
    return tickets.flatMap(t => (t.call_logs || []).map((c: any) => ({
      ...c,
      ticket_id: t.id,
      customer_name: t.name,
      phone: t.phone || c.phone,
      order_id: t.order_id || c.order_id
    })));
  }, [tickets]);

  const totalCallLogs = allCalls.length;
  const todaysCallLogs = useMemo(() => allCalls.filter(c => isToday(c.timestamp || c.call_date)).length, [allCalls]);

  const filteredCalls = useMemo(() => {
    return allCalls.filter((c: any) => {
      // Direction filter
      if (callFilterTab === 'incoming' && c.call_type !== 'incoming') return false;
      if (callFilterTab === 'outgoing' && c.call_type === 'incoming') return false;

      // Search query filter
      if (!callSearchQuery.trim()) return true;
      const q = callSearchQuery.toLowerCase().trim();
      return (
        c.ticket_id?.toLowerCase().includes(q) ||
        c.customer_name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.agent_name?.toLowerCase().includes(q) ||
        c.outcome?.toLowerCase().includes(q) ||
        c.remarks?.toLowerCase().includes(q) ||
        c.order_id?.toLowerCase().includes(q)
      );
    });
  }, [allCalls, callFilterTab, callSearchQuery]);

  // 4. Form Queries (Web Form Submissions)
  const formTickets = useMemo(() => {
    return tickets.filter(t => t.source === 'web' || t.source === 'form' || (!t.source && t.category !== 'Email' && t.category !== 'Call'));
  }, [tickets]);

  const totalFormQueries = formTickets.length;
  const totalFormQueriesPending = useMemo(() => formTickets.filter(t => isPendingStatus(t.status)).length, [formTickets]);
  const todaysFormQueries = useMemo(() => formTickets.filter(t => isToday(t.created_at)).length, [formTickets]);

  // Urgent and high priority cases
  const urgentCount = useMemo(() => tickets.filter(t => t.priority === 'urgent' && !isResolvedStatus(t.status)).length, [tickets]);
  const allEmails = useMemo(() => {
    return tickets.flatMap((t) =>
      (t.email_thread || []).map((m: any, mIdx: number) => ({
        ...m,
        id: m.id || `${t.id}-email-${mIdx}`,
        ticket_id: t.id,
        ticket: t,
        customer_name: t.name || m.customer_name || 'Customer',
        email: t.email || m.to || m.from
      }))
    );
  }, [tickets]);

  const filteredEmails = useMemo(() => {
    return allEmails.filter((m: any) => {
      // Direction tab filter
      if (emailFilterTab === 'inbound' && m.direction !== 'inbound') return false;
      if (emailFilterTab === 'outbound' && m.direction === 'inbound') return false;

      // Search query filter
      if (!emailSearchQuery.trim()) return true;
      const q = emailSearchQuery.toLowerCase().trim();
      return (
        m.ticket_id?.toLowerCase().includes(q) ||
        m.customer_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.from?.toLowerCase().includes(q) ||
        m.to?.toLowerCase().includes(q) ||
        m.subject?.toLowerCase().includes(q) ||
        m.message?.toLowerCase().includes(q)
      );
    });
  }, [allEmails, emailFilterTab, emailSearchQuery]);

  // Search & Filter for Tickets Workbench
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter === 'open' && !isPendingStatus(t.status)) return false;
      if (statusFilter === 'in_progress' && t.status !== 'in_progress' && t.status !== 'in-progress') return false;
      if (statusFilter === 'resolved' && !isResolvedStatus(t.status)) return false;
      if (statusFilter === 'urgent' && t.priority !== 'urgent') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
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
  }, [tickets, statusFilter, searchQuery]);

  // 360° Inspector Selected Record Lookup
  const inspectorRecord = useMemo(() => {
    const q = (inspectorSelectedCaseId || inspectorQuery).toLowerCase().trim();
    if (!q) return null;

    // Find matched order if query matches order ID or tracking
    const matchedOrder = orders.find(o =>
      o.id?.toLowerCase() === q ||
      o.order_number?.toLowerCase() === q ||
      o.id?.toLowerCase().includes(q) ||
      o.order_number?.toLowerCase().includes(q)
    );

    // Find ticket by Case ID or Order ID or Phone or Email
    const matchedTicket = tickets.find(t =>
      t.id?.toLowerCase() === q ||
      t.order_id?.toLowerCase() === q ||
      (matchedOrder && (t.order_id?.toLowerCase() === matchedOrder.id?.toLowerCase() || t.order_id?.toLowerCase() === matchedOrder.order_number?.toLowerCase())) ||
      t.id?.toLowerCase().includes(q) ||
      t.order_id?.toLowerCase().includes(q) ||
      t.phone?.includes(q) ||
      t.email?.toLowerCase().includes(q)
    );

    // If order was not found directly, try finding it using ticket's order_id
    const finalOrder = matchedOrder || (matchedTicket?.order_id ? orders.find(o =>
      o.id?.toLowerCase() === matchedTicket.order_id?.toLowerCase() ||
      o.order_number?.toLowerCase() === matchedTicket.order_id?.toLowerCase() ||
      o.id?.toLowerCase().includes(matchedTicket.order_id?.toLowerCase()) ||
      o.order_number?.toLowerCase().includes(matchedTicket.order_id?.toLowerCase())
    ) : null);

    // Aggregate all call logs related to this ticket or order
    const callLogs: any[] = [];
    if (matchedTicket?.call_logs) {
      callLogs.push(...matchedTicket.call_logs);
    }
    if (finalOrder) {
      tickets.forEach(t => {
        if (t.id !== matchedTicket?.id && (t.order_id?.toLowerCase() === finalOrder.id?.toLowerCase() || t.order_id?.toLowerCase() === finalOrder.order_number?.toLowerCase())) {
          (t.call_logs || []).forEach((c: any) => {
            if (!callLogs.some(existing => existing.id === c.id || (existing.timestamp === c.timestamp && existing.remarks === c.remarks))) {
              callLogs.push(c);
            }
          });
        }
      });
    }

    // Aggregate all emails related to this ticket or order
    const emails: any[] = [];
    if (matchedTicket?.email_thread) {
      emails.push(...matchedTicket.email_thread);
    }
    if (finalOrder) {
      tickets.forEach(t => {
        if (t.id !== matchedTicket?.id && (t.order_id?.toLowerCase() === finalOrder.id?.toLowerCase() || t.order_id?.toLowerCase() === finalOrder.order_number?.toLowerCase())) {
          (t.email_thread || []).forEach((m: any) => {
            if (!emails.some(existing => existing.id === m.id || (existing.timestamp === m.timestamp && existing.message === m.message))) {
              emails.push(m);
            }
          });
        }
      });
    }

    return {
      ticket: matchedTicket || null,
      order: finalOrder || null,
      callLogs,
      emails,
      query: q
    };
  }, [inspectorQuery, inspectorSelectedCaseId, tickets, orders]);

  // Sidebar navigation items
  const supportNavItems = [
    { id: 'overview', label: 'Overview & Analytics', icon: Activity, badge: null },
    { id: 'tickets', label: 'All Cases & Tickets', icon: Inbox, badge: totalPending > 0 ? totalPending : null },
    { id: 'emails', label: 'Email Communications', icon: Mail, badge: totalEmailCasesPending > 0 ? totalEmailCasesPending : null },
    { id: 'calls', label: 'Voice Calls & Logs', icon: PhoneCall, badge: allCalls.length > 0 ? allCalls.length : null },
    { id: 'forms', label: 'Website Form Queries', icon: MessageSquare, badge: totalFormQueriesPending > 0 ? totalFormQueriesPending : null },
    { id: 'inspector', label: '360° Intelligence Inspector', icon: SearchCode, badge: null },
    { id: 'profile', label: 'My Support Profile', icon: User, badge: null }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 1: OVERVIEW & ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════
  const renderOverviewAnalytics = () => {
    const resolutionRate = totalCases > 0 ? Math.round((totalResolved / totalCases) * 100) : 100;
    const todayResolutionRate = todaysCases > 0 ? Math.round((todaysResolved / todaysCases) * 100) : 100;

    return (
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Support Intelligence &amp; Performance Desk</h2>
              <span className="text-xs bg-purple-100 text-[#5a00b8] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Live Omnichannel Desk
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Real-time Inbound Telephony, Resend Email Dispatches, Web Queries &amp; Flight Case Resolution
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setAudioAlerts(!audioAlerts)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                audioAlerts
                  ? 'bg-purple-50 text-[#5a00b8] border-purple-200 hover:bg-purple-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {audioAlerts ? <Volume2 className="w-4 h-4 text-[#5a00b8]" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span>Chime {audioAlerts ? 'Active' : 'Muted'}</span>
            </button>

            <button
              onClick={() => fetchTicketsAndOrders()}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Live Sync'}</span>
            </button>
          </div>
        </div>

        {/* ─── ROW 1: PRIMARY CASES METRICS (TOTAL VS TODAY) ──────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#5a00b8]" />
              Core Inbound &amp; Resolution Volume
            </h3>
            <span className="text-[11px] text-slate-400 font-semibold">Today vs Lifetime totals</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Total Cases */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Cases</span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-slate-900">{totalCases}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">All registered tickets</span>
            </div>

            {/* Today's Cases */}
            <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#5a00b8] uppercase tracking-wider">Today's Cases</span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-[#5a00b8]">{todaysCases}</span>
              </div>
              <span className="text-[10px] text-purple-700 font-medium">Received today</span>
            </div>

            {/* Total Pending */}
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" /> Total Pending
              </span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-amber-600">{totalPending}</span>
              </div>
              <span className="text-[10px] text-amber-700 font-medium">Awaiting action</span>
            </div>

            {/* Today's Pending */}
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Today's Pending</span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-amber-700">{todaysPending}</span>
              </div>
              <span className="text-[10px] text-amber-800 font-medium">Pending from today</span>
            </div>

            {/* Total Resolved */}
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Total Resolved
              </span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-emerald-600">{totalResolved}</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-medium">{resolutionRate}% clearance</span>
            </div>

            {/* Today's Resolved */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Today's Resolved</span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-emerald-700">{todaysResolved}</span>
              </div>
              <span className="text-[10px] text-emerald-800 font-medium">{todayResolutionRate}% today rate</span>
            </div>
          </div>
        </div>

        {/* ─── ROW 2: OMNICHANNEL BREAKDOWN (EMAILS, CALLS & FORMS) ────────── */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-sky-600" />
              Email &amp; Communication Channels
            </h3>
            <span className="text-[11px] text-slate-400 font-semibold">Resend &amp; Web form metrics</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Total Email Cases */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Email Cases</span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-slate-900">{totalEmailCases}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">All email conversations</span>
            </div>

            {/* Today's Email Cases */}
            <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">Today's Email Cases</span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-sky-600">{todaysEmailCases}</span>
              </div>
              <span className="text-[10px] text-sky-700 font-medium">Inbound emails today</span>
            </div>

            {/* Total Email Cases Pending */}
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Email Pending</span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-amber-600">{totalEmailCasesPending}</span>
              </div>
              <span className="text-[10px] text-amber-700 font-medium">Email replies needed</span>
            </div>

            {/* Total Email Cases Resolved */}
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Email Resolved</span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-emerald-600">{totalEmailCasesResolved}</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-medium">Emails cleared</span>
            </div>

            {/* Today's Email Cases Pending */}
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Today's Email Pending</span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-amber-700">{todaysEmailCasesPending}</span>
              </div>
              <span className="text-[10px] text-amber-800 font-medium">Today's pending emails</span>
            </div>

            {/* Today's Email Cases Resolved */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Today's Email Resolved</span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-emerald-700">{todaysEmailCasesResolved}</span>
              </div>
              <span className="text-[10px] text-emerald-800 font-medium">Today's emails closed</span>
            </div>
          </div>
        </div>

        {/* ─── ROW 3: VOICE CALL LOGS & WEBSITE FORMS ─────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-purple-600" />
              Telephony &amp; Web Form Inquiries
            </h3>
            <span className="text-[11px] text-slate-400 font-semibold">Direct agent touchpoints</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Total Call Logs */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Phone className="w-3 h-3 text-purple-600" /> Total Call Logs
              </span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-slate-900">{totalCallLogs}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Lifetime voice consultations</span>
            </div>

            {/* Today's Call Logs */}
            <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Today's Call Logs</span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-purple-600">{todaysCallLogs}</span>
              </div>
              <span className="text-[10px] text-purple-700 font-medium">Voice interactions today</span>
            </div>

            {/* Total Form Queries */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-teal-600" /> Total Form Queries
              </span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-slate-900">{totalFormQueries}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Web portal submissions</span>
            </div>

            {/* Today's Form Queries */}
            <div className="bg-teal-50/70 p-4 rounded-2xl border border-teal-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">Today's Form Queries</span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-teal-600">{todaysFormQueries}</span>
              </div>
              <span className="text-[10px] text-teal-700 font-medium">Website queries today</span>
            </div>
          </div>
        </div>

        {/* ─── ROW 4: VISUAL CHARTS & PROGRESS GAUGES ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Channel Distribution Gauge */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#5a00b8]" />
                Channel Breakdown
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">Omnichannel Mix</span>
            </div>

            <div className="space-y-3">
              {/* Email */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-sky-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email Messages
                  </span>
                  <span className="text-slate-900">
                    {totalEmailCases} ({totalCases > 0 ? Math.round((totalEmailCases / totalCases) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-500"
                    style={{ width: `${totalCases > 0 ? (totalEmailCases / totalCases) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Phone Calls */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-purple-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Voice Call Logs
                  </span>
                  <span className="text-slate-900">{totalCallLogs} logs</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5a00b8] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, totalCallLogs * 10)}%` }}
                  />
                </div>
              </div>

              {/* Web Forms */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-teal-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Web Form Queries
                  </span>
                  <span className="text-slate-900">
                    {totalFormQueries} ({totalCases > 0 ? Math.round((totalFormQueries / totalCases) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${totalCases > 0 ? (totalFormQueries / totalCases) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Resolution Velocity & SLA Gauge */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Resolution Velocity
              </h4>
              <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                SLA Compliant
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Overall Clearance Rate</p>
                  <p className="text-2xl font-black text-emerald-700 mt-0.5">{resolutionRate}%</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-600">{totalResolved} of {totalCases} Cases</span>
                  <p className="text-[10px] text-slate-400">Marked closed &amp; resolved</p>
                </div>
              </div>

              <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-100 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#5a00b8]">Today's Clearance Rate</p>
                  <p className="text-2xl font-black text-[#5a00b8] mt-0.5">{todayResolutionRate}%</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-600">{todaysResolved} of {todaysCases} Today</span>
                  <p className="text-[10px] text-slate-400">Handled in current shift</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action & 360° Inspector Trigger */}
          <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-md flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SearchCode className="w-5 h-5 text-purple-300" />
                <h4 className="text-sm font-black tracking-tight text-white">Universal 360° Case Inspector</h4>
              </div>
              <p className="text-xs text-purple-200 leading-relaxed font-normal">
                Inspect complete end-to-end flight logs, authorizing dispatcher, delivery partner contact, assigned drone specifications and customer communications.
              </p>
            </div>

            <button
              onClick={() => {
                setActiveSidebarTab('inspector');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full py-2.5 px-4 bg-white text-[#5a00b8] hover:bg-purple-50 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <span>Open 360° Intelligence Inspector</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 2: ALL TICKETS & CASES WORKBENCH
  // ═══════════════════════════════════════════════════════════════════════════
  const renderTicketsWorkbench = () => (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: `All (${totalCases})` },
            { id: 'open', label: `Pending / Open (${totalPending})` },
            { id: 'in_progress', label: `In Progress (${tickets.filter(t => t.status === 'in_progress' || t.status === 'in-progress').length})` },
            { id: 'resolved', label: `Resolved (${totalResolved})` },
            { id: 'urgent', label: `Urgent (${urgentCount})` }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === f.id ? 'bg-[#5a00b8] text-white shadow-xs' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by case ID, order, name, phone..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#5a00b8]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-[#5a00b8] mx-auto mb-2" />
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
            const isResolved = isResolvedStatus(t.status);
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
                      <span className="font-mono text-xs font-black text-[#5a00b8] bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">{t.id}</span>

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
                            ? 'bg-purple-100 text-[#5a00b8]'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        ● {t.status || 'Open'}
                      </span>

                      <span className="text-[11px] text-slate-400 ml-auto">
                        {new Date(t.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                      </span>
                    </div>

                    {/* Channel & Controls Row */}
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
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 cursor-pointer"
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
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 cursor-pointer"
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
                          className="max-w-52 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 cursor-pointer"
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
                        <a href={`tel:${t.phone}`} className="font-mono text-[#5a00b8] font-bold hover:underline">
                          {t.phone || 'N/A'}
                        </a>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Customer Email</span>
                        <a href={`mailto:${t.email}`} className="text-slate-700 hover:text-[#5a00b8] truncate block">
                          {t.email || 'N/A'}
                        </a>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Linked Order ID</span>
                        {t.order_id ? (
                          <button
                            type="button"
                            onClick={() => {
                              setInspectorSelectedCaseId(t.id);
                              setActiveSidebarTab('inspector');
                            }}
                            className="font-mono font-bold text-[#5a00b8] hover:underline flex items-center gap-1 cursor-pointer"
                            title="Inspect complete order dossier in 360° Inspector"
                          >
                            <span>{t.order_id}</span>
                            <Eye className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-slate-400 font-normal">No order linked</span>
                        )}
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
                      <span className="text-[11px] font-bold text-[#5a00b8] bg-purple-50 px-2 py-0.5 rounded">Topic: {t.category}</span>
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
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
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
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
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
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#5a00b8] bg-purple-50 hover:bg-purple-100 transition-colors flex items-center gap-1.5 cursor-pointer"
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
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>Send Email</span>
                    </button>

                    {/* 360° Inspector Trigger */}
                    <button
                      onClick={() => {
                        setInspectorSelectedCaseId(t.id);
                        setActiveSidebarTab('inspector');
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-purple-900 bg-purple-100 hover:bg-purple-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <SearchCode className="w-3.5 h-3.5 text-[#5a00b8]" />
                      <span>360° Inspector</span>
                    </button>

                    {/* View Full Card Modal */}
                    <button
                      onClick={() => {
                        setSelectedTicket(t);
                        setInternalNoteDraft('');
                      }}
                      className="px-2.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Inspect complete history"
                    >
                      Full Details →
                    </button>
                  </div>
                </div>

                {/* Footer: Call Logs & Email Thread Summary */}
                {((t.call_logs && t.call_logs.length > 0) || (t.email_thread && t.email_thread.length > 0)) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    {t.call_logs && t.call_logs.length > 0 && (
                      <span className="flex items-center gap-1 font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        {t.call_logs.length} Phone Calls Logged
                      </span>
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
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 3: DIRECT EMAIL INBOX & OUTBOX
  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 3: DIRECT EMAIL INBOX & OUTBOX
  // ═══════════════════════════════════════════════════════════════════════════
  const renderEmailsWorkbench = () => {
    const inboundCount = allEmails.filter((e: any) => e.direction === 'inbound').length;
    const outboundCount = allEmails.filter((e: any) => e.direction !== 'inbound').length;

    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-black">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Support Email Inbox &amp; Outbox</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {inboundCount} Inbound Received · {outboundCount} Outbound Dispatched
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar & Direction Tabs */}
        <div className="space-y-3">
          {/* Ticket & Message Search Input Box */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={emailSearchQuery}
              onChange={(e) => setEmailSearchQuery(e.target.value)}
              placeholder="Search by Ticket ID (e.g. TKT-...), customer name, email address, or keyword..."
              className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#5a00b8] focus:ring-2 focus:ring-purple-100 transition shadow-inner"
            />
            {emailSearchQuery && (
              <button
                type="button"
                onClick={() => setEmailSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Inbound / Outbound / All Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setEmailFilterTab('inbound')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                emailFilterTab === 'inbound'
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Inbox className="w-3.5 h-3.5 text-emerald-600" />
              <span>Inbound Emails (Received)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                emailFilterTab === 'inbound' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {inboundCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setEmailFilterTab('outbound')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                emailFilterTab === 'outbound'
                  ? 'bg-white text-sky-800 shadow-xs border border-sky-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-sky-600" />
              <span>Outbound Emails (Sent / Dispatched)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                emailFilterTab === 'outbound' ? 'bg-sky-100 text-sky-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {outboundCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setEmailFilterTab('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                emailFilterTab === 'all'
                  ? 'bg-white text-purple-800 shadow-xs border border-purple-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>All Correspondence</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                emailFilterTab === 'all' ? 'bg-purple-100 text-purple-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {allEmails.length}
              </span>
            </button>
          </div>
        </div>

        {/* Email Collapsed Accordion List */}
        {filteredEmails.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 space-y-2">
            <Mail className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">
              {emailSearchQuery ? 'No email communications match your search query.' : `No ${emailFilterTab === 'all' ? '' : emailFilterTab} emails found.`}
            </p>
            <p className="text-[11px] text-slate-400">
              {emailSearchQuery ? 'Try clearing the search or switching tabs.' : 'New email correspondence will appear here automatically.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEmails.map((m: any) => {
              const emailKey = m.id || `${m.ticket_id}-${m.timestamp}-${m.subject}`;
              const isExpanded = !!expandedEmailIds[emailKey];
              const isInbound = m.direction === 'inbound';

              return (
                <div
                  key={emailKey}
                  className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? 'bg-white border-purple-300 shadow-md ring-1 ring-purple-100'
                      : 'bg-slate-50/70 hover:bg-white border-slate-200 hover:border-purple-200 shadow-xs'
                  }`}
                >
                  {/* Collapsed Header (Click to open / close) */}
                  <div
                    onClick={() => toggleEmailExpand(emailKey)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${isInbound ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                        {isInbound ? <Inbox className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-black text-[#5a00b8] bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                            {m.ticket_id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isInbound ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                          }`}>
                            {isInbound ? 'Inbound · Received' : `Outbound · ${m.delivery_status || 'Sent'}`}
                          </span>
                          <strong className="text-xs font-bold text-slate-900 truncate">
                            {m.customer_name}
                          </strong>
                          <span className="text-[11px] text-slate-400 font-mono truncate">
                            ({isInbound ? m.from : m.to || m.email})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-slate-800 truncate">
                            {m.subject || 'No Subject'}
                          </span>
                          {!isExpanded && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-slate-500 truncate text-[11px] max-w-xs md:max-w-md">
                                {m.message?.slice(0, 90)}...
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {m.timestamp ? new Date(m.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Recent'}
                      </span>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 ${
                        isExpanded ? 'bg-purple-100 text-[#5a00b8] rotate-180' : 'bg-slate-200/70 text-slate-600'
                      }`}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Body Container */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
                      {/* Detailed Meta Header */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sender (From)</span>
                            <span className="font-semibold text-slate-900">{m.from || (isInbound ? m.email : 'support@indofleet.com')}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipient (To)</span>
                            <span className="font-semibold text-slate-900">{m.to || (isInbound ? 'support@indofleet.com' : m.email)}</span>
                          </div>
                        </div>

                        <div className="pt-1.5 border-t border-slate-200/50">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subject</span>
                          <strong className="text-slate-900">{m.subject || 'Support Communication'}</strong>
                        </div>
                      </div>

                      {/* Full Formatted Email Body */}
                      <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap shadow-inner">
                        {m.message || 'No message content.'}
                      </div>

                      {/* Attachments (if any) */}
                      {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attachments ({m.attachments.length})</span>
                          <div className="flex flex-wrap gap-2">
                            {m.attachments.map((attachment: any) => (
                              <button
                                key={attachment.id}
                                type="button"
                                onClick={() => void downloadEmailAttachment(m.ticket_id, m.id, attachment)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-[#5a00b8] hover:border-purple-200 transition cursor-pointer"
                              >
                                <Download className="h-3.5 w-3.5" />
                                {attachment.filename || 'Attachment'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sender / Agent Signature */}
                      {!isInbound && (
                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                          <span>Dispatched by: <strong className="text-slate-700">{m.agent_name || 'Support Desk'}</strong> via connect@indowings.com</span>
                          <span className="font-mono text-[10px] text-slate-400 uppercase">Gateway Resend API</span>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (m.ticket) {
                                setEmailingTicket(m.ticket);
                                setEmailFeedback('');
                                setEmailSubject(`Re: ${m.subject || `Support Ticket [${m.ticket_id}]`}`);
                                setEmailBody(`Hello ${m.customer_name},\n\n\n\nBest regards,\nIndoFleet Support Desk`);
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Reply to Customer
                          </button>

                          {m.ticket && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTicket(m.ticket);
                                setInternalNoteDraft('');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              View Full Case
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setInspectorSelectedCaseId(m.ticket_id);
                            setActiveSidebarTab('inspector');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-[#5a00b8] font-bold text-xs hover:bg-purple-100 transition cursor-pointer"
                        >
                          <SearchCode className="w-3.5 h-3.5" />
                          Open in 360° Inspector
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 4: VOICE CALLS & LOGS
  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 4: VOICE CALLS & LOGS
  // ═══════════════════════════════════════════════════════════════════════════
  const renderCallsWorkbench = () => {
    const incomingCount = allCalls.filter((c: any) => c.call_type === 'incoming').length;
    const outgoingCount = allCalls.filter((c: any) => c.call_type !== 'incoming').length;
    const totalDurationSec = allCalls.reduce((acc: number, c: any) => acc + (Number(c.duration_seconds) || 0), 0);

    const formatDuration = (sec: number) => {
      if (!sec || sec <= 0) return '0s';
      const mins = Math.floor(sec / 60);
      const remSec = sec % 60;
      if (mins > 0) return `${mins}m ${remSec > 0 ? `${remSec}s` : ''}`.trim();
      return `${remSec}s`;
    };

    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#5a00b8] flex items-center justify-center font-black">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Phone Calls &amp; Callback Audit Log</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {allCalls.length} Voice Consultations · Total Duration: {formatDuration(totalDurationSec)} ({incomingCount} Incoming · {outgoingCount} Outgoing)
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAddCallOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#5a00b8] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#4a0099] cursor-pointer shadow-xs transition"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Record New Call</span>
          </button>
        </div>

        {/* Search Bar & Direction Tabs */}
        <div className="space-y-3">
          {/* Call Search Input Box */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={callSearchQuery}
              onChange={(e) => setCallSearchQuery(e.target.value)}
              placeholder="Search calls by Ticket ID (e.g. TKT-...), customer name, phone number, outcome, remarks, or agent..."
              className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#5a00b8] focus:ring-2 focus:ring-purple-100 transition shadow-inner"
            />
            {callSearchQuery && (
              <button
                type="button"
                onClick={() => setCallSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Incoming / Outgoing / All Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setCallFilterTab('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                callFilterTab === 'all'
                  ? 'bg-white text-purple-900 shadow-xs border border-purple-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>All Calls</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                callFilterTab === 'all' ? 'bg-purple-100 text-purple-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {allCalls.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCallFilterTab('incoming')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                callFilterTab === 'incoming'
                  ? 'bg-white text-sky-900 shadow-xs border border-sky-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <PhoneIncoming className="w-3.5 h-3.5 text-sky-600" />
              <span>Incoming Calls</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                callFilterTab === 'incoming' ? 'bg-sky-100 text-sky-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {incomingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCallFilterTab('outgoing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                callFilterTab === 'outgoing'
                  ? 'bg-white text-violet-900 shadow-xs border border-violet-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-violet-600" />
              <span>Outgoing Calls</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                callFilterTab === 'outgoing' ? 'bg-violet-100 text-violet-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {outgoingCount}
              </span>
            </button>
          </div>
        </div>

        {/* Calls Table Container */}
        {filteredCalls.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 space-y-2">
            <PhoneCall className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">
              {callSearchQuery ? 'No voice call logs match your search.' : `No ${callFilterTab === 'all' ? '' : callFilterTab} calls recorded yet.`}
            </p>
            <p className="text-[11px] text-slate-400">Click &quot;Record New Call&quot; above to log an inbound or outbound voice interaction.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
            <table className="min-w-[920px] w-full text-xs text-left divide-y divide-slate-200">
              <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">Ticket Reference</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Customer Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Phone Number</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Direction</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Duration</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Call Outcome</th>
                  <th className="py-3.5 px-4">Agent Remarks</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Timestamp</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {filteredCalls.map((c: any, idx: number) => {
                  const isIncoming = c.call_type === 'incoming';
                  const outcomeText = c.outcome || 'Call Completed';
                  const isResolved = outcomeText.includes('Resolved');
                  const isCallback = outcomeText.includes('Callback');
                  const isMissed = outcomeText.includes('Busy') || outcomeText.includes('No Answer');

                  return (
                    <tr key={idx} className="hover:bg-purple-50/40 transition-colors">
                      {/* Ticket Reference */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-xs text-[#5a00b8] bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                          {c.ticket_id}
                        </span>
                      </td>

                      {/* Customer Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <strong className="text-slate-900 font-bold text-xs">{c.customer_name}</strong>
                      </td>

                      {/* Phone Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                        {c.phone ? (
                          <a href={`tel:${c.phone}`} className="text-[#5a00b8] font-bold hover:underline">
                            {c.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">Not provided</span>
                        )}
                      </td>

                      {/* Direction */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          isIncoming ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-[#5a00b8]'
                        }`}>
                          {isIncoming ? <PhoneIncoming className="w-3 h-3" /> : <PhoneCall className="w-3 h-3" />}
                          <span className="capitalize">{c.call_type || 'outgoing'}</span>
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {formatDuration(c.duration_seconds)}
                        </span>
                      </td>

                      {/* Outcome Badge (Fixed: whitespace-nowrap and clean borders) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                          isResolved
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : isCallback
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : isMissed
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-purple-50 text-[#5a00b8] border-purple-200'
                        }`}>
                          {outcomeText}
                        </span>
                      </td>

                      {/* Agent Remarks */}
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                        <span className="block truncate text-xs" title={c.remarks}>
                          {c.remarks || 'No notes recorded.'}
                        </span>
                        {c.agent_name && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            By: {c.agent_name}
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {c.timestamp ? new Date(c.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : `${c.call_date || ''} ${c.call_time || ''}`}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setInspectorSelectedCaseId(c.ticket_id);
                            setActiveSidebarTab('inspector');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-[#5a00b8] font-bold text-xs hover:bg-purple-100 transition cursor-pointer"
                        >
                          <SearchCode className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 5: WEBSITE CONTACT FORM QUERIES
  // ═══════════════════════════════════════════════════════════════════════════
  const renderFormQueriesWorkbench = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">Website &amp; Landing Page Form Queries</h2>
          <p className="text-xs text-slate-500">Total {formTickets.length} form inquiries submitted via customer portal &amp; contact gateways.</p>
        </div>
      </div>

      {formTickets.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs">No web form queries submitted yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {formTickets.map((t) => (
            <div key={t.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                    {t.id}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{t.name}</span>
                  <span className="text-xs text-slate-400">({t.email || t.phone || 'No contact provided'})</span>
                </div>
                <span className="text-[11px] text-slate-400">{new Date(t.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                <p className="font-bold text-slate-900 mb-1">Topic: {t.category || 'General Inbound Query'}</p>
                <p>{t.message || 'No description provided.'}</p>
              </div>

              {/* Resolution Notes Display if already resolved */}
              {t.resolution_notes && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700 flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" />
                    Official Resolution ({t.resolved_by || 'Support'})
                  </span>
                  <p className="text-emerald-800 leading-relaxed">{t.resolution_notes}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${isResolvedStatus(t.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    Status: {t.status || 'Pending'}
                  </span>
                  {t.order_id && <span className="font-mono text-[11px] text-[#5a00b8] font-bold">Linked: {t.order_id}</span>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setInspectorSelectedCaseId(t.id);
                      setActiveSidebarTab('inspector');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-50 text-[#5a00b8] font-bold text-xs hover:bg-purple-100 cursor-pointer flex items-center gap-1"
                  >
                    <SearchCode className="w-3.5 h-3.5" />
                    360° Inspector
                  </button>

                  {!isResolvedStatus(t.status) ? (
                    <button
                      onClick={() => {
                        setResolvingTicket(t);
                        setResolutionNotes('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setResolvingTicket(t);
                        setResolutionNotes(t.resolution_notes || '');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer flex items-center gap-1"
                      title="Edit applied resolution"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Edit Resolution
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 6: UNIVERSAL 360° CASE & CONSIGNMENT INTELLIGENCE INSPECTOR
  // ═══════════════════════════════════════════════════════════════════════════
  const renderIntelligenceInspector = () => {
    const t = inspectorRecord?.ticket;
    const o = inspectorRecord?.order;
    const callLogs = inspectorRecord?.callLogs || [];
    const emails = inspectorRecord?.emails || [];

    const formatDuration = (sec: number) => {
      if (!sec || sec <= 0) return '0s';
      const mins = Math.floor(sec / 60);
      const remSec = sec % 60;
      if (mins > 0) return `${mins}m ${remSec > 0 ? `${remSec}s` : ''}`.trim();
      return `${remSec}s`;
    };

    const totalCallSeconds = callLogs.reduce((acc: number, c: any) => acc + (Number(c.duration_seconds) || 0), 0);
    const inboundCallsCount = callLogs.filter((c: any) => c.call_type === 'incoming').length;
    const outboundCallsCount = callLogs.filter((c: any) => c.call_type !== 'incoming').length;

    // Unified Chronological Timeline
    const timelineEvents = (() => {
      const events: any[] = [];
      if (t?.created_at) {
        events.push({
          type: 'ticket_created',
          title: 'Support Case Registered',
          description: `Inquiry received via ${t.source || 'web portal'} regarding ${t.category || 'General Inbound'}. Message: "${t.message || 'Initial inquiry'}"`,
          actor: t.name || 'Customer',
          timestamp: t.created_at,
          icon: Inbox,
          badgeColor: 'bg-purple-100 text-[#5a00b8]'
        });
      }
      if (o?.created_at) {
        events.push({
          type: 'order_created',
          title: 'Consignment Order Placed',
          description: `Consignment booking created for ${o.item_name || 'consignment cargo'} to ${o.drop_address || 'destination'}.`,
          actor: o.customer_name || 'Customer',
          timestamp: o.created_at,
          icon: Package,
          badgeColor: 'bg-blue-100 text-blue-800'
        });
      }
      if (o?.dispatched_at || o?.assigned_at) {
        events.push({
          type: 'consignment_dispatched',
          title: 'Consignment Dispatched for Road Delivery',
          description: `Dispatched by ${o.dispatcher_name || o.authorized_by || 'Operations'} with Drone Unit ${o.drone_id || '700RPAV-01'} (Delivery Partner: ${o.pilot_assigned || o.delivery_partner_name || 'Assigned Driver'}).`,
          actor: o.dispatcher_name || 'Dispatcher',
          timestamp: o.dispatched_at || o.assigned_at,
          icon: Truck,
          badgeColor: 'bg-indigo-100 text-indigo-800'
        });
      }
      callLogs.forEach((c: any) => {
        events.push({
          type: 'call_logged',
          title: `Voice Call (${c.call_type === 'incoming' ? 'Incoming' : 'Outgoing'}) - ${c.outcome || 'Call Completed'}`,
          description: `Caller/Agent: ${c.agent_name || 'Support Agent'} · Contact: ${c.phone || t?.phone || 'Customer'} · Duration: ${formatDuration(c.duration_seconds)} · Remarks: "${c.remarks || 'No notes'}"`,
          actor: c.agent_name || 'Support Desk',
          timestamp: c.timestamp || (c.call_date ? `${c.call_date}T${c.call_time || '00:00'}:00` : new Date().toISOString()),
          icon: PhoneCall,
          badgeColor: c.call_type === 'incoming' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'
        });
      });
      emails.forEach((m: any) => {
        events.push({
          type: 'email_message',
          title: `Email Exchanged: ${m.subject || 'Customer Communication'}`,
          description: `From: ${m.from || 'IndoFleet Desk'} · To: ${m.to || t?.email || 'Customer'} · Message: "${m.message}"`,
          actor: m.from || m.sender_name || 'Email Gateway',
          timestamp: m.timestamp || new Date().toISOString(),
          icon: Mail,
          badgeColor: 'bg-teal-100 text-teal-800'
        });
      });
      (t?.audit_log || []).forEach((a: any) => {
        if (a.action !== 'ticket_created' && a.action !== 'call_ticket_created') {
          events.push({
            type: 'audit_event',
            title: a.action === 'status_changed' ? `Status Changed to ${a.new_value?.status || 'Updated'}` : a.action.replace(/_/g, ' ').toUpperCase(),
            description: a.new_value?.resolution_notes || `Action recorded by ${a.actor_name || 'Staff'}.`,
            actor: a.actor_name || 'System',
            timestamp: a.timestamp,
            icon: Activity,
            badgeColor: 'bg-slate-100 text-slate-800'
          });
        }
      });
      if (t?.resolved_at) {
        events.push({
          type: 'ticket_resolved',
          title: 'Support Case Officially Resolved',
          description: `Resolution Notes: "${t.resolution_notes || 'Diagnosed and closed by support desk.'}"`,
          actor: t.resolved_by || 'Support Desk',
          timestamp: t.resolved_at,
          icon: CheckCircle2,
          badgeColor: 'bg-emerald-100 text-emerald-800'
        });
      }
      if (o?.delivered_at) {
        events.push({
          type: 'flight_delivered',
          title: 'Consignment Delivered to Destination',
          description: `Consignment successfully delivered at ${o.drop_address || 'destination'}.`,
          actor: o.pilot_assigned || 'Delivery Partner',
          timestamp: o.delivered_at,
          icon: ShieldCheck,
          badgeColor: 'bg-emerald-100 text-emerald-800'
        });
      }
      return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    })();

    return (
      <div className="space-y-6">
        {/* Header & Search Bar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#5a00b8] flex items-center justify-center font-black">
                  <SearchCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Universal 360° Case &amp; Delivery Intelligence Inspector</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Search any Case ID or Order ID to inspect complete dispatch logs, delivery partner details, assigned drone hardware specs, voice calls, emails, and full audit timeline.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Input Box */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={inspectorQuery}
              onChange={(e) => {
                setInspectorQuery(e.target.value);
                setInspectorSelectedCaseId(null);
              }}
              placeholder="Enter Case ID (e.g. CASE-101, TKT-...) or Order ID (e.g. ORD-1002, INW-DEL-...)..."
              className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#5a00b8] focus:ring-2 focus:ring-purple-100 transition shadow-inner"
            />
            {inspectorQuery && (
              <button
                onClick={() => {
                  setInspectorQuery('');
                  setInspectorSelectedCaseId(null);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Select Suggestion Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Quick Inquiries:</span>
            {tickets.slice(0, 6).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setInspectorSelectedCaseId(item.id);
                  setInspectorQuery(item.id);
                }}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border transition cursor-pointer ${
                  (inspectorSelectedCaseId || inspectorQuery) === item.id
                    ? 'bg-[#5a00b8] text-white border-[#5a00b8]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50 hover:text-[#5a00b8]'
                }`}
              >
                {item.id} ({item.name?.split(' ')[0] || 'Case'})
              </button>
            ))}
          </div>
        </div>

        {/* Intelligence Dossier Output */}
        {!t && !o ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <SearchCode className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-black text-slate-800">Enter a Case ID or Order ID</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Type any ticket identifier (e.g. {tickets[0]?.id || 'TKT-101'}) or consignment reference to retrieve the complete dispatch, flight telemetry, voice records and customer communication dossier.
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Dossier Summary Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-black text-[#5a00b8] bg-purple-50 px-3.5 py-1.5 rounded-xl border border-purple-200">
                    {t?.id || o?.order_number || o?.id}
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {t?.name || o?.customer_name || 'Customer Inquiry Dossier'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Category: <strong className="text-slate-800">{t?.category || 'Logistics Operations Consultation'}</strong> · Registered: {t?.created_at ? new Date(t.created_at).toLocaleString('en-IN') : o?.created_at ? new Date(o.created_at).toLocaleString('en-IN') : 'Recent'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {t && (
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${isResolvedStatus(t.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      Support: {t.status || 'Open'}
                    </span>
                  )}
                  {o && (
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-purple-100 text-[#5a00b8]">
                      Status: {o.status === 'in-flight' ? 'OUT FOR DELIVERY' : (o.status || 'Active')}
                    </span>
                  )}
                </div>
              </div>

              {/* ── SUB-TABS NAVIGATION BAR ──────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setInspectorSubTab('overview')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    inspectorSubTab === 'overview'
                      ? 'bg-white text-[#5a00b8] shadow-xs border border-purple-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>360° Overview</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectorSubTab('flight')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    inspectorSubTab === 'flight'
                      ? 'bg-white text-[#5a00b8] shadow-xs border border-purple-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Delivery &amp; Logistics</span>
                  {o && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Order Linked" />}
                </button>

                <button
                  type="button"
                  onClick={() => setInspectorSubTab('calls')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    inspectorSubTab === 'calls'
                      ? 'bg-white text-[#5a00b8] shadow-xs border border-purple-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Voice Call Logs</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                    inspectorSubTab === 'calls' ? 'bg-purple-100 text-[#5a00b8]' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {callLogs.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectorSubTab('emails')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    inspectorSubTab === 'emails'
                      ? 'bg-white text-[#5a00b8] shadow-xs border border-purple-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Messages</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                    inspectorSubTab === 'emails' ? 'bg-purple-100 text-[#5a00b8]' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {emails.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectorSubTab('form')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    inspectorSubTab === 'form'
                      ? 'bg-white text-[#5a00b8] shadow-xs border border-purple-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Web Inquiry &amp; Form</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectorSubTab('timeline')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    inspectorSubTab === 'timeline'
                      ? 'bg-white text-[#5a00b8] shadow-xs border border-purple-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Audit &amp; Case Timeline</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                    inspectorSubTab === 'timeline' ? 'bg-purple-100 text-[#5a00b8]' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {timelineEvents.length}
                  </span>
                </button>
              </div>

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* SUB-TAB 1: 360° OVERVIEW                                     */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {inspectorSubTab === 'overview' && (
                <div className="space-y-6 pt-2 animate-in fade-in duration-150">
                  {/* KPI Highlights Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block">Consignment Dispatch</span>
                      <p className="text-sm font-black text-slate-900 truncate">{o?.order_number || o?.id || t?.order_id || 'Not Linked'}</p>
                      <span className="text-[10px] font-bold text-purple-900 uppercase">{o?.status === 'in-flight' ? 'OUT FOR DELIVERY' : (o?.status || 'Direct Inquiry')}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 block">Voice Consultation</span>
                      <p className="text-sm font-black text-slate-900">{callLogs.length} Records</p>
                      <span className="text-[10px] text-sky-700 font-medium">Total: {formatDuration(totalCallSeconds)}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-100 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block">Email Correspondence</span>
                      <p className="text-sm font-black text-slate-900">{emails.length} Messages</p>
                      <span className="text-[10px] text-teal-700 font-medium">Direct Inbound / Outbound</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Case Priority &amp; Desk</span>
                      <p className="text-sm font-black text-slate-900 capitalize">{t?.priority || 'Normal Priority'}</p>
                      <span className="text-[10px] text-emerald-700 font-medium">{t?.category || 'General Support'}</span>
                    </div>
                  </div>

                  {/* 2-Column Summary Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Customer Omnichannel Profile */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 text-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[#5a00b8]" />
                          <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs">Customer Profile &amp; Contact</h4>
                        </div>
                        <span className="px-2 py-0.5 bg-purple-100 text-[#5a00b8] font-bold rounded text-[10px] uppercase">
                          {t?.source ? `Source: ${t.source}` : 'Web Customer'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                            <strong className="text-slate-900 text-sm">{t?.name || o?.customer_name || 'Client'}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                            {t?.phone || o?.customer_phone ? (
                              <a href={`tel:${t?.phone || o?.customer_phone}`} className="font-mono text-[#5a00b8] font-bold hover:underline">
                                {t?.phone || o?.customer_phone}
                              </a>
                            ) : (
                              <span className="text-slate-400">Not provided</span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                            {t?.email || o?.customer_email ? (
                              <a href={`mailto:${t?.email || o?.customer_email}`} className="text-slate-800 font-medium hover:underline truncate block">
                                {t?.email || o?.customer_email}
                              </a>
                            ) : (
                              <span className="text-slate-400">Not provided</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Preferred Callback Window</span>
                            <span className="text-slate-700 font-medium">{t?.preferred_time || t?.preferred_callback || 'Immediate Callback'}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Destination Address</span>
                          <p className="font-medium text-slate-800 flex items-start gap-1.5 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span>{o?.drop_address || o?.destination_address || t?.delivery_address || 'Customer destination site'}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Logistics Quick Brief */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 text-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-[#5a00b8]" />
                          <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs">Core Logistics &amp; Hardware Brief</h4>
                        </div>
                        <button
                          onClick={() => setInspectorSubTab('flight')}
                          className="text-[11px] font-bold text-[#5a00b8] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Full Details <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Drone Hardware</span>
                            <strong className="font-mono text-slate-900">{o?.drone_id || t?.drone_serial || '700RPAV-01'}</strong>
                            <span className="text-[10px] text-slate-500 block">Serial: {o?.drone_serial || t?.drone_serial || 'SN-700RPAV-IND'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivery Partner / Driver</span>
                            <strong className="text-slate-900 block">{o?.pilot_assigned || o?.delivery_partner_name || 'Assigned Driver'}</strong>
                            {o?.pilot_phone && (
                              <a href={`tel:${o.pilot_phone}`} className="font-mono text-[#5a00b8] text-[11px] font-bold hover:underline">
                                {o.pilot_phone}
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Logistics Dispatcher (Staff)</span>
                            <span className="text-slate-800 font-bold">{o?.dispatcher_name || o?.authorized_by || 'IndoWings Dispatch Operations'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Delivery Window</span>
                            <span className="font-bold text-purple-900">
                              {o?.delivered_at ? `Delivered: ${new Date(o.delivered_at).toLocaleTimeString('en-IN')}` : o?.estimated_eta || 'Standard delivery window'}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Consignment Package Details</span>
                          <span className="text-slate-800 font-medium">{o?.item_name || o?.items?.[0]?.name || t?.category || 'Standard High-Priority Consignment'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resolution Notes Banner (if available) */}
                  {t?.resolution_notes && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1.5 text-xs">
                      <span className="font-bold text-emerald-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Official Case Resolution
                      </span>
                      <p className="text-emerald-900 font-medium">{t.resolution_notes}</p>
                      <p className="text-[10px] text-emerald-700">Resolved by: {t.resolved_by || 'IndoFleet Support Desk'}</p>
                    </div>
                  )}

                  {/* Quick Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        if (t) {
                          setCallingTicket(t);
                          setCallType('outgoing');
                        } else {
                          setAddCallOpen(true);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition cursor-pointer shadow-xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Log Call With Customer
                    </button>

                    <button
                      onClick={() => {
                        if (t) {
                          setEmailingTicket(t);
                          setEmailSubject(`Re: Case ${t.id} - IndoFleet Support Update`);
                          setEmailBody(`Dear ${t.name},\n\nRegarding your inquiry (${t.id})...\n\nBest regards,\nIndoFleet Support Operations`);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition cursor-pointer shadow-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Send Email Message
                    </button>

                    {t && !isResolvedStatus(t.status) && (
                      <button
                        onClick={() => {
                          setResolvingTicket(t);
                          setResolutionNotes('');
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Case Resolved
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* SUB-TAB 2: DELIVERY & LOGISTICS                              */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {inspectorSubTab === 'flight' && (
                <div className="space-y-6 pt-2 animate-in fade-in duration-150">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6 text-xs">
                    {/* Real-time Location & Telemetry Landmark Banner for Support */}
                    <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#5a00b8] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <MapPin className="w-5 h-5 animate-bounce" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider block">Live Current Location (Landmark)</span>
                          <h4 className="font-bold text-sm text-slate-900">
                            {o?.current_location_name || o?.last_known_location?.address || `${o?.pickup_address?.split(',')?.[0] || 'Assembly Facility'} to ${o?.drop_address?.split(',')?.[0] || 'Customer Destination'} Transit Route`}
                          </h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-xs flex items-center gap-1.5 border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Real Status: {o?.status === 'delivered' ? 'DELIVERED' : o?.status === 'on-hold' ? 'ON HOLD (STOPPED)' : o?.status === 'in-flight' ? 'OUT FOR DELIVERY' : (o?.status || 'IN TRANSIT').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Live Interactive Map */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                          Live Vehicle GPS Route &amp; Carrier Telemetry
                        </span>
                        <span className="text-xs font-mono font-bold text-[#5a00b8]">
                          {o?.drone_model || '700RPAV'} &bull; {o?.drone_id || '700RPAV-01'}
                        </span>
                      </div>
                      <CustomerOrderLiveMap order={o} className="h-80 sm:h-96" />
                    </div>

                    {/* Logistics Dispatch Details Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Logistics Dispatcher (Staff)</span>
                        <p className="font-bold text-slate-900 text-sm">{o?.dispatcher_name || o?.authorized_by || 'IndoWings Dispatch Operations'}</p>
                        <span className="text-[10px] text-slate-500">Authorized Consignment Departure</span>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dispatched Timestamp</span>
                        <p className="font-bold text-slate-900 text-sm">
                          {o?.dispatched_at || o?.assigned_at ? new Date(o.dispatched_at || o.assigned_at).toLocaleString('en-IN') : 'Automated Consignment Dispatch'}
                        </p>
                        <span className="text-[10px] text-slate-500">Departure recorded</span>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ETA / Delivery Time</span>
                        <p className="font-bold text-purple-900 text-sm">
                          {o?.delivered_at ? `Delivered: ${new Date(o.delivered_at).toLocaleString('en-IN')}` : o?.estimated_eta || 'Standard delivery window'}
                        </p>
                        <span className="text-[10px] text-slate-500">{o?.delivered_at ? 'Completed' : 'Estimated Target'}</span>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Delivery Partner / Driver</span>
                        <p className="font-bold text-slate-900 text-sm">{o?.pilot_assigned || o?.delivery_partner_name || 'Assigned Driver'}</p>
                        {o?.pilot_phone ? (
                          <a href={`tel:${o.pilot_phone}`} className="font-mono text-[#5a00b8] font-bold hover:underline flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {o.pilot_phone}
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">Direct phone on standby</span>
                        )}
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Drone Hardware Units</span>
                        <p className="font-mono font-bold text-slate-900 text-sm">{o?.drone_id || t?.drone_serial || '700RPAV-01'}</p>
                        <span className="text-[10px] text-slate-500">Serial: {o?.drone_serial || t?.drone_serial || 'SN-700RPAV-IND'} · Model: {o?.drone_model || '700RPAV'}</span>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Consignment Package Details</span>
                        <p className="font-bold text-slate-900 text-sm">{o?.item_name || o?.items?.[0]?.name || t?.category || 'Standard Consignment'}</p>
                        <span className="text-[10px] text-slate-500">Package Type: {o?.package_type || 'Express Road Consignment'}</span>
                      </div>
                    </div>

                    {/* Destination and Pickup Coordinates */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        <h5 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Delivery Destination &amp; Route Path</h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Drop Destination</span>
                          <p className="text-slate-800 font-medium text-sm mt-0.5">
                            {o?.drop_address || o?.destination_address || t?.delivery_address || 'Customer destination drop location'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dispatch Base / Origin</span>
                          <p className="text-slate-800 font-medium text-sm mt-0.5">
                            {o?.pickup_address || 'IndoWings Central Flight Operations Terminal'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Flight Milestones Stepper if available on order */}
                    {o?.timeline && o.timeline.length > 0 && (
                      <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3">
                        <h5 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                          <Activity className="w-4 h-4 text-[#5a00b8]" /> Flight Milestones &amp; Waypoints
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                          {o.timeline.map((step: any, idx: number) => (
                            <div key={idx} className={`p-3 rounded-xl border ${step.done ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                              <div className="flex items-center justify-between font-bold text-[11px]">
                                <span>{step.step}</span>
                                {step.done && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                              </div>
                              <span className="text-[10px] opacity-80 block mt-1">{step.time || 'Pending'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* SUB-TAB 3: VOICE CALL LOGS (FULL DETAILS)                     */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {inspectorSubTab === 'calls' && (
                <div className="space-y-4 pt-2 animate-in fade-in duration-150">
                  {/* Voice Metrics Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Total Calls</span>
                        <strong className="text-slate-900 text-sm">{callLogs.length} Records</strong>
                      </div>
                      <div className="h-6 w-px bg-purple-200 hidden sm:block" />
                      <div>
                        <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Cumulative Duration</span>
                        <strong className="text-slate-900 text-sm">{formatDuration(totalCallSeconds)}</strong>
                      </div>
                      <div className="h-6 w-px bg-purple-200 hidden sm:block" />
                      <div>
                        <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Incoming / Outbound</span>
                        <strong className="text-slate-900 text-sm">{inboundCallsCount} Inbound · {outboundCallsCount} Outbound</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (t) {
                          setCallingTicket(t);
                          setCallType('outgoing');
                        } else {
                          setAddCallOpen(true);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5a00b8] text-white font-bold text-xs hover:bg-[#480094] transition cursor-pointer"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      Record New Call
                    </button>
                  </div>

                  {callLogs.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 space-y-2">
                      <PhoneCall className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">No voice consultation records found for this case or consignment.</p>
                      <p className="text-[11px] text-slate-400">Log a call with the customer or pilot to maintain audit integrity.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {callLogs.map((c: any, idx: number) => {
                        const isIncoming = c.call_type === 'incoming';
                        return (
                          <div key={idx} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-purple-200 transition">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                              <div className="flex items-center gap-2.5">
                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  isIncoming ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-[#5a00b8]'
                                }`}>
                                  {isIncoming ? <PhoneIncoming className="w-3.5 h-3.5" /> : <PhoneCall className="w-3.5 h-3.5" />}
                                  {isIncoming ? 'Incoming Call' : 'Outgoing Call'}
                                </span>

                                <span className="font-black text-slate-900 text-xs">
                                  {c.customer_name || t?.name || o?.customer_name || 'Customer'}
                                </span>

                                {(c.phone || t?.phone) && (
                                  <a href={`tel:${c.phone || t?.phone}`} className="font-mono text-xs font-bold text-[#5a00b8] hover:underline">
                                    {c.phone || t?.phone}
                                  </a>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs">
                                <span className="px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                                  Duration: {formatDuration(c.duration_seconds)}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {c.timestamp ? new Date(c.timestamp).toLocaleString('en-IN') : `${c.call_date || ''} ${c.call_time || ''}`}
                                </span>
                              </div>
                            </div>

                            {/* Call Outcome Badge & Attending Agent */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outcome:</span>
                                <span className={`px-2.5 py-0.5 rounded-lg font-bold text-xs ${
                                  (c.outcome || '').includes('Resolved')
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : (c.outcome || '').includes('Callback')
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-purple-50 text-[#5a00b8] border border-purple-100'
                                }`}>
                                  {c.outcome || 'Call Completed'}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-500">
                                Logged by: <strong className="text-slate-800">{c.agent_name || 'Support Staff'}</strong>
                                {c.order_id && <span className="font-mono ml-2 text-purple-700">Ref: {c.order_id}</span>}
                              </div>
                            </div>

                            {/* Full Remarks Box */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-700 leading-relaxed font-sans">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Agent Conversation Remarks:</span>
                              <p className="whitespace-pre-wrap">{c.remarks || 'No detailed remarks recorded for this call.'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* SUB-TAB 4: EMAIL COMMUNICATIONS                             */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {inspectorSubTab === 'emails' && (
                <div className="space-y-4 pt-2 animate-in fade-in duration-150">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-sky-50/60 rounded-2xl border border-sky-100">
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Total Emails</span>
                        <strong className="text-slate-900 text-sm">{emails.length} Exchanged</strong>
                      </div>
                      <div className="h-6 w-px bg-sky-200" />
                      <div>
                        <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Customer Mailbox</span>
                        <span className="font-mono text-slate-800 font-bold">{t?.email || o?.customer_email || 'Not configured'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (t) {
                          setEmailingTicket(t);
                          setEmailSubject(`Re: Case ${t.id} - IndoFleet Support Update`);
                          setEmailBody(`Dear ${t.name},\n\nRegarding your flight inquiry (${t.id})...\n\nBest regards,\nIndoFleet Support Operations`);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Compose Email
                    </button>
                  </div>

                  {emails.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 space-y-2">
                      <Mail className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">No email correspondence registered for this case.</p>
                      <p className="text-[11px] text-slate-400">Click Compose Email above to initiate formal email communication.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {emails.map((m: any, idx: number) => (
                        <div key={idx} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                            <div className="space-y-0.5">
                              <span className="font-black text-sm text-slate-900 block">{m.subject || 'IndoFleet Customer Update'}</span>
                              <div className="flex flex-wrap items-center gap-2 text-slate-500 text-[11px]">
                                <span>From: <strong className="text-slate-800">{m.from || 'support@indofleet.com'}</strong></span>
                                <span>·</span>
                                <span>To: <strong className="text-slate-800">{m.to || t?.email || 'Customer'}</strong></span>
                              </div>
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {m.timestamp ? new Date(m.timestamp).toLocaleString('en-IN') : 'Recent'}
                            </span>
                          </div>

                          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                            {m.message || 'No content.'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* SUB-TAB 5: WEB INQUIRY & FORM                                */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {inspectorSubTab === 'form' && (
                <div className="space-y-4 pt-2 animate-in fade-in duration-150">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#5a00b8]" />
                        <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs">Web Form Query Submission</h4>
                      </div>
                      <span className="font-mono text-xs font-black text-purple-800 bg-purple-100 px-2.5 py-1 rounded-lg">
                        {t?.id || 'Form Submission'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submitted By</span>
                        <p className="font-bold text-slate-900 text-sm">{t?.name || o?.customer_name || 'Client'}</p>
                        <span className="text-[10px] text-slate-500">Contact: {t?.phone || t?.email || 'Registered profile'}</span>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Query Topic / Category</span>
                        <p className="font-bold text-slate-900 text-sm">{t?.category || 'General Support'}</p>
                        <span className="text-[10px] text-slate-500">Priority: {t?.priority || 'Normal'}</span>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Preferred Callback Window</span>
                        <p className="font-bold text-purple-900 text-sm">{t?.preferred_time || t?.preferred_callback || 'Immediate Callback'}</p>
                        <span className="text-[10px] text-slate-500">Scheduled response slot</span>
                      </div>
                    </div>

                    {/* Verbatim Inbound Text */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Original Customer Inbound Message:</span>
                      <div className="p-3.5 bg-purple-50/40 rounded-xl border border-purple-100 text-slate-800 text-xs leading-relaxed font-sans whitespace-pre-wrap">
                        {t?.message || 'No written message provided with this submission.'}
                      </div>
                    </div>

                    {t?.delivery_address && (
                      <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Provided Delivery Address</span>
                        <p className="text-slate-800 font-medium">{t.delivery_address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════ */}
              {/* SUB-TAB 6: AUDIT & CASE TIMELINE                            */}
              {/* ═════════════════════════════════════════════════════════════ */}
              {inspectorSubTab === 'timeline' && (
                <div className="space-y-4 pt-2 animate-in fade-in duration-150">
                  <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-950">Complete Case &amp; Flight Audit Trail ({timelineEvents.length} Events)</span>
                    <span className="text-[11px] text-purple-700 font-medium">Sorted chronologically</span>
                  </div>

                  {timelineEvents.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                      No lifecycle events logged for this reference yet.
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                      {timelineEvents.map((evt: any, idx: number) => {
                        const IconComponent = evt.icon || Activity;
                        return (
                          <div key={idx} className="relative group">
                            {/* Dot on line */}
                            <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-[#5a00b8] flex items-center justify-center shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#5a00b8]" />
                            </div>

                            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 text-xs hover:border-purple-200 transition">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1 ${evt.badgeColor || 'bg-slate-100 text-slate-800'}`}>
                                    <IconComponent className="w-3 h-3" />
                                    {evt.title}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {evt.timestamp ? new Date(evt.timestamp).toLocaleString('en-IN') : 'Recent'}
                                </span>
                              </div>

                              <p className="text-slate-700 leading-relaxed">{evt.description}</p>

                              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                                <span>Actor: <strong className="text-slate-700">{evt.actor}</strong></span>
                                <span className="font-mono text-slate-400 uppercase">{evt.type}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RETURN WRAPPER (SIDEBAR NAVIGATION LAYOUT)
  // ═══════════════════════════════════════════════════════════════════════════
  if (embedded) {
    const embeddedTabItems = supportNavItems.filter(i => i.id !== 'profile');
    return (
      <div className="space-y-5 bg-[#f8fafc] text-slate-900 pb-6 font-sans">
        {/* Horizontal Tab Pills for embedded mode */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-wrap items-center gap-2">
          {embeddedTabItems.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveSidebarTab(id as typeof activeSidebarTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSidebarTab === id
                  ? 'bg-[#5a00b8] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/70 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
              {badge !== null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black shrink-0 ${
                  activeSidebarTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Alert banners */}
        {newTicketAlert && (
          <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-300 animate-bounce" />
              <span>{newTicketAlert}</span>
            </div>
            <button onClick={() => setNewTicketAlert(null)} className="hover:opacity-80 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {supportError && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 flex items-center justify-between">
            <span>{supportError}</span>
            <button onClick={() => setSupportError('')} className="cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Content Area */}
        <div>
          {activeSidebarTab === 'overview' && renderOverviewAnalytics()}
          {activeSidebarTab === 'tickets' && renderTicketsWorkbench()}
          {activeSidebarTab === 'emails' && renderEmailsWorkbench()}
          {activeSidebarTab === 'calls' && renderCallsWorkbench()}
          {activeSidebarTab === 'forms' && renderFormQueriesWorkbench()}
          {activeSidebarTab === 'inspector' && renderIntelligenceInspector()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pt-24 sm:pt-28 pb-16 font-sans">
      {/* ── MOBILE SLIDE-OVER DRAWER ────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[120] md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />

          <div className="relative w-[85vw] max-w-[320px] bg-white h-full shadow-2xl flex flex-col justify-between p-5 z-10 animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-black shrink-0">
                    <Headphones className="w-5 h-5 text-[#5a00b8]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">Support Desk</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">IndoFleet Operations</p>
                  </div>
                </div>

                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1.5 text-xs font-bold">
                {supportNavItems.map(({ id, label, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveSidebarTab(id as typeof activeSidebarTab);
                      setMobileSidebarOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all text-left cursor-pointer group ${
                      activeSidebarTab === id
                        ? 'bg-[#5a00b8] text-white shadow-md shadow-purple-900/10 font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${activeSidebarTab === id ? 'text-white' : 'text-slate-400 group-hover:text-[#5a00b8]'}`} />
                      <span className="truncate">{label}</span>
                    </div>
                    {badge !== null && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 ${activeSidebarTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Current User Card at bottom of Drawer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-6">
              <button
                onClick={() => {
                  setActiveSidebarTab('profile');
                  setMobileSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5a00b8] to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {currentUser?.name?.[0]?.toUpperCase() || 'S'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || 'Support Agent'}</p>
                  <p className="text-[10px] text-purple-700 font-semibold truncate">
                    {currentUser?.role ? currentUser.role.replace(/_/g, ' ') : 'Support Staff'}
                  </p>
                </div>
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── WORKSPACE CONTAINER WITH STICKY SIDEBAR ──────────────────────── */}
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6">
        {/* Mobile Header Toggle */}
        <div className="md:hidden mb-4 flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-[#5a00b8] transition cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {supportNavItems.find(i => i.id === activeSidebarTab)?.label || 'Support Desk'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">IndoFleet Omnichannel Operations</p>
            </div>
          </div>

          <button
            onClick={() => fetchTicketsAndOrders()}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-purple-50 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#5a00b8]' : ''}`} />
          </button>
        </div>

        {/* Real-time Alert Banner */}
        {newTicketAlert && (
          <div className="mb-4 bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-2.5 px-4 rounded-2xl text-center text-xs font-bold flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-300 animate-bounce" />
              <span>{newTicketAlert}</span>
            </div>
            <button onClick={() => setNewTicketAlert(null)} className="hover:opacity-80 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {supportError && (
          <div role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 flex items-center justify-between">
            <span>{supportError}</span>
            <button onClick={() => setSupportError('')} className="cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Desktop Sidebar Layout */}
        <div className="flex items-start gap-6">
          {/* Desktop Sticky Sidebar */}
          <aside className="hidden md:flex flex-col justify-between w-64 shrink-0 sticky top-28 bg-white border border-slate-200 rounded-3xl p-4 shadow-xs min-h-[calc(100vh-140px)]">
            <div className="space-y-4">
              {/* Brand Header */}
              <div className="flex items-center gap-3 px-2 py-1">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-black shrink-0 shadow-2xs">
                  <Headphones className="w-5 h-5 text-[#5a00b8]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">Support Desk</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">IndoFleet Helpdesk</p>
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1 text-xs font-bold pt-2">
                {supportNavItems.map(({ id, label, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveSidebarTab(id as typeof activeSidebarTab);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all text-left cursor-pointer group ${
                      activeSidebarTab === id
                        ? 'bg-[#5a00b8] text-white shadow-md shadow-purple-900/10 font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${activeSidebarTab === id ? 'text-white' : 'text-slate-400 group-hover:text-[#5a00b8]'}`} />
                      <span className="truncate">{label}</span>
                    </div>
                    {badge !== null && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 ${activeSidebarTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Current User Card at bottom of Sidebar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setActiveSidebarTab('profile');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                title="Open profile"
                className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5a00b8] to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {currentUser?.name?.[0]?.toUpperCase() || 'S'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || 'Support Staff'}</p>
                  <p className="text-[10px] text-purple-700 font-semibold truncate">
                    {currentUser?.role ? currentUser.role.replace(/_/g, ' ') : 'Support Staff'}
                  </p>
                </div>
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </aside>

          {/* Right Main Content Area */}
          <main className="flex-1 w-full min-w-0">
            {activeSidebarTab === 'overview' && renderOverviewAnalytics()}
            {activeSidebarTab === 'tickets' && renderTicketsWorkbench()}
            {activeSidebarTab === 'emails' && renderEmailsWorkbench()}
            {activeSidebarTab === 'calls' && renderCallsWorkbench()}
            {activeSidebarTab === 'forms' && renderFormQueriesWorkbench()}
            {activeSidebarTab === 'inspector' && renderIntelligenceInspector()}
            {activeSidebarTab === 'profile' && (
              <ProfilePage
                onNavigate={onNavigate || (() => {})}
                currentUser={currentUser}
                onUpdateUser={() => {}}
                embedded={true}
              />
            )}
          </main>
        </div>
      </div>

      {/* ── MODAL 1: ADD CALL LOG ─────────────────────────────────────── */}
      {addCallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateCallLog} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Add Call Log</h3>
                <p className="text-xs text-slate-500">Creates a support ticket with the call in its history.</p>
              </div>
              <button type="button" onClick={() => setAddCallOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Close call log form">
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-[#5a00b8]"
                  />
                </label>
              ))}
              <label className="space-y-1 text-[11px] font-bold text-slate-600">
                Call direction
                <select
                  value={newCall.call_type}
                  onChange={(event) => setNewCall((current) => ({ ...current, call_type: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium cursor-pointer"
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium cursor-pointer"
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium"
                />
              </label>
              <label className="space-y-1 text-[11px] font-bold text-slate-600">
                Call time
                <input
                  type="time"
                  value={newCall.call_time}
                  onChange={(event) => setNewCall((current) => ({ ...current, call_time: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium"
                />
              </label>
              <label className="space-y-1 text-[11px] font-bold text-slate-600">
                Duration (seconds)
                <input
                  type="number"
                  min="0"
                  value={newCall.duration_seconds}
                  onChange={(event) => setNewCall((current) => ({ ...current, duration_seconds: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium"
                />
              </label>
              <label className="space-y-1 text-[11px] font-bold text-slate-600">
                Outcome
                <input
                  value={newCall.outcome}
                  onChange={(event) => setNewCall((current) => ({ ...current, outcome: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium resize-none focus:outline-none focus:border-[#5a00b8]"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAddCallOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50">
                Cancel
              </button>
              <button disabled={isLoggingCall} className="rounded-xl bg-[#5a00b8] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer shadow-xs">
                {isLoggingCall ? 'Saving...' : 'Save Call Log'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL 2: RESOLVE TICKET & DISPATCH EMAIL ─────────────────── */}
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
              <button onClick={() => setResolvingTicket(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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
                <button type="button" onClick={() => setResolvingTicket(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolving || !resolutionNotes.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
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

      {/* ── MODAL 3: LOG / START PHONE CALL ──────────────────────────── */}
      {callingTicket && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-bold">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Phone Consultation: {callingTicket.name}</h3>
                  <a href={`tel:${callingTicket.phone}`} className="text-xs font-mono font-bold text-[#5a00b8] hover:underline">
                    {callingTicket.phone}
                  </a>
                </div>
              </div>
              <button onClick={() => setCallingTicket(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogCall} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Call Direction</label>
                <select
                  value={callType}
                  onChange={(event) => setCallType(event.target.value as 'incoming' | 'outgoing')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium cursor-pointer"
                >
                  <option value="incoming">Incoming</option>
                  <option value="outgoing">Outgoing</option>
                </select>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl flex items-center justify-between">
                <span>Click to initiate direct call:</span>
                <a href={`tel:${callingTicket.phone}`} className="px-3.5 py-1.5 bg-[#5a00b8] text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call {callingTicket.phone}</span>
                </a>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Call Outcome</label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:outline-none focus:border-[#5a00b8] cursor-pointer"
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
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#5a00b8]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Agent Remarks &amp; Customer Response</label>
                <textarea
                  rows={3}
                  value={callRemarks}
                  onChange={(e) => setCallRemarks(e.target.value)}
                  placeholder="Customer confirmed terrace coordinates; clarified wind hold limits..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#5a00b8] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCallingTicket(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingCall}
                  className="px-5 py-2.5 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {isLoggingCall ? 'Saving...' : 'Save Call Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: DIRECT EMAIL COMPOSER ───────────────────────────── */}
      {emailingTicket && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Direct Email to {emailingTicket.name}</h3>
                  <p className="text-xs text-slate-400">Destination: {emailingTicket.email}</p>
                </div>
              </div>
              <button onClick={() => setEmailingTicket(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#5a00b8] font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Message Content</label>
                <textarea
                  rows={6}
                  required
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#5a00b8] resize-none font-medium leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEmailingTicket(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail || !emailBody.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
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

      {/* ── MODAL 5: FULL TICKET DETAILS DRAWER ──────────────────────── */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-black text-[#5a00b8] bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">{selectedTicket.id}</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedTicket.category}</h3>
                  <p className="text-xs text-slate-400">Created: {new Date(selectedTicket.created_at).toLocaleString('en-IN')}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Customer & Order Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Customer Identity</span>
                <p className="font-bold text-slate-900 text-sm">{selectedTicket.name}</p>
                <p className="text-slate-600">
                  <a href={`tel:${selectedTicket.phone}`} className="font-mono text-[#5a00b8] font-bold hover:underline">
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5a00b8] block">Associated Order Reference</span>
                <p className="font-mono font-bold text-sm text-[#5a00b8]">{selectedTicket.order_id || 'Not Linked to Order'}</p>
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

            <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
              <label htmlFor="support-internal-note" className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Internal note (team only)
              </label>
              <textarea
                id="support-internal-note"
                rows={3}
                value={internalNoteDraft}
                onChange={(event) => setInternalNoteDraft(event.target.value)}
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs focus:outline-none"
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
                className="rounded-lg bg-amber-700 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50 cursor-pointer"
              >
                Save internal note
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setSelectedTicket(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs cursor-pointer">
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
