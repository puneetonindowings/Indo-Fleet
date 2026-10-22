import React, { useState, useEffect, useMemo } from 'react';
import {
  QrCode,
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Truck,
  Layers,
  Wrench,
  Battery,
  Box,
  Plane,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Eye,
  FileText,
  Camera,
  Video,
  Play,
  Building2,
  X,
  Maximize2
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { DeliveryUser } from '../types';

interface InspectionLog {
  inspection_id: string;
  inspection_type: string; // 'HUB_PRE_FLIGHT_CHECK' | 'DELIVERY_PERSON_CHECK' | 'DEPOT_MAINTENANCE' | 'CUSTOMER_FEEDBACK'
  stage?: 'hub_pickup' | 'customer_delivery' | 'depot_dispatch' | string;
  drone_id: string;
  delivery_id?: string | null;
  cargo_bay_condition?: string;
  landing_surface?: string;
  propeller_debris_check?: string;
  field_battery_level?: number | null;
  zero_defect_certified?: boolean;
  delivery_handover_notes?: string;
  body_condition?: string;
  propeller_condition?: string;
  battery_condition?: string;
  landing_gear_condition?: string;
  depot_avionics_cleared?: boolean;
  ready_for_next_sortie?: boolean;
  overall_inspection: string; // 'PASSED' | 'FAILED' | 'PENDING'
  remarks?: string;
  photo_references?: any[];
  video_references?: any[];
  media_evidence?: { type: 'image' | 'video'; uri: string; name?: string }[];
  inspected_by?: string;
  inspector_name?: string;
  inspector_role?: string;
  inspected_at: string;
}

interface GroupedOrderInspection {
  key: string;
  orderId: string | null;
  stage: 'hub_pickup' | 'customer_delivery' | 'depot_dispatch';
  stageLabel: string;
  inspections: InspectionLog[];
  overallStatus: 'PASSED' | 'FAILED' | 'PENDING';
  totalDrones: number;
  passedDronesCount: number;
  allPhotos: string[];
  allVideos: string[];
  latestDate: string;
  inspectorName?: string;
  inspectorRole?: string;
}

interface DroneAuditLogConsoleProps {
  currentUser: DeliveryUser | null;
  onOpenQRModal?: (drone: any) => void;
  onOpenInspectionModal?: (droneId: string, deliveryId?: string) => void;
}

export const DroneAuditLogConsole: React.FC<DroneAuditLogConsoleProps> = ({
  currentUser,
  onOpenQRModal,
  onOpenInspectionModal
}) => {
  const [inspections, setInspections] = useState<InspectionLog[]>([]);
  const [drones, setDrones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDroneFilter, setSelectedDroneFilter] = useState<string>('all');
  const [activeSection, setActiveSection] = useState<'all' | 'hub_pickup' | 'customer_delivery' | 'depot_dispatch'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'defect'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [previewMedia, setPreviewMedia] = useState<{ type: 'image' | 'video'; url: string } | null>(null);

  const token = localStorage.getItem('iw_delivery_token') || '';
  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [insRes, fleetRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/delivery/inspections`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/api/delivery/fleet`, { headers: authHeaders }).catch(() => null)
      ]);

      if (insRes.ok) {
        const insData = await insRes.json();
        const records = insData.inspections || [];
        setInspections(records);
        // By default, expand all orders so user immediately sees all drones cleanly
        const initialExpanded: Record<string, boolean> = {};
        records.forEach((r: InspectionLog) => {
          const key = r.delivery_id ? `${r.delivery_id}::${getItemStage(r)}` : `standalone::${r.drone_id}::${r.inspection_id}`;
          initialExpanded[key] = true;
        });
        setExpandedOrders(initialExpanded);
      }

      if (fleetRes && fleetRes.ok) {
        const fleetData = await fleetRes.json();
        setDrones(fleetData.fleet || []);
      }
    } catch (err) {
      console.error('[DroneAuditLogConsole] Failed to fetch data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to accurately classify each inspection into its dedicated stage
  const getItemStage = (item: InspectionLog): 'hub_pickup' | 'customer_delivery' | 'depot_dispatch' => {
    if (
      item.stage === 'hub_pickup' ||
      item.inspection_type === 'HUB_PRE_FLIGHT_CHECK' ||
      item.inspection_type === 'pre-flight' ||
      (item.remarks && item.remarks.toLowerCase().includes('hub'))
    ) {
      return 'hub_pickup';
    }
    if (
      item.stage === 'depot_dispatch' ||
      item.inspection_type === 'DEPOT_MAINTENANCE' ||
      ['fleet_manager', 'dispatcher', 'admin', 'super_admin'].includes(item.inspector_role || '')
    ) {
      return 'depot_dispatch';
    }
    return 'customer_delivery';
  };

  // Filtered Inspections
  const filteredInspections = useMemo(() => {
    return inspections.filter((item) => {
      // 1. Drone filter
      if (selectedDroneFilter !== 'all') {
        const targetDrone = selectedDroneFilter.toLowerCase().trim();
        const matchesDrone = String(item.drone_id || '').toLowerCase().trim() === targetDrone;
        if (!matchesDrone) return false;
      }

      // 2. Stage Section filter
      if (activeSection !== 'all') {
        const stage = getItemStage(item);
        if (stage !== activeSection) return false;
      }

      // 3. Status filter
      if (statusFilter === 'passed' && item.overall_inspection !== 'PASSED') return false;
      if (statusFilter === 'defect' && item.overall_inspection === 'PASSED') return false;

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const str = `${item.drone_id} ${item.delivery_id || ''} ${item.inspector_name || ''} ${item.inspected_by || ''} ${item.remarks || ''} ${item.delivery_handover_notes || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }

      return true;
    });
  }, [inspections, selectedDroneFilter, activeSection, statusFilter, searchQuery]);

  // Group filtered inspections ORDER-WISE
  const groupedOrders = useMemo(() => {
    const groupsMap = new Map<string, GroupedOrderInspection>();

    filteredInspections.forEach((item) => {
      const stage = getItemStage(item);
      const orderId = item.delivery_id ? String(item.delivery_id).trim() : null;
      const groupKey = orderId ? `${orderId}::${stage}` : `standalone::${item.drone_id}::${item.inspection_id}`;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          key: groupKey,
          orderId,
          stage,
          stageLabel:
            stage === 'hub_pickup'
              ? 'Hub Pre-Acceptance'
              : stage === 'customer_delivery'
              ? 'Customer Handover'
              : 'Depot QC Clearance',
          inspections: [],
          overallStatus: 'PASSED',
          totalDrones: 0,
          passedDronesCount: 0,
          allPhotos: [],
          allVideos: [],
          latestDate: item.inspected_at,
          inspectorName: item.inspector_name || item.inspected_by,
          inspectorRole: item.inspector_role
        });
      }

      const grp = groupsMap.get(groupKey)!;
      grp.inspections.push(item);
      grp.totalDrones++;
      if (item.overall_inspection === 'PASSED') {
        grp.passedDronesCount++;
      } else {
        grp.overallStatus = 'FAILED';
      }

      // Extract media
      if (Array.isArray(item.photo_references)) {
        item.photo_references.forEach((p: any) => {
          const uri = typeof p === 'string' ? p : (p?.url || p?.uri || '');
          if (uri && !grp.allPhotos.includes(uri)) grp.allPhotos.push(uri);
        });
      }
      if (Array.isArray(item.video_references)) {
        item.video_references.forEach((v: any) => {
          const uri = typeof v === 'string' ? v : (v?.url || v?.uri || '');
          if (uri && !grp.allVideos.includes(uri)) grp.allVideos.push(uri);
        });
      }
      if (Array.isArray(item.media_evidence)) {
        item.media_evidence.forEach((m: any) => {
          if (m?.type === 'video' && m?.uri && !grp.allVideos.includes(m.uri)) {
            grp.allVideos.push(m.uri);
          } else if (m?.uri && !grp.allPhotos.includes(m.uri)) {
            grp.allPhotos.push(m.uri);
          }
        });
      }

      if (new Date(item.inspected_at).getTime() > new Date(grp.latestDate).getTime()) {
        grp.latestDate = item.inspected_at;
      }
    });

    return Array.from(groupsMap.values());
  }, [filteredInspections]);

  // Aggregate stats across distinct inspection categories
  const stats = useMemo(() => {
    const total = inspections.length;
    let hubCount = 0;
    let customerCount = 0;
    let depotCount = 0;
    let passedCount = 0;
    let defectCount = 0;

    inspections.forEach((i) => {
      const st = getItemStage(i);
      if (st === 'hub_pickup') hubCount++;
      else if (st === 'customer_delivery') customerCount++;
      else depotCount++;

      if (i.overall_inspection === 'PASSED') passedCount++;
      else defectCount++;
    });

    return { total, hubCount, customerCount, depotCount, passedCount, defectCount };
  }, [inspections]);

  const toggleOrder = (key: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    groupedOrders.forEach((g) => { next[g.key] = true; });
    setExpandedOrders(next);
  };

  const collapseAll = () => {
    setExpandedOrders({});
  };

  const formatDate = (isoString: string) => {
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5a00b8] border border-purple-200 flex items-center justify-center font-black">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Order-Wise Drone Inspections & Media Audits
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Live multi-drone inspection records organized by Order with full photo and video evidence.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-[#5a00b8] transition-colors cursor-pointer"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            Collapse All
          </button>
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-300' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setActiveSection('all')}
          className={`text-left rounded-2xl p-4 shadow-xs transition-all border cursor-pointer ${
            activeSection === 'all'
              ? 'bg-purple-50/50 border-[#5a00b8] ring-2 ring-purple-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Scanned Drones</p>
          <h4 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h4>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Across {groupedOrders.length} Order Batches</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('hub_pickup')}
          className={`text-left rounded-2xl p-4 shadow-xs transition-all border cursor-pointer ${
            activeSection === 'hub_pickup'
              ? 'bg-blue-50/60 border-blue-600 ring-2 ring-blue-200'
              : 'bg-white border-blue-200/80 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Hub Pre-Acceptance</p>
            <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">Stage 1</span>
          </div>
          <h4 className="text-2xl font-black text-blue-900 mt-1">{stats.hubCount}</h4>
          <p className="text-[10px] text-blue-600 font-medium mt-0.5">Delivery Person Hub Checks</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('customer_delivery')}
          className={`text-left rounded-2xl p-4 shadow-xs transition-all border cursor-pointer ${
            activeSection === 'customer_delivery'
              ? 'bg-emerald-50/60 border-emerald-600 ring-2 ring-emerald-200'
              : 'bg-white border-emerald-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Customer Handover</p>
            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Stage 2</span>
          </div>
          <h4 className="text-2xl font-black text-emerald-900 mt-1">{stats.customerCount}</h4>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Destination Proof of Delivery</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('depot_dispatch')}
          className={`text-left rounded-2xl p-4 shadow-xs transition-all border cursor-pointer ${
            activeSection === 'depot_dispatch'
              ? 'bg-purple-50/60 border-purple-600 ring-2 ring-purple-200'
              : 'bg-white border-purple-200/80 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-[#5a00b8] uppercase tracking-wider">Depot QC Clearance</p>
            <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">Maintenance</span>
          </div>
          <h4 className="text-2xl font-black text-[#5a00b8] mt-1">{stats.depotCount}</h4>
          <p className="text-[10px] text-purple-600 font-medium mt-0.5">Pre-Sortie Flight Cleared</p>
        </button>
      </div>

      {/* 4 Dedicated Section Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSection === 'all'
              ? 'bg-[#5a00b8] text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>All Orders & Inspections ({stats.total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('hub_pickup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSection === 'hub_pickup'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>🏢 Hub Pre-Acceptance ({stats.hubCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('customer_delivery')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSection === 'customer_delivery'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>📦 Customer Handover ({stats.customerCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('depot_dispatch')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSection === 'depot_dispatch'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>🛡️ Depot QC Clearance ({stats.depotCount})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Drone Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Filter Drone:</span>
          <select
            value={selectedDroneFilter}
            onChange={(e) => setSelectedDroneFilter(e.target.value)}
            className="text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-[#5a00b8] cursor-pointer"
          >
            <option value="all">All 700 RPAV Drones</option>
            {drones.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} ({d.model || 'Airframe'}) - {d.status}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Status:</span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('passed')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'passed'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
            }`}
          >
            Passed
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('defect')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'defect'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
            }`}
          >
            Needs Review
          </button>
        </div>

        {/* Free text search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order ID, Drone ID, Pilot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#5a00b8]"
          />
        </div>
      </div>

      {/* Order-Wise Inspection Accordions */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-[#5a00b8]" />
            <p className="text-sm font-semibold">Loading order inspections...</p>
          </div>
        ) : groupedOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-2">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No Inspection Records Found</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No inspections match your active section or filter criteria.
            </p>
          </div>
        ) : (
          groupedOrders.map((grp) => {
            const isExpanded = Boolean(expandedOrders[grp.key]);
            const isPassed = grp.overallStatus === 'PASSED';

            return (
              <div
                key={grp.key}
                className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl overflow-hidden shadow-xs transition-all"
              >
                {/* Order Header / Accordion Click Bar */}
                <div
                  onClick={() => toggleOrder(grp.key)}
                  className="p-4 sm:p-5 cursor-pointer bg-slate-50/60 hover:bg-purple-50/30 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Expand/Collapse Chevron Indicator */}
                    <div className="w-7 h-7 rounded-xl bg-purple-100 text-[#5a00b8] flex items-center justify-center font-bold shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>

                    {/* Order Title & Stage Info */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {grp.orderId ? (
                          <span className="text-xs font-black font-mono text-purple-900 bg-purple-100/80 border border-purple-200 px-2.5 py-1 rounded-lg">
                            Order #{grp.orderId}
                          </span>
                        ) : (
                          <span className="text-xs font-black text-slate-800 bg-slate-200/80 px-2.5 py-1 rounded-lg">
                            Depot Airframe Check
                          </span>
                        )}

                        {/* Stage Badge */}
                        {grp.stage === 'hub_pickup' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            <Building2 className="w-3 h-3" />
                            Hub Pre-Acceptance
                          </span>
                        ) : grp.stage === 'customer_delivery' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Truck className="w-3 h-3" />
                            Customer Handover
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-purple-50 text-[#5a00b8] border border-purple-200">
                            <ShieldCheck className="w-3 h-3" />
                            Depot QC Clearance
                          </span>
                        )}

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                            isPassed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {isPassed ? 'Passed' : 'Needs Review'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        Inspector: <span className="font-bold text-slate-700">{grp.inspectorName || 'Delivery Partner'}</span> · Stage: {grp.stageLabel}
                      </p>
                    </div>
                  </div>

                  {/* Right Meta Info & Toggle Action */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Inspected Drones Badge */}
                    <span className="text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-xl">
                      ✈️ {grp.totalDrones} Drone{grp.totalDrones > 1 ? 's' : ''} Inspected
                    </span>

                    {/* Media Badge */}
                    {(grp.allPhotos.length > 0 || grp.allVideos.length > 0) && (
                      <span className="text-xs font-bold bg-purple-50 text-[#5a00b8] border border-purple-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" />
                        {grp.allPhotos.length > 0 && `${grp.allPhotos.length} Photo${grp.allPhotos.length > 1 ? 's' : ''}`}
                        {grp.allPhotos.length > 0 && grp.allVideos.length > 0 && ' · '}
                        {grp.allVideos.length > 0 && `${grp.allVideos.length} Video${grp.allVideos.length > 1 ? 's' : ''}`}
                      </span>
                    )}

                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                      {formatDate(grp.latestDate)}
                    </span>

                    <button
                      type="button"
                      className="px-3 py-1 rounded-xl text-xs font-bold bg-[#5a00b8] text-white hover:bg-purple-800 transition-colors cursor-pointer"
                    >
                      {isExpanded ? 'Hide' : 'View Drones'}
                    </button>
                  </div>
                </div>

                {/* Expanded Order Drawer: Displays All Drones Inspected under this Order */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-white space-y-4">
                    {/* Order Media Evidence Gallery (Photos & Videos) */}
                    {(grp.allPhotos.length > 0 || grp.allVideos.length > 0) && (
                      <div className="bg-purple-50/50 border border-purple-200/80 rounded-2xl p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-[#5a00b8]" />
                            <span className="text-xs font-black text-purple-900 uppercase tracking-wide">
                              Consignment Inspection Media Evidence
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-[#5a00b8]">
                            {grp.allPhotos.length} Photo(s) · {grp.allVideos.length} Video(s)
                          </span>
                        </div>

                        <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-1">
                          {grp.allPhotos.map((src, idx) => (
                            <div
                              key={`order-img-${idx}`}
                              onClick={() => setPreviewMedia({ type: 'image', url: src })}
                              className="group relative w-24 h-24 rounded-xl overflow-hidden border border-purple-200 bg-white shrink-0 cursor-pointer shadow-xs hover:border-[#5a00b8] transition-all"
                            >
                              <img src={src} alt="Inspection proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                                <Maximize2 className="w-4 h-4 text-white opacity-80 group-hover:opacity-100" />
                              </div>
                            </div>
                          ))}

                          {grp.allVideos.map((src, idx) => (
                            <div
                              key={`order-vid-${idx}`}
                              onClick={() => setPreviewMedia({ type: 'video', url: src })}
                              className="group relative w-32 h-24 rounded-xl overflow-hidden border border-purple-300 bg-slate-900 shrink-0 cursor-pointer shadow-xs hover:border-[#5a00b8] transition-all flex items-center justify-center"
                            >
                              <video src={src} className="w-full h-full object-cover opacity-60" muted />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-purple-600/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                </div>
                              </div>
                              <div className="absolute bottom-1 right-1 bg-black/80 text-purple-300 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                                PLAY VIDEO
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inspected Drone Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                      {grp.inspections.map((droneItem) => {
                        const isDronePassed = droneItem.overall_inspection === 'PASSED';
                        return (
                          <div
                            key={droneItem.inspection_id}
                            className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3 hover:border-purple-300 transition-all"
                          >
                            {/* Drone Top Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                  {droneItem.drone_id}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    isDronePassed
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  {droneItem.overall_inspection}
                                </span>
                              </div>

                              <span className="text-[11px] text-slate-400 font-medium">
                                {formatDate(droneItem.inspected_at)}
                              </span>
                            </div>

                            {/* Checklist Items */}
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Rotor / Motors</span>
                                <span className="font-semibold text-slate-800 capitalize">
                                  {droneItem.propeller_debris_check
                                    ? droneItem.propeller_debris_check.replace(/_/g, ' ')
                                    : 'Spins Free No Debris'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Chassis / Body</span>
                                <span className="font-semibold text-slate-800 capitalize">
                                  {droneItem.body_condition || 'Good Condition'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Airframe Clearance</span>
                                <span className="font-semibold text-emerald-700">
                                  {droneItem.zero_defect_certified ? 'Zero Defects Certified' : 'Verified OK'}
                                </span>
                              </div>
                            </div>

                            {/* Remarks */}
                            {(droneItem.remarks || droneItem.delivery_handover_notes) && (
                              <div className="text-xs pt-2 border-t border-slate-200/50">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                                  Notes & Remarks:
                                </span>
                                <p className="text-slate-700 italic text-[11px]">
                                  "{droneItem.delivery_handover_notes || droneItem.remarks}"
                                </p>
                              </div>
                            )}

                            {/* Drone Individual Photos/Videos if available */}
                            {(() => {
                              const itemPhotos: string[] = [];
                              const itemVideos: string[] = [];
                              if (Array.isArray(droneItem.photo_references)) {
                                droneItem.photo_references.forEach((p: any) => {
                                  const u = typeof p === 'string' ? p : (p?.url || p?.uri || '');
                                  if (u) itemPhotos.push(u);
                                });
                              }
                              if (Array.isArray(droneItem.video_references)) {
                                droneItem.video_references.forEach((v: any) => {
                                  const u = typeof v === 'string' ? v : (v?.url || v?.uri || '');
                                  if (u) itemVideos.push(u);
                                });
                              }
                              if (Array.isArray(droneItem.media_evidence)) {
                                droneItem.media_evidence.forEach((m: any) => {
                                  if (m?.type === 'video' && m?.uri && !itemVideos.includes(m.uri)) itemVideos.push(m.uri);
                                  else if (m?.uri && !itemPhotos.includes(m.uri)) itemPhotos.push(m.uri);
                                });
                              }
                              if (itemPhotos.length === 0 && itemVideos.length === 0) return null;

                              return (
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50 overflow-x-auto">
                                  {itemPhotos.map((src, idx) => (
                                    <div
                                      key={`drone-img-${idx}`}
                                      onClick={() => setPreviewMedia({ type: 'image', url: src })}
                                      className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 cursor-pointer hover:border-[#5a00b8]"
                                    >
                                      <img src={src} alt="Drone proof" className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                  {itemVideos.map((src, idx) => (
                                    <div
                                      key={`drone-vid-${idx}`}
                                      onClick={() => setPreviewMedia({ type: 'video', url: src })}
                                      className="w-16 h-14 rounded-lg overflow-hidden border border-purple-300 bg-slate-900 shrink-0 cursor-pointer flex items-center justify-center relative"
                                    >
                                      <video src={src} className="w-full h-full object-cover opacity-60" muted />
                                      <Play className="w-3.5 h-3.5 text-white fill-white absolute" />
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Media Lightbox Modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-2xl w-full p-4 relative shadow-2xl">
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute top-3 right-3 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-white text-xs font-bold mb-3 flex items-center gap-2">
              {previewMedia.type === 'video' ? <Video className="w-4 h-4 text-purple-400" /> : <Camera className="w-4 h-4 text-purple-400" />}
              <span>Inspection Evidence Preview ({previewMedia.type.toUpperCase()})</span>
            </div>
            <div className="flex items-center justify-center max-h-[75vh] overflow-hidden rounded-xl bg-black">
              {previewMedia.type === 'video' ? (
                <video src={previewMedia.url} controls autoPlay className="max-h-[70vh] w-full rounded-xl" />
              ) : (
                <img src={previewMedia.url} alt="Full inspection evidence" className="max-h-[70vh] w-auto object-contain rounded-xl" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
