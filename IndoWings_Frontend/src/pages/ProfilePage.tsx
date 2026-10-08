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
  EyeOff,
  Lock,
  ShieldCheck,
  HelpCircle,
  MessageSquare,
  Send,
  FileText,
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
  Truck,
  LayoutDashboard,
  Filter,
  ChevronDown
} from 'lucide-react';
import { CustomerOrderLiveMap } from '../components/CustomerOrderLiveMap';
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
  const getStartingTab = (): 'details' | 'addresses' | 'orders' | 'queries' | 'security' => {
    if (initialTab) return initialTab as any;
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('tab');
      if (q === 'security' || q === 'password') return 'security';
      if (q === 'queries' || q === 'support' || q === 'tickets' || q === 'query') return 'queries';
      if (q === 'orders') return 'orders';
      if (q === 'addresses') return 'addresses';
      if (window.location.pathname.includes('/orders')) return 'orders';
    }
    return 'details';
  };

  const [activeTab, setActiveTab] = useState<'details' | 'addresses' | 'orders' | 'queries' | 'security'>(getStartingTab);
  const [profile, setProfile] = useState<DeliveryUser | null>(currentUser);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [addresses, setAddresses] = useState<SavedAddress[]>(currentUser?.saved_addresses || []);

  // Password & Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passChangeStep, setPassChangeStep] = useState<'form' | 'otp'>('form');
  const [passOtpCode, setPassOtpCode] = useState('');
  const [passOtpLoading, setPassOtpLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [forgotPassLoading, setForgotPassLoading] = useState(false);
  const [forgotPassSuccess, setForgotPassSuccess] = useState('');
  const [forgotPassError, setForgotPassError] = useState('');
  const [passResendTimer, setPassResendTimer] = useState(60);

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Support Queries & Inquiries State
  const [queries, setQueries] = useState<any[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [queryFilter, setQueryFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [querySearch, setQuerySearch] = useState('');
  const [selectedQueryDetail, setSelectedQueryDetail] = useState<any | null>(null);
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);

  // New Query Modal State (Quick Query from Profile)
  const [showNewQueryModal, setShowNewQueryModal] = useState(false);
  const [newQueryCategory, setNewQueryCategory] = useState('General Support');
  const [newQuerySubject, setNewQuerySubject] = useState('');
  const [newQueryOrderId, setNewQueryOrderId] = useState('');
  const [newQueryMessage, setNewQueryMessage] = useState('');
  const [newQuerySubmitting, setNewQuerySubmitting] = useState(false);
  const [newQuerySuccess, setNewQuerySuccess] = useState('');
  const [newQueryError, setNewQueryError] = useState('');

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

  const fetchQueries = () => {
    const token = localStorage.getItem('iw_delivery_token');
    const userEmail = profile?.email || email || '';
    const userPhone = profile?.phone || phone || '';
    setLoadingQueries(true);
    fetch(`${API_BASE_URL}/api/delivery/profile/support-queries?email=${encodeURIComponent(userEmail)}&phone=${encodeURIComponent(userPhone)}`, {
      headers: { Authorization: `Bearer ${token || ''}` }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.queries)) {
          setQueries(data.queries);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingQueries(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    fetchQueries();
  }, [profile?.email, email, profile?.phone, phone]);

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handleCopyQueryId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedQueryId(id);
    setTimeout(() => setCopiedQueryId(null), 2000);
  };

  const handleSubmitNewQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueryMessage.trim()) {
      setNewQueryError('Please enter details of your query.');
      return;
    }

    setNewQuerySubmitting(true);
    setNewQueryError('');
    setNewQuerySuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/expert-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile?.name || name || 'Customer',
          email: profile?.email || email,
          phone: profile?.phone || phone,
          category: newQueryCategory,
          subject: newQuerySubject.trim() || newQueryCategory,
          order_id: newQueryOrderId.trim() || undefined,
          message: newQueryMessage.trim(),
          priority: 'normal'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setNewQueryError(data.error || 'Failed to submit support query.');
        return;
      }

      setNewQuerySuccess(`Inquiry #${data.request?.id || ''} logged successfully! Status will update here live.`);
      setNewQueryMessage('');
      setNewQuerySubject('');
      setNewQueryOrderId('');
      fetchQueries();
      setTimeout(() => {
        setShowNewQueryModal(false);
        setNewQuerySuccess('');
      }, 2000);
    } catch {
      setNewQueryError('Connection error while submitting support query.');
    } finally {
      setNewQuerySubmitting(false);
    }
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
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>On The Way</span>
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

  // ── Password Management Handlers ──────────────────────────────────────────
  useEffect(() => {
    let interval: any;
    if (passChangeStep === 'otp' && passResendTimer > 0) {
      interval = setInterval(() => {
        setPassResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [passChangeStep, passResendTimer]);

  const handleRequestPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    setForgotPassSuccess('');
    setForgotPassError('');

    if (!currentPassword.trim()) {
      setPassError('Please enter your current account password.');
      return;
    }
    if (!newPassword.trim()) {
      setPassError('Please enter your new desired password.');
      return;
    }
    if (newPassword.trim().length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New password and confirmation password do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setPassError('New password must be different from your current password.');
      return;
    }

    const token = localStorage.getItem('iw_delivery_token');
    setPassOtpLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/profile/request-change-password-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          userId: profile?.id,
          email: profile?.email || email,
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setPassError(data.error || 'Failed to initiate password change.');
        return;
      }

      setPassChangeStep('otp');
      setPassOtpCode('');
      setPassResendTimer(60);
      setPassSuccess(`Security verification code sent to your registered email (${data.destination || profile?.email || email}). Valid for 10 minutes.`);
    } catch {
      setPassError('Network error while requesting password OTP.');
    } finally {
      setPassOtpLoading(false);
    }
  };

  const handleVerifyPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    const cleanOtp = passOtpCode.replace(/[^0-9]/g, '').trim();
    if (cleanOtp.length !== 6) {
      setPassError('Please enter the 6-digit verification code.');
      return;
    }

    const token = localStorage.getItem('iw_delivery_token');
    setPassOtpLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/profile/verify-change-password-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          userId: profile?.id,
          email: profile?.email || email,
          otp: cleanOtp,
          newPassword: newPassword.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setPassError(data.error || 'Invalid or expired OTP code (Valid for 10 minutes).');
        return;
      }

      setPassSuccess('Your password has been changed successfully! Account security is up to date.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPassOtpCode('');
      setPassChangeStep('form');
    } catch {
      setPassError('Network error while verifying OTP.');
    } finally {
      setPassOtpLoading(false);
    }
  };

  const handleForgotPasswordInProfile = async () => {
    setForgotPassLoading(true);
    setForgotPassError('');
    setForgotPassSuccess('');
    setPassError('');

    const targetEmail = profile?.email || email;
    if (!targetEmail) {
      setForgotPassError('No email registered on this profile to send temporary password.');
      setForgotPassLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/auth/forgot-password-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });

      const data = await res.json();
      if (!res.ok) {
        setForgotPassError(data.error || 'Failed to dispatch temporary password.');
        return;
      }

      setForgotPassSuccess(`A 10-minute temporary password has been dispatched to ${targetEmail}. Use it as your Current Password below to set a new password.`);
    } catch {
      setForgotPassError('Connection error while sending temporary password.');
    } finally {
      setForgotPassLoading(false);
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
          {!embedded && (
            <button
              onClick={backTarget.action}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer mb-6 text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {backTarget.label}
            </button>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${embedded ? 'bg-purple-50 text-[#5a00b8]' : 'bg-white/10 border border-white/20 text-white shadow-inner'}`}>
                {name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${embedded ? 'text-slate-900' : ''}`}>{embedded ? 'My Profile' : name || 'Customer Account'}</h1>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${embedded ? 'bg-purple-50 text-[#5a00b8]' : 'bg-purple-500/20 text-purple-200 border border-purple-400/30'}`}>
                    {((r?: string) => {
                      if (!r) return 'Verified Personnel';
                      if (r === 'admin') return 'Super Admin';
                      if (r === 'dispatcher') return 'Logistics Operations Dispatcher';
                      if (r === 'fleet_manager') return 'Fleet Manager';
                      if (r === 'support') return 'Support Desk';
                      if (r === 'customer') return 'Customer Account';
                      if (r === 'delivery_partner' || r === 'pilot') return 'Delivery Partner';
                      return r.replace(/_/g, ' ');
                    })(profile?.role)}
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
              className="inline-flex items-center justify-center gap-2 bg-white text-[#5a00b8] hover:bg-purple-50 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95"
            >
              <Radio className="w-4 h-4 text-purple-600 animate-pulse" /> Live Telemetry Radar
            </button>}
          </div>

          {/* Mobile Tab Dropdown Selector (No sliding) */}
          <div className="md:hidden mt-6">
            <div className="relative">
              <select
                value={activeTab}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setActiveTab(val);
                  if (!embedded) window.history.replaceState({}, '', `/profile?tab=${val}`);
                }}
                className={`w-full font-bold text-xs px-4 py-3 rounded-xl appearance-none focus:outline-none cursor-pointer pr-10 shadow-sm transition-all ${
                  embedded
                    ? 'bg-slate-100 text-slate-800 border border-slate-200'
                    : 'bg-white/10 text-white border border-white/20 backdrop-blur-md focus:bg-white/20'
                }`}
              >
                <option value="details" className="text-slate-900 bg-white">Personal Details</option>
                <option value="addresses" className="text-slate-900 bg-white">Saved Addresses ({addresses.length})</option>
                <option value="orders" className="text-slate-900 bg-white">My Orders & History ({orders.length})</option>
                <option value="queries" className="text-slate-900 bg-white">Support & Inquiries ({queries.length})</option>
                <option value="security" className="text-slate-900 bg-white">Password & Security</option>
              </select>
              <ChevronDown className={`w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${embedded ? 'text-slate-600' : 'text-white/70'}`} />
            </div>
          </div>

          {/* Desktop Navigation Section Tabs (Clean Flex-Wrap, No Horizontal Scrollbar) */}
          <div className={`hidden md:flex flex-wrap items-center gap-2 ${embedded ? 'mt-4 pt-1' : 'mt-8 border-b border-white/20 pt-2'}`}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('details');
                if (!embedded) window.history.replaceState({}, '', '/profile?tab=details');
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer rounded-xl ${
                embedded
                  ? activeTab === 'details' ? 'bg-[#3B0080] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : activeTab === 'details' ? 'border-b-2 border-white text-white bg-white/10 rounded-t-xl' : 'border-b-2 border-transparent text-white/70 hover:text-white hover:border-white/40'
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
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer rounded-xl ${
                embedded
                  ? activeTab === 'addresses' ? 'bg-[#3B0080] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : activeTab === 'addresses' ? 'border-b-2 border-white text-white bg-white/10 rounded-t-xl' : 'border-b-2 border-transparent text-white/70 hover:text-white hover:border-white/40'
              }`}
            >
              <MapPin className="w-4 h-4" /> Saved Addresses
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                embedded
                  ? activeTab === 'addresses' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  : 'bg-white/20 text-white'
              }`}>{addresses.length}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('orders');
                if (!embedded) window.history.replaceState({}, '', '/profile?tab=orders');
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer rounded-xl ${
                embedded
                  ? activeTab === 'orders' ? 'bg-[#3B0080] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : activeTab === 'orders' ? 'border-b-2 border-white text-white bg-white/10 rounded-t-xl' : 'border-b-2 border-transparent text-white/70 hover:text-white hover:border-white/40'
              }`}
            >
              <Clock className="w-4 h-4" /> My Orders & History
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                embedded
                  ? activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  : 'bg-white/20 text-white'
              }`}>{orders.length}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('queries');
                if (!embedded) window.history.replaceState({}, '', '/profile?tab=queries');
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer rounded-xl ${
                embedded
                  ? activeTab === 'queries' ? 'bg-[#3B0080] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : activeTab === 'queries' ? 'border-b-2 border-white text-white bg-white/10 rounded-t-xl' : 'border-b-2 border-transparent text-white/70 hover:text-white hover:border-white/40'
              }`}
            >
              <HelpCircle className="w-4 h-4" /> Support &amp; Inquiries
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                embedded
                  ? activeTab === 'queries' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  : 'bg-white/20 text-white'
              }`}>{queries.length}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('security');
                if (!embedded) window.history.replaceState({}, '', '/profile?tab=security');
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer rounded-xl ${
                embedded
                  ? activeTab === 'security' ? 'bg-[#3B0080] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : activeTab === 'security' ? 'border-b-2 border-white text-white bg-white/10 rounded-t-xl' : 'border-b-2 border-transparent text-white/70 hover:text-white hover:border-white/40'
              }`}
            >
              <KeyRound className="w-4 h-4" /> Password &amp; Security
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
                  <User className="w-5 h-5 text-[#5a00b8]" />
                  Personal Profile & Contact Details
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage your credentials and verified contact info used for live consignment delivery updates.</p>
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
                      className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm font-medium text-[#171222] focus:outline-none focus:border-[#5a00b8] focus:ring-2 focus:ring-orange-100 transition-all"
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
                      className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm font-medium text-[#171222] focus:outline-none focus:border-[#5a00b8] focus:ring-2 focus:ring-orange-100 transition-all"
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
                  className="inline-flex items-center gap-2 bg-[#5a00b8] hover:bg-[#2a005c] text-white font-bold px-6 py-3.5 rounded-xl text-sm shadow-md shadow-slate-900/10 transition-all disabled:opacity-60"
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
                  <MapPin className="w-5 h-5 text-[#5a00b8]" />
                  Saved Delivery Addresses
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Addresses saved here will automatically show as 1-click quick selections when placing drone orders.</p>
              </div>

              <button
                onClick={() => handleOpenAddressModal()}
                className="inline-flex items-center gap-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[#5a00b8] font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#5a00b8]" /> Add New Address
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-[#5a00b8] flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#171222] mb-1">No Saved Addresses Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">Save your primary delivery locations, residential apartments, or corporate offices for instant checkout.</p>
                <button
                  onClick={() => handleOpenAddressModal()}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5a00b8] bg-white border border-purple-200 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors shadow-xs"
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
                      addr.is_default ? 'border-[#5a00b8] bg-purple-50/30 ring-1 ring-orange-100' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100/70 text-[#5a00b8] flex items-center justify-center text-xs font-bold">
                          {addr.label === 'Home' ? <Home className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-[#171222]">{addr.label}</span>
                          {addr.is_default && <span className="ml-2 text-[10px] font-bold bg-[#5a00b8] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Default</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button onClick={() => handleOpenAddressModal(addr)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#5a00b8] hover:bg-purple-50 transition-colors">
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
                        <button onClick={() => handleMakeDefault(addr.id)} className="text-[11px] font-bold text-[#5a00b8] hover:underline">
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
                    <Clock className="w-5 h-5 text-[#5a00b8]" />
                    My Drone Orders & History
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Track order progress, dispatch updates, deliveries, and cancellations.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchOrders()}
                    disabled={loadingOrders}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-[#5a00b8] hover:border-purple-200 hover:bg-purple-50 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Refresh Orders"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin text-[#5a00b8]' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('track');
                      window.history.pushState({}, '', '/track');
                    }}
                    className="inline-flex items-center gap-2 bg-[#5a00b8] hover:bg-[#2a005c] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-slate-900/10 cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5" /> Live Delivery Radar
                  </button>
                </div>
              </div>

              {/* Stats Counter Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
                <div
                  onClick={() => setOrderFilter('all')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    orderFilter === 'all' ? 'border-[#5a00b8] bg-purple-50/50 ring-1 ring-purple-200' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 shrink-0">
                    <Filter className="w-3.5 h-3.5 text-[#5a00b8]" /> Status:
                  </span>
                  <div className="relative min-w-[200px]">
                    <select
                      value={orderFilter}
                      onChange={(e) => setOrderFilter(e.target.value as any)}
                      className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#5a00b8] focus:bg-white transition cursor-pointer shadow-2xs"
                    >
                      <option value="all">All Orders ({orders.length})</option>
                      <option value="active">Active ({orders.filter(o => ['pending', 'assigned', 'taking-off', 'in-flight', 'approaching', 'out-for-delivery', 'in-transit'].includes(o.status)).length})</option>
                      <option value="delivered">Delivered ({orders.filter(o => o.status === 'delivered').length})</option>
                      <option value="cancelled">Cancelled ({orders.filter(o => o.status === 'cancelled').length})</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search Order ID, Drop point..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-[#171222] focus:outline-none focus:border-[#5a00b8] bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Order Cards List */}
            {loadingOrders && orders.length === 0 ? (
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-12 text-center shadow-sm">
                <Loader2 className="w-8 h-8 text-[#5a00b8] animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-600">Retrieving your consignment delivery logs...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-12 text-center shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#5a00b8] flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-7 h-7 text-[#5a00b8]" />
                </div>
                <h3 className="text-base font-bold text-[#171222] mb-1">{orderSearch ? 'No matching logs found' : 'No Consignment Records Found'}</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
                  {orderSearch ? 'Try checking for typos or searching by another keyword.' : 'No active road consignments or dispatch records found for your account.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('track');
                    window.history.pushState({}, '', '/track');
                  }}
                  className="inline-flex items-center gap-2 bg-[#5a00b8] hover:bg-[#2a005c] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <Radio className="w-4 h-4" /> Live Tracking
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const isLive = ['assigned', 'taking-off', 'in-flight', 'approaching', 'on-hold', 'pending'].includes(order.status);
                  const isCancellable = order.order_type === 'drone_purchase' ? order.status === 'pending' : order.status !== 'delivered' && order.status !== 'cancelled';

                  return (
                    <div key={order.id} className="bg-white border border-[#e2e8f0] hover:border-purple-200 transition-all rounded-2xl p-5 sm:p-6 shadow-sm">
                      {/* Card Top Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center shrink-0">
                            <Truck className="w-5 h-5 text-[#5a00b8]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-[#171222]">{order.id}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyOrderId(order.id)}
                                className="p-1 text-slate-400 hover:text-[#5a00b8] transition-colors cursor-pointer"
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
                        {/* Pickup Origin Location */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Pickup Origin Location
                          </span>
                          <p className="font-medium text-[#171222] leading-snug">{order.pickup_address || 'IndoWings Dispatch Facility Alpha (Sector 62)'}</p>
                        </div>

                        {/* Drop Destination */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-purple-600"></div> Drop Destination
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
                                {order.package_type || 'Consignment'}
                              </span>
                              <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg">
                                {order.aerial_distance_km || 14} km (~{order.flight_duration_mins || 20}m transit)
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderDetail(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-[#5a00b8] hover:bg-purple-50 border border-slate-200 transition-colors cursor-pointer"
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
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#5a00b8] hover:bg-[#2a005c] transition-all shadow-xs cursor-pointer"
                            >
                              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Live Tracking
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

        {/* ── TAB 4: SUPPORT & INQUIRIES ───────────────────────────────────────── */}
        {activeTab === 'queries' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Header Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#5a00b8] border border-purple-100 flex items-center justify-center shrink-0 shadow-xs">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#171222]">Support Inquiries &amp; Status</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time review and resolution status for your inquiries, consultations, and requests
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={fetchQueries}
                  disabled={loadingQueries}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-[#5a00b8] hover:bg-purple-50 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingQueries ? 'animate-spin' : ''}`} /> Refresh
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewQueryError('');
                    setNewQuerySuccess('');
                    setShowNewQueryModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#5a00b8] hover:bg-[#2a005c] transition-all shadow-md shadow-purple-900/10 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Submit New Query
                </button>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Inquiries</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{queries.length}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Progress / Pending</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">
                    {queries.filter((q) => q.status === 'open' || q.status === 'pending' || q.status === 'in_progress' || q.status === 'waiting_for_customer' || q.status === 'waiting_for_internal_team').length}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolved Queries</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">
                    {queries.filter((q) => q.status === 'resolved' || q.status === 'closed').length}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by ticket ID, topic, or message..."
                  value={querySearch}
                  onChange={(e) => setQuerySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5a00b8] focus:ring-2 focus:ring-purple-100 transition-all font-medium"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                {[
                  { key: 'all', label: 'All Inquiries' },
                  { key: 'open', label: 'Pending' },
                  { key: 'in_progress', label: 'In Progress' },
                  { key: 'resolved', label: 'Resolved' },
                  { key: 'closed', label: 'Closed' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setQueryFilter(tab.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      queryFilter === tab.key
                        ? 'bg-[#5a00b8] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Queries List */}
            {loadingQueries ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-xs">
                <Loader2 className="w-8 h-8 animate-spin text-[#5a00b8] mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-700">Loading Support Inquiries...</p>
              </div>
            ) : queries.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-xs space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#5a00b8] flex items-center justify-center mx-auto">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Support Inquiries Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Have a question regarding your order, delivery schedule, or account? Submit an inquiry and our 24x7 Support Desk will assist you.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewQueryModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#5a00b8] hover:bg-[#2a005c] transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Submit Your First Query
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {queries
                  .filter((q) => {
                    if (queryFilter === 'open' && !(q.status === 'open' || q.status === 'pending')) return false;
                    if (queryFilter === 'in_progress' && !(q.status === 'in_progress' || q.status === 'waiting_for_customer' || q.status === 'waiting_for_internal_team')) return false;
                    if (queryFilter === 'resolved' && q.status !== 'resolved') return false;
                    if (queryFilter === 'closed' && q.status !== 'closed') return false;

                    if (querySearch.trim()) {
                      const s = querySearch.toLowerCase().trim();
                      const matchId = (q.id || '').toLowerCase().includes(s);
                      const matchCategory = (q.category || q.subject || '').toLowerCase().includes(s);
                      const matchMsg = (q.message || '').toLowerCase().includes(s);
                      const matchOrder = (q.order_id || '').toLowerCase().includes(s);
                      const matchNotes = (q.resolution_notes || q.notes || '').toLowerCase().includes(s);
                      return matchId || matchCategory || matchMsg || matchOrder || matchNotes;
                    }
                    return true;
                  })
                  .map((query) => {
                    const isResolved = query.status === 'resolved' || query.status === 'closed';
                    const isInProgress = query.status === 'in_progress' || query.status === 'waiting_for_customer' || query.status === 'waiting_for_internal_team';

                    return (
                      <div
                        key={query.id}
                        className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-xs hover:border-purple-200 transition-all space-y-4"
                      >
                        {/* Header Line */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                              #{query.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyQueryId(query.id)}
                              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                              title="Copy Ticket ID"
                            >
                              {copiedQueryId === query.id ? (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span className="text-xs font-bold text-[#171222]">
                              {query.category || query.subject || 'Support Inquiry'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Status Badge */}
                            {isResolved ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Resolved
                              </span>
                            ) : isInProgress ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-[#5a00b8] border border-purple-200">
                                <RefreshCw className="w-3.5 h-3.5 text-[#5a00b8] animate-spin" /> In Progress
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
                              </span>
                            )}

                            <span className="text-[11px] text-slate-400 font-medium">
                              {query.created_at ? new Date(query.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        </div>

                        {/* Query Details & Message */}
                        <div className="space-y-3">
                          {query.order_id && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                              <Package className="w-3.5 h-3.5 text-purple-600" /> Associated Order #{query.order_id}
                            </div>
                          )}

                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 leading-relaxed font-normal">
                            <p className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider mb-1">Inquiry Details:</p>
                            <p>{query.message || 'No additional message provided.'}</p>
                          </div>

                          {/* Support Team Resolution Box */}
                          {(query.resolution_notes || query.notes) && (
                            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-1.5">
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Support Team Resolution &amp; Response:
                                </p>
                                {query.resolved_at && (
                                  <span className="text-[11px] text-emerald-700 font-medium">
                                    Resolved on {new Date(query.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <p className="text-emerald-900 leading-relaxed font-medium pl-5">
                                {query.resolution_notes || query.notes}
                              </p>
                              {query.resolved_by && (
                                <p className="text-[11px] text-emerald-700 font-semibold pl-5 pt-1">
                                  Handled by: {query.resolved_by}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions Footer */}
                        <div className="pt-2 flex items-center justify-between text-xs">
                          <div className="text-[11px] text-slate-400">
                            {query.timeline && query.timeline.length > 0 && `${query.timeline.length} update(s) recorded`}
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedQueryDetail(query)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[#5a00b8] hover:text-[#2a005c] hover:bg-purple-50 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Timeline &amp; Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: PASSWORD & SECURITY ─────────────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-100 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-8">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#5a00b8] border border-purple-100 flex items-center justify-center shrink-0 shadow-xs">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#171222]">Password &amp; Security Settings</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage your credentials, multi-factor OTP protection, and temporary access codes
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 text-[#5a00b8] text-xs font-semibold self-start sm:self-auto">
                <ShieldCheck className="w-4 h-4 text-[#5a00b8]" /> 10-Min OTP Protected
              </div>
            </div>

            {/* Notification messages */}
            {passSuccess && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-xs font-medium leading-relaxed">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-emerald-900">Success</p>
                  <p>{passSuccess}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPassSuccess('')}
                  className="text-emerald-500 hover:text-emerald-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {passError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-medium leading-relaxed">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-rose-900">Security Notice</p>
                  <p>{passError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPassError('')}
                  className="text-rose-500 hover:text-rose-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {forgotPassSuccess && (
              <div className="mb-6 p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-start gap-3 text-purple-900 text-xs font-medium leading-relaxed">
                <Mail className="w-5 h-5 text-[#5a00b8] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-purple-950">Temporary Password Dispatched</p>
                  <p>{forgotPassSuccess}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForgotPassSuccess('')}
                  className="text-[#5a00b8] hover:text-purple-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {forgotPassError && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 text-xs font-medium leading-relaxed">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-amber-950">Forgot Password Issue</p>
                  <p>{forgotPassError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForgotPassError('')}
                  className="text-amber-500 hover:text-amber-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Form or OTP Screen */}
              <div className="lg:col-span-7">
                {passChangeStep === 'form' ? (
                  /* ── STEP 1: PASSWORD FORM ── */
                  <form onSubmit={handleRequestPasswordOtp} className="space-y-5">
                    {/* Current Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Current Password
                        </label>
                        <button
                          type="button"
                          onClick={handleForgotPasswordInProfile}
                          disabled={forgotPassLoading}
                          className="text-xs font-bold text-[#5a00b8] hover:text-[#2a005c] hover:underline cursor-pointer disabled:opacity-50"
                        >
                          {forgotPassLoading ? 'Sending...' : 'Forgot Password?'}
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showCurrentPass ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          placeholder="Enter your current password or 10-min temp pass"
                          className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5a00b8] focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        If you forgot your password, click &quot;Forgot Password?&quot; to receive a temporary 10-minute password.
                      </p>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={6}
                          placeholder="Minimum 6 characters"
                          className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5a00b8] focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                          placeholder="Re-enter your new password"
                          className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5a00b8] focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-[11px] text-rose-500 font-semibold mt-1">
                          Passwords do not match.
                        </p>
                      )}
                    </div>

                    {/* Single Action Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={passOtpLoading || !currentPassword || !newPassword || newPassword !== confirmPassword}
                        className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-[#5a00b8] hover:bg-[#2a005c] transition-all shadow-md shadow-purple-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {passOtpLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <KeyRound className="w-4 h-4" />
                        )}
                        <span>{passOtpLoading ? 'Sending OTP Code...' : 'Save and Send OTP'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ── STEP 2: OTP VERIFICATION SCREEN ── */
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#5a00b8] flex items-center justify-center font-bold">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#171222]">Enter 6-Digit Security OTP</h3>
                          <p className="text-[11px] text-slate-500">
                            Sent to registered email ({profile?.email || email})
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                        10 Min Validity
                      </span>
                    </div>

                    <form onSubmit={handleVerifyPasswordOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Verification Code
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={passOtpCode}
                          onChange={(e) => setPassOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          autoFocus
                          required
                          placeholder="Enter 6-digit code"
                          className="w-full text-center tracking-[0.4em] font-mono text-xl py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-300 placeholder:tracking-normal focus:outline-none focus:border-[#5a00b8] focus:ring-2 focus:ring-purple-100 transition-all font-bold"
                        />
                        <p className="text-[11px] text-slate-500 text-center mt-2">
                          Code is valid for strictly 10 minutes from request.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={passOtpLoading || passOtpCode.length !== 6}
                        className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {passOtpLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>{passOtpLoading ? 'Verifying...' : 'Verify OTP and Change Password'}</span>
                      </button>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setPassChangeStep('form');
                            setPassOtpCode('');
                            setPassError('');
                          }}
                          className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Back to Edit Password
                        </button>

                        <button
                          type="button"
                          onClick={handleRequestPasswordOtp}
                          disabled={passResendTimer > 0 || passOtpLoading}
                          className="font-bold text-[#5a00b8] hover:text-[#2a005c] hover:underline cursor-pointer disabled:text-slate-400 disabled:no-underline"
                        >
                          {passResendTimer > 0 ? `Resend code in ${passResendTimer}s` : 'Resend Code'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Right Column: Security Policy & Highlights */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase tracking-wider">
                    <Shield className="w-4 h-4 text-[#5a00b8]" />
                    <span>Security &amp; OTP Policy</span>
                  </div>

                  <div className="space-y-3 text-xs text-purple-950/80 leading-relaxed">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-purple-200 text-purple-900 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                        1
                      </div>
                      <p>
                        <strong className="text-purple-950 font-bold">10-Minute Expiration:</strong> All verification OTP codes and temporary reset passwords remain valid for strictly 10 minutes.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-purple-200 text-purple-900 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                        2
                      </div>
                      <p>
                        <strong className="text-purple-950 font-bold">Two-Step Verification:</strong> Password changes are only committed after successful 6-digit OTP email validation.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-purple-200 text-purple-900 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                        3
                      </div>
                      <p>
                        <strong className="text-purple-950 font-bold">Forgot Password Recovery:</strong> Dispatches a 10-minute temporary password directly to your registered email address.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Need Assistance?
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    If you are having trouble receiving security codes or accessing your account, please reach out to the IndoFleet Operations Support Desk.
                  </p>
                </div>
              </div>
            </div>
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
                        addressLabel === lbl ? 'border-[#5a00b8] bg-purple-50 text-[#5a00b8]' : 'border-slate-200 text-slate-600 hover:border-slate-300'
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
                  <button type="button" onClick={handleDetectAddressGps} disabled={isLocating} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5a00b8] hover:underline">
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
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-[#171222] focus:outline-none focus:border-[#5a00b8] focus:ring-2 focus:ring-orange-100"
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
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-[#171222] focus:outline-none focus:border-[#5a00b8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pincode</label>
                  <input
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    required
                    placeholder="201301"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-[#171222] focus:outline-none focus:border-[#5a00b8]"
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
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-[#171222] focus:outline-none focus:border-[#5a00b8]"
                  />
                  <PhoneInput value={addressPhone} onChange={(v) => setAddressPhone(v)} placeholder="Recipient Phone" size="sm" inputClassName="text-xs" />
                </div>
              </div>

              {/* Default checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded border-slate-300 text-[#5a00b8] focus:ring-purple-200 w-4 h-4" />
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
                <button type="submit" className="flex-1 py-3 bg-[#5a00b8] hover:bg-[#2a005c] text-white font-bold text-sm rounded-xl transition-all shadow-md">
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
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center">
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
                  className="w-full text-center text-2xl font-bold tracking-[0.3em] py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#5a00b8] focus:ring-4 focus:ring-orange-100 text-[#171222] bg-slate-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading || otpCode.length !== 6}
                className="w-full py-3.5 bg-[#5a00b8] hover:bg-[#2a005c] text-white font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{otpLoading ? 'Verifying...' : 'Verify & Update Status'}</span>
              </button>

              <div className="text-center pt-2">
                <button type="button" onClick={() => handleTriggerVerify(otpModalTarget, otpModalValue)} className="text-xs font-bold text-[#5a00b8] hover:underline cursor-pointer">
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
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5a00b8] flex items-center justify-center">
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
              {/* Live Interactive Transit Map */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Delivery Transit Map &amp; Tracking
                  </span>
                  <span className="text-xs font-semibold text-purple-700 font-mono">
                    {selectedOrderDetail.drone_model || '700RPAV'}
                  </span>
                </div>
                <CustomerOrderLiveMap order={selectedOrderDetail} className="h-64 sm:h-72" />
              </div>

              {/* Timeline Progress */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Consignment Delivery Timeline</span>
                <div className="space-y-3">
                  {(
                    (selectedOrderDetail.timeline || [
                      { step: 'Order Placed', done: true, time: selectedOrderDetail.created_at },
                      { step: 'Drone Unit Allocated', done: Boolean(selectedOrderDetail.drone_id), time: selectedOrderDetail.created_at },
                      { step: 'Dispatched from Hub', done: ['taking-off', 'in-flight', 'approaching', 'delivered', 'on-hold', 'out-for-delivery'].includes(selectedOrderDetail.status), time: null },
                      { step: 'Out for Road Delivery', done: ['in-flight', 'approaching', 'delivered', 'on-hold', 'out-for-delivery'].includes(selectedOrderDetail.status), time: null },
                      { step: 'Approaching Destination', done: ['approaching', 'delivered'].includes(selectedOrderDetail.status), time: null },
                      { step: 'Delivered', done: selectedOrderDetail.status === 'delivered', time: null }
                    ]).filter((stepItem: any) => !['Delivery placed on hold', 'Delivery resumed'].includes(stepItem.step))
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
                      <strong>Delivery Cancelled:</strong> {selectedOrderDetail.cancellation_reason || 'Cancelled by customer'}
                    </span>
                  </div>
                )}
              </div>

              {/* Assigned Hardware & Transit Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Drone Hardware Unit</span>
                  <span className="text-sm font-bold text-[#171222]">{selectedOrderDetail.drone_model || '700RPAV'}</span>
                  <span className="text-[11px] text-slate-400 block font-mono mt-0.5">{selectedOrderDetail.drone_id || 'SN-700RPAV'}</span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transit Distance</span>
                  <span className="text-sm font-bold text-[#171222]">{selectedOrderDetail.aerial_distance_km || 14.2} km</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">~{selectedOrderDetail.flight_duration_mins || 24} mins transit</span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Consignment Package</span>
                  <span className="text-sm font-bold text-[#171222]">{selectedOrderDetail.units_count || 1} Unit{selectedOrderDetail.units_count === 1 ? '' : 's'}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">{selectedOrderDetail.package_type || selectedOrderDetail.drone_model || '700RPAV'}</span>
                </div>
              </div>

              {/* Route Details */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Delivery Route Waypoints</span>
                <div className="p-3 bg-slate-50 rounded-xl space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                    <div>
                      <span className="font-bold text-slate-700">Origin Facility:</span>
                      <p className="text-slate-600 mt-0.5">{selectedOrderDetail.pickup_address || 'IndoWings Regional Dispatch Facility (Sector 62)'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-600 mt-1 shrink-0"></div>
                    <div>
                      <span className="font-bold text-slate-700">Drop Destination:</span>
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
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#5a00b8] hover:bg-[#2a005c] transition-all shadow-sm cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Track Live Delivery
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
              mission and return to the nearest base facility.
            </p>

            {cancelError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl mb-4">{cancelError}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Please Select Cancellation Reason</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-[#171222] focus:outline-none focus:border-[#5a00b8] bg-white"
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

      {/* ── QUERY DETAIL & TIMELINE MODAL ───────────────────────────────────── */}
      {selectedQueryDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5a00b8] border border-purple-100 flex items-center justify-center font-bold">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      #{selectedQueryDetail.id}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {selectedQueryDetail.category || selectedQueryDetail.subject || 'Support Inquiry'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Submitted on {selectedQueryDetail.created_at ? new Date(selectedQueryDetail.created_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedQueryDetail.status === 'resolved' || selectedQueryDetail.status === 'closed' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Resolved
                  </span>
                ) : selectedQueryDetail.status === 'in_progress' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-[#5a00b8] border border-purple-200">
                    <RefreshCw className="w-3.5 h-3.5 text-[#5a00b8] animate-spin" /> In Progress
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedQueryDetail(null)}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Inquiry Message */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Your Submitted Inquiry</p>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
                  {selectedQueryDetail.message || 'No description provided.'}
                </p>
                {selectedQueryDetail.order_id && (
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold">
                      <Package className="w-3.5 h-3.5 text-purple-600" /> Linked Order #{selectedQueryDetail.order_id}
                    </span>
                  </div>
                )}
              </div>

              {/* Support Resolution / Response */}
              {(selectedQueryDetail.resolution_notes || selectedQueryDetail.notes) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Support Desk Resolution
                    </p>
                    {selectedQueryDetail.resolved_at && (
                      <span className="text-[11px] font-semibold text-emerald-700">
                        {new Date(selectedQueryDetail.resolved_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed font-medium pl-5 whitespace-pre-wrap">
                    {selectedQueryDetail.resolution_notes || selectedQueryDetail.notes}
                  </p>
                  {selectedQueryDetail.resolved_by && (
                    <p className="text-[11px] text-emerald-700 font-semibold pl-5 pt-1">
                      Assigned Specialist: {selectedQueryDetail.resolved_by}
                    </p>
                  )}
                </div>
              )}

              {/* Timeline of Status Updates */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Status Progress &amp; Audit Timeline
                </h4>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {/* Item 1: Created */}
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#5a00b8] border-2 border-white ring-2 ring-purple-100" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Inquiry Received &amp; Logged</p>
                      <p className="text-[11px] text-slate-400">
                        {selectedQueryDetail.created_at ? new Date(selectedQueryDetail.created_at).toLocaleString() : 'N/A'} &bull; Dispatched to Logistics Support Team
                      </p>
                    </div>
                  </div>

                  {/* Status History Timeline */}
                  {Array.isArray(selectedQueryDetail.timeline) && selectedQueryDetail.timeline.map((item: any, idx: number) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-100" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {item.type === 'status_change'
                            ? `Status updated to ${item.to}`
                            : item.type === 'call'
                            ? `Phone Call: ${item.outcome || 'Logged'}`
                            : item.type === 'resolution'
                            ? 'Resolution Recorded'
                            : 'Update Logged'}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {item.details || item.remarks || item.note || `Action recorded by ${item.actor_name || 'Support Agent'}`}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Resolved Step */}
                  {(selectedQueryDetail.status === 'resolved' || selectedQueryDetail.status === 'closed') && (
                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white ring-2 ring-emerald-200" />
                      <div>
                        <p className="text-xs font-bold text-emerald-900">Case Resolved &amp; Closed</p>
                        <p className="text-[11px] text-emerald-700">
                          {selectedQueryDetail.resolved_at ? new Date(selectedQueryDetail.resolved_at).toLocaleString() : 'Confirmation email sent to user'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedQueryDetail(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBMIT NEW INQUIRY MODAL ────────────────────────────────────────── */}
      {showNewQueryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5a00b8] border border-purple-100 flex items-center justify-center font-bold">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Submit Support Inquiry</h3>
                  <p className="text-[11px] text-slate-500">24x7 IndoFleet Operations &amp; Help Desk</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewQueryModal(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6">
              {newQuerySuccess ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-bold text-sm text-emerald-950">Inquiry Submitted Successfully!</p>
                  <p className="leading-relaxed">{newQuerySuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitNewQuery} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Inquiry Category
                    </label>
                    <select
                      value={newQueryCategory}
                      onChange={(e) => setNewQueryCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#5a00b8] focus:bg-white"
                    >
                      <option value="General Support">General Support</option>
                      <option value="Delivery Status & Tracking">Delivery Status &amp; Tracking</option>
                      <option value="Commercial Consultation">Commercial Fleet Consultation</option>
                      <option value="Technical Operations">Technical &amp; Avionics Help</option>
                      <option value="Billing & Invoicing">Billing &amp; Invoicing</option>
                      <option value="Other Inquiry">Other Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Subject / Topic (Optional)
                    </label>
                    <input
                      type="text"
                      value={newQuerySubject}
                      onChange={(e) => setNewQuerySubject(e.target.value)}
                      placeholder="e.g. Schedule delivery for tomorrow morning"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5a00b8] focus:bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Associated Order ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={newQueryOrderId}
                      onChange={(e) => setNewQueryOrderId(e.target.value)}
                      placeholder="e.g. ORD-1002"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5a00b8] focus:bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Inquiry Details &amp; Message *
                    </label>
                    <textarea
                      rows={4}
                      value={newQueryMessage}
                      onChange={(e) => setNewQueryMessage(e.target.value)}
                      required
                      placeholder="Describe your inquiry or support issue in detail..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5a00b8] focus:bg-white font-medium resize-none"
                    />
                  </div>

                  {newQueryError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{newQueryError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowNewQueryModal(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={newQuerySubmitting || !newQueryMessage.trim()}
                      className="flex-1 py-3 rounded-xl font-bold text-xs text-white bg-[#5a00b8] hover:bg-[#2a005c] transition-all shadow-md shadow-purple-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {newQuerySubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>{newQuerySubmitting ? 'Submitting...' : 'Submit Inquiry'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProfilePage;
