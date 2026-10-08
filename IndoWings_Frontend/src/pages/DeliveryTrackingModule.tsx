import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BellRing, CalendarClock, CheckCircle2, Clock3, ExternalLink, MapPin, Package, Pause, RefreshCw, Search, ShieldAlert, ShieldCheck, Truck, Volume2, VolumeX, X } from 'lucide-react';
import * as maplibregl from 'maplibre-gl';
import type { ErrorEvent as MapLibreErrorEvent, Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DeliveryUser } from '../types';
import { API_BASE_URL } from '../config/api';

if (typeof (maplibregl as any).setWorkerUrl === 'function') {
  (maplibregl as any).setWorkerUrl('/maplibre-gl-worker.mjs');
}

const MAPTILER_KEY = (import.meta as any).env?.VITE_MAPTILER_KEY as string | undefined;
const MAPBOX_TOKEN = (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

// Web Audio API Loud Emergency Siren Alert Synthesizer
class HoldSirenAlarm {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private intervalId: any = null;
  public isPlaying: boolean = false;

  start() {
    if (this.isPlaying) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);

      let toggle = false;
      const playTone = () => {
        if (!this.ctx || !this.gainNode) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(toggle ? 920 : 620, now);
        osc.connect(this.gainNode);
        osc.start(now);
        osc.stop(now + 0.32);
        toggle = !toggle;
      };

      playTone();
      this.intervalId = setInterval(playTone, 350);
      this.isPlaying = true;

      // Heavy vibration alarm for mobile drivers / pilots
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([800, 300, 800, 300, 1200]);
        } catch {}
      }
    } catch (e) {
      console.warn('Could not start hold siren audio context:', e);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
    this.isPlaying = false;
  }
}

const holdSiren = new HoldSirenAlarm();

interface RouteEstimate {
  eta: string;
  from: 'current-location' | 'pickup';
}

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
  reserved_inventory_ids?: string[];
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
  mapbox_route_url?: string;
  porter_updated_at?: string;
  estimated_delivery?: string;
  scheduled_time?: string;
  created_at?: string;
  updated_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  hold_reason?: string;
  held_at?: string;
  held_by?: string;
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
  pending: 'Booking Created', assigned: 'RPAV Assigned', 'taking-off': 'Dispatched',
  'in-flight': 'In Transit', approaching: 'Out for Delivery', delivered: 'Delivered',
  'on-hold': 'On Hold', rescheduled: 'Rescheduled', delayed: 'Delayed',
  'out-for-delivery': 'Out for Delivery', 'in-transit': 'In Transit',
  failed: 'Failed Delivery', cancelled: 'Cancelled'
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return { label: 'Booking Created', className: 'bg-amber-50 text-amber-800 border border-amber-200' };
    case 'assigned':
      return { label: 'RPAV Assigned', className: 'bg-blue-50 text-blue-700 border border-blue-200' };
    case 'taking-off':
      return { label: 'Dispatched', className: 'bg-indigo-50 text-indigo-700 border border-indigo-200' };
    case 'in-flight':
    case 'in-transit':
      return { label: 'In Transit', className: 'bg-purple-50 text-purple-700 border border-purple-200' };
    case 'out-for-delivery':
    case 'approaching':
      return { label: 'Out for Delivery', className: 'bg-cyan-50 text-cyan-800 border border-cyan-200' };
    case 'delivered':
      return { label: 'Delivered', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    case 'on-hold':
      return { label: 'On Hold', className: 'bg-amber-100 text-amber-900 border border-amber-300' };
    case 'rescheduled':
      return { label: 'Rescheduled', className: 'bg-sky-50 text-sky-700 border border-sky-200' };
    case 'delayed':
      return { label: 'Delayed', className: 'bg-yellow-50 text-yellow-800 border border-yellow-200' };
    case 'failed':
      return { label: 'Failed Delivery', className: 'bg-red-50 text-red-700 border border-red-200' };
    case 'cancelled':
      return { label: 'Cancelled', className: 'bg-rose-50 text-rose-700 border border-rose-200' };
    default:
      return { label: status, className: 'bg-slate-100 text-slate-700 border border-slate-200' };
  }
};

