import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, CalendarDays, Check, CheckCircle2, Clock3, Loader2, Mail, Package,
  Phone, RefreshCw, Search, ShieldCheck, Truck, UserRound, X, Menu
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { DeliveryUser } from '../types';

interface DispatchModuleProps {
  currentUser: DeliveryUser | null;
  embedded?: boolean;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

interface DispatchDrone {
  id: string;
  model: string;
  status: string;
  assigned_order?: string;
  dispatch_status?: string;
  qc_status?: string;
  image_url?: string;
}

interface DispatchOrder {
  id: string;
  creator_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  order_type: string;
  status: string;
  created_at: string;
  items?: Array<{ model: string; quantity: number }>;
  reserved_inventory_ids?: string[];
}

interface DispatchRecord {
  id: string;
  order_id: string;
  client_id: string;
  client_name: string;
  drone_id: string;
  drone_model: string;
  dispatcher_id: string;
  dispatcher_name: string;
  status: string;
  otp_verified: boolean;
  dispatched_at: string;
}

interface DashboardData {
  clients: DeliveryUser[];
  orders: DispatchOrder[];
  fleet: DispatchDrone[];
  history: DispatchRecord[];
  stats: {
    pendingDispatches: number;
    todayDispatches: number;
    totalDispatched: number;
    availableDrones: number;
    pendingOrders: number;
  };
}

const EMPTY_DASHBOARD: DashboardData = {
  clients: [], orders: [], fleet: [], history: [],
  stats: { pendingDispatches: 0, todayDispatches: 0, totalDispatched: 0, availableDrones: 0, pendingOrders: 0 }
};

const dateValue = (value?: string) => value ? new Date(value).toLocaleString() : '—';

export const DroneDispatchModule: React.FC<DispatchModuleProps> = ({ currentUser, embedded = false, onNavigate, onLogout }) => {
  const [data, setData] = useState(EMPTY_DASHBOARD);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [month, setMonth] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedDroneIds, setSelectedDroneIds] = useState<string[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [historyStatus, setHistoryStatus] = useState('all');
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [otpSending, setOtpSending] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const token = localStorage.getItem('iw_delivery_token') || '';

  const loadDashboard = async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery/dispatch/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load dispatch dashboard.');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dispatch dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void loadDashboard(); }, [currentUser?.id]);

  const clients = useMemo(() => data.clients.filter(client => {
    const term = clientSearch.trim().toLowerCase();
    return !term || [client.name, client.email, client.phone, client.id]
      .some(value => String(value || '').toLowerCase().includes(term));
  }), [data.clients, clientSearch]);

  const selectedClient = data.clients.find(client => client.id === clientId);
  const clientOrders = useMemo(() => data.orders.filter(order => {
    if (!clientId || order.creator_id !== clientId) return false;
    const date = new Date(order.created_at);
    if (month && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` !== month) return false;
    if (fromDate && date < new Date(`${fromDate}T00:00:00`)) return false;
    if (toDate && date > new Date(`${toDate}T23:59:59.999`)) return false;
    return true;
  }), [data.orders, clientId, month, fromDate, toDate]);

  const selectedOrder = clientOrders.find(order => order.id === selectedOrderId);
  const selectedOrderDrones = useMemo(() => {
    if (!selectedOrder) return [];
    const ids = selectedOrder.reserved_inventory_ids || [];
    return ids.map(id => {
      const drone = data.fleet.find(item => item.id === id);
      const record = data.history.find(item => item.order_id === selectedOrder.id && item.drone_id === id);
      return { id, drone, record, dispatchable: Boolean(drone && drone.status === 'reserved' && drone.assigned_order === selectedOrder.id && !record) };
    });
  }, [selectedOrder, data.fleet, data.history]);
  const availableInventory = useMemo(() => data.fleet.filter(drone => {
    const matchesSearch = [drone.id, drone.model, drone.status]
      .some(value => String(value || '').toLowerCase().includes(inventorySearch.trim().toLowerCase()));
    return drone.status === 'idle' && drone.qc_status === 'passed' && matchesSearch;
  }), [data.fleet, inventorySearch]);

  const history = useMemo(() => data.history.filter(record => {
    const term = historySearch.trim().toLowerCase();
    const matchesTerm = !term || [
      record.client_name, record.client_id, record.drone_id, record.drone_model,
      record.order_id, record.dispatcher_name, record.dispatcher_id
    ].some(value => String(value || '').toLowerCase().includes(term));
    const dispatchedDate = record.dispatched_at.slice(0, 10);
    return matchesTerm
      && (historyStatus === 'all' || record.status === historyStatus)
      && (!historyFrom || dispatchedDate >= historyFrom)
      && (!historyTo || dispatchedDate <= historyTo);
  }), [data.history, historySearch, historyFrom, historyTo, historyStatus]);

  const toggleDrone = (id: string) => {
    setSelectedDroneIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const startDispatch = async () => {
    if (!selectedOrder || !selectedDroneIds.length) return;
    setError('');
    setNotice('');
    setOtpSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery/dispatch/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: selectedOrder.id, drone_ids: selectedDroneIds, channel })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send dispatch verification code.');
      setOtp('');
      setOtpOpen(true);
      setNotice(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send dispatch verification code.');
    } finally {
      setOtpSending(false);
    }
  };

  const confirmDispatch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOrder || !selectedDroneIds.length) return;
    setDispatching(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery/dispatch/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          order_id: selectedOrder.id, drone_ids: selectedDroneIds, channel, otp: otp.trim()
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Dispatch could not be completed.');
      setNotice(result.message);
      setOtpOpen(false);
      setSelectedDroneIds([]);
      await loadDashboard(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dispatch could not be completed.');
    } finally {
      setDispatching(false);
    }
  };

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'dispatcher') {
    return <div className="min-h-screen bg-[#f7f4fb] pt-32 px-4 text-center text-slate-600">Administrator or dispatcher access is required.</div>;
  }

  const stats = [
    { label: 'Pending dispatch units', value: data.stats.pendingDispatches, icon: Clock3, tone: 'text-amber-700 bg-amber-50' },
    { label: "Today's dispatches", value: data.stats.todayDispatches, icon: Activity, tone: 'text-sky-700 bg-sky-50' },
    { label: 'Dispatched drones', value: data.stats.totalDispatched, icon: Truck, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Available inventory', value: data.stats.availableDrones, icon: Package, tone: 'text-orange-800 bg-orange-50' },
    { label: 'Pending bookings', value: data.stats.pendingOrders, icon: CalendarDays, tone: 'text-indigo-700 bg-indigo-50' }
  ];

  return (
    <div className={embedded ? 'space-y-7' : 'min-h-screen bg-[#f7f4fb] pt-28 sm:pt-36 pb-16'}>
      {/* ── MOBILE SLIDE-OVER DRAWER ── */}
      {!embedded && mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-[85vw] max-w-[320px] bg-white h-full shadow-2xl flex flex-col justify-between p-5 z-10 animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-800 flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Dispatch Desk</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">IndoWings Operations</p>
                  </div>
                </div>
                <button onClick={() => setMobileSidebarOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav aria-label="Dispatcher mobile navigation" className="space-y-1.5">
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-xs font-black text-white bg-[#ef7f1a]"
                >
                  <Activity className="w-4 h-4" /> Drone Dispatch
                </button>
                <button
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    onNavigate?.('profile');
                    window.history.pushState({}, '', '/profile');
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-xs font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-800"
                >
                  <UserRound className="w-4 h-4" /> My Profile
                </button>
                <button
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    onNavigate?.('home');
                    window.history.pushState({}, '', '/');
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-xs font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-800"
                >
                  <Package className="w-4 h-4" /> Public Home
                </button>
              </nav>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-xs font-black">
                {currentUser.name?.[0]?.toUpperCase() || 'D'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-[10px] text-orange-700 font-semibold">Dispatcher</p>
              </div>
              <button onClick={onLogout} title="Sign out" className="text-xs font-bold text-slate-500 hover:text-rose-600">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={embedded ? '' : 'max-w-[1600px] mx-auto px-4 sm:px-6 flex flex-col md:flex-row gap-6 items-start'}>
        {!embedded && (
          <aside className="hidden md:block w-60 lg:w-64 shrink-0 md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-6.5rem)] md:overflow-hidden">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-4">
              <div className="flex items-center gap-3 px-2 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-800 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Dispatch Desk</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">IndoWings Operations</p>
                </div>
              </div>
              <nav aria-label="Dispatcher navigation" className="space-y-1.5">
                <button className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-black text-white bg-[#ef7f1a]">
                  <Activity className="w-4 h-4" /> Drone Dispatch
                </button>
                <button
                  onClick={() => {
                    onNavigate?.('profile');
                    window.history.pushState({}, '', '/profile');
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-800"
                >
                  <UserRound className="w-4 h-4" /> My Profile
                </button>
                <button
                  onClick={() => {
                    onNavigate?.('home');
                    window.history.pushState({}, '', '/');
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-800"
                >
                  <Package className="w-4 h-4" /> Public Home
                </button>
              </nav>
              <div className="border-t border-slate-100 pt-4 flex items-center gap-3 px-2">
                <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-xs font-black">
                  {currentUser.name?.[0]?.toUpperCase() || 'D'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-800">{currentUser.name}</p>
                  <p className="text-[10px] text-orange-700 font-semibold">Dispatcher</p>
                </div>
                <button onClick={onLogout} title="Sign out" className="text-xs font-bold text-slate-500 hover:text-rose-600">
                  Sign out
                </button>
              </div>
            </div>
          </aside>
        )}
        <main className={embedded ? 'space-y-7' : 'flex-1 min-w-0 space-y-7 w-full'}>
          {/* Mobile Drawer Trigger Header Bar */}
          {!embedded && (
            <div className="md:hidden flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#ef7f1a] flex items-center justify-center font-black shrink-0">
                  <Truck className="w-4 h-4 text-[#ef7f1a]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-slate-900 truncate">Dispatch Desk</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Tap menu to open drawer</p>
                </div>
              </div>

              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ef7f1a] hover:bg-[#d96e11] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Menu className="w-4 h-4" />
                <span>Menu</span>
              </button>
            </div>
          )}
        <section className="rounded-[2rem] bg-gradient-to-br from-[#1e0940] via-[#351064] to-[#54229a] text-white p-7 sm:p-10 relative overflow-hidden">
          <div className="absolute -right-16 -top-24 w-80 h-80 rounded-full border-[42px] border-white/5" />
          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-orange-100 text-xs font-bold"><ShieldCheck className="w-4 h-4" /> Authorized dispatch operations</span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-4">Drone Dispatch Dashboard</h1>
              <p className="text-white/70 mt-2 max-w-2xl">Match a customer booking to its reserved aircraft, verify each dispatch with OTP, and keep an auditable delivery trail.</p>
              <p className="text-xs text-white/60 mt-4">Signed in as {currentUser.name} · {currentUser.role}</p>
            </div>
            <button onClick={() => void loadDashboard(true)} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-white/10 hover:bg-white/20 text-sm font-bold disabled:opacity-60">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh dashboard
            </button>
          </div>
        </section>

        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div>}

        <section className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4" aria-label="Dispatch summary">
          {stats.map(stat => <article key={stat.label} className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.tone}`}><stat.icon className="w-4 h-4" /></div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">{stat.value}</p>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 mt-1">{stat.label}</p>
          </article>)}
        </section>

        <section className="grid xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)] gap-6 items-start">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-orange-800 font-black">01 · Client & booking</p>
              <h2 className="text-xl font-black text-slate-900 mt-1">Find a customer order</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={clientSearch} onChange={event => setClientSearch(event.target.value)} placeholder="Search name, email, phone or ID" className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-sm" aria-label="Search users by name email phone or ID" />
              </label>
              <label className="relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select value={clientId} onChange={event => { setClientId(event.target.value); setSelectedOrderId(''); setSelectedDroneIds([]); }} className="w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-3 text-sm">
                  <option value="">Select a client ({clients.length} shown)</option>
                  {clients.map(client => <option key={client.id} value={client.id}>{client.name} · {client.email || client.phone || client.id}</option>)}
                </select>
              </label>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="text-xs font-bold text-slate-500">Month<input type="month" value={month} onChange={event => setMonth(event.target.value)} className="block w-full mt-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800" /></label>
              <label className="text-xs font-bold text-slate-500">From date<input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className="block w-full mt-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800" /></label>
              <label className="text-xs font-bold text-slate-500">To date<input type="date" value={toDate} onChange={event => setToDate(event.target.value)} className="block w-full mt-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800" /></label>
            </div>
            {selectedClient && <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 text-sm">
              <p className="font-black text-slate-950">{selectedClient.name} <span className="font-medium text-orange-700">· {selectedClient.id}</span></p>
              <p className="text-orange-800 mt-1">{selectedClient.email || 'No email'} · {selectedClient.phone || 'No phone'}</p>
            </div>}
            {clientId && <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider font-black text-slate-500">Customer bookings ({clientOrders.length})</p>
              {clientOrders.length ? clientOrders.map(order => <button key={order.id} onClick={() => { setSelectedOrderId(order.id); setSelectedDroneIds([]); }} className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedOrderId === order.id ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-orange-200'}`}>
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-black text-slate-900">{order.id}</span>
                  <span className="text-xs font-bold text-slate-600">{order.status.toUpperCase()} · {new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">{(order.items || []).map(item => `${item.quantity} × ${item.model}`).join(' · ') || order.reserved_inventory_ids?.length + ' reserved drone(s)'}</p>
              </button>) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No customer bookings match these date filters.</p>}
            </div>}
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-widest text-orange-800 font-black">02 · Matching inventory</p>
            <h2 className="text-xl font-black text-slate-900 mt-1">Booked drones</h2>
            <p className="text-xs text-slate-500 mt-1">Only drones reserved for the selected customer order can be dispatched.</p>
            {!selectedOrder ? <div className="py-12 text-center text-sm text-slate-400"><Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />Select a booking to see its assigned drones.</div> : <>
              <div className="flex items-center justify-between gap-3 mt-4 mb-3">
                <p className="text-xs text-slate-500">Order <strong className="text-slate-800">{selectedOrder.id}</strong></p>
                <button onClick={() => setSelectedDroneIds(selectedOrderDrones.filter(item => item.dispatchable).map(item => item.id))} className="text-xs font-bold text-orange-800 hover:underline">Select all available</button>
              </div>
              <div className="space-y-2 max-h-[390px] overflow-auto">
                {selectedOrderDrones.map(({ id, drone, record, dispatchable }) => <label key={id} className={`flex items-start gap-3 rounded-xl border p-3 ${dispatchable ? 'border-slate-200 cursor-pointer hover:border-orange-300' : 'border-slate-100 bg-slate-50'}`}>
                  <input type="checkbox" checked={selectedDroneIds.includes(id)} disabled={!dispatchable} onChange={() => toggleDrone(id)} className="mt-1 accent-orange-800" />
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-sm text-slate-900">{drone?.model || selectedOrder.items?.find(item => item.model)?.model || 'Drone'} <span className="font-mono text-orange-800">· {id}</span></p>
                    <p className="text-[11px] text-slate-500 mt-1">Order {selectedOrder.id}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${dispatchable ? 'bg-emerald-50 text-emerald-700' : record ? 'bg-sky-50 text-sky-700' : 'bg-slate-200 text-slate-600'}`}>{record ? 'DISPATCHED' : drone?.status?.toUpperCase() || 'NOT AVAILABLE'}</span>
                </label>)}
                {!selectedOrderDrones.length && <p className="text-sm text-slate-500 py-5">This order has no linked reserved drone IDs.</p>}
              </div>
              {selectedDroneIds.length > 0 && <div className="mt-4 rounded-xl bg-orange-50 border border-orange-100 p-4 space-y-3">
                <p className="text-sm font-bold text-slate-950">{selectedDroneIds.length} drone(s) selected · OTP required</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={channel === 'email'} onChange={() => setChannel('email')} className="accent-orange-800" /><Mail className="w-3.5 h-3.5" /> Work email</label>
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={channel === 'phone'} onChange={() => setChannel('phone')} className="accent-orange-800" /><Phone className="w-3.5 h-3.5" /> Registered phone</label>
                </div>
                <button onClick={() => void startDispatch()} disabled={otpSending} className="w-full rounded-xl bg-[#ef7f1a] text-white py-3 text-sm font-black disabled:opacity-60">
                  {otpSending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Dispatch · Verify with OTP'}
                </button>
              </div>}
            </>}
          </div>
        </section>

        <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div><p className="text-[11px] uppercase tracking-widest text-orange-800 font-black">Live inventory</p><h2 className="text-xl font-black text-slate-900 mt-1">Available QC-cleared drones</h2><p className="text-xs text-slate-500 mt-1">These units are not attached to the selected customer booking and cannot be dispatched from it.</p></div>
            <label className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={inventorySearch} onChange={event => setInventorySearch(event.target.value)} placeholder="Search available drone ID or model" className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-xs" aria-label="Search available drones" /></label>
          </div>
          {availableInventory.length ? <div className="overflow-x-auto mt-4"><table className="w-full min-w-[520px] text-left text-xs">
            <thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400"><th className="py-3 pr-3">Drone ID</th><th className="py-3 pr-3">Model</th><th className="py-3 pr-3">Status</th><th className="py-3">Dispatch eligibility</th></tr></thead>
            <tbody>{availableInventory.map(drone => <tr key={drone.id} className="border-b last:border-0 border-slate-100"><td className="py-3 pr-3 font-mono font-bold text-orange-800">{drone.id}</td><td className="py-3 pr-3 font-semibold text-slate-800">{drone.model}</td><td className="py-3 pr-3"><span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 font-bold">{drone.status}</span></td><td className="py-3 text-slate-500">Not linked to this booking</td></tr>)}</tbody>
          </table></div> : <p className="py-8 text-center text-sm text-slate-500">No available QC-cleared drones match this search.</p>}
        </section>

        <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div><p className="text-[11px] uppercase tracking-widest text-orange-800 font-black">03 · Immutable audit trail</p><h2 className="text-xl font-black text-slate-900 mt-1">Dispatch history</h2></div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
              <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder="Client, drone, order, dispatcher" className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-xs" /></label>
              <select value={historyStatus} onChange={event => setHistoryStatus(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs"><option value="all">All statuses</option><option value="dispatched">Dispatched</option></select>
              <input aria-label="History from date" type="date" value={historyFrom} onChange={event => setHistoryFrom(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs" />
              <input aria-label="History to date" type="date" value={historyTo} onChange={event => setHistoryTo(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs" />
            </div>
          </div>
          {loading ? <div className="py-12 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading dispatch records…</div> : history.length ? <div className="overflow-x-auto mt-5">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400"><th className="py-3 pr-3">Client</th><th className="py-3 pr-3">Drone ID / Model</th><th className="py-3 pr-3">Order</th><th className="py-3 pr-3">Dispatched at</th><th className="py-3 pr-3">Dispatched by</th><th className="py-3 pr-3">Status</th><th className="py-3">OTP</th></tr></thead>
              <tbody>{history.map(record => <tr key={record.id} className="border-b last:border-0 border-slate-100">
                <td className="py-3 pr-3"><strong className="text-slate-800">{record.client_name}</strong><span className="block text-[10px] text-slate-400">{record.client_id}</span></td>
                <td className="py-3 pr-3"><strong className="font-mono text-orange-800">{record.drone_id}</strong><span className="block text-slate-500">{record.drone_model}</span></td>
                <td className="py-3 pr-3 font-mono text-slate-600">{record.order_id}</td>
                <td className="py-3 pr-3 text-slate-600">{dateValue(record.dispatched_at)}</td>
                <td className="py-3 pr-3"><strong className="text-slate-700">{record.dispatcher_name}</strong><span className="block text-[10px] text-slate-400">{record.dispatcher_id}</span></td>
                <td className="py-3 pr-3"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 font-bold"><CheckCircle2 className="w-3 h-3" />{record.status}</span></td>
                <td className="py-3">{record.otp_verified ? <span className="inline-flex items-center gap-1 text-emerald-700 font-bold"><Check className="w-3.5 h-3.5" /> Verified</span> : '—'}</td>
              </tr>)}</tbody>
            </table>
          </div> : <div className="py-12 text-center text-slate-500"><Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />No dispatch history matches these filters.</div>}
        </section>
      </main>
      </div>

      {otpOpen && <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4" role="presentation">
        <form onSubmit={confirmDispatch} role="dialog" aria-modal="true" aria-labelledby="dispatch-otp-title" className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4"><div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-800 flex items-center justify-center"><ShieldCheck className="w-6 h-6" /></div><button type="button" onClick={() => setOtpOpen(false)} aria-label="Close OTP verification" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button></div>
          <h2 id="dispatch-otp-title" className="text-2xl font-black text-slate-900 mt-5">Verify dispatch</h2>
          <p className="text-sm text-slate-500 mt-2">Enter the one-time code sent to your registered {channel}. This code authorizes {selectedDroneIds.length} drone(s) for order {selectedOrder?.id}.</p>
          <label className="block mt-5 text-xs font-bold text-slate-600">6-digit OTP<input autoFocus required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-2xl tracking-[0.5em] font-black outline-none focus:border-orange-500" /></label>
          {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
          <button type="submit" disabled={dispatching || otp.length !== 6} className="mt-5 w-full rounded-xl bg-[#ef7f1a] text-white py-3.5 font-black disabled:opacity-50">{dispatching ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify & dispatch drones'}</button>
          <p className="mt-3 text-center text-[11px] text-slate-400">Code expires in 10 minutes. A successful dispatch is recorded in the audit history.</p>
        </form>
      </div>}
    </div>
  );
};
