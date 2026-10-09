import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, Bell, BellOff, CalendarDays, Check, CheckCircle2, Clock3,
  ExternalLink, Eye, KeyRound, Loader2, Mail, MapPin, Navigation,
  Package, Phone, Radio, RefreshCw, Search, Send, ShieldAlert,
  ShieldCheck, Sparkles, Truck, User, UserCheck, UserPlus, UserRound,
  Volume2, VolumeX, X, Zap, ArrowRight, Copy, CheckCheck, Menu, LogOut,
  ChevronRight, Headphones, FileText, CheckSquare, Layers, Shield,
  Filter, ChevronDown, ShoppingBag, ImageIcon, ChevronLeft, Plus, AlertCircle, Edit, Trash2,
  Wrench, Calendar, Pause, Play, RotateCcw, SlidersHorizontal
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { DeliveryUser } from '../types';
import { DeliveryTrackingModule } from './DeliveryTrackingModule';
import { ProfilePage } from './ProfilePage';
import { CustomerOrderLiveMap } from '../components/CustomerOrderLiveMap';

interface DispatchModuleProps {
  currentUser: DeliveryUser | null;
  embedded?: boolean;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

interface DeliveryPartner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  station?: string;
  dl_id?: string;
  vehicle_id?: string;
  status: string;
  active_assigned_count?: number;
}

interface OrderItem {
  model?: string;
  name?: string;
  quantity: number;
  price?: number;
  weight_kg?: number;
  dimensions?: string;
  is_fragile?: boolean;
}

interface DispatchOrder {
  id: string;
  order_number?: string;
  tracking_id?: string;
  creator_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  order_type?: string;
  status: string;
  delivery_core_status?: string;
  created_at: string;
  dispatched_at?: string;
  delivered_at?: string;
  items?: OrderItem[];
  item_name?: string;
  package_weight_kg?: number;
  package_type?: string;
  total_amount?: number;
  payment_method?: string;
  payment_status?: string;
  pickup_address?: string;
  drop_address?: string;
  destination_address?: string;
  destination_location?: { latitude: number; longitude: number };
  pickup_lat?: number;
  pickup_lng?: number;
  drop_lat?: number;
  drop_lng?: number;
  delivery_notes?: string;
  hold_reason?: string;
  held_at?: string;
  held_by?: string;
  cancellation_reason?: string;
  rescheduled_date?: string;
  scheduled_time?: string;
  assigned_pilot_id?: string;
  pilot_assigned?: string;
  pilot_phone?: string;
  drone_id?: string;
  dl_id?: string;
  pilot_acceptance_status?: 'pending_acceptance' | 'accepted' | string;
  pilot_acceptance_otp?: string;
  assigned_by_name?: string;
  assigned_at?: string;
  last_known_location?: string | { lat: number; lng: number };
  current_location_coords?: { lat: number; lng: number };
  location_is_live?: boolean;
  speed_kmh?: number;
  altitude_m?: number;
  heading_deg?: number;
  battery_pct?: number;
  pod_recipient_name?: string;
  pod_signature_url?: string;
}

interface DroneInventoryItem {
  id: string;
  model: string;
  serial_number?: string;
  category?: string;
  image_url?: string;
  battery_level?: number;
  current_city?: string;
  qc_status?: 'passed' | 'inspection_required' | string;
  qc_notes?: string;
  qc_certified_by?: string;
  is_verified?: boolean;
  verification_status?: string;
  payload_kg?: number;
  status?: string;
  assigned_order?: string;
  delivery_data?: {
    assigned_order?: string;
    [key: string]: any;
  };
}

interface DashboardData {
  clients: DeliveryUser[];
  delivery_partners: DeliveryPartner[];
  orders: DispatchOrder[];
  stats: {
    totalOrders: number;
    pendingDispatches: number;
    assignedPendingAccept: number;
    acceptedReadyHandover: number;
    inTransit: number;
    deliveredToday: number;
    availableDrones?: number;
  };
}

const EMPTY_DASHBOARD: DashboardData = {
  clients: [],
  delivery_partners: [],
  orders: [],
  stats: {
    totalOrders: 0,
    pendingDispatches: 0,
    assignedPendingAccept: 0,
    acceptedReadyHandover: 0,
    inTransit: 0,
    deliveredToday: 0,
  }
};

