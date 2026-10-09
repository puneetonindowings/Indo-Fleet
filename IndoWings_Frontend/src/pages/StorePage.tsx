import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MapPin,
  Package,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  ShieldCheck,
  Truck,
  Trash2,
  Check,
  Zap,
  Clock,
  Radio,
  Star,
  Award,
  Compass,
  ChevronLeft,
  Eye,
  SlidersHorizontal,
  Lock
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { DeliveryUser, SavedAddress } from '../types';
import PhoneInput from '../components/PhoneInput';

interface StorePageProps {
  currentUser: DeliveryUser | null;
  onNavigate: (page: string) => void;
  embedded?: boolean;
}

export interface StoreDrone {
  id: string;
  model: string;
  serial_number?: string;
  category?: string;
  image_url?: string;
  battery?: number;
  speed_kmh?: number;
  payload_kg?: number;
  current_city?: string;
  qc_status?: string;
  status?: string;
  is_verified?: boolean;
}

interface AddressDraft {
  recipient_name: string;
  recipient_phone: string;
  full_address: string;
  landmark: string;
  city: string;
  pincode: string;
}

const emptyAddress = (user: DeliveryUser | null): AddressDraft => ({
  recipient_name: user?.name || '',
  recipient_phone: user?.phone || '',
  full_address: '',
  landmark: '',
  city: '',
  pincode: ''
});

