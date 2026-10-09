import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Truck,
  Package,
  RefreshCw,
  Phone,
  Mail,
  SlidersHorizontal,
  MapPin,
  Calendar,
  X,
  User,
  ShieldCheck,
  Loader2,
  ArrowLeft,
  Eye,
  Map,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { CustomerOrderLiveMap } from '../components/CustomerOrderLiveMap';
import { DeliveryUser } from '../types';
import { API_BASE_URL } from '../config/api';

interface DeliveryTrackingModuleProps {
  currentUser?: DeliveryUser | null;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const DeliveryTrackingModule: React.FC<DeliveryTrackingModuleProps> = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-transit' | 'delivered' | 'on-hold' | 'pending' | 'cancelled'>('all');
  
  // Selected Order for Split-Screen View
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  
  // Dedicated Full-Screen Track View Order
  const [fullScreenOrder, setFullScreenOrder] = useState<any | null>(null);

  // Full Order Details Modal State
  const [showDetailsOrder, setShowDetailsOrder] = useState<any | null>(null);

  // Manage Order Modal State (Hold, Reschedule, Resume, Cancel)
  const [managingOrder, setManagingOrder] = useState<any | null>(null);
  const [manageAction, setManageAction] = useState<'hold' | 'cancel' | 'reschedule' | 'resume'>('hold');
  const [manageReason, setManageReason] = useState('');
  const [manageDate, setManageDate] = useState('');
  const [manageTime, setManageTime] = useState('');
  const [manageSubmitting, setManageSubmitting] = useState(false);
  const [manageError, setManageError] = useState('');
  const [manageSuccess, setManageSuccess] = useState('');

