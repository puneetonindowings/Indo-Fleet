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
  ChevronDown,
  Smartphone,
  Download,
  QrCode,
  ExternalLink,
  Apple
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
  const getStartingTab = (): 'details' | 'addresses' | 'orders' | 'queries' | 'security' | 'downloads' => {
    if (initialTab) return initialTab as any;
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('tab');
      if (q === 'security' || q === 'password') return 'security';
      if (q === 'queries' || q === 'support' || q === 'tickets' || q === 'query') return 'queries';
      if (q === 'orders') return 'orders';
      if (q === 'addresses') return 'addresses';
      if (window.location.pathname.includes('/orders')) return 'orders';
      if (q === 'downloads' || q === 'app' || q === 'apk' || q === 'pilot-app') return 'downloads';
    }
    return 'details';
  };

  const [activeTab, setActiveTab] = useState<'details' | 'addresses' | 'orders' | 'queries' | 'security' | 'downloads'>(getStartingTab);
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

  // Active App Release State (Dynamic sync with Backend)
  const [appRelease, setAppRelease] = useState<{
    version: string;
    build_number?: number;
    package_size?: string;
    release_notes: string;
    android_url: string;
    ios_url: string;
    updated_at: string;
  }>({
    version: 'v1.1.7',
    build_number: 17,
    package_size: '~83 MB',
    release_notes: 'IndoFleet v1.1.7 (Build 17): Multi-drone two-stage inspection (Hub Pre-Acceptance & Customer Handover), fleet-wide serial QR verification against booked orders, light theme UI overhaul, and live radar tracking maps.',
    android_url: 'https://expo.dev/artifacts/eas/8NdM80FyCbuKx_pfNlxdzm0wFkAz2aZwp4iyrE04jtA.apk',
    ios_url: 'https://testflight.apple.com/join/IndoFleetDeliveryApp',
    updated_at: new Date().toISOString()
  });

  const [platformFilter, setPlatformFilter] = useState<'all' | 'android' | 'ios'>('all');

  // Fetch active release from backend on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/delivery/app-release`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.release) {
          setAppRelease(data.release);
        }
      })
      .catch(() => {});
  }, []);

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
      const res = await fetch(`${API_BASE_URL}/api/delivery/profile/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          target,
          value: val,
          otp: '000000'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || 'Failed to verify contact.');
        return;
      }

      if (data.user) {
        setProfile(data.user);
        onUpdateUser(data.user);
        localStorage.setItem('iw_delivery_user', JSON.stringify(data.user));
      }

      setOtpSuccess(`${target === 'email' ? 'Email' : 'Mobile number'} verified successfully!`);
      setTimeout(() => setOtpSuccess(''), 3000);
    } catch {
      setOtpError('Verification failed. Verify backend service is running.');
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
      const res = await fetch(`${API_BASE_URL}/api/delivery/profile/verify-change-password-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          userId: profile?.id,
          email: profile?.email || email,
          otp: '000000',
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setPassError(data.error || 'Failed to update password.');
        return;
      }

      setPassSuccess('Your password has been changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPassChangeStep('form');
    } catch {
      setPassError('Network error while updating password.');
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

  const roleLabel = ((r?: string) => {
    if (!r) return 'Verified Personnel';
    if (r === 'admin') return 'Super Admin';
    if (r === 'dispatcher') return 'Logistics Dispatcher';
    if (r === 'fleet_manager') return 'Fleet Manager';
    if (r === 'support') return 'Support Desk';
    if (r === 'customer') return 'Customer Account';
    if (r === 'delivery_partner' || r === 'pilot') return 'Delivery Partner';
    return r.replace(/_/g, ' ');
  })(profile?.role);

  const activeOrdersCount = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;

  const isDeliveryRole = ['delivery', 'pilot', 'delivery_partner'].includes((profile?.role || '').toLowerCase());

  const profileTabs: { id: 'details' | 'addresses' | 'orders' | 'queries' | 'security' | 'downloads'; label: string; icon: any; count?: number; badge?: string }[] = [
    { id: 'details', label: 'Personal Details', icon: User },
    ...(isDeliveryRole ? [{ id: 'downloads' as const, label: 'Download Pilot App', icon: Smartphone, badge: appRelease.version }] : []),
    { id: 'addresses', label: 'Saved Addresses', icon: MapPin, count: addresses.length },
    { id: 'orders', label: 'My Orders', icon: Clock, count: orders.length },
    { id: 'queries', label: 'Support', icon: HelpCircle, count: queries.length },
    { id: 'security', label: 'Password & Security', icon: KeyRound },
    ...(!isDeliveryRole ? [{ id: 'downloads' as const, label: 'Pilot Mobile App', icon: Smartphone, badge: 'APK' }] : [])
  ];

  const switchTab = (id: 'details' | 'addresses' | 'orders' | 'queries' | 'security' | 'downloads') => {
    setActiveTab(id);
    if (!embedded) window.history.replaceState({}, '', `/profile?tab=${id}`);
  };

  return (
    <div className={embedded ? 'bg-[#f7f4fb] pb-8' : 'min-h-screen bg-[#f7f4fb] pb-24'}>
      {/* ── DASHBOARD LAYOUT: sidebar + content ───────────────────────────── */}
      <div className={embedded ? 'pt-2' : 'max-w-6xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36'}>
        {!embedded && (
          <div className="flex items-center justify-between gap-4 mb-6">
            <button
              onClick={backTarget.action}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#5a00b8] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> {backTarget.label}
            </button>
            <button
              onClick={() => {
                onNavigate('track');
                window.history.pushState({}, '', '/track');
              }}
              className="inline-flex items-center gap-2 bg-[#5a00b8] hover:bg-[#4a0099] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-purple-900/20 active:scale-95 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-300 animate-pulse" /> Live Tracking
            </button>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] gap-8 items-start">
          {/* ── SIDEBAR ── */}
          <aside className={`space-y-4 mb-6 lg:mb-0 ${embedded ? '' : 'lg:sticky lg:top-28'}`}>
            {/* Identity card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-lg shadow-purple-900/5 overflow-hidden">
              <div
                className="h-24 relative"
                style={{ background: 'linear-gradient(125deg, #2a0063 0%, #5a00b8 55%, #8b5cf6 100%)' }}
              >
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
              </div>
              <div className="px-5 pb-5 -mt-10 relative">
                <div className="relative w-20 h-20">
                  <div className="w-20 h-20 rounded-3xl bg-white p-1 shadow-xl">
                    <div className="w-full h-full rounded-[20px] flex items-center justify-center text-3xl font-black text-white" style={{ background: 'linear-gradient(135deg, #5a00b8, #7c3aed)' }}>
                      {name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-[3px] border-white flex items-center justify-center">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </span>
                </div>

                <h1 className="text-xl font-black text-slate-900 tracking-tight mt-3 truncate">{name || 'Customer Account'}</h1>
                <p className="text-xs text-slate-500 truncate mt-0.5">{email || 'IndoFleet Drone Fleet Network'}</p>
                <span className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-[#5a00b8] border border-purple-100">
                  <ShieldCheck className="w-3.5 h-3.5" /> {roleLabel}
                </span>

                <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-slate-100 text-center">
                  <button type="button" onClick={() => switchTab('orders')} className="rounded-xl hover:bg-purple-50 py-2 transition-colors cursor-pointer">
                    <span className="block text-lg font-black text-slate-900 leading-none">{orders.length}</span>
                    <span className="block text-[10px] text-slate-500 font-semibold mt-1">Orders</span>
                  </button>
                  <button type="button" onClick={() => switchTab('orders')} className="rounded-xl hover:bg-purple-50 py-2 transition-colors cursor-pointer">
                    <span className="block text-lg font-black text-sky-600 leading-none">{activeOrdersCount}</span>
                    <span className="block text-[10px] text-slate-500 font-semibold mt-1">Active</span>
                  </button>
                  <button type="button" onClick={() => switchTab('addresses')} className="rounded-xl hover:bg-purple-50 py-2 transition-colors cursor-pointer">
                    <span className="block text-lg font-black text-slate-900 leading-none">{addresses.length}</span>
                    <span className="block text-[10px] text-slate-500 font-semibold mt-1">Addresses</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Delivery Partner App Quick Banner (Light Theme) */}
            {isDeliveryRole && (
              <div className="bg-gradient-to-br from-purple-50/90 via-slate-50 to-indigo-50/70 border border-purple-200/80 p-5 rounded-3xl shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-purple-100 text-[#5a00b8] flex items-center justify-center font-bold">
                      <Smartphone className="w-4 h-4 text-[#5a00b8]" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-[#5a00b8]">Pilot Companion</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {appRelease.version}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3.5">
                  Official multi-platform app for Android &amp; iOS. Receive orders, live road GPS routing, and camera QR scanning.
                </p>
                <button
                  type="button"
                  onClick={() => switchTab('downloads')}
                  className="w-full py-2.5 px-3 bg-[#5a00b8] hover:bg-[#480094] text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Download Mobile App</span>
                </button>
              </div>
            )}

            {/* Navigation */}
            <nav className="bg-white rounded-3xl border border-slate-200 shadow-sm p-2">
              <div className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
                {profileTabs.map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => switchTab(t.id)}
                      className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap lg:w-full text-left ${
                        isActive ? 'bg-purple-50 text-[#5a00b8]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {isActive && <span className="hidden lg:block absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full bg-[#5a00b8]" />}
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-[#5a00b8] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1">{t.label}</span>
                      {typeof t.count === 'number' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-[#5a00b8] text-white' : 'bg-slate-100 text-slate-600'}`}>{t.count}</span>
                      )}
                      {t.badge && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-white text-[#5a00b8]' : 'bg-emerald-100 text-emerald-800'}`}>{t.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Help shortcut */}
            <div className="hidden lg:block bg-purple-50/70 border border-purple-100 rounded-3xl p-5">
              <p className="text-sm font-black text-slate-900">Need help with an order?</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Raise a query and the support desk will reply here.</p>
              <button
                type="button"
                onClick={() => {
                  switchTab('queries');
                  setNewQueryError('');
                  setNewQuerySuccess('');
                  setShowNewQueryModal(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#5a00b8] hover:bg-[#4a0099] px-4 py-2 rounded-xl cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Submit a query
              </button>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <div className="space-y-8 pb-16 min-w-0">

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
          <div className="bg-white border border-slate-200 border-t-4 border-t-[#5a00b8] rounded-2xl p-6 sm:p-8 shadow-md shadow-purple-900/5">
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
                      className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm font-medium text-[#171222] focus:outline-none focus:border-[#5a00b8] focus:ring-2 focus:ring-purple-100 transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                    <button
                      type="button"
                      onClick={() => handleTriggerVerify('email', email)}
                      disabled={otpLoading}
                      className="text-xs font-bold text-[#5a00b8] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Verify Email via OTP
                    </button>
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@company.com"
                      className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm font-medium text-[#171222] focus:outline-none focus:border-[#5a00b8] focus:ring-2 focus:ring-purple-100 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">Order receipts, tracking links, and delivery telemetry are dispatched to this inbox.</p>
                </div>

                {/* Mobile Phone Number */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Phone Number</label>
                    <button
                      type="button"
                      onClick={() => handleTriggerVerify('phone', phone)}
                      disabled={otpLoading}
                      className="text-xs font-bold text-[#5a00b8] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Verify Phone via OTP
                    </button>
                  </div>
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
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#5a00b8] to-[#7c3aed] hover:from-[#4a0099] hover:to-[#6d28d9] text-white font-bold px-6 py-3.5 rounded-xl text-sm shadow-lg shadow-purple-900/25 transition-all disabled:opacity-60"
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
          <div className="bg-white border border-slate-200 border-t-4 border-t-[#5a00b8] rounded-2xl p-6 sm:p-8 shadow-md shadow-purple-900/5">
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
                      addr.is_default ? 'border-[#5a00b8] bg-purple-50/30 ring-1 ring-purple-100' : 'border-slate-200 bg-white hover:border-slate-300'
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
            <div className="bg-white border border-slate-200 border-t-4 border-t-[#5a00b8] rounded-2xl p-6 sm:p-8 shadow-md shadow-purple-900/5">
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
                          <p className="font-medium text-[#171222] leading-snug">{order.pickup_address || 'IndoFleet Dispatch Facility Alpha (Sector 62)'}</p>
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

        {/* ── MOBILE PILOT APP DOWNLOADS TAB (LIGHT THEME - ANDROID & IOS) ── */}
        {activeTab === 'downloads' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-8 animate-in fade-in duration-200">
            {/* Header & Platform Filter Switcher */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-[#5a00b8] flex items-center justify-center shadow-xs shrink-0">
                  <Smartphone className="w-6 h-6 text-[#5a00b8]" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      IndoFleet Pilot Mobile App
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {appRelease.version} (Build {appRelease.build_number || 14}) • Production Ready
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Official dedicated multi-platform application for delivery partners, drone couriers, and sortie pilots.
                  </p>
                </div>
              </div>

              {/* Platform Selector Segmented Control */}
              <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => setPlatformFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    platformFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Platforms
                </button>
                <button
                  type="button"
                  onClick={() => setPlatformFilter('android')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    platformFilter === 'android'
                      ? 'bg-white text-[#5a00b8] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Android</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlatformFilter('ios')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    platformFilter === 'ios'
                      ? 'bg-white text-[#5a00b8] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Apple className="w-3.5 h-3.5 text-slate-800" />
                  <span>Apple iOS</span>
                </button>
              </div>
            </div>

            {/* Platform Download Cards Grid (Light Theme - Both Android & iOS) */}
            <div className={`grid grid-cols-1 ${platformFilter === 'all' ? 'lg:grid-cols-2' : 'max-w-2xl mx-auto'} gap-6 items-stretch`}>
              
              {/* ── CARD 1: ANDROID NATIVE (.APK) ── */}
              {(platformFilter === 'all' || platformFilter === 'android') && (
                <div className="bg-white border-2 border-slate-100 hover:border-purple-200 rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        Android Native (.APK)
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">Updated Today</span>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        IndoFleet Pilot for Android
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        High-performance native release for Android smartphones and rugged drone flight tablets. Equipped with in-app QR laser scanner, real-time road GPS routing, and instant acceptance OTP.
                      </p>
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 text-center">
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Version</span>
                        <span className="block text-xs font-bold text-slate-900 mt-0.5">{appRelease.version} ({appRelease.build_number || 14})</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 text-center">
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">File Size</span>
                        <span className="block text-xs font-bold text-slate-900 mt-0.5">{appRelease.package_size || '~82 MB'}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 text-center">
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Platform</span>
                        <span className="block text-xs font-bold text-emerald-700 mt-0.5">Android 8.0+</span>
                      </div>
                    </div>

                    {/* QR Code and Scan Info */}
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                      <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(appRelease.android_url)}`}
                          alt="Scan to Download Android APK"
                          className="w-28 h-28 object-contain rounded-lg"
                        />
                      </div>
                      <div className="text-center sm:text-left space-y-1">
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-black text-slate-900">
                          <QrCode className="w-3.5 h-3.5 text-[#5a00b8]" /> Scan with Android Camera
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Scan this QR code with your phone camera or browser to start the direct over-the-air APK download instantly.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <a
                      href={appRelease.android_url}
                      download={`IndoFleet_Delivery_${appRelease.version}.apk`}
                      className="w-full py-3.5 px-6 rounded-2xl font-black text-xs text-white bg-[#5a00b8] hover:bg-[#480094] transition-all shadow-xs shadow-purple-900/15 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Download className="w-4 h-4 text-white" />
                      <span>Download Android APK ({appRelease.version})</span>
                    </a>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                      <span className="flex items-center gap-1 font-medium text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Play Protect Verified
                      </span>
                      <a
                        href="https://github.com/puneetonindowings/Indo-Fleet/releases"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#5a00b8] hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        GitHub Releases <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CARD 2: APPLE IOS (TESTFLIGHT & PWA) ── */}
              {(platformFilter === 'all' || platformFilter === 'ios') && (
                <div className="bg-white border-2 border-slate-100 hover:border-blue-200 rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                        <Apple className="w-3.5 h-3.5 text-slate-900" />
                        Apple iOS (TestFlight / PWA)
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">Active Beta</span>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        IndoFleet Pilot for iOS
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        Tailored for iPhone and iPad devices. Join the official Apple TestFlight pilot program or open directly in Safari and tap <strong>"Add to Home Screen"</strong> for full offline capability.
                      </p>
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 text-center">
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Channel</span>
                        <span className="block text-xs font-bold text-slate-900 mt-0.5">TestFlight</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 text-center">
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Devices</span>
                        <span className="block text-xs font-bold text-slate-900 mt-0.5">iPhone &amp; iPad</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 text-center">
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Min iOS</span>
                        <span className="block text-xs font-bold text-blue-700 mt-0.5">iOS 15.0+</span>
                      </div>
                    </div>

                    {/* QR Code and Scan Info */}
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                      <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(appRelease.ios_url)}`}
                          alt="Scan to Join Apple TestFlight"
                          className="w-28 h-28 object-contain rounded-lg"
                        />
                      </div>
                      <div className="text-center sm:text-left space-y-1">
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-black text-slate-900">
                          <QrCode className="w-3.5 h-3.5 text-blue-600" /> Scan with iPhone Camera
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Scan with your iPhone Camera to open the official TestFlight invitation or add IndoFleet web app to your iOS home screen.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <a
                        href={appRelease.ios_url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3.5 px-4 rounded-2xl font-black text-xs text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <Apple className="w-4 h-4 text-white" />
                        <span>Join TestFlight Beta</span>
                      </a>
                      <a
                        href="/pilot-app"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3.5 px-4 rounded-2xl font-black text-xs text-[#5a00b8] bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <ExternalLink className="w-4 h-4 text-[#5a00b8]" />
                        <span>Launch Web Pilot App</span>
                      </a>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Apple Sandbox Certified
                      </span>
                      <span className="text-slate-400">PWA Safari Ready</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Quick Installation Guide for Delivery Partners (Light Theme) */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-6 sm:p-7 space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#5a00b8]" /> Quick Installation Guide for Delivery Partners
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-50 text-[#5a00b8] border border-purple-100 text-xs font-black flex items-center justify-center">1</div>
                  <h5 className="text-xs font-bold text-slate-900">Choose Android or iOS</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Download the direct Android APK or scan the Apple TestFlight QR code from your mobile device.
                  </p>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-50 text-[#5a00b8] border border-purple-100 text-xs font-black flex items-center justify-center">2</div>
                  <h5 className="text-xs font-bold text-slate-900">Allow Installation</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    On Android, allow "Install from this source". On iOS, accept the TestFlight beta agreement.
                  </p>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-50 text-[#5a00b8] border border-purple-100 text-xs font-black flex items-center justify-center">3</div>
                  <h5 className="text-xs font-bold text-slate-900">Grant Permissions</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Allow Camera (for drone airframe QR scans) and Location access (for live road GPS routing).
                  </p>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-50 text-[#5a00b8] border border-purple-100 text-xs font-black flex items-center justify-center">4</div>
                  <h5 className="text-xs font-bold text-slate-900">Sign In &amp; Execute</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Log in with registered email ({profile?.email || email}) to receive real-time drone deliveries.
                  </p>
                </div>
              </div>
            </div>

            {/* Release Highlights (Light Theme) */}
            <div className="bg-purple-50/50 border border-purple-100 rounded-3xl p-6 space-y-3">
              <h5 className="text-xs font-bold text-[#5a00b8] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#5a00b8]" /> What's New in {appRelease.version} (Build {appRelease.build_number || 14})
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>In-App QR Scanner HUD:</strong> Dedicated laser scan viewfinder with auto-transition to Pre-Flight Inspection.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Native Camera &amp; Video Proof:</strong> In-app viewfinder snapshot capture, live video recording &amp; file upload.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Auto-Trigger Acceptance OTP:</strong> Automatic 6-digit OTP dispatch with 30s resend timer and dev quickfill.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Anchored Expressway Route:</strong> Sector 148 delivery geocoding rooted at IndoFleet Sector 60 Hub.</span>
                </div>
              </div>
            </div>

          </div>
        )}
          </div>
        </div>
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
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-[#171222] focus:outline-none focus:border-[#5a00b8] focus:ring-2 focus:ring-purple-100"
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
                  className="w-full text-center text-2xl font-bold tracking-[0.3em] py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#5a00b8] focus:ring-4 focus:ring-purple-100 text-[#171222] bg-slate-50/50"
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
                  <p className="text-xs text-slate-400">Dispatched via IndoFleet Aerial Logistics Network</p>
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
                      <p className="text-slate-600 mt-0.5">{selectedOrderDetail.pickup_address || 'IndoFleet Regional Dispatch Facility (Sector 62)'}</p>
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