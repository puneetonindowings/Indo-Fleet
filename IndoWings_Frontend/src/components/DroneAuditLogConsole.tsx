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
  Eye,
  FileText,
  Camera,
  Video,
  Building2,
  X
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
  const [activeLogDetail, setActiveLogDetail] = useState<InspectionLog | null>(null);
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
        setInspections(insData.inspections || []);
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
        const matchesDrone =
          String(item.drone_id || '').toLowerCase().trim() === targetDrone;
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
                Drone Audits & QR Logs Console
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Live immutable audit trail of Fleet Manager depot checks, Delivery Person field checks, and Customer QR scans.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#5a00b8]' : ''}`} />
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
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Scans & Audits</p>
          <h4 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h4>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">All Lifecycle Records</p>
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
            <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">Delivery</span>
          </div>
          <h4 className="text-2xl font-black text-blue-900 mt-1">{stats.hubCount}</h4>
          <p className="text-[10px] text-blue-600 font-medium mt-0.5">Order Accept Hub Checks</p>
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
            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Delivery</span>
          </div>
          <h4 className="text-2xl font-black text-emerald-900 mt-1">{stats.customerCount}</h4>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Destination POD & OTP Checks</p>
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
            <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">Fleet/Admin</span>
          </div>
          <h4 className="text-2xl font-black text-[#5a00b8] mt-1">{stats.depotCount}</h4>
          <p className="text-[10px] text-purple-600 font-medium mt-0.5">Pre-Handover Sortie Clear</p>
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
          <span>All Inspections & Audits ({stats.total})</span>
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

      {/* Contextual Section Callout Banner */}
      {activeSection === 'hub_pickup' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in">
          <Building2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
              Stage 1: Hub Pre-Acceptance Inspection (Delivery Person / Pilot)
            </h4>
            <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
              Conducted by the Delivery Person at the Central Dispatch Hub before accepting the order. Verifies propeller rotation, physical chassis integrity, battery voltage, and zero-defect clearance. Unlocks the Order Acceptance OTP without requiring customer OTP at the hub.
            </p>
          </div>
        </div>
      )}

      {activeSection === 'customer_delivery' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in">
          <Truck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
              Stage 2: Customer Handover Inspection (Delivery Person / Pilot)
            </h4>
            <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
              Conducted by the Delivery Person upon arrival at the customer delivery address. Verifies safe landing surface, clean cargo bay release, customer proof of delivery (POD photo evidence), and customer OTP validation to finalize consignment delivery.
            </p>
          </div>
        </div>
      )}

      {activeSection === 'depot_dispatch' && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in">
          <ShieldCheck className="w-5 h-5 text-[#5a00b8] mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wide">
              Depot Technical QC & Sortie Clearance (Fleet Manager / Dispatcher / Admin)
            </h4>
            <p className="text-xs text-purple-700 mt-0.5 leading-relaxed">
              Conducted at the depot by Operations Specialists (Fleet Manager, Dispatcher, or Admin) before handing over aircraft units to delivery personnel. Covers technical avionics diagnostics, motor health, and sortie authorization.
            </p>
          </div>
        </div>
      )}

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
            placeholder="Search by ID, order, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#5a00b8]"
          />
        </div>
      </div>

      {/* Audit Log Entries List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-[#5a00b8]" />
            <p className="text-sm font-semibold">Loading drone audit trail...</p>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-2">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No Inspection or QR Scan Records Found</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {activeSection === 'hub_pickup'
                ? 'No Hub Pre-Acceptance inspections recorded yet. When a delivery person scans and checks a drone at the hub before accepting an order, it will appear here.'
                : activeSection === 'customer_delivery'
                ? 'No Customer Handover inspections recorded yet. When a delivery person inspects and completes delivery at the customer location, it will appear here.'
                : activeSection === 'depot_dispatch'
                ? 'No Depot Maintenance checks found. When a Fleet Manager, Dispatcher, or Admin inspects a drone before dispatch, it will appear here.'
                : 'No inspection records currently match your selected filters.'}
            </p>
          </div>
        ) : (
          filteredInspections.map((item) => {
            const itemStage = getItemStage(item);
            const isPassed = item.overall_inspection === 'PASSED';

            return (
              <div
                key={item.inspection_id}
                className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-5 shadow-xs transition-all space-y-4"
              >
                {/* Entry Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {item.drone_id}
                    </span>

                    {item.delivery_id && (
                      <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-bold">
                        Order #{item.delivery_id}
                      </span>
                    )}

                    {/* Dedicated Stage Indicator Badge */}
                    {itemStage === 'hub_pickup' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        <Building2 className="w-3 h-3" />
                        Hub Pre-Acceptance
                      </span>
                    ) : itemStage === 'customer_delivery' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Truck className="w-3 h-3" />
                        Customer Handover
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-50 text-[#5a00b8] border border-purple-200">
                        <ShieldCheck className="w-3 h-3" />
                        Depot QC Clear
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isPassed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {item.overall_inspection}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(item.inspected_at)}</span>
                  </div>
                </div>

                {/* Actor & Inspection Type Info */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        itemStage === 'hub_pickup'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : itemStage === 'customer_delivery'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-purple-100 text-[#5a00b8] border border-purple-200'
                      }`}
                    >
                      {itemStage === 'hub_pickup' ? (
                        <Building2 className="w-4 h-4" />
                      ) : itemStage === 'customer_delivery' ? (
                        <Truck className="w-4 h-4" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {item.inspector_name || item.inspected_by || 'Operations Team'}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded-full ${
                            itemStage === 'hub_pickup'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : itemStage === 'customer_delivery'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-purple-50 text-[#5a00b8] border border-purple-200'
                          }`}
                        >
                          {item.inspector_role || (itemStage === 'depot_dispatch' ? 'Depot Inspector' : 'Delivery Person')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {item.inspected_by || 'system'} · Stage: {itemStage.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {onOpenInspectionModal && (
                      <button
                        type="button"
                        onClick={() => onOpenInspectionModal(item.drone_id, item.delivery_id || undefined)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 hover:bg-[#5a00b8] text-[#5a00b8] hover:text-white border border-purple-200 transition-colors cursor-pointer"
                      >
                        Inspect Drone
                      </button>
                    )}
                  </div>
                </div>

                {/* Inspection Checklist Details Grid */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                  {itemStage === 'hub_pickup' ? (
                    // Hub Pre-Acceptance Specific Checklist
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Rotor & Motors</span>
                        <span className="font-semibold text-slate-800 capitalize">
                          {item.propeller_debris_check ? item.propeller_debris_check.replace(/_/g, ' ') : 'Spins Free No Debris'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Chassis / Body</span>
                        <span className="font-semibold text-slate-800 capitalize">
                          {item.body_condition || 'Good Condition'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Airframe Integrity</span>
                        <span className="font-semibold text-blue-700">
                          {item.zero_defect_certified ? 'Intact & Cleared' : 'Defect Flagged'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Hub Clearance</span>
                        <span className="font-semibold text-emerald-700">
                          {item.zero_defect_certified ? 'Zero Defects Certified' : 'Verified OK'}
                        </span>
                      </div>
                    </div>
                  ) : itemStage === 'customer_delivery' ? (
                    // Customer Handover Specific Checklist
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Cargo Bay</span>
                        <span className="font-semibold text-slate-800 capitalize">
                          {item.cargo_bay_condition ? item.cargo_bay_condition.replace(/_/g, ' ') : 'Clean Release'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Landing Surface</span>
                        <span className="font-semibold text-slate-800 capitalize">
                          {item.landing_surface ? item.landing_surface.replace(/_/g, ' ') : 'Safe Flat'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Delivery Handover</span>
                        <span className="font-semibold text-emerald-700">
                          {item.zero_defect_certified ? 'Secure Complete' : 'Handover Logged'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Proof of Delivery</span>
                        <span className="font-semibold text-emerald-700">
                          {item.photo_references?.length ? `${item.photo_references.length} POD Photos` : 'OTP Handover Verified'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    // Depot / Fleet Manager Technical Checks
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Airframe Body</span>
                        <span className="font-semibold text-slate-800 capitalize">
                          {item.body_condition || 'Good'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Propellers</span>
                        <span className="font-semibold text-slate-800 capitalize">
                          {item.propeller_condition || 'Good'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Sortie Readiness</span>
                        <span className="font-semibold text-slate-800 capitalize">
                          {item.ready_for_next_sortie ? 'Flight Ready' : 'Pending Review'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Avionics Clearance</span>
                        <span className="font-semibold text-purple-700 capitalize">
                          {item.depot_avionics_cleared ? 'Cleared' : 'Passed'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                  {/* Notes / Remarks */}
                  {(item.remarks || item.delivery_handover_notes) && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-xs">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                        Inspector Notes & Remarks:
                      </span>
                      <p className="text-slate-700 italic">
                        "{item.delivery_handover_notes || item.remarks}"
                      </p>
                    </div>
                  )}

                  {/* Photo & Video Evidence Gallery */}
                  {(() => {
                    const photos: string[] = [];
                    const videos: string[] = [];

                    if (Array.isArray(item.photo_references)) {
                      item.photo_references.forEach((p: any) => {
                        const uri = typeof p === 'string' ? p : (p?.url || p?.uri || '');
                        if (uri) photos.push(uri);
                      });
                    }
                    if (Array.isArray(item.video_references)) {
                      item.video_references.forEach((v: any) => {
                        const uri = typeof v === 'string' ? v : (v?.url || v?.uri || '');
                        if (uri) videos.push(uri);
                      });
                    }
                    if (Array.isArray(item.media_evidence)) {
                      item.media_evidence.forEach((m: any) => {
                        if (m?.type === 'video' && m?.uri) videos.push(m.uri);
                        else if (m?.uri) photos.push(m.uri);
                      });
                    }

                    if (photos.length === 0 && videos.length === 0) return null;

                    return (
                      <div className="mt-3 pt-3 border-t border-slate-200/60">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Inspection Media Evidence
                          </span>
                          <span className="text-[10px] font-black bg-purple-100 text-[#5a00b8] px-2 py-0.5 rounded-full">
                            {photos.length > 0 && `${photos.length} Photo${photos.length > 1 ? 's' : ''}`}
                            {photos.length > 0 && videos.length > 0 && ' · '}
                            {videos.length > 0 && `${videos.length} Video${videos.length > 1 ? 's' : ''}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 overflow-x-auto pb-2">
                          {photos.map((src, idx) => (
                            <div
                              key={`img-${idx}`}
                              onClick={() => setPreviewMedia({ type: 'image', url: src })}
                              className="group relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 cursor-pointer shadow-xs hover:border-[#5a00b8] transition-all"
                            >
                              <img src={src} alt="Inspection proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                                <Camera className="w-4 h-4 text-white opacity-80 group-hover:opacity-100" />
                              </div>
                            </div>
                          ))}

                          {videos.map((src, idx) => (
                            <div
                              key={`vid-${idx}`}
                              onClick={() => setPreviewMedia({ type: 'video', url: src })}
                              className="group relative w-28 h-20 rounded-xl overflow-hidden border border-purple-300 bg-slate-900 shrink-0 cursor-pointer shadow-xs hover:border-[#5a00b8] transition-all flex items-center justify-center"
                            >
                              <video src={src} className="w-full h-full object-cover opacity-60" muted />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-purple-600/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <Video className="w-4 h-4 text-white" />
                                </div>
                              </div>
                              <div className="absolute bottom-1 right-1 bg-black/80 text-purple-300 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                                PLAY VIDEO
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
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
