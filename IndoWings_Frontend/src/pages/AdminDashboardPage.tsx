import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Truck,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Package,
  Layers,
  ArrowRight,
  Headphones,
  X,
  User,
  UserPlus,
  Loader2,
  Trash2,
  Check,
  Lock,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  Eye,
  Ban,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';
import { DeliveryUser } from '../components/AuthModal';
import { API_BASE_URL } from '../config/api';
import PhoneInput from '../components/PhoneInput';
import { parsePhone } from '../data/countries';
import { DroneImportRow, parseDroneImportFile } from '../utils/droneImport';
import { DroneDispatchModule } from './DroneDispatchModule';
import { ProfilePage } from './ProfilePage';
import { SupportDeskPage } from './SupportDeskPage';
import { DeliveryTrackingModule } from './DeliveryTrackingModule';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';

interface AdminDashboardProps {
  currentUser: DeliveryUser | null;
  onUpdateUser: (user: DeliveryUser) => void;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardProps> = ({ currentUser, onUpdateUser, onNavigate, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'personnel' | 'provision' | 'fleet' | 'dispatch' | 'secure-dispatch' | 'delivery' | 'support' | 'profile'>('overview');

  // Data States
  const [users, setUsers] = useState<any[]>([]);
  const [drones, setDrones] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [expertRequests, setExpertRequests] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editingDrone, setEditingDrone] = useState<any | null>(null);
  const [newDroneId, setNewDroneId] = useState('');
  const [newDroneImage, setNewDroneImage] = useState('');
  const [editingDroneImage, setEditingDroneImage] = useState('');
  const [bulkRows, setBulkRows] = useState<DroneImportRow[]>([]);
  const [bulkManualRows, setBulkManualRows] = useState('');
  const [bulkImportError, setBulkImportError] = useState('');
  const [inventoryOtpSent, setInventoryOtpSent] = useState(false);
  const [inventoryOtp, setInventoryOtp] = useState('');
  const [inventoryOtpChannel, setInventoryOtpChannel] = useState<'email' | 'phone'>('email');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [droneFilter, setDroneFilter] = useState('all');
  const [supportFilter, setSupportFilter] = useState('all');

  // Simple Team Member Provisioning State (NO Base Camp)
  const [provName, setProvName] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provPhone, setProvPhone] = useState('');
  const [provRole, setProvRole] = useState<'admin' | 'fleet_manager' | 'dispatcher' | 'support' | 'customer'>('dispatcher');
  const [provTempPass, setProvTempPass] = useState('');

  // Admin Security OTP State for Provisioning
  const [adminOtpChannel, setAdminOtpChannel] = useState<'email' | 'phone'>('email');
  const [adminOtpSent, setAdminOtpSent] = useState(false);
  const [adminOtp, setAdminOtp] = useState('');
  const [adminOtpLoading, setAdminOtpLoading] = useState(false);
  const [adminOtpError, setAdminOtpError] = useState('');
  const [provisioningSuccess, setProvisioningSuccess] = useState<any | null>(null);

  // Fleet Add State
  const [showAddSingleDrone, setShowAddSingleDrone] = useState(false);
  const [showBulkDroneModal, setShowBulkDroneModal] = useState(false);
  const [newDroneModel, setNewDroneModel] = useState('Cyberone Pro');
  const [newDroneSerial, setNewDroneSerial] = useState('');
  const [newDroneCity, setNewDroneCity] = useState('Noida Sector 62 Plant');
  const [newDroneBattery, setNewDroneBattery] = useState(100);
  const [newDronePayload, setNewDronePayload] = useState(5);