  const fetchOrders = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('iw_delivery_token') || '';
      const res = await fetch(`${API_BASE_URL}/api/delivery/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.orders || [];
        setOrders(list);
        if (list.length > 0 && !selectedOrder) {
          setSelectedOrder(list[0]);
        }
      }
    } catch (err) {
      console.error('Error loading tracking orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        [
          order.id,
          order.order_number,
          order.customer_name,
          order.client_name,
          order.customer_phone,
          order.customer_email,
          order.drop_address,
          order.destination_address,
          order.pickup_address,
          order.drone_id,
          order.drone_model,
          order.assigned_partner
        ].some((val) => String(val || '').toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'in-transit') {
        return ['in-flight', 'in-transit', 'taking-off', 'approaching', 'out-for-delivery', 'assigned'].includes(order.status);
      }
      if (statusFilter === 'delivered') return order.status === 'delivered';
      if (statusFilter === 'on-hold') return order.status === 'on-hold' || order.status === 'rescheduled';
      if (statusFilter === 'pending') return order.status === 'pending';
      if (statusFilter === 'cancelled') return ['cancelled', 'failed'].includes(order.status);

      return true;
    });
  }, [orders, search, statusFilter]);

  // Keep selected order synced
  useEffect(() => {
    if (selectedOrder) {
      const current = orders.find((o) => o.id === selectedOrder.id);
      if (current) setSelectedOrder(current);
    } else if (filteredOrders.length > 0) {
      setSelectedOrder(filteredOrders[0]);
    }
  }, [orders]);

  // Handle Order Status Manage Action Submit
  const handleManageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingOrder) return;
    if (manageAction === 'hold' && manageReason.trim().length < 5) {
      setManageError('Please enter a specific reason (at least 5 characters).');
      return;
    }

    setManageSubmitting(true);
    setManageError('');
    setManageSuccess('');

    try {
      const token = localStorage.getItem('iw_delivery_token') || '';
      const endpoint =
        manageAction === 'hold'
          ? `${API_BASE_URL}/api/delivery/orders/${encodeURIComponent(managingOrder.id)}/hold`
          : manageAction === 'resume'
          ? `${API_BASE_URL}/api/delivery/orders/${encodeURIComponent(managingOrder.id)}/resume`
          : manageAction === 'cancel'
          ? `${API_BASE_URL}/api/delivery/orders/${encodeURIComponent(managingOrder.id)}/cancel`
          : `${API_BASE_URL}/api/delivery/orders/${encodeURIComponent(managingOrder.id)}/reschedule`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: manageReason.trim(),
          rescheduled_date: manageDate,
          scheduled_time: manageTime
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setManageError(data.error || 'Failed to update order status.');
        return;
      }

      setManageSuccess(`Order #${managingOrder.order_number || managingOrder.id} updated successfully!`);
      setTimeout(() => {
        setManagingOrder(null);
        setManageSuccess('');
      }, 1200);

      await fetchOrders();
    } catch {
      setManageError('Connection error while updating order.');
    } finally {
      setManageSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return { label: 'Delivered', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'in-flight':
      case 'in-transit':
      case 'out-for-delivery':
      case 'approaching':
      case 'taking-off':
      case 'assigned':
        return { label: 'In Transit', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'on-hold':
        return { label: 'On Hold', style: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'rescheduled':
        return { label: 'Rescheduled', style: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'cancelled':
      case 'failed':
        return { label: 'Cancelled', style: 'bg-rose-100 text-rose-700 border-rose-200' };
      default:
        return { label: 'Pending', style: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  // ── VIEW 1: FULL SCREEN CLEAN TRACKING MAP PAGE ────────────────────────
  if (fullScreenOrder) {
    const badge = getStatusBadge(fullScreenOrder.status);
    const orderNum = fullScreenOrder.order_number || fullScreenOrder.id;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col font-sans">
        {/* Fullscreen Header Bar */}
        <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFullScreenOrder(null)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Orders List</span>
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 font-mono tracking-tight">
                  #{String(orderNum).replace(/^#/, '')}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${badge.style}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xs sm:max-w-md">
                Customer: <strong>{fullScreenOrder.customer_name || fullScreenOrder.client_name || 'Customer'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetailsOrder(fullScreenOrder)}
              className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#5a00b8] border border-purple-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>View Full Details</span>
            </button>
          </div>
        </div>

        {/* Clean Full-Screen Map Canvas */}
        <div className="flex-1 w-full h-full relative">
          <CustomerOrderLiveMap order={fullScreenOrder} className="h-full w-full" />
        </div>

        {/* Full Order Details Modal Overlay */}
        {showDetailsOrder && (
          <OrderDetailsModal order={showDetailsOrder} onClose={() => setShowDetailsOrder(null)} />
        )}
      </div>
    );
  }

  // ── VIEW 2: SPLIT-SCREEN ORDERS LIST & MAP WORKSPACE ───────────────────
  return (
    <div className="space-y-5 font-sans">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Tracking Delivery</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Live route tracking, courier dispatch monitoring, and consignment status overview
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Order #, Customer, Phone..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#5a00b8] focus:bg-white transition"
            />
          </div>

          <button
            onClick={fetchOrders}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-[#5a00b8] transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
        {[
          { id: 'all', label: 'All Orders', count: orders.length },
          { id: 'in-transit', label: 'In Transit', count: orders.filter(o => ['in-flight', 'in-transit', 'taking-off', 'approaching', 'out-for-delivery', 'assigned'].includes(o.status)).length },
          { id: 'delivered', label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length },
          { id: 'on-hold', label: 'On Hold / Rescheduled', count: orders.filter(o => ['on-hold', 'rescheduled'].includes(o.status)).length },
          { id: 'pending', label: 'Pending Dispatch', count: orders.filter(o => o.status === 'pending').length },
          { id: 'cancelled', label: 'Cancelled', count: orders.filter(o => ['cancelled', 'failed'].includes(o.status)).length },
        ].map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setStatusFilter(id as any)}
            className={`px-4 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              statusFilter === id
                ? 'bg-[#5a00b8] text-white border-[#5a00b8] shadow-sm font-black'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{label}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${statusFilter === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Split Screen Workspace: Left List + Right Map */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[620px]">
        {/* LEFT COLUMN: Delivery Cards List */}
        <div className="w-full lg:w-[440px] xl:w-[480px] shrink-0 space-y-3.5 overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#5a00b8]" />
              Fetching active delivery dispatches...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-xs text-slate-500">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No delivery consignments match your filter.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isSelected = selectedOrder?.id === order.id;
              const badge = getStatusBadge(order.status);
              const custName = order.customer_name || order.client_name || 'Customer';
              const custPhone = order.customer_phone || '';
              const custEmail = order.customer_email || '';
              const originAddr = order.pickup_address || 'IndoFleet Dispatch Center, Noida';
              const dropAddr = order.drop_address || order.destination_address || 'Destination Address';
              const orderNum = order.order_number || order.id || 'ORDER';

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`bg-white border rounded-2xl p-4.5 transition-all cursor-pointer shadow-xs space-y-3.5 relative overflow-hidden group ${
                    isSelected
                      ? 'border-[#5a00b8] ring-2 ring-purple-500/20 bg-purple-50/10'
                      : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50/50'
                  }`}
                >
                  {/* Row 1: Order # & Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-mono text-slate-700 font-bold text-xs">
                        #
                      </div>
                      <span className="font-mono font-black text-slate-900 text-sm tracking-tight">
                        #{orderNum.replace(/^#/, '')}
                      </span>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold border ${badge.style}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Row 2: Route Visual Progress Line */}
                  <div className="py-1">
                    <div className="flex items-center justify-between relative px-2 mb-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0 z-10" />
                      
                      <div className="flex-1 mx-2 h-0.5 bg-slate-200 relative flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-white border border-slate-300 text-slate-700 shadow-xs flex items-center justify-center z-10 transition-transform group-hover:scale-110">
                          <Truck className="w-3.5 h-3.5 text-[#5a00b8]" />
                        </div>
                      </div>

                      <div className="w-2.5 h-2.5 rounded-full bg-slate-400 ring-4 ring-slate-100 shrink-0 z-10" />
                    </div>

                    <div className="flex items-start justify-between text-[11px] text-slate-500 font-medium px-1 gap-2">
                      <span className="truncate max-w-[45%] text-left" title={originAddr}>
                        {originAddr.split(',')[0]}
                      </span>
                      <span className="truncate max-w-[45%] text-right text-slate-700 font-semibold" title={dropAddr}>
                        {dropAddr.split(',')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Row 3: Customer Info Card */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {custName[0]?.toUpperCase() || 'C'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{custName}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Customer</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {custPhone && (
                        <a
                          href={`tel:${custPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                          title={`Call ${custName} (${custPhone})`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {custEmail && (
                        <a
                          href={`mailto:${custEmail}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-[#5a00b8] border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                          title={`Email ${custEmail}`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Explicit Action Buttons: TRACK | DETAILS | MANAGE */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Track Button (Opens Full Page Map) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullScreenOrder(order);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      <Map className="w-3.5 h-3.5" />
                      <span>Track</span>
                    </button>

                    {/* Details Button (Opens Full Details Modal) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDetailsOrder(order);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>

                    {/* Manage Button */}
                    {!['delivered', 'cancelled'].includes(order.status) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setManagingOrder(order);
                          setManageAction(order.status === 'on-hold' ? 'resume' : 'hold');
                          setManageReason('');
                          setManageDate(order.rescheduled_date || '');
                          setManageTime(order.scheduled_time || '');
                          setManageError('');
                        }}
                        className="py-1.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#5a00b8] border border-purple-200 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                        title="Manage Order Status"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Map Preview Panel */}
        <div className="flex-1 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs flex flex-col min-h-[520px] lg:min-h-[650px] relative">
          {selectedOrder ? (
            <>
              {/* Header Floating Banner */}
              <div className="p-4 bg-white/95 backdrop-blur-md border-b border-slate-200 z-10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-[#5a00b8] flex items-center justify-center font-bold shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 tracking-tight truncate">
                        Order #{selectedOrder.order_number || selectedOrder.id}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${getStatusBadge(selectedOrder.status).style}`}>
                        {getStatusBadge(selectedOrder.status).label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      Destination: <strong>{selectedOrder.drop_address || selectedOrder.destination_address || 'Client Address'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDetailsOrder(selectedOrder)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-slate-200"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>

                  <button
                    onClick={() => setFullScreenOrder(selectedOrder)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Track Fullscreen</span>
                  </button>
                </div>
              </div>

              {/* Map Component */}
              <div className="w-full flex-1 relative min-h-[480px]">
                <CustomerOrderLiveMap order={selectedOrder} className="h-full w-full" />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-12 text-center text-xs text-slate-400">
              Select an order from the list to view its map route.
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL 1: ORDER DETAILS MODAL ─────────────────────────────────── */}
      {showDetailsOrder && (
        <OrderDetailsModal order={showDetailsOrder} onClose={() => setShowDetailsOrder(null)} />
      )}

      {/* ── MODAL 2: MANAGE ORDER STATUS ────────────────────────────────── */}
      {managingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Manage Order #{managingOrder.order_number || managingOrder.id}
                </h3>
                <p className="text-xs text-slate-500">Update status, pause, reschedule or cancel consignment dispatch</p>
              </div>
              <button onClick={() => setManagingOrder(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManageSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManageAction('hold')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      manageAction === 'hold' ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400/20' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Hold Dispatch
                  </button>
                  <button
                    type="button"
                    onClick={() => setManageAction('reschedule')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      manageAction === 'reschedule' ? 'bg-purple-50 text-purple-900 border-purple-300 ring-2 ring-purple-400/20' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setManageAction('resume')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      manageAction === 'resume' ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-2 ring-emerald-400/20' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Resume Dispatch
                  </button>
                  <button
                    type="button"
                    onClick={() => setManageAction('cancel')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      manageAction === 'cancel' ? 'bg-rose-50 text-rose-900 border-rose-300 ring-2 ring-rose-400/20' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Cancel Order
                  </button>
                </div>
              </div>

              {manageAction === 'reschedule' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">New Date</label>
                    <input
                      type="date"
                      value={manageDate}
                      onChange={(e) => setManageDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Time Slot</label>
                    <input
                      type="time"
                      value={manageTime}
                      onChange={(e) => setManageTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operational Notes / Reason</label>
                <textarea
                  rows={3}
                  value={manageReason}
                  onChange={(e) => setManageReason(e.target.value)}
                  placeholder="Enter reason or operational notes for this status update..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              {manageError && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">{manageError}</p>}
              {manageSuccess && <p className="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">{manageSuccess}</p>}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setManagingOrder(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={manageSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  {manageSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Status Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ── REUSABLE ORDER DETAILS MODAL COMPONENT ─────────────────────────────────
const OrderDetailsModal: React.FC<{ order: any; onClose: () => void }> = ({ order, onClose }) => {
  const custName = order.customer_name || order.client_name || 'Customer';
  const custPhone = order.customer_phone || 'N/A';
  const custEmail = order.customer_email || 'N/A';
  const orderNum = order.order_number || order.id || 'ORDER';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-[#5a00b8] flex items-center justify-center font-black">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 font-mono">#{String(orderNum).replace(/^#/, '')}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">Full Consignment Specification & Logistics Dossier</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Customer Details */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-[#5a00b8]" /> Customer &amp; Recipient Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Customer Name</span>
              <span className="font-bold text-slate-900">{custName}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Phone Number</span>
              <a href={`tel:${custPhone}`} className="font-bold text-purple-700 hover:underline">{custPhone}</a>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Email Address</span>
              <a href={`mailto:${custEmail}`} className="font-bold text-purple-700 hover:underline truncate block">{custEmail}</a>
            </div>
          </div>
        </div>

        {/* Section 2: Route & Addresses */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" /> Route &amp; Hub Locations
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-emerald-600 font-bold uppercase block">Origin Dispatch Hub</span>
              <p className="font-bold text-slate-900 mt-1">{order.pickup_address || 'IndoFleet Dispatch Center, Noida Sector 62'}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-rose-600 font-bold uppercase block">Destination Delivery Point</span>
              <p className="font-bold text-slate-900 mt-1">{order.drop_address || order.destination_address || 'Client Address'}</p>
            </div>
          </div>
        </div>

        {/* Section 3: Hardware & Logistics */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" /> Hardware &amp; Logistics Specification
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Drone Unit</span>
              <span className="font-bold text-slate-900">{order.drone_model || '700RPAV Unit'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Quantity</span>
              <span className="font-bold text-slate-900">{order.units_count || 1} Unit(s)</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Logistics Carrier</span>
              <span className="font-bold text-slate-900">{order.carrier || 'IndoFleet Fleet'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Delivery Partner</span>
              <span className="font-bold text-purple-700">{order.pilot_assigned || order.delivery_partner_name || 'Assigned Partner'}</span>
            </div>
          </div>
        </div>

        {/* Section 4: Timestamps & Notes */}
        {(order.rescheduled_date || order.hold_reason || order.delivery_notes) && (
          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2 text-xs">
            <h4 className="font-bold text-[#5a00b8] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Operational Notes
            </h4>
            {order.rescheduled_date && (
              <p className="text-purple-900">
                <strong>Rescheduled Date:</strong> {order.rescheduled_date} {order.scheduled_time ? `at ${order.scheduled_time}` : ''}
              </p>
            )}
            {order.hold_reason && (
              <p className="text-purple-900">
                <strong>Hold Reason:</strong> {order.hold_reason}
              </p>
            )}
            {order.delivery_notes && (
              <p className="text-purple-900">
                <strong>Delivery Notes:</strong> {order.delivery_notes}
              </p>
            )}
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#5a00b8] hover:bg-[#4a0099] text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
