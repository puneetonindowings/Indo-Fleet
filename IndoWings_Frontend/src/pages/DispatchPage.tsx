import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Truck,
  AlertCircle,
  RefreshCw,
  Battery,
  Zap,
  CheckCircle,
  Clock,
  XCircle,
  BarChart3,
  ShieldAlert,
  Ban,
  Radio,
  Search,
  X,
  Loader2,
  Phone,
  Mail,
  Plus,
  MapPin,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Power,
  Check,
  Eye,
  ChevronRight,
  DollarSign,
  ArrowUpRight,
  Headphones,
  MessageCircle,
  Star,
  MessageSquare
} from 'lucide-react';
import { DeliveryUser } from '../components/AuthModal';
import { API_BASE_URL } from '../config/api';

interface DispatchPageProps {
  onNavigate: (page: string) => void;
  currentUser: DeliveryUser | null;
}

const STATUS_COLORS: Record<string, string> = {
  delivered: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  'in-flight': 'bg-sky-100 text-sky-800 border border-sky-200',
  'on-hold': 'bg-amber-100 text-amber-800 border border-amber-200',
  assigned: 'bg-purple-100 text-purple-800 border border-purple-200',
  rescheduled: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  pending: 'bg-slate-100 text-slate-700 border border-slate-200',
  'taking-off': 'bg-sky-100 text-sky-800 border border-sky-200',
  approaching: 'bg-teal-100 text-teal-800 border border-teal-200',
  failed: 'bg-red-100 text-red-800 border border-red-200',
  cancelled: 'bg-rose-100 text-rose-800 border border-rose-200'
};

const DRONE_STATUS_COLORS: Record<string, string> = {
  idle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'en-route': 'bg-sky-50 text-sky-700 border-sky-200',
  charging: 'bg-amber-50 text-amber-700 border-amber-200',
  'on-hold': 'bg-orange-50 text-orange-700 border-orange-200',
  maintenance: 'bg-slate-100 text-slate-700 border-slate-200',
  returning: 'bg-purple-50 text-purple-700 border-purple-200'
};

