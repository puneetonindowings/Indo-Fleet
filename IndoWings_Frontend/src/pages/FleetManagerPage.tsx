import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Search,
  Plus,
  Wrench,
  Check,
  Loader2,
  ArrowRight,
  Eye,
  User,
  LogOut,
  Plane,
  Activity,
  Layers,
  ChevronRight,
  X,
  Gauge,
  Trash2,
  Headphones,
  Send,
  Boxes,
  ImageIcon,
  ShoppingBag,
  Truck,
  AlertCircle,
  Copy,
  ExternalLink,
  Menu,
  MapPin,
  Smartphone
} from 'lucide-react';
import { DeliveryUser } from '../types';
import { API_BASE_URL } from '../config/api';
import { ProfilePage } from './ProfilePage';
import { DroneDispatchModule } from './DroneDispatchModule';
import { SupportDeskPage } from './SupportDeskPage';
import { AppReleaseConsole } from '../components/AppReleaseConsole';

interface FleetManagerPageProps {
  currentUser: DeliveryUser | null;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onUpdateUser?: (user: DeliveryUser) => void;
}

export const FleetManagerPage: React.FC<FleetManagerPageProps> = ({
  currentUser,
  onNavigate,
  onLogout,
  onUpdateUser
}) => {
  // Navigation & View Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'dispatch' | 'support' | 'maintenance' | 'profile' | 'app-release'>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data State
  const [drones, setDrones] = useState<any[]>([]);
  const [pilots, setPilots] = useState<any[]>([]);
  const [dispatchOrders, setDispatchOrders] = useState<any[]>([]);
  const [supportStats, setSupportStats] = useState<{ total: number; pending: number }>({ total: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Inventory Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [droneCurrentPage, setDroneCurrentPage] = useState(1);
  const [dronePageSize, setDronePageSize] = useState(25);

  // Single Drone Modal State
  const [showAddSingleDrone, setShowAddSingleDrone] = useState(false);
  const [newDroneModel, setNewDroneModel] = useState('700RPAV');
  const [newDroneId, setNewDroneId] = useState('');
  const [newDroneSerial, setNewDroneSerial] = useState('');
  const [newDroneCategory, setNewDroneCategory] = useState('General UAV');
  const [newDroneIsVerified, setNewDroneIsVerified] = useState(false);
  const [newDroneImage, setNewDroneImage] = useState('');
  const [addDroneError, setAddDroneError] = useState('');
  const [addingDrone, setAddingDrone] = useState(false);

  // Edit Drone Modal State
  const [editingDrone, setEditingDrone] = useState<any | null>(null);
  const [editingDroneModel, setEditingDroneModel] = useState('700RPAV');
  const [editingDroneSerial, setEditingDroneSerial] = useState('');
  const [editingDroneCategory, setEditingDroneCategory] = useState('');
  const [editingDroneIsVerified, setEditingDroneIsVerified] = useState(false);
  const [editingDroneImage, setEditingDroneImage] = useState('');
  const [editDroneError, setEditDroneError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Bulk Batch Drone Modal State
  const [showBulkDroneModal, setShowBulkDroneModal] = useState(false);
  const [bulkCount, setBulkCount] = useState(50);
  const [bulkModel, setBulkModel] = useState('700RPAV');
  const [bulkCategory, setBulkCategory] = useState('General UAV');
  const [bulkPrefix, setBulkPrefix] = useState('INW-700RPAV');
  const [bulkIsVerified, setBulkIsVerified] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkImportError, setBulkImportError] = useState('');

  // Delete Drone Modal State
  const [deletingDrone, setDeletingDrone] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reserved Drone Order View Modal
  const [selectedReservedDrone, setSelectedReservedDrone] = useState<any | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('iw_delivery_token') || ''}`
  });

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  // Image Helper for Photo upload
  const readDroneImage = (file: File, setImage: (img: string) => void) => {
    if (!file.type.startsWith('image/')) {
      alert('Please choose a valid image file.');
      return;
    }
    if (file.size > 1_500_000) {
      alert('Image file must be smaller than 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  // Fetch Central Fleet & Orders Data
  const fetchFleet = async () => {
    try {
      setRefreshing(true);
      const [dronesRes, pilotsRes, ordersRes, ticketsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/delivery/drones`),
        fetch(`${API_BASE_URL}/api/delivery/delivery-agents`, { headers: getHeaders() }).catch(() => null),
        fetch(`${API_BASE_URL}/api/delivery/orders`, { headers: getHeaders() }).catch(() => null),
        fetch(`${API_BASE_URL}/api/delivery/support-tickets`, { headers: getHeaders() }).catch(() => null)
      ]);

      if (dronesRes.ok) {
        const data = await dronesRes.json();
        setDrones(data.drones || []);
      }

      if (pilotsRes && pilotsRes.ok) {
        const pilotsData = await pilotsRes.json();
        setPilots(pilotsData.agents || pilotsData.delivery_agents || []);
      }

      if (ordersRes && ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setDispatchOrders(ordersData.orders || []);
      }

      if (ticketsRes && ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        const tList = ticketsData.tickets || [];
        setSupportStats({
          total: tList.length,
          pending: tList.filter((t: any) => t.status !== 'resolved' && t.status !== 'closed').length
        });
      }
    } catch (err) {
      console.error('Error fetching fleet command data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  // Helper to find linked order for drone
  const getLinkedOrderForDrone = (drone: any) => {
    if (!drone) return null;
    const assignedId = drone.assigned_order || drone.delivery_data?.assigned_order;
    if (assignedId) {
      const byId = dispatchOrders.find((o) => o.id === assignedId);
      if (byId) return byId;
    }
    const byReservedList = dispatchOrders.find(
      (o) => Array.isArray(o.reserved_inventory_ids) && o.reserved_inventory_ids.includes(drone.id)
    );
    if (byReservedList) return byReservedList;
    return null;
  };

  // Add Single Drone
  const handleAddSingleDrone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDroneId.trim()) {
      setAddDroneError('Drone ID is required.');
      return;
    }
    setAddingDrone(true);
    setAddDroneError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          id: newDroneId.trim(),
          model: newDroneModel.trim() || '700RPAV',
          serial_number: newDroneSerial.trim() || newDroneId.trim(),
          category: newDroneCategory.trim() || 'General UAV',
          image_url: newDroneImage,
          is_verified: newDroneIsVerified,
          verification_status: newDroneIsVerified ? 'verified' : 'unverified',
          current_city: 'Noida Sector 62 Facility',
          status: 'idle',
          qc_status: 'passed'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddSingleDrone(false);
        setNewDroneId('');
        setNewDroneSerial('');
        setNewDroneCategory('General UAV');
        setNewDroneImage('');
        setNewDroneIsVerified(false);
        showToast(`Drone ${data.drone?.id || newDroneId} added to inventory!`);
        await fetchFleet();
      } else {
        setAddDroneError(data.error || 'Could not add drone.');
      }
    } catch {
      setAddDroneError('Connection error adding drone.');
    } finally {
      setAddingDrone(false);
    }
  };

  // Open Edit Modal
  const openEditDroneModal = (drone: any) => {
    setEditingDrone(drone);
    setEditingDroneModel(drone.model || '700RPAV');
    setEditingDroneSerial(drone.serial_number || drone.id || '');
    setEditingDroneCategory(drone.category || 'General UAV');
    setEditingDroneIsVerified(drone.is_verified === true || drone.verification_status === 'verified');
    setEditingDroneImage(drone.image_url || '');
    setEditDroneError('');
  };

  // Save Drone Edit
  const handleSaveDroneEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDrone) return;
    setSavingEdit(true);
    setEditDroneError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones/${encodeURIComponent(editingDrone.id)}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          model: editingDroneModel.trim() || '700RPAV',
          serial_number: editingDroneSerial.trim() || editingDrone.id,
          category: editingDroneCategory.trim() || 'General UAV',
          image_url: editingDroneImage,
          is_verified: editingDroneIsVerified,
          verification_status: editingDroneIsVerified ? 'verified' : 'unverified'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingDrone(null);
        showToast(`Drone ${data.drone?.id || editingDrone.id} updated in database.`);
        await fetchFleet();
      } else {
        setEditDroneError(data.error || 'Could not save drone changes.');
      }
    } catch {
      setEditDroneError('Connection error saving drone changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Bulk Add Drones (50 to 1000+)
  const handleBulkAddDrones = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkCount < 1) {
      setBulkImportError('Please specify at least 1 unit.');
      return;
    }
    setBulkSubmitting(true);
    setBulkImportError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones/bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          count: bulkCount,
          model: bulkModel || '700RPAV',
          category: bulkCategory || 'General UAV',
          prefix: bulkPrefix || 'INW-700RPAV',
          current_city: 'Noida Sector 62 Facility',
          is_verified: bulkIsVerified
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowBulkDroneModal(false);
        showToast(`Successfully provisioned batch of ${data.count || bulkCount} drones!`);
        await fetchFleet();
      } else {
        setBulkImportError(data.error || 'Could not provision drone batch.');
      }
    } catch (err: any) {
      setBulkImportError(err.message || 'Error executing bulk batch provisioning.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Toggle Drone Maintenance (1-Click)
  const handleToggleDroneMaintenance = async (drone: any) => {
    const isMaintenance = drone.status === 'maintenance';
    const nextStatus = isMaintenance ? 'idle' : 'maintenance';
    const nextQc = isMaintenance ? 'passed' : 'pending';
    const nextNotes = isMaintenance ? 'Maintenance completed and marked ready' : 'Under scheduled technical maintenance';

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones/${encodeURIComponent(drone.id)}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          model: drone.model || '700RPAV',
          status: nextStatus,
          qc_status: nextQc,
          qc_notes: nextNotes
        })
      });

      if (res.ok) {
        showToast(
          isMaintenance
            ? `Drone ${drone.id} maintenance cleared & returned to stock.`
            : `Drone ${drone.id} marked under maintenance (excluded from customer store).`
        );
        await fetchFleet();
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to update maintenance status');
      }
    } catch (err) {
      console.error('Toggle maintenance error:', err);
    }
  };

  // Delete Drone
  const handleDeleteDrone = async () => {
    if (!deletingDrone) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones/${encodeURIComponent(deletingDrone.id)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (res.ok) {
        setDrones((prev) => prev.filter((d) => d.id !== deletingDrone.id));
        setDeletingDrone(null);
        showToast(`Drone ${deletingDrone.id} decommissioned and removed.`);
      } else {
        const d = await res.json();
        showToast(d.error || 'Could not delete drone');
      }
    } catch (err) {
      console.error('Delete drone error:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Drones
  const filteredDrones = useMemo(() => {
    return drones.filter((d) => {
      const matchesSearch =
        (d.model || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.serial_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.category || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'maintenance' && d.status === 'maintenance') ||
        (statusFilter === 'idle' && (d.status === 'idle' || !d.status)) ||
        (statusFilter === 'in-flight' && (d.status === 'in-flight' || d.status === 'dispatched'));

      const isVerified = d.is_verified === true || d.verification_status === 'verified';
      const matchesVerification =
        verificationFilter === 'all' ||
        (verificationFilter === 'verified' && isVerified) ||
        (verificationFilter === 'unverified' && !isVerified);

      return matchesSearch && matchesStatus && matchesVerification;
    });
  }, [drones, searchQuery, statusFilter, verificationFilter]);

  // Paginated Drones
  const paginatedDrones = useMemo(() => {
    const startIndex = (droneCurrentPage - 1) * dronePageSize;
    return filteredDrones.slice(startIndex, startIndex + dronePageSize);
  }, [filteredDrones, droneCurrentPage, dronePageSize]);

  const totalDronePages = Math.ceil(filteredDrones.length / dronePageSize) || 1;

  // Metrics
  const totalUnits = drones.length;
  const maintenanceUnits = drones.filter((d) => d.status === 'maintenance').length;
  const verifiedUnits = drones.filter((d) => d.is_verified === true || d.verification_status === 'verified').length;
  const unverifiedUnits = totalUnits - verifiedUnits;
  const inFlightUnits = drones.filter((d) => d.status === 'in-flight' || d.status === 'dispatched').length;
  const idleUnits = drones.filter((d) => (d.status === 'idle' || !d.status) && d.status !== 'maintenance').length;
  const readinessRate = totalUnits > 0 ? Math.round(((totalUnits - maintenanceUnits) / totalUnits) * 100) : 0;

  const fleetNavItems = [
    { id: 'overview', label: 'Overview', icon: Gauge, badge: null },
    { id: 'inventory', label: 'Inventory', icon: Boxes, badge: totalUnits },
    { id: 'dispatch', label: 'Dispatch', icon: Send, badge: dispatchOrders.length > 0 ? dispatchOrders.length : null },
    { id: 'support', label: 'Support', icon: Headphones, badge: supportStats.pending > 0 ? supportStats.pending : null },
    { id: 'maintenance', label: 'Under Maintenance', icon: Wrench, badge: maintenanceUnits > 0 ? maintenanceUnits : null },
    { id: 'app-release', label: 'Mobile App Release', icon: Smartphone, badge: 'APK' }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pt-24 sm:pt-28 pb-16 font-sans">
      {/* Toast Notification Alert */}
      {actionSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#5a00b8] text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{actionSuccess}</span>
        </div>
      )}

      {/* ── MOBILE SLIDE-OVER DRAWER ─────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />

          <div className="relative w-[85vw] max-w-[320px] bg-white h-full shadow-2xl flex flex-col justify-between p-5 z-10 animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-black shrink-0">
                    <Gauge className="w-4 h-4 text-[#5a00b8]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">Fleet Command Desk</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">IndoFleet Operations</p>
                  </div>
                </div>

                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5 text-xs font-bold">
                {fleetNavItems.map(({ id, label, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTab(id as typeof activeTab);
                      setMobileSidebarOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all text-left cursor-pointer group ${
                      activeTab === id
                        ? 'bg-[#5a00b8] text-white shadow-md shadow-slate-900/10 font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                          activeTab === id ? 'text-white' : 'text-slate-400 group-hover:text-[#5a00b8]'
                        }`}
                      />
                      <span className="truncate">{label}</span>
                    </div>
                    {badge !== null && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 ${
                          activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setMobileSidebarOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-purple-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-purple-700" />
                    My Profile
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Fleet Health Index</span>
                  <span className="font-black text-[#5a00b8]">{readinessRate}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-purple-200/50 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${readinessRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1 font-medium">
                  <span>{totalUnits - maintenanceUnits} Available</span>
                  <span>{maintenanceUnits} In Maint.</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-6">
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setMobileSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2.5 min-w-0 text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5a00b8] to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {currentUser?.name?.[0]?.toUpperCase() || 'F'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || 'Fleet Manager'}</p>
                  <p className="text-[10px] text-purple-700 font-semibold truncate">Fleet Manager</p>
                </div>
              </button>

              <button
                onClick={onLogout}
                title="Logout"
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN WORKSPACE CONTAINER WITH STICKY SIDEBAR ────────────────── */}
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* LEFT SIDEBAR: STICKY ON DESKTOP */}
          <aside className="hidden md:block w-60 lg:w-64 xl:w-72 shrink-0 md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-6.5rem)] md:overflow-y-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-black shadow-xs shrink-0">
                  <Gauge className="w-5 h-5 text-[#5a00b8]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">Fleet Command Desk</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">IndoFleet Operations</p>
                </div>
              </div>

              <nav className="space-y-1.5 text-xs font-bold">
                {fleetNavItems.map(({ id, label, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as typeof activeTab)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all text-left cursor-pointer group ${
                      activeTab === id
                        ? 'bg-[#5a00b8] text-white shadow-md shadow-slate-900/10 font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                          activeTab === id ? 'text-white' : 'text-slate-400 group-hover:text-[#5a00b8]'
                        }`}
                      />
                      <span className="truncate">{label}</span>
                    </div>
                    {badge !== null && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 ${
                          activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              <div className="p-3.5 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Live Stock &amp; Orders</span>
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600">Stock Availability</span>
                    <span className="text-emerald-700 font-bold">{idleUnits} / {totalUnits} Units</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${readinessRate}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-purple-100/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Active Consignments:</span>
                  <span className="font-bold text-[#5a00b8]">{dispatchOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length} Orders</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-purple-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-purple-700" />
                    My Profile
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-2.5 min-w-0 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5a00b8] to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    {currentUser?.name?.[0]?.toUpperCase() || 'F'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || 'Fleet Manager'}</p>
                    <p className="text-[10px] text-purple-700 font-semibold truncate">Fleet Manager</p>
                  </div>
                </button>

                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>

          {/* RIGHT WORKSPACE AREA */}
          <main className="flex-1 w-full min-w-0">
            {/* Top Workspace Bar */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 mb-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Fleet Command Portal</span>
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Centralized Drone Hardware Inventory, Technical Maintenance, Dispatch &amp; Road Logistics Operations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={fetchFleet}
                  disabled={refreshing}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-[#5a00b8] transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh Live Data"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* ── SECTION 1: HARDWARE & ORDER KPI METRICS ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  <div
                    onClick={() => setActiveTab('inventory')}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between cursor-pointer hover:border-purple-300 transition-all group"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Inventory</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">{totalUnits}</h4>
                      <p className="text-[10px] text-purple-700 font-semibold mt-0.5">Central Hardware Units</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                      <Boxes className="w-6 h-6" />
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('inventory')}
                    className="bg-white border border-emerald-200 hover:border-emerald-300 bg-emerald-50/20 rounded-2xl p-4 shadow-xs flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Available In-Stock</p>
                      <h4 className="text-2xl font-black text-emerald-800 mt-1">{idleUnits}</h4>
                      <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Ready for Dispatch &amp; Sale</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('dispatch')}
                    className="bg-white border border-blue-200 hover:border-blue-300 bg-blue-50/20 rounded-2xl p-4 shadow-xs flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Out for Delivery</p>
                      <h4 className="text-2xl font-black text-blue-800 mt-1">{inFlightUnits}</h4>
                      <p className="text-[10px] text-blue-600 font-medium mt-0.5">In Transit by Road</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                      <Truck className="w-6 h-6" />
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('dispatch')}
                    className="bg-white border border-indigo-200 hover:border-indigo-300 bg-indigo-50/20 rounded-2xl p-4 shadow-xs flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Total Orders</p>
                      <h4 className="text-2xl font-black text-indigo-900 mt-1">{dispatchOrders.length}</h4>
                      <p className="text-[10px] text-indigo-600 font-medium mt-0.5">
                        {dispatchOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length} Active Consignments
                      </p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('maintenance')}
                    className="bg-white border border-amber-200 hover:border-amber-300 bg-amber-50/20 rounded-2xl p-4 shadow-xs flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Under Maintenance</p>
                      <h4 className="text-2xl font-black text-amber-800 mt-1">{maintenanceUnits}</h4>
                      <p className="text-[10px] text-amber-600 font-medium mt-0.5">Excluded from Store</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                      <Wrench className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* ── SECTION 2: VISUAL ANALYTICS CHARTS & ORDER BREAKDOWN ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Order Status Breakdown Chart */}
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                          <Activity className="w-5 h-5 text-[#5a00b8]" />
                          <span>Orders &amp; Consignment Status Breakdown</span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Real-time status distribution across all client consignments</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#5a00b8] bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                        {dispatchOrders.length} Total Bookings
                      </span>
                    </div>

                    {/* Progress Bars Graph */}
                    <div className="space-y-4 pt-1">
                      {/* Bar 1: Out for Delivery */}
                      <div>
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                          <span className="text-blue-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                            Out for Delivery / In Transit
                          </span>
                          <span className="font-mono text-slate-800">
                            {dispatchOrders.filter((o) => ['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(o.status)).length} Orders (
                            {dispatchOrders.length > 0
                              ? Math.round(
                                  (dispatchOrders.filter((o) => ['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(o.status)).length /
                                    dispatchOrders.length) *
                                    100
                                )
                              : 0}
                            %)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                dispatchOrders.length > 0
                                  ? (dispatchOrders.filter((o) => ['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(o.status)).length /
                                      dispatchOrders.length) *
                                    100
                                  : 0
                              }%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Bar 2: Delivered & Completed */}
                      <div>
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                          <span className="text-emerald-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            Successfully Delivered
                          </span>
                          <span className="font-mono text-slate-800">
                            {dispatchOrders.filter((o) => o.status === 'delivered').length} Orders (
                            {dispatchOrders.length > 0
                              ? Math.round((dispatchOrders.filter((o) => o.status === 'delivered').length / dispatchOrders.length) * 100)
                              : 0}
                            %)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                dispatchOrders.length > 0
                                  ? (dispatchOrders.filter((o) => o.status === 'delivered').length / dispatchOrders.length) * 100
                                  : 0
                              }%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Bar 3: Pending Dispatch Assignment */}
                      <div>
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                          <span className="text-purple-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                            Awaiting Dispatch / Partner Assignment
                          </span>
                          <span className="font-mono text-slate-800">
                            {dispatchOrders.filter((o) => o.status === 'pending' || o.status === 'assigned').length} Orders (
                            {dispatchOrders.length > 0
                              ? Math.round((dispatchOrders.filter((o) => o.status === 'pending' || o.status === 'assigned').length / dispatchOrders.length) * 100)
                              : 0}
                            %)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-purple-500 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                dispatchOrders.length > 0
                                  ? (dispatchOrders.filter((o) => o.status === 'pending' || o.status === 'assigned').length / dispatchOrders.length) * 100
                                  : 0
                              }%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Bar 4: On Hold / Paused */}
                      <div>
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                          <span className="text-amber-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                            On Hold / Delivery Paused
                          </span>
                          <span className="font-mono text-slate-800">
                            {dispatchOrders.filter((o) => o.status === 'on-hold').length} Orders (
                            {dispatchOrders.length > 0
                              ? Math.round((dispatchOrders.filter((o) => o.status === 'on-hold').length / dispatchOrders.length) * 100)
                              : 0}
                            %)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                dispatchOrders.length > 0
                                  ? (dispatchOrders.filter((o) => o.status === 'on-hold').length / dispatchOrders.length) * 100
                                  : 0
                              }%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Consignment Fulfillment Health Card */}
                  <div className="bg-[#171222] text-white rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 block">Fulfillment Health</span>
                      <h3 className="text-2xl font-black tracking-tight text-white">Consignment Operations</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Track overall order velocity, active partner assignments, and delivery completion rate across central inventory.
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="p-3.5 bg-white/10 rounded-2xl border border-white/10 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-200">Active Consignments:</span>
                        <span className="font-mono font-black text-emerald-400 text-sm">
                          {dispatchOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length} Orders
                        </span>
                      </div>

                      <div className="p-3.5 bg-white/10 rounded-2xl border border-white/10 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-200">Completion Rate:</span>
                        <span className="font-mono font-black text-purple-300 text-sm">
                          {dispatchOrders.length > 0
                            ? Math.round((dispatchOrders.filter((o) => o.status === 'delivered').length / dispatchOrders.length) * 100)
                            : 100}
                          %
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('dispatch')}
                      className="w-full py-3 rounded-2xl bg-[#5a00b8] hover:bg-[#6c00db] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>Manage Dispatch Workbench</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── SECTION 3: LIVE RECENT CONSIGNMENTS & INVENTORY ACTIONS ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Recent Consignments Orders Feed */}
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-purple-600" />
                          <span>Recent Consignment Orders</span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Live customer bookings and assigned delivery partner status</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('dispatch')}
                        className="text-xs font-bold text-[#5a00b8] hover:underline cursor-pointer"
                      >
                        View All Orders &rarr;
                      </button>
                    </div>

                    <div className="space-y-3">
                      {dispatchOrders.slice(0, 4).map((ord) => (
                        <div key={ord.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 text-sm">#{ord.order_number || ord.id.slice(0, 8)}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                ord.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ['in-flight', 'taking-off', 'approaching', 'out-for-delivery', 'in-transit'].includes(ord.status)
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}>
                                {ord.status === 'in-flight' ? 'Out for Delivery' : ord.status}
                              </span>
                            </div>
                            <p className="text-slate-600 font-medium">
                              Customer: <strong className="text-slate-900">{ord.customer_name || 'Anonymous Client'}</strong> &bull; {ord.drone_model || '700RPAV'}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-500" />
                              <span className="truncate max-w-[280px]">{ord.drop_address || ord.destination_address || 'Destination specified'}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <button
                              onClick={() => {
                                onNavigate('track');
                                window.history.pushState({}, '', `/track?id=${ord.id}`);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-purple-50 text-[#5a00b8] hover:bg-purple-100 font-bold text-xs transition-colors cursor-pointer border border-purple-200"
                            >
                              Track Live
                            </button>
                          </div>
                        </div>
                      ))}

                      {dispatchOrders.length === 0 && (
                        <div className="p-8 text-center text-xs text-slate-400">
                          No active consignment orders found in system.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inventory Quick Controls & Maintenance */}
                  <div className="space-y-6">
                    {/* Inventory Quick Controls */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-black text-slate-900 text-base">Inventory Controls</h3>
                          <p className="text-xs text-slate-500">Provision drone units</p>
                        </div>
                        <button
                          onClick={() => setActiveTab('inventory')}
                          className="text-xs font-bold text-[#5a00b8] hover:underline cursor-pointer"
                        >
                          Inventory &rarr;
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 pt-1">
                        <button
                          onClick={() => {
                            setShowAddSingleDrone(true);
                            setNewDroneModel('700RPAV');
                            setNewDroneId('');
                            setNewDroneSerial('');
                            setNewDroneCategory('General UAV');
                            setNewDroneIsVerified(false);
                            setNewDroneImage('');
                            setAddDroneError('');
                          }}
                          className="p-3.5 rounded-2xl bg-purple-50 hover:bg-purple-100/80 border border-purple-100 text-left transition-all cursor-pointer group flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-xl bg-white text-[#5a00b8] flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform shrink-0">
                            <Plus className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-900">+1 Single Drone</h4>
                            <p className="text-[10px] text-slate-500">Register Model &amp; Serial</p>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setShowBulkDroneModal(true);
                            setBulkCount(50);
                            setBulkModel('700RPAV');
                            setBulkCategory('General UAV');
                            setBulkPrefix('INW-700RPAV');
                            setBulkIsVerified(false);
                            setBulkImportError('');
                          }}
                          className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-left transition-all cursor-pointer group flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-xl bg-white text-slate-700 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-slate-900">Bulk Batch Add</h4>
                            <p className="text-[10px] text-slate-500">Provision batch preset</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Under Maintenance Mini Box */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                          <Wrench className="w-3.5 h-3.5 text-amber-600" />
                          <span>Maintenance ({maintenanceUnits})</span>
                        </h4>
                        <button
                          onClick={() => setActiveTab('maintenance')}
                          className="text-[11px] font-bold text-[#5a00b8] hover:underline cursor-pointer"
                        >
                          View All
                        </button>
                      </div>

                      {maintenanceUnits === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                          <p className="font-bold text-emerald-800">Zero Maintenance Backlog</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {drones.filter((d) => d.status === 'maintenance').slice(0, 2).map((drone) => (
                            <div key={drone.id} className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-800">{drone.id}</span>
                              <button
                                onClick={() => handleToggleDroneMaintenance(drone)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px]"
                              >
                                Mark Ready
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: INVENTORY (Admin Standard Reference) */}
            {activeTab === 'inventory' && (
              <div className="space-y-6">
                {/* Header Actions */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-50 text-[#5a00b8] border border-purple-100 mb-2">
                      <Boxes className="w-3.5 h-3.5 text-[#5a00b8]" />
                      Fleet Inventory
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Drone Inventory ({totalUnits} Units)</h2>
                    <p className="text-xs text-slate-500 mt-1">Manage Drone IDs, verify physical hardware serials, add new drones, or toggle maintenance status.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => {
                        setShowAddSingleDrone(true);
                        setNewDroneModel('700RPAV');
                        setNewDroneId('');
                        setNewDroneSerial('');
                        setNewDroneCategory('General UAV');
                        setNewDroneIsVerified(false);
                        setNewDroneImage('');
                        setAddDroneError('');
                      }}
                      className="px-3.5 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+1 Single Drone</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowBulkDroneModal(true);
                        setBulkCount(50);
                        setBulkModel('700RPAV');
                        setBulkCategory('General UAV');
                        setBulkPrefix('INW-700RPAV');
                        setBulkIsVerified(false);
                        setBulkImportError('');
                      }}
                      className="px-4 py-2.5 rounded-2xl bg-[#5a00b8] hover:bg-[#2e0066] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Bulk Batch Add</span>
                    </button>
                  </div>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setDroneCurrentPage(1);
                      }}
                      placeholder="Search by Drone ID, Serial, Model Name, or Category..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#5a00b8]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setDroneCurrentPage(1);
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="all">All Statuses ({totalUnits})</option>
                      <option value="idle">Ready / In Stock ({idleUnits})</option>
                      <option value="maintenance">Under Maintenance ({maintenanceUnits})</option>
                      <option value="in-flight">Out for Delivery / In Transit ({inFlightUnits})</option>
                    </select>

                    <select
                      value={verificationFilter}
                      onChange={(e) => {
                        setVerificationFilter(e.target.value);
                        setDroneCurrentPage(1);
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="all">All ID Verifications</option>
                      <option value="verified">Verified IDs ({verifiedUnits})</option>
                      <option value="unverified">Unverified IDs ({unverifiedUnits})</option>
                    </select>
                  </div>
                </div>

                {/* Inventory Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                          <th className="py-3 px-4">Photo</th>
                          <th className="py-3 px-4">Drone ID &amp; Serial</th>
                          <th className="py-3 px-4">Model Name</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Status &amp; Reservation</th>
                          <th className="py-3 px-4">ID Verification</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedDrones.map((d) => {
                          const isVerified = d.is_verified === true || d.verification_status === 'verified';
                          const linked = getLinkedOrderForDrone(d);
                          const isReserved =
                            d.status !== 'maintenance' &&
                            (d.status === 'reserved' || Boolean(linked) || Boolean(d.assigned_order) || Boolean(d.delivery_data?.assigned_order));

                          return (
                            <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4">
                                {d.image_url ? (
                                  <img src={d.image_url} alt={d.model} className="h-10 w-14 rounded-lg object-cover border border-slate-200" />
                                ) : (
                                  <div className="h-10 w-14 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200">
                                    <ImageIcon className="h-4 w-4" />
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-mono font-bold text-slate-900">{d.id}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{d.serial_number || d.id}</p>
                              </td>
                              <td className="py-3 px-4 font-bold text-[#5a00b8]">{d.model}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px]">
                                  {d.category || 'General UAV'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {d.status === 'maintenance' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                    <Wrench className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>Under Maintenance</span>
                                  </span>
                                ) : isReserved ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReservedDrone(d)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer shadow-2xs group"
                                  >
                                    <ShoppingBag className="w-3 h-3 text-purple-600 shrink-0" />
                                    <span>Reserved: <strong className="font-mono">{linked?.id || d.assigned_order || 'Booking'}</strong></span>
                                    <Eye className="w-3 h-3 text-purple-400 group-hover:text-purple-700 shrink-0" />
                                  </button>
                                ) : d.status === 'en-route' || d.status === 'in-flight' || d.status === 'dispatched' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                    <Truck className="w-3 h-3 text-blue-600" />
                                    Dispatched
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    In Stock (Idle)
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {isVerified ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Verified ID
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                    Unverified ID
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isReserved && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedReservedDrone(d)}
                                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>View Order</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDroneMaintenance(d)}
                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                                      d.status === 'maintenance'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                    }`}
                                    title={d.status === 'maintenance' ? 'Clear maintenance and restore to stock' : 'Mark under technical maintenance'}
                                  >
                                    <Wrench className="w-3 h-3" />
                                    <span>{d.status === 'maintenance' ? 'Clear Maint.' : 'Set Maint.'}</span>
                                  </button>
                                  <button
                                    onClick={() => openEditDroneModal(d)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 hover:bg-purple-50 hover:text-[#5a00b8] hover:border-purple-200 transition-colors cursor-pointer"
                                  >
                                    Edit Details
                                  </button>
                                  <button
                                    onClick={() => setDeletingDrone(d)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Decommission Drone"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredDrones.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400">
                              <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                              <p className="text-sm font-semibold">No drones match your search or filter.</p>
                              <p className="text-xs text-slate-400 mt-0.5">Click "+1 Single Drone" or "Bulk Batch Add" to populate inventory.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {filteredDrones.length > 0 && (
                    <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <div className="text-slate-500 font-semibold">
                        Showing <span className="font-bold text-slate-900">{(droneCurrentPage - 1) * dronePageSize + 1}</span> to{' '}
                        <span className="font-bold text-slate-900">{Math.min(droneCurrentPage * dronePageSize, filteredDrones.length)}</span> of{' '}
                        <span className="font-bold text-slate-900">{filteredDrones.length}</span> UAV units
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={dronePageSize}
                          onChange={(e) => {
                            setDronePageSize(Number(e.target.value));
                            setDroneCurrentPage(1);
                          }}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                        >
                          <option value={25}>25 per page</option>
                          <option value={50}>50 per page</option>
                          <option value={100}>100 per page</option>
                          <option value={250}>250 per page</option>
                        </select>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={droneCurrentPage === 1}
                            onClick={() => setDroneCurrentPage((p) => Math.max(1, p - 1))}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                          >
                            Prev
                          </button>
                          <span className="px-2 font-bold text-slate-700">
                            {droneCurrentPage} / {totalDronePages}
                          </span>
                          <button
                            type="button"
                            disabled={droneCurrentPage >= totalDronePages}
                            onClick={() => setDroneCurrentPage((p) => Math.min(totalDronePages, p + 1))}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: DISPATCH (Live Fleet Dispatch Module) */}
            {activeTab === 'dispatch' && (
              <DroneDispatchModule
                currentUser={currentUser}
                embedded={true}
                onLogout={onLogout}
                onNavigate={(page) => {
                  if (page === 'fleet') setActiveTab('inventory');
                  else if (page === 'support') setActiveTab('support');
                  else onNavigate(page);
                }}
              />
            )}

            {/* TAB: SUPPORT (Support Desk Module) */}
            {activeTab === 'support' && (
              <SupportDeskPage
                currentUser={currentUser}
                embedded={true}
                onLogout={onLogout}
                onNavigate={(page) => {
                  if (page === 'fleet') setActiveTab('inventory');
                  else onNavigate(page);
                }}
              />
            )}

            {/* TAB: UNDER MAINTENANCE */}
            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200 mb-2">
                      <Wrench className="w-3.5 h-3.5 text-amber-700" />
                      Maintenance Console
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Drones Under Maintenance ({maintenanceUnits})</h2>
                    <p className="text-xs text-slate-500 mt-1">Drones listed here are temporarily removed from store availability until marked ready.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('inventory')}
                      className="px-4 py-2 rounded-xl bg-purple-50 text-[#5a00b8] hover:bg-purple-100 font-bold text-xs border border-purple-200 transition-all cursor-pointer"
                    >
                      &larr; Back to Inventory
                    </button>
                  </div>
                </div>

                {/* Drones Currently In Maintenance */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                  {maintenanceUnits === 0 ? (
                    <div className="p-12 text-center bg-emerald-50/40 rounded-2xl border border-emerald-100 text-xs">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                      <h4 className="font-black text-base text-emerald-900">No Drones Under Maintenance</h4>
                      <p className="text-emerald-700 mt-1 max-w-md mx-auto">All fleet units are fully operational and available in Inventory &amp; Store.</p>
                      <button
                        onClick={() => setActiveTab('inventory')}
                        className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                      >
                        <span>View Fleet Inventory</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {drones
                        .filter((d) => d.status === 'maintenance')
                        .sort((a, b) => new Date(b.updated_at || b.date || b.timestamp || 0).getTime() - new Date(a.updated_at || a.date || a.timestamp || 0).getTime())
                        .map((drone) => {
                        const isVerified = drone.is_verified === true || drone.verification_status === 'verified';
                        return (
                          <div key={drone.id} className="p-5 rounded-3xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between gap-4">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  {drone.image_url ? (
                                    <img src={drone.image_url} alt={drone.model} className="h-12 w-16 rounded-xl object-cover border border-amber-200" />
                                  ) : (
                                    <div className="h-12 w-16 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center border border-amber-200">
                                      <ImageIcon className="h-5 w-5" />
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-black text-slate-900 text-sm">{drone.model}</span>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">SN: {drone.serial_number || drone.id}</p>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-mono text-[10px] font-bold">
                                  {drone.id}
                                </span>
                              </div>

                              <div className="mt-3 py-2 border-y border-amber-200/60 text-xs text-slate-600 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">Category:</span>
                                  <strong className="text-slate-800">{drone.category || 'General UAV'}</strong>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">ID Verification:</span>
                                  <span className={`font-bold text-[10px] uppercase ${isVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {isVerified ? 'Verified ID' : 'Unverified ID'}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[11px] text-amber-900 mt-3 bg-white/80 p-2.5 rounded-xl border border-amber-200/70">
                                <strong>Status Note:</strong> {drone.qc_notes || 'Under technical servicing'}
                              </p>
                            </div>

                            <button
                              onClick={() => handleToggleDroneMaintenance(drone)}
                              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Mark Ready (Return to Store)</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <ProfilePage
                currentUser={currentUser}
                onUpdateUser={onUpdateUser || (() => {})}
                onNavigate={(page) => {
                  if (page === 'fleet') setActiveTab('inventory');
                  else if (page === 'dispatch') setActiveTab('dispatch');
                  else if (page === 'support') setActiveTab('support');
                  else onNavigate(page);
                }}
              />
            )}

            {/* TAB: APP RELEASE */}
            {activeTab === 'app-release' && <AppReleaseConsole />}
          </main>
        </div>
      </div>

      {/* ── MODAL 1: ADD SINGLE DRONE ───────────────────────────────────── */}
      {showAddSingleDrone && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Single Drone to Inventory</h3>
                <p className="text-xs text-slate-500">Provide Model Name, Drone ID, and optional photo</p>
              </div>
              <button onClick={() => setShowAddSingleDrone(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSingleDrone} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Drone Name / Model Name *</label>
                <input
                  required
                  value={newDroneModel}
                  onChange={(e) => setNewDroneModel(e.target.value)}
                  placeholder="e.g. 700RPAV"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-[#5a00b8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Drone ID *</label>
                <input
                  required
                  value={newDroneId}
                  onChange={(e) => setNewDroneId(e.target.value)}
                  placeholder="e.g. INW-700RPAV-0001"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:border-[#5a00b8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={newDroneCategory}
                  onChange={(e) => setNewDroneCategory(e.target.value)}
                  placeholder="e.g. General UAV"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5a00b8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Hardware Serial <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={newDroneSerial}
                  onChange={(e) => setNewDroneSerial(e.target.value)}
                  placeholder="Auto-matched with Drone ID if left blank"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                />
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDroneIsVerified}
                    onChange={(e) => setNewDroneIsVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-[#5a00b8] focus:ring-[#5a00b8] border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Mark as Verified ID
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6">
                  Leave unchecked if this is an initial unverified ID that will be updated later.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Drone Photo <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readDroneImage(file, setNewDroneImage);
                  }}
                  className="w-full text-xs"
                />
                {newDroneImage && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={newDroneImage} alt="Drone preview" className="h-20 w-28 rounded-xl object-cover border border-slate-200" />
                    <button type="button" onClick={() => setNewDroneImage('')} className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer">
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {addDroneError && <p className="text-xs text-rose-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">{addDroneError}</p>}

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddSingleDrone(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDrone}
                  className="px-5 py-2 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white text-xs font-bold cursor-pointer shadow-md disabled:opacity-60 flex items-center gap-2"
                >
                  {addingDrone ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{addingDrone ? 'Adding...' : 'Add Drone to Fleet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: BULK BATCH GENERATOR ─────────────────────────────────── */}
      {showBulkDroneModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bulk Drone Fleet Provisioning</h3>
                <p className="text-xs text-slate-500">Bulk generate new drone inventory units with initial IDs</p>
              </div>
              <button onClick={() => setShowBulkDroneModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkAddDrones} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Batch Quantity Presets</label>
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {[10, 25, 50, 100, 250, 500].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setBulkCount(qty)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        bulkCount === qty ? 'bg-[#5a00b8] text-white border-[#5a00b8] shadow-sm' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      +{qty}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Custom Quantity Input (Max 5,000)</label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={bulkCount}
                    onChange={(e) => setBulkCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#5a00b8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">UAV Model Name</label>
                  <input
                    type="text"
                    value={bulkModel}
                    onChange={(e) => setBulkModel(e.target.value)}
                    placeholder="700RPAV"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category (Optional)</label>
                  <input
                    type="text"
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    placeholder="e.g. General UAV"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Drone ID Prefix</label>
                <input
                  type="text"
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value)}
                  placeholder="e.g. INW-700RPAV"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Generates sequential IDs: {bulkPrefix}-0001, {bulkPrefix}-0002, etc.
                </p>
              </div>

              <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-100 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkIsVerified}
                    onChange={(e) => setBulkIsVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-[#5a00b8] focus:ring-[#5a00b8] border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-950">
                    Mark entire batch as Verified IDs
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6">
                  Check if IDs are finalized, or leave unchecked if hardware serials will be verified later.
                </p>
              </div>

              {bulkImportError && <p className="text-xs text-rose-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">{bulkImportError}</p>}

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowBulkDroneModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white text-xs font-bold cursor-pointer shadow-md disabled:opacity-60 flex items-center gap-2"
                >
                  {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Boxes className="w-4 h-4" />}
                  <span>{bulkSubmitting ? 'Provisioning...' : `Provision Batch of ${bulkCount} Drones`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: EDIT DRONE CONFIGURATION ───────────────────────────── */}
      {editingDrone && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Drone Details</h3>
                <p className="text-xs text-slate-500">Unit ID: <span className="font-mono font-bold text-[#5a00b8]">{editingDrone.id}</span></p>
              </div>
              <button type="button" onClick={() => setEditingDrone(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDroneEdit} className="space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                Drone Name / Model Name *
                <input
                  required
                  value={editingDroneModel}
                  onChange={(e) => setEditingDroneModel(e.target.value)}
                  placeholder="e.g. 700RPAV"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-[#5a00b8]"
                />
              </label>

              <label className="block text-xs font-bold text-slate-700">
                Hardware Serial / Real Drone ID *
                <input
                  required
                  value={editingDroneSerial}
                  onChange={(e) => setEditingDroneSerial(e.target.value)}
                  placeholder="e.g. INW-700RPAV-REAL-0921"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#5a00b8]"
                />
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Update to the actual physical hardware serial number once the drone is in hand.
                </span>
              </label>

              <label className="block text-xs font-bold text-slate-700">
                Category <span className="text-slate-400 font-normal">(Optional)</span>
                <input
                  value={editingDroneCategory}
                  onChange={(e) => setEditingDroneCategory(e.target.value)}
                  placeholder="e.g. General UAV"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-[#5a00b8]"
                />
              </label>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingDroneIsVerified}
                    onChange={(e) => setEditingDroneIsVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-[#5a00b8] focus:ring-[#5a00b8] border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Mark as Verified ID
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6">
                  Check this box when you have confirmed the physical drone hardware ID.
                </p>
              </div>

              <label className="block text-xs font-bold text-slate-700">
                Drone Photo <span className="text-slate-400 font-normal">(Upload or URL)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readDroneImage(file, setEditingDroneImage);
                  }}
                  className="mt-1 w-full text-xs"
                />
              </label>
              {editingDroneImage && (
                <div className="flex items-center gap-3">
                  <img src={editingDroneImage} alt="Drone preview" className="h-20 w-28 rounded-xl object-cover border border-slate-200" />
                  <button
                    type="button"
                    onClick={() => setEditingDroneImage('')}
                    className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer"
                  >
                    Remove Photo
                  </button>
                </div>
              )}

              {editDroneError && <p className="text-xs text-rose-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">{editDroneError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingDrone(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] px-5 py-2 text-xs font-bold text-white cursor-pointer shadow-md disabled:opacity-60 flex items-center gap-2"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{savingEdit ? 'Saving...' : 'Save Changes to DB'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: DELETE DRONE CONFIRMATION ──────────────────────────── */}
      {deletingDrone && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Decommission Drone</h3>
              <button onClick={() => setDeletingDrone(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently remove <strong className="font-mono text-slate-900">{deletingDrone.id}</strong> ({deletingDrone.model}) from active inventory?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDrone(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDrone}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer flex items-center gap-2 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deleting ? 'Removing...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: RESERVED DRONE ORDER DETAILS ──────────────────────── */}
      {selectedReservedDrone && (() => {
        const drone = selectedReservedDrone;
        const linkedOrder = getLinkedOrderForDrone(drone);
        const copyOrderId = (id: string) => {
          navigator.clipboard.writeText(id);
          setCopiedText(id);
          setTimeout(() => setCopiedText(null), 2000);
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-black">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Reserved Drone Allocation</h3>
                    <p className="text-xs text-slate-500 font-mono">Unit ID: <strong className="text-slate-900 font-bold">{drone.id}</strong></p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReservedDrone(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {linkedOrder ? (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-bold text-purple-700">Linked Order Number</p>
                      <p className="text-base font-black font-mono text-purple-950 mt-0.5">#{linkedOrder.order_number || linkedOrder.id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyOrderId(linkedOrder.id)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-purple-700 text-xs font-bold hover:bg-purple-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      {copiedText === linkedOrder.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === linkedOrder.id ? 'Copied!' : 'Copy Order ID'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block mb-1">Customer / Client</span>
                      <strong className="text-slate-900 font-bold text-sm">{linkedOrder.client_name || linkedOrder.customer_name || 'Direct Customer'}</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block mb-1">Delivery Destination</span>
                      <strong className="text-slate-900 font-bold text-xs line-clamp-1">{linkedOrder.destination_address || 'Central Delivery Hub'}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                  <p>Drone is marked as reserved in store inventory.</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReservedDrone(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
