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
  FileText
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { DeliveryUser } from '../types';

interface InspectionLog {
  inspection_id: string;
  inspection_type: string; // 'DELIVERY_PERSON_CHECK' | 'DEPOT_MAINTENANCE' | 'CUSTOMER_FEEDBACK'
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
  photo_references?: string[];
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
  const [roleFilter, setRoleFilter] = useState<'all' | 'depot' | 'delivery' | 'customer'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'defect'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLogDetail, setActiveLogDetail] = useState<InspectionLog | null>(null);

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

      // 2. Role / Actor filter
      if (roleFilter === 'depot') {
        const isDepot =
          item.inspection_type === 'DEPOT_MAINTENANCE' ||
          item.inspector_role === 'fleet_manager' ||
          item.inspector_role === 'dispatcher' ||
          item.inspector_role === 'admin';
        if (!isDepot) return false;
      } else if (roleFilter === 'delivery') {
        const isDelivery =
          item.inspection_type === 'DELIVERY_PERSON_CHECK' ||
          item.inspector_role === 'delivery' ||
          item.inspector_role === 'pilot';
        if (!isDelivery) return false;
      } else if (roleFilter === 'customer') {
        const isCustomer =
          item.inspector_role === 'customer' ||
          item.inspection_type === 'CUSTOMER_FEEDBACK';
        if (!isCustomer) return false;
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
  }, [inspections, selectedDroneFilter, roleFilter, statusFilter, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = inspections.length;
    const depotCount = inspections.filter(
      (i) => i.inspection_type === 'DEPOT_MAINTENANCE' || ['fleet_manager', 'dispatcher', 'admin'].includes(i.inspector_role || '')
    ).length;
    const deliveryCount = inspections.filter(
      (i) => i.inspection_type === 'DELIVERY_PERSON_CHECK' || ['delivery', 'pilot'].includes(i.inspector_role || '')
    ).length;
    const passedCount = inspections.filter((i) => i.overall_inspection === 'PASSED').length;
    const defectCount = inspections.filter((i) => i.overall_inspection !== 'PASSED').length;

    return { total, depotCount, deliveryCount, passedCount, defectCount };
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
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Scans & Audits</p>
          <h4 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h4>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Permanent Log Records</p>
        </div>

        <div className="bg-white border border-purple-200 bg-purple-50/20 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-[#5a00b8] uppercase tracking-wider">Fleet & Dispatcher</p>
          <h4 className="text-2xl font-black text-[#5a00b8] mt-1">{stats.depotCount}</h4>
          <p className="text-[10px] text-purple-600 font-medium mt-0.5">Depot Sortie Audits</p>
        </div>

        <div className="bg-white border border-blue-200 bg-blue-50/20 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Delivery Person / Pilot</p>
          <h4 className="text-2xl font-black text-blue-900 mt-1">{stats.deliveryCount}</h4>
          <p className="text-[10px] text-blue-600 font-medium mt-0.5">Field Handover Checks</p>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Passed / Verified</p>
          <h4 className="text-2xl font-black text-emerald-800 mt-1">{stats.passedCount}</h4>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
            {stats.defectCount > 0 ? `${stats.defectCount} Needs Review` : '100% Quality Approved'}
          </p>
        </div>
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

        {/* Actor Role Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              roleFilter === 'all'
                ? 'bg-[#5a00b8] text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            All Actors
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('depot')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              roleFilter === 'depot'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
            }`}
          >
            Fleet Manager & Dispatcher
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('delivery')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              roleFilter === 'delivery'
                ? 'bg-blue-700 text-white shadow-2xs'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
            }`}
          >
            Delivery Person & Pilot
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
              {selectedDroneFilter !== 'all'
                ? `No recorded audits found specifically for drone ${selectedDroneFilter}. Use the "Inspect" button in the Inventory table to record an inspection.`
                : 'No inspection records currently match your selected filters. Inspections recorded at dispatch or field delivery will appear here permanently.'}
            </p>
          </div>
        ) : (
          filteredInspections.map((item) => {
            const isDelivery =
              item.inspection_type === 'DELIVERY_PERSON_CHECK' ||
              ['delivery', 'pilot'].includes(item.inspector_role || '');
            const isPassed = item.overall_inspection === 'PASSED';

            return (
              <div
                key={item.inspection_id}
                className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-5 shadow-xs transition-all space-y-4"
              >
                {/* Entry Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {item.drone_id}
                    </span>

                    {item.delivery_id && (
                      <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-bold">
                        Order: {item.delivery_id}
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
                        isDelivery
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-purple-100 text-[#5a00b8] border border-purple-200'
                      }`}
                    >
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {item.inspector_name || item.inspected_by || 'Operations Team'}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded-full ${
                            isDelivery
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-[#5a00b8] border border-purple-200'
                          }`}
                        >
                          {item.inspector_role || (isDelivery ? 'Delivery Person' : 'Fleet Dispatcher')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {item.inspected_by || 'system-agent'} · Check: {item.inspection_type}
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
                  {isDelivery ? (
                    // Delivery Person Specific Field Verification Details
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
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Propeller Debris</span>
                        <span className="font-semibold text-slate-800 capitalize">
                          {item.propeller_debris_check ? item.propeller_debris_check.replace(/_/g, ' ') : 'Spins Free'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Battery Level</span>
                        <span className="font-semibold text-emerald-700">
                          {item.field_battery_level != null ? `${item.field_battery_level}%` : 'Normal'}
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
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Battery Health</span>
                        <span className="font-semibold text-slate-800 capitalize">
                          {item.battery_condition || 'Normal'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Landing Gear</span>
                        <span className="font-semibold text-slate-800 capitalize">
                          {item.landing_gear_condition || 'Good'}
                        </span>
                      </div>
                    </div>
                  )}

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
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