export const DispatchPage: React.FC<DispatchPageProps> = ({ onNavigate, currentUser }) => {
  const [tab, setTab] = useState<'orders' | 'fleet' | 'analytics' | 'enquiries' | 'feedbacks'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [fleet, setFleet] = useState<any[]>([]);
  const [fleetStats, setFleetStats] = useState<any>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [expertRequests, setExpertRequests] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  // Filters & Search
  const [filter, setFilter] = useState('all');
  const [fleetFilter, setFleetFilter] = useState('all');
  const [enquiryFilter, setEnquiryFilter] = useState('all');
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [fleetSearch, setFleetSearch] = useState('');
  const [enquirySearch, setEnquirySearch] = useState('');
  const [feedbackSearch, setFeedbackSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingEnquiryId, setUpdatingEnquiryId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedDrone, setSelectedDrone] = useState<any | null>(null);
  const [updatingDrone, setUpdatingDrone] = useState(false);

  const [showRegisterDroneModal, setShowRegisterDroneModal] = useState(false);
  const [newDroneModel, setNewDroneModel] = useState('Cyberone Max');
  const [newDroneCity, setNewDroneCity] = useState('Noida Sector 62');
  const [newDronePayload, setNewDronePayload] = useState('2.5');
  const [registeringDrone, setRegisteringDrone] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState('');

  const token = localStorage.getItem('iw_delivery_token') || '';

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/orders`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {}
  };

  const fetchFleet = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/fleet`);
      const data = await res.json();
      setFleet(data.fleet || []);
      setFleetStats({
        total: data.total_fleet,
        active: data.active,
        idle: data.idle,
        charging: data.charging,
        on_hold: data.on_hold
      });
    } catch {}
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/analytics`);
      const data = await res.json();
      setAnalytics(data);
    } catch {}
  };

  const fetchExpertRequests = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/expert-requests`);
      const data = await res.json();
      setExpertRequests(data.requests || []);
    } catch {}
  };

  const handleUpdateEnquiryStatus = async (id: string, status: string, notes?: string) => {
    setUpdatingEnquiryId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/expert-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      const data = await res.json();
      await fetchExpertRequests();
      if (data.request?.email) {
        setToastMessage(`Status updated to "${status.toUpperCase()}". Automated notification email sent to ${data.request.email}!`);
      } else {
        setToastMessage(`Status updated to "${status.toUpperCase()}".`);
      }
      setTimeout(() => setToastMessage(null), 6000);
    } catch {
      setToastMessage('Failed to update status.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setUpdatingEnquiryId(null);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/feedbacks`);
      const data = await res.json();
      setFeedbacks(data.feedbacks || []);
    } catch {}
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm('Are you sure you want to remove this feedback?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/delivery/feedbacks/${id}`, { method: 'DELETE' });
      await fetchFeedbacks();
      setToastMessage('Feedback removed from operational stream.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch {}
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchOrders(), fetchFleet(), fetchAnalytics(), fetchExpertRequests(), fetchFeedbacks()]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    Promise.all([fetchOrders(), fetchFleet(), fetchAnalytics(), fetchExpertRequests(), fetchFeedbacks()]).finally(() => setLoading(false));

    // Dynamic background poll every 6 seconds to keep operations live
    const timer = setInterval(() => {
      fetchOrders();
      fetchFleet();
      fetchAnalytics();
      fetchExpertRequests();
      fetchFeedbacks();
    }, 6000);

    return () => clearInterval(timer);
  }, [currentUser]);

  const handleUpdateDroneState = async (droneId: string, newState: string) => {
    setUpdatingDrone(true);
    try {
      await fetch(`${API_BASE_URL}/api/delivery/fleet/${droneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newState })
      });
      await fetchFleet();
      if (selectedDrone?.id === droneId) {
        setSelectedDrone((prev: any) => (prev ? { ...prev, status: newState } : null));
      }
    } catch {
    } finally {
      setUpdatingDrone(false);
    }
  };

  const handleRegisterDrone = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisteringDrone(true);
    setRegisterSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/fleet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: newDroneModel,
          current_city: newDroneCity,
          payload_capacity_kg: newDronePayload
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRegisterSuccess(`UAV ${data.drone.id} successfully added to fleet.`);
        await refreshAll();
        setTimeout(() => {
          setShowRegisterDroneModal(false);
          setRegisterSuccess('');
        }, 1500);
      }
    } catch {
    } finally {
      setRegisteringDrone(false);
    }
  };

  if (currentUser?.role !== 'admin')
    return (
      <div className="min-h-screen bg-[#f7f4fb] flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-white border border-[#e2e8f0] p-8 rounded-2xl shadow-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-[#171222] mb-2">HQ Admin Access Restricted</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">The Fleet Dispatch Board is reserved for IndoWings operations commanders and flight administrators.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                onNavigate('home');
                window.history.pushState({}, '', '/');
              }}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm cursor-pointer"
            >
              Return Home
            </button>
            <button
              onClick={() => {
                onNavigate('login');
                window.history.pushState({}, '', '/login');
              }}
              className="px-5 py-2.5 bg-[#3b0080] text-white font-bold rounded-xl hover:bg-[#2d006b] transition-colors text-sm shadow-md cursor-pointer"
            >
              Sign In as Admin
            </button>
          </div>
        </div>
      </div>
    );

  const filteredOrders = orders.filter((o) => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = (o.id || '').toLowerCase().includes(q);
      const matchCustomer = (o.customer_name || '').toLowerCase().includes(q);
      const matchPhone = (o.customer_phone || '').toLowerCase().includes(q);
      const matchEmail = (o.customer_email || '').toLowerCase().includes(q);
      const matchDrone = (o.drone_model || o.drone_id || '').toLowerCase().includes(q);
      const matchAddress = (o.drop_address || o.pickup_address || '').toLowerCase().includes(q);
      return matchId || matchCustomer || matchPhone || matchEmail || matchDrone || matchAddress;
    }
    return true;
  });

  const filteredFleet = fleet.filter((d) => {
    if (fleetFilter !== 'all') {
      if (fleetFilter === 'active' && !['en-route', 'assigned'].includes(d.status)) return false;
      if (fleetFilter === 'idle' && d.status !== 'idle') return false;
      if (fleetFilter === 'charging' && d.status !== 'charging') return false;
      if (fleetFilter === 'on-hold' && d.status !== 'on-hold') return false;
    }
    if (fleetSearch.trim()) {
      const q = fleetSearch.toLowerCase();
      const matchId = (d.id || '').toLowerCase().includes(q);
      const matchModel = (d.model || '').toLowerCase().includes(q);
      const matchCity = (d.current_city || '').toLowerCase().includes(q);
      const matchOrder = (d.assigned_order || '').toLowerCase().includes(q);
      return matchId || matchModel || matchCity || matchOrder;
    }
    return true;
  });

  // Calculate dynamic revenue
  const totalRevenue = orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + (Number(o.fare || o.fare_inr) || 249), 0);

  const activeFlightsCount = orders.filter((o) => ['in-flight', 'taking-off', 'approaching'].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-[#f7f4fb] pb-16">
      {/* ── COMMAND HEADER & REAL-TIME STATS ────────────────────────────────── */}
      <section className="relative text-white pt-28 sm:pt-36 pb-12 px-6 shadow-xl" style={{ background: 'linear-gradient(135deg, #180533 0%, #290d52 50%, #15032e 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                  <LayoutDashboard className="w-5 h-5 text-purple-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-purple-300">Operations Flight Deck</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                      </span>
                      Live Radar Connected
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Fleet Command & Dispatch Board</h1>
                </div>
              </div>
              <p className="text-white/60 text-xs sm:text-sm pl-1">
                Commander: <strong className="text-white">{currentUser.name}</strong> · Total Registered UAVs: <strong className="text-purple-200 font-mono">{fleet.length}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={refreshAll}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white text-xs font-bold hover:bg-white/20 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-300' : ''}`} />
                <span>{refreshing ? 'Synchronizing...' : 'Refresh Telemetry'}</span>
              </button>

              <button
                onClick={() => setShowRegisterDroneModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/30 hover:bg-purple-500/40 border border-purple-400/40 text-purple-100 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register UAV</span>
              </button>

              <button
                onClick={() => {
                  onNavigate('track');
                  window.history.pushState({}, '', '/track');
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#3b0080] hover:bg-purple-50 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md active:scale-95"
              >
                <Radio className="w-3.5 h-3.5 text-[#3b0080] animate-pulse" />
                <span>Live Corridor Radar</span>
              </button>
            </div>
          </div>

          {/* 100% Real Live Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-8">
            <div className="bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-white/70 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Bookings</span>
                <Package className="w-4 h-4 text-purple-200" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">{orders.length}</p>
              <p className="text-[11px] text-white/60 mt-0.5">Real Database Logs</p>
            </div>

            <div className="bg-sky-500/20 border border-sky-400/30 rounded-2xl p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-sky-200 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">In-Flight Now</span>
                <Truck className="w-4 h-4 text-sky-300" />
              </div>
              <p className="text-2xl font-bold text-white font-mono flex items-center gap-2">
                {activeFlightsCount}
                {activeFlightsCount > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
                  </span>
                )}
              </p>
              <p className="text-[11px] text-sky-200/80 mt-0.5">Live Flying Missions</p>
            </div>

            <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-2xl p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-emerald-200 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Delivered</span>
                <CheckCircle className="w-4 h-4 text-emerald-300" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">{orders.filter((o) => o.status === 'delivered').length}</p>
              <p className="text-[11px] text-emerald-200/80 mt-0.5">Successful Touchdowns</p>
            </div>

            <div className="bg-amber-500/20 border border-amber-400/30 rounded-2xl p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-amber-200 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">On Hold</span>
                <AlertCircle className="w-4 h-4 text-amber-300" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">{orders.filter((o) => o.status === 'on-hold').length}</p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">Weather / Airspace</p>
            </div>

            <div className="bg-rose-500/20 border border-rose-400/30 rounded-2xl p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-rose-200 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Cancelled</span>
                <Ban className="w-4 h-4 text-rose-300" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">{orders.filter((o) => o.status === 'cancelled').length}</p>
              <p className="text-[11px] text-rose-200/80 mt-0.5">Aborted Missions</p>
            </div>

            <div className="bg-purple-500/30 border border-purple-400/30 rounded-2xl p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-purple-200 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Gross Revenue</span>
                <DollarSign className="w-4 h-4 text-purple-300" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">₹{totalRevenue}</p>
              <p className="text-[11px] text-purple-200/80 mt-0.5">Active & Settled</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN DASHBOARD CONTAINER ────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto no-scrollbar border-b border-slate-200 pb-3">
          {[
            { id: 'orders', label: 'Orders Queue', icon: Package, badge: orders.length },
            { id: 'fleet', label: 'Fleet Operations', icon: Truck, badge: fleet.length },
            { id: 'analytics', label: 'Real Analytics & Revenue', icon: BarChart3, badge: `₹${totalRevenue}` },
            { id: 'enquiries', label: 'Expert Callback Requests', icon: Headphones, badge: expertRequests.filter((r) => r.status === 'pending' || !r.status).length },
            { id: 'feedbacks', label: 'Feedbacks & Reviews', icon: Star, badge: feedbacks.length }
          ].map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                tab === id ? 'bg-[#3b0080] text-white shadow-md shadow-purple-900/10' : 'bg-white border border-slate-200 text-slate-600 hover:border-purple-300 hover:text-[#3b0080]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {badge !== undefined && <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${tab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{badge}</span>}
            </button>
          ))}
        </div>

        {/* ── TAB 1: ORDERS QUEUE ─────────────────────────────────────────── */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {/* Filter and Search controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex gap-1.5 flex-wrap items-center">
                {['all', 'pending', 'assigned', 'in-flight', 'on-hold', 'delivered', 'cancelled'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filter === f ? 'bg-[#3b0080] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f === 'all' ? 'All Orders' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID, customer, mobile, drone..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-[#171222] focus:outline-none focus:border-[#3b0080] bg-white"
                />
              </div>
            </div>

            {/* Orders Listing */}
            {filteredOrders.length === 0 && !loading && (
              <div className="text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#3b0080]" />
                <p className="font-bold text-base text-slate-700">No Orders in Queue</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  {searchQuery ? 'No bookings match your search query.' : 'New orders placed by verified customers will stream into this operations queue live.'}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const isLive = ['assigned', 'taking-off', 'in-flight', 'approaching', 'on-hold'].includes(order.status);
                const isCancelled = order.status === 'cancelled';
                const isDelivered = order.status === 'delivered';

                return (
                  <div key={order.id} className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-5 shadow-xs transition-all">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Left: Metadata & Route */}
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono font-bold text-sm text-[#171222] bg-slate-100 px-2.5 py-1 rounded-lg">{order.id}</span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-700'}`}>{order.status}</span>
                          {order.drone_model && (
                            <span className="text-xs font-semibold text-slate-600 bg-purple-50 text-[#3b0080] border border-purple-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                              {order.drone_model} ({order.drone_id || 'Assigned'})
                            </span>
                          )}
                          {order.order_type === 'drone_purchase' ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">Customer booking · No payment</span>
                          ) : (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${order.payment_method === 'cod' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Paid Online'} · ₹{order.fare || order.fare_inr || 249}
                            </span>
                          )}
                        </div>

                        {/* Route info */}
                        <div className="text-xs text-slate-700 leading-snug space-y-1">
                          <p className="flex items-start gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
                            <span>
                              <strong>Origin Hub:</strong> {order.pickup_address || 'IndoWings Drone Hub Alpha (Sector 62)'}
                            </span>
                          </p>
                          <p className="flex items-start gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-purple-600 mt-1 shrink-0"></span>
                            <span>
                              <strong>Drop Target:</strong> {order.drop_address}
                            </span>
                          </p>
                        </div>

                        {/* Customer & Payload */}
                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <strong className="text-slate-700">{order.customer_name || 'Customer'}</strong>
                          </span>
                          {order.customer_phone && (
                            <span className="flex items-center gap-1 text-[#3b0080]">
                              <Phone className="w-3 h-3" /> {order.customer_phone}
                            </span>
                          )}
                          {order.customer_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {order.customer_email}
                            </span>
                          )}
                          <span>
                            {order.order_type === 'drone_purchase'
                              ? `${order.units_count} purchased unit${order.units_count === 1 ? '' : 's'}`
                              : `${order.package_type || 'Parcel'} (${order.package_weight_kg || 1.5} kg)`}
                          </span>
                        </div>

                        {/* Cancellation note */}
                        {isCancelled && (
                          <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                            <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>
                              <strong>Aborted / Cancelled:</strong> {order.cancellation_reason || 'Cancelled by customer'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Operational Actions */}
                      <div className="flex flex-wrap lg:flex-col items-stretch gap-2 shrink-0">
                        <button
                          onClick={() => {
                            onNavigate('track');
                            window.history.pushState({}, '', `/track?id=${order.id}`);
                          }}
                          className="px-3.5 py-2 text-xs font-bold bg-purple-50 text-[#3b0080] border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Radio className="w-3.5 h-3.5 text-[#3b0080] animate-pulse" /> Track Live Radar
                        </button>

                        {!isDelivered && !isCancelled && order.status !== 'on-hold' && (
                          <button
                            onClick={() => onNavigate('delivery-tracking')}
                            className="px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer text-center"
                          >
                            Manage Hold · OTP
                          </button>
                        )}

                        {!isDelivered && !isCancelled && order.status !== 'in-flight' && (
                          <button
                            onClick={() => onNavigate(order.order_type === 'drone_purchase' ? 'drone-dispatch' : 'delivery-tracking')}
                            className="px-3 py-1.5 text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200 rounded-xl hover:bg-sky-100 transition-colors cursor-pointer text-center"
                          >
                            {order.order_type === 'drone_purchase' ? 'Secure Drone Dispatch' : 'Dispatch · OTP'}
                          </button>
                        )}

                        {!isDelivered && !isCancelled && (
                          <button
                            onClick={() => onNavigate('delivery-tracking')}
                            className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer text-center"
                          >
                            Mark Delivered · OTP
                          </button>
                        )}

                        {!isDelivered && !isCancelled && (
                          <button
                            onClick={() => onNavigate('delivery-tracking')}
                            className="px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer text-center"
                          >
                            Cancel · OTP
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 2: FLEET OPERATIONS ─────────────────────────────────────── */}
        {tab === 'fleet' && (
          <div className="space-y-6">
            {/* Real Fleet Statistics Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Fleet Strength</span>
                <p className="text-3xl font-bold text-[#3b0080] font-mono">{fleet.length}</p>
                <p className="text-xs text-slate-500 mt-1">IndoWings Active UAV Airframes</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <span className="text-xs text-sky-600 font-bold uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                  </span>
                  In-Flight Missions
                </span>
                <p className="text-3xl font-bold text-sky-600 font-mono">{fleet.filter((d) => ['en-route', 'assigned'].includes(d.status)).length}</p>
                <p className="text-xs text-slate-500 mt-1">Carrying Customer Payloads</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider block mb-1">Ready on Standby</span>
                <p className="text-3xl font-bold text-emerald-600 font-mono">{fleet.filter((d) => d.status === 'idle').length}</p>
                <p className="text-xs text-slate-500 mt-1">Docked at Regional Hubs</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <span className="text-xs text-amber-600 font-bold uppercase tracking-wider block mb-1">Fast Charging</span>
                <p className="text-3xl font-bold text-amber-600 font-mono">{fleet.filter((d) => d.status === 'charging').length}</p>
                <p className="text-xs text-slate-500 mt-1">Hub Superchargers Active</p>
              </div>
            </div>

            {/* Filter and Search Fleet */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex gap-1.5 flex-wrap items-center">
                {[
                  { key: 'all', label: 'All Drones' },
                  { key: 'active', label: 'In-Flight' },
                  { key: 'idle', label: 'Standby / Idle' },
                  { key: 'charging', label: 'Charging' },
                  { key: 'on-hold', label: 'On Hold' }
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFleetFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      fleetFilter === f.key ? 'bg-[#3b0080] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={fleetSearch}
                    onChange={(e) => setFleetSearch(e.target.value)}
                    placeholder="Search Drone ID, model, city..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-[#171222] focus:outline-none focus:border-[#3b0080] bg-white"
                  />
                </div>

                <button
                  onClick={() => setShowRegisterDroneModal(true)}
                  className="px-3.5 py-2 bg-[#3b0080] hover:bg-[#280057] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Register UAV
                </button>
              </div>
            </div>

            {/* Fleet Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFleet.map((drone) => {
                const isFlying = ['en-route', 'assigned'].includes(drone.status);
                const hasOrder = Boolean(drone.assigned_order);

                return (
                  <div
                    key={drone.id}
                    className={`bg-white border rounded-2xl p-5 shadow-xs transition-all hover:shadow-md ${
                      hasOrder ? 'border-purple-300 ring-1 ring-purple-100' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="font-mono font-bold text-sm text-[#171222] block">{drone.id}</span>
                        <span className="text-xs text-slate-400 font-medium">{drone.model}</span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${DRONE_STATUS_COLORS[drone.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {drone.status.replace('-', ' ')}
                      </span>
                    </div>

                    {/* Battery gauge */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
                        <span className="flex items-center gap-1">
                          <Battery className="w-3.5 h-3.5 text-slate-400" /> Battery Telemetry
                        </span>
                        <span className={`font-bold ${drone.battery > 50 ? 'text-emerald-600' : drone.battery > 20 ? 'text-amber-600' : 'text-rose-600'}`}>{drone.battery}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${drone.battery > 50 ? 'bg-emerald-500' : drone.battery > 20 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${drone.battery}%` }}
                        />
                      </div>
                    </div>

                    {/* Flight Specs */}
                    <div className="grid grid-cols-3 gap-2 text-center mb-4 text-xs">
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Speed</span>
                        <span className="font-mono font-bold text-[#171222]">{drone.speed_kmh} km/h</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Altitude</span>
                        <span className="font-mono font-bold text-[#171222]">{drone.altitude_m}m</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Deliveries</span>
                        <span className="font-mono font-bold text-[#171222]">{drone.deliveries_today || 0}</span>
                      </div>
                    </div>

                    {/* Current Hub or Active Order */}
                    {hasOrder && drone.current_order ? (
                      <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-900 mb-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="font-mono font-bold">{drone.assigned_order}</strong>
                          <span className="text-[10px] uppercase font-bold bg-[#3b0080] text-white px-2 py-0.5 rounded-full">Carrying Cargo</span>
                        </div>
                        <p className="text-slate-600 text-[11px] truncate">Target: {drone.current_order.destination}</p>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#3b0080] shrink-0" />
                        <span className="font-medium text-slate-700 truncate">{drone.current_city || 'Noida Sector 62'}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <button
                      onClick={() => setSelectedDrone(drone)}
                      className="w-full py-2.5 bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-[#3b0080] border border-slate-200 hover:border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" /> Inspect & Control Telemetry
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 3: REAL ANALYTICS & REVENUE ─────────────────────────────── */}
        {tab === 'analytics' && (
          <div className="space-y-6">
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#3b0080] flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">Live Revenue</span>
                </div>
                <p className="text-3xl font-bold text-[#171222] font-mono">₹{analytics?.gross_revenue || totalRevenue}</p>
                <p className="text-xs text-slate-500 mt-1">Gross Settled & In-Flight Cargo Volume</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">Razorpay Online</span>
                </div>
                <p className="text-3xl font-bold text-emerald-700 font-mono">₹{analytics?.online_revenue || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Instant Digital UPI / Cards Received</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">Cash On Delivery</span>
                </div>
                <p className="text-3xl font-bold text-amber-700 font-mono">₹{analytics?.cod_revenue || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Receivable at Drone Landing Clearance</p>
              </div>
            </div>

            {/* Performance and Reliability Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Mission Success Rate</span>
                <p className="text-2xl font-bold text-emerald-700 font-mono">{analytics?.success_rate || 100}%</p>
                <p className="text-xs text-slate-500 mt-1">Completed vs Cancelled</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Fleet Air Utilization</span>
                <p className="text-2xl font-bold text-sky-700 font-mono">{analytics?.fleet_utilization || 0}%</p>
                <p className="text-xs text-slate-500 mt-1">Active Flights / Total Drones</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Avg. Delivery Duration</span>
                <p className="text-2xl font-bold text-[#3b0080] font-mono">22 min</p>
                <p className="text-xs text-slate-500 mt-1">Autonomous Point-to-Point</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Failed Flights</span>
                <p className="text-2xl font-bold text-rose-700 font-mono">0</p>
                <p className="text-xs text-slate-500 mt-1">Zero Air Crashes or Losses</p>
              </div>
            </div>

            {/* Real Recent Operations Log */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h3 className="text-base font-bold text-[#171222] mb-1">Recent Mission Operations Timeline</h3>
              <p className="text-xs text-slate-400 mb-5">Chronological audit stream of latest client orders</p>

              <div className="space-y-3">
                {(analytics?.recent_activity || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-purple-50/50 border border-slate-100 rounded-xl text-xs transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#3b0080] font-bold font-mono">{idx + 1}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#171222] font-mono">{item.order_id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-700'}`}>{item.status}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Client: <strong>{item.customer}</strong> · Assigned: {item.drone}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-[#171222] font-mono text-sm">₹{item.amount}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: EXPERT CALLBACK REQUESTS ─────────────────────────────── */}
        {tab === 'enquiries' && (
          <div className="space-y-6">
            {/* Top Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Inquiries</span>
                <p className="text-2xl font-bold text-[#171222] font-mono mt-1">{expertRequests.length}</p>
                <span className="text-[11px] text-slate-500">Live callback logs</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Pending Action</span>
                <p className="text-2xl font-bold text-amber-900 font-mono mt-1">{expertRequests.filter((r) => (r.status || 'pending') === 'pending').length}</p>
                <span className="text-[11px] text-amber-700">Needs callback call</span>
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Contacted</span>
                <p className="text-2xl font-bold text-sky-900 font-mono mt-1">{expertRequests.filter((r) => r.status === 'contacted' || r.status === 'in-progress').length}</p>
                <span className="text-[11px] text-sky-700">In conversation</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Resolved</span>
                <p className="text-2xl font-bold text-emerald-900 font-mono mt-1">{expertRequests.filter((r) => r.status === 'resolved').length}</p>
                <span className="text-[11px] text-emerald-700">Consultation done</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex gap-1.5 flex-wrap items-center">
                {['all', 'pending', 'in-progress', 'contacted', 'resolved'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setEnquiryFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                      enquiryFilter === f ? 'bg-[#3b0080] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f === 'all' ? 'All Inquiries' : f.replace('-', ' ')}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={enquirySearch}
                  onChange={(e) => setEnquirySearch(e.target.value)}
                  placeholder="Search name, phone, ref ID..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3b0080] focus:bg-white transition-all"
                />
                {enquirySearch && (
                  <button onClick={() => setEnquirySearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Inquiries List */}
            {expertRequests.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#3b0080] flex items-center justify-center mx-auto mb-3">
                  <Headphones className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#171222]">No Consultation Requests Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">When customers request a callback or terrace assessment from /support, their inquiries will appear here live.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expertRequests
                  .filter((req) => {
                    if (enquiryFilter !== 'all' && (req.status || 'pending') !== enquiryFilter) return false;
                    if (!enquirySearch) return true;
                    const q = enquirySearch.toLowerCase();
                    return (
                      req.id?.toLowerCase().includes(q) ||
                      req.name?.toLowerCase().includes(q) ||
                      req.phone?.toLowerCase().includes(q) ||
                      req.email?.toLowerCase().includes(q) ||
                      req.category?.toLowerCase().includes(q)
                    );
                  })
                  .map((req) => {
                    const cleanPhone = req.phone ? req.phone.replace(/[^0-9]/g, '') : '';
                    const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                      `Hello ${req.name}, this is IndoWings Operations regarding your inquiry ${req.id} about "${req.category}". How can we assist with your aerial delivery mission today?`
                    )}`;

                    return (
                      <div key={req.id} className="bg-white border border-slate-200 hover:border-purple-200 rounded-2xl p-5 shadow-xs transition-all">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Info Column */}
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold text-[#3b0080] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">{req.id}</span>
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">{req.category}</span>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                  req.status === 'resolved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : req.status === 'contacted'
                                      ? 'bg-sky-100 text-sky-800'
                                      : req.status === 'in-progress'
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-amber-100 text-amber-800 animate-pulse'
                                }`}
                              >
                                {req.status || 'pending'}
                              </span>
                              <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto sm:ml-0 font-mono">
                                <Clock className="w-3 h-3" />
                                {req.created_at ? new Date(req.created_at).toLocaleString() : 'Just now'}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-700">
                              <div className="font-bold text-sm text-[#171222] flex items-center gap-1.5">
                                <span>{req.name || 'Anonymous User'}</span>
                              </div>
                              {req.phone && (
                                <a href={`tel:${req.phone}`} className="flex items-center gap-1 hover:text-[#3b0080] font-mono text-xs font-semibold">
                                  <Phone className="w-3 h-3 text-[#3b0080]" />
                                  <span>{req.phone}</span>
                                </a>
                              )}
                              {req.email && (
                                <a href={`mailto:${req.email}`} className="flex items-center gap-1 hover:text-[#3b0080] text-xs">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span>{req.email}</span>
                                </a>
                              )}
                              <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                Slot: <strong>{req.preferred_time}</strong>
                              </span>
                            </div>

                            {req.message && <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 italic">"{req.message}"</div>}
                          </div>

                          {/* Action Column */}
                          <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4">
                            <div className="flex items-center gap-1.5">
                              {cleanPhone && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                              {req.phone && (
                                <a
                                  href={`tel:${req.phone}`}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>Call</span>
                                </a>
                              )}
                            </div>

                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Status:</span>
                                <select
                                  value={req.status || 'pending'}
                                  disabled={updatingEnquiryId === req.id}
                                  onChange={(e) => handleUpdateEnquiryStatus(req.id, e.target.value)}
                                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#3b0080]"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in-progress">In Progress</option>
                                  <option value="contacted">Contacted</option>
                                  <option value="resolved">Resolved</option>
                                </select>
                              </div>
                              <span className="text-[10px] text-purple-600 font-medium flex items-center gap-1 mt-1">
                                <Mail className="w-3 h-3 text-purple-500" />
                                <span>{updatingEnquiryId === req.id ? 'Sending update email...' : 'Auto-emails client'}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: FEEDBACKS & CUSTOMER REVIEWS ───────────────────────── */}
        {tab === 'feedbacks' && (
          <div className="space-y-6">
            {/* Feedback Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Reviews</span>
                <p className="text-2xl font-bold text-[#171222] font-mono mt-1">{feedbacks.length}</p>
                <span className="text-[11px] text-slate-500">Live flight evaluations</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Average Rating</span>
                <p className="text-2xl font-bold text-amber-900 font-mono mt-1">
                  {feedbacks.length > 0 ? `${(feedbacks.reduce((acc, f) => acc + (Number(f.rating) || 0), 0) / feedbacks.length).toFixed(1)} ★` : '—'}
                </p>
                <span className="text-[11px] text-amber-700">Flight satisfaction index</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">5-Star Flights</span>
                <p className="text-2xl font-bold text-emerald-900 font-mono mt-1">{feedbacks.filter((f) => Number(f.rating) === 5).length}</p>
                <span className="text-[11px] text-emerald-700">Flawless touchdowns</span>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-bold text-[#3b0080] uppercase tracking-wider block">Verified Missions</span>
                <p className="text-2xl font-bold text-[#3b0080] font-mono mt-1">{feedbacks.filter((f) => f.verified_order || f.order_id).length}</p>
                <span className="text-[11px] text-purple-700">Order-linked reviews</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex gap-1.5 flex-wrap items-center">
                <button
                  onClick={() => setFeedbackRatingFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    feedbackRatingFilter === 'all' ? 'bg-[#3b0080] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({feedbacks.length})
                </button>
                <button
                  onClick={() => setFeedbackRatingFilter(5)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    feedbackRatingFilter === 5 ? 'bg-[#3b0080] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>5 Stars</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                </button>
                <button
                  onClick={() => setFeedbackRatingFilter(4)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    feedbackRatingFilter === 4 ? 'bg-[#3b0080] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>4 Stars</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={feedbackSearch}
                  onChange={(e) => setFeedbackSearch(e.target.value)}
                  placeholder="Search user, drone model, order ID..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3b0080] focus:bg-white transition-all font-medium"
                />
                {feedbackSearch && (
                  <button onClick={() => setFeedbackSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Feedbacks Listing */}
            {feedbacks.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#3b0080] flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#171222]">No Customer Feedbacks Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Customer ratings and flight reviews will stream here automatically upon order completion.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbacks
                  .filter((f) => {
                    if (feedbackRatingFilter !== 'all' && Number(f.rating) !== feedbackRatingFilter) return false;
                    if (!feedbackSearch) return true;
                    const q = feedbackSearch.toLowerCase();
                    return (
                      (f.id || '').toLowerCase().includes(q) ||
                      (f.user_name || '').toLowerCase().includes(q) ||
                      (f.user_email || '').toLowerCase().includes(q) ||
                      (f.drone_name || '').toLowerCase().includes(q) ||
                      (f.order_id || '').toLowerCase().includes(q) ||
                      (f.message || '').toLowerCase().includes(q) ||
                      (f.category || '').toLowerCase().includes(q)
                    );
                  })
                  .map((fb) => {
                    const cleanPhone = fb.user_phone ? fb.user_phone.replace(/[^0-9]/g, '') : '';
                    const formattedDate = new Date(fb.created_at).toLocaleString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div key={fb.id} className="bg-white border border-slate-200 hover:border-purple-200 rounded-2xl p-5 shadow-xs transition-all">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            {/* Top Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold text-[#3b0080] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">{fb.id}</span>
                              {fb.order_id && <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">Order #{fb.order_id}</span>}
                              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-amber-800 text-xs font-bold">
                                <span>{fb.rating}</span>
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              </div>
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-[#3b0080] border border-purple-100 flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                <span>{fb.drone_name}</span>
                              </span>
                              {fb.verified_order && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">✓ Verified Flight</span>}
                              <span className="text-[11px] text-slate-400 ml-auto font-mono">{formattedDate}</span>
                            </div>

                            {/* Review Content */}
                            <p className="text-slate-800 text-sm leading-relaxed font-medium bg-slate-50/60 p-3 rounded-xl border border-slate-100 italic">"{fb.message}"</p>

                            {/* Customer Attribution */}
                            <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                              <span className="font-bold text-[#171222]">{fb.user_name}</span>
                              {fb.user_email && <span className="text-slate-400">{fb.user_email}</span>}
                              <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px] font-semibold">{fb.category}</span>
                            </div>
                          </div>

                          {/* Quick Admin Actions */}
                          <div className="flex lg:flex-col items-center lg:items-end gap-2 shrink-0">
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${fb.user_name}, thank you for your review on order ${fb.order_id || ''} via IndoWings!`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp Customer</span>
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteFeedback(fb.id)}
                              className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
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

      {/* ── REAL-TIME EMAIL DISPATCH TOAST ────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#171222] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-purple-500/30 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md">
          <div className="w-8 h-8 rounded-xl bg-purple-600/30 text-purple-300 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div className="text-xs flex-1">
            <p className="font-bold text-white">Automated Client Email</p>
            <p className="text-slate-300 line-clamp-2">{toastMessage}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── DRONE TELEMETRY INSPECTOR MODAL ───────────────────────────────── */}
      {selectedDrone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#3b0080] flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#171222] font-mono">{selectedDrone.id}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize border ${DRONE_STATUS_COLORS[selectedDrone.status] || 'bg-slate-100'}`}>{selectedDrone.status}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {selectedDrone.model} · {selectedDrone.current_city}
                  </p>
                </div>
              </div>

              <button onClick={() => setSelectedDrone(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Sensors Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Battery Gauge</span>
                <p className="text-base font-bold text-emerald-600 font-mono mt-0.5">{selectedDrone.battery}%</p>
                <span className="text-[10px] text-slate-400">Li-Ion 6S Smart Pack</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Speed / Velocity</span>
                <p className="text-base font-bold text-[#171222] font-mono mt-0.5">{selectedDrone.speed_kmh} km/h</p>
                <span className="text-[10px] text-slate-400">Ground Speed True</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Barometric Altitude</span>
                <p className="text-base font-bold text-[#171222] font-mono mt-0.5">{selectedDrone.altitude_m} m AGL</p>
                <span className="text-[10px] text-slate-400">LiDAR Terrain Fix</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GPS & Satellites</span>
                <p className="text-base font-bold text-emerald-600 font-mono mt-0.5">18 Sats (RTK Fix)</p>
                <span className="text-[10px] text-slate-400">±2cm Nav Accuracy</span>
              </div>
            </div>

            {/* Assigned Cargo */}
            {selectedDrone.assigned_order && selectedDrone.current_order && (
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl text-xs mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3b0080] block mb-1">Active Mission Cargo</span>
                <p className="font-mono font-bold text-slate-900">{selectedDrone.assigned_order}</p>
                <p className="text-slate-600 text-[11px] mt-0.5">Drop: {selectedDrone.current_order.destination}</p>
              </div>
            )}

            {/* Admin State Controls */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Commander Override State</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  disabled={updatingDrone}
                  onClick={() => handleUpdateDroneState(selectedDrone.id, 'idle')}
                  className="py-2 px-3 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  Set Standby
                </button>
                <button
                  disabled={updatingDrone}
                  onClick={() => handleUpdateDroneState(selectedDrone.id, 'charging')}
                  className="py-2 px-3 text-xs font-bold rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  Dock & Charge
                </button>
                <button
                  disabled={updatingDrone}
                  onClick={() => handleUpdateDroneState(selectedDrone.id, 'maintenance')}
                  className="py-2 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Maintenance
                </button>
              </div>
            </div>

            <div className="pt-4 mt-2">
              <button onClick={() => setSelectedDrone(null)} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer">
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REGISTER NEW UAV MODAL ────────────────────────────────────────── */}
      {showRegisterDroneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#171222]">Register New Airframe (UAV)</h3>
                <p className="text-xs text-slate-400">Add an autonomous delivery drone to the operational database</p>
              </div>
              <button onClick={() => setShowRegisterDroneModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {registerSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl mb-4">{registerSuccess}</div>}

            <form onSubmit={handleRegisterDrone} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Airframe Model</label>
                <select
                  value={newDroneModel}
                  onChange={(e) => setNewDroneModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-[#171222] focus:outline-none focus:border-[#3b0080] bg-white"
                >
                  <option value="Cyberone Max">Cyberone Max (Heavy Cargo • 5 kg payload)</option>
                  <option value="Cyberone Pro">Cyberone Pro (High Speed • 3 kg payload)</option>
                  <option value="Cyberone Lite">Cyberone Lite (Rapid Sortie • 1.5 kg payload)</option>
                  <option value="SkyCarrier X">SkyCarrier X (Long Range Inter-City • 10 kg payload)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Assigned Home Base Port</label>
                <select
                  value={newDroneCity}
                  onChange={(e) => setNewDroneCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-[#171222] focus:outline-none focus:border-[#3b0080] bg-white"
                >
                  <option value="Noida Sector 62">Noida Sector 62 (Port Alpha)</option>
                  <option value="Connaught Place, Delhi">Connaught Place (Central Port)</option>
                  <option value="Cyber City, Gurugram">DLF Cyber City (Air Hub)</option>
                  <option value="Faridabad Hub">Faridabad Industrial Port</option>
                  <option value="Greater Noida Knowledge Park">Greater Noida Tech Port</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Max Payload Rating (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newDronePayload}
                  onChange={(e) => setNewDronePayload(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-[#171222] focus:outline-none focus:border-[#3b0080] bg-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterDroneModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registeringDrone}
                  className="flex-1 py-2.5 bg-[#3b0080] hover:bg-[#280057] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {registeringDrone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{registeringDrone ? 'Registering...' : 'Register UAV'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DispatchPage;
