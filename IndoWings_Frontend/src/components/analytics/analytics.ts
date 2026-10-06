export interface Delta {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number;
  trend: 'up' | 'down' | 'flat';
}

export interface KpiWithDelta {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number;
  trend: 'up' | 'down' | 'flat';
  sparkline: number[];
}

export interface TrendPoint {
  label: string;
  orders: number;
  revenue: number;
  delivered: number;
  failed: number;
  delayed: number;
}

export interface DeliveryRow {
  order_id: string;
  customer: string;
  drone_id: string;
  current_location: string;
  destination: string;
  status: string;
  eta: string | null;
}

export interface MapDelivery {
  order_id: string;
  customer: string;
  status: string;
  current: { lat: number; lng: number };
  source: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  eta: string | null;
}

export interface AnalyticsPayload {
  range: { from: string; to: string; granularity: string; spanDays: number; label: string };
  previousRange: { from: string; to: string };
  kpis: {
    totalOrders: KpiWithDelta;
    totalRevenue: KpiWithDelta;
    todaysOrders: { value: number };
    todaysDeliveries: { value: number };
    todaysRevenue: { value: number };
    pendingOrders: { value: number };
    inTransit: { value: number };
    completedOrders: { value: number };
    pendingDispatches: { value: number };
    availableDrones: { value: number };
    dispatchedDrones: { value: number };
    activeSupportTickets: { value: number };
  };
  orders: { counts: Record<string, number>; trend: TrendPoint[] };
  revenue: { summary: Record<string, number>; trend: { label: string; revenue: number }[] };
  comparison: { orders: Delta; revenue: Delta; deliveries: Delta; newCustomers: Delta; cancellations: Delta };
  ordersVsRevenue: { label: string; orders: number; revenue: number }[];
  statusDistribution: { status: string; label: string; count: number; pct: number }[];
  todaysDeliveries: { counts: Record<string, number>; list: DeliveryRow[] };
  map: { center: { lat: number; lng: number }; deliveries: MapDelivery[] };
  deliveryPerformance: {
    total: number;
    delivered: number;
    onTimePct: number;
    delayed: number;
    failed: number;
    avgDeliveryMins: number;
    avgTransitMins: number;
    onHold: number;
    rescheduled: number;
    trend: { label: string; delivered: number; failed: number; delayed: number }[];
  };
  inventory: {
    total: number;
    available: number;
    booked: number;
    reserved: number;
    dispatched: number;
    in_transit: number;
    delivered: number;
    maintenance: number;
    damaged: number;
    distribution: { model: string; count: number }[];
  };
  customers: { total: number; new: number; active: number; returning: number; withPendingOrders: number; growth: { label: string; customers: number }[] };
  support: {
    total: number;
    new: number;
    pending: number;
    inProgress: number;
    waiting: number;
    resolved: number;
    unresolved: number;
    reopened: number;
    open: number;
    avgResolutionHrs: number;
    resolutionRate: number;
    byCategory: { category: string; count: number }[];
    byAgent: { agent: string; count: number }[];
  };
  topPerformers: {
    drones: { model: string; orders: number; revenue: number; dispatched: number }[];
    mostDispatchedDrone: { model: string; orders: number; revenue: number; dispatched: number } | null;
    topCustomers: { name: string; orders: number; revenue: number }[];
    mostOrdersCustomers: { name: string; orders: number; revenue: number }[];
    recentCustomers: { name: string; email: string; joined: string }[];
    topAgents: { name: string; dispatches: number }[];
  };
  recentActivity: { activity: string; entity: string; performedBy: string; type: string; date: string; time: string; timestamp: number }[];
  insights: { text: string; tone: 'positive' | 'negative' | 'neutral' }[];
  gross_revenue: number;
  online_revenue: number;
  cod_revenue: number;
  success_rate: number;
}

export const STATUS_COLOR: Record<string, string> = {
  delivered: '#15803d',
  'in-flight': '#2563eb',
  'in-transit': '#2563eb',
  'taking-off': '#7c3aed',
  approaching: '#0891b2',
  'out-for-delivery': '#ea580c',
  delayed: '#dc2626',
  failed: '#b91c1c',
  'on-hold': '#ca8a04',
  rescheduled: '#9333ea',
  pending: '#64748b',
  assigned: '#0d9488',
  cancelled: '#94a3b8'
};

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  assigned: 'Processing',
  'taking-off': 'Dispatched',
  'in-flight': 'In Transit',
  'in-transit': 'In Transit',
  approaching: 'Approaching',
  'out-for-delivery': 'Out for Delivery',
  delivered: 'Delivered',
  'on-hold': 'On Hold',
  rescheduled: 'Rescheduled',
  delayed: 'Delayed',
  failed: 'Failed',
  cancelled: 'Cancelled'
};

export function statusColor(status: string): string {
  return STATUS_COLOR[status] || '#64748b';
}
export function statusLabel(status: string): string {
  return STATUS_LABEL[status] || status.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCurrency(value: number): string {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function formatCompactCurrency(value: number): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function formatNumber(value: number): string {
  return (Number(value) || 0).toLocaleString('en-IN');
}
