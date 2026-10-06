import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, ExternalLink, MapPin, Package, RefreshCw, Search, ShieldCheck, Truck, X } from 'lucide-react';
import type { ErrorEvent as MapLibreErrorEvent, Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DeliveryUser } from '../components/AuthModal';
import { API_BASE_URL } from '../config/api';

const MAPTILER_KEY = (import.meta as any).env?.VITE_MAPTILER_KEY as string | undefined;

interface DeliveryOrder {
  id: string;
  delivery_id?: string;
  order_type?: string;
  status: string;
  delivery_core_status?: string;
  customer_name?: string;
  client_name?: string;
  organization_name?: string;
  organization_id?: string;
  creator_id?: string;
  customer_phone?: string;
  customer_email?: string;
  drone_id?: string;
  drone_model?: string;
  package_type?: string;
  pickup_address?: string;
  drop_address?: string;
  destination_address?: string;
  last_known_location?: string | { address?: string; lat?: number; lng?: number };
  pickup_lat?: number;
  pickup_lng?: number;
  drop_lat?: number;
  drop_lng?: number;
  destination_lat?: number;
  destination_lng?: number;
  last_location_updated_at?: string;
  dispatch_time?: string;
  dispatched_at?: string;
  tracking_eta?: string;
  rpav_info?: {
    id: string;
    name?: string;
    status?: string;
    battery?: number | null;
    current_location?: string | null;
    last_location_updated_at?: string;
  } | null;
  porter_tracking_id?: string;
  porter_tracking_url?: string;
  porter_contact?: string;
  porter_updated_at?: string;
  estimated_delivery?: string;
  scheduled_time?: string;
  created_at?: string;
  updated_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  delivery_audit_log?: Array<Record<string, string | boolean>>;
  timeline?: Array<Record<string, string | boolean | null>>;
  status_before_hold?: string;
}

interface DeliveryDashboardData {
  counts: Record<string, number>;
  orders: DeliveryOrder[];
}

type DeliveryAction = 'hold' | 'unhold' | 'reschedule' | 'dispatch' | 'delivered' | 'cancel';

const DELIVERY_STAGES = ['Booking Created', 'Scheduled', 'RPAV Assigned', 'Dispatched', 'In Transit', 'Delivered'];

