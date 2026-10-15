import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  QrCode,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Send,
  RefreshCw,
  User,
  ShieldCheck,
  FileText,
  LogOut,
  ExternalLink,
  ChevronRight,
  X,
  Check,
  Calendar,
  Layers,
  Inbox,
  Sparkles,
  Eye,
  Truck
} from 'lucide-react';
import { DeliveryUser } from '../types';
import { API_BASE_URL } from '../config/api';
import { ProfilePage } from './ProfilePage';

interface SupportDeskPageProps {
  currentUser: DeliveryUser | null;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  embedded?: boolean;
}

export const SupportDeskPage: React.FC<SupportDeskPageProps> = ({
  currentUser,
  onNavigate,
  onLogout,
  embedded = false
}) => {
  // Tabs: 'forms' (Website forms) | 'qr_scans' (Customer QR scans) | 'overview' | 'profile'
  const [activeTab, setActiveTab] = useState<'forms' | 'qr_scans' | 'overview' | 'profile'>('forms');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [supportError, setSupportError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [resolvingTicket, setResolvingTicket] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvingStatus, setResolvingStatus] = useState('resolved');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Email Reply Modal
  const [replyingTicket, setReplyingTicket] = useState<any | null>(null);
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const supportToken = localStorage.getItem('iw_delivery_token') || '';
  const supportHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${supportToken}`
  };

  const fetchTickets = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/tickets`, {
        headers: supportHeaders
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.requests || []);
      } else {
        const result = await res.json().catch(() => ({}));
        setSupportError(result.error || 'Could not load support requests.');
      }
    } catch (err: any) {
      console.error('[SupportDesk] Error fetching tickets:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(() => {
      fetchTickets(true);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  // Split tickets between Website Form Submissions and Customer QR Scans
  const isQrScanTicket = (t: any) => {
    const src = String(t.source || '').toLowerCase();
    const cat = String(t.category || '').toLowerCase();
    const msg = String(t.message || '').toLowerCase();
    return (
      src === 'drone_qr_scan' ||
      src === 'qr' ||
      src === 'qr_scan' ||
      cat.includes('qr') ||
      msg.includes('[drone qr scan') ||
      Boolean(t.drone_serial && !t.call_logs?.length)
    );
  };

  const websiteFormTickets = useMemo(() => {
    return tickets.filter((t) => !isQrScanTicket(t));
  }, [tickets]);

  const customerQrTickets = useMemo(() => {
    return tickets.filter((t) => isQrScanTicket(t));
  }, [tickets]);

  // Active tickets according to current tab
  const activeList = useMemo(() => {
    const base = activeTab === 'qr_scans' ? customerQrTickets : websiteFormTickets;
    return base.filter((item) => {
      // Status filter
      if (statusFilter !== 'all') {
        const itemStatus = String(item.status || 'open').toLowerCase();
        if (statusFilter === 'open' && itemStatus !== 'open' && itemStatus !== 'pending') return false;
        if (statusFilter === 'in_progress' && itemStatus !== 'in_progress') return false;
        if (statusFilter === 'resolved' && itemStatus !== 'resolved' && itemStatus !== 'closed') return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const str = `${item.id || ''} ${item.name || ''} ${item.email || ''} ${item.phone || ''} ${item.category || ''} ${item.message || ''} ${item.drone_serial || ''} ${item.order_id || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }

      return true;
    });
  }, [activeTab, websiteFormTickets, customerQrTickets, statusFilter, searchQuery]);

  // Overall Stats
  const stats = useMemo(() => {
    const totalWeb = websiteFormTickets.length;
    const pendingWeb = websiteFormTickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length;
    const totalQr = customerQrTickets.length;
    const pendingQr = customerQrTickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length;
    const totalResolved = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;

    return { totalWeb, pendingWeb, totalQr, pendingQr, totalResolved, totalOverall: tickets.length };
  }, [websiteFormTickets, customerQrTickets, tickets]);

  // Update Status / Resolution handler
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTicket) return;

    setIsUpdatingStatus(true);
    setSupportError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/tickets/${resolvingTicket.id}`, {
        method: 'PATCH',
        headers: supportHeaders,
        body: JSON.stringify({
          status: resolvingStatus,
          resolution_notes: resolutionNotes.trim(),
          agent_name: currentUser?.name || 'Support Desk'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update ticket status.');

      showToast(`Ticket ${resolvingTicket.id} updated to ${resolvingStatus.toUpperCase()}`);
      setResolvingTicket(null);
      setResolutionNotes('');
      fetchTickets(true);
    } catch (err: any) {
      setSupportError(err.message || 'Error updating ticket.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Send Direct Email Reply
  const handleSendEmailReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTicket || !replyingTicket.email) return;

    setIsSendingReply(true);
    setSupportError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/tickets/${replyingTicket.id}/send-email`, {
        method: 'POST',
        headers: supportHeaders,
        body: JSON.stringify({
          subject: replySubject.trim() || `IndoFleet Support Update: Ticket ${replyingTicket.id}`,
          message: replyMessage.trim(),
          agent_name: currentUser?.name || 'IndoFleet Support Desk'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reply email.');

      showToast(`Reply sent successfully to ${replyingTicket.email}!`);
      setReplyingTicket(null);
      setReplyMessage('');
      fetchTickets(true);
    } catch (err: any) {
      setSupportError(err.message || 'Failed to dispatch email reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = String(status || 'open').toLowerCase();
    if (s === 'resolved' || s === 'closed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Resolved
        </span>
      );
    }
    if (s === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-3 h-3" />
          In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle className="w-3 h-3" />
        Pending Review
      </span>
    );
  };

  return (
    <div className={`space-y-6 font-sans ${embedded ? '' : 'min-h-screen bg-[#f8fafc] pt-24 sm:pt-28 pb-16 px-4 sm:px-8 max-w-7xl mx-auto'}`}>
      {/* Toast Alert */}
      {actionSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#5a00b8] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{actionSuccess}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5a00b8] border border-purple-200 flex items-center justify-center font-black">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                IndoFleet Support Desk
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Unified inbox for Website Form inquiries and Customer Drone QR Scan submissions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#5a00b8]' : ''}`} />
            <span>Refresh</span>
          </button>

          {!embedded && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab('forms')}
          className={`rounded-2xl p-4 border transition-all cursor-pointer ${
            activeTab === 'forms'
              ? 'bg-purple-50/50 border-[#5a00b8] shadow-xs'
              : 'bg-white border-slate-200 hover:border-purple-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Website Forms</p>
            <MessageSquare className="w-4 h-4 text-[#5a00b8]" />
          </div>
          <h4 className="text-2xl font-black text-slate-900 mt-1">{stats.totalWeb}</h4>
          <p className="text-[10px] text-purple-700 font-medium mt-0.5">
            {stats.pendingWeb > 0 ? `${stats.pendingWeb} Pending` : 'All Resolved'}
          </p>
        </div>

        <div
          onClick={() => setActiveTab('qr_scans')}
          className={`rounded-2xl p-4 border transition-all cursor-pointer ${
            activeTab === 'qr_scans'
              ? 'bg-blue-50/50 border-blue-600 shadow-xs'
              : 'bg-white border-slate-200 hover:border-blue-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer QR Scans</p>
            <QrCode className="w-4 h-4 text-blue-600" />
          </div>
          <h4 className="text-2xl font-black text-slate-900 mt-1">{stats.totalQr}</h4>
          <p className="text-[10px] text-blue-700 font-medium mt-0.5">
            {stats.pendingQr > 0 ? `${stats.pendingQr} Pending` : 'All Resolved'}
          </p>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/15 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Resolved Cases</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <h4 className="text-2xl font-black text-emerald-900 mt-1">{stats.totalResolved}</h4>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Closed Successfully</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Inbound</p>
            <Inbox className="w-4 h-4 text-slate-400" />
          </div>
          <h4 className="text-2xl font-black text-slate-900 mt-1">{stats.totalOverall}</h4>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Forms &amp; QR Combined</p>
        </div>
      </div>

      {/* Main Tab Navigation Buttons */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('forms')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'forms'
                ? 'bg-[#5a00b8] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Website Form Submissions</span>
            {stats.pendingWeb > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'forms' ? 'bg-white/20 text-white' : 'bg-purple-100 text-[#5a00b8]'
              }`}>
                {stats.pendingWeb}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr_scans')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'qr_scans'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Customer QR Scan Inquiries</span>
            {stats.pendingQr > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'qr_scans' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
              }`}>
                {stats.pendingQr}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search and Status Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-500 mr-1 whitespace-nowrap">Status:</span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'open'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
            }`}
          >
            Pending Review
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'in_progress'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
            }`}
          >
            In Progress
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'resolved'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
            }`}
          >
            Resolved
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'qr_scans'
                ? 'Search by drone serial, customer, message...'
                : 'Search by client name, email, query...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#5a00b8]"
          />
        </div>
      </div>

      {/* Ticket Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-[#5a00b8]" />
            <p className="text-sm font-semibold">Loading inquiries...</p>
          </div>
        ) : activeList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-2">
            <Inbox className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">
              {activeTab === 'qr_scans'
                ? 'No Customer QR Scan Inquiries Found'
                : 'No Website Form Submissions Found'}
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'No entries match your search criteria. Try adjusting your status filter or clearing search.'
                : activeTab === 'qr_scans'
                ? 'When customers scan a drone QR code and submit feedback or report an issue, it will immediately appear here.'
                : 'Inquiries submitted through the website contact forms will appear here in real time.'}
            </p>
          </div>
        ) : (
          activeList.map((ticket) => {
            const isQr = isQrScanTicket(ticket);
            return (
              <div
                key={ticket.id}
                className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-5 shadow-xs transition-all space-y-3.5"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {ticket.id}
                    </span>

                    {/* Source Tag */}
                    {isQr ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                        <QrCode className="w-3 h-3" />
                        Customer Drone QR Scan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                        <MessageSquare className="w-3 h-3" />
                        Website Form Query
                      </span>
                    )}

                    {/* Status Pill */}
                    {getStatusBadge(ticket.status)}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(ticket.created_at)}</span>
                  </div>
                </div>

                {/* Customer Details Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">{ticket.name || 'Anonymous Customer'}</h4>
                        {ticket.category && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {ticket.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                        {ticket.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {ticket.email}
                          </span>
                        )}
                        {ticket.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {ticket.phone}
                          </span>
                        )}
                        {ticket.drone_serial && (
                          <span className="inline-flex items-center gap-1 font-mono text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded">
                            <Truck className="w-3 h-3" />
                            Airframe: {ticket.drone_serial}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-2">
                    {ticket.email && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTicket(ticket);
                          setReplySubject(`Re: [IndoFleet Support] Inquiry ${ticket.id}`);
                          setReplyMessage('');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-[#5a00b8] text-[#5a00b8] hover:text-white border border-purple-200 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Reply Email</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setResolvingTicket(ticket);
                        setResolvingStatus(ticket.status === 'resolved' ? 'open' : 'resolved');
                        setResolutionNotes(ticket.resolution_notes || '');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Update Status</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTicket(ticket)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                  </div>
                </div>

                {/* Message Body */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed">
                  <p className="whitespace-pre-line">{ticket.message || 'No description provided.'}</p>
                </div>

                {/* Resolution Notes If Any */}
                {ticket.resolution_notes && (
                  <div className="text-[11px] bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-emerald-800">
                    <span className="font-bold uppercase tracking-wider block text-[10px] text-emerald-700 mb-0.5">
                      Resolution Notes (by {ticket.agent_name || 'Agent'}):
                    </span>
                    <p className="italic">"{ticket.resolution_notes}"</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Update Ticket Status */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Update Ticket Status</h3>
                <p className="text-xs text-slate-500 font-mono">ID: {resolvingTicket.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setResolvingTicket(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Set New Status</label>
                <select
                  value={resolvingStatus}
                  onChange={(e) => setResolvingStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#5a00b8]"
                >
                  <option value="open">Pending / Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Resolution / Action Notes</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain how the issue or inquiry was resolved..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#5a00b8] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingTicket(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#5a00b8] hover:bg-[#4a0099] text-white cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Saving...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Send Direct Email Reply */}
      {replyingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Reply to Customer</h3>
                <p className="text-xs text-slate-500">Recipient: <strong className="text-purple-700">{replyingTicket.email}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTicket(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmailReply} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#5a00b8]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Message Content</label>
                <textarea
                  required
                  rows={5}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your response to the customer..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#5a00b8] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyingTicket(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingReply}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#5a00b8] hover:bg-[#4a0099] text-white cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingReply ? 'Sending Email...' : 'Send Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: View Full Details */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Inquiry Details</h3>
                <p className="text-xs text-slate-500 font-mono">ID: {selectedTicket.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer Name</span>
                  <span className="font-bold text-slate-800">{selectedTicket.name || 'Anonymous'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Email</span>
                  <span className="font-mono text-slate-800">{selectedTicket.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Phone</span>
                  <span className="font-mono text-slate-800">{selectedTicket.phone || 'N/A'}</span>
                </div>
                {selectedTicket.drone_serial && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Drone Airframe Serial</span>
                    <span className="font-mono font-bold text-purple-700">{selectedTicket.drone_serial}</span>
                  </div>
                )}
                {selectedTicket.order_id && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Linked Order ID</span>
                    <span className="font-mono font-bold text-blue-700">{selectedTicket.order_id}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Message Content</span>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 leading-relaxed whitespace-pre-line">
                  {selectedTicket.message || 'No description provided.'}
                </div>
              </div>

              {selectedTicket.resolution_notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Resolution Notes</span>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 leading-relaxed italic">
                    "{selectedTicket.resolution_notes}"
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
