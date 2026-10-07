import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  Loader2,
  Home,
  Building2,
  Package,
  Crosshair,
  Sparkles,
  KeyRound,
  X,
  Check,
  Clock,
  Search,
  Eye,
  Copy,
  CheckCheck,
  Ban,
  RotateCcw,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Radio,
  Calendar,
  Plane,
  LayoutDashboard
} from 'lucide-react';
import { DeliveryUser, SavedAddress } from '../types';
import { API_BASE_URL } from '../config/api';
import PhoneInput from '../components/PhoneInput';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
  currentUser: DeliveryUser | null;
  onUpdateUser: (user: DeliveryUser) => void;
  initialTab?: 'details' | 'addresses' | 'orders';
  embedded?: boolean;
  onBack?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate, currentUser, onUpdateUser, initialTab, embedded = false, onBack }) => {
  const getStartingTab = (): 'details' | 'addresses' | 'orders' => {
    if (initialTab) return initialTab;
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('tab');
      if (q === 'orders') return 'orders';
      if (q === 'addresses') return 'addresses';
      if (window.location.pathname.includes('/orders')) return 'orders';
    }
    return 'details';
  };

  const [activeTab, setActiveTab] = useState<'details' | 'addresses' | 'orders'>(getStartingTab);
  const [profile, setProfile] = useState<DeliveryUser | null>(currentUser);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [addresses, setAddresses] = useState<SavedAddress[]>(currentUser?.saved_addresses || []);

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Cancel Order Modal State
  const [cancellingOrder, setCancellingOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('Placed by mistake');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Address Modal State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Work' | 'Office' | 'Warehouse' | 'Other'>('Home');
  const [addressRecipient, setAddressRecipient] = useState('');
  const [addressPhone, setAddressPhone] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Noida');
  const [pincode, setPincode] = useState('201301');
  const [isDefault, setIsDefault] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // OTP Verification Modal State
  const [otpModalTarget, setOtpModalTarget] = useState<'email' | 'phone' | null>(null);
  const [otpModalValue, setOtpModalValue] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');

  // Fetch latest profile from backend on mount
  useEffect(() => {
    const token = localStorage.getItem('iw_delivery_token');
    if (!token) return;

    fetch(`${API_BASE_URL}/api/delivery/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setProfile(data.user);
          setName(data.user.name || '');
          setEmail(data.user.email || '');
          setPhone(data.user.phone || '');
          setAddresses(data.user.saved_addresses || []);
          onUpdateUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const fetchOrders = () => {
    const token = localStorage.getItem('iw_delivery_token');
    if (!token) return;
    setLoadingOrders(true);
    fetch(`${API_BASE_URL}/api/delivery/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    setIsCancelling(true);
    setCancelError('');

    const token = localStorage.getItem('iw_delivery_token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/orders/${cancellingOrder.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: cancelReason })
      });

      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error || 'Failed to cancel order.');
        return;
      }

      setOrders((prev) => prev.map((o) => (o.id === cancellingOrder.id ? { ...o, status: 'cancelled', cancellation_reason: cancelReason } : o)));
      if (selectedOrderDetail?.id === cancellingOrder.id) {
        setSelectedOrderDetail((prev: any) => (prev ? { ...prev, status: 'cancelled', cancellation_reason: cancelReason } : null));
      }
      setCancellingOrder(null);
      setSuccessMsg(`Order ${cancellingOrder.id} has been cancelled successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchOrders();
    } catch {
      setCancelError('Network error while cancelling order.');
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'active') {
      if (['delivered', 'cancelled'].includes(o.status)) return false;
    } else if (orderFilter === 'delivered') {
      if (o.status !== 'delivered') return false;
    } else if (orderFilter === 'cancelled') {
      if (o.status !== 'cancelled') return false;
    }
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      const matchesId = (o.id || '').toLowerCase().includes(q);
      const matchesDrop = (o.drop_address || '').toLowerCase().includes(q);
      const matchesPickup = (o.pickup_address || '').toLowerCase().includes(q);
      const matchesDrone = (o.drone_model || o.drone_id || '').toLowerCase().includes(q);
      const matchesRecipient = (o.customer_name || '').toLowerCase().includes(q);
      return matchesId || matchesDrop || matchesPickup || matchesDrone || matchesRecipient;
    }
    return true;
  });

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'in-flight':
      case 'taking-off':
      case 'approaching':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            <span className="capitalize">{status.replace('-', ' ')}</span>
          </span>
        );
      case 'assigned':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="capitalize">{status === 'assigned' ? 'UAV Assigned' : 'Pending Dispatch'}</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Delivered</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <Ban className="w-3.5 h-3.5 text-rose-600" />
            <span>Cancelled</span>
          </span>
        );
      case 'on-hold':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>On Hold</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <span className="capitalize">{status}</span>
          </span>
        );
    }
  };

  // Save profile updates (Name, Email, Phone)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    const token = localStorage.getItem('iw_delivery_token');
    if (!token) {
      setErrorMsg('Please sign in to update profile.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          saved_addresses: addresses
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to update profile.');
        return;
      }

      setProfile(data.user);
      onUpdateUser(data.user);
      localStorage.setItem('iw_delivery_user', JSON.stringify(data.user));
      if (data.token) localStorage.setItem('iw_delivery_token', data.token);

      setSuccessMsg('Profile details updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('Server error. Could not connect to profile service.');
    } finally {
      setSaving(false);
    }
  };

  // Trigger Send OTP for Email / Phone verification
  const handleTriggerVerify = async (target: 'email' | 'phone', val: string) => {
    const token = localStorage.getItem('iw_delivery_token');
    if (!token) return;

    setOtpLoading(true);
    setOtpError('');
    setOtpSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/profile/send-verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ target, value: val })
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || 'Failed to send OTP.');
        return;
      }

      setOtpModalTarget(target);
      setOtpModalValue(val);
      setOtpCode('');
      setOtpSuccess(`Verification code dispatched to ${val}`);
    } catch {
      setOtpError('Failed to trigger verification code. Verify backend is running.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Submit OTP for Email / Phone verification
  const handleConfirmVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      setOtpError('Please enter valid 6-digit code');
      return;
    }

    const token = localStorage.getItem('iw_delivery_token');
    if (!token) return;

    setOtpLoading(true);
    setOtpError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/profile/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          target: otpModalTarget,
          value: otpModalValue,
          otp: otpCode.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || 'Invalid verification code. Please check and try again.');
        return;
      }

      if (data.user) {
        setProfile(data.user);
        onUpdateUser(data.user);
        localStorage.setItem('iw_delivery_user', JSON.stringify(data.user));
      }

      setOtpSuccess('Verification successful! Account updated.');
      setTimeout(() => {
        setOtpModalTarget(null);
        setOtpSuccess('');
      }, 1500);
    } catch {
      setOtpError('Verification request failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Open modal to add or edit address
  const handleOpenAddressModal = (addr?: SavedAddress) => {
    if (addr) {
      setEditingAddressId(addr.id);
      setAddressLabel(addr.label);
      setAddressRecipient(addr.recipient_name || name);
      setAddressPhone(addr.recipient_phone || phone);
      setFullAddress(addr.full_address);
      setLandmark(addr.landmark || '');
      setCity(addr.city || 'Noida');
      setPincode(addr.pincode || '201301');
      setIsDefault(Boolean(addr.is_default));
    } else {
      setEditingAddressId(null);
      setAddressLabel('Home');
      setAddressRecipient(name);
      setAddressPhone(phone);
      setFullAddress('');
      setLandmark('');
      setCity('Noida');
      setPincode('201301');
      setIsDefault(addresses.length === 0);
    }
    setShowAddressModal(true);
  };

  // Auto-detect current GPS location for address
  const handleDetectAddressGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.display_name) {
            setFullAddress(data.display_name);
            if (data.address?.city || data.address?.town || data.address?.state_district) {
              setCity(data.address.city || data.address.town || data.address.state_district);
            }
            if (data.address?.postcode) {
              setPincode(data.address.postcode);
            }
          } else {
            setFullAddress(`GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          }
        } catch {
          setFullAddress(`GPS Pin: ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        alert('GPS location permission denied or unavailable.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Save address (Add or Edit) and persist to backend
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullAddress.trim()) return;

    let updatedList: SavedAddress[] = [...addresses];

    if (editingAddressId) {
      updatedList = updatedList.map((a) => {
        if (a.id === editingAddressId) {
          return {
            ...a,
            label: addressLabel,
            recipient_name: addressRecipient.trim() || name,
            recipient_phone: addressPhone.trim() || phone,
            full_address: fullAddress.trim(),
            landmark: landmark.trim() || undefined,
            city: city.trim(),
            pincode: pincode.trim(),
            is_default: isDefault
          };
        }
        return isDefault ? { ...a, is_default: false } : a;
      });
    } else {
      if (isDefault) {
        updatedList = updatedList.map((a) => ({ ...a, is_default: false }));
      }
      const newAddr: SavedAddress = {
        id: `addr-${Date.now()}`,
        label: addressLabel,
        recipient_name: addressRecipient.trim() || name,
        recipient_phone: addressPhone.trim() || phone,
        full_address: fullAddress.trim(),
        landmark: landmark.trim() || undefined,
        city: city.trim(),
        pincode: pincode.trim(),
        is_default: isDefault || updatedList.length === 0
      };
      updatedList.unshift(newAddr);
    }

    setAddresses(updatedList);
    setShowAddressModal(false);

    // Save to backend immediately
    const token = localStorage.getItem('iw_delivery_token');
    if (token) {
      fetch(`${API_BASE_URL}/api/delivery/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ saved_addresses: updatedList })
      })
        .then((res) => res.json())
        .then((d) => {
          if (d.user) {
            setProfile(d.user);
            onUpdateUser(d.user);
            localStorage.setItem('iw_delivery_user', JSON.stringify(d.user));
          }
        })
        .catch(() => {});
    }
  };

  // Delete address
  const handleDeleteAddress = (id: string) => {
    const updated = addresses.filter((a) => a.id !== id);
    if (updated.length > 0 && !updated.some((a) => a.is_default)) {
      updated[0].is_default = true;
    }
    setAddresses(updated);

    const token = localStorage.getItem('iw_delivery_token');
    if (token) {
      fetch(`${API_BASE_URL}/api/delivery/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ saved_addresses: updated })
      })
        .then((res) => res.json())
        .then((d) => {
          if (d.user) {
            setProfile(d.user);
            onUpdateUser(d.user);
            localStorage.setItem('iw_delivery_user', JSON.stringify(d.user));
          }
        })
        .catch(() => {});
    }
  };

  // Set address as default
  const handleMakeDefault = (id: string) => {
    const updated = addresses.map((a) => ({
      ...a,
      is_default: a.id === id
    }));
    setAddresses(updated);

    const token = localStorage.getItem('iw_delivery_token');
    if (token) {
      fetch(`${API_BASE_URL}/api/delivery/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ saved_addresses: updated })
      })
        .then((res) => res.json())
        .then((d) => {
          if (d.user) {
            setProfile(d.user);
            onUpdateUser(d.user);
            localStorage.setItem('iw_delivery_user', JSON.stringify(d.user));
          }
        })
        .catch(() => {});
    }
  };

  const getBackTarget = () => {
    if (embedded) return { label: 'Back to Dashboard', action: () => onBack?.() };
    const role = profile?.role || currentUser?.role;
    if (role === 'admin') {
      return {
        label: 'Back to Admin Dashboard',
        action: () => {
          onNavigate('admin');
          window.history.pushState({}, '', '/admin');
        }
      };
    }
    if (role === 'fleet_manager') {
      return {
        label: 'Back to Fleet Deck',
        action: () => {
          onNavigate('fleet');
          window.history.pushState({}, '', '/fleet');
        }
      };
    }
    if (role === 'dispatcher') {
      return {
        label: 'Back to Dispatch Operations',
        action: () => {
          onNavigate('drone-dispatch');
          window.history.pushState({}, '', '/drone-dispatch');
        }
      };
    }
    if (role === 'support') {
      return {
        label: 'Back to Support Desk',
        action: () => {
          onNavigate('support-desk');
          window.history.pushState({}, '', '/support-desk');
        }
      };
    }
    if (role === 'customer') {
      return {
        label: 'Back to Store',
        action: () => {
          onNavigate('shop');
          window.history.pushState({}, '', '/shop');
        }
      };
    }
    return {
      label: 'Back to Home',
      action: () => {
        onNavigate('home');
        window.history.pushState({}, '', '/');
      }
    };
  };

  const backTarget = getBackTarget();

  return (
    <div className={embedded ? 'bg-[#f7f4fb] pb-8' : 'min-h-screen bg-[#f7f4fb] pb-24'}>
      {/* Header Banner */}
      <section
        className={`relative ${embedded ? 'rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm' : 'text-white'} ${embedded ? 'px-5 py-5' : 'px-6 pt-28 pb-20 sm:pt-36'} overflow-hidden`}
        style={embedded ? undefined : { background: 'linear-gradient(135deg, #101222 0%, #191b30 55%, #0d0e1a 100%)' }}
      >
        {!embedded && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />}
        <div className={`relative ${embedded ? '' : 'max-w-4xl mx-auto'}`}>
          <button
            onClick={backTarget.action}
            className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${embedded ? 'mb-3 text-slate-500 hover:text-[#ef7f1a]' : 'mb-6 text-white/70 hover:text-white'}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {backTarget.label}
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${embedded ? 'bg-orange-50 text-[#ef7f1a]' : 'bg-white/10 border border-white/20 text-white shadow-inner'}`}>
                {name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${embedded ? 'text-slate-900' : ''}`}>{embedded ? 'My Profile' : name || 'Customer Account'}</h1>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${embedded ? 'bg-orange-50 text-[#ef7f1a]' : 'bg-orange-500/20 text-orange-200 border border-orange-400/30'}`}>
                    {profile?.role === 'admin' ? 'HQ Admin' : profile?.role === 'customer' ? 'Customer Account' : profile?.role ? profile.role.replace('_', ' ') : 'Verified Personnel'}
                  </span>
                </div>
                {!embedded && <p className="text-white/70 text-sm">{email || 'IndoWings Drone Fleet Network'}</p>}
              </div>
            </div>

            {!embedded && <button
              onClick={() => {
                onNavigate('track');
                window.history.pushState({}, '', '/track');
              }}
              className="inline-flex items-center justify-center gap-2 bg-white text-[#ef7f1a] hover:bg-orange-50 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95"
            >
              <Radio className="w-4 h-4 text-orange-600 animate-pulse" /> Live Telemetry Radar
            </button>}
          </div>

          {/* Navigation Section Tabs */}
          <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar ${embedded ? 'mt-4 border-b border-slate-200 pt-1' : 'mt-8 border-b border-white/20 pt-2'}`}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('details');
                if (!embedded) window.history.replaceState({}, '', '/profile?tab=details');
              }}
              className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                embedded
                  ? activeTab === 'details' ? 'border-[#ef7f1a] text-[#ef7f1a]' : 'border-transparent text-slate-500 hover:text-slate-900'
                  : activeTab === 'details' ? 'border-white text-white bg-white/10 rounded-t-xl' : 'border-transparent text-white/70 hover:text-white hover:border-white/40'
              }`}
            >
              <User className="w-4 h-4" /> Personal Details
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('addresses');
                if (!embedded) window.history.replaceState({}, '', '/profile?tab=addresses');
              }}
              className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                embedded
                  ? activeTab === 'addresses' ? 'border-[#ef7f1a] text-[#ef7f1a]' : 'border-transparent text-slate-500 hover:text-slate-900'
                  : activeTab === 'addresses' ? 'border-white text-white bg-white/10 rounded-t-xl' : 'border-transparent text-white/70 hover:text-white hover:border-white/40'
              }`}
            >
              <MapPin className="w-4 h-4" /> Saved Addresses
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${embedded ? 'bg-slate-100 text-slate-600' : 'bg-white/20 text-white'}`}>{addresses.length}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('orders');
                if (!embedded) window.history.replaceState({}, '', '/profile?tab=orders');
              }}
              className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                embedded
                  ? activeTab === 'orders' ? 'border-[#ef7f1a] text-[#ef7f1a]' : 'border-transparent text-slate-500 hover:text-slate-900'
                  : activeTab === 'orders' ? 'border-white text-white bg-white/10 rounded-t-xl' : 'border-transparent text-white/70 hover:text-white hover:border-white/40'
              }`}
            >
              <Clock className="w-4 h-4" /> My Orders & History
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${embedded ? 'bg-slate-100 text-slate-600' : 'bg-white/20 text-white'}`}>{orders.length}</span>
            </button>
          </div>
        </div>
      </section>

      <div className={`${embedded ? 'px-0 pt-5' : 'max-w-4xl mx-auto px-6 -mt-4 relative z-10'} space-y-8 pb-16`}>
        {/* SUCCESS OR ERROR BANNERS */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="font-medium">{successMsg}</p>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-sm shadow-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        {/* 1. PERSONAL INFORMATION & VERIFICATION STATUS */}
        {activeTab === 'details' && (
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-[#171222] flex items-center gap-2">
                  <User className="w-5 h-5 text-[#ef7f1a]" />
                  Personal Profile & Contact Details
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage your credentials and verified contact info used for live flight telemetry updates.</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Legal Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="e.g. Puneet Kushwaha"
                      className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm font-medium text-[#171222] focus:outline-none focus:border-[#ef7f1a] focus:ring-2 focus:ring-orange-100 transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@company.com"
                      className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm font-medium text-[#171222] focus:outline-none focus:border-[#ef7f1a] focus:ring-2 focus:ring-orange-100 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">Order receipts, tracking links, and delivery telemetry are dispatched to this inbox.</p>
                </div>

                {/* Mobile Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mobile Phone Number</label>
                  <div className="relative">
                    <PhoneInput value={phone} onChange={(v) => setPhone(v)} placeholder="9XXXXXXXXX" inputClassName="py-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">Direct SMS updates on UAV touchdown and landing clearance.</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-[#ef7f1a] hover:bg-[#2a005c] text-white font-bold px-6 py-3.5 rounded-xl text-sm shadow-md shadow-slate-900/10 transition-all disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{saving ? 'Saving Profile...' : 'Save Profile Details'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 2. SAVED ADDRESSES SECTION */}
        {activeTab === 'addresses' && (
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-[#171222] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#ef7f1a]" />
                  Saved Delivery Addresses
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Addresses saved here will automatically show as 1-click quick selections when placing drone orders.</p>
              </div>

              <button
                onClick={() => handleOpenAddressModal()}
                className="inline-flex items-center gap-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#ef7f1a] font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#ef7f1a]" /> Add New Address
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#ef7f1a] flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#171222] mb-1">No Saved Addresses Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">Save your primary delivery hubs, residential apartments, or corporate offices for instant checkout.</p>
                <button
                  onClick={() => handleOpenAddressModal()}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ef7f1a] bg-white border border-orange-200 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Address
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      addr.is_default ? 'border-[#ef7f1a] bg-orange-50/30 ring-1 ring-orange-100' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-100/70 text-[#ef7f1a] flex items-center justify-center text-xs font-bold">
                          {addr.label === 'Home' ? <Home className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-[#171222]">{addr.label}</span>
                          {addr.is_default && <span className="ml-2 text-[10px] font-bold bg-[#ef7f1a] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Default</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button onClick={() => handleOpenAddressModal(addr)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#ef7f1a] hover:bg-orange-50 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteAddress(addr.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">{addr.full_address}</p>

                    <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-600">{addr.recipient_name || name}</span>
                        {addr.recipient_phone && <span> • {addr.recipient_phone}</span>}
                      </div>
                      {!addr.is_default && (
                        <button onClick={() => handleMakeDefault(addr.id)} className="text-[11px] font-bold text-[#ef7f1a] hover:underline">
                          Set Default
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. MY ORDERS & HISTORY SECTION */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Header & Quick stats */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-[#171222] flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#ef7f1a]" />
                    My Drone Orders & History
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Track order progress, dispatch updates, deliveries, and cancellations.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchOrders()}
                    disabled={loadingOrders}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-[#ef7f1a] hover:border-orange-200 hover:bg-orange-50 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Refresh Orders"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin text-[#ef7f1a]' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('track');
                      window.history.pushState({}, '', '/track');
                    }}
                    className="inline-flex items-center gap-2 bg-[#ef7f1a] hover:bg-[#2a005c] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-slate-900/10 cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5" /> Corridor Radar
                  </button>
                </div>
              </div>

              {/* Stats Counter Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
                <div
                  onClick={() => setOrderFilter('all')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    orderFilter === 'all' ? 'border-[#ef7f1a] bg-orange-50/50 ring-1 ring-orange-200' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                  }`}
                >
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Bookings</span>
                  <span className="text-2xl font-bold text-[#171222]">{orders.length}</span>
                </div>

                <div
                  onClick={() => setOrderFilter('active')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    orderFilter === 'active' ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-200' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                  }`}
                >
                  <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                    Active Orders
                  </span>
                  <span className="text-2xl font-bold text-sky-700">
                    {orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length}
                  </span>
                </div>

                <div
                  onClick={() => setOrderFilter('delivered')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    orderFilter === 'delivered' ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-200' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                  }`}
                >
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Delivered</span>
                  <span className="text-2xl font-bold text-emerald-700">{orders.filter((o) => o.status === 'delivered').length}</span>
                </div>

                <div
                  onClick={() => setOrderFilter('cancelled')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    orderFilter === 'cancelled' ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-200' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                  }`}
                >
                  <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block mb-1">Cancelled</span>
                  <span className="text-2xl font-bold text-rose-600">{orders.filter((o) => o.status === 'cancelled').length}</span>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-100">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                  {[
                    { key: 'all', label: 'All Orders' },
                    { key: 'active', label: 'Active Orders' },
                    { key: 'delivered', label: 'Delivered' },
                    { key: 'cancelled', label: 'Cancelled' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setOrderFilter(tab.key as any)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                        orderFilter === tab.key ? 'bg-[#ef7f1a] text-white shadow-xs' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search Order ID, Drop point..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-[#171222] focus:outline-none focus:border-[#ef7f1a] bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Order Cards List */}
            {loadingOrders && orders.length === 0 ? (
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-12 text-center shadow-sm">
                <Loader2 className="w-8 h-8 text-[#ef7f1a] animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-600">Retrieving your flight mission logs...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-12 text-center shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#ef7f1a] flex items-center justify-center mx-auto mb-4">
                  <Plane className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#171222] mb-1">{orderSearch ? 'No matching logs found' : 'No Corridor Sorties Found'}</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
                  {orderSearch ? 'Try checking for typos or searching by another keyword.' : 'No active flight corridors or dispatch records found for your account.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('track');
                    window.history.pushState({}, '', '/track');
                  }}
                  className="inline-flex items-center gap-2 bg-[#ef7f1a] hover:bg-[#2a005c] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <Radio className="w-4 h-4" /> Live Corridor Telemetry
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const isLive = ['assigned', 'taking-off', 'in-flight', 'approaching', 'on-hold', 'pending'].includes(order.status);
                  const isCancellable = order.order_type === 'drone_purchase' ? order.status === 'pending' : order.status !== 'delivered' && order.status !== 'cancelled';

                  return (
                    <div key={order.id} className="bg-white border border-[#e2e8f0] hover:border-orange-200 transition-all rounded-2xl p-5 sm:p-6 shadow-sm">
                      {/* Card Top Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ef7f1a] flex items-center justify-center shrink-0">
                            <Plane className="w-5 h-5 text-[#ef7f1a]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-[#171222]">{order.id}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyOrderId(order.id)}
                                className="p-1 text-slate-400 hover:text-[#ef7f1a] transition-colors cursor-pointer"
                                title="Copy Order ID"
                              >
                                {copiedOrderId === order.id ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {order.created_at
                                  ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                  : 'Recent'}
                              </span>
                              {order.drone_model && (
                                <>
                                  <span>•</span>
                                  <span className="font-medium text-slate-600">{order.drone_model}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">{renderStatusBadge(order.status)}</div>
                      </div>

                      {/* Route & Delivery Summary */}
                      <div className="py-4 grid sm:grid-cols-2 gap-4 border-b border-slate-100 text-xs">
                        {/* Pickup Hub */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Pickup Origin Hub
                          </span>
                          <p className="font-medium text-[#171222] leading-snug">{order.pickup_address || 'IndoWings Drone Hub Alpha (Sector 62)'}</p>
                        </div>

                        {/* Drop Destination */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-orange-600"></div> Drop Destination
                          </span>
                          <p className="font-medium text-[#171222] leading-snug">{order.drop_address || 'Drop coordinate specified'}</p>
                          {order.customer_name && (
                            <p className="text-[11px] text-slate-500">
                              Recipient: <span className="font-semibold text-slate-700">{order.customer_name}</span> {order.customer_phone ? `(${order.customer_phone})` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Cancellation Reason Callout if Cancelled */}
                      {order.status === 'cancelled' && (
                        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                          <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                          <div>
                            <span className="font-bold">Cancellation Reason:</span> {order.cancellation_reason || 'Cancelled by customer'}
                            {order.cancelled_at && <span className="text-rose-600/70 ml-2">({new Date(order.cancelled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>}
                          </div>
                        </div>
                      )}

                      {/* Card Footer: Metadata & Actions */}
                      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {order.order_type === 'drone_purchase' ? (
                            <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg">
                              {order.units_count} unit{order.units_count === 1 ? '' : 's'} · {order.package_type || order.drone_model}
                            </span>
                          ) : (
                            <>
                              <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg">
                                {order.package_type || 'Parcel'}
                              </span>
                              <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg">
                                {order.aerial_distance_km || 14} km (~{order.flight_duration_mins || 20}m flight)
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderDetail(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-[#ef7f1a] hover:bg-orange-50 border border-slate-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Details
                          </button>

                          {isLive && (
                            <button
                              type="button"
                              onClick={() => {
                                onNavigate('track');
                                window.history.pushState({}, '', `/track?id=${order.id}`);
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#ef7f1a] hover:bg-[#2a005c] transition-all shadow-xs cursor-pointer"
                            >
                              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Live Flight
                            </button>
                          )}

                          {isCancellable && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancellingOrder(order);
                                setCancelError('');
                                setCancelReason('Placed by mistake');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" /> Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ADDRESS MODAL (Add or Edit) ────────────────────────────────────── */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#171222]">{editingAddressId ? 'Edit Saved Address' : 'Add New Saved Address'}</h3>
                <p className="text-xs text-slate-400">Used for instant 1-click drone delivery dispatch</p>
              </div>
              <button onClick={() => setShowAddressModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="p-6 space-y-4">
              {/* Label Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Address Label</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Home', 'Office', 'Warehouse', 'Other'] as const).map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddressLabel(lbl)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        addressLabel === lbl ? 'border-[#ef7f1a] bg-orange-50 text-[#ef7f1a]' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Address Input with GPS Auto Detect */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Full Street Address / Building</label>
                  <button type="button" onClick={handleDetectAddressGps} disabled={isLocating} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ef7f1a] hover:underline">
                    {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3" />}
                    <span>{isLocating ? 'Detecting GPS...' : 'Auto-fill with GPS'}</span>
                  </button>
                </div>
                <textarea
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Tower B, 4th Floor, Sector 62, Electronic City, Noida"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-[#171222] focus:outline-none focus:border-[#ef7f1a] focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">City</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    placeholder="Noida"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-[#171222] focus:outline-none focus:border-[#ef7f1a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pincode</label>
                  <input
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    required
                    placeholder="201301"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-[#171222] focus:outline-none focus:border-[#ef7f1a]"
                  />
                </div>
              </div>

              {/* Recipient details (if sending to family, friend, colleague) */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contact Person at Address (Optional)</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={addressRecipient}
                    onChange={(e) => setAddressRecipient(e.target.value)}
                    placeholder="Recipient Name"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-[#171222] focus:outline-none focus:border-[#ef7f1a]"
                  />
                  <PhoneInput value={addressPhone} onChange={(v) => setAddressPhone(v)} placeholder="Recipient Phone" size="sm" inputClassName="text-xs" />
                </div>
              </div>

              {/* Default checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded border-slate-300 text-[#ef7f1a] focus:ring-orange-200 w-4 h-4" />
                <span className="text-xs font-semibold text-slate-600">Set as my default delivery address</span>
              </label>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 bg-[#ef7f1a] hover:bg-[#2a005c] text-white font-bold text-sm rounded-xl transition-all shadow-md">
                  {editingAddressId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── OTP VERIFY MODAL (Email or Phone) ───────────────────────────────── */}
      {otpModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ef7f1a] flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <button onClick={() => setOtpModalTarget(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-[#171222] mb-1">Verify {otpModalTarget === 'email' ? 'Email Address' : 'Mobile Phone'}</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              We dispatched a 6-digit verification code to <span className="font-bold text-[#171222]">{otpModalValue}</span>
            </p>

            {otpSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl mb-4">{otpSuccess}</div>}

            {otpError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl mb-4">{otpError}</div>}

            <form onSubmit={handleConfirmVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Enter 6-Digit Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                  placeholder="······"
                  className="w-full text-center text-2xl font-bold tracking-[0.3em] py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#ef7f1a] focus:ring-4 focus:ring-orange-100 text-[#171222] bg-slate-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading || otpCode.length !== 6}
                className="w-full py-3.5 bg-[#ef7f1a] hover:bg-[#2a005c] text-white font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{otpLoading ? 'Verifying...' : 'Verify & Update Status'}</span>
              </button>

              <div className="text-center pt-2">
                <button type="button" onClick={() => handleTriggerVerify(otpModalTarget, otpModalValue)} className="text-xs font-bold text-[#ef7f1a] hover:underline cursor-pointer">
                  Resend Verification Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ORDER DETAILS MODAL ─────────────────────────────────────────── */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ef7f1a] flex items-center justify-center">
                  <Plane className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#171222] font-mono">{selectedOrderDetail.id}</h3>
                    {renderStatusBadge(selectedOrderDetail.status)}
                  </div>
                  <p className="text-xs text-slate-400">Dispatched via IndoWings Aerial Logistics Network</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Timeline Progress */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Mission Flight Timeline</span>
                <div className="space-y-3">
                  {(
                    selectedOrderDetail.timeline || [
                      { step: 'Order Placed', done: true, time: selectedOrderDetail.created_at },
                      { step: 'Drone Assigned', done: Boolean(selectedOrderDetail.drone_id), time: selectedOrderDetail.created_at },
                      { step: 'Drone Taking Off', done: ['taking-off', 'in-flight', 'approaching', 'delivered'].includes(selectedOrderDetail.status), time: null },
                      { step: 'In-Flight Telemetry', done: ['in-flight', 'approaching', 'delivered'].includes(selectedOrderDetail.status), time: null },
                      { step: 'Approaching Drop Point', done: ['approaching', 'delivered'].includes(selectedOrderDetail.status), time: null },
                      { step: 'Delivered', done: selectedOrderDetail.status === 'delivered', time: null }
                    ]
                  ).map((stepItem: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          selectedOrderDetail.status === 'cancelled' && !stepItem.done ? 'bg-slate-200 text-slate-400' : stepItem.done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {stepItem.done ? '✓' : idx + 1}
                      </div>
                      <div className="flex-1 flex items-center justify-between text-xs">
                        <span className={`font-semibold ${stepItem.done ? 'text-slate-900' : 'text-slate-400'}`}>{stepItem.step}</span>
                        {stepItem.time && <span className="text-[10px] text-slate-400 font-mono">{new Date(stepItem.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedOrderDetail.status === 'cancelled' && (
                  <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                    <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      <strong>Mission Aborted:</strong> {selectedOrderDetail.cancellation_reason || 'Cancelled by customer'}
                    </span>
                  </div>
                )}
              </div>

              {/* Assigned Drone & Telemetry */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned UAV</span>
                  <span className="text-sm font-bold text-[#171222]">{selectedOrderDetail.drone_model || '700RPAV'}</span>
                  <span className="text-[11px] text-slate-400 block font-mono mt-0.5">{selectedOrderDetail.drone_id || 'ID: UAV-SYS-01'}</span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aerial Distance</span>
                  <span className="text-sm font-bold text-[#171222]">{selectedOrderDetail.aerial_distance_km || 14.2} km</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">~{selectedOrderDetail.flight_duration_mins || 24} mins flight</span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Consignment Package</span>
                  <span className="text-sm font-bold text-[#171222]">{selectedOrderDetail.units_count || 1} Unit{selectedOrderDetail.units_count === 1 ? '' : 's'}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">{selectedOrderDetail.package_type || selectedOrderDetail.drone_model || '700RPAV'}</span>
                </div>
              </div>

              {/* Flight Route Details */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Flight Waypoints</span>
                <div className="p-3 bg-slate-50 rounded-xl space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                    <div>
                      <span className="font-bold text-slate-700">Origin Hub:</span>
                      <p className="text-slate-600 mt-0.5">{selectedOrderDetail.pickup_address || 'IndoWings Regional Drone Port Alpha (Sector 62)'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-600 mt-1 shrink-0"></div>
                    <div>
                      <span className="font-bold text-slate-700">Drop Point:</span>
                      <p className="text-slate-600 mt-0.5">{selectedOrderDetail.drop_address}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer / Recipient Details */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Recipient Contact</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 text-[11px] block">Name</span>
                    <span className="font-bold text-slate-800">{selectedOrderDetail.customer_name || name}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 text-[11px] block">Email</span>
                    <span className="font-bold text-slate-800 truncate block">{selectedOrderDetail.customer_email || email}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 text-[11px] block">Phone</span>
                    <span className="font-bold text-slate-800">{selectedOrderDetail.customer_phone || phone || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="w-full sm:w-auto">
                {selectedOrderDetail.status !== 'delivered' && selectedOrderDetail.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancellingOrder(selectedOrderDetail);
                      setCancelError('');
                      setCancelReason('Placed by mistake');
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" /> Cancel This Order
                  </button>
                )}
              </div>

              <div className="w-full sm:w-auto flex items-center gap-2">
                {['assigned', 'taking-off', 'in-flight', 'approaching', 'on-hold', 'pending'].includes(selectedOrderDetail.status) && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('track');
                      window.history.pushState({}, '', `/track?id=${selectedOrderDetail.id}`);
                    }}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#ef7f1a] hover:bg-[#2a005c] transition-all shadow-sm cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Track Live Flight
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetail(null)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL ORDER CONFIRMATION MODAL ─────────────────────────────────── */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button type="button" onClick={() => setCancellingOrder(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-[#171222] mb-1">Cancel Drone Delivery</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Are you sure you want to cancel order <span className="font-mono font-bold text-[#171222]">{cancellingOrder.id}</span>? The assigned autonomous UAV will immediately abort its delivery
              mission and return to the nearest base hub.
            </p>

            {cancelError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl mb-4">{cancelError}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Please Select Cancellation Reason</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-[#171222] focus:outline-none focus:border-[#ef7f1a] bg-white"
                >
                  <option value="Placed by mistake">Placed by mistake</option>
                  <option value="Delivery address is wrong">Delivery address is wrong</option>
                  <option value="Delivery schedule delayed / change of plans">Delivery schedule delayed / change of plans</option>
                  <option value="Want to change package specifications">Want to change package specifications</option>
                  <option value="Alternative delivery arranged">Alternative delivery arranged</option>
                  <option value="Other reason">Other reason</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => setCancellingOrder(null)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleConfirmCancel}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-rose-900/10 flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  <span>{isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProfilePage;
