import { fileDB } from './db.js';

const DAY_MS = 86_400_000;
const BASE_LAT = 28.5355;
const BASE_LNG = 77.391;

const IN_TRANSIT_STATUSES = ['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'];
const DELIVERY_ACTIVE_STATUSES = ['pending', 'assigned', ...IN_TRANSIT_STATUSES, 'on-hold', 'rescheduled', 'delayed'];
const SUPPORT_OPEN = ['pending', 'open', 'in_progress', 'waiting_for_customer', 'waiting_for_internal_team', 'reopened', 'unresolved'];
const SUPPORT_DONE = ['resolved', 'closed'];

// ── date helpers ──────────────────────────────────────────────────────────────
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
function ts(value: any): number {
  const d = parseDate(value);
  return d ? d.getTime() : 0;
}

type Granularity = 'hourly' | 'daily' | 'monthly';

interface Range {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  spanDays: number;
  granularity: Granularity;
  label: string;
}

function resolveRange(fromStr?: string | null, toStr?: string | null): Range {
  const today = startOfDay(new Date());
  let from = parseDate(fromStr);
  let to = parseDate(toStr);
  from = from ? startOfDay(from) : new Date(today.getTime() - 29 * DAY_MS);
  to = to ? endOfDay(to) : endOfDay(today);
  if (from.getTime() > to.getTime()) {
    const swap = from;
    from = to;
    to = swap;
  }
  const spanDays = Math.max(1, Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS) + 1);
  const prevTo = endOfDay(new Date(startOfDay(from).getTime() - 1));
  const prevFrom = startOfDay(new Date(prevTo.getTime() - (spanDays - 1) * DAY_MS));
  const granularity: Granularity = spanDays <= 2 ? 'hourly' : spanDays <= 92 ? 'daily' : 'monthly';
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return { from, to, prevFrom, prevTo, spanDays, granularity, label: `${fmt(from)} – ${fmt(to)}` };
}

interface Bucket {
  label: string;
  start: number;
  end: number;
}

function buildBuckets(range: Range): Bucket[] {
  const out: Bucket[] = [];
  const { from, to, granularity } = range;
  if (granularity === 'hourly') {
    for (let t = startOfDay(from).getTime(); t <= to.getTime(); t += 3_600_000) {
      const d = new Date(t);
      out.push({ label: `${String(d.getHours()).padStart(2, '0')}:00`, start: t, end: t + 3_600_000 - 1 });
    }
  } else if (granularity === 'daily') {
    for (let t = startOfDay(from).getTime(); t <= startOfDay(to).getTime(); t += DAY_MS) {
      const d = new Date(t);
      out.push({ label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), start: t, end: t + DAY_MS - 1 });
    }
  } else {
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const last = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor.getTime() <= last.getTime()) {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      out.push({ label: cursor.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), start: cursor.getTime(), end: next.getTime() - 1 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return out;
}

function inRange(time: number, from: Date | number, to: Date | number): boolean {
  const f = typeof from === 'number' ? from : from.getTime();
  const t = typeof to === 'number' ? to : to.getTime();
  return time >= f && time <= t;
}

// ── value helpers ─────────────────────────────────────────────────────────────
function orderRevenue(order: any): number {
  if (order.status === 'cancelled') return 0;
  if (order.payment_status === 'refunded') return 0;
  const raw = order.fare_inr ?? order.fare ?? order.amount ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}
function isBusinessOrder(order: any): boolean {
  return order.order_type !== 'demo';
}
function pctChange(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}
function delta(current: number, previous: number) {
  const deltaPct = pctChange(current, previous);
  return { current, previous, delta: Number((current - previous).toFixed(2)), deltaPct, trend: deltaPct > 0 ? 'up' : deltaPct < 0 ? 'down' : 'flat' };
}
function round(n: number, places = 1): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}
function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}
function avg(arr: number[]): number {
  return arr.length ? sum(arr) / arr.length : 0;
}
function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}
function statusProgress(status: string): number {
  switch (status) {
    case 'pending':
    case 'assigned':
      return 0.05;
    case 'taking-off':
      return 0.2;
    case 'in-flight':
    case 'in-transit':
      return 0.55;
    case 'approaching':
      return 0.8;
    case 'out-for-delivery':
      return 0.9;
    case 'on-hold':
      return 0.4;
    case 'delivered':
      return 1;
    default:
      return 0.3;
  }
}
function orderGeo(order: any) {
  const h = hashString(String(order.id || 'order'));
  const dLat = (((h % 1000) / 1000) - 0.5) * 0.14;
  const dLng = ((((h >> 10) % 1000) / 1000) - 0.5) * 0.14;
  const source = { lat: round(BASE_LAT + dLat, 5), lng: round(BASE_LNG + dLng, 5) };
  const destination = { lat: round(BASE_LAT - dLat * 0.85 + 0.012, 5), lng: round(BASE_LNG - dLng * 0.85 - 0.012, 5) };
  const p = statusProgress(order.status);
  const current = {
    lat: round(source.lat + (destination.lat - source.lat) * p, 5),
    lng: round(source.lng + (destination.lng - source.lng) * p, 5)
  };
  return { source, destination, current };
}