  // Bulk Drone Import State (50, 100, 250, 500, 1000)
  const [bulkCount, setBulkCount] = useState(100);
  const [bulkModel, setBulkModel] = useState('Cyberone Pro');
  const [bulkPrefix, setBulkPrefix] = useState('IW-UAV-BATCH');
  const [bulkCity, setBulkCity] = useState('Noida Sector 62 Plant');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Drone Shipment Dispatch State (Shipping manufactured drones to clients)
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchClient, setDispatchClient] = useState('');
  const [dispatchContact, setDispatchContact] = useState('');
  const [dispatchPhone, setDispatchPhone] = useState('');
  const [dispatchAddress, setDispatchAddress] = useState('');
  const [dispatchModel, setDispatchModel] = useState('Cyberone Pro');
  const [dispatchUnits, setDispatchUnits] = useState(5);
  const [dispatchCarrier, setDispatchCarrier] = useState('IndoWings Secured Fleet Van');
  const [dispatchNotes, setDispatchNotes] = useState('Pre-dispatch hardware QC verified');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const readDroneImage = (file: File, setImage: (image: string) => void) => {
    if (!file.type.startsWith('image/')) {
      setAdminOtpError('Choose an image file.');
      return;
    }
    if (file.size > 1_500_000) {
      setAdminOtpError('Image must be smaller than 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ''));
    reader.onerror = () => setAdminOtpError('Could not read the selected image.');
    reader.readAsDataURL(file);
  };

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const authHeaders = { Authorization: `Bearer ${localStorage.getItem('iw_delivery_token') || ''}` };
      const [uRes, dRes, oRes, sRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/delivery/users`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/api/delivery/drones`),
        fetch(`${API_BASE_URL}/api/delivery/orders`),
        fetch(`${API_BASE_URL}/api/delivery/support/expert-requests`, { headers: authHeaders }).catch(() => null)
      ]);

      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData.users || []);
      } else if (uRes.status === 401 || uRes.status === 403) {
        onLogout();
        return;
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDrones(dData.drones || []);
      }
      if (oRes.ok) {
        const oData = await oRes.json();
        setOrders(oData.orders || []);
      }
      if (sRes && sRes.ok) {
        const sData = await sRes.json();
        setExpertRequests(sData.requests || []);
      }
    } catch (err) {
      console.error('Admin data fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. ADMIN REQUESTS OTP TO AUTHORIZE USER CREATION
  const handleRequestAdminOtp = async () => {
    setAdminOtpLoading(true);
    setAdminOtpError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/admin/request-provision-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('iw_delivery_token') || ''}`
        },
        body: JSON.stringify({
          channel: adminOtpChannel
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminOtpError(data.error || 'Failed to request authorization code');
        return;
      }
      setAdminOtpSent(true);
      showToast(`Security OTP sent to ${adminOtpChannel === 'phone' ? 'Phone' : 'Email'}!`);
    } catch {
      setAdminOtpError('Cannot connect to authorization server.');
    } finally {
      setAdminOtpLoading(false);
    }
  };

  // 2. ADMIN VERIFIES OTP & PROVISIONS NEW USER
  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provName.trim() || !provEmail.trim() || parsePhone(provPhone).national.length < 6 || !provRole) {
      setAdminOtpError('Full Name, valid Email, valid Phone number, and Role are mandatory.');
      return;
    }
    if (!adminOtp.trim()) {
      setAdminOtpError('Please enter your 6-digit Admin Security OTP.');
      return;
    }
    if (!provTempPass.trim() || provTempPass.trim().length < 6) {
      setAdminOtpError('Please enter an initial temporary password (min 6 characters) or click Generate.');
      return;
    }

    setAdminOtpLoading(true);
    setAdminOtpError('');

    try {
      const adminTarget = adminOtpChannel === 'phone' ? currentUser?.phone || '' : currentUser?.email || '';

      const res = await fetch(`${API_BASE_URL}/api/delivery/admin/provision-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('iw_delivery_token') || ''}`
        },
        body: JSON.stringify({
          adminTarget,
          otp: adminOtp.trim(),
          name: provName.trim(),
          email: provEmail.trim(),
          phone: provPhone.trim(),
          role: provRole,
          temporaryPassword: provTempPass.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAdminOtpError(data.error || 'Authorization failed. Please check OTP code.');
        return;
      }

      setProvisioningSuccess({ ...data.user, emailSent: data.emailSent });
      showToast(data.emailSent ? `Account created for ${data.user?.name}; credentials email sent.` : `Account created, but credentials email failed. Copy and share them securely.`);
      await fetchData();
    } catch {
      setAdminOtpError('Connection error during user provisioning.');
    } finally {
      setAdminOtpLoading(false);
    }
  };

  const resetProvisioningForm = () => {
    setProvName('');
    setProvEmail('');
    setProvPhone('');
    setProvRole('dispatcher');
    setProvTempPass('');
    setAdminOtpSent(false);
    setAdminOtp('');
    setAdminOtpError('');
    setProvisioningSuccess(null);
  };

  const requestInventoryOtp = async () => {
    const token = localStorage.getItem('iw_delivery_token') || '';
    setAdminOtpError('');
    setAdminOtpLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/admin/request-inventory-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channel: inventoryOtpChannel })
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminOtpError(data.error || 'Could not send the inventory authorization OTP.');
        return false;
      }
      setInventoryOtpSent(true);
      showToast(`Inventory OTP sent to your ${inventoryOtpChannel}.`);
      return true;
    } catch {
      setAdminOtpError('Could not connect to the OTP service.');
      return false;
    } finally {
      setAdminOtpLoading(false);
    }
  };

  const inventoryOtpFields = () => ({
    adminTarget: inventoryOtpChannel === 'phone' ? currentUser?.phone : currentUser?.email,
    otp: inventoryOtp.trim()
  });

  const handleRestrictionToggle = async (user: any) => {
    const nextStatus = user.status === 'restricted' ? 'active' : 'restricted';
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('iw_delivery_token') || ''}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not update account access.');
        return;
      }
      setUsers((prev) => prev.map((item) => (item.id === user.id ? data.user : item)));
      setSelectedUser(data.user);
      showToast(`${user.name} is now ${nextStatus}.`);
    } catch {
      showToast('Could not connect while updating account access.');
    }
  };

  // Delete User
  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${name}?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('iw_delivery_token') || ''}` }
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not remove the account.');
        return;
      }
      if (res.ok) {
        showToast(`Revoked access for ${name}`);
        setUsers(users.filter((u) => u.id !== id));
        setSelectedUser(null);
      }
    } catch {
      showToast('Error removing user account.');
    }
  };

  // Add Single Drone
  const handleAddSingleDrone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryOtpSent || !inventoryOtp.trim()) {
      setAdminOtpError('Request and enter the administrator OTP before adding a drone.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('iw_delivery_token') || ''}`
        },
        body: JSON.stringify({
          ...inventoryOtpFields(),
          id: newDroneId.trim(),
          model: newDroneModel,
          serial_number: newDroneSerial || undefined,
          image_url: newDroneImage,
          current_city: newDroneCity,
          battery: newDroneBattery,
          payload_kg: newDronePayload
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddSingleDrone(false);
        setNewDroneSerial('');
        setNewDroneId('');
        setNewDroneImage('');
        setInventoryOtp('');
        setInventoryOtpSent(false);
        showToast(`Drone ${data.drone?.id} added to fleet!`);
        await fetchData();
      } else setAdminOtpError(data.error || 'Could not add drone.');
    } catch {
      setAdminOtpError('Connection error adding drone.');
    }
  };

  // Bulk Add Drones (50, 100, 250, 500, 1000)
  const handleBulkAddDrones = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkImportError) return;
    if (bulkCount < 1) {
      alert('Please specify at least 1 drone.');
      return;
    }
    if (!inventoryOtpSent || !inventoryOtp.trim()) {
      setAdminOtpError('Request and enter the administrator OTP before adding inventory.');
      return;
    }
    setBulkSubmitting(true);
    try {
      let drones: DroneImportRow[] | undefined = bulkRows.length ? bulkRows : undefined;
      if (!drones && bulkManualRows.trim()) {
        const manualFile = new File([bulkManualRows], 'manual-drones.csv', { type: 'text/csv' });
        drones = await parseDroneImportFile(manualFile);
      }
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('iw_delivery_token') || ''}`
        },
        body: JSON.stringify({
          ...inventoryOtpFields(),
          drones,
          count: bulkCount,
          model: bulkModel,
          prefix: bulkPrefix,
          current_city: bulkCity
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowBulkDroneModal(false);
        setInventoryOtp('');
        setInventoryOtpSent(false);
        setBulkRows([]);
        setBulkManualRows('');
        showToast(`Successfully provisioned batch of ${data.count} drones!`);
        await fetchData();
      } else setBulkImportError(data.error || 'Could not add the drone batch.');
    } catch (err) {
      setBulkImportError(err instanceof Error ? err.message : 'Could not read the bulk import.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleEditDrone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDrone || !inventoryOtpSent || !inventoryOtp.trim()) {
      setAdminOtpError('Request and enter the administrator OTP before saving changes.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones/${encodeURIComponent(editingDrone.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('iw_delivery_token') || ''}`
        },
        body: JSON.stringify({
          ...inventoryOtpFields(),
          model: editingDrone.model,
          serial_number: editingDrone.serial_number,
          image_url: editingDroneImage,
          current_city: editingDrone.current_city,
          payload_kg: editingDrone.payload_kg
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminOtpError(data.error || 'Could not save drone changes.');
        return;
      }
      setEditingDrone(null);
      setInventoryOtp('');
      setInventoryOtpSent(false);
      showToast(`Drone ${data.drone.id} updated.`);
      await fetchData();
    } catch {
      setAdminOtpError('Connection error saving drone changes.');
    }
  };

  // Toggle Drone QC Status
  const handleToggleDroneQC = async (droneId: string, currentQC: string) => {
    const nextQC = currentQC === 'passed' ? 'inspection_required' : 'passed';
    try {
      await fetch(`${API_BASE_URL}/api/delivery/drones/${droneId}/qc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('iw_delivery_token') || ''}`
        },
        body: JSON.stringify({
          qc_status: nextQC,
          qc_certified_by: currentUser?.name || 'Super Admin'
        })
      });
      showToast(`Drone ${droneId} QC updated to ${nextQC}`);
      await fetchData();
    } catch {}
  };

  // Update Support Ticket Status
  const handleUpdateSupportStatus = async (ticketId: string, status: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/delivery/support/expert-requests/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      showToast(`Inquiry status updated to ${status.toUpperCase()}`);
      await fetchData();
    } catch {}
  };

  // Dispatch Drones to Client
  const handleDispatchDrones = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchClient.trim() || !dispatchAddress.trim()) {
      alert('Client Name and Destination Delivery Address are required.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: dispatchClient.trim(),
          recipient_name: dispatchContact.trim() || dispatchClient.trim(),
          customer_phone: dispatchPhone.trim(),
          destination_address: dispatchAddress.trim(),
          drone_model: dispatchModel,
          units_count: Number(dispatchUnits) || 1,
          carrier: dispatchCarrier,
          delivery_notes: dispatchNotes.trim()
        })
      });
      if (res.ok) {
        setShowDispatchModal(false);
        setDispatchClient('');
        setDispatchContact('');
        setDispatchPhone('');
        setDispatchAddress('');
        showToast(`Dispatched ${dispatchUnits}x ${dispatchModel} to ${dispatchClient}!`);
        await fetchData();
      }
    } catch {}
  };

  // Filtered Lists
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.phone || '').includes(searchQuery);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredDrones = drones.filter((d) => {
    if (droneFilter === 'all') return true;
    if (droneFilter === 'qc_passed') return d.qc_status === 'passed';
    if (droneFilter === 'qc_pending') return d.qc_status !== 'passed';
    return d.status === droneFilter;
  });

  const filteredSupport = expertRequests.filter((s) => {
    if (supportFilter === 'all') return true;
    return s.status === supportFilter;
  });

  const activeShipmentsCount = orders.filter((o) => o.status !== 'delivered').length;
  const completedHandoversCount = orders.filter((o) => o.status === 'delivered').length;
  const qcCertifiedCount = drones.filter((d) => d.qc_status === 'passed').length;
  const activeAccountsCount = users.filter((user) => user.status === 'active').length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pt-24 sm:pt-28 pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#3b0080] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ── MAIN WORKSPACE CONTAINER WITH STICKY SIDEBAR ────────────────── */}
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* ═════════════════════════════════════════════════════════════════
 LEFT SIDEBAR: STUCK (STICKY), MAIN CONTENT SCROLLS BESIDE IT
 ═════════════════════════════════════════════════════════════════ */}
          <aside className="w-full md:w-60 lg:w-64 xl:w-72 shrink-0 md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-6.5rem)] md:overflow-y-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-5">
              {/* Sidebar Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#3b0080] flex items-center justify-center font-black shadow-xs shrink-0">
                  <Shield className="w-5 h-5 text-[#3b0080]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">Super Admin Desk</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">IndoWings Operations</p>
                </div>
              </div>

              {/* Navigation Menu Links */}
              <nav className="space-y-1.5 text-xs font-bold">
                {[
                  { id: 'overview', label: 'Dashboard', icon: Layers, badge: null },
                  { id: 'personnel', label: 'Users', icon: Users, badge: users.length },
                  { id: 'provision', label: 'Add User', icon: UserPlus, badge: null },
                  { id: 'fleet', label: 'Drones', icon: Truck, badge: drones.length },
                  { id: 'secure-dispatch', label: 'Secure Dispatch', icon: Truck, badge: orders.length },
                  { id: 'delivery', label: 'Delivery Tracking', icon: Package, badge: orders.filter(order => !['delivered', 'cancelled'].includes(order.status)).length },
                  { id: 'dispatch', label: 'Dispatch History', icon: Package, badge: orders.length },
                  { id: 'support', label: 'Support', icon: Headphones, badge: expertRequests.length }
                ].map(({ id, label, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => {
                      if (id === 'provision') resetProvisioningForm();
                      setActiveTab(id as typeof activeTab);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all text-left cursor-pointer group ${
                      activeTab === id ? 'bg-[#3b0080] text-white shadow-md shadow-purple-900/10 font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${activeTab === id ? 'text-white' : 'text-slate-400 group-hover:text-[#3b0080]'}`} />
                      <span className="truncate">{label}</span>
                    </div>
                    {badge !== null && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 ${activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{badge}</span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Sidebar shortcuts */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => {
                    setActiveTab('profile');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-purple-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-purple-700" />
                    My Profile
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Current User Card at bottom of Sidebar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setActiveTab('profile');
                  }}
                  title="Open admin profile"
                  className="flex items-center gap-2.5 min-w-0 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b0080] to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    {currentUser?.name?.[0]?.toUpperCase() || 'P'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || 'Puneet Kushwaha'}</p>
                    <p className="text-[10px] text-purple-700 font-semibold truncate">Super Admin</p>
                  </div>
                </button>

                <button onClick={onLogout} title="Logout" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
          {/* ═════════════════════════════════════════════════════════════════
 RIGHT CONTENT WORKSPACE
 ═════════════════════════════════════════════════════════════════ */}
          <main className="flex-1 min-w-0 w-full space-y-6">
            {/* ANALYTICS DASHBOARD — data-driven business overview */}
            {activeTab === 'overview' && (
              <AnalyticsDashboard currentUser={currentUser} onQuickAction={(tab) => setActiveTab(tab as typeof activeTab)} />
            )}
            {activeTab === 'secure-dispatch' && <DroneDispatchModule currentUser={currentUser} embedded />}
            {activeTab === 'delivery' && <DeliveryTrackingModule currentUser={currentUser} />}
            {activeTab === 'profile' && <ProfilePage onNavigate={onNavigate} currentUser={currentUser} onUpdateUser={onUpdateUser} embedded onBack={() => setActiveTab('overview')} />}

            {/* ── TAB 1: OUTBOUND DRONE SHIPMENTS (operational supplement) ──── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Outbound Drone Shipments Table */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Live Outbound Drone Shipments to Clients</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Tracking manufactured UAV units dispatched to enterprise, defense &amp; agriculture clients</p>
                    </div>
                    <button
                      onClick={() => setShowDispatchModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#3b0080] hover:bg-[#2e0066] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Dispatch Drones to Client</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                          <th className="py-3 px-4">Consignment ID</th>
                          <th className="py-3 px-4">Client / Enterprise</th>
                          <th className="py-3 px-4">Drones Shipped</th>
                          <th className="py-3 px-4">Destination Facility</th>
                          <th className="py-3 px-4">Carrier Mode</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orders.slice(0, 10).map((o) => (
                          <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-[#3b0080]">{o.id}</span>
                              {o.challan_number && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{o.challan_number}</p>}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-800">{o.client_name || o.customer_name || 'Enterprise Client'}</td>
                            <td className="py-3 px-4 font-semibold text-purple-900">{o.drones_shipped || o.package_type || 'UAV Hardware Consignment'}</td>
                            <td className="py-3 px-4 text-slate-600 truncate max-w-[200px]">{o.destination_address || o.drop_address || 'Client Facility'}</td>
                            <td className="py-3 px-4 text-slate-500 font-medium">{o.carrier || 'IndoWings Fleet Van'}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  o.status === 'delivered'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ['in-flight', 'in_transit', 'assigned'].includes(o.status)
                                      ? 'bg-sky-100 text-sky-800'
                                      : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {o.status === 'delivered' ? 'Delivered & Accepted' : 'In Transit'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  onNavigate('track');
                                  window.history.pushState({}, '', `/track?id=${o.id}`);
                                }}
                                className="text-[#3b0080] hover:underline font-bold text-[11px]"
                              >
                                Track Shipment &rarr;
                              </button>
                            </td>
                          </tr>
                        ))}
                        {orders.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              No drone shipments dispatched yet. Click "Dispatch Drones to Client" to ship UAVs.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: PERSONNEL MANAGEMENT DIRECTORY ────────────────────── */}
            {activeTab === 'personnel' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search personnel by name, email, or mobile..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#3b0080]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white">
                      <option value="all">All Roles</option>
                      <option value="admin">Super Admin</option>
                      <option value="fleet_manager">Fleet Manager</option>
                      <option value="dispatcher">Dispatcher</option>
                      <option value="support">Support Specialist</option>
                      <option value="customer">Customer</option>
                    </select>

                    <button
                      onClick={() => {
                        resetProvisioningForm();
                        setActiveTab('provision');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#3b0080] hover:bg-[#2e0066] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add New Member</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                          <th className="py-3 px-4">User ID &amp; Name</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Contact (Email &amp; Mobile)</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((u) => (
                          <tr key={u.id} onClick={() => setSelectedUser(u)} className="hover:bg-slate-50/60 transition-colors cursor-pointer">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#3b0080] font-black flex items-center justify-center shrink-0">{u.name?.[0]?.toUpperCase() || 'U'}</div>
                                <div>
                                  <p className="font-bold text-slate-900">{u.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{u.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                  u.role === 'admin'
                                    ? 'bg-purple-100 text-[#3b0080]'
                                    : u.role === 'fleet_manager'
                                      ? 'bg-amber-100 text-amber-800'
                                      : u.role === 'dispatcher'
                                        ? 'bg-sky-100 text-sky-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {u.role.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-slate-800">{u.email}</p>
                              <p className="text-[11px] text-slate-400">{u.phone || 'No mobile'}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                  u.status === 'restricted' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {u.status === 'restricted' ? 'Restricted' : u.status === 'active' ? 'Active' : u.status || 'Pending'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUser(u);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#3b0080] hover:bg-purple-50 transition-colors cursor-pointer"
                                title="View account details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {u.id === currentUser?.id || u.email === currentUser?.email ? (
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Protected</span>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUser(u.id, u.name);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Delete account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: PROVISION TEAM MEMBER (SIMPLE LANGUAGE) ───────────── */}
            {activeTab === 'provision' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Add New Team Member</h2>
                  <p className="text-xs text-slate-500 mt-1">Enter details below. Verify with your Admin OTP to activate the account and email them credentials with next steps.</p>
                </div>

                {/* Success Card when created */}
                {provisioningSuccess ? (
                  <div className="bg-white border border-emerald-200 rounded-3xl p-8 text-center shadow-sm space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl border border-emerald-100">
                      <Check className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">{provisioningSuccess.emailSent ? 'Account Created &amp; Credentials Emailed!' : 'Account Created — Email Delivery Failed'}</h3>
                    <p className="text-slate-600 text-sm max-w-md mx-auto">
                      Account provisioned for <strong>{provisioningSuccess.name}</strong> ({provisioningSuccess.role}).{' '}
                      {provisioningSuccess.emailSent ? 'Credentials and onboarding steps were emailed to:' : 'Email delivery failed. Share the temporary credentials securely with:'}
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-md mx-auto text-left text-xs space-y-2 font-mono">
                      <p>
                        <span className="text-slate-400 font-bold font-sans">User ID:</span> {provisioningSuccess.id}
                      </p>
                      <p>
                        <span className="text-slate-400 font-bold font-sans">Login Email:</span> {provisioningSuccess.email}
                      </p>
                      <p>
                        <span className="text-slate-400 font-bold font-sans">Temporary Pass:</span> {provTempPass || '••••••••'}
                      </p>
                      <p>
                        <span className="text-slate-400 font-bold font-sans">First-Time Action:</span> User will be prompted to verify identity via OTP and set a permanent password.
                      </p>
                    </div>
                    <div className="pt-2 flex justify-center gap-3">
                      <button onClick={resetProvisioningForm} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer">
                        Add Another Member
                      </button>
                      <button onClick={() => setActiveTab('personnel')} className="px-5 py-2.5 rounded-xl bg-[#3b0080] hover:bg-[#2e0066] text-white font-bold text-xs cursor-pointer shadow-sm">
                        View Directory
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                    <form onSubmit={handleProvisionUser} className="space-y-5">
                      <div className="space-y-4">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-[#3b0080] flex items-center justify-center text-xs">1</span>
                          Member Details
                        </h3>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name *</label>
                          <input
                            type="text"
                            required
                            value={provName}
                            onChange={(e) => setProvName(e.target.value)}
                            placeholder="e.g. Ramesh Chandra"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3b0080]"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Corporate Email Address *</label>
                            <input
                              type="email"
                              required
                              value={provEmail}
                              onChange={(e) => setProvEmail(e.target.value)}
                              placeholder="e.g. ramesh@indowings.com"
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#3b0080]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Phone *</label>
                            <PhoneInput value={provPhone} onChange={(v) => setProvPhone(v)} required maxLength={15} placeholder="e.g. 9876543210" size="sm" inputClassName="text-sm" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Assigned Operational Role *</label>
                          <select
                            value={provRole}
                            onChange={(e) => setProvRole(e.target.value as any)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:outline-none focus:border-[#3b0080]"
                          >
                            <option value="dispatcher">Dispatcher (Outbound Drone Shipments &amp; Consignments)</option>
                            <option value="fleet_manager">Fleet &amp; QC Manager (Drone Inventory &amp; Hardware Certification)</option>
                            <option value="support">Support Desk Officer (Customer Inquiries &amp; Assistance)</option>
                            <option value="customer">Customer (Drone Storefront &amp; Order Tracking)</option>
                            <option value="admin">Super Admin (Full Control Over Entire System)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Temporary Initial Password</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={provTempPass}
                              onChange={(e) => setProvTempPass(e.target.value)}
                              placeholder="Enter initial temporary passkey (min 6 chars)"
                              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#3b0080] bg-slate-50/50"
                            />
                            <button
                              type="button"
                              onClick={() => setProvTempPass('IW@' + Math.floor(1000 + Math.random() * 9000))}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer"
                            >
                              Generate Passkey
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">User will be required to verify identity and set their permanent password upon first login.</p>
                        </div>
                      </div>

                      {/* Step 2: Admin OTP Verification */}
                      <div className="border-t border-slate-100 pt-5 space-y-4">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-[#3b0080] flex items-center justify-center text-xs">2</span>
                          Admin Authorization (OTP Verification)
                        </h3>

                        <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 space-y-3">
                          <p className="text-xs text-slate-600 leading-relaxed">To authorize creating this account, enter the OTP sent to your registered Admin channel:</p>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setAdminOtpChannel('email');
                                setAdminOtpSent(false);
                              }}
                              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                                adminOtpChannel === 'email' ? 'border-[#3b0080] bg-white text-[#3b0080] shadow-xs' : 'border-purple-200 text-slate-600 bg-transparent'
                              }`}
                            >
                              <p>Admin Email</p>
                              <p className="text-[10px] text-slate-400 font-normal truncate">{currentUser?.email || 'No admin email on account'}</p>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setAdminOtpChannel('phone');
                                setAdminOtpSent(false);
                              }}
                              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                                adminOtpChannel === 'phone' ? 'border-[#3b0080] bg-white text-[#3b0080] shadow-xs' : 'border-purple-200 text-slate-600 bg-transparent'
                              }`}
                            >
                              <p>Admin Phone</p>
                              <p className="text-[10px] text-slate-400 font-normal truncate">{currentUser?.phone || 'No admin phone on account'}</p>
                            </button>
                          </div>

                          {!adminOtpSent ? (
                            <button
                              type="button"
                              onClick={handleRequestAdminOtp}
                              disabled={adminOtpLoading}
                              className="w-full py-2.5 rounded-xl bg-[#3b0080] hover:bg-[#2c0060] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {adminOtpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                              <span>Send Admin Security OTP</span>
                            </button>
                          ) : (
                            <div className="space-y-2 pt-1">
                              <label className="block text-[11px] font-bold uppercase text-slate-500">Enter 6-Digit Admin OTP</label>
                              <input
                                type="text"
                                maxLength={6}
                                value={adminOtp}
                                onChange={(e) => setAdminOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder="Enter 6-Digit OTP"
                                className="w-full px-4 py-2.5 rounded-xl border border-purple-300 text-sm font-mono tracking-widest text-center focus:outline-none focus:border-[#3b0080] bg-white font-bold"
                              />
                            </div>
                          )}
                        </div>

                        {adminOtpError && (
                          <p className="text-xs text-red-600 font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{adminOtpError}</span>
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <button type="button" onClick={resetProvisioningForm} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
                            Reset Form
                          </button>

                          <button
                            type="submit"
                            disabled={adminOtpLoading || !adminOtp.trim() || !provName.trim() || !provEmail.trim() || !provTempPass.trim()}
                            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-900/10 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {adminOtpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>Authorize &amp; Create Member</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 4: FLEET & INVENTORY (500 TO 1000+ BULK PROVISIONING) ─ */}
            {activeTab === 'fleet' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <select value={droneFilter} onChange={(e) => setDroneFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white">
                      <option value="all">All Fleet UAVs</option>
                      <option value="qc_passed">QC Certified Only</option>
                      <option value="qc_pending">Inspection Required</option>
                      <option value="idle">Ready in Factory</option>
                      <option value="en-route">In Transit / Dispatched</option>
                    </select>
                    <span className="text-xs text-slate-400 font-semibold">{filteredDrones.length} UAV units listed</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddSingleDrone(true)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+1 Single Drone</span>
                    </button>

                    <button
                      onClick={() => setShowBulkDroneModal(true)}
                      className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Bulk Batch Add (50 to 1000+)</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                          <th className="py-3 px-4">Photo</th>
                          <th className="py-3 px-4">Drone ID &amp; Serial</th>
                          <th className="py-3 px-4">Model</th>
                          <th className="py-3 px-4">Battery</th>
                          <th className="py-3 px-4">QC Airworthiness</th>
                          <th className="py-3 px-4">Plant Base</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredDrones.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4">
                              {d.image_url ? (
                                <img src={d.image_url} alt={d.model} className="h-10 w-14 rounded-lg object-cover" />
                              ) : (
                                <div className="h-10 w-14 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
                                  <ImageIcon className="h-4 w-4" />
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-mono font-bold text-slate-900">{d.id}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{d.serial_number}</p>
                            </td>
                            <td className="py-3 px-4 font-bold text-[#3b0080]">{d.model}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">{d.battery}%</span>
                                <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div className={`h-1.5 rounded-full ${d.battery > 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${d.battery}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  d.qc_status === 'passed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {d.qc_status === 'passed' ? '✓ Passed' : 'Inspection Required'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{d.current_city || 'Noida Plant'}</td>
                            <td className="py-3 px-4">
                              <span className="capitalize font-semibold text-slate-700">{d.status}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  setEditingDrone({ ...d });
                                  setEditingDroneImage(d.image_url || '');
                                  setInventoryOtpSent(false);
                                  setInventoryOtp('');
                                  setAdminOtpError('');
                                }}
                                className="mr-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border border-slate-200 hover:bg-purple-50 hover:text-[#3b0080] transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleDroneQC(d.id, d.qc_status)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border border-slate-200 hover:bg-purple-50 hover:text-[#3b0080] transition-colors cursor-pointer"
                              >
                                Toggle QC Status
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 5: CLIENT DRONE DISPATCHES & SHIPMENTS ───────────────── */}
            {activeTab === 'dispatch' && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Drone Shipments &amp; Client Consignments</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Ship manufactured UAV batches to enterprise and defense clients with verified technical handover challans.</p>
                  </div>
                  <button
                    onClick={() => setShowDispatchModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#3b0080] hover:bg-[#2c0060] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Dispatch Drones to Client</span>
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                          <th className="py-3 px-4">Consignment &amp; Challan</th>
                          <th className="py-3 px-4">Client / Enterprise</th>
                          <th className="py-3 px-4">Drones Dispatched</th>
                          <th className="py-3 px-4">Destination Facility</th>
                          <th className="py-3 px-4">Carrier Mode</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orders.map((o) => (
                          <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-mono font-bold text-[#3b0080]">{o.id}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{o.challan_number || 'CHL-2026-9021'}</p>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {o.client_name || o.customer_name || 'Enterprise Client'}
                              {o.recipient_phone && <p className="text-[10px] text-slate-400 font-normal">{o.recipient_phone}</p>}
                            </td>
                            <td className="py-3 px-4 font-bold text-purple-900">{o.drones_shipped || o.package_type || 'UAV Units'}</td>
                            <td className="py-3 px-4 text-slate-600 truncate max-w-[200px]">{o.destination_address || o.drop_address}</td>
                            <td className="py-3 px-4 text-slate-500 font-medium">{o.carrier || 'IndoWings Fleet Van'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${o.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                                {o.status === 'delivered' ? 'Delivered & Accepted' : 'In Transit'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  onNavigate('track');
                                  window.history.pushState({}, '', `/track?id=${o.id}`);
                                }}
                                className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-[#3b0080] hover:bg-purple-50 font-bold text-[11px] cursor-pointer"
                              >
                                Track &rarr;
                              </button>
                            </td>
                          </tr>
                        ))}
                        {orders.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              No drone shipments created yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'support' && (
              <SupportDeskPage currentUser={currentUser} onNavigate={onNavigate} onLogout={onLogout} embedded />
            )}
          </main>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedUser.name}</h3>
                <p className="text-xs font-mono text-slate-500">{selectedUser.id}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-[10px] uppercase text-slate-400">Role</span>
                <strong className="capitalize">{String(selectedUser.role || '').replace('_', ' ')}</strong>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-[10px] uppercase text-slate-400">Account status</span>
                <strong className={selectedUser.status === 'active' ? 'text-emerald-700' : 'text-rose-700'}>{selectedUser.status || 'Pending'}</strong>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-[10px] uppercase text-slate-400">Email</span>
                <strong className="break-all">{selectedUser.email || '—'}</strong>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-[10px] uppercase text-slate-400">Phone</span>
                <strong>{selectedUser.phone || '—'}</strong>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-[10px] uppercase text-slate-400">Station</span>
                <strong>{selectedUser.station || '—'}</strong>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="block text-[10px] uppercase text-slate-400">Organization</span>
                <strong>{selectedUser.organization || '—'}</strong>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
                <span className="block text-[10px] uppercase text-slate-400">Created</span>
                <strong>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : '—'}</strong>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              {selectedUser.id !== currentUser?.id && selectedUser.email !== currentUser?.email && (
                <>
                  <button
                    onClick={() => handleRestrictionToggle(selectedUser)}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50"
                  >
                    {selectedUser.status === 'restricted' ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    {selectedUser.status === 'restricted' ? 'Unrestrict account' : 'Restrict account'}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(selectedUser.id, selectedUser.name)}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {editingDrone && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleEditDrone} className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Drone</h3>
                <p className="text-xs text-slate-500">{editingDrone.id}</p>
              </div>
              <button type="button" onClick={() => setEditingDrone(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="block text-xs font-bold text-slate-700">
              Drone Name / Model
              <input
                required
                value={editingDrone.model || ''}
                onChange={(e) => setEditingDrone({ ...editingDrone, model: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Serial Number *
              <input
                required
                value={editingDrone.serial_number || ''}
                onChange={(e) => setEditingDrone({ ...editingDrone, serial_number: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Plant / Location
              <input
                value={editingDrone.current_city || ''}
                onChange={(e) => setEditingDrone({ ...editingDrone, current_city: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Payload (kg)
              <input
                type="number"
                min="0"
                value={editingDrone.payload_kg || 0}
                onChange={(e) => setEditingDrone({ ...editingDrone, payload_kg: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Drone Photo
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
            {editingDroneImage && <img src={editingDroneImage} alt="Drone preview" className="h-28 w-40 rounded-xl object-cover" />}
            <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3 space-y-2">
              <p className="text-xs font-bold text-purple-900">Verify edit with administrator OTP</p>
              <div className="flex gap-2">
                <select
                  value={inventoryOtpChannel}
                  onChange={(e) => {
                    setInventoryOtpChannel(e.target.value as 'email' | 'phone');
                    setInventoryOtpSent(false);
                  }}
                  className="rounded-lg border border-purple-200 bg-white px-2 py-2 text-xs"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
                <button type="button" onClick={requestInventoryOtp} disabled={adminOtpLoading} className="rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white">
                  {adminOtpLoading ? 'Sending…' : 'Send OTP'}
                </button>
                <input
                  value={inventoryOtp}
                  onChange={(e) => setInventoryOtp(e.target.value)}
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="6-digit OTP"
                  className="min-w-0 flex-1 rounded-lg border border-purple-200 px-3 py-2 text-xs"
                />
              </div>
              {adminOtpError && <p className="text-xs text-rose-600">{adminOtpError}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingDrone(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold">
                Cancel
              </button>
              <button type="submit" disabled={!inventoryOtpSent || !inventoryOtp.trim()} className="rounded-xl bg-[#3b0080] px-5 py-2 text-xs font-bold text-white disabled:opacity-50">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL 1: ADD SINGLE DRONE ──────────────────────────────────── */}
      {showAddSingleDrone && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add Single Drone to Fleet</h3>
              <button onClick={() => setShowAddSingleDrone(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSingleDrone} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Drone Name / Model *</label>
                <input required value={newDroneModel} onChange={(e) => setNewDroneModel(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Drone ID *</label>
                <input required value={newDroneId} onChange={(e) => setNewDroneId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Drone Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readDroneImage(file, setNewDroneImage);
                  }}
                  className="w-full text-xs"
                />
                {newDroneImage && <img src={newDroneImage} alt="Drone preview" className="mt-2 h-24 w-32 rounded-xl object-cover" />}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Custom Serial (Optional)</label>
                <input
                  type="text"
                  value={newDroneSerial}
                  onChange={(e) => setNewDroneSerial(e.target.value)}
                  placeholder="Auto-generated if left blank"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Plant Location</label>
                <input type="text" value={newDroneCity} onChange={(e) => setNewDroneCity(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Battery %</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={newDroneBattery}
                    onChange={(e) => setNewDroneBattery(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payload (kg)</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newDronePayload}
                    onChange={(e) => setNewDronePayload(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3 space-y-2">
                <p className="text-xs font-bold text-purple-900">Confirm with administrator OTP</p>
                <div className="flex gap-2">
                  <select
                    value={inventoryOtpChannel}
                    onChange={(e) => {
                      setInventoryOtpChannel(e.target.value as 'email' | 'phone');
                      setInventoryOtpSent(false);
                    }}
                    className="rounded-lg border border-purple-200 bg-white px-2 py-2 text-xs"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                  </select>
                  <button type="button" onClick={requestInventoryOtp} disabled={adminOtpLoading} className="rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    {adminOtpLoading ? 'Sending…' : 'Send OTP'}
                  </button>
                  <input
                    value={inventoryOtp}
                    onChange={(e) => setInventoryOtp(e.target.value)}
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="6-digit OTP"
                    className="min-w-0 flex-1 rounded-lg border border-purple-200 px-3 py-2 text-xs"
                  />
                </div>
                {adminOtpError && <p className="text-xs text-rose-600">{adminOtpError}</p>}
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddSingleDrone(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inventoryOtpSent || !inventoryOtp.trim() || adminOtpLoading}
                  className="px-5 py-2 rounded-xl bg-[#3b0080] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Add Drone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: BULK BATCH GENERATOR (50 TO 1000+) ──────────────────── */}
      {showBulkDroneModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bulk Drone Inventory</h3>
                <p className="text-xs text-slate-500">Import rows from a file, paste rows, or generate a numbered batch</p>
              </div>
              <button onClick={() => setShowBulkDroneModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBulkAddDrones} className="space-y-4">
              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Import CSV, Excel (.xlsx), text-based PDF, or Word (.docx)</label>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.xlsx,.pdf,.docx"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    setBulkImportError('');
                    setBulkRows([]);
                    if (!file) return;
                    try {
                      const rows = await parseDroneImportFile(file);
                      setBulkRows(rows);
                      setBulkCount(rows.length);
                      showToast(`${rows.length} drone rows ready for review.`);
                    } catch (err) {
                      setBulkImportError(err instanceof Error ? err.message : 'Could not parse this file.');
                    }
                  }}
                  className="w-full text-xs"
                />
                <p className="text-[11px] text-slate-500">
                  Required header: Drone Name or Model. Optional: Drone ID, Serial Number, Image URL, City. PDF must be text-based and comma-delimited; scanned/image-only PDFs are not supported.
                </p>
                {bulkRows.length > 0 && <p className="text-xs font-bold text-emerald-700">{bulkRows.length} imported drones ready to add.</p>}
                <label className="block text-xs font-bold text-slate-700">Or enter rows manually (header + one drone per line)</label>
                <textarea
                  value={bulkManualRows}
                  onChange={(e) => {
                    setBulkManualRows(e.target.value);
                    setBulkImportError('');
                    if (e.target.value) setBulkRows([]);
                  }}
                  rows={4}
                  placeholder={'Drone Name,Drone ID,Serial Number,City\nCyberone Pro,IW-UAV-101,IW-SN-101,Noida'}
                  className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs"
                />
                {bulkImportError && <p className="text-xs text-rose-600">{bulkImportError}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Batch Quantity Presets</label>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {[50, 100, 250, 500, 1000].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setBulkCount(qty)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        bulkCount === qty ? 'bg-[#3b0080] text-white border-[#3b0080]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Manufactured UAV Model</label>
                <select value={bulkModel} onChange={(e) => setBulkModel(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold">
                  <option value="Cyberone Pro">Cyberone Pro (Standard Long-Range)</option>
                  <option value="Cyberone Max">Cyberone Max (Heavy Cargo &amp; Defense)</option>
                  <option value="IndoHawk Alpha">IndoHawk Alpha (High-Speed Patrol)</option>
                  <option value="StealthPro VTOL">StealthPro VTOL (Long Endurance Hybrid)</option>
                  <option value="AgriWing X">AgriWing X (Agricultural Payload)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Serial Number Prefix</label>
                <input
                  type="text"
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value)}
                  placeholder="e.g. IW-UAV-BATCH"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-bold"
                />
              </div>

              <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100 text-xs text-purple-900">
                <p className="font-bold">Automated Batch Action:</p>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  {bulkRows.length || bulkManualRows.trim()
                    ? `Adds ${bulkRows.length || 'manually entered'} drone records from the import above.`
                    : `Generates ${bulkCount} unique manufactured UAV units with pre-dispatch QC clearance and adds them to plant inventory.`}
                </p>
              </div>

              <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3 space-y-2">
                <p className="text-xs font-bold text-purple-900">Confirm inventory change with administrator OTP</p>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={inventoryOtpChannel}
                    onChange={(e) => {
                      setInventoryOtpChannel(e.target.value as 'email' | 'phone');
                      setInventoryOtpSent(false);
                    }}
                    className="rounded-lg border border-purple-200 bg-white px-2 py-2 text-xs"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                  </select>
                  <button type="button" onClick={requestInventoryOtp} disabled={adminOtpLoading} className="rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    {adminOtpLoading ? 'Sending…' : 'Send OTP'}
                  </button>
                  <input
                    value={inventoryOtp}
                    onChange={(e) => setInventoryOtp(e.target.value)}
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="6-digit OTP"
                    className="min-w-0 flex-1 rounded-lg border border-purple-200 px-3 py-2 text-xs"
                  />
                </div>
                {adminOtpError && <p className="text-xs text-rose-600">{adminOtpError}</p>}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowBulkDroneModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting || !inventoryOtpSent || !inventoryOtp.trim() || Boolean(bulkImportError)}
                  className="px-5 py-2 rounded-xl bg-[#3b0080] hover:bg-[#280058] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Add {bulkRows.length || (bulkManualRows.trim() ? 'manual' : bulkCount)} Drones</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: DISPATCH DRONES TO CLIENT ─────────────────────────── */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Dispatch Drone Consignment to Client</h3>
                <p className="text-xs text-slate-500">Ship manufactured UAV units with technical handover challan</p>
              </div>
              <button onClick={() => setShowDispatchModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchDrones} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Client / Receiving Organization *</label>
                <input
                  type="text"
                  required
                  value={dispatchClient}
                  onChange={(e) => setDispatchClient(e.target.value)}
                  placeholder="e.g. Indian Army Aviation Wing / Adani Agri Corp"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Receiving Officer / Consignee</label>
                  <input
                    type="text"
                    value={dispatchContact}
                    onChange={(e) => setDispatchContact(e.target.value)}
                    placeholder="e.g. Col. Rajesh Rathore"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                  <PhoneInput value={dispatchPhone} onChange={(v) => setDispatchPhone(v)} placeholder="e.g. 9876543210" size="sm" inputClassName="text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Client Destination / Delivery Facility *</label>
                <input
                  type="text"
                  required
                  value={dispatchAddress}
                  onChange={(e) => setDispatchAddress(e.target.value)}
                  placeholder="e.g. Leh Defense Base Depot, Ladakh"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Drone Model</label>
                  <select value={dispatchModel} onChange={(e) => setDispatchModel(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold">
                    <option value="Cyberone Pro">Cyberone Pro</option>
                    <option value="Cyberone Max">Cyberone Max</option>
                    <option value="StealthPro VTOL">StealthPro VTOL</option>
                    <option value="AgriWing X">AgriWing X</option>
                    <option value="IndoHawk Alpha">IndoHawk Alpha</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity of Units</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={dispatchUnits}
                    onChange={(e) => setDispatchUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Logistics Transport Carrier</label>
                <select value={dispatchCarrier} onChange={(e) => setDispatchCarrier(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold">
                  <option value="IndoWings Secured Fleet Van">IndoWings Secured Fleet Van (Regional)</option>
                  <option value="Dedicated Heavy Freight Cargo Truck">Dedicated Heavy Freight Cargo Truck (Inter-state)</option>
                  <option value="Express Air Cargo Logistics">Express Air Cargo Logistics (National)</option>
                  <option value="Defense Escorted Convoy">Defense Escorted Convoy (Special Clearance)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowDispatchModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#3b0080] hover:bg-[#280058] text-white text-xs font-bold cursor-pointer">
                  Confirm &amp; Dispatch Drones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