export const StorePage: React.FC<StorePageProps> = ({ currentUser, onNavigate, embedded = false }) => {
  const [drones, setDrones] = useState<StoreDrone[]>([]);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(embedded ? 12 : 24);
  const [addresses, setAddresses] = useState<SavedAddress[]>(currentUser?.saved_addresses || []);
  
  // Selected drone for Dedicated Full-Page Product Detail View
  const [detailDrone, setDetailDrone] = useState<StoreDrone | null>(null);
  const [productTab, setProductTab] = useState<'specs' | 'inBox' | 'applications'>('specs');

  // Cart maps droneId -> StoreDrone
  const [cart, setCart] = useState<Record<string, StoreDrone>>(() => {
    try {
      return JSON.parse(localStorage.getItem('iw_store_cart_drones') || '{}');
    } catch {
      return {};
    }
  });

  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(() => emptyAddress(currentUser));
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Fetch drones from backend
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/delivery/store/products`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load drone inventory.');
        const rawList = data.drones || data.products || [];
        const loadedDrones = rawList.filter((d: StoreDrone) => (!d.status || d.status === 'idle') && (!d.qc_status || d.qc_status === 'passed'));
        setDrones(loadedDrones);
        
        // Clean out any cart items that are already booked / reserved
        setCart(prev => {
          const availableIds = new Set(loadedDrones.map((d: StoreDrone) => d.id));
          const next = { ...prev };
          let changed = false;
          for (const key of Object.keys(next)) {
            if (!availableIds.has(key)) {
              delete next[key];
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      })
      .catch(err => setError(err.message || 'Could not load drone inventory.'))
      .finally(() => setLoading(false));
  }, []);

  // Check URL params for direct product page access e.g. /store?drone=INW-700RPAV-0004
  useEffect(() => {
    const checkUrlDrone = () => {
      const params = new URLSearchParams(window.location.search);
      const droneParam = params.get('drone') || params.get('id');
      if (droneParam && drones.length > 0) {
        const found = drones.find(d => d.id.toLowerCase() === droneParam.toLowerCase());
        if (found) {
          setDetailDrone(found);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
      if (!droneParam) {
        setDetailDrone(null);
      }
    };
    checkUrlDrone();
    window.addEventListener('popstate', checkUrlDrone);
    return () => window.removeEventListener('popstate', checkUrlDrone);
  }, [drones]);

  useEffect(() => {
    if (!currentUser) return;
    const token = localStorage.getItem('iw_delivery_token');
    if (!token) return;
    fetch(`${API_BASE_URL}/api/delivery/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async response => {
        const data = await response.json();
        if (response.ok && data.user) {
          const saved = data.user.saved_addresses || [];
          setAddresses(saved);
          const defaultAddress = saved.find((address: SavedAddress) => address.is_default) || saved[0];
          if (defaultAddress) setSelectedAddressId(defaultAddress.id);
          setAddressDraft(emptyAddress(data.user));
        }
      })
      .catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('iw_store_cart_drones', JSON.stringify(cart));
    window.dispatchEvent(new Event('iw_cart_updated'));
  }, [cart]);

  // Filter and sort drones by Drone ID / search query
  const filteredDrones = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = drones;
    if (q) {
      list = drones.filter(drone => {
        return (
          drone.id.toLowerCase().includes(q) ||
          drone.model.toLowerCase().includes(q) ||
          (drone.serial_number || '').toLowerCase().includes(q)
        );
      });
    }
    return [...list].sort((a, b) => {
      if (sortOrder === 'asc') return a.id.localeCompare(b.id, undefined, { numeric: true });
      return b.id.localeCompare(a.id, undefined, { numeric: true });
    });
  }, [drones, search, sortOrder]);

  const totalUnits = useMemo(() => Object.keys(cart).length, [cart]);
  const pageCount = Math.max(1, Math.ceil(filteredDrones.length / pageSize));
  const visibleDrones = filteredDrones.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > pageCount) {
      setPage(1);
    }
  }, [page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, sortOrder, filteredDrones.length]);

  const toggleCartDrone = (drone: StoreDrone, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setError('');
    setCart(prev => {
      const next = { ...prev };
      if (next[drone.id]) {
        delete next[drone.id];
      } else {
        next[drone.id] = drone;
      }
      return next;
    });
  };

  const removeDroneFromCart = (droneId: string) => {
    setCart(prev => {
      const next = { ...prev };
      delete next[droneId];
      return next;
    });
  };

  const selectedAddress = addresses.find(address => address.id === selectedAddressId);

  const navigateToLogin = () => {
    onNavigate('login');
    window.history.pushState({}, '', '/login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Full-Page Product View
  const handleOpenDetail = (drone: StoreDrone) => {
    setDetailDrone(drone);
    setProductTab('specs');
    window.history.pushState({}, '', `/store?drone=${drone.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back to Main Store Grid
  const handleBackToStore = () => {
    setDetailDrone(null);
    window.history.pushState({}, '', '/store');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // View mode: 'grid' (products list) vs 'cart' (dedicated cart & booking page)
  const [storeView, setStoreView] = useState<'grid' | 'cart'>(() => {
    if (typeof window !== 'undefined' && (window.location.pathname.includes('/cart') || window.location.search.includes('cart'))) {
      return 'cart';
    }
    return 'grid';
  });

  // Sync view mode with URL state
  useEffect(() => {
    const handleUrlChange = () => {
      if (window.location.pathname.includes('/cart') || window.location.search.includes('cart')) {
        setStoreView('cart');
      } else {
        setStoreView('grid');
      }
    };
    handleUrlChange();
    window.addEventListener('popstate', handleUrlUrlStateChange);
    return () => window.removeEventListener('popstate', handleUrlUrlStateChange);
    function handleUrlUrlStateChange() { handleUrlChange(); }
  }, []);

  const openCartPage = () => {
    setStoreView('cart');
    window.history.pushState({}, '', '/cart');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openGridStorePage = () => {
    setStoreView('grid');
    window.history.pushState({}, '', '/store');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookNowDirect = (drone: StoreDrone) => {
    if (!cart[drone.id]) {
      setCart(prev => ({ ...prev, [drone.id]: drone }));
    }
    setDetailDrone(null);
    openCartPage();
  };

  // Sequence navigation
  const { prevDrone, nextDrone } = useMemo(() => {
    if (!detailDrone || drones.length === 0) return { prevDrone: null, nextDrone: null };
    const currentIndex = drones.findIndex(d => d.id === detailDrone.id);
    const prev = currentIndex > 0 ? drones[currentIndex - 1] : null;
    const next = currentIndex < drones.length - 1 ? drones[currentIndex + 1] : null;
    return { prevDrone: prev, nextDrone: next };
  }, [detailDrone, drones]);

  const placeBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    const droneIds = Object.keys(cart);
    if (!droneIds.length) {
      setError('Select at least one drone unit to book.');
      return;
    }
    if (!currentUser) {
      setError('Sign in with your customer account to place a drone booking.');
      return;
    }
    if (currentUser.role !== 'customer') {
      setError('Drone bookings are available for customer accounts. Sign out and use your customer credentials.');
      return;
    }

    const address = selectedAddress || {
      ...addressDraft,
      label: 'Home' as const,
      id: `ADDR-${Date.now()}`,
      is_default: addresses.length === 0
    };
    if (!address.full_address.trim()) {
      setError('Enter a delivery facility address or choose one of your saved addresses.');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('iw_delivery_token');
    try {
      let bookingAddress = address;
      if (!selectedAddress) {
        const savedAddresses = [...addresses, address];
        const profileResponse = await fetch(`${API_BASE_URL}/api/delivery/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone || '',
            saved_addresses: savedAddresses
          })
        });
        const profileData = await profileResponse.json();
        if (!profileResponse.ok) throw new Error(profileData.error || 'Could not save your delivery address.');
        if (profileData.token) localStorage.setItem('iw_delivery_token', profileData.token);
        localStorage.setItem('iw_delivery_user', JSON.stringify(profileData.user));
        bookingAddress = address;
        setAddresses(savedAddresses);
        setSelectedAddressId(address.id);
      }

      const response = await fetch(`${API_BASE_URL}/api/delivery/store/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('iw_delivery_token') || token}`
        },
        body: JSON.stringify({
          drone_ids: droneIds,
          address: bookingAddress,
          delivery_notes: deliveryNotes
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not place your booking.');
      setCart({});
      setDeliveryNotes('');
      setNotice(`Booking confirmed! Consignment Order ID: ${data.order.id}. Confirmation details have been emailed.`);
      onNavigate('orders');
      window.history.pushState({}, '', '/profile?tab=orders');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place your booking.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: AUTHENTICATION REQUIRED GATEWAY
  // ─────────────────────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 pt-28 sm:pt-36 pb-20 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#5a00b8] flex items-center justify-center mx-auto mb-4 border border-purple-100 shadow-2xs">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Login Required for Fleet Store</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Access to IndoFleet 700RPAV Fleet Store and aircraft consignment booking is restricted to verified users. Please sign in to view available inventory units and schedule deliveries.
          </p>
          <button
            onClick={() => {
              onNavigate('login');
              window.history.pushState({}, '', '/login');
            }}
            className="w-full py-3 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Sign In to Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: DEDICATED CART & BOOKING CHECKOUT PAGE
  // ─────────────────────────────────────────────────────────────────────────────
  if (storeView === 'cart') {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 pt-24 sm:pt-28 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-6">
          <button
            onClick={openGridStorePage}
            className="inline-flex items-center gap-1.5 font-bold text-xs text-[#5a00b8] hover:underline cursor-pointer mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Continue Browsing Store
          </button>

          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Consignment Cart &amp; Booking
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Review your reserved drone units, enter facility delivery address, and confirm consignment booking.
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#5a00b8] border border-purple-100 flex items-center justify-center font-bold shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          {/* Selected Units Section */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#5a00b8]" />
                Selected Drone Units ({totalUnits})
              </h2>
              {totalUnits > 0 && (
                <button
                  onClick={() => setCart({})}
                  className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {totalUnits === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                <ShoppingCart className="w-10 h-10 mx-auto text-slate-300" />
                <h3 className="text-sm font-bold text-slate-800">Your consignment cart is empty</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Browse available 700RPAV tactical units in the store and add them to your cart to proceed with booking.
                </p>
                <button
                  onClick={openGridStorePage}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-[#5a00b8] text-white text-xs font-bold hover:bg-[#4a0099] cursor-pointer shadow-xs transition-all inline-flex items-center gap-1.5"
                >
                  <span>Explore Fleet Store</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {Object.values(cart).map(drone => (
                  <div key={drone.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                        <img src={drone.image_url || '/images/cyberonemax.png'} alt={drone.model} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-slate-900 truncate">{drone.id}</p>
                        <p className="text-[11px] text-slate-500 truncate">{drone.model || '700RPAV Tactical'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDroneFromCart(drone.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove drone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivery & Booking Form */}
          {totalUnits > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
              <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#5a00b8]" />
                Delivery Facility Address &amp; Logistics
              </h2>

              <form onSubmit={placeBooking} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Destination Facility Address *</label>
                  {addresses.length > 0 && (
                    <div className="relative mb-3">
                      <select
                        value={selectedAddressId}
                        onChange={event => setSelectedAddressId(event.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-[#5a00b8]"
                      >
                        {addresses.map(address => (
                          <option key={address.id} value={address.id}>
                            {address.label} - {address.full_address}
                          </option>
                        ))}
                        <option value="">+ Enter a new destination address</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
                    </div>
                  )}
                  {!selectedAddress && (
                    <div className="space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <input
                          required
                          value={addressDraft.recipient_name}
                          onChange={e => setAddressDraft({ ...addressDraft, recipient_name: e.target.value })}
                          placeholder="Recipient Name"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#5a00b8]"
                        />
                        <PhoneInput
                          required
                          value={addressDraft.recipient_phone}
                          onChange={v => setAddressDraft({ ...addressDraft, recipient_phone: v })}
                          placeholder="Recipient Phone"
                          size="sm"
                          inputClassName="text-xs rounded-xl"
                        />
                      </div>
                      <textarea
                        required
                        value={addressDraft.full_address}
                        onChange={e => setAddressDraft({ ...addressDraft, full_address: e.target.value })}
                        placeholder="Facility / Delivery Address"
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium resize-none outline-none focus:border-[#5a00b8]"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          required
                          value={addressDraft.city}
                          onChange={e => setAddressDraft({ ...addressDraft, city: e.target.value })}
                          placeholder="City"
                          className="min-w-0 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#5a00b8]"
                        />
                        <input
                          required
                          value={addressDraft.pincode}
                          onChange={e => setAddressDraft({ ...addressDraft, pincode: e.target.value })}
                          placeholder="PIN Code"
                          className="min-w-0 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#5a00b8]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Carrier Instructions / Logistics Notes (Optional)</label>
                  <textarea
                    value={deliveryNotes}
                    onChange={e => setDeliveryNotes(e.target.value)}
                    rows={2}
                    placeholder="Enter site contact details, gate code, or delivery instructions..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium resize-none outline-none focus:border-[#5a00b8]"
                  />
                </div>

                {error && <p className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3">{error}</p>}
                {notice && <p className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold p-3">{notice}</p>}

                <button
                  type="submit"
                  disabled={submitting || totalUnits === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] disabled:opacity-50 text-white py-3.5 text-sm font-bold transition-all cursor-pointer shadow-md active:scale-98"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Confirm Consignment Booking ({totalUnits} {totalUnits === 1 ? 'Unit' : 'Units'}) <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Direct reservation synced with IndoFleet Operations.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: CLEAN FULL-WIDTH STORE GRID (NO SIDE PANEL)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div id="drone-store" className="min-h-screen bg-[#f8fafc] pt-24 sm:pt-32 pb-24">
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5a00b8] mb-1.5">
            <ShieldCheck className="w-4 h-4 text-[#5a00b8]" />
            <span>IndoFleet Fleet Inventory</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                700RPAV Fleet Store
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-xl">
                Browse available 700RPAV tactical units, inspect technical specifications, and place consignment bookings.
              </p>
            </div>
            
            {/* View Cart Button */}
            <button
              onClick={openCartPage}
              className="flex items-center gap-2.5 text-xs font-bold text-white bg-[#5a00b8] hover:bg-[#4a0099] px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              <ShoppingCart className="w-4 h-4 text-white" />
              <span>View Cart ({totalUnits})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search & Live Sort Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 mb-6 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by Drone ID (e.g. 0001, 0150, 0800)..."
              className="w-full rounded-xl border-none pl-10 pr-3 py-2 text-xs outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Live Sort Dropdown */}
          <div className="relative shrink-0 w-full sm:w-auto">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full sm:w-auto appearance-none bg-slate-50 border border-slate-200/80 rounded-xl pl-3.5 pr-8 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer hover:bg-white focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all"
            >
              <option value="asc">Sort: Drone ID (Ascending)</option>
              <option value="desc">Sort: Drone ID (Descending)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-slate-400" />
          </div>
        </div>

        {/* Full-Width Drones Grid Section */}
        <section className="w-full">
          {loading ? (
            <div className="rounded-2xl bg-white border border-slate-200/80 p-16 text-center text-slate-500 shadow-2xs">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#5a00b8]" />
              <p className="text-sm font-semibold text-slate-800">Loading fleet inventory...</p>
            </div>
          ) : filteredDrones.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200/80 p-12 text-center shadow-2xs">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">No matching drone units found</h3>
              <p className="text-xs text-slate-500 mt-1">Try searching by another Drone ID number (e.g. 0001, 0250).</p>
              <button
                onClick={() => setSearch('')}
                className="mt-4 px-4 py-2 rounded-xl bg-[#5a00b8] text-white text-xs font-bold hover:bg-[#4a0099] cursor-pointer shadow-xs transition-all"
              >
                Reset Search
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {visibleDrones.map(drone => {
                  const isSelected = Boolean(cart[drone.id]);
                  const droneImg = drone.image_url || '/images/cyberonemax.png';

                  return (
                    <article
                      key={drone.id}
                      onClick={() => handleOpenDetail(drone)}
                      className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-xs hover:shadow-lg flex flex-col justify-between group cursor-pointer ${
                        isSelected ? 'border-[#5a00b8] ring-1 ring-[#5a00b8]/30 shadow-md' : 'border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <div>
                        {/* Card Header: Clean Drone ID Badge */}
                        <div className="p-3.5 pb-0 flex items-center justify-between min-w-0">
                          <span className="font-mono font-bold text-[11px] sm:text-xs text-[#5a00b8] bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100/80 truncate max-w-full" title={drone.id}>
                            {drone.id}
                          </span>
                        </div>

                        {/* Image Box */}
                        <div className="h-44 flex items-center justify-center p-4 relative overflow-hidden">
                          <img
                            src={droneImg}
                            alt={drone.model}
                            className="max-h-full max-w-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>

                        {/* Details Content */}
                        <div className="px-4 pb-3 min-w-0">
                          <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#5a00b8] transition-colors leading-snug truncate">
                            {drone.model || '700RPAV'}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            Surveillance, Mapping &amp; Delivery UAV
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="p-3.5 pt-0 grid grid-cols-2 gap-1.5 sm:gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(drone);
                          }}
                          className="w-full rounded-xl py-2 px-1.5 sm:px-2.5 text-xs font-bold border border-slate-200 hover:border-purple-300 bg-white hover:bg-purple-50 text-slate-700 hover:text-[#5a00b8] flex items-center justify-center gap-1 transition-all cursor-pointer min-w-0"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#5a00b8] shrink-0" />
                          <span className="truncate">Details</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => toggleCartDrone(drone, e)}
                          className={`w-full rounded-xl py-2 px-1.5 sm:px-2.5 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs min-w-0 ${
                            isSelected
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-[#5a00b8] hover:bg-[#4a0099] text-white'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">In Cart</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Add to Cart</span>
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {pageCount > 1 && (
                <nav className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-8 p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs text-xs">
                  <p className="text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-900">{(page - 1) * pageSize + 1}</span>–
                    <span className="font-bold text-slate-900">{Math.min(page * pageSize, filteredDrones.length)}</span> of{' '}
                    <span className="font-bold text-slate-900">{filteredDrones.length}</span> units
                  </p>

                  <div className="flex items-center gap-2">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                    >
                      <option value={12}>12 per page</option>
                      <option value={24}>24 per page</option>
                      <option value={48}>48 per page</option>
                      <option value={96}>96 per page</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(current => Math.max(1, current - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 font-bold text-slate-800">
                        {page} / {pageCount}
                      </span>
                      <button
                        onClick={() => setPage(current => Math.min(pageCount, current + 1))}
                        disabled={page === pageCount}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </nav>
              )}
            </>
          )}
        </section>

        {/* Floating Cart Bar at Bottom when items are selected */}
        {totalUnits > 0 && (
          <div className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:right-8 z-40">
            <div className="bg-[#18181b] text-white rounded-2xl px-5 py-3.5 shadow-2xl border border-slate-700 flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold">
                <ShoppingBag className="w-4 h-4 text-purple-400" />
                <span><strong className="text-purple-300 font-mono">{totalUnits}</strong> Units Selected</span>
              </div>
              <button
                onClick={openCartPage}
                className="px-4 py-2 rounded-xl bg-[#5a00b8] hover:bg-[#4a0099] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Proceed to Booking</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