export const DroneDispatchModule: React.FC<DispatchModuleProps> = ({
  currentUser,
  embedded = false,
  onNavigate,
  onLogout
}) => {
  // Navigation & Layout State
  const [activeSidebarTab, setActiveSidebarTab] = useState<'dispatch' | 'tracking' | 'history' | 'inventory' | 'profile'>('dispatch');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Core Data
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [fleet, setFleet] = useState<DroneInventoryItem[]>([]);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<DispatchOrder | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'assigned' | 'accepted' | 'in-transit' | 'on-hold' | 'rescheduled' | 'delivered' | 'cancelled'>('all');
  const [historySearch, setHistorySearch] = useState('');

  // Fleet & Inventory State (Matching Admin Dashboard)
  const [droneFilter, setDroneFilter] = useState('all');
  const [droneSearchQuery, setDroneSearchQuery] = useState('');
  const [droneCurrentPage, setDroneCurrentPage] = useState(1);
  const [dronePageSize, setDronePageSize] = useState(50);
  const [selectedReservedDrone, setSelectedReservedDrone] = useState<any | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Single & Bulk Drone Creation/Edit Modal State
  const [showAddSingleDrone, setShowAddSingleDrone] = useState(false);
  const [showBulkDroneModal, setShowBulkDroneModal] = useState(false);
  const [editingDrone, setEditingDrone] = useState<any | null>(null);
  const [newDroneId, setNewDroneId] = useState('');
  const [newDroneModel, setNewDroneModel] = useState('700RPAV');
  const [newDroneSerial, setNewDroneSerial] = useState('');
  const [newDroneCategory, setNewDroneCategory] = useState('');
  const [newDroneCity, setNewDroneCity] = useState('Noida Sector 62 Plant');
  const [newDroneImage, setNewDroneImage] = useState('');
  const [newDroneIsVerified, setNewDroneIsVerified] = useState(false);
  const [bulkCount, setBulkCount] = useState(50);
  const [bulkModel, setBulkModel] = useState('700RPAV');
  const [bulkCategory, setBulkCategory] = useState('General UAV');
  const [bulkPrefix, setBulkPrefix] = useState('INW-700RPAV');
  const [bulkIsVerified, setBulkIsVerified] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [inventoryActionLoading, setInventoryActionLoading] = useState(false);
  const [inventoryModalError, setInventoryModalError] = useState('');

  // Manage Order State (Hold, Cancel, Reschedule, Resume)
  const [managingOrder, setManagingOrder] = useState<DispatchOrder | null>(null);
  const [manageAction, setManageAction] = useState<'hold' | 'cancel' | 'reschedule' | 'resume'>('hold');
  const [manageReason, setManageReason] = useState('');
  const [manageDate, setManageDate] = useState('');
  const [manageTime, setManageTime] = useState('');
  const [manageOtp, setManageOtp] = useState('');
  const [manageOtpSent, setManageOtpSent] = useState(false);
  const [manageOtpSending, setManageOtpSending] = useState(false);
  const [manageOtpMessage, setManageOtpMessage] = useState('');
  const [manageSubmitting, setManageSubmitting] = useState(false);
  const [manageError, setManageError] = useState('');

  // Modals & Drawers
  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [liveMapModalOpen, setLiveMapModalOpen] = useState(false);

  // Assignment Modal Form
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [assignOtpRequired, setAssignOtpRequired] = useState(false);
  const [assignOtp, setAssignOtp] = useState('');
  const [assignOtpSending, setAssignOtpSending] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [copiedOtpId, setCopiedOtpId] = useState<string | null>(null);

  const prevOrderCountRef = useRef<number>(0);
  const token = localStorage.getItem('iw_delivery_token') || '';

  const getLinkedOrderForDrone = (drone: any) => {
    if (!drone) return null;
    const assignedId = drone.assigned_order || drone.delivery_data?.assigned_order;
    if (assignedId) {
      const byId = data.orders.find((o) => o.id === assignedId);
      if (byId) return byId;
    }
    const byReservedList = data.orders.find(
      (o: any) => Array.isArray(o.reserved_inventory_ids) && o.reserved_inventory_ids.includes(drone.id)
    );
    if (byReservedList) return byReservedList;
    return null;
  };

  const readDroneImage = (file: File, setImage: (image: string) => void) => {
    if (!file.type.startsWith('image/')) {
      setInventoryModalError('Choose an image file.');
      return;
    }
    if (file.size > 1_500_000) {
      setInventoryModalError('Image must be smaller than 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ''));
    reader.onerror = () => setInventoryModalError('Could not read the selected image.');
    reader.readAsDataURL(file);
  };

  // Web Audio Synthetic Inbound Chime
  const playInboundChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Note 1: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.35);

      // Note 2: 1174.66Hz (D6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15);
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.6);
    } catch {}
  };

  const fetchDashboard = async (isBackground = false) => {
    if (!token) return;
    try {
      if (!isBackground) setRefreshing(true);
      const res = await fetch(`${API_BASE_URL}/api/delivery/dispatch/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch dispatch dashboard');

      const incomingOrders: DispatchOrder[] = json.orders || [];

      // Detect new incoming order
      if (prevOrderCountRef.current > 0 && incomingOrders.length > prevOrderCountRef.current) {
        const latest = incomingOrders[0];
        setNewOrderAlert(latest);
        playInboundChime();
      }
      prevOrderCountRef.current = incomingOrders.length;

      setData({
        clients: json.clients || [],
        delivery_partners: json.delivery_partners || [],
        orders: incomingOrders,
        stats: json.stats || EMPTY_DASHBOARD.stats
      });
      setError('');
    } catch (err: any) {
      if (!isBackground) setError(err.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFleet = async () => {
    try {
      setFleetLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setFleet(json.drones || []);
      }
    } catch {
    } finally {
      setFleetLoading(false);
    }
  };

  const handleAddSingleDrone = async (e: React.FormEvent) => {
    e.preventDefault();
    setInventoryActionLoading(true);
    setInventoryModalError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: newDroneId.trim(),
          model: newDroneModel.trim(),
          serial_number: newDroneSerial.trim() || newDroneId.trim(),
          category: newDroneCategory.trim() || 'General UAV',
          image_url: newDroneImage,
          is_verified: newDroneIsVerified,
          verification_status: newDroneIsVerified ? 'verified' : 'unverified',
          current_city: newDroneCity
        })
      });
      const resData = await res.json();
      if (res.ok) {
        setShowAddSingleDrone(false);
        setNewDroneSerial('');
        setNewDroneId('');
        setNewDroneImage('');
        setNewDroneCategory('');
        setNewDroneIsVerified(false);
        fetchFleet();
      } else {
        setInventoryModalError(resData.error || 'Could not add drone to fleet.');
      }
    } catch {
      setInventoryModalError('Connection error adding drone.');
    } finally {
      setInventoryActionLoading(false);
    }
  };

  const handleBulkAddDrones = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkCount < 1) return;
    setBulkSubmitting(true);
    setInventoryModalError('');
    try {
      const rows = Array.from({ length: bulkCount }, (_, i) => {
        const num = String(i + 1).padStart(4, '0');
        const dId = `${bulkPrefix}-${num}`;
        return {
          id: dId,
          model: bulkModel,
          category: bulkCategory,
          serial_number: `${bulkPrefix}-SN-${num}`,
          current_city: 'Noida Sector 62 Plant',
          is_verified: bulkIsVerified,
          verification_status: bulkIsVerified ? 'verified' : 'unverified'
        };
      });

      const res = await fetch(`${API_BASE_URL}/api/delivery/drones/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ drones: rows })
      });
      const resData = await res.json();
      if (res.ok) {
        setShowBulkDroneModal(false);
        fetchFleet();
      } else {
        setInventoryModalError(resData.error || 'Could not add bulk drones.');
      }
    } catch {
      setInventoryModalError('Connection error during bulk add.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleSaveEditDrone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDrone) return;
    setInventoryActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones/${encodeURIComponent(editingDrone.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          model: editingDrone.model,
          category: editingDrone.category,
          serial_number: editingDrone.serial_number,
          current_city: editingDrone.current_city,
          image_url: editingDrone.image_url,
          is_verified: editingDrone.is_verified,
          verification_status: editingDrone.is_verified ? 'verified' : 'unverified',
          qc_status: editingDrone.qc_status,
          qc_notes: editingDrone.qc_notes,
          status: editingDrone.status
        })
      });
      if (res.ok) {
        setEditingDrone(null);
        fetchFleet();
      } else {
        const resData = await res.json();
        setInventoryModalError(resData.error || 'Could not save drone changes.');
      }
    } catch {
      setInventoryModalError('Error saving drone.');
    } finally {
      setInventoryActionLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchFleet();
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Real-time dynamic stats computed directly from active order list
  const stats = useMemo(() => {
    return {
      totalOrders: data.orders.length,
      pendingDispatches: data.orders.filter((o) => o.status === 'pending').length,
      assignedPendingAccept: data.orders.filter((o) => o.status === 'assigned' && o.pilot_acceptance_status !== 'accepted').length,
      acceptedReadyHandover: data.orders.filter((o) => o.status === 'assigned' && o.pilot_acceptance_status === 'accepted').length,
      inTransit: data.orders.filter((o) => ['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(o.status)).length,
      onHold: data.orders.filter((o) => o.status === 'on-hold').length,
      rescheduled: data.orders.filter((o) => o.status === 'rescheduled').length,
      delivered: data.orders.filter((o) => o.status === 'delivered').length,
      cancelled: data.orders.filter((o) => o.status === 'cancelled').length,
      failed: data.orders.filter((o) => o.status === 'failed').length
    };
  }, [data.orders]);

  // Filtered Orders for Dispatch Workbench
  const filteredOrders = useMemo(() => {
    return data.orders.filter((order) => {
      // Status filtering
      if (statusFilter === 'pending') {
        if (order.status !== 'pending') return false;
      } else if (statusFilter === 'assigned') {
        if (order.status !== 'assigned' || order.pilot_acceptance_status === 'accepted') return false;
      } else if (statusFilter === 'accepted') {
        if (order.status !== 'assigned' || order.pilot_acceptance_status !== 'accepted') return false;
      } else if (statusFilter === 'in-transit') {
        if (!['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(order.status)) return false;
      } else if (statusFilter === 'on-hold') {
        if (order.status !== 'on-hold') return false;
      } else if (statusFilter === 'rescheduled') {
        if (order.status !== 'rescheduled') return false;
      } else if (statusFilter === 'delivered') {
        if (order.status !== 'delivered') return false;
      } else if (statusFilter === 'cancelled') {
        if (order.status !== 'cancelled') return false;
      }

      // Search filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = (order.order_number || order.id || '').toLowerCase().includes(q);
        const matchCustomer = (order.customer_name || '').toLowerCase().includes(q);
        const matchPhone = (order.customer_phone || '').includes(q);
        const matchEmail = (order.customer_email || '').toLowerCase().includes(q);
        const matchAddress = (order.drop_address || order.destination_address || '').toLowerCase().includes(q);
        const matchPartner = (order.pilot_assigned || '').toLowerCase().includes(q);
        const matchItems = (order.items || []).some(i => (i.name || i.model || '').toLowerCase().includes(q));
        if (!matchNumber && !matchCustomer && !matchPhone && !matchEmail && !matchAddress && !matchPartner && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [data.orders, statusFilter, searchQuery]);

  // Handle Request Security Verification OTP for placing order on hold
  const handleRequestHoldOtp = async () => {
    if (!managingOrder) return;
    if (manageReason.trim().length < 5) {
      setManageError('Please enter a specific reason (at least 5 characters) before requesting security OTP.');
      return;
    }
    setManageOtpSending(true);
    setManageError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/orders/${encodeURIComponent(managingOrder.id)}/hold-request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: manageReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setManageError(data.error || 'Failed to dispatch security verification OTP');
        return;
      }
      setManageOtpSent(true);
      setManageOtpMessage(data.message || 'Security verification OTP dispatched!');
      if (data.dev_otp) {
        setManageOtp(data.dev_otp);
      }
    } catch (err: any) {
      setManageError(err.message || 'Error requesting verification OTP');
    } finally {
      setManageOtpSending(false);
    }
  };

  // Handle Manage Order Status (Hold, Cancel, Reschedule, Resume)
  const handleManageOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingOrder) return;
    if (manageAction === 'hold') {
      if (manageReason.trim().length < 5) {
        setManageError('A detailed reason (at least 5 characters) is required to put an order on hold.');
        return;
      }
      if (!manageOtp.trim()) {
        setManageError('Please request and enter your 6-digit operator security OTP.');
        return;
      }
    }
    setManageSubmitting(true);
    setManageError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/orders/${encodeURIComponent(managingOrder.id)}/manage-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: manageAction,
          reason: manageReason.trim(),
          rescheduled_date: manageDate,
          scheduled_time: manageTime,
          otp: manageOtp.trim()
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        setManageError(resData.error || 'Failed to update order status');
        return;
      }

      setNotice(resData.message || `Order #${managingOrder.order_number || managingOrder.id} updated to ${manageAction.toUpperCase()}`);
      setManagingOrder(null);
      setManageReason('');
      setManageDate('');
      setManageTime('');
      setManageOtp('');
      setManageOtpSent(false);
      setManageOtpMessage('');
      await fetchDashboard();
    } catch (err: any) {
      setManageError(err.message || 'Connection error managing order status');
    } finally {
      setManageSubmitting(false);
    }
  };

  // Handle Toggle Drone Maintenance
  const handleToggleDroneMaintenance = async (drone: any) => {
    const isMaint = drone.status === 'maintenance';
    const nextStatus = isMaint ? 'idle' : 'maintenance';
    const nextQc = isMaint ? 'passed' : 'pending';
    const nextNotes = isMaint ? 'Maintenance cleared and certified ready' : 'Under scheduled technical maintenance';

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/drones/${encodeURIComponent(drone.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          model: drone.model,
          status: nextStatus,
          qc_status: nextQc,
          qc_notes: nextNotes
        })
      });

      if (res.ok) {
        setFleet((prev) =>
          prev.map((d) =>
            d.id === drone.id
              ? {
                  ...d,
                  status: nextStatus,
                  qc_status: nextQc,
                  qc_notes: nextNotes
                }
              : d
          )
        );
        setNotice(
          isMaint
            ? `Drone ${drone.id} maintenance cleared and restored to active pool.`
            : `Drone ${drone.id} marked under maintenance (excluded from store).`
        );
      }
    } catch (err) {
      console.error('Toggle maintenance error:', err);
    }
  };

  // History Orders (Delivered, Completed, or Cancelled)
  const historyOrders = useMemo(() => {
    return data.orders.filter((order) => {
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const matchNumber = (order.order_number || order.id || '').toLowerCase().includes(q);
        const matchCustomer = (order.customer_name || '').toLowerCase().includes(q);
        const matchPhone = (order.customer_phone || '').includes(q);
        const matchAddress = (order.drop_address || order.destination_address || '').toLowerCase().includes(q);
        const matchPartner = (order.pilot_assigned || '').toLowerCase().includes(q);
        if (!matchNumber && !matchCustomer && !matchPhone && !matchAddress && !matchPartner) {
          return false;
        }
      }
      return true;
    });
  }, [data.orders, historySearch]);



  // Handle Request Dispatcher OTP
  const handleRequestAssignOtp = async () => {
    if (!selectedOrder) return;
    setAssignOtpSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/orders/${selectedOrder.id}/assign-pilot-request-otp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send OTP');
      setNotice(json.message || 'OTP sent to your registered email');
      setAssignOtpRequired(true);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch OTP');
    } finally {
      setAssignOtpSending(false);
    }
  };

  // Handle Confirm Assignment with Partner
  const handleConfirmAssignment = async () => {
    if (!selectedOrder || !selectedPartnerId) {
      setError('Please select an active delivery partner.');
      return;
    }

    const partner = data.delivery_partners.find((p) => p.id === selectedPartnerId);
    if (!partner) {
      setError('Selected partner not found.');
      return;
    }

    // Safety check: Delivery partner must have DL & Vehicle filled
    if (!partner.dl_id || !partner.vehicle_id) {
      setError(`Cannot dispatch: Delivery partner ${partner.name} has not registered a Driving License (DL) or Vehicle Number.`);
      return;
    }

    setAssignSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/orders/${selectedOrder.id}/assign-pilot`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pilot_id: partner.id,
          pilot_name: partner.name,
          pilot_phone: partner.phone || '',
          drone_id: partner.vehicle_id || 'Vehicle-01',
          otp: assignOtp.trim()
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to assign delivery partner');

      setNotice(`Order #${selectedOrder.order_number || selectedOrder.id} successfully assigned to ${partner.name}! Acceptance OTP: ${json.pilot_acceptance_otp}`);
      setAssignModalOpen(false);
      setSelectedOrder(null);
      setSelectedPartnerId('');
      setAssignOtp('');
      setAssignOtpRequired(false);
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message || 'Assignment failed');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleCopyOtp = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOtpId(id);
    setTimeout(() => setCopiedOtpId(null), 2000);
  };

  // Sidebar navigation tabs
  const dispatchNavItems = [
    { id: 'dispatch', label: 'Live Dispatch Desk', icon: Package, badge: stats.pendingDispatches > 0 ? stats.pendingDispatches : null },
    { id: 'tracking', label: 'Delivery Tracking', icon: Navigation, badge: stats.inTransit > 0 ? stats.inTransit : null },
    { id: 'history', label: 'Dispatch History', icon: Clock3, badge: stats.delivered > 0 ? stats.delivered : null },
    { id: 'inventory', label: 'Fleet & Inventory', icon: ShieldCheck, badge: fleet.length > 0 ? fleet.length : null },
    { id: 'profile', label: 'My Profile', icon: User, badge: null },
  ] as const;

  // Render Dispatch Workbench Inner View
  const renderDispatchWorkbench = () => (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-black text-slate-900">Live Dispatch Operations</h2>
            <span className="text-xs bg-purple-100 text-[#3B0080] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
              {data.orders.length} Total Shipments
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time Inbound Order Bookings, Partner Handover & GPS Logistics &amp; Consignment Fleet Control
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Audio Notification Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title={soundEnabled ? 'Inbound Audio Alert: ON' : 'Inbound Audio Alert: OFF'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span>{soundEnabled ? 'Chime Active' : 'Muted'}</span>
          </button>

          {/* Live Refresh Button */}
          <button
            onClick={() => {
              fetchDashboard();
              fetchFleet();
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Live Sync'}</span>
          </button>
        </div>
      </div>

      {/* Inbound Booking Banner Alert */}
      {newOrderAlert && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-xl shadow-lg flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            <div>
              <p className="font-extrabold text-sm uppercase tracking-wider">New Inbound Booking Arrived</p>
              <p className="text-xs text-amber-100">
                Order <span className="font-bold underline">#{newOrderAlert.order_number || newOrderAlert.id}</span> from {newOrderAlert.customer_name || 'Customer'} requires dispatcher assignment.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedOrder(newOrderAlert);
                setAssignModalOpen(true);
                setNewOrderAlert(null);
              }}
              className="px-3 py-1.5 bg-white text-orange-900 rounded-lg text-xs font-black hover:bg-amber-50 transition cursor-pointer"
            >
              Assign Now
            </button>
            <button onClick={() => setNewOrderAlert(null)} className="p-1 hover:bg-white/20 rounded cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bookings</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalOrders}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">All Customer Orders</p>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-xs">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.pendingDispatches}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">Needs Partner Assign</p>
        </div>

        <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 shadow-xs">
          <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Awaiting Accept</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{stats.assignedPendingAccept}</p>
          <p className="text-[11px] text-indigo-700 mt-0.5">Partner OTP Pending</p>
        </div>

        <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 shadow-xs">
          <p className="text-xs font-bold text-purple-800 uppercase tracking-wider">Ready Handover</p>
          <p className="text-2xl font-black text-[#3B0080] mt-1">{stats.acceptedReadyHandover}</p>
          <p className="text-[11px] text-purple-700 mt-0.5">Handover OTP Ready</p>
        </div>

        <div className="bg-cyan-50/70 p-4 rounded-xl border border-cyan-200 shadow-xs">
          <p className="text-xs font-bold text-cyan-800 uppercase tracking-wider">Out for Delivery</p>
          <p className="text-2xl font-black text-cyan-700 mt-1">{stats.inTransit}</p>
          <p className="text-[11px] text-cyan-800 mt-0.5">En Route to Customer</p>
        </div>

        <div className="bg-amber-100/60 p-4 rounded-xl border border-amber-300 shadow-xs">
          <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">On Hold</p>
          <p className="text-2xl font-black text-amber-800 mt-1">{stats.onHold}</p>
          <p className="text-[11px] text-amber-800 mt-0.5">Fulfillment Paused</p>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Delivered</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.delivered}</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">At Doorstep</p>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-xs">
          <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Cancelled</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{stats.cancelled}</p>
          <p className="text-[11px] text-rose-700 mt-0.5">Cancelled Orders</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Filter Select Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#3B0080]" />
            Status:
          </span>
          <div className="relative min-w-[240px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#3B0080] focus:bg-white transition cursor-pointer shadow-2xs"
            >
              <option value="all">All Orders ({stats.totalOrders})</option>
              <option value="pending">Pending Dispatch ({stats.pendingDispatches})</option>
              <option value="assigned">Awaiting Partner Accept ({stats.assignedPendingAccept})</option>
              <option value="accepted">Ready for Handover ({stats.acceptedReadyHandover})</option>
              <option value="in-transit">Out for Delivery ({stats.inTransit})</option>
              <option value="on-hold">On Hold ({stats.onHold})</option>
              <option value="rescheduled">Rescheduled ({stats.rescheduled})</option>
              <option value="delivered">Delivered ({stats.delivered})</option>
              <option value="cancelled">Cancelled ({stats.cancelled})</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Clear Filter Button if not 'all' */}
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="text-xs font-bold text-[#3B0080] hover:underline flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 rounded-xl border border-purple-200 transition cursor-pointer"
            >
              <span>Show All</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, customer, phone, drone..."
            className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-[#3B0080]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Orders List / Cards Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <Loader2 className="w-8 h-8 text-[#3B0080] animate-spin mx-auto mb-3" />
          <p className="font-bold text-slate-700">Connecting to IndoFleet Dispatcher Network...</p>
          <p className="text-xs text-slate-400 mt-1">Retrieving live inbound bookings and delivery fleet status</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700 text-base">No orders matching your criteria</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery ? `No results found for "${searchQuery}"` : 'New customer orders will appear here automatically in real time.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isPending = order.status === 'pending';
            const isAssigned = order.status === 'assigned' && order.pilot_acceptance_status !== 'accepted';
            const isAccepted = order.status === 'assigned' && order.pilot_acceptance_status === 'accepted';
            const isInTransit = ['taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(order.status);
            const isDelivered = order.status === 'delivered';
            const isCancelled = order.status === 'cancelled';
            const isFailed = order.status === 'failed';

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition overflow-hidden"
              >
                {/* Order Top Bar */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                      <span className="text-slate-400">Order</span>
                      <span className="text-[#3B0080] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        #{order.order_number || order.id}
                      </span>
                    </div>

                    <span className="text-slate-400">|</span>

                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Clock3 className="w-3.5 h-3.5" />
                      {new Date(order.created_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>

                    {order.package_type && (
                      <span className="bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                        {order.package_type}
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <span className="bg-amber-100 text-amber-800 font-extrabold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border border-amber-300">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Pending Dispatch
                      </span>
                    )}
                    {isAssigned && (
                      <span className="bg-indigo-100 text-indigo-800 font-extrabold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border border-indigo-300">
                        <Clock3 className="w-3 h-3 text-indigo-600" />
                        Awaiting Partner Acceptance
                      </span>
                    )}
                    {isAccepted && (
                      <span className="bg-purple-100 text-[#3B0080] font-extrabold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border border-purple-300">
                        <CheckCircle2 className="w-3 h-3 text-[#3B0080]" />
                        Partner Accepted — Ready for Handover
                      </span>
                    )}
                    {isInTransit && (
                      <span className="bg-cyan-100 text-cyan-800 font-extrabold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border border-cyan-300 animate-pulse">
                        <Navigation className="w-3 h-3 text-cyan-700" />
                        Out for Delivery
                      </span>
                    )}
                    {order.status === 'on-hold' && (
                      <span className="bg-amber-100 text-amber-900 font-extrabold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border border-amber-300">
                        <Pause className="w-3 h-3 text-amber-700" />
                        On Hold
                      </span>
                    )}
                    {order.status === 'rescheduled' && (
                      <span className="bg-purple-100 text-purple-900 font-extrabold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border border-purple-300">
                        <Calendar className="w-3 h-3 text-purple-700" />
                        Rescheduled
                      </span>
                    )}
                    {isDelivered && (
                      <span className="bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border border-emerald-300">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        Delivered
                      </span>
                    )}
                    {isCancelled && (
                      <span className="bg-rose-100 text-rose-800 font-extrabold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border border-rose-300">
                        <X className="w-3.5 h-3.5 text-rose-700" />
                        Cancelled
                      </span>
                    )}
                    {isFailed && (
                      <span className="bg-red-100 text-red-800 font-extrabold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border border-red-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                        Failed Delivery
                      </span>
                    )}
                  </div>
                </div>

                {/* Hold Status Reason Callout */}
                {order.status === 'on-hold' && (
                  <div className="mx-5 mt-4 p-3.5 bg-amber-500/10 border-2 border-amber-400/40 rounded-xl text-xs text-amber-950 flex items-start gap-3 shadow-xs">
                    <div className="w-7 h-7 rounded-lg bg-amber-200 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Pause className="w-4 h-4 text-amber-800" />
                    </div>
                    <div>
                      <p className="font-black text-amber-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        🛑 Mission Frozen &amp; Placed On Hold
                      </p>
                      <p className="font-bold text-amber-900 mt-0.5">
                        <strong>Reason:</strong> &ldquo;{order.hold_reason || 'Safety / Operational hold active'}&rdquo;
                      </p>
                      {order.held_at && (
                        <p className="text-[10px] text-amber-800/80 mt-0.5 font-mono">
                          Held at: {new Date(order.held_at).toLocaleString('en-IN')} {order.held_by ? `· By: ${order.held_by}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Details Body */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  {/* Column 1: Customer & Package Summary */}
                  <div className="space-y-3">
                    <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Customer & Contact</p>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{order.customer_name || 'Direct Customer'}</p>
                      <p className="text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {order.customer_phone || 'Phone not specified'}
                      </p>
                      {order.customer_email && (
                        <p className="text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {order.customer_email}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <p className="font-bold text-slate-700">
                        Package: <span className="font-semibold text-slate-600">{order.item_name || 'Standard Shipment'}</span>
                      </p>
                      <div className="flex items-center gap-3 text-slate-500 mt-1 min-w-0 flex-wrap">
                        <span className="truncate">Status: <strong className="text-purple-900 font-bold uppercase">{order.status}</strong></span>
                        <span>•</span>
                        <span className="truncate">Amount: <strong className="text-emerald-700 font-black">₹{Number(order.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Route & Addresses */}
                  <div className="space-y-3">
                    <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Delivery Route &amp; Address</p>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-purple-100 text-[#3B0080] flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5">
                          A
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Dispatch Origin Location</p>
                          <p className="font-semibold text-slate-800 leading-tight">
                            {order.pickup_address || 'IndoFleet Dispatch Facility 01, Sector 62'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5">
                          B
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Customer Address (Drop)</p>
                          <p className="font-bold text-slate-900 leading-tight">
                            {order.drop_address || order.destination_address || 'Customer Delivery Address'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {order.delivery_notes && (
                      <p className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
                        <strong>Note:</strong> {order.delivery_notes}
                      </p>
                    )}
                  </div>

                  {/* Column 3: Partner Assignment & Dispatcher Actions */}
                  <div className="space-y-3 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 md:pl-6">
                    <div>
                      <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                        Assigned Delivery Partner
                      </p>

                      {order.pilot_assigned ? (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <UserCheck className="w-4 h-4 text-emerald-600" />
                              {order.pilot_assigned}
                            </span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                              {order.drone_id || 'Vehicle-01'}
                            </span>
                          </div>

                          {order.pilot_phone && (
                            <p className="text-slate-500 text-[11px] flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {order.pilot_phone}
                            </p>
                          )}

                          {/* Acceptance OTP Strip */}
                          {order.pilot_acceptance_otp && (
                            <div className="mt-2 pt-2 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-amber-700 uppercase">Acceptance OTP:</span>
                                <button
                                  onClick={() => handleCopyOtp(order.pilot_acceptance_otp!, `acc-${order.id}`)}
                                  className="flex items-center gap-1 font-mono font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100 cursor-pointer"
                                >
                                  <span>{order.pilot_acceptance_otp}</span>
                                  {copiedOtpId === `acc-${order.id}` ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center p-4 bg-amber-50/70 border border-amber-200 rounded-lg">
                          <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                          <p className="font-bold text-amber-900">Unassigned</p>
                          <p className="text-[11px] text-amber-700">Assign a delivery partner to dispatch</p>
                        </div>
                      )}

                      {/* Live Telemetry Info for In-Transit */}
                      {isInTransit && (
                        <div className="mt-2 bg-cyan-50 border border-cyan-200 p-2.5 rounded-lg text-cyan-950 space-y-1">
                          <p className="font-bold text-[11px] flex items-center gap-1 text-cyan-800">
                            <Radio className="w-3 h-3 animate-ping" />
                            <span>Live Telemetry Active</span>
                          </p>
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            <span>Speed: <strong>{order.speed_kmh || 0} km/h</strong></span>
                            <span>Altitude: <strong>{order.altitude_m || 45} m</strong></span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-wrap gap-2">
                      {isPending && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setAssignModalOpen(true);
                          }}
                          className="flex-1 py-2 px-3 bg-[#3B0080] hover:bg-purple-900 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Assign Partner with OTP</span>
                        </button>
                      )}

                      {(isInTransit || isAccepted || isDelivered) && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setLiveMapModalOpen(true);
                          }}
                          className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Radio className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Live GPS Radar</span>
                        </button>
                      )}

                      {!['delivered'].includes(order.status) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setManagingOrder(order);
                            setManageAction(order.status === 'on-hold' ? 'resume' : 'hold');
                            setManageReason('');
                            setManageDate(order.rescheduled_date || '');
                            setManageTime(order.scheduled_time || '');
                            setManageError('');
                          }}
                          className="py-2 px-3 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                          title="Manage status (Hold, Cancel, Reschedule, Resume)"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                          <span>Manage</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render History Tab View
  const renderDispatchHistory = () => (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>Dispatch & Delivery History</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {historyOrders.length} Records
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of all fulfilled orders, proof of delivery (POD) signatures, and technical handover challans
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search history by order #, customer, partner..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-[#3B0080]"
          />
          {historySearch && (
            <button onClick={() => setHistorySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Order ID & Date</th>
                <th className="py-3.5 px-4">Customer & Phone</th>
                <th className="py-3.5 px-4">Drop Location</th>
                <th className="py-3.5 px-4">Assigned Partner</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Delivery Status</th>
                <th className="py-3.5 px-4 text-right">POD & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Clock3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No dispatch history found.
                  </td>
                </tr>
              ) : (
                historyOrders.map((order) => {
                  const isDelivered = order.status === 'delivered';
                  const isCancelled = order.status === 'cancelled';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-[#3B0080]">#{order.order_number || order.id}</span>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{order.customer_name || 'Customer'}</p>
                        <p className="text-[11px] text-slate-500">{order.customer_phone || '—'}</p>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-700">
                        {order.drop_address || order.destination_address || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {order.pilot_assigned ? (
                          <div>
                            <p className="font-bold text-slate-800">{order.pilot_assigned}</p>
                            <p className="text-[10px] text-slate-400">{order.drone_id || 'Vehicle'}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        ₹{order.total_amount?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          isDelivered ? 'bg-emerald-100 text-emerald-800' :
                          isCancelled ? 'bg-rose-100 text-rose-800' :
                          'bg-cyan-100 text-cyan-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setLiveMapModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition cursor-pointer"
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setManagingOrder(order);
                              setManageAction(order.status === 'on-hold' ? 'resume' : 'hold');
                              setManageReason('');
                              setManageDate(order.rescheduled_date || '');
                              setManageTime(order.scheduled_time || '');
                              setManageError('');
                            }}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-[#3B0080] border border-purple-200 font-bold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1"
                            title="Manage order (Hold, Cancel, Reschedule, Resume)"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Manage</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render Fleet & Inventory Tab View (Matching Admin Dashboard Experience)
  const renderFleetInventory = () => {
    const filteredFleetDrones = fleet.filter((d: any) => {
      const isVerified = d.is_verified === true || d.verification_status === 'verified';
      const isMaintenance = d.status === 'maintenance';
      const linked = getLinkedOrderForDrone(d);
      const isReserved = !isMaintenance && (d.status === 'reserved' || d.status === 'en-route' || Boolean(linked) || Boolean(d.assigned_order) || Boolean(d.delivery_data?.assigned_order));
      const isIdle = !isMaintenance && (d.status === 'idle' || !d.status || d.status === 'available') && !isReserved;

      if (droneFilter === 'verified' && !isVerified) return false;
      if (droneFilter === 'unverified' && isVerified) return false;
      if (droneFilter === 'reserved' && !isReserved) return false;
      if (droneFilter === 'idle' && !isIdle) return false;
      if (droneFilter === 'maintenance' && !isMaintenance) return false;
      if (droneFilter === 'qc_passed' && d.qc_status !== 'passed') return false;
      if (droneFilter === 'qc_pending' && d.qc_status === 'passed') return false;

      if (droneSearchQuery.trim()) {
        const q = droneSearchQuery.toLowerCase().trim();
        const matchId = String(d.id || '').toLowerCase().includes(q);
        const matchModel = String(d.model || '').toLowerCase().includes(q);
        const matchSerial = String(d.serial_number || '').toLowerCase().includes(q);
        const matchCat = String(d.category || '').toLowerCase().includes(q);
        const matchCity = String(d.current_city || '').toLowerCase().includes(q);
        const matchOrder = String(d.assigned_order || d.delivery_data?.assigned_order || linked?.id || '').toLowerCase().includes(q);
        if (!matchId && !matchModel && !matchSerial && !matchCat && !matchCity && !matchOrder) return false;
      }
      return true;
    });

    const totalDronePages = Math.max(1, Math.ceil(filteredFleetDrones.length / dronePageSize));
    const paginatedFleetDrones = filteredFleetDrones.slice((droneCurrentPage - 1) * dronePageSize, droneCurrentPage * dronePageSize);

    const verifiedDronesCount = fleet.filter((d) => d.is_verified === true || d.verification_status === 'verified').length;
    const unverifiedDronesCount = fleet.length - verifiedDronesCount;
    const maintenanceDronesCount = fleet.filter((d: any) => d.status === 'maintenance').length;
    const reservedDronesCount = fleet.filter((d: any) => {
      const linked = getLinkedOrderForDrone(d);
      return d.status !== 'maintenance' && (d.status === 'reserved' || d.status === 'en-route' || Boolean(linked) || Boolean(d.assigned_order) || Boolean(d.delivery_data?.assigned_order));
    }).length;
    const idleDronesCount = fleet.filter((d: any) => {
      const linked = getLinkedOrderForDrone(d);
      const isReserved = d.status === 'reserved' || d.status === 'en-route' || Boolean(linked) || Boolean(d.assigned_order) || Boolean(d.delivery_data?.assigned_order);
      return d.status !== 'maintenance' && (d.status === 'idle' || !d.status || d.status === 'available') && !isReserved;
    }).length;

    return (
      <div className="space-y-5">
        {/* Top Fleet KPI Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Fleet UAVs</p>
              <h4 className="text-2xl font-black text-slate-900 mt-1">{fleet.length}</h4>
              <p className="text-[10px] text-purple-700 font-semibold mt-0.5">Central Inventory</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#3B0080] flex items-center justify-center font-black">
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
                <p className="text-[11px] font-bold text-[#3B0080] uppercase tracking-wider">Reserved Drones</p>
                <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-purple-200 text-[#3B0080] rounded-md">LIVE</span>
              </div>
              <h4 className="text-2xl font-black text-purple-900 mt-1">{reservedDronesCount}</h4>
              <p className="text-[10px] text-purple-600 font-semibold mt-0.5 flex items-center gap-1">
                <span>{droneFilter === 'reserved' ? 'Filtered: Reserved Only' : 'Click to inspect bookings'}</span>
                <ChevronRight className="w-3 h-3" />
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-purple-100 text-[#3B0080] flex items-center justify-center font-black">
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

          {/* Under Maintenance KPI Card */}
          <div
            onClick={() => {
              setDroneFilter(droneFilter === 'maintenance' ? 'all' : 'maintenance');
              setDroneCurrentPage(1);
            }}
            className={`border rounded-2xl p-4 shadow-xs flex items-center justify-between cursor-pointer transition-all ${
              droneFilter === 'maintenance'
                ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-400/30'
                : 'bg-white border-amber-200 hover:border-amber-300 bg-amber-50/20'
            }`}
          >
            <div>
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Under Maintenance</p>
              <h4 className="text-2xl font-black text-amber-800 mt-1">{maintenanceDronesCount}</h4>
              <p className="text-[10px] text-amber-600 font-medium mt-0.5">Excluded from customer store</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
              <Wrench className="w-6 h-6" />
            </div>
          </div>

          {/* Hardware Verification */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Verified IDs</p>
              <h4 className="text-2xl font-black text-slate-900 mt-1">{verifiedDronesCount} <span className="text-xs font-semibold text-slate-400">/ {fleet.length}</span></h4>
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
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#3B0080]"
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
              <option value="all">All Fleet UAVs ({fleet.length})</option>
              <option value="reserved">Reserved for Bookings ({reservedDronesCount})</option>
              <option value="idle">Available / In-Stock ({idleDronesCount})</option>
              <option value="maintenance">Under Maintenance ({maintenanceDronesCount})</option>
              <option value="verified">Verified IDs ({verifiedDronesCount})</option>
              <option value="unverified">Unverified IDs ({unverifiedDronesCount})</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchFleet}
              disabled={fleetLoading}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh Fleet Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fleetLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => {
                setShowAddSingleDrone(true);
                setNewDroneModel('700RPAV');
                setNewDroneId('');
                setNewDroneSerial('');
                setNewDroneImage('');
                setNewDroneCategory('');
                setNewDroneIsVerified(false);
                setInventoryModalError('');
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
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
                setInventoryModalError('');
              }}
              className="px-4 py-2 rounded-xl bg-[#3B0080] hover:bg-purple-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bulk Batch Add</span>
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
                {fleetLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#3B0080]" />
                      Loading fleet hardware data...
                    </td>
                  </tr>
                ) : paginatedFleetDrones.map((d: any) => {
                  const isVerified = d.is_verified === true || d.verification_status === 'verified';
                  const linked = getLinkedOrderForDrone(d);
                  const isReserved = d.status !== 'maintenance' && (d.status === 'reserved' || Boolean(linked) || Boolean(d.assigned_order) || Boolean(d.delivery_data?.assigned_order));

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
                      <td className="py-3 px-4 font-bold text-[#3B0080]">{d.model}</td>
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
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-[#3B0080] border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer shadow-2xs group"
                          >
                            <ShoppingBag className="w-3 h-3 text-[#3B0080] shrink-0" />
                            <span>Reserved: <strong className="font-mono">{linked?.id || d.assigned_order || 'Booking'}</strong></span>
                            <Eye className="w-3 h-3 text-purple-400 group-hover:text-[#3B0080] shrink-0" />
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
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 text-[#3B0080] border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
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
                            onClick={() => {
                              setEditingDrone({
                                ...d,
                                is_verified: d.is_verified === true || d.verification_status === 'verified'
                              });
                              setInventoryModalError('');
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 hover:bg-purple-50 hover:text-[#3B0080] hover:border-purple-200 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!fleetLoading && filteredFleetDrones.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-semibold">No drones match your search or filter.</p>
                      <p className="text-xs text-slate-400 mt-0.5">Click "+1 Single Drone" or "Bulk Batch Add" to populate inventory.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredFleetDrones.length > 0 && (
            <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-500 font-semibold">
                Showing <span className="font-bold text-slate-900">{(droneCurrentPage - 1) * dronePageSize + 1}</span> to{' '}
                <span className="font-bold text-slate-900">{Math.min(droneCurrentPage * dronePageSize, filteredFleetDrones.length)}</span> of{' '}
                <span className="font-bold text-slate-900">{filteredFleetDrones.length}</span> UAV units
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
    );
  };

  // If embedded in Fleet Manager Tab, render full dispatch UI with tab pills (no inner sidebar)
  if (embedded) {
    const embeddedDispatchTabs = dispatchNavItems.filter(i => i.id !== 'profile');
    return (
      <div className="space-y-5 bg-[#F8FAFC] text-[#0F172A] pb-8">
        {/* Horizontal Tab Pills */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-wrap items-center gap-2">
          {embeddedDispatchTabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveSidebarTab(id as typeof activeSidebarTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSidebarTab === id
                  ? 'bg-[#3B0080] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/70 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
              {badge !== null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black shrink-0 ${
                  activeSidebarTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div>
          {activeSidebarTab === 'dispatch' && renderDispatchWorkbench()}
          {activeSidebarTab === 'tracking' && (
            <DeliveryTrackingModule currentUser={currentUser} onNavigate={onNavigate} />
          )}
          {activeSidebarTab === 'history' && renderDispatchHistory()}
          {activeSidebarTab === 'inventory' && renderFleetInventory()}
        </div>
      </div>
    );
  }

  // Standalone Dispatcher Command Portal with Full Sidebar
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pt-28 sm:pt-32 pb-16">
      {/* ── MOBILE SLIDE-OVER DRAWER ────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[120] md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />

          <div className="relative w-[85vw] max-w-[320px] bg-white h-full shadow-2xl flex flex-col justify-between p-5 z-10 animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#3B0080] flex items-center justify-center font-black shrink-0">
                    <Package className="w-5 h-5 text-[#3B0080]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">Dispatcher Desk</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">IndoFleet Flight Control</p>
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
                {dispatchNavItems.map(({ id, label, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveSidebarTab(id as typeof activeSidebarTab);
                      setMobileSidebarOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all text-left cursor-pointer group ${
                      activeSidebarTab === id
                        ? 'bg-[#3B0080] text-white shadow-md shadow-purple-900/10 font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${activeSidebarTab === id ? 'text-white' : 'text-slate-400 group-hover:text-[#3B0080]'}`} />
                      <span className="truncate">{label}</span>
                    </div>
                    {badge !== null && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 ${activeSidebarTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Current User Card at bottom of Drawer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-6">
              <button
                onClick={() => {
                  setActiveSidebarTab('profile');
                  setMobileSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B0080] to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {currentUser?.name?.[0]?.toUpperCase() || 'D'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || 'Dispatcher'}</p>
                  <p className="text-[10px] text-purple-700 font-semibold truncate">
                    {currentUser?.role === 'dispatcher'
                      ? 'Flight Dispatcher'
                      : currentUser?.role === 'admin'
                      ? 'Super Admin'
                      : currentUser?.role
                      ? currentUser.role.replace(/_/g, ' ')
                      : 'Flight Dispatcher'}
                  </p>
                </div>
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── WORKSPACE CONTAINER WITH STICKY SIDEBAR ──────────────────────── */}
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6">
        {/* Mobile Header Toggle */}
        <div className="md:hidden mb-4 flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-[#3B0080] transition"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {dispatchNavItems.find(i => i.id === activeSidebarTab)?.label || 'Dispatcher Desk'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">IndoFleet Flight Control</p>
            </div>
          </div>

          <button
            onClick={() => fetchDashboard()}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-purple-50 transition"
            title="Sync Orders"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* ═════════════════════════════════════════════════════════════════
             LEFT SIDEBAR: STICKY ON DESKTOP (HIDDEN ON MOBILE)
             ═════════════════════════════════════════════════════════════════ */}
          <aside className="hidden md:block w-60 lg:w-64 xl:w-72 shrink-0 md:sticky md:top-28 md:self-start md:max-h-[calc(100vh-8rem)] md:overflow-y-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-5">
              {/* Sidebar Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#3B0080] flex items-center justify-center font-black shadow-xs shrink-0">
                  <Package className="w-5 h-5 text-[#3B0080]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">Dispatcher Desk</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">IndoFleet Flight Control</p>
                </div>
              </div>

              {/* Navigation Menu Links */}
              <nav className="space-y-1.5 text-xs font-bold">
                {dispatchNavItems.map(({ id, label, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveSidebarTab(id as typeof activeSidebarTab);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all text-left cursor-pointer group ${
                      activeSidebarTab === id
                        ? 'bg-[#3B0080] text-white shadow-md shadow-purple-900/10 font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${activeSidebarTab === id ? 'text-white' : 'text-slate-400 group-hover:text-[#3B0080]'}`} />
                      <span className="truncate">{label}</span>
                    </div>
                    {badge !== null && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 ${activeSidebarTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Current User Card at bottom of Sidebar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setActiveSidebarTab('profile');
                  }}
                  title="Open dispatcher profile"
                  className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B0080] to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    {currentUser?.name?.[0]?.toUpperCase() || 'D'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || 'Dispatcher'}</p>
                    <p className="text-[10px] text-purple-700 font-semibold truncate">
                      {currentUser?.role === 'dispatcher'
                        ? 'Flight Dispatcher'
                        : currentUser?.role === 'admin'
                        ? 'Super Admin'
                        : currentUser?.role
                        ? currentUser.role.replace(/_/g, ' ')
                        : 'Flight Dispatcher'}
                    </p>
                  </div>
                </button>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="Logout"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* ═════════════════════════════════════════════════════════════════
             RIGHT CONTENT AREA (SWITCHED BY ACTIVE TAB)
             ═════════════════════════════════════════════════════════════════ */}
          <main className="flex-1 w-full min-w-0">
            {activeSidebarTab === 'dispatch' && renderDispatchWorkbench()}
            {activeSidebarTab === 'tracking' && (
              <DeliveryTrackingModule currentUser={currentUser} onNavigate={onNavigate} />
            )}
            {activeSidebarTab === 'history' && renderDispatchHistory()}
            {activeSidebarTab === 'inventory' && renderFleetInventory()}
            {activeSidebarTab === 'profile' && (
              <ProfilePage
                onNavigate={onNavigate || (() => {})}
                currentUser={currentUser}
                onUpdateUser={() => {}}
                embedded={true}
              />
            )}
          </main>
        </div>
      </div>

      {/* MODAL 1: ASSIGN DELIVERY PARTNER & DISPATCH WITH OTP */}
      {assignModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-[#3B0080]">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Assign Delivery Partner</h3>
                  <p className="text-xs text-slate-500">Order #{selectedOrder.order_number || selectedOrder.id}</p>
                </div>
              </div>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Order Quick Summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Customer: {selectedOrder.customer_name}</span>
                  <span>{selectedOrder.customer_phone}</span>
                </div>
                <p className="text-slate-500 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                  <span>{selectedOrder.drop_address || selectedOrder.destination_address}</span>
                </p>
              </div>

              {/* Delivery Partner Selection */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Select Active Delivery Partner:
                </label>

                {data.delivery_partners.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-center">
                    <p className="font-bold">No active delivery partners registered.</p>
                    <p className="text-[11px] mt-1">Please create delivery partner accounts in Admin Personnel.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {data.delivery_partners.map((partner) => {
                      const isSelected = selectedPartnerId === partner.id;
                      const hasDl = Boolean(partner.dl_id);
                      const hasVehicle = Boolean(partner.vehicle_id);
                      const isComplete = hasDl && hasVehicle;

                      return (
                        <div
                          key={partner.id}
                          onClick={() => setSelectedPartnerId(partner.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                            isSelected
                              ? 'border-[#3B0080] bg-purple-50/50 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              isSelected ? 'bg-[#3B0080] text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {partner.name[0]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{partner.name}</p>
                              <p className="text-[11px] text-slate-500">{partner.phone || partner.email}</p>
                            </div>
                          </div>

                          <div className="text-right space-y-0.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isComplete ? 'DL & Vehicle Active' : 'Profile Pending'}
                            </span>
                            {partner.vehicle_id ? (
                              <p className="text-[10px] text-slate-400">{partner.vehicle_id}</p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Optional Dispatcher Security OTP */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Dispatcher Security OTP (Optional Verification)
                  </label>
                  {!assignOtpRequired && (
                    <button
                      type="button"
                      onClick={handleRequestAssignOtp}
                      disabled={assignOtpSending}
                      className="text-[#3B0080] font-bold hover:underline cursor-pointer"
                    >
                      {assignOtpSending ? 'Sending...' : 'Request OTP to Email'}
                    </button>
                  )}
                </div>

                {assignOtpRequired && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={assignOtp}
                      onChange={(e) => setAssignOtp(e.target.value)}
                      placeholder="Enter 6-digit Dispatcher OTP"
                      maxLength={6}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm tracking-widest bg-slate-50 focus:bg-white focus:outline-none focus:border-[#3B0080]"
                    />
                    <button
                      type="button"
                      onClick={handleRequestAssignOtp}
                      disabled={assignOtpSending}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                    >
                      Resend
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
              <button
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssignment}
                disabled={assignSubmitting || !selectedPartnerId}
                className="px-5 py-2.5 bg-[#3B0080] text-white rounded-xl text-xs font-black hover:bg-purple-900 transition disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {assignSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Confirm & Dispatch Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: LIVE RADAR & GPS MAP DRAWER */}
      {liveMapModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-2xl w-full border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
                <div>
                  <h3 className="font-black text-white text-base">Live Radar GPS Tracking</h3>
                  <p className="text-xs text-slate-400">Order #{selectedOrder.order_number || selectedOrder.id}</p>
                </div>
              </div>
              <button onClick={() => setLiveMapModalOpen(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Telemetry Gauge Cards */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Speed</p>
                  <p className="text-lg font-black text-cyan-400 mt-0.5">{selectedOrder.speed_kmh || 0} <span className="text-[10px] font-normal text-slate-400">km/h</span></p>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Altitude</p>
                  <p className="text-lg font-black text-emerald-400 mt-0.5">{selectedOrder.altitude_m || 45} <span className="text-[10px] font-normal text-slate-400">m</span></p>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Signal Link</p>
                  <p className="text-lg font-black text-amber-400 mt-0.5">99.8%</p>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Bearing</p>
                  <p className="text-lg font-black text-purple-400 mt-0.5">{selectedOrder.heading_deg || 0}°</p>
                </div>
              </div>

              {/* Live Interactive Map */}
              <CustomerOrderLiveMap order={selectedOrder} className="h-64 sm:h-72" />

              {/* Map Coordinates Visualizer */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Current GPS Coordinates:</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {typeof selectedOrder.last_known_location === 'object'
                      ? `${selectedOrder.last_known_location.lat}, ${selectedOrder.last_known_location.lng}`
                      : selectedOrder.last_known_location || '28.6289, 77.3649 (Active Corridor)'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Delivery Destination:</span>
                  <span className="font-medium text-slate-200 truncate max-w-xs">{selectedOrder.drop_address || selectedOrder.destination_address}</span>
                </div>
              </div>

              {/* Customer Tracking URL Box */}
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 flex items-center justify-between gap-3 text-xs">
                <div className="truncate">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Customer Tracking URL:</p>
                  <p className="text-cyan-300 font-mono text-[11px] truncate">
                    {window.location.origin}/track?orderId={selectedOrder.id}
                  </p>
                </div>
                <button
                  onClick={() => handleCopyOtp(`${window.location.origin}/track?orderId=${selectedOrder.id}`, `track-${selectedOrder.id}`)}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer"
                >
                  {copiedOtpId === `track-${selectedOrder.id}` ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950">
              <button
                onClick={() => setLiveMapModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Radar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: RESERVED DRONE & CUSTOMER ORDER INSPECTION ────────── */}
      {selectedReservedDrone && (() => {
        const drone = selectedReservedDrone;
        const linkedOrder = getLinkedOrderForDrone(drone);
        const copyOrderId = (id: string) => {
          navigator.clipboard.writeText(id);
          setCopiedText(id);
          setTimeout(() => setCopiedText(null), 2000);
        };

        return (
          <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-100">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#3B0080] flex items-center justify-center font-black border border-purple-100 shrink-0">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">Reserved Drone Specification</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-[#3B0080] border border-purple-200">
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
                    Status: <strong className="text-purple-700 uppercase">{drone.status || 'Active'}</strong>
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
                          <User className="w-3 h-3 text-[#3B0080]" /> Customer Information
                        </p>
                        <p className="font-bold text-slate-900 text-sm">{linkedOrder.customer_name || 'Customer'}</p>
                        {linkedOrder.customer_email && (
                          <p className="text-slate-600 flex items-center gap-1.5 font-medium">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <a href={`mailto:${linkedOrder.customer_email}`} className="hover:underline text-[#3B0080]">{linkedOrder.customer_email}</a>
                          </p>
                        )}
                        {linkedOrder.customer_phone && (
                          <p className="text-slate-600 flex items-center gap-1.5 font-medium">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <a href={`tel:${linkedOrder.customer_phone}`} className="hover:underline text-[#3B0080]">{linkedOrder.customer_phone}</a>
                          </p>
                        )}
                      </div>

                      {/* Delivery Address */}
                      <div className="p-3.5 rounded-xl bg-white border border-purple-100 space-y-1.5 shadow-2xs">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#3B0080]" /> Delivery Destination
                        </p>
                        <p className="font-bold text-slate-900">
                          {linkedOrder.customer_name || 'Destination Recipient'}
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
                          {linkedOrder.items?.length || 1} Item(s)
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium">
                        Item: <strong className="text-slate-900">{linkedOrder.item_name || 'Standard Shipment'}</strong>
                      </p>
                      {linkedOrder.delivery_notes && (
                        <p className="text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                          "Notes: {linkedOrder.delivery_notes}"
                        </p>
                      )}
                    </div>
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
                  {linkedOrder ? 'Live reservation data synced from Fleet API' : 'Direct Drone Unit view'}
                </div>
                <div className="flex items-center gap-2">
                  {linkedOrder && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReservedDrone(null);
                        setActiveSidebarTab('tracking');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-4 py-2 rounded-xl bg-[#3B0080] hover:bg-purple-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
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

      {/* ── MODAL 4: ADD SINGLE DRONE ──────────────────────────────────── */}
      {showAddSingleDrone && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Single Drone to Fleet</h3>
                <p className="text-xs text-slate-500">Register physical UAV hardware unit</p>
              </div>
              <button onClick={() => setShowAddSingleDrone(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSingleDrone} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Drone ID *</label>
                  <input
                    type="text"
                    required
                    value={newDroneId}
                    onChange={(e) => setNewDroneId(e.target.value)}
                    placeholder="e.g. INW-700-019"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-[#3B0080]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hardware Serial</label>
                  <input
                    type="text"
                    value={newDroneSerial}
                    onChange={(e) => setNewDroneSerial(e.target.value)}
                    placeholder="e.g. SN-90214-X"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#3B0080]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Model *</label>
                  <select
                    value={newDroneModel}
                    onChange={(e) => setNewDroneModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#3B0080]"
                  >
                    <option value="700RPAV">700RPAV</option>
                    <option value="Cyberone Pro">Cyberone Pro</option>
                    <option value="Cyberone Max">Cyberone Max</option>
                    <option value="StealthPro VTOL">StealthPro VTOL</option>
                    <option value="IndoHawk Alpha">IndoHawk Alpha</option>
                    <option value="AgriWing X">AgriWing X</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={newDroneCategory}
                    onChange={(e) => setNewDroneCategory(e.target.value)}
                    placeholder="e.g. Heavy Delivery UAV"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#3B0080]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operating Facility / Region</label>
                <input
                  type="text"
                  value={newDroneCity}
                  onChange={(e) => setNewDroneCity(e.target.value)}
                  placeholder="e.g. Noida Sector 62 Plant"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#3B0080]"
                />
              </div>

              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="newVerifiedCheck"
                  checked={newDroneIsVerified}
                  onChange={(e) => setNewDroneIsVerified(e.target.checked)}
                  className="w-4 h-4 rounded text-[#3B0080] focus:ring-[#3B0080] border-slate-300"
                />
                <label htmlFor="newVerifiedCheck" className="text-xs font-bold text-slate-900 cursor-pointer">
                  Mark unit as Verified Hardware ID
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Photo Upload (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readDroneImage(file, setNewDroneImage);
                  }}
                  className="w-full text-xs"
                />
              </div>

              {inventoryModalError && (
                <p className="text-xs text-rose-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">
                  {inventoryModalError}
                </p>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSingleDrone(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inventoryActionLoading}
                  className="px-5 py-2 rounded-xl bg-[#3B0080] hover:bg-purple-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {inventoryActionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Add Drone to Fleet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: BULK BATCH ADD DRONES ──────────────────────────────── */}
      {showBulkDroneModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bulk Batch Add Drones</h3>
                <p className="text-xs text-slate-500">Bulk generate multiple sequential fleet units</p>
              </div>
              <button onClick={() => setShowBulkDroneModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkAddDrones} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Batch Count</label>
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={bulkCount}
                  onChange={(e) => setBulkCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-[#3B0080]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Drone Model</label>
                  <select
                    value={bulkModel}
                    onChange={(e) => setBulkModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#3B0080]"
                  >
                    <option value="700RPAV">700RPAV</option>
                    <option value="Cyberone Pro">Cyberone Pro</option>
                    <option value="Cyberone Max">Cyberone Max</option>
                    <option value="StealthPro VTOL">StealthPro VTOL</option>
                    <option value="IndoHawk Alpha">IndoHawk Alpha</option>
                    <option value="AgriWing X">AgriWing X</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ID Prefix</label>
                  <input
                    type="text"
                    value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value)}
                    placeholder="e.g. INW-700"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-[#3B0080]"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="bulkVerifiedCheck"
                  checked={bulkIsVerified}
                  onChange={(e) => setBulkIsVerified(e.target.checked)}
                  className="w-4 h-4 rounded text-[#3B0080] focus:ring-[#3B0080] border-slate-300"
                />
                <label htmlFor="bulkVerifiedCheck" className="text-xs font-bold text-slate-900 cursor-pointer">
                  Mark entire batch as Verified IDs
                </label>
              </div>

              {inventoryModalError && (
                <p className="text-xs text-rose-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">
                  {inventoryModalError}
                </p>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkDroneModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#3B0080] hover:bg-purple-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {bulkSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Generate Batch of {bulkCount} Units</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 6: EDIT DRONE SPECIFICATION ───────────────────────────── */}
      {editingDrone && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Drone: {editingDrone.id}</h3>
                <p className="text-xs text-slate-500">Update hardware specifications &amp; verification status</p>
              </div>
              <button onClick={() => setEditingDrone(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDrone} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Model Name</label>
                  <input
                    type="text"
                    value={editingDrone.model || ''}
                    onChange={(e) => setEditingDrone({ ...editingDrone, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#3B0080]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hardware Serial</label>
                  <input
                    type="text"
                    value={editingDrone.serial_number || ''}
                    onChange={(e) => setEditingDrone({ ...editingDrone, serial_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#3B0080]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editingDrone.category || ''}
                    onChange={(e) => setEditingDrone({ ...editingDrone, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#3B0080]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Operating Facility</label>
                  <input
                    type="text"
                    value={editingDrone.current_city || ''}
                    onChange={(e) => setEditingDrone({ ...editingDrone, current_city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#3B0080]"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="editVerifiedCheck"
                  checked={editingDrone.is_verified || false}
                  onChange={(e) => setEditingDrone({ ...editingDrone, is_verified: e.target.checked })}
                  className="w-4 h-4 rounded text-[#3B0080] focus:ring-[#3B0080] border-slate-300"
                />
                <label htmlFor="editVerifiedCheck" className="text-xs font-bold text-slate-900 cursor-pointer">
                  Mark as Verified Hardware ID
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Photo Upload (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readDroneImage(file, (img) => setEditingDrone({ ...editingDrone, image_url: img }));
                  }}
                  className="w-full text-xs"
                />
              </div>

              {inventoryModalError && (
                <p className="text-xs text-rose-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">
                  {inventoryModalError}
                </p>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDrone(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inventoryActionLoading}
                  className="px-5 py-2 rounded-xl bg-[#3B0080] hover:bg-purple-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {inventoryActionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Drone Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 7: MANAGE ORDER STATUS (HOLD / CANCEL / RESCHEDULE / RESUME) ──── */}
      {managingOrder && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Manage Order #{managingOrder.order_number || managingOrder.id}</h3>
                <p className="text-xs text-slate-500">Hold, cancel, reschedule, or resume order fulfillment</p>
              </div>
              <button onClick={() => setManagingOrder(null)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Order Summary */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{managingOrder.customer_name || 'Customer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <span className="font-mono font-bold uppercase text-[#3B0080]">{managingOrder.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <span className="font-medium text-slate-700 truncate max-w-[240px]">{managingOrder.drop_address || managingOrder.destination_address || '—'}</span>
              </div>
            </div>

            <form onSubmit={handleManageOrderStatus} className="space-y-4 text-xs">
              {/* Action Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManageAction('hold')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                      manageAction === 'hold'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-400/30'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Pause className="w-3.5 h-3.5 text-amber-600" />
                    <span>Put On Hold</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManageAction('reschedule')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                      manageAction === 'reschedule'
                        ? 'bg-purple-50 border-purple-400 text-[#3B0080] ring-2 ring-purple-400/30'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>Reschedule</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManageAction('resume')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                      manageAction === 'resume'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-400/30'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Resume Order</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManageAction('cancel')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                      manageAction === 'cancel'
                        ? 'bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-400/30'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <X className="w-3.5 h-3.5 text-rose-600" />
                    <span>Cancel Order</span>
                  </button>
                </div>
              </div>

              {/* Reschedule Date and Time */}
              {manageAction === 'reschedule' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50/50 rounded-2xl border border-purple-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">New Delivery Date *</label>
                    <input
                      type="date"
                      required
                      value={manageDate}
                      onChange={(e) => setManageDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:border-[#3B0080]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Time Window</label>
                    <input
                      type="time"
                      value={manageTime}
                      onChange={(e) => setManageTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#3B0080]"
                    />
                  </div>
                </div>
              )}

              {/* Reason / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason / Operational Notes {manageAction === 'cancel' || manageAction === 'hold' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={2}
                  required={manageAction === 'cancel' || manageAction === 'hold'}
                  minLength={manageAction === 'hold' ? 5 : 1}
                  value={manageReason}
                  onChange={(e) => setManageReason(e.target.value)}
                  placeholder={
                    manageAction === 'hold'
                      ? 'Detailed reason required (e.g. Weather hold, customer unreachable, clearance pending)...'
                      : manageAction === 'cancel'
                      ? 'e.g. Requested by customer, address unreachable...'
                      : manageAction === 'reschedule'
                      ? 'e.g. Customer requested delivery tomorrow morning...'
                      : 'e.g. Cleared to resume dispatch...'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#3B0080]"
                />
              </div>

              {/* Hold Two-Factor Self-Verification */}
              {manageAction === 'hold' && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      Operator Self-Verification (Required)
                    </span>
                    <button
                      type="button"
                      onClick={handleRequestHoldOtp}
                      disabled={manageOtpSending || manageReason.trim().length < 5}
                      className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {manageOtpSending ? 'Sending OTP...' : manageOtpSent ? 'Resend Code' : 'Send Security Code'}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-snug">
                    To freeze mission transit, verify your identity with the 6-digit security code sent to your registered email/phone.
                  </p>
                  {manageOtpSent && (
                    <div className="space-y-1 pt-1.5 border-t border-amber-200">
                      <label className="block text-[11px] font-bold text-amber-950 uppercase tracking-wider">
                        Enter 6-Digit Verification Code *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={manageOtp}
                        onChange={(e) => setManageOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full px-3 py-2 rounded-xl border border-amber-300 font-mono font-black text-center text-sm tracking-widest bg-white focus:outline-none focus:border-amber-600"
                      />
                      {manageOtpMessage && (
                        <p className="text-[10px] text-emerald-700 font-bold">{manageOtpMessage}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {manageAction === 'cancel' && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-[11px] text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    Cancelling this order will release all reserved fleet drones back to active stock and notify the customer via email.
                  </span>
                </div>
              )}

              {manageError && (
                <p className="text-xs text-rose-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">
                  {manageError}
                </p>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManagingOrder(null);
                    setManageOtp('');
                    setManageOtpSent(false);
                    setManageOtpMessage('');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={
                    manageSubmitting ||
                    (manageAction === 'hold' && (manageReason.trim().length < 5 || manageOtp.trim().length !== 6))
                  }
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 ${
                    manageAction === 'cancel'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : manageAction === 'hold'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-[#3B0080] hover:bg-purple-900'
                  }`}
                >
                  {manageSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span className="capitalize">Confirm {manageAction}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
