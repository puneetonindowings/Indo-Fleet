import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Battery,
  Zap,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Search,
  Filter,
  Plus,
  Wrench,
  FileCheck,
  Check,
  Clock,
  Radio,
  Cpu,
  Award,
  Loader2,
  ArrowRight,
  Eye,
  CheckSquare
} from 'lucide-react';
import { DeliveryUser } from '../types';
import { API_BASE_URL } from '../config/api';

interface FleetManagerPageProps {
  currentUser: DeliveryUser | null;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export const FleetManagerPage: React.FC<FleetManagerPageProps> = ({ currentUser, onNavigate, onLogout }) => {
  const [drones, setDrones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [qcFilter, setQcFilter] = useState('all');

  // QC Inspection Modal
  const [selectedDroneForQc, setSelectedDroneForQc] = useState<any | null>(null);
  const [qcChecks, setQcChecks] = useState({
    avionics: false,
    battery: false,
    dgca: false,
    payload: false,
    parachute: false
  });
  const [qcNotes, setQcNotes] = useState('DGCA Compliant. Pre-dispatch airworthiness certification completed.');
  const [submittingQc, setSubmittingQc] = useState(false);

  // New Drone Registration Modal
  const [showAddDrone, setShowAddDrone] = useState(false);
  const [newModel, setNewModel] = useState('700RPAV');
  const [newStation, setNewStation] = useState('Noida Sector 62 Plant');
  const [addingDrone, setAddingDrone] = useState(false);

  const fetchFleet = async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones`);
      if (res.ok) {
        const data = await res.json();
        setDrones(data.drones || []);
      }
    } catch (err) {
      console.error('Error fetching drones:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  const openQcModal = (drone: any) => {
    setSelectedDroneForQc(drone);
    setQcChecks({
      avionics: drone.qc_status === 'passed',
      battery: drone.qc_status === 'passed',
      dgca: drone.qc_status === 'passed',
      payload: drone.qc_status === 'passed',
      parachute: drone.qc_status === 'passed'
    });
    setQcNotes(drone.qc_notes || 'All avionics and battery cycles cleared for delivery dispatch.');
  };

  const handlePassQc = async () => {
    if (!selectedDroneForQc) return;
    setSubmittingQc(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones/${selectedDroneForQc.id}/qc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('iw_delivery_token') || ''}`
        },
        body: JSON.stringify({
          qc_status: 'passed',
          qc_notes: qcNotes,
          qc_certified_by: currentUser?.name || 'Rajesh Sharma (Fleet Mgr)'
        })
      });
      if (res.ok) {
        setDrones((prev) =>
          prev.map((d) =>
            d.id === selectedDroneForQc.id
              ? {
                  ...d,
                  qc_status: 'passed',
                  qc_notes: qcNotes,
                  qc_certified_by: currentUser?.name || 'Fleet Manager'
                }
              : d
          )
        );
        setSelectedDroneForQc(null);
      }
    } catch (err) {
      console.error('QC error:', err);
    } finally {
      setSubmittingQc(false);
    }
  };

  const handleRegisterDrone = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingDrone(true);
    try {
      const serialNum = `IW-${newModel.substring(0, 3).toUpperCase()}-2026-${Math.floor(100 + Math.random() * 900)}`;
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: newModel,
          current_city: newStation,
          payload_capacity_kg: 5.0,
          serial_number: serialNum,
          qc_status: 'pending'
        })
      });
      if (res.ok) {
        setShowAddDrone(false);
        fetchFleet();
      }
    } catch (err) {
      console.error('Add drone error:', err);
    } finally {
      setAddingDrone(false);
    }
  };

  const filteredDrones = drones.filter((d) => {
    const matchesSearch =
      (d.model || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.serial_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.id || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesQc = qcFilter === 'all' || d.qc_status === qcFilter;
    return matchesSearch && matchesQc;
  });

  const passedCount = drones.filter((d) => d.qc_status === 'passed').length;
  const pendingCount = drones.filter((d) => d.qc_status !== 'passed').length;

  const allChecksPassed = Object.values(qcChecks).every(Boolean);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12 flex-1 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-black text-xl border border-amber-500/20"></div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Fleet & Asset Command</h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Fleet Manager</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Drone Hardware Inventory, Pre-Delivery QC & Airworthiness Certification</p>
            </div>
          </div>
          <button
            onClick={fetchFleet}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Fleet</span>
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-400">Total Drone Fleet Units</span>
              <Cpu className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-black text-slate-900">{drones.length}</p>
            <p className="text-xs text-slate-500 mt-1">Assembled & Registered Hardware</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-400">QC Certified For Delivery</span>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-black text-emerald-600">{passedCount}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Ready for Dispatcher Assignment</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-400">QC Pending / Inspection</span>
              <Wrench className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-black text-amber-600">{pendingCount}</p>
            <p className="text-xs text-amber-600 font-medium mt-1">Requires Technical Clearance</p>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Drone Hardware Asset Registry</h2>
            <p className="text-xs text-slate-500">Inspect physical drone units, certify avionics, and approve for client delivery</p>
          </div>

          <button
            onClick={() => setShowAddDrone(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#ef7f1a] hover:bg-[#d96e11] text-white font-bold text-sm shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Drone Unit</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Drone Model, Serial Number, or UAV ID..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={qcFilter}
              onChange={(e) => setQcFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All QC Statuses</option>
              <option value="passed">Certified Passed Only</option>
              <option value="pending">Pending Clearance</option>
            </select>
          </div>
        </div>

        {/* Drone Hardware Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrones.map((d) => {
            const isPassed = d.qc_status === 'passed';
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">{d.model}</h4>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{d.serial_number || d.id}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
                    >
                      {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      <span>{isPassed ? 'Ready For Delivery' : 'QC Pending'}</span>
                    </span>
                  </div>

                  <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Location Base:</span>
                      <span className="font-bold text-slate-800">{d.current_city}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Battery Capacity:</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Battery className={`w-3.5 h-3.5 ${d.battery > 50 ? 'text-emerald-500' : 'text-amber-500'}`} />
                        {d.battery}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Avionics Speed:</span>
                      <span className="font-bold text-slate-800">{d.speed_kmh} km/h</span>
                    </div>
                  </div>

                  {d.qc_notes && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                      <strong>QC Note:</strong> {d.qc_notes}
                      {d.qc_certified_by && <p className="text-[10px] text-slate-400 mt-1">Certified by: {d.qc_certified_by}</p>}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openQcModal(d)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      isPassed ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    }`}
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>{isPassed ? 'Review QC Certificate' : 'Perform QC & Certify'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* QC Clearance Modal */}
      {selectedDroneForQc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Pre-Delivery QC Clearance Checklist</h3>
                <p className="text-xs text-slate-500">
                  Unit: {selectedDroneForQc.model} · {selectedDroneForQc.serial_number || selectedDroneForQc.id}
                </p>
              </div>
              <button onClick={() => setSelectedDroneForQc(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-5">
              {[
                { key: 'avionics', label: 'Dual-Redundant Autopilot & GPS Avionics Test' },
                { key: 'battery', label: 'Battery Cell Impedance & Discharge Cycle (>90% Health)' },
                { key: 'dgca', label: 'DGCA Compliant NPNT Chip & Airworthiness ID Verified' },
                { key: 'payload', label: 'Optical / Thermal Payload Gimbal Calibration' },
                { key: 'parachute', label: 'Autonomous Parachute Safety Deployment System Checked' }
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={(qcChecks as any)[item.key]}
                    onChange={(e) => setQcChecks({ ...qcChecks, [item.key]: e.target.checked })}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Certification Notes / Remarks</label>
              <textarea
                value={qcNotes}
                onChange={(e) => setQcNotes(e.target.value)}
                rows={2}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button type="button" onClick={() => setSelectedDroneForQc(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
                Close
              </button>
              <button
                type="button"
                disabled={!allChecksPassed || submittingQc}
                onClick={handlePassQc}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submittingQc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                <span>{submittingQc ? 'Certifying...' : 'Certify & Approve For Delivery'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register New Drone Modal */}
      {showAddDrone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
            <h3 className="font-extrabold text-slate-900 text-lg mb-1">Register New Drone Hardware</h3>
            <p className="text-xs text-slate-500 mb-5">Enter manufactured unit details into the assembly registry</p>

            <form onSubmit={handleRegisterDrone} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Drone Model</label>
                <select
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#ef7f1a]"
                >
                  <option value="700RPAV">700RPAV (Type-Certified Tactical / Precision Payload)</option>
                  <option value="IndoHawk Alpha">IndoHawk Alpha (High-Altitude Tactical)</option>
                  <option value="StealthPro VTOL">StealthPro VTOL (Long Endurance Survey)</option>
                  <option value="AgriWing X">AgriWing X (Industrial Agriculture & Spraying)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Manufacturing / Assembly Hub</label>
                <input
                  type="text"
                  value={newStation}
                  onChange={(e) => setNewStation(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#ef7f1a]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button type="button" onClick={() => setShowAddDrone(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDrone}
                  className="px-6 py-2 rounded-xl bg-[#ef7f1a] hover:bg-[#d96e11] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {addingDrone ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{addingDrone ? 'Registering...' : 'Add to Registry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