function deliveryStage(order: DeliveryOrder) {
  const baseStatus = order.status === 'on-hold' ? order.status_before_hold || order.delivery_core_status || 'pending' : order.status;
  const sourceStatus = baseStatus === 'rescheduled' ? order.delivery_core_status || 'assigned' : order.delivery_core_status || baseStatus;
  if (sourceStatus === 'delivered') return 5;
  if (['in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(sourceStatus)) return 4;
  if (['taking-off'].includes(sourceStatus)) return 3;
  if (sourceStatus === 'assigned') return order.dispatch_time || order.dispatched_at ? 3 : 2;
  if (order.scheduled_time) return 1;
  return 0;
}

function locationFreshness(updatedAt?: string) {
  if (!updatedAt) return 'GPS unavailable';
  const ageMinutes = Math.max(0, (Date.now() - new Date(updatedAt).getTime()) / 60000);
  if (!Number.isFinite(ageMinutes)) return 'Update time unavailable';
  return ageMinutes <= 5 ? 'Recently updated' : 'Last known location';
}

const EMPTY_DATA: DeliveryDashboardData = {
  counts: { total: 0, pending: 0, in_transit: 0, delivered: 0, on_hold: 0, rescheduled: 0, delayed: 0, failed: 0 },
  orders: []
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Booking created', assigned: 'RPAV assigned', 'taking-off': 'Dispatched',
  'in-flight': 'In transit', approaching: 'Out for delivery', delivered: 'Delivered',
  'on-hold': 'On hold', rescheduled: 'Rescheduled', delayed: 'Delayed',
  'out-for-delivery': 'Out for delivery', 'in-transit': 'In transit',
  failed: 'Failed delivery', cancelled: 'Cancelled'
};

const formatDate = (value?: string) => value ? new Date(value).toLocaleString('en-IN') : '—';

const DeliveryMap: React.FC<{ order: DeliveryOrder }> = ({ order }) => {
  const mapContainer = React.useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState('');
  const [mapNotice, setMapNotice] = useState('');

  useEffect(() => {
    if (!mapContainer.current) return;
    if (!MAPTILER_KEY) {
      setMapError('MapTiler key is missing. Set VITE_MAPTILER_KEY in the frontend environment.');
      return;
    }
    const controller = new AbortController();
    let map: MapLibreMap | null = null;
    setMapError('');
    setMapNotice('');

    const knownCurrent = typeof order.last_known_location === 'object' && order.last_known_location
      && Number.isFinite(order.last_known_location.lat) && Number.isFinite(order.last_known_location.lng)
      ? [Number(order.last_known_location.lng), Number(order.last_known_location.lat)] as [number, number]
      : undefined;
    const pickupCoords = Number.isFinite(order.pickup_lat) && Number.isFinite(order.pickup_lng)
      ? [Number(order.pickup_lng), Number(order.pickup_lat)] as [number, number] : undefined;
    const destinationCoords = Number.isFinite(order.drop_lat ?? order.destination_lat)
      && Number.isFinite(order.drop_lng ?? order.destination_lng)
      ? [Number(order.drop_lng ?? order.destination_lng), Number(order.drop_lat ?? order.destination_lat)] as [number, number]
      : undefined;

    const addMapMarkers = async () => {
      if (!map) return;
      const mapInstance = map;
      const maplibregl = await import('maplibre-gl');
      if (controller.signal.aborted) return;

      const points: Array<{ name: string; coordinates: [number, number]; color: string }> = [];
      if (pickupCoords) points.push({ name: 'Pickup', coordinates: pickupCoords, color: '#3b0080' });
      if (knownCurrent) points.push({ name: 'Last known location', coordinates: knownCurrent, color: '#e11d48' });
      if (destinationCoords) points.push({ name: 'Destination', coordinates: destinationCoords, color: '#15803d' });

      points.forEach(point => new maplibregl.Marker({ color: point.color })
        .setLngLat(point.coordinates)
        .setPopup(new maplibregl.Popup({ offset: 24 }).setText(point.name))
        .addTo(mapInstance));

      if (points.length >= 2) {
        const route = points.map(point => point.coordinates);
        mapInstance.addSource('delivery-route', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } }
        });
        mapInstance.addLayer({
          id: 'delivery-route-line',
          type: 'line',
          source: 'delivery-route',
          paint: { 'line-color': '#6d28d9', 'line-width': 3, 'line-dasharray': [2, 2] }
        });
        const bounds = new maplibregl.LngLatBounds(route[0], route[0]);
        route.slice(1).forEach(point => bounds.extend(point));
        mapInstance.fitBounds(bounds, { padding: 56, maxZoom: 13 });
        setMapNotice('Line is a visual connection between known points, not a navigation route.');
      } else if (points.length === 1) {
        mapInstance.setCenter(points[0].coordinates);
        mapInstance.setZoom(12);
        setMapNotice('Only one saved coordinate is available for this order.');
      } else {
        setMapNotice('No coordinates are saved for this order yet. The map is showing India without order markers.');
      }
    };

    const initializeMap = async () => {
      const maplibregl = await import('maplibre-gl');
      if (controller.signal.aborted || !mapContainer.current) return;
      map = new maplibregl.Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(MAPTILER_KEY)}`,
        center: [78.9629, 20.5937],
        zoom: 4
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      map.on('load', () => {
        void addMapMarkers().catch(error => {
          if (!controller.signal.aborted) setMapError(error instanceof Error ? error.message : 'Could not load delivery locations.');
        });
      });
      map.on('error', (event: MapLibreErrorEvent) => {
        if (!controller.signal.aborted && event.error) setMapError('MapTiler map could not be loaded. Check the API key and allowed-domain settings.');
      });
    };
    void initializeMap().catch(error => {
      if (!controller.signal.aborted) setMapError(error instanceof Error ? error.message : 'Could not initialize the map.');
    });

    return () => {
      controller.abort();
      map?.remove();
    };
  }, [order]);

  return (
    <div className="space-y-2">
      <div ref={mapContainer} className="h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100" aria-label="Map showing available delivery locations" />
      <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-600">
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#3b0080]" />Pickup</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-rose-600" />Last known location</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-700" />Destination</span>
      </div>
      {mapNotice && <p className="text-xs text-slate-500">{mapNotice}</p>}
      {mapError && <p role="alert" className="text-xs font-semibold text-rose-700">{mapError}</p>}
    </div>
  );
};

export const DeliveryTrackingModule: React.FC<{ currentUser: DeliveryUser | null; onNavigate?: (page: string) => void }> = ({ currentUser, onNavigate }) => {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [porterOrder, setPorterOrder] = useState<DeliveryOrder | null>(null);
  const [porterTrackingId, setPorterTrackingId] = useState('');
  const [porterTrackingUrl, setPorterTrackingUrl] = useState('');
  const [porterContact, setPorterContact] = useState('');
  const [savingPorter, setSavingPorter] = useState(false);
  const [actionOrder, setActionOrder] = useState<DeliveryOrder | null>(null);
  const [action, setAction] = useState<DeliveryAction>('hold');
  const [reason, setReason] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const canManagePorterTracking = currentUser?.role === 'admin' || currentUser?.role === 'dispatcher';

  const token = localStorage.getItem('iw_delivery_token') || '';
  const headers = { Authorization: `Bearer ${token}` };

  const loadDashboard = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery/delivery/dashboard`, { headers });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load deliveries.');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load deliveries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const filteredOrders = useMemo(() => data.orders.filter(order => {
    const query = search.trim().toLowerCase();
    const searchMatches = !query || [
      order.id, order.customer_name, order.customer_phone, order.customer_email,
      order.drone_id, order.drone_model, order.drop_address, order.pickup_address,
      order.porter_tracking_id, order.porter_contact, order.delivery_id, order.client_name,
      order.creator_id, order.organization_name, order.organization_id, order.rpav_info?.id, order.rpav_info?.name
    ].some(value => String(value || '').toLowerCase().includes(query));
    const date = String(order.created_at || '').slice(0, 10);
    const statusMatches = statusFilter === 'all'
      || (statusFilter === 'active' && !['delivered', 'cancelled', 'failed'].includes(order.status))
      || (statusFilter === 'completed' && order.status === 'delivered')
      || order.status === statusFilter;
    return searchMatches && statusMatches && (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
  }), [data.orders, search, statusFilter, fromDate, toDate]);

  const startAction = (order: DeliveryOrder, nextAction: DeliveryAction) => {
    setActionOrder(order);
    setAction(nextAction);
    setReason('');
    setScheduledTime('');
    setOtp('');
    setOtpRequested(false);
    setError('');
  };

  const requestOtp = async () => {
    if (!actionOrder || reason.trim().length < 5) {
      setError('Please enter a reason with at least 5 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery/delivery/actions/request-otp`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: actionOrder.id, action, reason: reason.trim(), channel,
          scheduled_time: action === 'reschedule' ? scheduledTime : undefined
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send verification code.');
      setOtpRequested(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send verification code.');
    } finally {
      setBusy(false);
    }
  };

  const confirmAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!actionOrder) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery/delivery/actions/confirm`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: actionOrder.id, action, reason: reason.trim(), channel, otp: otp.trim() })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Delivery action could not be completed.');
      setActionOrder(null);
      await loadDashboard(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delivery action could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const openPorterForm = (order: DeliveryOrder) => {
    setPorterOrder(order);
    setPorterTrackingId(order.porter_tracking_id || '');
    setPorterTrackingUrl(order.porter_tracking_url || '');
    setPorterContact(order.porter_contact || '');
    setError('');
  };

  const savePorterTracking = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!porterOrder) return;
    setSavingPorter(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/delivery/delivery/orders/${encodeURIComponent(porterOrder.id)}/porter-tracking`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          porter_tracking_id: porterTrackingId.trim(),
          porter_tracking_url: porterTrackingUrl.trim(),
          porter_contact: porterContact.trim()
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save Porter tracking details.');
      setPorterOrder(null);
      if (selectedOrder?.id === porterOrder.id) setSelectedOrder(result.order);
      await loadDashboard(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save Porter tracking details.');
    } finally {
      setSavingPorter(false);
    }
  };

  const cards = [
    ['Total deliveries', data.counts.total, Package],
    ['Pending', data.counts.pending, Clock3],
    ['In transit', data.counts.in_transit, Truck],
    ['Out for delivery', data.counts.out_for_delivery, Truck],
    ['Delivered', data.counts.delivered, CheckCircle2],
    ['On hold', data.counts.on_hold, ShieldCheck],
    ['Rescheduled', data.counts.rescheduled, CalendarClock],
    ['Delayed', data.counts.delayed, Clock3],
    ['Failed', data.counts.failed, X],
    ['Cancelled', data.counts.cancelled, X]
  ] as const;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-purple-700">Orders &amp; delivery</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">Delivery Tracking</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Follow dispatch and delivery progress. No live GPS source is connected; location is shown only when an actual update is recorded.</p>
          </div>
          <button onClick={() => void loadDashboard(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {label}<Icon className="h-4 w-4 text-purple-700" />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900">{value || 0}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order, customer, phone, drone, location" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" />
          </label>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="all">All statuses</option>
            <option value="active">Active deliveries</option>
            <option value="completed">Completed deliveries</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input aria-label="From date" type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input aria-label="To date" type="date" value={toDate} onChange={event => setToDate(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        </div>
        {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading delivery orders…</div> : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No delivery orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1680px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>{['Delivery ID / Order ID', 'Customer / Organization', 'RPAV / Status', 'Delivery status', 'Pickup → Destination', 'Scheduled', 'Dispatched', 'ETA', 'Last location update', 'Actions'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => {
                  const location = typeof order.last_known_location === 'string' ? order.last_known_location : order.last_known_location?.address;
                  return (
                    <tr key={order.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-3"><button onClick={() => setSelectedOrder(order)} className="font-mono font-bold text-purple-800 hover:underline">{order.delivery_id || `DEL-${order.id}`}</button><p className="mt-1 font-mono text-slate-600">{order.id}</p></td>
                      <td className="px-4 py-3"><p className="font-semibold text-slate-800">{order.client_name || order.customer_name || 'Customer'}</p><p className="text-slate-500">{order.customer_phone || '—'} · {order.customer_email || '—'}</p></td>
                      <td className="px-4 py-3"><p className="font-mono font-bold text-slate-700">{order.rpav_info?.id || order.drone_id || 'Not assigned'}</p><p className="text-slate-500">{order.rpav_info?.name || order.drone_model || order.package_type || '—'}</p><p className="mt-1 text-slate-500">{order.rpav_info?.status || 'RPAV status unavailable'}{order.rpav_info?.battery != null ? ` · ${order.rpav_info.battery}% battery` : ''}</p></td>
                      <td className="px-4 py-3"><span className="rounded-full bg-purple-50 px-2.5 py-1 font-bold text-purple-800">{STATUS_LABELS[order.status] || order.status}</span>{order.status === 'on-hold' && <p className="mt-1 text-amber-700">On Hold</p>}{order.status === 'rescheduled' && <p className="mt-1 text-sky-700">Rescheduled</p>}</td>
                      <td className="max-w-64 px-4 py-3"><p><strong>From:</strong> {order.pickup_address || '—'}</p><p className="mt-1"><strong>To:</strong> {order.drop_address || order.destination_address || '—'}</p></td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(order.scheduled_time)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(order.dispatch_time || order.dispatched_at)}</td>
                      <td className="px-4 py-3 text-slate-600">{order.tracking_eta ? formatDate(order.tracking_eta) : 'ETA unavailable'}</td>
                      <td className="max-w-48 px-4 py-3"><p className="flex items-center gap-1 text-slate-700"><MapPin className="h-3.5 w-3.5 shrink-0" />{location || 'GPS location unavailable'}</p><p className="mt-1 text-slate-400">{order.last_location_updated_at ? `Last known · ${formatDate(order.last_location_updated_at)}` : 'No location update recorded'}</p></td>
                      <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">
                        <button onClick={() => setSelectedOrder(order)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-700">Details</button>
                        {order.porter_tracking_id && order.porter_tracking_url && <a href={order.porter_tracking_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-sky-50 px-2.5 py-1.5 font-bold text-sky-800">Porter <ExternalLink className="inline h-3 w-3" /></a>}
                        {canManagePorterTracking && <button onClick={() => openPorterForm(order)} className="rounded-lg bg-sky-50 px-2.5 py-1.5 font-bold text-sky-800">{order.porter_tracking_id ? 'Edit Porter ID' : 'Add Porter ID'}</button>}
                        {order.order_type === 'drone_purchase' && !order.dispatch_time && <button onClick={() => onNavigate?.('drone-dispatch')} className="rounded-lg bg-indigo-50 px-2.5 py-1.5 font-bold text-indigo-800">Secure Dispatch</button>}
                        {canManagePorterTracking && order.order_type !== 'drone_purchase' && ['pending', 'assigned'].includes(order.status) && <button onClick={() => startAction(order, 'dispatch')} className="rounded-lg bg-indigo-50 px-2.5 py-1.5 font-bold text-indigo-800">Dispatch · OTP</button>}
                        {order.status !== 'on-hold' && !['delivered', 'cancelled', 'failed'].includes(order.status) && <button onClick={() => startAction(order, 'hold')} className="rounded-lg bg-amber-50 px-2.5 py-1.5 font-bold text-amber-800">Hold</button>}
                        {order.status === 'on-hold' && <button onClick={() => startAction(order, 'unhold')} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 font-bold text-emerald-800">Unhold</button>}
                        {!['delivered', 'cancelled', 'failed'].includes(order.status) && <button onClick={() => startAction(order, 'reschedule')} className="rounded-lg bg-purple-50 px-2.5 py-1.5 font-bold text-purple-800">Reschedule</button>}
                        {order.status !== 'on-hold' && (['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(order.status) || Boolean(order.dispatch_time || order.dispatched_at)) && <button onClick={() => startAction(order, 'delivered')} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 font-bold text-white">Mark Delivered</button>}
                        {!['delivered', 'cancelled', 'failed'].includes(order.status) && <button onClick={() => startAction(order, 'cancel')} className="rounded-lg bg-rose-50 px-2.5 py-1.5 font-bold text-rose-700">Cancel</button>}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <section className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase text-purple-700">Delivery details</p><h2 className="text-xl font-black">{selectedOrder.delivery_id || `DEL-${selectedOrder.id}`}</h2><p className="mt-1 font-mono text-xs text-slate-500">Order ID: {selectedOrder.id}</p></div><button onClick={() => setSelectedOrder(null)} aria-label="Close details"><X /></button></div>
            {selectedOrder.status === 'cancelled' ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-800">Cancelled · {selectedOrder.cancellation_reason || 'Reason recorded in history'}</div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-slate-900">Delivery progress</h3><div className="flex gap-2">{selectedOrder.status === 'on-hold' && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">On Hold</span>}{selectedOrder.status === 'rescheduled' && <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">Rescheduled</span>}</div></div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{DELIVERY_STAGES.map((stage, index) => {
                  const activeStage = deliveryStage(selectedOrder);
                  const complete = index < activeStage || selectedOrder.status === 'delivered' && index === activeStage;
                  const current = index === activeStage && selectedOrder.status !== 'delivered';
                  return <div key={stage} className="space-y-1 text-center"><div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${complete ? 'bg-emerald-600 text-white' : current ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-400'}`}>{complete ? '✓' : current ? '●' : '○'}</div><p className={`text-[10px] font-bold ${complete || current ? 'text-slate-800' : 'text-slate-400'}`}>{stage}</p></div>;
                })}</div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Customer', selectedOrder.customer_name || '—'],
                ['Customer ID', selectedOrder.creator_id || '—'],
                ['Phone', selectedOrder.customer_phone || '—'],
                ['Email', selectedOrder.customer_email || '—'],
                ['Organization', selectedOrder.organization_name || selectedOrder.client_name || '—'],
                ['Organization ID', selectedOrder.organization_id || '—'],
                ['RPAV ID / model', `${selectedOrder.rpav_info?.id || selectedOrder.drone_id || 'Unassigned'} · ${selectedOrder.rpav_info?.name || selectedOrder.drone_model || ''}`],
                ['RPAV status', selectedOrder.rpav_info?.status || 'Unavailable'],
                ['Last recorded battery', selectedOrder.rpav_info?.battery != null ? `${selectedOrder.rpav_info.battery}%` : 'Telemetry unavailable'],
                ['RPAV current location', selectedOrder.rpav_info?.current_location || 'Not recorded'],
                ['Status', STATUS_LABELS[selectedOrder.status] || selectedOrder.status],
                ['Pickup', selectedOrder.pickup_address || '—'],
                ['Destination', selectedOrder.drop_address || selectedOrder.destination_address || '—'],
                ['Last known location', typeof selectedOrder.last_known_location === 'string' ? selectedOrder.last_known_location : selectedOrder.last_known_location?.address || 'No GPS update recorded'],
                ['Coordinates', typeof selectedOrder.last_known_location === 'object' && selectedOrder.last_known_location?.lat != null && selectedOrder.last_known_location?.lng != null ? `${selectedOrder.last_known_location.lat}, ${selectedOrder.last_known_location.lng}` : 'Unavailable'],
                ['Location freshness', locationFreshness(selectedOrder.last_location_updated_at)],
                ['Location last updated', formatDate(selectedOrder.last_location_updated_at)],
                ['Estimated arrival', selectedOrder.tracking_eta ? formatDate(selectedOrder.tracking_eta) : 'ETA unavailable — no verified route/tracking feed'],
                ['Scheduled delivery', formatDate(selectedOrder.scheduled_time)],
                ['Dispatch time', formatDate(selectedOrder.dispatch_time || selectedOrder.dispatched_at)],
                ['Delivered at', formatDate(selectedOrder.delivered_at)],
                ['Porter booking / tracking ID', selectedOrder.porter_tracking_id || 'Not entered'],
                ['Porter contact', selectedOrder.porter_contact || '—'],
                ['Porter details updated', formatDate(selectedOrder.porter_updated_at)]
              ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>)}
            </div>
            {selectedOrder.porter_tracking_url && (
              <a href={selectedOrder.porter_tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-800 hover:bg-sky-100">
                Open Porter tracking page <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">Porter ID is saved against this order for the team to track in Porter. The ID alone does not provide live coordinates inside IndoFleet; that requires Porter tracking API/webhook access or manually entering location updates.</p>
            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <div>
                <h3 className="font-bold text-slate-900">MapTiler delivery map</h3>
                <p className="mt-1 text-xs text-slate-500">Markers use saved coordinates only. Customer delivery addresses are not sent to MapTiler for lookup.</p>
              </div>
              <DeliveryMap order={selectedOrder} />
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Live location tracking is not connected. Markers use only saved GPS coordinates and do not represent a live carrier position.
                {selectedOrder.last_location_updated_at ? ` Last GPS update: ${formatDate(selectedOrder.last_location_updated_at)}.` : ' No last-known GPS coordinate has been recorded.'}
              </p>
            </div>
            <div><h3 className="mb-2 font-bold text-slate-900">Delivery history</h3><div className="space-y-2">{[...(selectedOrder.timeline || [])].reverse().map((entry, index) => <div key={index} className="rounded-xl border border-slate-100 p-3 text-xs"><strong>{String(entry.step || 'Update')}</strong><p className="mt-1 text-slate-500">{formatDate(String(entry.time || ''))}{entry.details ? ` · ${entry.details}` : ''}{entry.performed_by ? ` · ${entry.performed_by}` : ''}</p></div>)}{(selectedOrder.delivery_audit_log || []).slice().reverse().map((entry, index) => <div key={`audit-${index}`} className="rounded-xl border border-purple-100 bg-purple-50/40 p-3 text-xs"><strong>{entry.action === 'porter_tracking_updated' ? 'Porter tracking updated' : `${String(entry.action)} · ${String(entry.previous_status)} → ${String(entry.new_status)}`}</strong><p className="mt-1 text-slate-600">{String(entry.reason || '')} · {String(entry.performed_by || '')}{entry.action !== 'porter_tracking_updated' && ` · OTP ${entry.otp_verified ? 'verified' : 'not verified'} by ${String(entry.otp_method)}`} · {formatDate(String(entry.timestamp || ''))}</p></div>)}</div></div>
          </section>
        </div>
      )}

      {porterOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={savePorterTracking} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-bold uppercase text-sky-700">Courier details</p><h2 className="text-lg font-black text-slate-900">Porter tracking ID</h2><p className="text-xs text-slate-500">{porterOrder.id}</p></div>
              <button type="button" onClick={() => setPorterOrder(null)} aria-label="Close Porter form"><X /></button>
            </div>
            <p className="text-xs text-slate-600">Porter booking hone ke baad uska trip/booking ID yahan enter karein. Ye ID order ke saath save hogi aur details me dikhegi.</p>
            <label className="block space-y-1 text-xs font-bold text-slate-700">Porter booking / tracking ID
              <input maxLength={120} value={porterTrackingId} onChange={event => setPorterTrackingId(event.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm font-mono" placeholder="Enter the ID provided by Porter" />
            </label>
            <label className="block space-y-1 text-xs font-bold text-slate-700">Porter tracking link (optional)
              <input type="url" value={porterTrackingUrl} onChange={event => setPorterTrackingUrl(event.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="https://..." />
            </label>
            <label className="block space-y-1 text-xs font-bold text-slate-700">Porter driver/contact (optional)
              <input maxLength={120} value={porterContact} onChange={event => setPorterContact(event.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Name or phone" />
            </label>
            {error && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2">
              {porterOrder.porter_tracking_id && <button type="button" onClick={() => { setPorterTrackingId(''); setPorterTrackingUrl(''); setPorterContact(''); }} className="mr-auto rounded-xl px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">Clear details</button>}
              <button type="button" onClick={() => setPorterOrder(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button>
              <button disabled={savingPorter || (!porterTrackingId.trim() && !porterOrder.porter_tracking_id)} className="rounded-xl bg-sky-700 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{savingPorter ? 'Saving…' : porterTrackingId.trim() ? 'Save Porter ID' : 'Remove Porter ID'}</button>
            </div>
          </form>
        </div>
      )}

      {actionOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={confirmAction} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-black">{action === 'delivered' ? 'Mark delivered' : action === 'cancel' ? 'Cancel delivery' : action === 'dispatch' ? 'Dispatch delivery' : `${action[0].toUpperCase()}${action.slice(1)} delivery`}</h2><p className="text-xs text-slate-500">{actionOrder.delivery_id || `DEL-${actionOrder.id}`} · {actionOrder.id}</p></div><button type="button" onClick={() => setActionOrder(null)} aria-label="Close"><X /></button></div>
            {(action === 'delivered' || action === 'cancel' || action === 'dispatch') && <p className={`rounded-xl p-3 text-xs ${action === 'cancel' ? 'border border-rose-200 bg-rose-50 text-rose-800' : 'border border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{action === 'cancel' ? 'Cancellation is terminal. A reason and OTP are required; the action is recorded in delivery history.' : action === 'dispatch' ? 'Dispatching changes this order to In Transit. Confirm the assigned RPAV is ready; the reason and OTP will be audited.' : 'Confirm that the customer has received the order. A reason and OTP are required before marking it delivered.'}</p>}
            <label className="block space-y-1 text-xs font-bold text-slate-700">Reason (required)<textarea required minLength={5} value={reason} onChange={event => setReason(event.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm" /></label>
            {action === 'reschedule' && <label className="block space-y-1 text-xs font-bold text-slate-700">New delivery date and time<input required type="datetime-local" min={new Date().toISOString().slice(0, 16)} value={scheduledTime} onChange={event => setScheduledTime(event.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" /></label>}
            <label className="block space-y-1 text-xs font-bold text-slate-700">Send OTP to
              <select value={channel} onChange={event => { setChannel(event.target.value as 'email' | 'phone'); setOtpRequested(false); }} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <option value="email" disabled={!currentUser?.email}>Email{currentUser?.email ? ` (${currentUser.email})` : ' unavailable'}</option>
                <option value="phone" disabled={!currentUser?.phone}>SMS{currentUser?.phone ? ` (${currentUser.phone})` : ' unavailable'}</option>
              </select>
            </label>
            {!otpRequested ? <button type="button" onClick={() => void requestOtp()} disabled={busy || reason.trim().length < 5} className="w-full rounded-xl bg-purple-800 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Sending…' : 'Send verification code'}</button> : <>
              <label className="block space-y-1 text-xs font-bold text-slate-700">Verification code<input required inputMode="numeric" value={otp} onChange={event => setOtp(event.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm tracking-widest" /></label>
              <button disabled={busy || !otp.trim()} className="w-full rounded-xl bg-purple-800 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Verifying…' : 'Verify and confirm action'}</button>
            </>}
            {error && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
            <p className="text-[11px] text-slate-500">Signed in as {currentUser?.name || 'operations user'}. OTP is required before this change is saved.</p>
          </form>
        </div>
      )}
    </div>
  );
};
