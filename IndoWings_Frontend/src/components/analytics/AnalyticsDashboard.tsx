import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import {
  Package, IndianRupee, Truck, CheckCircle2, Clock3, Plane, Boxes, Headphones, Users,
  RefreshCw, Search, ArrowUpRight, ArrowDownRight, Zap, Activity, Lightbulb, Trophy,
  MapPin, AlertTriangle, Plus, UserPlus, ListChecks, PhoneCall, BarChart3, TrendingUp, Timer, XCircle
} from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import { DeliveryUser } from '../../types';
import { AnalyticsPayload, formatCompactCurrency, formatCurrency, formatNumber, statusColor, statusLabel } from './analytics';
import { KpiCard } from './KpiCard';
import { TimeRangeSelector, DateRange, presetRange } from './TimeRangeSelector';
import { LiveDeliveryMap } from './LiveDeliveryMap';

interface Props {
  currentUser: DeliveryUser | null;
  onQuickAction?: (tab: string) => void;
}

const SectionCard: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, subtitle, right, children, className = '' }) => (
  <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-xs ${className}`}>
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h3 className="text-sm font-black text-slate-900 tracking-tight">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const ChartTooltipStyle = {
  contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' },
  labelStyle: { fontWeight: 800, color: '#0f172a' }
};

const DEFAULT_RANGE: DateRange = { key: 'today', label: 'Today', ...presetRange('today') };

export const AnalyticsDashboard: React.FC<Props> = ({ currentUser, onQuickAction }) => {
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // client-side filters (section 19) applied to detail lists
  const [statusFilter, setStatusFilter] = useState('all');
  const [droneFilter, setDroneFilter] = useState('all');
  const [query, setQuery] = useState('');

  const role = currentUser?.role || 'admin';
  const isAdmin = role === 'admin';
  const canDispatch = isAdmin || role === 'dispatcher' || role === 'fleet_manager';
  const canSupport = isAdmin || role === 'support';
  const canSeeRevenue = isAdmin;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/analytics?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`);
      if (!res.ok) throw new Error(`Analytics request failed (${res.status})`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const droneModels = useMemo(() => {
    const set = new Set<string>();
    (data?.inventory?.distribution || []).forEach((d) => set.add(d.model));
    (data?.todaysDeliveries?.list || []).forEach((r) => r.drone_id && r.drone_id !== '—' && set.add(r.drone_id));
    return Array.from(set);
  }, [data]);

  const filteredDeliveryRows = useMemo(() => {
    let rows = data?.todaysDeliveries?.list || [];
    if (statusFilter !== 'all') rows = rows.filter((r) => r.status === statusFilter);
    if (droneFilter !== 'all') rows = rows.filter((r) => r.drone_id === droneFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((r) => r.order_id.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q) || (r.destination || '').toLowerCase().includes(q));
    }
    return rows;
  }, [data, statusFilter, droneFilter, query]);

  const filteredMapDeliveries = useMemo(() => {
    let rows = data?.map?.deliveries || [];
    if (statusFilter !== 'all') rows = rows.filter((r) => r.status === statusFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((r) => r.order_id.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q));
    }
    return rows;
  }, [data, statusFilter, query]);

  const filteredActivity = useMemo(() => {
    let rows = data?.recentActivity || [];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((r) => r.activity.toLowerCase().includes(q) || r.entity.toLowerCase().includes(q) || r.performedBy.toLowerCase().includes(q));
    }
    return rows;
  }, [data, query]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <RefreshCw className="w-7 h-7 text-[#5a00b8] animate-spin" />
        <p className="text-xs font-bold text-slate-500">Loading live business analytics…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
        <AlertTriangle className="w-7 h-7 text-rose-500 mx-auto mb-2" />
        <p className="text-sm font-bold text-rose-700">{error}</p>
        <button onClick={load} className="mt-3 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const k = data.kpis;
  const trendData = data.orders.trend;
  const comparisonItems = [
    { label: 'Orders', d: data.comparison.orders, fmt: formatNumber, icon: Package },
    { label: 'Deliveries', d: data.comparison.deliveries, fmt: formatNumber, icon: Truck },
    { label: 'New Customers', d: data.comparison.newCustomers, fmt: formatNumber, icon: Users }
  ];

  const quickActions = [
    ...(isAdmin ? [{ label: 'Add User', icon: UserPlus, tab: 'provision' }] : []),
    ...(canDispatch ? [{ label: 'Dispatch Drone', icon: Plane, tab: 'secure-dispatch' }] : []),
    ...(canDispatch ? [{ label: 'View Deliveries', icon: Truck, tab: 'delivery' }] : []),
    ...(canDispatch ? [{ label: 'Track Order', icon: MapPin, tab: 'delivery' }] : []),
    ...(isAdmin || role === 'fleet_manager' ? [{ label: 'Manage Inventory', icon: Boxes, tab: 'fleet' }] : []),
    ...(canSupport ? [{ label: 'Support Tickets', icon: Headphones, tab: 'support' }] : []),
    ...(canSupport ? [{ label: 'Add Call Log', icon: PhoneCall, tab: 'support' }] : []),
    ...(isAdmin ? [{ label: 'Dispatch History', icon: ListChecks, tab: 'dispatch' }] : [])
  ];

  return (
    <div className="space-y-6">
      {/* ── HEADER: title + time range ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#5a00b8]" /> Business Analytics
          </h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{data.range.label} · updated from live database {loading && <RefreshCw className="inline w-3 h-3 animate-spin" />}</p>
        </div>
        <div className="flex items-center gap-2">
          <TimeRangeSelector value={range} onChange={setRange} />
          <button onClick={load} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#5a00b8] text-white text-xs font-bold hover:bg-purple-800 transition-colors shadow-sm">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── ROW 1: PRIMARY KPI CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
        <KpiCard
          label={range.key === 'today' ? "Today's Orders" : 'Total Orders'}
          value={formatNumber(k.totalOrders.current)}
          icon={Package}
          deltaPct={k.totalOrders.deltaPct}
          trend={k.totalOrders.trend}
          sparkline={k.totalOrders.sparkline}
          comparisonLabel="vs prev"
          subtitle={`All-Time: ${formatNumber(k.allTimeTotalOrders?.value ?? k.totalOrders.current)} orders`}
          tone="text-[#5a00b8] bg-purple-50"
        />
        <KpiCard
          label={range.key === 'today' ? "Today's Delivered" : 'Delivered'}
          value={formatNumber(k.completedOrders.value)}
          icon={CheckCircle2}
          subtitle={`${formatNumber(k.todaysDeliveries.value)} delivered today`}
          tone="text-emerald-700 bg-emerald-50"
        />
        <KpiCard
          label="Pending Orders"
          value={formatNumber(k.pendingOrders.value)}
          icon={Clock3}
          subtitle={`${formatNumber(k.inTransit.value)} in transit`}
          tone="text-sky-700 bg-sky-50"
        />
        <KpiCard
          label={range.key === 'today' ? "Today's Cancelled" : 'Cancelled Orders'}
          value={formatNumber(range.key === 'today' ? (k.todaysCancelled?.value ?? 0) : (k.allTimeCancelledOrders?.value ?? k.cancelledOrders?.value ?? 0))}
          icon={XCircle}
          subtitle={`All-Time: ${formatNumber(k.allTimeCancelledOrders?.value ?? k.cancelledOrders?.value ?? 0)} cancelled`}
          tone="text-rose-700 bg-rose-50"
        />
        <KpiCard
          label="Available 700RPAV"
          value={formatNumber(k.availableDrones.value)}
          icon={Plane}
          subtitle={`${formatNumber(k.dispatchedDrones.value)} dispatched`}
          tone="text-purple-700 bg-purple-50"
        />
      </div>

      {/* secondary KPI strip: Operations & Fleet Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[
          { label: "Today's Deliveries", value: k.todaysDeliveries.value, icon: Truck, tone: 'text-emerald-700 bg-emerald-50' },
          { label: 'In Transit Units', value: k.inTransit.value, icon: Plane, tone: 'text-sky-700 bg-sky-50' },
          { label: 'Pending Dispatch', value: k.pendingDispatches.value, icon: Boxes, tone: 'text-amber-700 bg-amber-50' },
          { label: 'Dispatched Fleet', value: k.dispatchedDrones.value, icon: Plane, tone: 'text-purple-700 bg-purple-50' },
          { label: 'Open Support Tickets', value: k.activeSupportTickets.value, icon: Headphones, tone: 'text-rose-700 bg-rose-50' }
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs flex items-center gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${s.tone}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-black text-slate-900 leading-none">{formatNumber(s.value)}</p>
              <p className="text-[11px] font-bold text-slate-500 mt-1 truncate" title={s.label}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── ROW 2: ORDERS + DELIVERIES TRENDS ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Orders Overview" subtitle={`Order volume trend · ${data.range.granularity}`}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5a00b8" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#5a00b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} minTickGap={16} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...ChartTooltipStyle} />
                <Area type="monotone" dataKey="orders" stroke="#5a00b8" strokeWidth={2.4} fill="url(#ordersFill)" name="Orders" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Deliveries Trend" subtitle="Delivered vs failed vs delayed">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.deliveryPerformance.trend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} minTickGap={16} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...ChartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="delivered" stroke="#15803d" strokeWidth={2} dot={false} name="Delivered" />
                <Line type="monotone" dataKey="failed" stroke="#b91c1c" strokeWidth={2} dot={false} name="Failed" />
                <Line type="monotone" dataKey="delayed" stroke="#ea580c" strokeWidth={2} dot={false} name="Delayed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* ── ROW 3: STATUS DISTRIBUTION + PERIOD COMPARISON ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Order Status Breakdown" subtitle="Distribution across statuses in range">
          {data.statusDistribution.length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold py-10 text-center">No orders in this period.</p>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.statusDistribution} dataKey="count" nameKey="label" innerRadius={48} outerRadius={76} paddingAngle={2} stroke="#fff" strokeWidth={2}>
                      {data.statusDistribution.map((s) => (
                        <Cell key={s.status} fill={statusColor(s.status)} />
                      ))}
                    </Pie>
                    <Tooltip {...ChartTooltipStyle} formatter={(v: any, n: any) => [`${v} (${data.statusDistribution.find((x) => x.label === n)?.pct ?? 0}%)`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                {data.statusDistribution.map((s) => (
                  <div key={s.status} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: statusColor(s.status) }} />
                      <span className="font-bold text-slate-600 truncate">{s.label}</span>
                    </span>
                    <span className="font-black text-slate-900 shrink-0">{s.count} · {s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Period Comparison" subtitle="Current vs previous period">
          <div className="space-y-3">
            {comparisonItems.map((item) => {
              const up = item.d.trend === 'up';
              const flat = item.d.trend === 'flat';
              const color = flat ? 'text-slate-400' : up ? 'text-emerald-600' : 'text-rose-600';
              const Icon = up ? ArrowUpRight : flat ? TrendingUp : ArrowDownRight;
              return (
                <div key={item.label} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <item.icon className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-slate-700">{item.label}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">prev {item.fmt(item.d.previous)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-slate-900">{item.fmt(item.d.current)}</p>
                    <p className={`flex items-center justify-end gap-0.5 text-[11px] font-bold ${color}`}>
                      <Icon className="w-3.5 h-3.5" />{Math.abs(item.d.deltaPct)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* ── ROW 4: TODAY'S DELIVERIES + LIVE MAP ───────────────────────── */}
      {(canDispatch || canSupport) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <SectionCard
            title="Today's Deliveries"
            subtitle={`${data.todaysDeliveries.counts.total} deliveries · ${data.todaysDeliveries.counts.delivered} delivered`}
            right={<span className="text-[10px] font-bold text-slate-400">{filteredDeliveryRows.length} shown</span>}
          >
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search order / customer…" className="w-full pl-8 pr-2.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-400" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 focus:outline-none focus:border-purple-400 bg-white">
                <option value="all">All Status</option>
                {Array.from(new Set((data.todaysDeliveries.list || []).map((r) => r.status))).map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
              {droneModels.length > 0 && (
                <select value={droneFilter} onChange={(e) => setDroneFilter(e.target.value)} className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 focus:outline-none focus:border-purple-400 bg-white">
                  <option value="all">All Drones</option>
                  {droneModels.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </div>
            <div className="overflow-x-auto -mx-1 max-h-[320px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-[10px] uppercase tracking-wide text-slate-400 font-black border-b border-slate-100">
                    <th className="py-2 px-2">Order</th>
                    <th className="py-2 px-2">Customer</th>
                    <th className="py-2 px-2">Drone</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2">ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeliveryRows.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-xs text-slate-400 font-semibold">No deliveries match the current filters.</td></tr>
                  )}
                  {filteredDeliveryRows.map((r) => (
                    <tr key={r.order_id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="py-2 px-2 text-[11px] font-black text-slate-800">{r.order_id}</td>
                      <td className="py-2 px-2 text-[11px] font-semibold text-slate-600 max-w-[120px] truncate">{r.customer}</td>
                      <td className="py-2 px-2 text-[11px] font-mono text-slate-500">{r.drone_id}</td>
                      <td className="py-2 px-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background: statusColor(r.status) }}>{statusLabel(r.status)}</span>
                      </td>
                      <td className="py-2 px-2 text-[11px] font-semibold text-slate-500">{r.eta ? new Date(r.eta).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Live Delivery Map" subtitle="Active deliveries, routes and status across the network">
            <LiveDeliveryMap key={range.label} deliveries={filteredMapDeliveries} center={data.map.center} />
          </SectionCard>
        </div>
      )}

      {/* ── ROW 5: DELIVERY PERFORMANCE + INVENTORY + CUSTOMERS ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {canDispatch && (
          <SectionCard title="Delivery Performance" subtitle="Fulfilment quality metrics">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Delivered', value: formatNumber(data.deliveryPerformance.delivered), icon: CheckCircle2, tone: 'text-emerald-600' },
                {
                  label: 'On-Time %',
                  value: data.deliveryPerformance.delivered > 0 ? `${data.deliveryPerformance.onTimePct}%` : '0%',
                  icon: Timer,
                  tone: 'text-sky-600'
                },
                {
                  label: 'Avg Delivery',
                  value: data.deliveryPerformance.delivered > 0 && data.deliveryPerformance.avgDeliveryMins > 0 ? `${data.deliveryPerformance.avgDeliveryMins}m` : '0m',
                  icon: Clock3,
                  tone: 'text-purple-600'
                },
                {
                  label: 'Avg Transit',
                  value: data.deliveryPerformance.avgTransitMins > 0 ? `${data.deliveryPerformance.avgTransitMins}m` : '0m',
                  icon: Plane,
                  tone: 'text-indigo-600'
                },
                { label: 'Delayed', value: formatNumber(data.deliveryPerformance.delayed), icon: AlertTriangle, tone: 'text-amber-600' },
                { label: 'Failed', value: formatNumber(data.deliveryPerformance.failed), icon: XCircle, tone: 'text-rose-600' }
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <m.icon className={`w-4 h-4 ${m.tone} shrink-0`} />
                  <div className="min-w-0">
                    <p className="text-base font-black text-slate-900 leading-none">{m.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 truncate mt-1">{m.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {(isAdmin || role === 'fleet_manager' || role === 'dispatcher') && (
          <SectionCard title="Drone / Inventory Analytics" subtitle={`${formatNumber(data.inventory.total)} units in fleet`}>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Available', value: data.inventory.available, tone: 'text-emerald-600' },
                { label: 'Booked', value: data.inventory.booked, tone: 'text-sky-600' },
                { label: 'Dispatched', value: data.inventory.dispatched, tone: 'text-purple-600' },
                { label: 'Maintenance', value: data.inventory.maintenance, tone: 'text-amber-600' },
                { label: 'Reserved', value: data.inventory.reserved, tone: 'text-indigo-600' },
                { label: 'Unavailable', value: data.inventory.damaged, tone: 'text-rose-600' }
              ].map((m) => (
                <div key={m.label} className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <p className={`text-lg font-black ${m.tone} leading-none`}>{formatNumber(m.value)}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mt-1">{m.label}</p>
                </div>
              ))}
            </div>
            {data.inventory.distribution.length > 0 && (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.inventory.distribution.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="model" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={92} />
                    <Tooltip {...ChartTooltipStyle} />
                    <Bar dataKey="count" fill="#5a00b8" radius={[0, 4, 4, 0]} name="Units" barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        )}

        {isAdmin && (
          <SectionCard title="Customer Analytics" subtitle={`${formatNumber(data.customers.total)} total customers`}>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: 'New (period)', value: data.customers.new, tone: 'text-emerald-600' },
                { label: 'Active', value: data.customers.active, tone: 'text-sky-600' },
                { label: 'Returning', value: data.customers.returning, tone: 'text-purple-600' },
                { label: 'Pending Orders', value: data.customers.withPendingOrders, tone: 'text-amber-600' }
              ].map((m) => (
                <div key={m.label} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className={`text-xl font-black ${m.tone} leading-none`}>{formatNumber(m.value)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-1">{m.label}</p>
                </div>
              ))}
            </div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.customers.growth} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="custFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} minTickGap={16} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...ChartTooltipStyle} />
                  <Area type="monotone" dataKey="customers" stroke="#2563eb" strokeWidth={2.2} fill="url(#custFill)" name="New Customers" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        )}
      </div>

      {/* ── ROW 6: SUPPORT ANALYTICS + INSIGHTS ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {canSupport && (
          <SectionCard title="Support Analytics" subtitle={`${formatNumber(data.support.total)} tickets · ${data.support.resolutionRate}% resolved`}>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Open', value: data.support.open, tone: 'text-rose-600' },
                { label: 'In Progress', value: data.support.inProgress, tone: 'text-amber-600' },
                { label: 'Waiting', value: data.support.waiting, tone: 'text-sky-600' },
                { label: 'Resolved', value: data.support.resolved, tone: 'text-emerald-600' }
              ].map((m) => (
                <div key={m.label} className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <p className={`text-lg font-black ${m.tone} leading-none`}>{formatNumber(m.value)}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mt-1">{m.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center px-3 py-2 rounded-xl bg-purple-50 border border-purple-100">
                <p className="text-xl font-black text-[#5a00b8] leading-none">{data.support.avgResolutionHrs}h</p>
                <p className="text-[9px] font-bold uppercase tracking-wide text-purple-400 mt-1">Avg Resolution</p>
              </div>
              {data.support.byCategory.length > 0 && (
                <div className="flex-1 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.support.byCategory.slice(0, 6)} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="category" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval={0} angle={-18} textAnchor="end" height={40} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip {...ChartTooltipStyle} />
                      <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Tickets" barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {(isAdmin || role === 'dispatcher') && (
          <SectionCard title="Business Insights" subtitle="Auto-generated from live database data">
            <div className="space-y-2.5">
              {data.insights.length === 0 && <p className="text-xs text-slate-400 font-semibold py-6 text-center">Not enough data yet to generate insights.</p>}
              {data.insights.map((ins, i) => {
                const tone = ins.tone === 'positive' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : ins.tone === 'negative' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-sky-50 border-sky-100 text-sky-700';
                const Icon = ins.tone === 'positive' ? TrendingUp : ins.tone === 'negative' ? AlertTriangle : Lightbulb;
                return (
                  <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl border ${tone}`}>
                    <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-[12px] font-semibold leading-snug">{ins.text}</p>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="Quick Actions" subtitle="Role-aware shortcuts">
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map((a) => (
              <button key={a.label} onClick={() => onQuickAction?.(a.tab)} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-purple-50 border border-slate-100 hover:border-purple-200 text-left transition-colors group">
                <a.icon className="w-4 h-4 text-[#5a00b8] shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-slate-700 leading-tight">{a.label}</span>
              </button>
            ))}
            {quickActions.length === 0 && <p className="text-xs text-slate-400 font-semibold col-span-2">No actions available for this role.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity" subtitle="Live system timeline" className="lg:col-span-2">
          <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
            {filteredActivity.length === 0 && <p className="text-xs text-slate-400 font-semibold py-8 text-center">No recent activity.</p>}
            {filteredActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-[#5a00b8] flex items-center justify-center shrink-0">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-slate-800 truncate">{a.activity}</p>
                  <p className="text-[10px] font-semibold text-slate-400 truncate">{a.entity} · by {a.performedBy}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-slate-500">{a.time}</p>
                  <p className="text-[9px] font-semibold text-slate-400">{a.date}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
