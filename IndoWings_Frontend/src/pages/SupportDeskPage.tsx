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
  Truck,
  ArrowLeft,
  Copy,
  CheckCheck,
  Download,
  Image as ImageIcon,
  Paperclip,
  Maximize2
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

  // Full-Page Detail View & In-Page Resolution State
  const [detailResolutionNotes, setDetailResolutionNotes] = useState('');
  const [detailStatus, setDetailStatus] = useState('resolved');
  const [detailSendEmail, setDetailSendEmail] = useState(true);
  const [isSubmittingDetailResolution, setIsSubmittingDetailResolution] = useState(false);

  // Direct reply in detail view
  const [showDetailDirectReply, setShowDetailDirectReply] = useState(false);
  const [detailReplySubject, setDetailReplySubject] = useState('');
  const [detailReplyMessage, setDetailReplyMessage] = useState('');
  const [isSendingDetailReply, setIsSendingDetailReply] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Document Review & Preview Modal
  const [previewDocument, setPreviewDocument] = useState<any | null>(null);

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
          subject: replySubject.trim() || `IndoWings Support Update: Ticket ${replyingTicket.id}`,
          message: replyMessage.trim(),
          agent_name: currentUser?.name || 'IndoWings Support Desk'
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

  // Sync selectedTicket changes with detail view form
  useEffect(() => {
    if (selectedTicket) {
      setDetailResolutionNotes(selectedTicket.resolution_notes || selectedTicket.notes || '');
      setDetailStatus(
        selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'
          ? selectedTicket.status
          : 'resolved'
      );
      setDetailSendEmail(Boolean(selectedTicket.email));
      setDetailReplySubject(`Re: [IndoWings Support] Inquiry ${selectedTicket.id}`);
      setDetailReplyMessage('');
      setShowDetailDirectReply(false);
    }
  }, [selectedTicket]);

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Customer Documents & Attachments from Ticket or Inbound Emails
  const customerDocuments = useMemo(() => {
    if (!selectedTicket) return [];
    const docs: any[] = [];

    // 1. Direct ticket attachments
    const rawAttachments = selectedTicket.attachments || selectedTicket.documents || selectedTicket.files || selectedTicket.media;
    if (Array.isArray(rawAttachments)) {
      rawAttachments.forEach((att, idx) => {
        if (!att) return;
        if (typeof att === 'string') {
          docs.push({
            id: `doc-${idx}`,
            name: `Attachment ${idx + 1}`,
            data: att,
            url: att.startsWith('http') ? att : '',
            mimetype: att.startsWith('data:image') ? 'image/jpeg' : att.startsWith('data:application/pdf') ? 'application/pdf' : 'application/octet-stream',
            size: undefined
          });
        } else {
          docs.push({
            id: att.id || `doc-${idx}`,
            name: att.name || att.filename || `Document ${idx + 1}`,
            data: att.data || att.url || att.content || '',
            url: att.url || (typeof att.data === 'string' && att.data.startsWith('http') ? att.data : ''),
            mimetype: att.mimetype || att.type || att.mime || 'application/octet-stream',
            size: att.size
          });
        }
      });
    }

    // 2. Attachments from inbound emails in email_thread
    if (Array.isArray(selectedTicket.email_thread)) {
      selectedTicket.email_thread.forEach((entry: any, eIdx: number) => {
        if (Array.isArray(entry.attachments)) {
          entry.attachments.forEach((att: any, aIdx: number) => {
            docs.push({
              id: att.id || `email-${eIdx}-${aIdx}`,
              name: att.filename || att.name || `Email Attachment ${aIdx + 1}`,
              data: att.data || att.download_url || '',
              url: att.download_url || '',
              mimetype: att.content_type || att.mimetype || 'application/octet-stream',
              size: att.size,
              source: `Inbound Email from ${entry.from || selectedTicket.email || 'Customer'}`
            });
          });
        }
      });
    }

    return docs;
  }, [selectedTicket]);

  const getDocumentSource = (doc: any) => {
    if (!doc) return '';
    if (doc.data && typeof doc.data === 'string') {
      if (doc.data.startsWith('data:') || doc.data.startsWith('http://') || doc.data.startsWith('https://')) {
        return doc.data;
      }
      const mime = doc.mimetype || 'application/octet-stream';
      return `data:${mime};base64,${doc.data}`;
    }
    return doc.url || '';
  };

  const isImageDoc = (doc: any) => {
    const mime = String(doc.mimetype || doc.type || '').toLowerCase();
    const name = String(doc.name || doc.filename || '').toLowerCase();
    return (
      mime.startsWith('image/') ||
      name.endsWith('.png') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.webp') ||
      name.endsWith('.gif') ||
      name.endsWith('.svg')
    );
  };

  const isPdfDoc = (doc: any) => {
    const mime = String(doc.mimetype || doc.type || '').toLowerCase();
    const name = String(doc.name || doc.filename || '').toLowerCase();
    return mime.includes('pdf') || name.endsWith('.pdf');
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownloadDoc = (doc: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const src = getDocumentSource(doc);
    if (!src) return;

    const fileName = doc.name || doc.filename || 'downloaded-document';

    const a = document.createElement('a');
    a.href = src;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenInNewTab = (doc: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const src = getDocumentSource(doc);
    if (!src) return;

    if (src.startsWith('http')) {
      window.open(src, '_blank');
      return;
    }

    try {
      const arr = src.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch {
      const win = window.open();
      if (win) {
        if (isImageDoc(doc)) {
          win.document.write(`<img src="${src}" style="max-width:100%; height:auto;" />`);
        } else {
          win.location.href = src;
        }
      }
    }
  };

  // Submit Official Resolution from Detail Page
  const handleSubmitDetailResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    if (!detailResolutionNotes.trim() && (detailStatus === 'resolved' || detailStatus === 'closed')) {
      setSupportError('Please provide official resolution notes before resolving.');
      return;
    }

    setIsSubmittingDetailResolution(true);
    setSupportError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: supportHeaders,
        body: JSON.stringify({
          status: detailStatus,
          resolution_notes: detailResolutionNotes.trim(),
          agent_name: currentUser?.name || 'IndoWings Support Desk',
          send_email: detailSendEmail && Boolean(selectedTicket.email)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit resolution.');

      const updatedTicket = data.request || {
        ...selectedTicket,
        status: detailStatus,
        resolution_notes: detailResolutionNotes.trim(),
        resolved_at: new Date().toISOString(),
        resolved_by: currentUser?.name || 'IndoWings Support Desk'
      };

      setSelectedTicket(updatedTicket);
      showToast(
        detailSendEmail && selectedTicket.email
          ? `Inquiry ${selectedTicket.id} marked as ${detailStatus.toUpperCase()} & official resolution email dispatched to ${selectedTicket.email}!`
          : `Inquiry ${selectedTicket.id} updated to ${detailStatus.toUpperCase()} successfully!`
      );
      fetchTickets(true);
    } catch (err: any) {
      setSupportError(err.message || 'Error updating ticket resolution.');
    } finally {
      setIsSubmittingDetailResolution(false);
    }
  };

  // Send Direct Email Reply from Detail Page
  const handleSendDetailDirectReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !selectedTicket.email) return;

    if (!detailReplyMessage.trim()) {
      setSupportError('Please enter a message before sending reply.');
      return;
    }

    setIsSendingDetailReply(true);
    setSupportError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/tickets/${selectedTicket.id}/send-email`, {
        method: 'POST',
        headers: supportHeaders,
        body: JSON.stringify({
          subject: detailReplySubject.trim() || `IndoWings Support Update: Ticket ${selectedTicket.id}`,
          message: detailReplyMessage.trim(),
          agent_name: currentUser?.name || 'IndoWings Support Desk'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch email reply.');

      showToast(`Direct reply sent successfully to ${selectedTicket.email}!`);
      setDetailReplyMessage('');
      setShowDetailDirectReply(false);
      if (data.request) {
        setSelectedTicket(data.request);
      }
      fetchTickets(true);
    } catch (err: any) {
      setSupportError(err.message || 'Failed to dispatch email reply.');
    } finally {
      setIsSendingDetailReply(false);
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

      {selectedTicket ? (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top Bar: Back Button, Ticket ID, Status, Refresh */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs">
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-purple-50 hover:text-[#5a00b8] text-slate-700 transition-colors cursor-pointer w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Inquiries</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                {selectedTicket.id}
              </span>
              {getStatusBadge(selectedTicket.status)}
              <button
                type="button"
                onClick={() => fetchTickets(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#5a00b8]' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Support Error Banner if any */}
          {supportError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-800 text-xs font-medium">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{supportError}</span>
              </div>
              <button type="button" onClick={() => setSupportError('')} className="p-1 hover:bg-rose-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Customer Dossier & Inquiry Details */}
            <div className="lg:col-span-7 space-y-6">
              {/* Inquiry Header Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {isQrScanTicket(selectedTicket) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                          <QrCode className="w-3.5 h-3.5" />
                          Customer Drone QR Scan Submission
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Website Form Submission
                        </span>
                      )}
                      {selectedTicket.category && (
                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                          {selectedTicket.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mt-2">
                      Inquiry #{selectedTicket.id}
                    </h3>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <span className="block font-bold text-slate-500">Submitted</span>
                    <span>{formatDate(selectedTicket.created_at)}</span>
                  </div>
                </div>

                {/* Customer Details Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3" /> Customer Name
                    </span>
                    <p className="text-sm font-black text-slate-900">
                      {selectedTicket.name || 'Anonymous Customer'}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email Address
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-mono font-bold text-slate-800 truncate">
                        {selectedTicket.email || 'N/A'}
                      </p>
                      {selectedTicket.email && (
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedTicket.email, 'email')}
                          className="p-1 hover:bg-slate-200 rounded-md text-slate-500 hover:text-slate-800 transition-colors"
                          title="Copy Email"
                        >
                          {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Phone Number
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-mono font-bold text-slate-800">
                        {selectedTicket.phone || 'N/A'}
                      </p>
                      {selectedTicket.phone && (
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedTicket.phone, 'phone')}
                          className="p-1 hover:bg-slate-200 rounded-md text-slate-500 hover:text-slate-800 transition-colors"
                          title="Copy Phone"
                        >
                          {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Truck className="w-3 h-3" /> Airframe / Linked Asset
                    </span>
                    <p className="text-xs font-mono font-bold text-purple-700">
                      {selectedTicket.drone_serial ? selectedTicket.drone_serial : selectedTicket.order_id ? `Order ${selectedTicket.order_id}` : 'General Inquiry'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Description Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#5a00b8]" />
                    Customer Inquiry Message
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">As submitted by user</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium select-text">
                  {selectedTicket.message || 'No description provided.'}
                </div>
              </div>

              {/* Customer Uploaded Documents & Media Evidence Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-[#5a00b8]" />
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Customer Documents &amp; Media Evidence
                    </h4>
                  </div>
                  {customerDocuments.length > 0 ? (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {customerDocuments.length} {customerDocuments.length === 1 ? 'File' : 'Files'} Attached
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400">
                      0 Files Attached
                    </span>
                  )}
                </div>

                {customerDocuments.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">
                    <Paperclip className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
                    <p className="font-semibold text-slate-600">No documents or photos uploaded</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      The customer did not attach any media files or PDF documents with this inquiry.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {customerDocuments.map((doc, idx) => {
                      const isImg = isImageDoc(doc);
                      const isPdf = isPdfDoc(doc);
                      const docSrc = getDocumentSource(doc);

                      return (
                        <div
                          key={doc.id || idx}
                          onClick={() => setPreviewDocument(doc)}
                          className="group relative bg-slate-50 hover:bg-purple-50/40 border border-slate-200 hover:border-purple-300 rounded-2xl p-3.5 transition-all cursor-pointer shadow-2xs flex flex-col justify-between space-y-3"
                        >
                          {/* Image Thumbnail Preview if image */}
                          {isImg && docSrc && (
                            <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-900/5 border border-slate-200 flex items-center justify-center">
                              <img
                                src={docSrc}
                                alt={doc.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
                                <Eye className="w-4 h-4" />
                                <span>Click to Review</span>
                              </div>
                            </div>
                          )}

                          {/* Non-image File Header Icon */}
                          {!isImg && (
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isPdf ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-blue-50 text-blue-600 border border-blue-200'
                              }`}>
                                {isPdf ? 'PDF' : <FileText className="w-6 h-6" />}
                              </div>
                              <div className="truncate flex-1">
                                <p className="text-xs font-bold text-slate-800 truncate" title={doc.name}>
                                  {doc.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {doc.mimetype || (isPdf ? 'application/pdf' : 'Document')}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* File Details Strip */}
                          <div>
                            {isImg && (
                              <p className="text-xs font-bold text-slate-800 truncate" title={doc.name}>
                                {doc.name}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                              <span>{formatFileSize(doc.size) || (isImg ? 'Image File' : 'Document')}</span>
                              {doc.source && (
                                <span className="text-[10px] text-purple-700 font-medium truncate max-w-[150px]">
                                  {doc.source}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewDocument(doc);
                              }}
                              className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#5a00b8]" />
                              <span>Review</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDownloadDoc(doc, e)}
                              className="py-1.5 px-2.5 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Download File"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Download</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resolution On File Card (if exists) */}
              {selectedTicket.resolution_notes && (
                <div className="bg-white border border-emerald-200 rounded-3xl p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Recorded Resolution Notes
                    </h4>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      {selectedTicket.resolved_by ? `By ${selectedTicket.resolved_by}` : 'Resolved'} • {formatDate(selectedTicket.resolved_at)}
                    </span>
                  </div>
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 text-sm text-emerald-950 leading-relaxed whitespace-pre-line font-medium">
                    {selectedTicket.resolution_notes}
                  </div>
                </div>
              )}

              {/* Email Communications Thread (if any) */}
              {Array.isArray(selectedTicket.email_thread) && selectedTicket.email_thread.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Email Communication History ({selectedTicket.email_thread.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedTicket.email_thread.map((entry: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            {entry.direction === 'inbound' ? 'Inbound Customer Email' : `Reply from ${entry.agent_name || 'Support Desk'}`}
                          </span>
                          <span className="text-[11px] text-slate-400">{formatDate(entry.timestamp)}</span>
                        </div>
                        <p className="font-bold text-slate-700">Subject: {entry.subject}</p>
                        <p className="text-slate-600 whitespace-pre-line leading-relaxed">{entry.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: In-Page Resolution Form & Email Dispatch */}
            <div className="lg:col-span-5 space-y-6">
              {/* Official Resolution Card */}
              <div className="bg-white border-2 border-purple-200 rounded-3xl p-6 shadow-md space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#5a00b8] flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Provide Resolution</h3>
                    <p className="text-xs text-slate-500">Record action &amp; email customer resolution</p>
                  </div>
                </div>

                <form onSubmit={handleSubmitDetailResolution} className="space-y-4">
                  {/* Status Dropdown */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Ticket Status
                    </label>
                    <select
                      value={detailStatus}
                      onChange={(e) => setDetailStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#5a00b8] text-slate-800"
                    >
                      <option value="resolved">Resolved (Complete)</option>
                      <option value="in_progress">In Progress (Under Technical Review)</option>
                      <option value="closed">Closed (Archived)</option>
                      <option value="open">Pending / Open</option>
                    </select>
                  </div>

                  {/* Resolution Textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Official Resolution Notes <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Sent to customer via email</span>
                    </div>
                    <textarea
                      rows={6}
                      required={detailStatus === 'resolved' || detailStatus === 'closed'}
                      value={detailResolutionNotes}
                      onChange={(e) => setDetailResolutionNotes(e.target.value)}
                      placeholder="Explain how the inquiry/issue was addressed (e.g. Drone airframe inspected, battery connector replaced and verified, flight readiness confirmed. Query marked resolved)..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#5a00b8] leading-relaxed resize-none text-slate-800"
                    />
                  </div>

                  {/* Email Dispatch Checkbox */}
                  <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={detailSendEmail && Boolean(selectedTicket.email)}
                        disabled={!selectedTicket.email}
                        onChange={(e) => setDetailSendEmail(e.target.checked)}
                        className="mt-0.5 rounded text-[#5a00b8] focus:ring-[#5a00b8]"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 block">
                          Send Official Resolution Email to Customer
                        </span>
                        {selectedTicket.email ? (
                          <span className="text-[11px] text-purple-800 block mt-0.5">
                            Recipient: <strong>{selectedTicket.email}</strong>
                          </span>
                        ) : (
                          <span className="text-[11px] text-rose-600 block mt-0.5 font-medium">
                            No customer email found. Record will be updated in system only.
                          </span>
                        )}
                      </div>
                    </label>

                    <div className="text-[10px] text-slate-500 border-t border-purple-100 pt-2 flex items-center justify-between">
                      <span>Sender: <strong>connect@indowings.com</strong></span>
                      <span className="text-purple-700 font-bold">IndoWings Operations</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingDetailResolution}
                    className="w-full py-3 px-4 rounded-xl text-xs font-black bg-[#5a00b8] hover:bg-[#4a0099] text-white flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingDetailResolution ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting Resolution...</span>
                      </>
                    ) : detailSendEmail && selectedTicket.email ? (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Resolution &amp; Send Email</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Save Resolution</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Direct Reply Collapsible Card */}
              {selectedTicket.email && (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
                  <div
                    onClick={() => setShowDetailDirectReply(!showDetailDirectReply)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-600" />
                      <h4 className="text-xs font-black text-slate-900">
                        Need More Information? Send Direct Email
                      </h4>
                    </div>
                    <span className="text-xs text-[#5a00b8] font-bold">
                      {showDetailDirectReply ? 'Hide' : 'Open Form'}
                    </span>
                  </div>

                  {showDetailDirectReply && (
                    <form onSubmit={handleSendDetailDirectReply} className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in">
                      <p className="text-[11px] text-slate-500">
                        Send a direct question or interim update to <strong className="text-slate-800">{selectedTicket.email}</strong> without marking the ticket resolved.
                      </p>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Subject</label>
                        <input
                          type="text"
                          required
                          value={detailReplySubject}
                          onChange={(e) => setDetailReplySubject(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#5a00b8]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Message</label>
                        <textarea
                          rows={4}
                          required
                          value={detailReplyMessage}
                          onChange={(e) => setDetailReplyMessage(e.target.value)}
                          placeholder="Type your message to customer..."
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#5a00b8] resize-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSendingDetailReply}
                        className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSendingDetailReply ? 'Sending Email...' : 'Send Direct Email Reply'}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Top Header Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5a00b8] border border-purple-200 flex items-center justify-center font-black">
                  <Inbox className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    IndoWings Support Desk
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
                          setReplySubject(`Re: [IndoWings Support] Inquiry ${ticket.id}`);
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

        </>
      )}

      {/* DOCUMENT REVIEW & PREVIEW MODAL */}
      {previewDocument && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3 truncate mr-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#5a00b8] flex items-center justify-center shrink-0">
                  {isImageDoc(previewDocument) ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div className="truncate">
                  <h3 className="text-sm font-black text-slate-900 truncate">
                    {previewDocument.name || 'Document Review'}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <span className="font-semibold text-slate-700">{previewDocument.mimetype || 'Attachment'}</span>
                    {previewDocument.size && <span>• {formatFileSize(previewDocument.size)}</span>}
                    {previewDocument.source && <span className="text-purple-700">({previewDocument.source})</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(previewDocument)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5 text-[#5a00b8]" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenInNewTab(previewDocument)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
                  title="Open in Full Tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open in Tab</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-auto flex items-center justify-center bg-slate-900/5 min-h-[340px]">
              {isImageDoc(previewDocument) ? (
                <div className="max-h-[72vh] flex items-center justify-center">
                  <img
                    src={getDocumentSource(previewDocument)}
                    alt={previewDocument.name || 'Customer uploaded file'}
                    className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-lg"
                  />
                </div>
              ) : isPdfDoc(previewDocument) ? (
                <iframe
                  src={getDocumentSource(previewDocument)}
                  title={previewDocument.name || 'PDF Preview'}
                  className="w-full h-[72vh] rounded-2xl border border-slate-200 bg-white shadow-xs"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <FileText className="w-14 h-14 text-slate-400 mx-auto" />
                  <p className="text-base font-black text-slate-800">{previewDocument.name}</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    This file format ({previewDocument.mimetype}) can be downloaded to inspect with your local applications.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDownloadDoc(previewDocument)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#5a00b8] text-white hover:bg-[#4a0099] shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File to Review</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