const formatDate = (value?: string) => value ? new Date(value).toLocaleString('en-IN') : '—';

const DeliveryMap: React.FC<{
  order: DeliveryOrder;
  onEtaUpdate: (orderId: string, estimate: RouteEstimate | null) => void;
  isSirenPlaying?: boolean;
  onToggleSiren?: () => void;
}> = ({ order, onEtaUpdate, isSirenPlaying, onToggleSiren }) => {
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
    onEtaUpdate(order.id, null);

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
      if (controller.signal.aborted) return;

      const points: Array<{ name: string; coordinates: [number, number]; color: string }> = [];
      if (pickupCoords) points.push({ name: 'Pickup', coordinates: pickupCoords, color: '#5a00b8' });
      if (knownCurrent) points.push({ name: 'Last known location', coordinates: knownCurrent, color: '#e11d48' });
      if (destinationCoords) points.push({ name: 'Destination', coordinates: destinationCoords, color: '#15803d' });

      points.forEach(point => new maplibregl.Marker({ color: point.color })
        .setLngLat(point.coordinates)
        .setPopup(new maplibregl.Popup({ offset: 24 }).setText(point.name))
        .addTo(mapInstance));

      const routeStart = knownCurrent || pickupCoords;
      let routeCoords: [number, number][] = [];
      let routeFromMapbox = false;
      if (routeStart && destinationCoords && MAPBOX_TOKEN) {
        const routeUrl = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${routeStart.join(',')};${destinationCoords.join(',')}`);
        routeUrl.searchParams.set('alternatives', 'false');
        routeUrl.searchParams.set('geometries', 'geojson');
        routeUrl.searchParams.set('overview', 'full');
        routeUrl.searchParams.set('access_token', MAPBOX_TOKEN);
        const response = await fetch(routeUrl, { signal: controller.signal });
        if (!response.ok) {
          setMapNotice(`Mapbox routing failed (HTTP ${response.status}); route ETA is unavailable.`);
        } else {
          const result = await response.json();
          const route = result.routes?.[0];
          const durationSeconds = Number(route?.duration);
          const coordinates = route?.geometry?.coordinates;
          if (Number.isFinite(durationSeconds) && durationSeconds >= 0 && Array.isArray(coordinates) && coordinates.length >= 2) {
            routeCoords = coordinates as [number, number][];
            routeFromMapbox = true;
            onEtaUpdate(order.id, {
              eta: new Date(Date.now() + durationSeconds * 1000).toISOString(),
              from: knownCurrent ? 'current-location' : 'pickup'
            });
            setMapNotice(`Mapbox driving-route estimate from ${knownCurrent ? 'last known carrier location' : 'pickup'}; it is not live and may differ from the courier's actual ETA.`);
          } else {
            setMapNotice('Mapbox returned no usable route; route ETA is unavailable.');
          }
        }
      } else if (routeStart && destinationCoords) {
        setMapNotice(MAPBOX_TOKEN
          ? 'Saved coordinates are needed for a Mapbox route and ETA.'
          : 'Add VITE_MAPBOX_ACCESS_TOKEN to enable route-based ETA. The map will not estimate ETA without it.');
      }

      if (routeCoords.length < 2 && routeStart && destinationCoords) routeCoords = [routeStart, destinationCoords];
      if (routeCoords.length >= 2) {
        mapInstance.addSource('delivery-route', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routeCoords } }
        });
        mapInstance.addLayer({
          id: 'delivery-route-line',
          type: 'line',
          source: 'delivery-route',
          paint: { 'line-color': '#6d28d9', 'line-width': 3, ...(!routeFromMapbox ? { 'line-dasharray': [2, 2] } : {}) }
        });
        const bounds = new maplibregl.LngLatBounds(routeCoords[0], routeCoords[0]);
        routeCoords.slice(1).forEach(point => bounds.extend(point));
        mapInstance.fitBounds(bounds, { padding: 56, maxZoom: 13 });
        if (!MAPBOX_TOKEN && !mapNotice) setMapNotice('Dashed line is a visual connection, not a navigation route. ETA unavailable.');
      } else if (points.length === 1) {
        mapInstance.setCenter(points[0].coordinates);
        mapInstance.setZoom(12);
        setMapNotice('Only one saved coordinate is available for this order.');
      } else if (!points.length) {
        setMapNotice('No coordinates are saved for this order yet. The map is showing India without order markers.');
      } else {
        setMapNotice('Pickup and destination coordinates are required to draw a route or calculate ETA.');
      }
    };

    const initializeMap = async () => {
      if (controller.signal.aborted || !mapContainer.current) return;
      const mapInstance = new maplibregl.Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(MAPTILER_KEY)}`,
        center: [78.9629, 20.5937],
        zoom: 4
      });
      map = mapInstance;
      mapInstance.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      mapInstance.on('load', () => {
        void addMapMarkers().catch(error => {
          if (!controller.signal.aborted) setMapError(error instanceof Error ? error.message : 'Could not load delivery locations.');
        });
      });
      mapInstance.on('error', (event: MapLibreErrorEvent) => {
        if (!controller.signal.aborted && event.error) setMapError('MapTiler map could not be loaded. Check the API key and allowed-domain settings.');
      });
    };
    void initializeMap().catch(error => {
      if (!controller.signal.aborted) setMapError(error instanceof Error ? error.message : 'Could not initialize the map.');
    });

    return () => {
      controller.abort();
      map?.remove();
      onEtaUpdate(order.id, null);
    };
  }, [order, onEtaUpdate]);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
        <div
          ref={mapContainer}
          className={`h-72 w-full transition-all duration-300 ${order.status === 'on-hold' ? 'filter brightness-40 grayscale-75 pointer-events-none' : ''}`}
          aria-label="Map showing available delivery locations"
        />

        {order.status === 'on-hold' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-[2px] p-6 text-center text-white border-2 border-amber-500 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-3 shadow-lg ring-4 ring-amber-400/20 animate-pulse">
              <Pause className="w-7 h-7 text-amber-300" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider mb-2 shadow-md">
              🛑 FLIGHT &amp; TRANSIT FROZEN · ORDER ON HOLD
            </div>
            <div className="max-w-md bg-amber-950/60 border border-amber-500/40 rounded-xl px-4 py-2.5 mt-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Mandatory Hold Reason</p>
              <p className="text-sm font-black text-amber-100 mt-0.5">&ldquo;{order.hold_reason || 'Corridor Weather / Operational Security Pause'}&rdquo;</p>
            </div>
            <p className="text-[11px] text-slate-300 mt-2 max-w-sm">
              Pilot &amp; Driver Safety Lock: Navigation corridor is frozen. Halt transit immediately until cleared by Dispatch Operations.
            </p>
            {order.held_by && (
              <p className="text-[10px] text-amber-400/90 mt-1 font-mono">
                Authorized By: {order.held_by} {order.held_at ? `· ${new Date(order.held_at).toLocaleTimeString('en-IN')}` : ''}
              </p>
            )}
            {onToggleSiren && (
              <button
                type="button"
                onClick={onToggleSiren}
                className={`mt-3 px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition ${
                  isSirenPlaying
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-bounce ring-2 ring-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40'
                }`}
              >
                {isSirenPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isSirenPlaying ? 'Acknowledge & Silence Siren' : 'Test Hold Emergency Siren'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-600">
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#5a00b8]" />Pickup</span>
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
  const [routeEstimates, setRouteEstimates] = useState<Record<string, RouteEstimate>>({});
  const [porterOrder, setPorterOrder] = useState<DeliveryOrder | null>(null);
  const [porterTrackingId, setPorterTrackingId] = useState('');
  const [porterTrackingUrl, setPorterTrackingUrl] = useState('');
  const [porterContact, setPorterContact] = useState('');
  const [mapboxRouteUrl, setMapboxRouteUrl] = useState('');
  const [savingPorter, setSavingPorter] = useState(false);
  const [actionOrder, setActionOrder] = useState<DeliveryOrder | null>(null);
  const [action, setAction] = useState<DeliveryAction>('hold');
  const [reason, setReason] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sirenPlaying, setSirenPlaying] = useState(false);

  const toggleSiren = useCallback(() => {
    if (sirenPlaying) {
      holdSiren.stop();
      setSirenPlaying(false);
    } else {
      holdSiren.start();
      setSirenPlaying(true);
    }
  }, [sirenPlaying]);

  useEffect(() => {
    if (selectedOrder?.status === 'on-hold') {
      holdSiren.start();
      setSirenPlaying(true);
    } else {
      holdSiren.stop();
      setSirenPlaying(false);
    }
    return () => {
      holdSiren.stop();
    };
  }, [selectedOrder?.id, selectedOrder?.status]);

  const canManagePorterTracking = currentUser?.role === 'admin' || currentUser?.role === 'dispatcher';
  const handleRouteEta = useCallback((orderId: string, estimate: RouteEstimate | null) => {
    setRouteEstimates(previous => {
      if (!estimate && !previous[orderId]) return previous;
      const next = { ...previous };
      if (estimate) next[orderId] = estimate;
      else delete next[orderId];
      return next;
    });
  }, []);

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
    setMapboxRouteUrl(order.mapbox_route_url || '');
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
          porter_contact: porterContact.trim(),
          mapbox_route_url: mapboxRouteUrl.trim()
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

      {sirenPlaying && (
        <div className="rounded-2xl border-2 border-red-500 bg-red-600 p-4 text-white shadow-xl flex flex-wrap items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Volume2 className="w-6 h-6 text-white animate-spin" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-red-100 flex items-center gap-1.5">
                <BellRing className="w-4 h-4" /> 🚨 EMERGENCY MISSION ON HOLD: SIREN ALARM SOUNDING
              </p>
              <p className="text-sm font-bold mt-0.5">
                {selectedOrder?.id ? `Order #${selectedOrder.id}: ` : ''}
                {selectedOrder?.hold_reason || 'Corridor transit frozen. Pilot/Driver halt vehicle immediately!'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleSiren}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-red-700 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-md shrink-0 flex items-center gap-1.5"
          >
            <VolumeX className="w-4 h-4" />
            <span>Acknowledge &amp; Stop Siren</span>
          </button>
        </div>
      )}

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
            <table className="w-full min-w-[1320px] text-left text-xs">
              <thead className="bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Delivery ID / Order ID</th>
                  <th className="px-4 py-3.5">Customer / Organization</th>
                  <th className="px-4 py-3.5">RPAV / Model</th>
                  <th className="px-4 py-3.5">Delivery Status</th>
                  <th className="px-4 py-3.5">Pickup → Destination</th>
                  <th className="px-4 py-3.5">Scheduled</th>
                  <th className="px-4 py-3.5">Dispatched</th>
                  <th className="px-4 py-3.5">ETA</th>
                  <th className="px-4 py-3.5">Last Location</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => {
                  const location = typeof order.last_known_location === 'string' ? order.last_known_location : order.last_known_location?.address;
                  const badge = getStatusBadge(order.status);
                  const isTerminal = ['delivered', 'cancelled', 'failed'].includes(order.status);

                  return (
                    <tr key={order.id} className="align-top hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <button onClick={() => setSelectedOrder(order)} className="font-mono font-bold text-purple-800 hover:underline text-left block">
                          {order.delivery_id || `DEL-${order.id}`}
                        </button>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-500">{order.id}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900">{order.client_name || order.customer_name || 'Customer'}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">{order.customer_phone || '—'}</p>
                        {order.customer_email && <p className="text-slate-400 text-[10px] truncate max-w-[170px]">{order.customer_email}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-mono font-bold text-slate-800">
                          {order.rpav_info?.id || order.drone_id || (Array.isArray(order.reserved_inventory_ids) && order.reserved_inventory_ids.length ? `${order.reserved_inventory_ids.length} Units` : 'Not assigned')}
                        </p>
                        <p className="text-slate-500 text-[11px] mt-0.5">{order.rpav_info?.name || order.drone_model || order.package_type || '—'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold ${badge.className}`}>
                          {badge.label}
                        </span>
                        {order.status === 'on-hold' && (
                          <div className="mt-1">
                            <span className="inline-block text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                              Reason: {order.hold_reason || 'Operational Hold'}
                            </span>
                          </div>
                        )}
                        {order.status === 'rescheduled' && <p className="mt-1 text-[10px] font-bold text-sky-700 uppercase">Rescheduled</p>}
                      </td>
                      <td className="px-4 py-3.5 max-w-60">
                        <div className="space-y-1 text-[11px]">
                          <p className="text-slate-500 truncate"><strong className="text-slate-700 font-semibold">From:</strong> {order.pickup_address || 'IndoWings Origin Facility'}</p>
                          <p className="text-slate-700 leading-snug"><strong className="text-slate-900 font-semibold">To:</strong> {order.drop_address || order.destination_address || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{formatDate(order.scheduled_time)}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{formatDate(order.dispatch_time || order.dispatched_at)}</td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {routeEstimates[order.id] ? (
                          <span className="font-semibold text-slate-800">{formatDate(routeEstimates[order.id].eta)}</span>
                        ) : order.tracking_eta ? (
                          formatDate(order.tracking_eta)
                        ) : (
                          <span className="text-slate-400">ETA unavailable</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 max-w-48">
                        {location ? (
                          <div>
                            <p className="flex items-center gap-1 text-slate-800 font-medium text-[11px]">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                              <span className="truncate">{location}</span>
                            </p>
                            <p className="text-slate-400 text-[10px] mt-0.5">
                              {order.last_location_updated_at ? `Updated: ${formatDate(order.last_location_updated_at)}` : 'Recorded location'}
                            </p>
                          </div>
                        ) : (
                          <div className="text-slate-400 text-[11px]">
                            <p>GPS unavailable</p>
                            <p className="text-[10px] text-slate-300">No update recorded</p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {order.status === 'cancelled' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setSelectedOrder(order)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                              Details
                            </button>
                            <span className="text-[11px] text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              Cancelled
                            </span>
                          </div>
                        ) : order.status === 'delivered' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => setSelectedOrder(order)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                              Details
                            </button>
                            {order.porter_tracking_id && order.porter_tracking_url && (
                              <a href={order.porter_tracking_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-sky-50 px-2.5 py-1.5 font-bold text-sky-800 hover:bg-sky-100 flex items-center gap-1 transition-colors">
                                Porter <ExternalLink className="inline h-3 w-3" />
                              </a>
                            )}
                            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              Delivered
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <button onClick={() => setSelectedOrder(order)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                              Details
                            </button>

                            {order.order_type === 'drone_purchase' && !order.dispatch_time && (
                              <button onClick={() => onNavigate?.('drone-dispatch')} className="rounded-lg bg-indigo-50 px-2.5 py-1.5 font-bold text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs">
                                Secure Dispatch
                              </button>
                            )}

                            {canManagePorterTracking && order.order_type !== 'drone_purchase' && ['pending', 'assigned'].includes(order.status) && (
                              <button onClick={() => startAction(order, 'dispatch')} className="rounded-lg bg-indigo-50 px-2.5 py-1.5 font-bold text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer">
                                Dispatch · OTP
                              </button>
                            )}

                            {order.porter_tracking_id && order.porter_tracking_url && (
                              <a href={order.porter_tracking_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-sky-50 px-2.5 py-1.5 font-bold text-sky-800 hover:bg-sky-100 flex items-center gap-1 transition-colors">
                                Porter <ExternalLink className="inline h-3 w-3" />
                              </a>
                            )}

                            {canManagePorterTracking && (
                              <button onClick={() => openPorterForm(order)} className="rounded-lg bg-sky-50 px-2.5 py-1.5 font-bold text-sky-800 hover:bg-sky-100 transition-colors cursor-pointer">
                                {order.porter_tracking_id || order.mapbox_route_url ? 'Edit Links' : 'Add Links'}
                              </button>
                            )}

                            {order.status !== 'on-hold' && !isTerminal && (
                              <button onClick={() => startAction(order, 'hold')} className="rounded-lg bg-amber-50 px-2.5 py-1.5 font-bold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer">
                                Hold
                              </button>
                            )}

                            {order.status === 'on-hold' && (
                              <button onClick={() => startAction(order, 'unhold')} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer">
                                Unhold
                              </button>
                            )}

                            {!isTerminal && (
                              <button onClick={() => startAction(order, 'reschedule')} className="rounded-lg bg-purple-50 px-2.5 py-1.5 font-bold text-purple-800 hover:bg-purple-100 transition-colors cursor-pointer">
                                Reschedule
                              </button>
                            )}

                            {order.status !== 'on-hold' && (['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(order.status) || Boolean(order.dispatch_time || order.dispatched_at)) && (
                              <button onClick={() => startAction(order, 'delivered')} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 font-bold text-white transition-colors cursor-pointer shadow-xs">
                                Mark Delivered
                              </button>
                            )}

                            {!isTerminal && (
                              <button onClick={() => startAction(order, 'cancel')} className="rounded-lg bg-rose-50 px-2.5 py-1.5 font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer">
                                Cancel
                              </button>
                            )}
                          </div>
                        )}
                      </td>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-purple-700">Delivery details</p>
                <h2 className="text-xl font-black">{selectedOrder.delivery_id || `DEL-${selectedOrder.id}`}</h2>
                <p className="mt-1 font-mono text-xs text-slate-500">Order ID: {selectedOrder.id}</p>
              </div>
              <button onClick={() => { setSelectedOrder(null); holdSiren.stop(); setSirenPlaying(false); }} aria-label="Close details"><X /></button>
            </div>

            {selectedOrder.status === 'on-hold' && (
              <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950 flex flex-wrap items-start justify-between gap-3 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-200 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Pause className="w-5 h-5 text-amber-800" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      🛑 MISSION TRANSIT FROZEN · DELIVERY ON HOLD
                    </p>
                    <p className="text-sm font-bold text-amber-950 mt-1">
                      Hold Reason: &ldquo;{selectedOrder.hold_reason || 'Safety & Operational Hold'}&rdquo;
                    </p>
                    {selectedOrder.held_by && (
                      <p className="text-xs text-amber-800 mt-1">
                        Authorized by <strong>{selectedOrder.held_by}</strong> {selectedOrder.held_at ? `on ${new Date(selectedOrder.held_at).toLocaleString('en-IN')}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSiren}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 transition ${
                    sirenPlaying
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-bounce'
                      : 'bg-amber-200 hover:bg-amber-300 text-amber-900 border border-amber-400'
                  }`}
                >
                  {sirenPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span>{sirenPlaying ? 'Silence Siren' : 'Test Siren'}</span>
                </button>
              </div>
            )}

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
                ['Airworthiness telemetry', 'Nominal corridor status'],
                ['RPAV current location', selectedOrder.rpav_info?.current_location || 'Not recorded'],
                ['Status', STATUS_LABELS[selectedOrder.status] || selectedOrder.status],
                ['Pickup', selectedOrder.pickup_address || '—'],
                ['Destination', selectedOrder.drop_address || selectedOrder.destination_address || '—'],
                ['Last known location', typeof selectedOrder.last_known_location === 'string' ? selectedOrder.last_known_location : selectedOrder.last_known_location?.address || 'No GPS update recorded'],
                ['Coordinates', typeof selectedOrder.last_known_location === 'object' && selectedOrder.last_known_location?.lat != null && selectedOrder.last_known_location?.lng != null ? `${selectedOrder.last_known_location.lat}, ${selectedOrder.last_known_location.lng}` : 'Unavailable'],
                ['Location freshness', locationFreshness(selectedOrder.last_location_updated_at)],
                ['Location last updated', formatDate(selectedOrder.last_location_updated_at)],
                ['Estimated arrival', routeEstimates[selectedOrder.id] ? `${formatDate(routeEstimates[selectedOrder.id].eta)} · Mapbox route from ${routeEstimates[selectedOrder.id].from === 'current-location' ? 'last known location' : 'pickup'}` : selectedOrder.tracking_eta ? formatDate(selectedOrder.tracking_eta) : 'ETA unavailable — Mapbox token and route coordinates required'],
                ['Scheduled delivery', formatDate(selectedOrder.scheduled_time)],
                ['Dispatch time', formatDate(selectedOrder.dispatch_time || selectedOrder.dispatched_at)],
                ['Delivered at', formatDate(selectedOrder.delivered_at)],
                ['Porter booking / tracking ID', selectedOrder.porter_tracking_id || 'Not entered'],
                ['Porter contact', selectedOrder.porter_contact || '—'],
                ['Mapbox route link', selectedOrder.mapbox_route_url ? 'Added by dispatcher/admin' : 'Not entered'],
                ['Porter details updated', formatDate(selectedOrder.porter_updated_at)]
              ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>)}
            </div>
            {selectedOrder.mapbox_route_url && (
              <a href={selectedOrder.mapbox_route_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2.5 text-xs font-bold text-purple-800 hover:bg-purple-100">
                Open Mapbox route <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {selectedOrder.porter_tracking_url && (
              <a href={selectedOrder.porter_tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-800 hover:bg-sky-100">
                Open Porter tracking page <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">Porter ID is saved against this order for the team to track in Porter. The ID alone does not provide live coordinates inside IndoFleet; that requires Porter tracking API/webhook access or manually entering location updates.</p>
            <p className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-slate-900">The Mapbox URL is assigned per delivery by an administrator or dispatcher. It opens the supplied route; ETA here is separately calculated from saved coordinates and the configured Mapbox Directions token.</p>
            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <div>
                <h3 className="font-bold text-slate-900">MapTiler delivery map</h3>
                <p className="mt-1 text-xs text-slate-500">Markers use saved coordinates only. Customer delivery addresses are not sent to MapTiler for lookup.</p>
              </div>
              <DeliveryMap order={selectedOrder} onEtaUpdate={handleRouteEta} isSirenPlaying={sirenPlaying} onToggleSiren={toggleSiren} />
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
              <div><p className="text-xs font-bold uppercase text-sky-700">Delivery tracking</p><h2 className="text-lg font-black text-slate-900">Tracking links and Porter ID</h2><p className="text-xs text-slate-500">{porterOrder.id}</p></div>
              <button type="button" onClick={() => setPorterOrder(null)} aria-label="Close delivery tracking form"><X /></button>
            </div>
            <p className="text-xs text-slate-600">Porter booking hone ke baad uska trip/booking ID yahan enter karein. Ye ID order ke saath save hogi aur details me dikhegi.</p>
            <label className="block space-y-1 text-xs font-bold text-slate-700">Porter booking / tracking ID
              <input maxLength={120} value={porterTrackingId} onChange={event => setPorterTrackingId(event.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm font-mono" placeholder="Enter the ID provided by Porter" />
            </label>
            <label className="block space-y-1 text-xs font-bold text-slate-700">Porter tracking link (optional)
              <input type="url" value={porterTrackingUrl} onChange={event => setPorterTrackingUrl(event.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="https://..." />
            </label>
            <label className="block space-y-1 text-xs font-bold text-slate-700">Mapbox route URL (optional)
              <input type="url" value={mapboxRouteUrl} onChange={event => setMapboxRouteUrl(event.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="https://www.mapbox.com/..." />
              <span className="block font-normal text-slate-500">Use a share link without an API access token. ETA uses the separately configured token.</span>
            </label>
            <label className="block space-y-1 text-xs font-bold text-slate-700">Porter driver/contact (optional)
              <input maxLength={120} value={porterContact} onChange={event => setPorterContact(event.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Name or phone" />
            </label>
            {error && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2">
              {(porterOrder.porter_tracking_id || porterOrder.porter_tracking_url || porterOrder.porter_contact || porterOrder.mapbox_route_url) && <button type="button" onClick={() => { setPorterTrackingId(''); setPorterTrackingUrl(''); setPorterContact(''); setMapboxRouteUrl(''); }} className="mr-auto rounded-xl px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">Clear details</button>}
              <button type="button" onClick={() => setPorterOrder(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button>
              <button disabled={savingPorter || (!porterTrackingId.trim() && !porterTrackingUrl.trim() && !porterContact.trim() && !mapboxRouteUrl.trim() && !porterOrder.porter_tracking_id && !porterOrder.porter_tracking_url && !porterOrder.porter_contact && !porterOrder.mapbox_route_url)} className="rounded-xl bg-sky-700 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{savingPorter ? 'Saving…' : 'Save tracking details'}</button>
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
