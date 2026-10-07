import React, { useState } from 'react';
import { MapPin, Package, Check, Clock, Loader2, AlertCircle, Search, Truck, Phone, Mail, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface TrackOrderPageProps {
  onNavigate: (page: string) => void;
  initialOrderId?: string;
  onOpenFeedback?: (order: any) => void;
}

const STATUS_COLORS: Record<string, string> = {
  delivered: 'bg-green-100 text-green-700 border-green-200',
  'in-flight': 'bg-blue-100 text-blue-700 border-blue-200',
  'on-hold': 'bg-purple-100 text-purple-700 border-purple-200',
  assigned: 'bg-purple-100 text-purple-700 border-purple-200',
  rescheduled: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  'taking-off': 'bg-blue-100 text-blue-700 border-blue-200',
  approaching: 'bg-teal-100 text-teal-700 border-teal-200',
  failed: 'bg-red-100 text-red-700 border-red-200'
};

const STATUS_LABELS: Record<string, string> = {
  delivered: 'Delivered',
  'in-flight': 'In Flight',
  'on-hold': 'On Hold',
  assigned: 'Drone Assigned',
  rescheduled: 'Rescheduled',
  pending: 'Pending',
  'taking-off': 'Taking Off',
  approaching: 'Approaching',
  failed: 'Failed'
};

export const TrackOrderPage: React.FC<TrackOrderPageProps> = ({ onNavigate, initialOrderId, onOpenFeedback }) => {
  const [orderId, setOrderId] = useState(() => {
    if (initialOrderId) return initialOrderId;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('id');
      if (q) return q;
    }
    return '';
  });

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  // Poll order status if active
  React.useEffect(() => {
    if (!order || ['delivered', 'cancelled', 'failed'].includes(order.status)) return;
    const interval = setInterval(() => {
      fetch(`${API_BASE_URL}/api/delivery/orders/${order.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.order) {
            setOrder(data.order);
            // If just transitioned to delivered while user is on screen
            if (data.order.status === 'delivered') {
              if (!data.order.feedback_submitted && !localStorage.getItem(`iw_feedback_prompted_${data.order.id}`)) {
                localStorage.setItem(`iw_feedback_prompted_${data.order.id}`, 'true');
                onOpenFeedback?.(data.order);
              }
            }
          }
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [order]);

  const handleSearch = async (e?: React.FormEvent, customId?: string) => {
    e?.preventDefault();
    const queryId = (customId || orderId).trim();
    if (!queryId) return;
    setLoading(true);
    setError('');
    setOrder(null);
    setSearched(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/orders/${queryId}`);
      const data = await res.json();
      if (!res.ok) {
        setError('Flight or consignment record not found. Please verify the ID and try again.');
        return;
      }
      setOrder(data.order);
      // If delivered upon initial load
      if (data.order.status === 'delivered') {
        if (!data.order.feedback_submitted && !localStorage.getItem(`iw_feedback_prompted_${data.order.id}`)) {
          localStorage.setItem(`iw_feedback_prompted_${data.order.id}`, 'true');
          onOpenFeedback?.(data.order);
        }
      }
    } catch {
      setError('Could not connect to tracking server.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    // Clear out any legacy local storage cache that was causing orders to auto-populate
    try {
      localStorage.removeItem('iw_last_order_id');
    } catch {}

    const queryId = initialOrderId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null);
    if (queryId && queryId.trim()) {
      handleSearch(undefined, queryId);
    }
  }, []);

  const formatTime = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-[#f7f4fb]">
      <section className="relative text-white pt-28 sm:pt-36 pb-20 px-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e0940 0%, #2b114d 50%, #1a0835 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-4xl mx-auto">
          <div className="w-14 h-14 bg-white/15 border border-white/20 rounded-xl flex items-center justify-center mb-5">
            <MapPin className="w-7 h-7 text-white" />
          </div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/70 mb-3">IndoWings Order Tracking</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight max-w-xl">Track your drone booking</h1>
          <p className="text-white/70 text-base max-w-xl leading-relaxed mb-8">Enter your booking or consignment ID to see order status and dispatch checkpoints.</p>
          <form onSubmit={handleSearch} className="flex gap-3 max-w-xl">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter booking or consignment ID"
                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 text-sm font-medium focus:outline-none focus:border-white/50 focus:bg-white/15"
              />
            </div>
            <button type="submit" className="px-6 py-4 bg-white text-[#5a00b8] font-bold rounded-xl hover:bg-white/90 transition-colors whitespace-nowrap cursor-pointer">
              Track
            </button>
          </form>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#5a00b8] animate-spin" />
          </div>
        )}

        {error && searched && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-[#171222] mb-2">Record Not Found</h3>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        )}

        {!order && !loading && !error && (
          <div className="bg-white border border-[#e2e8f0] rounded-3xl p-8 sm:p-12 text-center shadow-xs max-w-2xl mx-auto my-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto mb-5 text-[#5a00b8]">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-[#171222] mb-2">Track Any Flight or Consignment</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
              Enter a Flight Sortie or Consignment ID above to view live GPS coordinates, altitude, battery telemetry, and dispatch checkpoints.
            </p>
          </div>
        )}

        {order && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Order ID</p>
                  <p className="text-xl font-bold text-[#171222]">{order.id}</p>
                  <p className="text-sm text-slate-400 mt-1">{formatTime(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {order.status === 'delivered' && (
                    <button
                      onClick={() => onOpenFeedback?.(order)}
                      className="px-4 py-2 rounded-full text-xs font-bold bg-[#5a00b8] hover:bg-[#280058] text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{order.order_type === 'drone_purchase' ? 'Rate your purchase' : 'Rate Flight / Feedback'}</span>
                    </button>
                  )}
                  <span className={`px-4 py-2 rounded-full text-sm font-bold border ${STATUS_COLORS[order.status] || STATUS_COLORS.pending}`}>{STATUS_LABELS[order.status] || order.status}</span>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_360px] gap-6">
              {/* Timeline */}
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-[#171222] mb-6">Delivery Timeline</h3>
                <div className="space-y-0">
                  {(order.timeline || []).map((step: any, i: number) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${step.done ? 'bg-[#5a00b8] border-[#5a00b8]' : 'bg-white border-slate-200'}`}>
                          {step.done ? <Check className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                        </div>
                        {i < order.timeline.length - 1 && <div className={`w-0.5 flex-1 my-1 ${step.done ? 'bg-[#5a00b8]' : 'bg-slate-100'}`} style={{ minHeight: '28px' }} />}
                      </div>
                      <div className="pb-6">
                        <p className={`text-sm font-semibold ${step.done ? 'text-[#171222]' : 'text-slate-400'}`}>{step.step}</p>
                        {step.time && <p className="text-xs text-slate-400 mt-0.5">{formatTime(step.time)}</p>}
                        {!step.done && !step.time && <p className="text-xs text-slate-300 mt-0.5">Pending</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Sidebar */}
              <div className="space-y-4">
                {order.drone_id && (
                  <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Assigned Drone</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-[#5a00b8]" />
                      </div>
                      <div>
                        <p className="font-bold text-[#171222]">{order.drone_id}</p>
                        <p className="text-xs text-slate-400">{order.drone_model}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Route</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">PICKUP</p>
                        <p className="text-sm font-semibold text-[#171222]">{order.pickup_address}</p>
                      </div>
                    </div>
                    <div className="border-l-2 border-dashed border-slate-200 ml-2 pl-4 py-1">
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">DROP</p>
                        <p className="text-sm font-semibold text-[#171222]">{order.drop_address}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Package</h3>
                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-slate-400 text-xs">Type</p>
                      <p className="font-semibold text-[#171222]">{order.package_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">Weight</p>
                      <p className="font-semibold text-[#171222]">{order.weight_kg} kg</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">{order.recipient_name ? 'Recipient & Contact' : 'Customer Contact'}</h3>
                  <div className="space-y-2.5 text-sm">
                    {order.recipient_name ? (
                      <div>
                        <p className="text-[10px] font-bold text-[#5a00b8] uppercase tracking-wider">Recipient</p>
                        <p className="font-semibold text-[#171222]">{order.recipient_name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{order.recipient_phone || order.customer_phone || '-'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[#171222]">{order.customer_phone || '-'}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm pt-1 border-t border-slate-100">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[#171222] truncate">{order.customer_email || '-'}</span>
                    </div>

                    {order.delivery_notes && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Drop Instructions</p>
                        <p className="text-xs text-slate-600 italic mt-0.5">&ldquo;{order.delivery_notes}&rdquo;</p>
                      </div>
                    )}
                  </div>
                </div>

                {order.estimated_delivery && (
                  <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-[#5a00b8]" />
                      <p className="text-xs font-bold text-[#5a00b8] uppercase tracking-wide">Estimated Delivery</p>
                    </div>
                    <p className="text-sm font-bold text-[#171222]">{formatTime(order.estimated_delivery)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
