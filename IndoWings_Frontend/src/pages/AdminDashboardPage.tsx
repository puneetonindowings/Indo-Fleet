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
  Menu,
  User,
  UserPlus,
  Loader2,
  Trash2,
  Check,
  Lock,
  ChevronRight,
  ChevronLeft,
  Building2,
  Phone,
  Mail,
  Eye,
  Ban,
  RotateCcw,
  Image as ImageIcon,
  CheckCircle,
  HelpCircle,
  ShoppingBag,
  Copy,
  MapPin,
  Calendar,
  Hash,
  ExternalLink
} from 'lucide-react';
import { DeliveryUser } from '../types';
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data States
  const [users, setUsers] = useState<any[]>([]);
  const [drones, setDrones] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [expertRequests, setExpertRequests] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  // Single Drone Form State
  const [showAddSingleDrone, setShowAddSingleDrone] = useState(false);
  const [newDroneModel, setNewDroneModel] = useState('700RPAV');
  const [newDroneId, setNewDroneId] = useState('');
  const [newDroneSerial, setNewDroneSerial] = useState('');
  const [newDroneImage, setNewDroneImage] = useState('');
  const [newDroneCategory, setNewDroneCategory] = useState('');
  const [newDroneIsVerified, setNewDroneIsVerified] = useState(false);
  const [newDroneCity, setNewDroneCity] = useState('Noida Sector 62 Plant');
  const [newDroneBattery, setNewDroneBattery] = useState(100);
  const [newDronePayload, setNewDronePayload] = useState(5);

  // Edit Drone Form State
  const [editingDrone, setEditingDrone] = useState<any | null>(null);
  const [editingDroneModel, setEditingDroneModel] = useState('');
  const [editingDroneSerial, setEditingDroneSerial] = useState('');
  const [editingDroneImage, setEditingDroneImage] = useState('');
  const [editingDroneCategory, setEditingDroneCategory] = useState('');
  const [editingDroneIsVerified, setEditingDroneIsVerified] = useState(false);

  // Bulk Drone Import State (50, 100, 250, 500, 1000)
  const [showBulkDroneModal, setShowBulkDroneModal] = useState(false);
  const [bulkCount, setBulkCount] = useState(1000);
  const [bulkModel, setBulkModel] = useState('700RPAV');
  const [bulkCategory, setBulkCategory] = useState('General UAV');
  const [bulkPrefix, setBulkPrefix] = useState('INW-700RPAV');
  const [bulkCity, setBulkCity] = useState('Noida Sector 62 Plant');
  const [bulkIsVerified, setBulkIsVerified] = useState(false);
  const [bulkRows, setBulkRows] = useState<DroneImportRow[]>([]);
  const [bulkManualRows, setBulkManualRows] = useState('');
  const [bulkImportError, setBulkImportError] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Admin Security OTP for Fleet & Provisioning
  const [inventoryOtpSent, setInventoryOtpSent] = useState(false);
  const [inventoryOtp, setInventoryOtp] = useState('');
  const [inventoryOtpChannel, setInventoryOtpChannel] = useState<'email' | 'phone'>('email');

  // Simple Team Member Provisioning State
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [droneFilter, setDroneFilter] = useState('all');
  const [droneSearchQuery, setDroneSearchQuery] = useState('');
  const [droneCurrentPage, setDroneCurrentPage] = useState(1);
  const [dronePageSize, setDronePageSize] = useState(50);
  const [supportFilter, setSupportFilter] = useState('all');

  // Drone Shipment Dispatch State (Shipping manufactured drones to clients)
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchClient, setDispatchClient] = useState('');
  const [dispatchContact, setDispatchContact] = useState('');
  const [dispatchPhone, setDispatchPhone] = useState('');
  const [dispatchAddress, setDispatchAddress] = useState('');
  const [dispatchModel, setDispatchModel] = useState('700RPAV');
  const [dispatchUnits, setDispatchUnits] = useState(5);
  const [dispatchCarrier, setDispatchCarrier] = useState('IndoWings Secured Fleet Van');
  const [dispatchNotes, setDispatchNotes] = useState('Pre-dispatch hardware QC verified');

  // Reserved Drone & Customer Booking Inspection
  const [selectedReservedDrone, setSelectedReservedDrone] = useState<any | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const getLinkedOrderForDrone = (drone: any) => {
    if (!drone) return null;
    const assignedId = drone.assigned_order || drone.delivery_data?.assigned_order;
    if (assignedId) {
      const byId = orders.find((o) => o.id === assignedId);
      if (byId) return byId;
    }
    const byReservedList = orders.find((o) => Array.isArray(o.reserved_inventory_ids) && o.reserved_inventory_ids.includes(drone.id));
    if (byReservedList) return byReservedList;
    return null;
  };

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

  // 2. ADMIN PROVISIONS NEW USER DIRECTLY (NO OTP REQUIRED)
  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provName.trim() || !provEmail.trim() || parsePhone(provPhone).national.length < 6 || !provRole) {
      setAdminOtpError('Full Name, valid Email, valid Phone number, and Role are mandatory.');
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
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('iw_delivery_token') || ''}`
        },
        body: JSON.stringify({
          id: newDroneId.trim(),
          model: newDroneModel.trim(),
          serial_number: newDroneSerial.trim() || newDroneId.trim(),
          category: newDroneCategory.trim() || 'General UAV',
          image_url: newDroneImage,
          is_verified: newDroneIsVerified,
          verification_status: newDroneIsVerified ? 'verified' : 'unverified',
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
        setNewDroneCategory('');
        setNewDroneIsVerified(false);
        setInventoryOtp('');
        setInventoryOtpSent(false);
        showToast(`Drone ${data.drone?.id} added to fleet!`);
        await fetchData();
      } else setAdminOtpError(data.error || 'Could not add drone.');
    } catch {
      setAdminOtpError('Connection error adding drone.');
    }
  };

  // Bulk Add Drones (50, 100, 250, 500, 1000+)
  const handleBulkAddDrones = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkImportError) return;
    if (bulkCount < 1) {
      alert('Please specify at least 1 drone.');
      return;
    }
    setBulkSubmitting(true);
    try {
      let dronesData: DroneImportRow[] | undefined = bulkRows.length ? bulkRows : undefined;
      if (!dronesData && bulkManualRows.trim()) {
        const manualFile = new File([bulkManualRows], 'manual-drones.csv', { type: 'text/csv' });
        dronesData = await parseDroneImportFile(manualFile);
      }
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('iw_delivery_token') || ''}`
        },
        body: JSON.stringify({
          drones: dronesData,
          count: bulkCount,
          model: bulkModel,
          category: bulkCategory || 'General UAV',
          prefix: bulkPrefix,
          current_city: bulkCity,
          is_verified: bulkIsVerified
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
    if (!editingDrone) {
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
          model: editingDroneModel.trim(),
          serial_number: editingDroneSerial.trim() || editingDrone.id,
          category: editingDroneCategory.trim() || 'General UAV',
          image_url: editingDroneImage,
          is_verified: editingDroneIsVerified,
          verification_status: editingDroneIsVerified ? 'verified' : 'unverified',
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
      showToast(`Drone ${data.drone?.id || editingDrone.id} updated in database.`);
      await fetchData();
    } catch {
      setAdminOtpError('Connection error saving drone changes.');
    }
  };

  const openEditDroneModal = (d: any) => {
    setEditingDrone({ ...d });
    setEditingDroneModel(d.model || '');
    setEditingDroneSerial(d.serial_number || d.id || '');
    setEditingDroneImage(d.image_url || '');
    setEditingDroneCategory(d.category || '');
    setEditingDroneIsVerified(d.is_verified === true || d.verification_status === 'verified');
    setInventoryOtpSent(false);
    setInventoryOtp('');
    setAdminOtpError('');
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
    const isVerified = d.is_verified === true || d.verification_status === 'verified';
    const isReserved = d.status === 'reserved' || d.status === 'en-route' || Boolean(d.assigned_order) || Boolean(d.delivery_data?.assigned_order);
    const isIdle = (d.status === 'idle' || !d.status) && !d.assigned_order && !d.delivery_data?.assigned_order;

    if (droneFilter === 'verified' && !isVerified) return false;
    if (droneFilter === 'unverified' && isVerified) return false;
    if (droneFilter === 'reserved' && !isReserved) return false;
    if (droneFilter === 'idle' && !isIdle) return false;
    if (droneFilter === 'qc_passed' && d.qc_status !== 'passed') return false;
    if (droneFilter === 'qc_pending' && d.qc_status === 'passed') return false;
    if (droneFilter === 'en-route' && d.status !== 'en-route' && d.status !== 'in-flight') return false;

    if (droneSearchQuery.trim()) {
      const q = droneSearchQuery.toLowerCase().trim();
      const matchId = String(d.id || '').toLowerCase().includes(q);
      const matchModel = String(d.model || '').toLowerCase().includes(q);
      const matchSerial = String(d.serial_number || '').toLowerCase().includes(q);
      const matchCat = String(d.category || '').toLowerCase().includes(q);
      const matchCity = String(d.current_city || '').toLowerCase().includes(q);
      const matchOrder = String(d.assigned_order || d.delivery_data?.assigned_order || '').toLowerCase().includes(q);
      if (!matchId && !matchModel && !matchSerial && !matchCat && !matchCity && !matchOrder) return false;
    }
    return true;
  });

  const totalDronePages = Math.max(1, Math.ceil(filteredDrones.length / dronePageSize));
  const paginatedDrones = filteredDrones.slice((droneCurrentPage - 1) * dronePageSize, droneCurrentPage * dronePageSize);

  const filteredSupport = expertRequests.filter((s) => {
    if (supportFilter === 'all') return true;
    return s.status === supportFilter;
  });

  const activeShipmentsCount = orders.filter((o) => o.status !== 'delivered').length;
  const completedHandoversCount = orders.filter((o) => o.status === 'delivered').length;
  const qcCertifiedCount = drones.filter((d) => d.qc_status === 'passed').length;
  const verifiedDronesCount = drones.filter((d) => d.is_verified === true || d.verification_status === 'verified').length;
  const unverifiedDronesCount = drones.length - verifiedDronesCount;
  const reservedDrones = drones.filter((d) => d.status === 'reserved' || d.status === 'en-route' || Boolean(d.assigned_order) || Boolean(d.delivery_data?.assigned_order));
  const reservedDronesCount = reservedDrones.length;
  const idleDronesCount = drones.filter((d) => (d.status === 'idle' || !d.status) && !d.assigned_order && !d.delivery_data?.assigned_order).length;
  const activeAccountsCount = users.filter((user) => user.status === 'active').length;

  const adminNavItems = [
    { id: 'overview', label: 'Dashboard', icon: Layers, badge: null },
    { id: 'personnel', label: 'Users', icon: Users, badge: users.length },
    { id: 'provision', label: 'Add User', icon: UserPlus, badge: null },
    { id: 'fleet', label: 'Inventory', icon: Truck, badge: drones.length },
    { id: 'secure-dispatch', label: 'Secure Dispatch', icon: Truck, badge: orders.length },
    { id: 'delivery', label: 'Delivery Tracking', icon: Package, badge: orders.filter(order => !['delivered', 'cancelled'].includes(order.status)).length },
    { id: 'dispatch', label: 'Dispatch History', icon: Package, badge: orders.length },
    { id: 'support', label: 'Support', icon: Headphones, badge: expertRequests.length }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pt-24 sm:pt-28 pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#5a00b8] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ── MOBILE SLIDE-OVER DRAWER (OFF-CANVAS) ─────────────────────────── */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-[85vw] max-w-[320px] bg-white h-full shadow-2xl flex flex-col justify-between p-5 z-10 animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-black shrink-0">
                    <Shield className="w-4 h-4 text-[#5a00b8]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">Super Admin Desk</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">IndoWings Operations</p>
                  </div>
                </div>

                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1.5 text-xs font-bold">
                {adminNavItems.map(({ id, label, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => {
                      if (id === 'provision') resetProvisioningForm();
                      setActiveTab(id as typeof activeTab);
                      setMobileSidebarOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all text-left cursor-pointer group ${
                      activeTab === id ? 'bg-[#5a00b8] text-white shadow-md shadow-slate-900/10 font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${activeTab === id ? 'text-white' : 'text-slate-400 group-hover:text-[#5a00b8]'}`} />
                      <span className="truncate">{label}</span>
                    </div>
                    {badge !== null && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 ${activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{badge}</span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Profile Shortcut */}
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
            </div>

            {/* Current User Card at bottom */}
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
                  {currentUser?.name?.[0]?.toUpperCase() || 'P'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || 'Puneet Kushwaha'}</p>
                  <p className="text-[10px] text-purple-700 font-semibold truncate">Super Admin</p>
                </div>
              </button>

              <button onClick={onLogout} title="Logout" className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN WORKSPACE CONTAINER WITH STICKY SIDEBAR ────────────────── */}
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* ═════════════════════════════════════════════════════════════════
             LEFT SIDEBAR: STUCK (STICKY) ON DESKTOP (HIDDEN ON MOBILE)
             ═════════════════════════════════════════════════════════════════ */}
          <aside className="hidden md:block w-60 lg:w-64 xl:w-72 shrink-0 md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-6.5rem)] md:overflow-y-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-5">
              {/* Sidebar Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-black shadow-xs shrink-0">
                  <Shield className="w-5 h-5 text-[#5a00b8]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">Super Admin Desk</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">IndoWings Operations</p>
                </div>
              </div>

              {/* Navigation Menu Links */}
              <nav className="space-y-1.5 text-xs font-bold">
                {adminNavItems.map(({ id, label, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => {
                      if (id === 'provision') resetProvisioningForm();
                      setActiveTab(id as typeof activeTab);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all text-left cursor-pointer group ${
                      activeTab === id ? 'bg-[#5a00b8] text-white shadow-md shadow-slate-900/10 font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${activeTab === id ? 'text-white' : 'text-slate-400 group-hover:text-[#5a00b8]'}`} />
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5a00b8] to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
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
            {/* Mobile Drawer Trigger Header Bar */}
            <div className="md:hidden flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-black shrink-0">
                  <Shield className="w-4 h-4 text-[#5a00b8]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900 truncate">Super Admin</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-xs font-bold text-[#5a00b8] truncate">
                      {adminNavItems.find(i => i.id === activeTab)?.label || (activeTab === 'profile' ? 'My Profile' : activeTab)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Tap menu to switch tabs</p>
                </div>
              </div>

              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Menu className="w-4 h-4" />
                <span>Menu</span>
              </button>
            </div>

            {/* ANALYTICS DASHBOARD — data-driven business overview */}
            {activeTab === 'overview' && (
              <AnalyticsDashboard currentUser={currentUser} onQuickAction={(tab) => setActiveTab(tab as typeof activeTab)} />
            )}
            {activeTab === 'secure-dispatch' && <DroneDispatchModule currentUser={currentUser} embedded />}
            {activeTab === 'delivery' && <DeliveryTrackingModule currentUser={currentUser} onNavigate={onNavigate} />}
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
                      className="px-3.5 py-1.5 rounded-xl bg-[#5a00b8] hover:bg-[#2e0066] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
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
                              <span className="font-mono font-bold text-[#5a00b8]">{o.id}</span>
                              {o.challan_number && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{o.challan_number}</p>}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-800">{o.client_name || o.customer_name || 'Enterprise Client'}</td>
                            <td className="py-3 px-4 font-semibold text-slate-900">{o.drones_shipped || o.package_type || 'UAV Hardware Consignment'}</td>
                            <td className="py-3 px-4 text-slate-600 truncate max-w-[200px]">{o.destination_address || o.drop_address || 'Client Facility'}</td>
                            <td className="py-3 px-4 text-slate-500 font-medium">{o.carrier || 'IndoWings Fleet Van'}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  o.status === 'delivered'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : o.status === 'cancelled'
                                      ? 'bg-rose-100 text-rose-800'
                                      : o.status === 'pending'
                                        ? 'bg-amber-100 text-amber-800'
                                        : ['in-flight', 'in_transit', 'assigned', 'taking-off', 'out-for-delivery'].includes(o.status)
                                          ? 'bg-sky-100 text-sky-800'
                                          : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {o.status === 'delivered'
                                  ? 'Delivered & Accepted'
                                  : o.status === 'cancelled'
                                    ? 'Cancelled'
                                    : o.status === 'pending'
                                      ? 'Pending Processing'
                                      : ['in-flight', 'in_transit'].includes(o.status)
                                        ? 'In Flight'
                                        : o.status === 'assigned'
                                          ? 'Assigned / Dispatched'
                                          : o.status || 'Active'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  onNavigate('track');
                                  window.history.pushState({}, '', `/track?id=${o.id}`);
                                }}
                                className="text-[#5a00b8] hover:underline font-bold text-[11px]"
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
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#5a00b8]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white">
                      <option value="all">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="fleet_manager">Fleet Manager</option>
                      <option value="dispatcher">Dispatcher</option>
                      <option value="support">Support</option>
                      <option value="customer">Customer</option>
                    </select>

                    <button
                      onClick={() => {
                        resetProvisioningForm();
                        setActiveTab('provision');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#5a00b8] hover:bg-[#2e0066] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
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
                                <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#5a00b8] font-black flex items-center justify-center shrink-0">{u.name?.[0]?.toUpperCase() || 'U'}</div>
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
                                    ? 'bg-purple-100 text-[#5a00b8]'
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
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#5a00b8] hover:bg-purple-50 transition-colors cursor-pointer"
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
                      <button onClick={() => setActiveTab('personnel')} className="px-5 py-2.5 rounded-xl bg-[#5a00b8] hover:bg-[#2e0066] text-white font-bold text-xs cursor-pointer shadow-sm">
                        View Directory
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                    <form onSubmit={handleProvisionUser} className="space-y-5">
                      <div className="space-y-4">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-[#5a00b8] flex items-center justify-center text-xs">1</span>
                          Member Details
                        </h3>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name *</label>
                          <input
                            type="text"
                            required
                            value={provName}
                            onChange={(e) => setProvName(e.target.value)}
                            placeholder="e.g. Puneet Kushwaha"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5a00b8]"
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
                              placeholder="e.g. puneet.kushwaha@indowings.com"
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5a00b8]"
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
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:outline-none focus:border-[#5a00b8]"
                          >
                            <option value="admin">Admin</option>
                            <option value="fleet_manager">Fleet Manager</option>
                            <option value="dispatcher">Dispatcher</option>
                            <option value="support">Support</option>
                            <option value="customer">Customer</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Initial Password</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={provTempPass}
                              onChange={(e) => setProvTempPass(e.target.value)}
                              placeholder="Enter initial password (min 6 chars)"
                              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#5a00b8] bg-slate-50/50"
                            />
                            <button
                              type="button"
                              onClick={() => setProvTempPass('IW@' + Math.floor(1000 + Math.random() * 9000))}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer"
                            >
                              Generate Password
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">Default temporary password for first login.</p>
                        </div>
                      </div>

                      {adminOtpError && (
                        <p className="text-xs text-red-600 font-bold flex items-center gap-1.5 bg-red-50 p-3 rounded-xl border border-red-200">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{adminOtpError}</span>
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <button type="button" onClick={resetProvisioningForm} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
                          Reset Form
                        </button>

                        <button
                          type="submit"
                          disabled={adminOtpLoading || !provName.trim() || !provEmail.trim() || !provTempPass.trim()}
                          className="px-6 py-3 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white text-xs font-bold shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {adminOtpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          <span>Create Member Account</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 4: FLEET & INVENTORY (SCALE UP TO 1000+ DRONES WITH REAL ID VERIFICATION) ─ */}
            {activeTab === 'fleet' && (
              <div className="space-y-5">
                {/* Top Fleet KPI Metrics Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Fleet UAVs</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">{drones.length} <span className="text-xs font-semibold text-slate-400">/ 1,000 Cap</span></h4>
                      <p className="text-[10px] text-purple-700 font-semibold mt-0.5">Central Inventory</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#5a00b8] flex items-center justify-center font-black">
                      <Truck className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Reserved for Customer Bookings */}
                  <div
                    onClick={() => {
                      setDroneFilter(droneFilter === 'reserved' ? 'all' : 'reserved');
                      setDroneCurrentPage(1);
                    }}
                    className={`border rounded-2xl p-4 shadow-xs flex items-center justify-between cursor-pointer transition-all ${
                      droneFilter === 'reserved'
                        ? 'bg-purple-100/70 border-purple-400 ring-2 ring-purple-400/30'
                        : 'bg-white border-purple-200 hover:border-purple-300 bg-purple-50/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Reserved Drones</p>
                        <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-purple-200 text-purple-800 rounded-md">LIVE</span>
                      </div>
                      <h4 className="text-2xl font-black text-purple-900 mt-1">{reservedDronesCount}</h4>
                      <p className="text-[10px] text-purple-600 font-semibold mt-0.5 flex items-center gap-1">
                        <span>{droneFilter === 'reserved' ? 'Filtered: Reserved Only' : 'Click to inspect bookings'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Available In-Stock */}
                  <div
                    onClick={() => {
                      setDroneFilter(droneFilter === 'idle' ? 'all' : 'idle');
                      setDroneCurrentPage(1);
                    }}
                    className={`border rounded-2xl p-4 shadow-xs flex items-center justify-between cursor-pointer transition-all ${
                      droneFilter === 'idle'
                        ? 'bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-400/30'
                        : 'bg-white border-emerald-200 hover:border-emerald-300 bg-emerald-50/20'
                    }`}
                  >
                    <div>
                      <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Available In-Stock</p>
                      <h4 className="text-2xl font-black text-emerald-800 mt-1">{idleDronesCount}</h4>
                      <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Ready for instant booking</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Hardware Verification */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Verified IDs</p>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">{verifiedDronesCount} <span className="text-xs font-semibold text-slate-400">/ {drones.length}</span></h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">{unverifiedDronesCount} unverified placeholder IDs</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">
                      <Shield className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Filters, Search & Action Buttons */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={droneSearchQuery}
                        onChange={(e) => {
                          setDroneSearchQuery(e.target.value);
                          setDroneCurrentPage(1);
                        }}
                        placeholder="Search by Drone ID, Model, Serial, Order ID..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#5a00b8]"
                      />
                    </div>

                    <select
                      value={droneFilter}
                      onChange={(e) => {
                        setDroneFilter(e.target.value);
                        setDroneCurrentPage(1);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                    >
                      <option value="all">All Fleet UAVs ({drones.length})</option>
                      <option value="reserved">Reserved for Bookings ({reservedDronesCount})</option>
                      <option value="idle">Available / In-Stock ({idleDronesCount})</option>
                      <option value="verified">Verified IDs ({verifiedDronesCount})</option>
                      <option value="unverified">Unverified IDs ({unverifiedDronesCount})</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowAddSingleDrone(true);
                        setNewDroneModel('700RPAV');
                        setNewDroneId('');
                        setNewDroneSerial('');
                        setNewDroneImage('');
                        setNewDroneCategory('');
                        setNewDroneIsVerified(false);
                        setInventoryOtpSent(false);
                        setInventoryOtp('');
                        setAdminOtpError('');
                      }}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+1 Single Drone</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowBulkDroneModal(true);
                        setBulkCount(1000);
                        setBulkModel('700RPAV');
                        setBulkCategory('General UAV');
                        setBulkPrefix('INW-700RPAV');
                        setBulkIsVerified(false);
                        setInventoryOtpSent(false);
                        setInventoryOtp('');
                        setAdminOtpError('');
                      }}
                      className="px-4 py-2 rounded-xl bg-[#5a00b8] hover:bg-[#2e0066] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Bulk Batch Add (50 to 1000+)</span>
                    </button>
                  </div>
                </div>

                {/* Fleet Table */}
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
                          const isReserved = d.status === 'reserved' || Boolean(linked) || Boolean(d.assigned_order) || Boolean(d.delivery_data?.assigned_order);

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
                                {isReserved ? (
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
                                    onClick={() => openEditDroneModal(d)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 hover:bg-purple-50 hover:text-[#5a00b8] hover:border-purple-200 transition-colors cursor-pointer"
                                  >
                                    Edit Details
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredDrones.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400">
                              <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                              <p className="text-sm font-semibold">No drones match your search or filter.</p>
                              <p className="text-xs text-slate-400 mt-0.5">Click "+1 Single Drone" or "Bulk Batch Add (50 to 1000+)" to populate inventory.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
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
                            onClick={() => setDroneCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={droneCurrentPage <= 1}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="px-2.5 font-bold text-slate-700">
                            Page {droneCurrentPage} of {totalDronePages}
                          </span>
                          <button
                            onClick={() => setDroneCurrentPage((p) => Math.min(totalDronePages, p + 1))}
                            disabled={droneCurrentPage >= totalDronePages}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
                              <p className="font-mono font-bold text-[#5a00b8]">{o.id}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{o.challan_number || 'CHL-2026-9021'}</p>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {o.client_name || o.customer_name || 'Enterprise Client'}
                              {o.recipient_phone && <p className="text-[10px] text-slate-400 font-normal">{o.recipient_phone}</p>}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">{o.drones_shipped || o.package_type || 'UAV Units'}</td>
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
                                className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-[#5a00b8] hover:bg-purple-50 font-bold text-[11px] cursor-pointer"
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

      {/* ── MODAL: EDIT DRONE DETAILS & REAL HARDWARE ID ────────────────── */}
      {editingDrone && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleEditDrone} className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Drone Details &amp; Hardware ID</h3>
                <p className="text-xs text-slate-500 font-mono">System Record: {editingDrone.id}</p>
              </div>
              <button type="button" onClick={() => setEditingDrone(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="block text-xs font-bold text-slate-700">
              Drone Name / Model Name *
              <input
                required
                value={editingDroneModel}
                onChange={(e) => setEditingDroneModel(e.target.value)}
                placeholder="e.g. Cyberone Pro"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-[#5a00b8]"
              />
            </label>

            <label className="block text-xs font-bold text-slate-700">
              Hardware Serial / Real Drone ID *
              <input
                required
                value={editingDroneSerial}
                onChange={(e) => setEditingDroneSerial(e.target.value)}
                placeholder="e.g. INW-UAV-REAL-0921"
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
                placeholder="e.g. General UAV, Surveillance, Cargo"
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
                  className="text-xs text-rose-600 font-semibold hover:underline"
                >
                  Remove Photo
                </button>
              </div>
            )}
            {adminOtpError && <p className="text-xs text-rose-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">{adminOtpError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingDrone(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] px-5 py-2 text-xs font-bold text-white cursor-pointer shadow-md shadow-orange-500/20">
                Save Changes to DB
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
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Single Drone to Inventory</h3>
                <p className="text-xs text-slate-500">Provide Model Name, Drone ID, and optional photo</p>
              </div>
              <button onClick={() => setShowAddSingleDrone(false)} className="text-slate-400 hover:text-slate-700">
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
                  placeholder="e.g. Cyberone Pro"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5a00b8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Drone ID *</label>
                <input
                  required
                  value={newDroneId}
                  onChange={(e) => setNewDroneId(e.target.value)}
                  placeholder="e.g. INW-UAV-0001"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#5a00b8]"
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
                  placeholder="e.g. General UAV / Surveillance / Heavy Cargo"
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
                    <button type="button" onClick={() => setNewDroneImage('')} className="text-xs text-rose-600 font-semibold hover:underline">
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {adminOtpError && <p className="text-xs text-rose-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">{adminOtpError}</p>}

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddSingleDrone(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white text-xs font-bold cursor-pointer shadow-md shadow-orange-500/20"
                >
                  Add Drone to Fleet
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
                <h3 className="text-lg font-bold text-slate-900">Bulk Drone Fleet Provisioning</h3>
                <p className="text-xs text-slate-500">Scale inventory up to 1,000+ drones with initial placeholder IDs</p>
              </div>
              <button onClick={() => setShowBulkDroneModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkAddDrones} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Batch Quantity Presets</label>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {[50, 100, 250, 500, 1000].map((qty) => (
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
                  <select value={bulkModel} onChange={(e) => setBulkModel(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold">
                    <option value="700RPAV">700RPAV (Primary Fleet UAV)</option>
                    <option value="Cyberone Pro">Cyberone Pro (Standard Long-Range)</option>
                    <option value="Cyberone Max">Cyberone Max (Heavy Cargo &amp; Defense)</option>
                    <option value="IndoHawk Alpha">IndoHawk Alpha (High-Speed Patrol)</option>
                    <option value="StealthPro VTOL">StealthPro VTOL (Long Endurance Hybrid)</option>
                    <option value="AgriWing X">AgriWing X (Agricultural Payload)</option>
                  </select>
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
                  placeholder="e.g. INW-UAV"
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
                <p className="text-[11px] text-purple-700 pl-6">
                  Recommended: Leave unchecked for initial placeholder batches. Drones will be marked as "Unverified ID", allowing you to edit and verify each unit individually as physical deliveries arrive.
                </p>
              </div>

              {adminOtpError && <p className="text-xs text-rose-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">{adminOtpError}</p>}

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowBulkDroneModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting || Boolean(bulkImportError)}
                  className="px-5 py-2 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-500/20"
                >
                  {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Add Batch of {bulkCount} Drones to DB</span>
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
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#5a00b8] hover:bg-[#280058] text-white text-xs font-bold cursor-pointer">
                  Confirm &amp; Dispatch Drones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: RESERVED DRONE & CUSTOMER ORDER INSPECTION ────────── */}
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
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-black border border-purple-100 shrink-0">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">Reserved Drone Specification</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                        Reserved Unit
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Drone ID <span className="font-mono font-bold text-slate-900">{drone.id}</span> is linked to active booking
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReservedDrone(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drone Hardware Summary Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  {drone.image_url ? (
                    <img src={drone.image_url} alt={drone.model} className="w-16 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                  ) : (
                    <div className="w-16 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{drone.model}</h4>
                    <p className="text-xs text-slate-500 font-mono">Serial: {drone.serial_number || drone.id}</p>
                    <p className="text-[11px] text-slate-400">{drone.category || 'General UAV'} • {drone.current_city || 'Noida Sector 62 Plant'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700">
                    Battery: {drone.battery || 100}%
                  </span>
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700">
                    QC: <strong className="text-emerald-600 uppercase">{drone.qc_status || 'passed'}</strong>
                  </span>
                </div>
              </div>

              {/* Linked Booking Order Details */}
              {linkedOrder ? (
                <div className="space-y-4">
                  <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/40 border border-purple-200/70 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-purple-100">
                      <div>
                        <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Consignment Order ID</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-black text-slate-900 text-base">{linkedOrder.id}</span>
                          <button
                            type="button"
                            onClick={() => copyOrderId(linkedOrder.id)}
                            className="p-1 rounded-lg hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            {copiedText === linkedOrder.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span className="text-[10px]">{copiedText === linkedOrder.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white border border-purple-200 text-purple-800 shadow-2xs uppercase">
                          Status: {linkedOrder.status}
                        </span>
                        {linkedOrder.created_at && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            {new Date(linkedOrder.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Customer & Recipient Grid */}
                    <div className="grid sm:grid-cols-2 gap-4 text-xs">
                      {/* Customer Contact */}
                      <div className="p-3.5 rounded-xl bg-white border border-purple-100 space-y-1.5 shadow-2xs">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <User className="w-3 h-3 text-purple-600" /> Customer Information
                        </p>
                        <p className="font-bold text-slate-900 text-sm">{linkedOrder.customer_name || linkedOrder.client_name || 'Customer'}</p>
                        {linkedOrder.customer_email && (
                          <p className="text-slate-600 flex items-center gap-1.5 font-medium">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <a href={`mailto:${linkedOrder.customer_email}`} className="hover:underline text-purple-700">{linkedOrder.customer_email}</a>
                          </p>
                        )}
                        {linkedOrder.customer_phone && (
                          <p className="text-slate-600 flex items-center gap-1.5 font-medium">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <a href={`tel:${linkedOrder.customer_phone}`} className="hover:underline text-purple-700">{linkedOrder.customer_phone}</a>
                          </p>
                        )}
                      </div>

                      {/* Delivery Address */}
                      <div className="p-3.5 rounded-xl bg-white border border-purple-100 space-y-1.5 shadow-2xs">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-purple-600" /> Delivery Destination
                        </p>
                        <p className="font-bold text-slate-900">
                          {linkedOrder.recipient_name || linkedOrder.customer_name}
                          {linkedOrder.recipient_phone ? <span className="text-slate-500 font-normal ml-1">({linkedOrder.recipient_phone})</span> : null}
                        </p>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          {linkedOrder.drop_address || linkedOrder.destination_address || 'Customer destination'}
                        </p>
                      </div>
                    </div>

                    {/* Order Units & Specification */}
                    <div className="p-3.5 rounded-xl bg-white border border-purple-100 space-y-2 text-xs shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Consignment Summary:</span>
                        <span className="font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          {linkedOrder.units_count || (linkedOrder.reserved_inventory_ids?.length) || 1} Unit(s) Booked
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium">
                        Model: <strong className="text-slate-900">{linkedOrder.drone_model || linkedOrder.package_type || drone.model}</strong>
                      </p>
                      {linkedOrder.delivery_notes && (
                        <p className="text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                          "Notes: {linkedOrder.delivery_notes}"
                        </p>
                      )}
                    </div>

                    {/* All Drones in this Reservation */}
                    {Array.isArray(linkedOrder.reserved_inventory_ids) && linkedOrder.reserved_inventory_ids.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          All Aircraft Reserved Under Order {linkedOrder.id} ({linkedOrder.reserved_inventory_ids.length}):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {linkedOrder.reserved_inventory_ids.map((dId: string) => (
                            <span
                              key={dId}
                              className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold border ${
                                dId === drone.id
                                  ? 'bg-[#5a00b8] text-white border-[#5a00b8] shadow-xs ring-2 ring-orange-400/30'
                                  : 'bg-white text-slate-700 border-purple-200 hover:bg-purple-50 cursor-pointer'
                              }`}
                              onClick={() => {
                                const targetDrone = drones.find((d) => d.id === dId);
                                if (targetDrone) setSelectedReservedDrone(targetDrone);
                              }}
                            >
                              {dId} {dId === drone.id ? '(Active View)' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                  <p className="text-sm font-bold text-amber-900">Assigned Order Record in Transition</p>
                  <p className="text-xs text-amber-700">
                    Order ID <span className="font-mono font-bold">{drone.assigned_order || drone.delivery_data?.assigned_order || 'N/A'}</span> is assigned to this drone unit.
                  </p>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-400 font-medium">
                  {linkedOrder ? 'Live reservation data synced from Supabase' : 'Direct Drone Unit view'}
                </div>
                <div className="flex items-center gap-2">
                  {linkedOrder && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReservedDrone(null);
                        setActiveTab('delivery');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Track In Delivery Module</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedReservedDrone(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
