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
  ShieldAlert,
  ShieldCheck,
  Copy,
  ExternalLink,
  Menu,
  MapPin,
  Smartphone,
  Zap,
  Mail,
  Phone,
  QrCode,
  Edit2,
  Download,
  ScanLine
} from 'lucide-react';
import { DeliveryUser } from '../types';
import { API_BASE_URL } from '../config/api';
import { ProfilePage } from './ProfilePage';
import { DroneDispatchModule } from './DroneDispatchModule';
import { SupportDeskPage } from './SupportDeskPage';
import { AppReleaseConsole } from '../components/AppReleaseConsole';
import { PostDeliveryInspectionModal } from '../components/PostDeliveryInspectionModal';
import { DroneQRCodeModal } from '../components/DroneQRCodeModal';
import { DroneQRScannerModal } from '../components/DroneQRScannerModal';
import { DroneAuditLogConsole } from '../components/DroneAuditLogConsole';
import { BulkQrDownloadModal } from '../components/BulkQrDownloadModal';
import { AirframeQCInspectionConsole } from '../components/AirframeQCInspectionConsole';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'qc-scan' | 'audits' | 'dispatch' | 'support' | 'maintenance' | 'profile' | 'app-release'>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [inspectionStats, setInspectionStats] = useState<{
    passedCount: number;
    failedOrPendingCount: number;
    totalCount: number;
    deliveryPersonChecks?: { total: number; passed: number; defectReported: number; zeroDefectCertifiedCount: number };
    depotMaintenanceChecks?: { total: number; passed: number; maintenanceRequired: number };
  }>({ passedCount: 0, failedOrPendingCount: 0, totalCount: 0 });
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [selectedInspectionDroneId, setSelectedInspectionDroneId] = useState('');
  const [selectedInspectionDeliveryId, setSelectedInspectionDeliveryId] = useState('');
  const [selectedQrDrone, setSelectedQrDrone] = useState<any | null>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showBulkQrModal, setShowBulkQrModal] = useState(false);

  const [drones, setDrones] = useState<any[]>([]);
  const [pilots, setPilots] = useState<any[]>([]);
  const [dispatchOrders, setDispatchOrders] = useState<any[]>([]);
  const [supportStats, setSupportStats] = useState<{ total: number; pending: number }>({ total: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [droneCurrentPage, setDroneCurrentPage] = useState(1);
  const [dronePageSize, setDronePageSize] = useState(25);

  const [showAddSingleDrone, setShowAddSingleDrone] = useState(false);
  const [newDroneModel, setNewDroneModel] = useState('700RPAV');
  const [newDroneId, setNewDroneId] = useState('');
  const [newDroneSerial, setNewDroneSerial] = useState('');
  const [newDroneCategory, setNewDroneCategory] = useState('General UAV');
  const [newDroneIsVerified, setNewDroneIsVerified] = useState(false);
  const [newDroneImage, setNewDroneImage] = useState('');
  const [addDroneError, setAddDroneError] = useState('');
  const [addingDrone, setAddingDrone] = useState(false);

  const [inventoryOtpChannel, setInventoryOtpChannel] = useState<'both' | 'email' | 'phone'>('both');
  const [inventoryOtpSent, setInventoryOtpSent] = useState(false);
  const [inventoryOtp, setInventoryOtp] = useState('');
  const [inventoryOtpLoading, setInventoryOtpLoading] = useState(false);
  const [inventoryOtpInfo, setInventoryOtpInfo] = useState('');

  const [editingDrone, setEditingDrone] = useState<any | null>(null);
  const [editingDroneModel, setEditingDroneModel] = useState('700RPAV');
  const [editingDroneSerial, setEditingDroneSerial] = useState('');
  const [editingDroneCategory, setEditingDroneCategory] = useState('');
  const [editingDroneIsVerified, setEditingDroneIsVerified] = useState(false);
  const [editingDroneImage, setEditingDroneImage] = useState('');
  const [editDroneError, setEditDroneError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [showBulkDroneModal, setShowBulkDroneModal] = useState(false);
  const [bulkCount, setBulkCount] = useState(50);
  const [bulkModel, setBulkModel] = useState('700RPAV');
  const [bulkCategory, setBulkCategory] = useState('General UAV');
  const [bulkPrefix, setBulkPrefix] = useState('INW-700RPAV');
  const [bulkIsVerified, setBulkIsVerified] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkImportError, setBulkImportError] = useState('');

  const [deletingDrone, setDeletingDrone] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [decommissionOtp, setDecommissionOtp] = useState('');
  const [decommissionOtpSent, setDecommissionOtpSent] = useState(false);
  const [decommissionLoading, setDecommissionLoading] = useState(false);
  const [decommissionError, setDecommissionError] = useState('');
  const [decommissionInfo, setDecommissionInfo] = useState('');

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

  const fetchFleet = async () => {
    try {
      setRefreshing(true);
      const [dronesRes, pilotsRes, ordersRes, ticketsRes, inspectionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/delivery/drones`),
        fetch(`${API_BASE_URL}/api/delivery/delivery-agents`, { headers: getHeaders() }).catch(() => null),
        fetch(`${API_BASE_URL}/api/delivery/orders`, { headers: getHeaders() }).catch(() => null),
        fetch(`${API_BASE_URL}/api/delivery/support-tickets`, { headers: getHeaders() }).catch(() => null),
        fetch(`${API_BASE_URL}/api/delivery/inspections/stats`, { headers: getHeaders() }).catch(() => null)
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

      if (inspectionsRes && inspectionsRes.ok) {
        const insData = await inspectionsRes.json();
        if (insData?.stats) {
          setInspectionStats(insData.stats);
        }
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

  const handleRequestInventoryOtp = async () => {
    setInventoryOtpLoading(true);
    setInventoryOtpInfo('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/admin/request-inventory-otp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ channel: inventoryOtpChannel })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to request security OTP');
        return;
      }
      setInventoryOtpSent(true);
      if (data.dev_otp) setInventoryOtp(data.dev_otp);
      setInventoryOtpInfo(data.message || 'Security OTP dispatched successfully.');
      showToast(data.message || 'Security OTP dispatched!');
    } catch {
      showToast('Connection error requesting OTP.');
    } finally {
      setInventoryOtpLoading(false);
    }
  };

  const handleAddSingleDrone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDroneId.trim()) {
      setAddDroneError('Drone ID is required.');
      return;
    }
    if (!inventoryOtpSent) {
      setAddDroneError('Please request your Security OTP first.');
      return;
    }
    if (!inventoryOtp.trim() || inventoryOtp.trim().length !== 6) {
      setAddDroneError('Please enter the 6-digit Security OTP code.');
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
          qc_status: 'passed',
          adminTarget: inventoryOtpChannel === 'phone' ? currentUser?.phone : inventoryOtpChannel === 'email' ? currentUser?.email : 'both',
          otp: inventoryOtp.trim()
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
        setInventoryOtp('');
        setInventoryOtpSent(false);
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

  const openEditDroneModal = (drone: any) => {
    setEditingDrone(drone);
    setEditingDroneModel(drone.model || '700RPAV');
    setEditingDroneSerial(drone.serial_number || drone.id || '');
    setEditingDroneCategory(drone.category || 'General UAV');
    setEditingDroneIsVerified(drone.is_verified === true || drone.verification_status === 'verified');
    setEditingDroneImage(drone.image_url || '');
    setEditDroneError('');
  };

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

  const handleBulkAddDrones = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkCount < 1) {
      setBulkImportError('Please specify at least 1 unit.');
      return;
    }
    if (!inventoryOtpSent) {
      setBulkImportError('Please request your Security OTP first.');
      return;
    }
    if (!inventoryOtp.trim() || inventoryOtp.trim().length !== 6) {
      setBulkImportError('Please enter the 6-digit Security OTP code.');
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
          is_verified: bulkIsVerified,
          adminTarget: inventoryOtpChannel === 'phone' ? currentUser?.phone : inventoryOtpChannel === 'email' ? currentUser?.email : 'both',
          otp: inventoryOtp.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowBulkDroneModal(false);
        setInventoryOtp('');
        setInventoryOtpSent(false);
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

  const handleRequestDecommissionOtp = async () => {
    if (!deletingDrone) return;
    setDecommissionLoading(true);
    setDecommissionError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/admin/request-decommission-otp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ drone_id: deletingDrone.id })
      });
      const data = await res.json();
      if (res.ok) {
        setDecommissionOtpSent(true);
        setDecommissionInfo(data.message || '6-digit OTP code dispatched to your registered contact.');
        if (data.dev_otp) {
          console.log('[DEV] Decommission OTP:', data.dev_otp);
        }
      } else {
        setDecommissionError(data.error || 'Failed to dispatch decommission security code.');
      }
    } catch {
      setDecommissionError('Network error connecting to decommission security service.');
    } finally {
      setDecommissionLoading(false);
    }
  };

  const handleDeleteDrone = async () => {
    if (!deletingDrone) return;
    if (!decommissionOtp.trim()) {
      setDecommissionError('Please enter the 6-digit decommission authorization OTP code.');
      return;
    }
    setDeleting(true);
    setDecommissionError('');
    try {
      const adminTarget = currentUser?.email || currentUser?.phone || '';
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones/${encodeURIComponent(deletingDrone.id)}`, {
        method: 'DELETE',
        headers: {
          ...getHeaders(),
          'x-admin-otp': decommissionOtp.trim(),
          'x-admin-target': adminTarget
        },
        body: JSON.stringify({
          otp: decommissionOtp.trim(),
          adminTarget
        })
      });

      const data = await res.json();
      if (res.ok) {
        setDrones((prev) => prev.filter((d) => d.id !== deletingDrone.id));
        setDeletingDrone(null);
        setDecommissionOtp('');
        setDecommissionOtpSent(false);
        setDecommissionInfo('');
        showToast(data.message || `Drone ${deletingDrone.id} decommissioned and removed.`);
      } else {
        setDecommissionError(data.error || 'Failed to authorize drone decommissioning.');
      }
    } catch (err) {
      setDecommissionError('Error connecting to fleet decommission service.');
      console.error('Delete drone error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const filteredDrones = useMemo(() => {
    return drones.filter((d) => {
      const matchesSearch =
        (d.model || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.serial_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.category || '').toLowerCase().includes(searchQuery.toLowerCase());

      const isVerified = d.is_verified === true || d.verification_status === 'verified';
      const linked = getLinkedOrderForDrone(d);
      const isReserved = d.status !== 'maintenance' && (d.status === 'reserved' || Boolean(linked));
      const isSortieReady = isVerified && d.status !== 'maintenance' && !isReserved && d.status !== 'in-flight' && d.status !== 'dispatched';

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'ready' && isSortieReady) ||
        (statusFilter === 'idle' && isSortieReady) ||
        (statusFilter === 'unverified' && !isVerified) ||
        (statusFilter === 'maintenance' && d.status === 'maintenance') ||
        (statusFilter === 'in-flight' && (d.status === 'in-flight' || d.status === 'dispatched' || d.status === 'en-route'));

      const matchesVerification =
        verificationFilter === 'all' ||
        (verificationFilter === 'verified' && isVerified) ||
        (verificationFilter === 'unverified' && !isVerified);

      return matchesSearch && matchesStatus && matchesVerification;
    });
  }, [drones, searchQuery, statusFilter, verificationFilter]);

  const paginatedDrones = useMemo(() => {
    const startIndex = (droneCurrentPage - 1) * dronePageSize;
    return filteredDrones.slice(startIndex, startIndex + dronePageSize);
  }, [filteredDrones, droneCurrentPage, dronePageSize]);

  const totalDronePages = Math.ceil(filteredDrones.length / dronePageSize) || 1;

  const totalUnits = drones.length;
  const maintenanceUnits = drones.filter((d) => d.status === 'maintenance').length;
  const verifiedUnits = drones.filter((d) => d.is_verified === true || d.verification_status === 'verified').length;
  const unverifiedUnits = totalUnits - verifiedUnits;
  const inFlightUnits = drones.filter((d) => d.status === 'in-flight' || d.status === 'dispatched' || d.status === 'en-route').length;
  const sortieReadyUnits = drones.filter((d) => {
    const isVerified = d.is_verified === true || d.verification_status === 'verified';
    const linked = getLinkedOrderForDrone(d);
    const isBusy = d.status === 'reserved' || d.status === 'in-flight' || d.status === 'en-route' || Boolean(linked);
    return isVerified && d.status !== 'maintenance' && !isBusy;
  }).length;
  const idleUnits = sortieReadyUnits;
  const readinessRate = totalUnits > 0 ? Math.round((sortieReadyUnits / totalUnits) * 100) : 0;
  const pendingDispatchUnits = dispatchOrders.filter((o) => ['pending', 'assigned', 'ready'].includes(o.status)).length;

  const fleetNavItems = [
    { id: 'overview', label: 'Overview', icon: Gauge, badge: null },
    { id: 'inventory', label: 'Inventory', icon: Boxes, badge: sortieReadyUnits > 0 ? `${sortieReadyUnits} Ready` : `${totalUnits} Total` },
    { id: 'qc-scan', label: 'Scan & Inspect Drone', icon: ScanLine, badge: 'QC' },
    { id: 'audits', label: 'QR Scans & Audits', icon: QrCode, badge: null },
    { id: 'dispatch', label: 'Dispatch', icon: Send, badge: pendingDispatchUnits > 0 ? pendingDispatchUnits : null },
    { id: 'support', label: 'Support', icon: Headphones, badge: supportStats.pending > 0 ? supportStats.pending : null },
    { id: 'maintenance', label: 'Under Maintenance', icon: Wrench, badge: maintenanceUnits > 0 ? maintenanceUnits : null },
    { id: 'app-release', label: 'Mobile App Release', icon: Smartphone, badge: 'APK' }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pt-24 sm:pt-28 pb-28 sm:pb-20 font-sans">

      {actionSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#5a00b8] text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{actionSuccess}</span>
        </div>
      )}


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


      <div className="max-w-[1560px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">

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
                    <span className="text-emerald-700 font-bold">{sortieReadyUnits} / {totalUnits} Units</span>
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


          <main className="flex-1 w-full min-w-0">

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


            {activeTab === 'overview' && (
              <div className="space-y-6">


                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                  <div
                    onClick={() => setActiveTab('inventory')}
                    className="bg-white border border-slate-200 hover:border-purple-300 rounded-3xl p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Fleet Inventory</p>
                      <h4 className="text-3xl font-black text-slate-900 mt-1">{totalUnits}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                        <p className="text-xs text-purple-700 font-semibold">Central RPAV Registry</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                      <Boxes className="w-6 h-6" />
                    </div>
                  </div>


                  <div
                    onClick={() => {
                      setStatusFilter(sortieReadyUnits > 0 ? 'ready' : 'unverified');
                      setActiveTab('inventory');
                    }}
                    className={`bg-white border rounded-3xl p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all group ${
                      sortieReadyUnits > 0
                        ? 'border-emerald-200 hover:border-emerald-300 bg-emerald-50/20'
                        : 'border-slate-200 hover:border-amber-300 bg-amber-50/15'
                    }`}
                  >
                    <div>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${
                        sortieReadyUnits > 0 ? 'text-emerald-700' : 'text-amber-800'
                      }`}>Sortie-Ready</p>
                      <h4 className={`text-3xl font-black mt-1 ${
                        sortieReadyUnits > 0 ? 'text-emerald-800' : 'text-slate-800'
                      }`}>{sortieReadyUnits}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          sortieReadyUnits > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                        }`}></span>
                        <p className={`text-xs font-medium ${
                          sortieReadyUnits > 0 ? 'text-emerald-600' : 'text-amber-700 font-semibold'
                        }`}>
                          {sortieReadyUnits > 0 ? 'Ready for Dispatch' : '0 Airframes Verified'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black group-hover:scale-105 transition-transform ${
                      sortieReadyUnits > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </div>


                  <div
                    onClick={() => setActiveTab('dispatch')}
                    className="bg-white border border-blue-200 hover:border-blue-300 bg-blue-50/20 rounded-3xl p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Active Deliveries</p>
                      <h4 className="text-3xl font-black text-blue-800 mt-1">{inFlightUnits}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <p className="text-xs text-blue-600 font-medium">Sorties in Flight</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                      <Truck className="w-6 h-6" />
                    </div>
                  </div>


                  <div
                    onClick={() => setActiveTab('maintenance')}
                    className="bg-white border border-amber-200 hover:border-amber-300 bg-amber-50/20 rounded-3xl p-5 shadow-xs flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Under Maintenance</p>
                      <h4 className="text-3xl font-black text-amber-800 mt-1">{maintenanceUnits}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <p className="text-xs text-amber-600 font-medium">Depot Service &amp; QC</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                      <Wrench className="w-6 h-6" />
                    </div>
                  </div>
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verified Hardware IDs</span>
                      <h4 className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight font-mono">{verifiedUnits} <span className="text-sm font-semibold text-slate-400">/ {totalUnits}</span></h4>
                      <p className="text-xs text-purple-700 font-medium mt-0.5">Tamper-Proof QR Linked</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-black shrink-0 border border-purple-100 shadow-2xs">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>


                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Inspections Passed</span>
                      <h4 className="text-2xl font-black text-emerald-950 mt-0.5 tracking-tight font-mono">{inspectionStats.passedCount}</h4>
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">Zero-Defect Certified</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black shrink-0 border border-emerald-100 shadow-2xs">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </div>


                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Flagged / Review</span>
                      <h4 className="text-2xl font-black text-rose-950 mt-0.5 tracking-tight font-mono">{inspectionStats.failedOrPendingCount}</h4>
                      <p className="text-xs text-rose-600 font-medium mt-0.5">Needs Assessment</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-black shrink-0 border border-rose-100 shadow-2xs">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  </div>


                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex items-center justify-between">
                    <div className="flex-1 mr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Airframe Actions</span>
                        <button
                          onClick={() => setActiveTab('audits')}
                          className="text-[10px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-0.5 transition-colors cursor-pointer"
                        >
                          <span>Audit Trail</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => setShowQrScanner(true)}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#5a00b8] border border-purple-200/80 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                        >
                          <QrCode className="w-3.5 h-3.5 text-[#5a00b8]" />
                          <span>Scan QR</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInspectionDroneId('');
                            setShowInspectionModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-black shrink-0 border border-purple-100 shadow-2xs">
                      <QrCode className="w-6 h-6" />
                    </div>
                  </div>
                </div>


                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                      <div>
                        <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                          <Activity className="w-5 h-5 text-[#5a00b8]" />
                          <span>Consignment Sortie &amp; Dispatch Breakdown</span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Real-time lifecycle distribution across 700 RPAV deliveries</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#5a00b8] bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                          {dispatchOrders.length} Total Bookings
                        </span>
                      </div>
                    </div>


                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">In Transit</span>
                        <span className="text-lg font-black font-mono text-blue-950">
                          {dispatchOrders.filter((o) => ['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(o.status)).length}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Delivered</span>
                        <span className="text-lg font-black font-mono text-emerald-950">
                          {dispatchOrders.filter((o) => o.status === 'delivered').length}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100">
                        <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Staged / Assigned</span>
                        <span className="text-lg font-black font-mono text-purple-950">
                          {dispatchOrders.filter((o) => o.status === 'pending' || o.status === 'assigned').length}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">On Hold</span>
                        <span className="text-lg font-black font-mono text-amber-950">
                          {dispatchOrders.filter((o) => o.status === 'on-hold').length}
                        </span>
                      </div>
                    </div>

                    {dispatchOrders.length > 0 ? (

                      <div className="space-y-4 pt-1">

                        <div>
                          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                            <span className="text-blue-800 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                              Out for Delivery / In Transit
                            </span>
                            <span className="font-mono text-slate-800">
                              {dispatchOrders.filter((o) => ['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(o.status)).length} Orders (
                              {Math.round(
                                (dispatchOrders.filter((o) => ['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(o.status)).length /
                                  dispatchOrders.length) *
                                  100
                              )}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${
                                  (dispatchOrders.filter((o) => ['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(o.status)).length /
                                    dispatchOrders.length) *
                                  100
                                }%`
                              }}
                            />
                          </div>
                        </div>


                        <div>
                          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                            <span className="text-emerald-800 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                              Successfully Delivered
                            </span>
                            <span className="font-mono text-slate-800">
                              {dispatchOrders.filter((o) => o.status === 'delivered').length} Orders (
                              {Math.round((dispatchOrders.filter((o) => o.status === 'delivered').length / dispatchOrders.length) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${
                                  (dispatchOrders.filter((o) => o.status === 'delivered').length / dispatchOrders.length) * 100
                                }%`
                              }}
                            />
                          </div>
                        </div>


                        <div>
                          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                            <span className="text-purple-800 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                              Awaiting Dispatch / Partner Assignment
                            </span>
                            <span className="font-mono text-slate-800">
                              {dispatchOrders.filter((o) => o.status === 'pending' || o.status === 'assigned').length} Orders (
                              {Math.round((dispatchOrders.filter((o) => o.status === 'pending' || o.status === 'assigned').length / dispatchOrders.length) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-purple-500 h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${
                                  (dispatchOrders.filter((o) => o.status === 'pending' || o.status === 'assigned').length / dispatchOrders.length) * 100
                                }%`
                              }}
                            />
                          </div>
                        </div>


                        <div>
                          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                            <span className="text-amber-800 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                              On Hold / Delivery Paused
                            </span>
                            <span className="font-mono text-slate-800">
                              {dispatchOrders.filter((o) => o.status === 'on-hold').length} Orders (
                              {Math.round((dispatchOrders.filter((o) => o.status === 'on-hold').length / dispatchOrders.length) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${
                                  (dispatchOrders.filter((o) => o.status === 'on-hold').length / dispatchOrders.length) * 100
                                }%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : sortieReadyUnits > 0 ? (
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-purple-100 shadow-2xs flex items-center justify-center text-[#5a00b8] shrink-0">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-slate-900">Fleet Operations Standby • {readinessRate}% Ready</h4>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Optimal</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {sortieReadyUnits} of {totalUnits} RPAV units calibrated and verified for sortie assignment. Consignment sorties booked through the Customer Portal or Dispatch Workbench appear in real time.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab('dispatch')}
                          className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors shrink-0 cursor-pointer"
                        >
                          Dispatch Desk &rarr;
                        </button>
                      </div>
                    ) : (
                      <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-amber-200 shadow-2xs flex items-center justify-center text-amber-600 shrink-0">
                          <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-amber-950">Fleet Staged • Hardware Verification Required</h4>
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">Awaiting QC</span>
                          </div>
                          <p className="text-[11px] text-amber-800/90 mt-0.5">
                            {unverifiedUnits} of {totalUnits} RPAV units are staged in catalog. Zero airframes are currently verified for flight. Scan physical drone QR or complete pre-flight inspection to certify units for sortie dispatch.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab('qc-scan')}
                          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shrink-0 cursor-pointer shadow-xs"
                        >
                          Scan Drone QR &rarr;
                        </button>
                      </div>
                    )}
                  </div>


                  <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-[#1e1338] text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">Fulfillment Health</span>
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Live Telemetry
                        </span>
                      </div>
                      <h3 className="text-2xl font-black tracking-tight text-white">Consignment SLA</h3>
                      <p className="text-xs text-slate-300/80 leading-relaxed">
                        Fleet turnaround times, airframe mission availability, and operator assignment velocity.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-300">Active Consignments:</span>
                        <span className="font-mono font-black text-emerald-400 text-sm">
                          {dispatchOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length} Active
                        </span>
                      </div>

                      <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-300">Airframe Readiness:</span>
                        <span className="font-mono font-black text-purple-300 text-sm">
                          {readinessRate}% Ready ({sortieReadyUnits}/{totalUnits})
                        </span>
                      </div>

                      <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-300">Completion Ratio:</span>
                        <span className="font-mono font-black text-white text-sm">
                          {dispatchOrders.length > 0
                            ? Math.round((dispatchOrders.filter((o) => o.status === 'delivered').length / dispatchOrders.length) * 100)
                            : 100}%
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('dispatch')}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#5a00b8] to-[#7928ca] hover:opacity-95 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-950/40"
                    >
                      <span>Manage Dispatch Workbench</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>


                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-[#5a00b8]" />
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
                        <div className="p-8 text-center rounded-2xl bg-slate-50/60 border border-dashed border-slate-200 space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#5a00b8] flex items-center justify-center mx-auto shadow-2xs">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs">No Consignments in Flight</h4>
                            <p className="text-slate-500 text-[11px] max-w-sm mx-auto mt-0.5">
                              Central drone fleet is staged and ready. Dispatch missions generated via the Consignment Workbench will stream live here.
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab('dispatch')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5a00b8] hover:bg-[#45008c] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <span>Open Dispatch Desk</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>


                  <div className="space-y-6">

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


            {activeTab === 'inventory' && (
              <div className="space-y-6">

                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-50 text-[#5a00b8] border border-purple-100 mb-2">
                      <Boxes className="w-3.5 h-3.5 text-[#5a00b8]" />
                      Fleet Inventory
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Drone Inventory ({totalUnits} Units)</h2>
                    <p className="text-xs text-slate-500 mt-1">Manage Drone IDs, verify physical hardware serials, add new drones, or toggle maintenance status.</p>
                  </div>

                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 w-full sm:w-auto">
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
                      className="px-3.5 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap w-full sm:w-auto"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
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
                      className="px-4 py-2.5 rounded-2xl bg-[#5a00b8] hover:bg-[#2e0066] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap w-full sm:w-auto"
                    >
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                      <span>Bulk Batch Add</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowBulkQrModal(true)}
                      className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap transition-all w-full sm:w-auto col-span-full xs:col-span-2 sm:col-span-1"
                      title="Bulk Download Drone QR Codes as ZIP (Range 1-100 or All)"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>Bulk QR ZIP</span>
                    </button>
                  </div>
                </div>


                <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setDroneCurrentPage(1);
                      }}
                      placeholder="Search 700 RPAV by Drone ID, Serial Number, Model, or Status..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#5a00b8]/15 focus:border-[#5a00b8]"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowQrScanner(true)}
                      className="px-3.5 py-2 bg-[#5a00b8] hover:bg-[#470091] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs transition-all w-full sm:w-auto"
                      title="Scan Drone QR Code or Airframe ID"
                    >
                      <QrCode className="w-3.5 h-3.5 shrink-0" />
                      <span>Scan Drone QR</span>
                    </button>

                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setDroneCurrentPage(1);
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-full sm:w-auto"
                    >
                      <option value="all">All Statuses ({totalUnits})</option>
                      <option value="ready">Sortie-Ready ({sortieReadyUnits})</option>
                      <option value="unverified">Pending QC Verification ({unverifiedUnits})</option>
                      <option value="maintenance">Under Maintenance ({maintenanceUnits})</option>
                      <option value="in-flight">Out for Delivery ({inFlightUnits})</option>
                    </select>

                    <select
                      value={verificationFilter}
                      onChange={(e) => {
                        setVerificationFilter(e.target.value);
                        setDroneCurrentPage(1);
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-full sm:w-auto"
                    >
                      <option value="all">All Verifications</option>
                      <option value="verified">Verified Hardware ({verifiedUnits})</option>
                      <option value="unverified">Unverified ({unverifiedUnits})</option>
                    </select>
                  </div>
                </div>


                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                  <div className="sm:hidden px-3.5 py-1.5 bg-slate-50 border-b border-slate-200/80 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                    <span>Swipe horizontally to view full table &rarr;</span>
                    <span className="text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">{totalUnits} UAVs</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[780px]">
                      <thead>
                        <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                          <th className="py-3 px-3.5 w-14">Photo</th>
                          <th className="py-3 px-4 min-w-[170px]">Drone ID &amp; Serial</th>
                          <th className="py-3 px-4">Model</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Status &amp; Mission</th>
                          <th className="py-3 px-4">Condition &amp; QC</th>
                          <th className="py-3 px-4">ID Verify</th>
                          <th className="py-3 px-4 text-right min-w-[200px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedDrones.map((d) => {
                          const isVerified = d.is_verified === true || d.verification_status === 'verified';
                          const linked = getLinkedOrderForDrone(d);
                          const isReserved =
                            d.status !== 'maintenance' &&
                            (d.status === 'reserved' || Boolean(linked));

                          return (
                            <tr key={d.id} className="hover:bg-purple-50/20 transition-colors">

                              <td className="py-3 px-3.5">
                                {d.image_url ? (
                                  <img src={d.image_url} alt={d.model} className="h-9 w-12 rounded-xl object-cover border border-slate-200 shadow-2xs" />
                                ) : (
                                  <div className="h-9 w-12 rounded-xl bg-gradient-to-br from-purple-50 to-slate-100 text-[#5a00b8] flex items-center justify-center border border-purple-100 shadow-2xs">
                                    <Plane className="h-4 w-4 transform -rotate-45" />
                                  </div>
                                )}
                              </td>


                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="font-mono font-bold text-slate-900 text-xs block tracking-tight">{d.id}</span>
                                <span className="text-[10px] text-slate-400 font-mono block tracking-tight">{d.serial_number || d.id}</span>
                              </td>


                              <td className="py-3 px-4 font-bold text-[#5a00b8] whitespace-nowrap">{d.model}</td>


                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">
                                  {d.category || 'General UAV'}
                                </span>
                              </td>


                              <td className="py-3 px-4 whitespace-nowrap">
                                {d.status === 'maintenance' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                    <span>Maintenance</span>
                                  </span>
                                ) : isReserved ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReservedDrone(d)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                                    <span>Reserved: <strong className="font-mono">{linked?.id || d.assigned_order || 'Booking'}</strong></span>
                                    <Eye className="w-3 h-3 text-purple-500" />
                                  </button>
                                ) : d.status === 'en-route' || d.status === 'in-flight' || d.status === 'dispatched' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                    <span>In Flight</span>
                                  </span>
                                ) : !isVerified ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    <span>Pending QC Verification</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>Sortie-Ready / In Stock</span>
                                  </span>
                                )}
                              </td>


                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                                      (d.current_condition || '').toUpperCase() === 'DAMAGED'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : (d.current_condition || '').toUpperCase() === 'NEEDS_REVIEW'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    {(d.current_condition || '').toUpperCase() === 'DAMAGED' ? (
                                      <AlertTriangle className="w-3 h-3" />
                                    ) : (
                                      <Check className="w-3 h-3" />
                                    )}
                                    {d.current_condition ? d.current_condition.toUpperCase() : 'GOOD'}
                                  </span>
                                  {d.last_inspection_result && (
                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                                      d.last_inspection_result.toLowerCase() === 'passed'
                                        ? 'bg-slate-100 text-slate-700'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {d.last_inspection_result}
                                    </span>
                                  )}
                                </div>
                              </td>


                              <td className="py-3 px-4 whitespace-nowrap">
                                {isVerified ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/70">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Verified
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                    <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                                    Pending
                                  </span>
                                )}
                              </td>


                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  {isReserved && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedReservedDrone(d)}
                                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all flex items-center gap-1 cursor-pointer"
                                      title="View Assigned Consignment"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Order</span>
                                    </button>
                                  )}


                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedInspectionDroneId(d.id);
                                      setSelectedInspectionDeliveryId(d.assigned_order || d.delivery_data?.assigned_order || '');
                                      setShowInspectionModal(true);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#5a00b8] hover:bg-[#43008a] text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    title="Record Post-Delivery Condition Inspection"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Inspect</span>
                                  </button>


                                  <button
                                    type="button"
                                    onClick={() => setSelectedQrDrone(d)}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                                    title="View &amp; Print 25mm Permanent QR Code Label"
                                  >
                                    <QrCode className="w-3.5 h-3.5 text-slate-600" />
                                    <span>QR</span>
                                  </button>


                                  <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDroneMaintenance(d)}
                                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                        d.status === 'maintenance'
                                          ? 'text-emerald-600 hover:bg-emerald-50'
                                          : 'text-amber-600 hover:bg-amber-50'
                                      }`}
                                      title={d.status === 'maintenance' ? 'Restore Drone to Stock (Clear Maint)' : 'Mark under technical maintenance'}
                                    >
                                      <Wrench className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditDroneModal(d)}
                                      className="p-1.5 rounded-md text-slate-500 hover:text-[#5a00b8] hover:bg-purple-50 transition-colors cursor-pointer"
                                      title="Edit Drone Details &amp; Hardware ID"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingDrone(d)}
                                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Decommission Airframe"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredDrones.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400">
                              <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                              <p className="text-sm font-semibold">No drones match your search or filter.</p>
                              <p className="text-xs text-slate-400 mt-0.5">Click "+1 Single Drone" or "Bulk Batch Add" to populate inventory.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>


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


            {activeTab === 'qc-scan' && (
              <AirframeQCInspectionConsole
                currentUser={currentUser}
                availableDrones={drones}
                orders={dispatchOrders}
                onInspectionCompleted={() => {
                  fetchFleet();
                }}
                onOpenAuditLogs={() => setActiveTab('audits')}
              />
            )}


            {activeTab === 'audits' && (
              <DroneAuditLogConsole
                currentUser={currentUser}
                onOpenQRModal={(drone) => setSelectedQrDrone(drone)}
                onOpenInspectionModal={(droneId, deliveryId) => {
                  setSelectedInspectionDroneId(droneId);
                  setSelectedInspectionDeliveryId(deliveryId || '');
                  setShowInspectionModal(true);
                }}
              />
            )}


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


            {activeTab === 'app-release' && <AppReleaseConsole />}
          </main>
        </div>
      </div>


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


              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2 font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5a00b8] flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-[#5a00b8]" /> Authorization Security OTP
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-[#5a00b8]" />
                    Send to: <strong className="text-slate-800">{currentUser?.email || 'fleet@indofleet.com'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleRequestInventoryOtp}
                    disabled={inventoryOtpLoading}
                    className="px-3.5 py-1.5 bg-white hover:bg-purple-100 text-[#5a00b8] border border-purple-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    {inventoryOtpLoading ? 'Sending...' : inventoryOtpSent ? 'Resend OTP' : 'Request Email OTP'}
                  </button>
                </div>

                {inventoryOtpSent && (
                  <div className="space-y-1">
                    <input
                      type="text"
                      maxLength={6}
                      value={inventoryOtp}
                      onChange={(e) => setInventoryOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Enter 6-digit OTP code"
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 text-xs font-mono font-bold tracking-widest text-slate-900 bg-white focus:outline-none focus:border-[#5a00b8]"
                    />
                    <p className="text-[11px] text-purple-700 font-medium">
                      💡 Tip: {inventoryOtpChannel === 'both'
                        ? 'You can enter the OTP received on either your Email or Mobile SMS.'
                        : `Enter the 6-digit OTP sent to your registered ${inventoryOtpChannel}.`}
                    </p>
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


              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2 font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5a00b8] flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-[#5a00b8]" /> Authorization Security OTP
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-[#5a00b8]" />
                    Send to: <strong className="text-slate-800">{currentUser?.email || 'fleet@indofleet.com'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleRequestInventoryOtp}
                    disabled={inventoryOtpLoading}
                    className="px-3.5 py-1.5 bg-white hover:bg-purple-100 text-[#5a00b8] border border-purple-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    {inventoryOtpLoading ? 'Sending...' : inventoryOtpSent ? 'Resend OTP' : 'Request Email OTP'}
                  </button>
                </div>

                {inventoryOtpSent && (
                  <div className="space-y-1">
                    <input
                      type="text"
                      maxLength={6}
                      value={inventoryOtp}
                      onChange={(e) => setInventoryOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Enter 6-digit OTP code"
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 text-xs font-mono font-bold tracking-widest text-slate-900 bg-white focus:outline-none focus:border-[#5a00b8]"
                    />
                    <p className="text-[11px] text-purple-700 font-medium">
                      💡 Tip: {inventoryOtpChannel === 'both'
                        ? 'You can enter the OTP received on either your Email or Mobile SMS.'
                        : `Enter the 6-digit OTP sent to your registered ${inventoryOtpChannel}.`}
                    </p>
                  </div>
                )}
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


      {deletingDrone && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-bold text-slate-900">Decommission Drone</h3>
              </div>
              <button
                onClick={() => {
                  setDeletingDrone(null);
                  setDecommissionOtp('');
                  setDecommissionOtpSent(false);
                  setDecommissionError('');
                  setDecommissionInfo('');
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-2xl">
              <p className="text-xs text-rose-900 leading-relaxed font-medium">
                ⚠️ <strong>High-Security Action:</strong> Are you sure you want to permanently decommission{' '}
                <strong className="font-mono text-slate-900 font-bold">{deletingDrone.id}</strong> ({deletingDrone.model})?
                This unit will be permanently erased from fleet rosters and digital QR passports.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Authorized Operator</p>
              <p className="text-xs font-semibold text-slate-800">
                {currentUser?.name || 'Administrator'} ({currentUser?.role?.replace('_', ' ') || 'Staff'})
              </p>
              <p className="text-[11px] text-slate-500">
                Contact: {currentUser?.email || 'Registered Email'}{currentUser?.phone ? ` & +91 ${currentUser.phone}` : ''}
              </p>
            </div>

            {!decommissionOtpSent ? (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-slate-600 leading-relaxed">
                  To protect fleet assets from accidental deletion, an authorized 6-digit OTP code will be sent to your registered Email & Phone SMS.
                </p>

                {decommissionError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                    {decommissionError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRequestDecommissionOtp}
                  disabled={decommissionLoading}
                  className="w-full py-3 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {decommissionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  <span>{decommissionLoading ? 'Sending Security Code...' : 'Request Decommission OTP (Email & SMS)'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-right-2 duration-150">
                {decommissionInfo && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium leading-relaxed">
                    ✅ {decommissionInfo}
                  </div>
                )}

                <div className="p-2 rounded-xl bg-purple-50 border border-purple-200/60 text-[11px] text-purple-700 font-semibold">
                  💡 Tip: You can enter the OTP received on either your Email or Mobile SMS.
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Enter 6-Digit Decommission Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={decommissionOtp}
                    onChange={(e) => {
                      setDecommissionOtp(e.target.value.replace(/[^0-9]/g, ''));
                      setDecommissionError('');
                    }}
                    placeholder="• • • • • •"
                    className="w-full py-3 px-4 rounded-xl border border-slate-200 text-center font-mono tracking-[0.4em] text-lg font-bold text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50"
                    autoFocus
                  />
                </div>

                {decommissionError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium text-center">
                    {decommissionError}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleRequestDecommissionOtp}
                    disabled={decommissionLoading}
                    className="text-xs font-bold text-[#5a00b8] hover:underline cursor-pointer"
                  >
                    {decommissionLoading ? 'Resending...' : 'Resend Code'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeletingDrone(null);
                  setDecommissionOtp('');
                  setDecommissionOtpSent(false);
                  setDecommissionError('');
                  setDecommissionInfo('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              {decommissionOtpSent && (
                <button
                  type="button"
                  onClick={handleDeleteDrone}
                  disabled={deleting || decommissionOtp.length !== 6}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50 shadow-md shadow-rose-900/10"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{deleting ? 'Decommissioning...' : 'Verify OTP & Remove Drone'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}


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


      <DroneQRCodeModal
        isOpen={Boolean(selectedQrDrone)}
        onClose={() => setSelectedQrDrone(null)}
        drone={selectedQrDrone}
        onOpenInspection={(droneId) => {
          setSelectedQrDrone(null);
          setSelectedInspectionDroneId(droneId);
          setSelectedInspectionDeliveryId('');
          setShowInspectionModal(true);
        }}
        onNavigate={onNavigate}
      />


      <BulkQrDownloadModal
        isOpen={showBulkQrModal}
        onClose={() => setShowBulkQrModal(false)}
        allDrones={drones}
      />


      <DroneQRScannerModal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        availableDrones={drones}
        onSelectDroneForInspection={(droneId) => {
          setShowQrScanner(false);
          setSelectedInspectionDroneId(droneId);
          setSelectedInspectionDeliveryId('');
          setShowInspectionModal(true);
        }}
        onSelectDroneForQRLabel={(drone) => {
          setShowQrScanner(false);
          setSelectedQrDrone(drone);
        }}
      />


      <PostDeliveryInspectionModal
        isOpen={showInspectionModal}
        onClose={() => setShowInspectionModal(false)}
        droneId={selectedInspectionDroneId}
        deliveryId={selectedInspectionDeliveryId}
        availableDrones={drones}
        onSuccess={() => {
          fetchFleet();
          showToast('Airframe inspection successfully recorded!');
        }}
      />
    </div>
  );
};