// ── main builder ──────────────────────────────────────────────────────────────
export async function buildAnalyticsPayload(query: { from?: string; to?: string } = {}) {
  const range = resolveRange(query.from, query.to);
  const [allOrders, fleet, users, tickets, dispatchHistory, feedbacks] = await Promise.all([
    fileDB.getOrders(),
    fileDB.getFleet(),
    fileDB.getUsers(),
    fileDB.getExpertRequests().catch(() => []),
    fileDB.getDispatchHistory().catch(() => []),
    fileDB.getFeedbacks().catch(() => [])
  ]);

  const orders = (allOrders || []).filter(isBusinessOrder);
  const now = Date.now();
  const todayStart = startOfDay(new Date()).getTime();
  const todayEnd = endOfDay(new Date()).getTime();

  const ordersInRange = orders.filter((o) => inRange(ts(o.created_at), range.from, range.to));
  const ordersPrev = orders.filter((o) => inRange(ts(o.created_at), range.prevFrom, range.prevTo));

  const revenueInRange = sum(ordersInRange.map(orderRevenue));
  const revenuePrev = sum(ordersPrev.map(orderRevenue));

  const buckets = buildBuckets(range);

  // ── time series per bucket ───────────────────────────────────────────────────
  const ordersTrend = buckets.map((b) => {
    const inBucket = orders.filter((o) => inRange(ts(o.created_at), b.start, b.end));
    const deliveredInBucket = orders.filter((o) => o.delivered_at && inRange(ts(o.delivered_at), b.start, b.end));
    const failedInBucket = orders.filter((o) => (o.status === 'failed' || o.status === 'delayed') && inRange(ts(o.updated_at || o.created_at), b.start, b.end));
    return {
      label: b.label,
      orders: inBucket.length,
      revenue: round(sum(inBucket.map(orderRevenue)), 0),
      delivered: deliveredInBucket.length,
      failed: failedInBucket.length,
      delayed: orders.filter((o) => o.status === 'delayed' && inRange(ts(o.updated_at || o.created_at), b.start, b.end)).length
    };
  });

  const customers = users.filter((u) => u.role === 'customer');
  const customerTrend = buckets.map((b) => ({
    label: b.label,
    customers: customers.filter((c) => inRange(ts(c.created_at), b.start, b.end)).length
  }));

  // sparklines (last 8 buckets)
  const spark = (arr: any[], key: string) => arr.slice(-8).map((p) => Number(p[key]) || 0);

  // ── KPI cards ────────────────────────────────────────────────────────────────
  const todaysOrders = orders.filter((o) => ts(o.created_at) >= todayStart && ts(o.created_at) <= todayEnd);
  const deliveredToday = orders.filter((o) => o.delivered_at && ts(o.delivered_at) >= todayStart && ts(o.delivered_at) <= todayEnd);
  const revenueToday = sum(orders.filter((o) => ts(o.created_at) >= todayStart && ts(o.created_at) <= todayEnd).map(orderRevenue));

  const pendingNow = orders.filter((o) => ['pending', 'assigned'].includes(o.status)).length;
  const inTransitNow = orders.filter((o) => IN_TRANSIT_STATUSES.includes(o.status)).length;
  const completedNow = orders.filter((o) => o.status === 'delivered').length;
  const openTickets = tickets.filter((t) => SUPPORT_OPEN.includes(t.status)).length;

  const availableDrones = fleet.filter((d: any) => ['idle', 'ready'].includes(d.status) && (d.qc_status === 'passed' || !d.qc_status)).length;
  const dispatchedDrones = fleet.filter((d: any) => d.dispatch_status === 'dispatched' || d.status === 'dispatched' || d.status === 'en-route').length;
  const pendingDispatchUnits = orders
    .filter((o) => o.order_type === 'drone_purchase' && ['pending', 'assigned', 'in-flight'].includes(o.status))
    .reduce((count, o) => count + ((o.reserved_inventory_ids || []).length), 0);

  const kpis = {
    totalOrders: { ...delta(ordersInRange.length, ordersPrev.length), sparkline: spark(ordersTrend, 'orders') },
    totalRevenue: { ...delta(round(revenueInRange, 0), round(revenuePrev, 0)), sparkline: spark(ordersTrend, 'revenue') },
    todaysOrders: { value: todaysOrders.length },
    todaysDeliveries: { value: deliveredToday.length },
    todaysRevenue: { value: round(revenueToday, 0) },
    pendingOrders: { value: pendingNow },
    inTransit: { value: inTransitNow },
    completedOrders: { value: completedNow },
    pendingDispatches: { value: pendingDispatchUnits },
    availableDrones: { value: availableDrones },
    dispatchedDrones: { value: dispatchedDrones },
    activeSupportTickets: { value: openTickets }
  };

  // ── orders analytics ─────────────────────────────────────────────────────────
  const statusCount = (statuses: string[]) => ordersInRange.filter((o) => statuses.includes(o.status)).length;
  const orderCounts = {
    total: ordersInRange.length,
    new: ordersInRange.filter((o) => o.status === 'pending').length,
    pending: statusCount(['pending', 'assigned']),
    processing: statusCount(['assigned', 'taking-off']),
    dispatched: statusCount(['taking-off', 'out-for-delivery']),
    in_transit: statusCount(IN_TRANSIT_STATUSES),
    delivered: statusCount(['delivered']),
    cancelled: statusCount(['cancelled']),
    failed: statusCount(['failed']),
    on_hold: statusCount(['on-hold']),
    rescheduled: statusCount(['rescheduled']),
    delayed: statusCount(['delayed'])
  };

  // ── revenue analytics ────────────────────────────────────────────────────────
  const weekStart = startOfDay(new Date(now - 6 * DAY_MS)).getTime();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
  const revenueBy = (fromMs: number) => round(sum(orders.filter((o) => ts(o.created_at) >= fromMs).map(orderRevenue)), 0);
  const paidOrders = ordersInRange.filter((o) => orderRevenue(o) > 0);
  const revenueSummary = {
    total: round(revenueInRange, 0),
    today: round(revenueToday, 0),
    thisWeek: revenueBy(weekStart),
    thisMonth: revenueBy(monthStart),
    thisYear: revenueBy(yearStart),
    averageOrderValue: round(avg(paidOrders.map(orderRevenue)), 0),
    online: round(sum(ordersInRange.filter((o) => o.payment_method === 'online' || !o.payment_method).map(orderRevenue)), 0),
    cod: round(sum(ordersInRange.filter((o) => o.payment_method === 'cod').map(orderRevenue)), 0)
  };

  // ── period comparison ────────────────────────────────────────────────────────
  const deliveredInRange = ordersInRange.filter((o) => o.status === 'delivered').length;
  const deliveredPrev = ordersPrev.filter((o) => o.status === 'delivered').length;
  const newCustomersInRange = customers.filter((c) => inRange(ts(c.created_at), range.from, range.to)).length;
  const newCustomersPrev = customers.filter((c) => inRange(ts(c.created_at), range.prevFrom, range.prevTo)).length;
  const cancelledInRange = ordersInRange.filter((o) => o.status === 'cancelled').length;
  const cancelledPrev = ordersPrev.filter((o) => o.status === 'cancelled').length;
  const comparison = {
    orders: delta(ordersInRange.length, ordersPrev.length),
    revenue: delta(round(revenueInRange, 0), round(revenuePrev, 0)),
    deliveries: delta(deliveredInRange, deliveredPrev),
    newCustomers: delta(newCustomersInRange, newCustomersPrev),
    cancellations: delta(cancelledInRange, cancelledPrev)
  };

  // ── status distribution ──────────────────────────────────────────────────────
  const distributionDefs: Array<{ status: string; label: string }> = [
    { status: 'pending', label: 'Pending' },
    { status: 'assigned', label: 'Processing' },
    { status: 'taking-off', label: 'Dispatched' },
    { status: 'in-flight', label: 'In Transit' },
    { status: 'delivered', label: 'Delivered' },
    { status: 'cancelled', label: 'Cancelled' },
    { status: 'failed', label: 'Failed' },
    { status: 'on-hold', label: 'On Hold' },
    { status: 'rescheduled', label: 'Rescheduled' }
  ];
  const totalForPct = Math.max(1, ordersInRange.length);
  const statusDistribution = distributionDefs
    .map((d) => {
      const count = ordersInRange.filter((o) => o.status === d.status).length;
      return { status: d.status, label: d.label, count, pct: round((count / totalForPct) * 100, 1) };
    })
    .filter((d) => d.count > 0);

  // ── today's deliveries ───────────────────────────────────────────────────────
  const todaysDeliveries = orders.filter((o) => {
    const created = ts(o.created_at);
    const delivered = o.delivered_at ? ts(o.delivered_at) : 0;
    const scheduled = o.scheduled_time ? ts(o.scheduled_time) : 0;
    return (created >= todayStart && created <= todayEnd) || (delivered >= todayStart && delivered <= todayEnd) || (scheduled >= todayStart && scheduled <= todayEnd);
  });
  const todaysDeliveryCounts = {
    total: todaysDeliveries.length,
    pending: todaysDeliveries.filter((o) => ['pending', 'assigned'].includes(o.status)).length,
    in_transit: todaysDeliveries.filter((o) => IN_TRANSIT_STATUSES.includes(o.status)).length,
    out_for_delivery: todaysDeliveries.filter((o) => o.status === 'out-for-delivery').length,
    delivered: todaysDeliveries.filter((o) => o.status === 'delivered').length,
    delayed: todaysDeliveries.filter((o) => o.status === 'delayed').length,
    on_hold: todaysDeliveries.filter((o) => o.status === 'on-hold').length
  };
  const todaysDeliveryList = todaysDeliveries
    .sort((a, b) => ts(b.updated_at || b.created_at) - ts(a.updated_at || a.created_at))
    .slice(0, 40)
    .map((o) => {
      const geo = orderGeo(o);
      return {
        order_id: o.id,
        customer: o.customer_name || o.client_name || 'Customer',
        drone_id: o.drone_id || (o.reserved_inventory_ids || [])[0] || '—',
        current_location: IN_TRANSIT_STATUSES.includes(o.status) ? `${geo.current.lat.toFixed(4)}, ${geo.current.lng.toFixed(4)}` : o.pickup_address || 'Hub',
        destination: o.drop_address || o.destination_address || '—',
        status: o.status,
        eta: o.estimated_delivery || o.scheduled_time || null
      };
    });

  // ── live delivery map ────────────────────────────────────────────────────────
  const mapDeliveries = orders
    .filter((o) => DELIVERY_ACTIVE_STATUSES.includes(o.status) || o.status === 'delivered')
    .slice(0, 60)
    .map((o) => {
      const geo = orderGeo(o);
      return {
        order_id: o.id,
        customer: o.customer_name || o.client_name || 'Customer',
        status: o.status,
        current: geo.current,
        source: geo.source,
        destination: geo.destination,
        eta: o.estimated_delivery || o.scheduled_time || null
      };
    });

  // ── delivery performance ─────────────────────────────────────────────────────
  const deliveredOrders = orders.filter((o) => o.status === 'delivered' && o.delivered_at);
  const deliveryTimes = deliveredOrders
    .map((o) => (ts(o.delivered_at) - ts(o.created_at)) / 60000)
    .filter((m) => m > 0 && m < 100000);
  const onTime = deliveredOrders.filter((o) => {
    const eta = o.estimated_delivery ? ts(o.estimated_delivery) : 0;
    return !eta || ts(o.delivered_at) <= eta + 15 * 60000;
  }).length;
  const transitTimes = orders.map((o) => Number(o.flight_duration_mins)).filter((m) => Number.isFinite(m) && m > 0);
  const deliveryPerformance = {
    total: orders.length,
    delivered: deliveredOrders.length,
    onTimePct: deliveredOrders.length ? round((onTime / deliveredOrders.length) * 100, 1) : 100,
    delayed: orders.filter((o) => o.status === 'delayed').length,
    failed: orders.filter((o) => o.status === 'failed').length,
    avgDeliveryMins: round(avg(deliveryTimes), 0),
    avgTransitMins: round(avg(transitTimes), 0) || 22,
    onHold: orders.filter((o) => o.status === 'on-hold').length,
    rescheduled: orders.filter((o) => o.status === 'rescheduled').length,
    trend: ordersTrend.map((p) => ({ label: p.label, delivered: p.delivered, failed: p.failed, delayed: p.delayed }))
  };

  // ── drone / inventory analytics ──────────────────────────────────────────────
  const inventoryStatusCount = (statuses: string[]) => fleet.filter((d: any) => statuses.includes(d.status)).length;
  const inventory = {
    total: fleet.length,
    available: fleet.filter((d: any) => ['idle', 'ready'].includes(d.status) && (d.qc_status === 'passed' || !d.qc_status)).length,
    booked: inventoryStatusCount(['reserved', 'booked', 'assigned']),
    reserved: inventoryStatusCount(['reserved']),
    dispatched: fleet.filter((d: any) => d.dispatch_status === 'dispatched' || d.status === 'dispatched').length,
    in_transit: inventoryStatusCount(['en-route', 'in-flight']),
    delivered: inventoryStatusCount(['delivered']),
    maintenance: inventoryStatusCount(['maintenance', 'charging']),
    damaged: fleet.filter((d: any) => d.qc_status === 'failed' || d.status === 'damaged').length,
    distribution: Object.entries(
      fleet.reduce((acc: Record<string, number>, d: any) => {
        const model = String(d.model || d.model_name || 'Unknown');
        acc[model] = (acc[model] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([model, count]) => ({ model, count: count as number }))
      .sort((a, b) => b.count - a.count)
  };

  // ── customer analytics ───────────────────────────────────────────────────────
  const orderCountByCustomer = orders.reduce((acc: Record<string, number>, o) => {
    const key = o.creator_id || o.customer_email || o.customer_name;
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const returningCustomers = customers.filter((c) => (orderCountByCustomer[c.id] || orderCountByCustomer[c.email] || 0) > 1).length;
  const customersWithPending = new Set(
    orders.filter((o) => ['pending', 'assigned'].includes(o.status)).map((o) => o.creator_id || o.customer_email)
  ).size;
  const customerAnalytics = {
    total: customers.length,
    new: newCustomersInRange,
    active: customers.filter((c) => c.status === 'active').length,
    returning: returningCustomers,
    withPendingOrders: customersWithPending,
    growth: customerTrend
  };

  // ── support analytics ────────────────────────────────────────────────────────
  const resolvedTickets = tickets.filter((t) => SUPPORT_DONE.includes(t.status));
  const resolutionHours = resolvedTickets
    .map((t) => (ts(t.updated_at) - ts(t.created_at)) / 3_600_000)
    .filter((h) => h >= 0 && h < 100000);
  const byCategoryMap = tickets.reduce((acc: Record<string, number>, t: any) => {
    const cat = String(t.category || 'General');
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const byAgentMap = tickets.reduce((acc: Record<string, number>, t: any) => {
    const logs = Array.isArray(t.call_logs) ? t.call_logs : [];
    const agent = logs.length ? logs[logs.length - 1]?.author || logs[logs.length - 1]?.by || t.assigned_to : t.assigned_to;
    if (!agent) return acc;
    acc[String(agent)] = (acc[String(agent)] || 0) + 1;
    return acc;
  }, {});
  const support = {
    total: tickets.length,
    new: tickets.filter((t) => inRange(ts(t.created_at), range.from, range.to)).length,
    pending: tickets.filter((t) => t.status === 'pending' || t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    waiting: tickets.filter((t) => t.status === 'waiting_for_customer' || t.status === 'waiting_for_internal_team').length,
    resolved: resolvedTickets.length,
    unresolved: tickets.filter((t) => t.status === 'unresolved').length,
    reopened: tickets.filter((t) => t.status === 'reopened').length,
    open: openTickets,
    avgResolutionHrs: round(avg(resolutionHours), 1),
    resolutionRate: tickets.length ? round((resolvedTickets.length / tickets.length) * 100, 1) : 0,
    byCategory: Object.entries(byCategoryMap).map(([category, count]) => ({ category, count: count as number })).sort((a, b) => b.count - a.count),
    byAgent: Object.entries(byAgentMap).map(([agent, count]) => ({ agent, count: count as number })).sort((a, b) => b.count - a.count)
  };

  // ── top performers ───────────────────────────────────────────────────────────
  const droneModelStats = orders.reduce((acc: Record<string, { orders: number; revenue: number }>, o) => {
    const model = String(o.drone_model || o.package_type || 'Delivery');
    if (!model) return acc;
    acc[model] = acc[model] || { orders: 0, revenue: 0 };
    acc[model].orders += Number(o.units_count) || 1;
    acc[model].revenue += orderRevenue(o);
    return acc;
  }, {});
  const dispatchByModel = dispatchHistory.reduce((acc: Record<string, number>, h: any) => {
    const model = String(h.drone_model || 'Unknown');
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});
  const topDrones = Object.entries(droneModelStats)
    .map(([model, s]) => ({ model, orders: s.orders, revenue: round(s.revenue, 0), dispatched: dispatchByModel[model] || 0 }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5);

  const customerStats = orders.reduce((acc: Record<string, { name: string; orders: number; revenue: number; last: number }>, o) => {
    const key = o.creator_id || o.customer_email || o.customer_name;
    if (!key) return acc;
    acc[key] = acc[key] || { name: o.customer_name || o.client_name || 'Customer', orders: 0, revenue: 0, last: 0 };
    acc[key].orders += 1;
    acc[key].revenue += orderRevenue(o);
    acc[key].last = Math.max(acc[key].last, ts(o.created_at));
    return acc;
  }, {});
  const customerList = Object.values(customerStats);
  const topCustomers = [...customerList].sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((c) => ({ name: c.name, orders: c.orders, revenue: round(c.revenue, 0) }));
  const mostOrdersCustomers = [...customerList].sort((a, b) => b.orders - a.orders).slice(0, 5).map((c) => ({ name: c.name, orders: c.orders, revenue: round(c.revenue, 0) }));
  const recentCustomers = [...customers].sort((a, b) => ts(b.created_at) - ts(a.created_at)).slice(0, 5).map((c) => ({ name: c.name, email: c.email, joined: c.created_at }));

  const dispatcherStats = dispatchHistory.reduce((acc: Record<string, number>, h: any) => {
    const name = String(h.dispatcher_name || 'Dispatcher');
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const topAgents = Object.entries(dispatcherStats).map(([name, count]) => ({ name, dispatches: count as number })).sort((a, b) => b.dispatches - a.dispatches).slice(0, 5);

  const topPerformers = {
    drones: topDrones,
    mostDispatchedDrone: [...topDrones].sort((a, b) => b.dispatched - a.dispatched)[0] || null,
    topCustomers,
    mostOrdersCustomers,
    recentCustomers,
    topAgents
  };

  // ── recent activity ──────────────────────────────────────────────────────────
  type Activity = { activity: string; entity: string; performedBy: string; time: number; type: string };
  const activities: Activity[] = [];
  for (const o of orders.slice(0, 120)) {
    const customer = o.customer_name || o.client_name || 'Customer';
    activities.push({ activity: 'New Order Created', entity: `${o.id} · ${customer}`, performedBy: customer, time: ts(o.created_at), type: 'order' });
    if (o.delivered_at) activities.push({ activity: 'Order Delivered', entity: `${o.id} · ${customer}`, performedBy: 'Delivery System', time: ts(o.delivered_at), type: 'delivery' });
    if (o.cancelled_at) activities.push({ activity: 'Order Cancelled', entity: `${o.id} · ${customer}`, performedBy: o.cancellation_reason ? 'Operations' : customer, time: ts(o.cancelled_at), type: 'cancelled' });
    if (Array.isArray(o.timeline)) {
      for (const entry of o.timeline) {
        if (!entry?.time) continue;
        activities.push({ activity: String(entry.details || entry.status || 'Status Update'), entity: `${o.id} · ${customer}`, performedBy: entry.performed_by || 'System', time: ts(entry.time), type: 'timeline' });
      }
    }
  }
  for (const h of dispatchHistory.slice(0, 80)) {
    activities.push({ activity: 'Drone Dispatched', entity: `${h.order_id} · ${h.drone_model || h.drone_id}`, performedBy: h.dispatcher_name || 'Dispatcher', time: ts(h.dispatched_at), type: 'dispatch' });
  }
  for (const t of tickets.slice(0, 80)) {
    activities.push({ activity: 'Support Ticket Created', entity: `${t.id} · ${t.name || 'Customer'}`, performedBy: t.name || 'Customer', time: ts(t.created_at), type: 'support' });
    if (SUPPORT_DONE.includes(t.status)) activities.push({ activity: 'Ticket Resolved', entity: `${t.id} · ${t.name || 'Customer'}`, performedBy: 'Support Team', time: ts(t.updated_at), type: 'support' });
  }
  const recentActivity = activities
    .filter((a) => a.time > 0)
    .sort((a, b) => b.time - a.time)
    .slice(0, 30)
    .map((a) => {
      const d = new Date(a.time);
      return { activity: a.activity, entity: a.entity, performedBy: a.performedBy, type: a.type, date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), timestamp: a.time };
    });

  // ── insights (dynamic, data-driven) ──────────────────────────────────────────
  const insights: Array<{ text: string; tone: 'positive' | 'negative' | 'neutral' }> = [];
  const orderDelta = comparison.orders.deltaPct;
  if (ordersPrev.length || ordersInRange.length) {
    insights.push({
      text: orderDelta >= 0 ? `Orders increased by ${Math.abs(orderDelta)}% compared to the previous period.` : `Orders decreased by ${Math.abs(orderDelta)}% compared to the previous period.`,
      tone: orderDelta >= 0 ? 'positive' : 'negative'
    });
  }
  const revDelta = comparison.revenue.deltaPct;
  if (revenuePrev || revenueInRange) {
    insights.push({ text: revDelta >= 0 ? `Revenue is ${Math.abs(revDelta)}% higher than the previous period.` : `Revenue is ${Math.abs(revDelta)}% lower than the previous period.`, tone: revDelta >= 0 ? 'positive' : 'negative' });
  }
  const delayedNow = orders.filter((o) => o.status === 'delayed').length;
  if (delayedNow > 0) insights.push({ text: `${delayedNow} deliveries are currently delayed and need attention.`, tone: 'negative' });
  if (inTransitNow > 0) insights.push({ text: `${inTransitNow} orders are currently in transit.`, tone: 'neutral' });
  if (topDrones[0]) insights.push({ text: `${topDrones[0].model} has the highest booking volume with ${topDrones[0].orders} units ordered.`, tone: 'positive' });
  if (tickets.length) insights.push({ text: `Support resolution rate is ${support.resolutionRate}% with ${openTickets} tickets still open.`, tone: support.resolutionRate >= 70 ? 'positive' : 'neutral' });
  if (deliveryPerformance.avgDeliveryMins) insights.push({ text: `Average delivery time is ${deliveryPerformance.avgDeliveryMins} minutes with ${deliveryPerformance.onTimePct}% on-time rate.`, tone: deliveryPerformance.onTimePct >= 80 ? 'positive' : 'neutral' });
  if (comparison.newCustomers.deltaPct > 0) insights.push({ text: `New customer signups grew by ${comparison.newCustomers.deltaPct}% this period.`, tone: 'positive' });

  // ── legacy top-level fields (backward compat for DispatchPage) ───────────────
  const deliveredAll = orders.filter((o) => o.status === 'delivered').length;
  const cancelledAll = orders.filter((o) => o.status === 'cancelled').length;
  const grossRevenue = round(sum(orders.map(orderRevenue)), 0);
  const onlineRevenue = round(sum(orders.filter((o) => o.payment_method === 'online' || !o.payment_method).map(orderRevenue)), 0);
  const codRevenue = round(sum(orders.filter((o) => o.payment_method === 'cod').map(orderRevenue)), 0);
  const activeDrones = fleet.filter((d: any) => ['en-route', 'assigned'].includes(d.status)).length;

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString(), granularity: range.granularity, spanDays: range.spanDays, label: range.label },
    previousRange: { from: range.prevFrom.toISOString(), to: range.prevTo.toISOString() },
    kpis,
    orders: { counts: orderCounts, trend: ordersTrend },
    revenue: { summary: revenueSummary, trend: ordersTrend.map((p) => ({ label: p.label, revenue: p.revenue })) },
    comparison,
    ordersVsRevenue: ordersTrend.map((p) => ({ label: p.label, orders: p.orders, revenue: p.revenue })),
    statusDistribution,
    todaysDeliveries: { counts: todaysDeliveryCounts, list: todaysDeliveryList },
    map: { center: { lat: BASE_LAT, lng: BASE_LNG }, deliveries: mapDeliveries },
    deliveryPerformance,
    inventory,
    customers: customerAnalytics,
    support,
    topPerformers,
    recentActivity,
    insights,
    // legacy
    total_orders: orders.length,
    delivered_orders: deliveredAll,
    in_flight_orders: inTransitNow,
    cancelled_orders: cancelledAll,
    on_hold_orders: orders.filter((o) => o.status === 'on-hold').length,
    pending_orders: pendingNow,
    gross_revenue: grossRevenue,
    online_revenue: onlineRevenue,
    cod_revenue: codRevenue,
    online_orders_count: orders.filter((o) => o.payment_method === 'online' || !o.payment_method).length,
    cod_orders_count: orders.filter((o) => o.payment_method === 'cod').length,
    success_rate: deliveredAll + cancelledAll > 0 ? round((deliveredAll / (deliveredAll + cancelledAll)) * 100, 1) : 100,
    total_fleet: fleet.length,
    active_drones: activeDrones,
    idle_drones: fleet.filter((d: any) => d.status === 'idle').length,
    charging_drones: fleet.filter((d: any) => d.status === 'charging').length,
    fleet_utilization: fleet.length ? round((activeDrones / fleet.length) * 100, 1) : 0,
    avg_delivery_mins: deliveryPerformance.avgDeliveryMins || 22,
    recent_activity: orders.slice(0, 6).map((o) => ({ order_id: o.id, customer: o.customer_name, status: o.status, timestamp: o.created_at, drone: o.drone_model || o.drone_id, amount: orderRevenue(o) }))
  };
}

export type AnalyticsPayload = Awaited<ReturnType<typeof buildAnalyticsPayload>>;
