import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X
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

const DRONE_SPECS = [
  { label: 'Flight Endurance', value: '65', unit: 'Mins', note: 'AMSL cruising' },
  { label: 'Launch Ceiling', value: '18,000', unit: 'ft', note: 'High altitude' },
  { label: 'Telemetry Range', value: '10', unit: 'KM', note: 'Line of sight' },
  { label: 'Max MTOW', value: '5.0', unit: 'Kg', note: '2.2 Kg payload' }
];

const HARDWARE = [
  'PPK / RTK Centimetric Precision GPS',
  'Solid-State Slide & Lock Battery System',
  'IP 53 Weatherproof All-Terrain Rating',
  'H7 Edge Flight Computer & UART Hub'
];

const USE_CASES = [
  'Tactical surveillance',
  'High-precision mapping',
  'Extreme high-altitude delivery',
  'High-altitude BVLOS operations over mountains',
  'Near-silent acoustic surveillance',
  'Rapid multi-payload logistics'
];

const DEFAULT_IMG = '/images/cyberonemax.png';

const getUnitInfo = (d: StoreDrone) => {
  const info: { label: string; value: string }[] = [];
  if (d.serial_number) info.push({ label: 'Serial', value: d.serial_number });
  if (d.current_city) info.push({ label: 'Current hub', value: d.current_city });
  if (d.battery !== undefined && d.battery !== null) info.push({ label: 'Battery', value: `${d.battery}%` });
  if (d.speed_kmh !== undefined && d.speed_kmh !== null) info.push({ label: 'Max speed', value: `${d.speed_kmh} km/h` });
  return info;
};

const getPageItems = (page: number, count: number): (number | '…')[] => {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const items: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(count - 1, page + 1);
  if (start > 2) items.push('…');
  for (let i = start; i <= end; i++) items.push(i);
  if (end < count - 1) items.push('…');
  items.push(count);
  return items;
};

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#5a00b8] focus:ring-4 focus:ring-purple-100';

const STORE_CSS = `
@keyframes stIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.st-in { animation: stIn .45s cubic-bezier(.2,.7,.2,1) both; }
@media (prefers-reduced-motion: reduce) { .st-in { animation: none; } }
`;

export const StorePage: React.FC<StorePageProps> = ({ currentUser, onNavigate, embedded = false }) => {
  const [drones, setDrones] = useState<StoreDrone[]>([]);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hub, setHub] = useState('');
  const [view, setView] = useState<'grid' | 'list'>(() => {
    try {
      return localStorage.getItem('iw_store_view') === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const [bulkQty, setBulkQty] = useState(5);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(embedded ? 12 : 24);
  const [addresses, setAddresses] = useState<SavedAddress[]>(currentUser?.saved_addresses || []);

  const [detailDrone, setDetailDrone] = useState<StoreDrone | null>(null);
  const [productTab, setProductTab] = useState<'specs' | 'applications'>('specs');
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/delivery/store/products`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load drone inventory.');
        const rawList = data.drones || data.products || [];
        const loadedDrones = rawList.filter((d: StoreDrone) => (!d.status || d.status === 'idle') && (!d.qc_status || d.qc_status === 'passed'));
        setDrones(loadedDrones);

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

  useEffect(() => {
    try {
      localStorage.setItem('iw_store_view', view);
    } catch {

    }
  }, [view]);

  const hubs = useMemo(
    () => Array.from(new Set(drones.map(d => d.current_city).filter(Boolean) as string[])).sort(),
    [drones]
  );

  const filteredDrones = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = drones;
    if (hub) list = list.filter(d => d.current_city === hub);
    if (q) {
      list = list.filter(drone => {
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
  }, [drones, search, sortOrder, hub]);

  const totalUnits = useMemo(() => Object.keys(cart).length, [cart]);
  const pageCount = Math.max(1, Math.ceil(filteredDrones.length / pageSize));
  const visibleDrones = filteredDrones.slice((page - 1) * pageSize, page * pageSize);
  const pageAllSelected = visibleDrones.length > 0 && visibleDrones.every(d => cart[d.id]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(1);
    }
  }, [page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, sortOrder, hub, filteredDrones.length]);

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

  const togglePage = () => {
    setError('');
    setCart(prev => {
      const next = { ...prev };
      if (pageAllSelected) {
        visibleDrones.forEach(d => delete next[d.id]);
      } else {
        visibleDrones.forEach(d => {
          next[d.id] = d;
        });
      }
      return next;
    });
  };

  const addFirstN = () => {
    setError('');
    setCart(prev => {
      const next = { ...prev };
      let added = 0;
      for (const d of filteredDrones) {
        if (added >= bulkQty) break;
        if (!next[d.id]) {
          next[d.id] = d;
          added++;
        }
      }
      return next;
    });
  };

  const selectedAddress = addresses.find(address => address.id === selectedAddressId);

  const handleOpenDetail = (drone: StoreDrone) => {
    setDetailDrone(drone);
    setProductTab('specs');
    setCopied(false);
    window.history.pushState({}, '', `/store?drone=${drone.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToStore = () => {
    setDetailDrone(null);
    window.history.pushState({}, '', '/store');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyLink = async () => {
    if (!detailDrone) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/store?drone=${detailDrone.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {

    }
  };

  const [storeView, setStoreView] = useState<'grid' | 'cart'>(() => {
    if (typeof window !== 'undefined' && (window.location.pathname.includes('/cart') || window.location.search.includes('cart'))) {
      return 'cart';
    }
    return 'grid';
  });

  useEffect(() => {
    const handleUrlChange = () => {
      if (window.location.pathname.includes('/cart') || window.location.search.includes('cart')) {
        setStoreView('cart');
      } else {
        setStoreView('grid');
      }
    };
    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
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

  const { prevDrone, nextDrone } = useMemo(() => {
    if (!detailDrone || drones.length === 0) return { prevDrone: null, nextDrone: null };
    const currentIndex = drones.findIndex(d => d.id === detailDrone.id);
    const prev = currentIndex > 0 ? drones[currentIndex - 1] : null;
    const next = currentIndex < drones.length - 1 ? drones[currentIndex + 1] : null;
    return { prevDrone: prev, nextDrone: next };
  }, [detailDrone, drones]);

  useEffect(() => {
    if (!detailDrone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleBackToStore();
      if (e.key === 'ArrowLeft' && prevDrone) handleOpenDetail(prevDrone);
      if (e.key === 'ArrowRight' && nextDrone) handleOpenDetail(nextDrone);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailDrone, prevDrone, nextDrone]);

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



  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 pb-20 pt-28 text-slate-800 sm:pt-36">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 text-[#5a00b8]">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="mb-2 text-xl font-black tracking-tight text-slate-900">Login Required for Fleet Store</h2>
          <p className="mb-6 text-sm leading-relaxed text-slate-500">
            Access to IndoFleet 700RPAV Fleet Store and aircraft consignment booking is restricted to verified users. Please sign in to view available inventory units and schedule deliveries.
          </p>
          <button
            type="button"
            onClick={() => {
              onNavigate('login');
              window.history.pushState({}, '', '/login');
            }}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#5a00b8] py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#4a0099] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a00b8]"
          >
            <span>Sign In to Continue</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }



  if (storeView === 'cart') {
    return (
      <div className="min-h-screen bg-slate-50 pb-24 pt-24 text-slate-800 sm:pt-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <button
            type="button"
            onClick={openGridStorePage}
            className="mb-5 inline-flex cursor-pointer items-center gap-1.5 text-sm font-bold text-[#5a00b8] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Continue Browsing Store
          </button>

          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Consignment Cart &amp; Booking</h1>
              <p className="mt-1.5 max-w-xl text-sm text-slate-500">
                Review your reserved drone units, enter facility delivery address, and confirm consignment booking.
              </p>
            </div>
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 text-[#5a00b8] sm:flex">
              <ShoppingBag className="h-6 w-6" />
            </div>
          </div>

          {totalUnits === 0 ? (
            <div className="space-y-3 rounded-3xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
              <ShoppingCart className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="text-base font-bold text-slate-800">Your consignment cart is empty</h3>
              <p className="mx-auto max-w-sm text-sm text-slate-500">
                Browse available 700RPAV tactical units in the store and add them to your cart to proceed with booking.
              </p>
              <button
                type="button"
                onClick={openGridStorePage}
                className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#5a00b8] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#4a0099]"
              >
                <span>Explore Fleet Store</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-12 lg:items-start">

              <div className="space-y-6 lg:col-span-7">

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
                      <ShoppingCart className="h-4 w-4 text-[#5a00b8]" />
                      Selected Drone Units ({totalUnits})
                    </h2>
                    <button
                      type="button"
                      onClick={() => setCart({})}
                      className="cursor-pointer text-xs font-bold text-rose-600 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>

                  <ul className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
                    {Object.values(cart).map(drone => (
                      <li
                        key={drone.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5">
                            <img src={drone.image_url || DEFAULT_IMG} alt={drone.model} className="max-h-full max-w-full object-contain" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm font-bold text-slate-900">{drone.id}</p>
                            <p className="truncate text-xs text-slate-500">{drone.model || '700RPAV Tactical'}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDroneFromCart(drone.id)}
                          className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="Remove drone"
                          aria-label={`Remove ${drone.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>


                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-black text-slate-900">
                    <MapPin className="h-4 w-4 text-[#5a00b8]" />
                    Delivery Facility Address &amp; Logistics
                  </h2>

                  <form id="booking-form" onSubmit={placeBooking} className="space-y-5">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-800">Destination Facility Address *</label>
                      {addresses.length > 0 && (
                        <div className="relative mb-3">
                          <select
                            value={selectedAddressId}
                            onChange={event => setSelectedAddressId(event.target.value)}
                            className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-3.5 pr-9 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-[#5a00b8] focus:ring-4 focus:ring-purple-100"
                          >
                            {addresses.map(address => (
                              <option key={address.id} value={address.id}>
                                {address.label} - {address.full_address}
                              </option>
                            ))}
                            <option value="">+ Enter a new destination address</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      )}
                      {!selectedAddress && (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input
                              required
                              value={addressDraft.recipient_name}
                              onChange={e => setAddressDraft({ ...addressDraft, recipient_name: e.target.value })}
                              placeholder="Recipient Name"
                              className={inputCls}
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
                            className={`${inputCls} resize-none`}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              required
                              value={addressDraft.city}
                              onChange={e => setAddressDraft({ ...addressDraft, city: e.target.value })}
                              placeholder="City"
                              className={`${inputCls} min-w-0`}
                            />
                            <input
                              required
                              value={addressDraft.pincode}
                              onChange={e => setAddressDraft({ ...addressDraft, pincode: e.target.value })}
                              placeholder="PIN Code"
                              className={`${inputCls} min-w-0`}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-800">
                        Carrier Instructions / Logistics Notes (Optional)
                      </label>
                      <textarea
                        value={deliveryNotes}
                        onChange={e => setDeliveryNotes(e.target.value)}
                        rows={2}
                        placeholder="Enter site contact details, gate code, or delivery instructions..."
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  </form>
                </section>
              </div>


              <aside className="lg:sticky lg:top-28 lg:col-span-5">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-black text-slate-900">Booking Summary</h2>

                  <dl className="mt-4 divide-y divide-slate-100 text-sm">
                    <div className="flex items-center justify-between py-3">
                      <dt className="text-slate-500">Units</dt>
                      <dd className="font-black text-slate-900">{totalUnits}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 py-3">
                      <dt className="shrink-0 text-slate-500">Drone IDs</dt>
                      <dd className="flex max-h-28 flex-wrap justify-end gap-1.5 overflow-y-auto">
                        {Object.keys(cart).map(id => (
                          <span
                            key={id}
                            className="rounded-md border border-purple-100 bg-purple-50 px-2 py-0.5 font-mono text-[11px] font-bold text-[#5a00b8]"
                          >
                            {id}
                          </span>
                        ))}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 py-3">
                      <dt className="shrink-0 text-slate-500">Deliver to</dt>
                      <dd className="text-right text-xs font-semibold text-slate-800">
                        {selectedAddress
                          ? selectedAddress.full_address
                          : addressDraft.full_address || 'Enter address'}
                      </dd>
                    </div>
                  </dl>

                  {currentUser.role !== 'customer' && (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                      Drone bookings are available for customer accounts.
                    </p>
                  )}
                  {error && (
                    <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>
                  )}
                  {notice && (
                    <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{notice}</p>
                  )}

                  <button
                    type="submit"
                    form="booking-form"
                    disabled={submitting || totalUnits === 0}
                    className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#5a00b8] py-3.5 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a00b8] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Confirm Consignment Booking ({totalUnits} {totalUnits === 1 ? 'Unit' : 'Units'})
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    );
  }



  const detailInfo = detailDrone ? getUnitInfo(detailDrone) : [];

  const renderChips = (drone: StoreDrone) =>
    drone.qc_status === 'passed' || drone.current_city ? (
      <div className="flex flex-wrap gap-1.5">
        {drone.qc_status === 'passed' && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <ShieldCheck className="h-3 w-3" /> QC passed
          </span>
        )}
        {drone.current_city && (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            <MapPin className="h-3 w-3" /> {drone.current_city}
          </span>
        )}
      </div>
    ) : null;

  const renderActions = (drone: StoreDrone) => {
    const isSelected = Boolean(cart[drone.id]);
    return (
      <>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            handleOpenDetail(drone);
          }}
          className="flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:border-purple-300 hover:bg-purple-50 hover:text-[#5a00b8]"
        >
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Details</span>
        </button>

        <button
          type="button"
          onClick={e => toggleCartDrone(drone, e)}
          aria-pressed={isSelected}
          className={`flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow-sm transition-colors ${
            isSelected ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#5a00b8] hover:bg-[#4a0099]'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">In Cart</span>
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Add to Cart</span>
            </>
          )}
        </button>
      </>
    );
  };

  const renderCard = (drone: StoreDrone, i: number) => {
    const isSelected = Boolean(cart[drone.id]);
    return (
      <article
        key={drone.id}
        tabIndex={0}
        onClick={() => handleOpenDetail(drone)}
        onKeyDown={e => {
          if (e.target === e.currentTarget && e.key === 'Enter') handleOpenDetail(drone);
        }}
        style={{ animationDelay: `${Math.min(i, 11) * 35}ms` }}
        className={`st-in group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a00b8] ${
          isSelected ? 'border-[#5a00b8] ring-2 ring-[#5a00b8]/20' : 'border-slate-200 hover:border-purple-300'
        }`}
      >
        <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-purple-50 via-white to-slate-50 p-5">
          <span
            className="absolute left-3 top-3 max-w-[70%] truncate rounded-lg border border-purple-100 bg-white/90 px-2.5 py-1 font-mono text-[11px] font-bold text-[#5a00b8]"
            title={drone.id}
          >
            {drone.id}
          </span>
          {isSelected && (
            <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#5a00b8] text-white shadow">
              <Check className="h-4 w-4" />
            </span>
          )}
          <img
            src={drone.image_url || DEFAULT_IMG}
            alt={drone.model}
            className="max-h-full max-w-full object-contain drop-shadow-lg transition-transform duration-500 group-hover:scale-110"
          />
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="truncate text-base font-black leading-snug text-slate-900 transition-colors group-hover:text-[#5a00b8]">
            {drone.model || '700RPAV'}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">Surveillance, Mapping &amp; Delivery UAV</p>
          <div className="mt-3">{renderChips(drone)}</div>
          <div className="mt-auto grid grid-cols-2 gap-2 pt-4">{renderActions(drone)}</div>
        </div>
      </article>
    );
  };

  const renderRow = (drone: StoreDrone, i: number) => {
    const isSelected = Boolean(cart[drone.id]);
    return (
      <article
        key={drone.id}
        tabIndex={0}
        onClick={() => handleOpenDetail(drone)}
        onKeyDown={e => {
          if (e.target === e.currentTarget && e.key === 'Enter') handleOpenDetail(drone);
        }}
        style={{ animationDelay: `${Math.min(i, 11) * 30}ms` }}
        className={`st-in group flex cursor-pointer flex-col gap-3 rounded-2xl border bg-white p-3 transition-all hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a00b8] sm:flex-row sm:items-center sm:gap-4 ${
          isSelected ? 'border-[#5a00b8] ring-2 ring-[#5a00b8]/15' : 'border-slate-200 hover:border-purple-300'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-50 via-white to-slate-50 p-2">
            <img src={drone.image_url || DEFAULT_IMG} alt={drone.model} className="max-h-full max-w-full object-contain" />
            {isSelected && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#5a00b8] text-white shadow">
                <Check className="h-3 w-3" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate rounded-lg border border-purple-100 bg-purple-50 px-2 py-0.5 font-mono text-[11px] font-bold text-[#5a00b8]">
                {drone.id}
              </span>
              {renderChips(drone)}
            </div>
            <h3 className="mt-1 truncate text-sm font-black text-slate-900 group-hover:text-[#5a00b8]">
              {drone.model || '700RPAV'}
            </h3>
            <p className="line-clamp-1 text-xs text-slate-500">Surveillance, Mapping &amp; Delivery UAV</p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-64">{renderActions(drone)}</div>
      </article>
    );
  };

  return (
    <div id="drone-store" className="min-h-screen bg-slate-50 pb-28 pt-24 sm:pt-28">
      <style>{STORE_CSS}</style>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">

        <div className="relative mb-8 overflow-hidden rounded-3xl bg-black text-white">
          <video
            src="/stick.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.2) 100%)' }}
          />
          <div className="relative z-10 flex min-h-[220px] flex-col justify-between gap-6 p-6 sm:p-10 md:flex-row md:items-end">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold text-purple-300">
                <ShieldCheck className="h-4 w-4" />
                <span>IndoFleet Fleet Inventory</span>
              </p>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">700RPAV Fleet Store</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
                Browse available 700RPAV tactical units, inspect technical specifications, and place consignment bookings.
              </p>
              {!loading && !error && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-bold backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {drones.length} {drones.length === 1 ? 'unit' : 'units'} available
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={openCartPage}
              className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6366f1] px-5 py-3 text-sm font-bold text-white shadow-xl shadow-purple-900/40 transition-all hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>View Cart</span>
              <span className="min-w-[1.5rem] rounded-full bg-white px-2 py-0.5 text-center text-xs font-black text-[#5a00b8]">
                {totalUnits}
              </span>
            </button>
          </div>
        </div>


        <div className="sticky top-20 z-20 mb-5 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur-md">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search by Drone ID (e.g. 0001, 0150, 0800)..."
                aria-label="Search drones"
                className="w-full rounded-xl border border-transparent bg-slate-50 py-2.5 pl-10 pr-16 text-sm font-medium outline-none transition-all focus:border-[#5a00b8] focus:bg-white focus:ring-4 focus:ring-purple-100"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-700"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
                  aria-label="Sort drones"
                  className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3.5 pr-9 text-sm font-bold text-slate-700 outline-none transition-all hover:bg-white focus:border-[#5a00b8] focus:bg-white focus:ring-4 focus:ring-purple-100"
                >
                  <option value="asc">Sort: Drone ID (Ascending)</option>
                  <option value="desc">Sort: Drone ID (Descending)</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="flex shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50" role="group" aria-label="View mode">
                {([
                  ['grid', LayoutGrid, 'Grid view'],
                  ['list', List, 'List view']
                ] as const).map(([key, Icon, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setView(key)}
                    aria-pressed={view === key}
                    title={label}
                    aria-label={label}
                    className={`cursor-pointer p-2.5 transition-colors ${
                      view === key ? 'bg-[#5a00b8] text-white' : 'text-slate-500 hover:bg-white hover:text-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {hubs.length > 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold text-slate-400">Hub</span>
              {['', ...hubs].map(h => (
                <button
                  key={h || 'all'}
                  type="button"
                  onClick={() => setHub(h)}
                  aria-pressed={hub === h}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                    hub === h
                      ? 'border-[#5a00b8] bg-[#5a00b8] text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:text-[#5a00b8]'
                  }`}
                >
                  {h || 'All hubs'}
                </button>
              ))}
            </div>
          )}
        </div>


        {!loading && filteredDrones.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="text-xs font-semibold text-slate-500">
              {filteredDrones.length} {filteredDrones.length === 1 ? 'unit' : 'units'} in results
              {search.trim() ? ` for "${search.trim()}"` : ''}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePage}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-purple-300 hover:text-[#5a00b8]"
              >
                {pageAllSelected ? 'Deselect this page' : 'Select this page'}
              </button>

              <div
                className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white"
                title="Adds the next units from the current results that are not in your cart yet"
              >
                <input
                  type="number"
                  min={1}
                  max={filteredDrones.length}
                  value={bulkQty}
                  onChange={e => setBulkQty(Math.max(1, Number(e.target.value) || 1))}
                  aria-label="Number of units to add"
                  className="w-16 px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                />
                <button
                  type="button"
                  onClick={addFirstN}
                  className="cursor-pointer bg-[#5a00b8] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#4a0099]"
                >
                  Add {Math.min(bulkQty, filteredDrones.length)} units
                </button>
              </div>
            </div>
          </div>
        )}

        {error && !loading && drones.length === 0 && (
          <p className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>
        )}


        <section className="w-full">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded-3xl border border-slate-200 bg-white">
                  <div className="h-48 bg-slate-100" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-2/3 rounded bg-slate-100" />
                    <div className="h-3 w-full rounded bg-slate-100" />
                    <div className="grid grid-cols-2 gap-2 pt-3">
                      <div className="h-9 rounded-xl bg-slate-100" />
                      <div className="h-9 rounded-xl bg-slate-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredDrones.length === 0 ? (
            !error && (
              <div className="rounded-3xl border border-slate-200 bg-white p-14 text-center shadow-sm">
                <Search className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <h3 className="text-sm font-bold text-slate-800">No matching drone units found</h3>
                <p className="mt-1 text-xs text-slate-500">Try searching by another Drone ID number (e.g. 0001, 0250).</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setHub('');
                  }}
                  className="mt-5 cursor-pointer rounded-xl bg-[#5a00b8] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#4a0099]"
                >
                  Reset Search
                </button>
              </div>
            )
          ) : (
            <>
              {view === 'grid' ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {visibleDrones.map((drone, i) => renderCard(drone, i))}
                </div>
              ) : (
                <div className="space-y-3">{visibleDrones.map((drone, i) => renderRow(drone, i))}</div>
              )}


              {pageCount > 1 && (
                <nav
                  aria-label="Pagination"
                  className="mt-8 flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-xs shadow-sm lg:flex-row"
                >
                  <p className="font-medium text-slate-500">
                    Showing <span className="font-bold text-slate-900">{(page - 1) * pageSize + 1}</span>–
                    <span className="font-bold text-slate-900">{Math.min(page * pageSize, filteredDrones.length)}</span> of{' '}
                    <span className="font-bold text-slate-900">{filteredDrones.length}</span> units
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <select
                      value={pageSize}
                      onChange={e => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      aria-label="Units per page"
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      <option value={12}>12 per page</option>
                      <option value={24}>24 per page</option>
                      <option value={48}>48 per page</option>
                      <option value={96}>96 per page</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPage(current => Math.max(1, current - 1))}
                        disabled={page === 1}
                        aria-label="Previous page"
                        className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>

                      {getPageItems(page, pageCount).map((item, idx) =>
                        item === '…' ? (
                          <span key={`gap-${idx}`} className="px-1.5 font-bold text-slate-400">
                            …
                          </span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setPage(item)}
                            aria-current={item === page ? 'page' : undefined}
                            className={`min-w-[2rem] cursor-pointer rounded-lg px-2 py-1.5 font-bold transition-colors ${
                              item === page
                                ? 'bg-[#5a00b8] text-white'
                                : 'text-slate-700 hover:bg-purple-50 hover:text-[#5a00b8]'
                            }`}
                          >
                            {item}
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => setPage(current => Math.min(pageCount, current + 1))}
                        disabled={page === pageCount}
                        aria-label="Next page"
                        className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </nav>
              )}
            </>
          )}
        </section>


        {totalUnits > 0 && !detailDrone && (
          <div className="fixed inset-x-4 bottom-5 z-40 sm:inset-x-auto sm:bottom-6 sm:right-24">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-[0_12px_40px_rgba(60,10,120,0.2)]">
              <div className="flex items-center gap-2.5 text-sm font-bold text-slate-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-[#5a00b8]">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                <span>
                  <span className="font-mono text-[#5a00b8]">{totalUnits}</span> {totalUnits === 1 ? 'Unit' : 'Units'} Selected
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCart({})}
                className="cursor-pointer text-xs font-bold text-slate-400 hover:text-rose-600"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={openCartPage}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#5a00b8] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#4a0099] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a00b8]"
              >
                <span>Proceed to Booking</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>


      {detailDrone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:p-6"
          onClick={handleBackToStore}
          role="dialog"
          aria-modal="true"
          aria-label={`${detailDrone.model || '700RPAV'} details`}
        >
          <div
            className="relative my-auto max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl sm:p-8"
            onClick={e => e.stopPropagation()}
          >

            <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-xl border border-purple-100 bg-purple-50 px-3 py-1 font-mono text-xs font-bold text-[#5a00b8]">
                  {detailDrone.id}
                </span>
                {detailDrone.qc_status === 'passed' && (
                  <span className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" /> QC Passed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={copyLink}
                  className="mr-1 flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-purple-300 hover:text-[#5a00b8]"
                  title="Copy link to this unit"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy link'}</span>
                </button>
                <button
                  type="button"
                  disabled={!prevDrone}
                  onClick={() => prevDrone && handleOpenDetail(prevDrone)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                  title={prevDrone ? `Previous: ${prevDrone.id}` : 'First Unit'}
                  aria-label="Previous unit"
                >
                  <ChevronLeft className="h-4 w-4 text-slate-700" />
                </button>
                <button
                  type="button"
                  disabled={!nextDrone}
                  onClick={() => nextDrone && handleOpenDetail(nextDrone)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                  title={nextDrone ? `Next: ${nextDrone.id}` : 'Last Unit'}
                  aria-label="Next unit"
                >
                  <ChevronRight className="h-4 w-4 text-slate-700" />
                </button>
                <button
                  type="button"
                  onClick={handleBackToStore}
                  className="ml-1 cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  title="Close Details"
                  aria-label="Close details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid items-start gap-6 sm:gap-8 md:grid-cols-2">

              <div className="flex flex-col rounded-2xl border border-slate-100 bg-gradient-to-br from-purple-50 via-white to-slate-50 p-6">
                <div className="flex min-h-[240px] flex-1 items-center justify-center">
                  <img
                    src={detailDrone.image_url || DEFAULT_IMG}
                    alt={detailDrone.model || '700RPAV'}
                    className="max-h-60 max-w-full object-contain drop-shadow-xl transition-transform duration-500 hover:scale-105"
                  />
                </div>
                {detailInfo.length > 0 && (
                  <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200/70 pt-4">
                    {detailInfo.map(i => (
                      <div key={i.label} className="min-w-0">
                        <dt className="text-[10px] font-semibold text-slate-400">{i.label}</dt>
                        <dd className="truncate text-xs font-bold text-slate-800">{i.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>


              <div className="space-y-5">
                <div>
                  <span className="mb-1 block text-[11px] font-bold text-[#5a00b8]">Tactical UAV</span>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    {detailDrone.model || '700RPAV Tactical Aircraft'}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    Tactical surveillance, high-precision mapping and extreme high-altitude delivery quadcopter UAV.
                  </p>
                </div>


                <div className="grid grid-cols-2 gap-2">
                  {DRONE_SPECS.map(s => (
                    <div key={s.label} className="rounded-xl border border-purple-100 bg-purple-50/60 p-3">
                      <p className="text-[10px] font-bold text-purple-700">{s.label}</p>
                      <p className="mt-0.5 text-lg font-black tabular-nums text-slate-900">
                        {s.value}
                        <span className="ml-1 text-xs font-bold text-[#5a00b8]">{s.unit}</span>
                      </p>
                      <p className="text-[10px] text-slate-500">{s.note}</p>
                    </div>
                  ))}
                </div>


                <div>
                  <div className="flex border-b border-slate-200" role="tablist">
                    {([
                      ['specs', 'Specifications'],
                      ['applications', 'Use Cases']
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={productTab === key}
                        onClick={() => setProductTab(key)}
                        className={`cursor-pointer border-b-2 px-3 pb-2 text-xs font-bold transition-all ${
                          productTab === key
                            ? 'border-[#5a00b8] text-[#5a00b8]'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <ul className="space-y-2 py-3 text-sm text-slate-600">
                    {productTab === 'specs' &&
                      HARDWARE.map(h => (
                        <li key={h} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                          {h}
                        </li>
                      ))}
                    {productTab === 'applications' &&
                      USE_CASES.map(u => (
                        <li key={u} className="flex items-center gap-2">
                          <Compass className="h-4 w-4 shrink-0 text-[#5a00b8]" />
                          {u}
                        </li>
                      ))}
                  </ul>
                </div>


                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={e => toggleCartDrone(detailDrone, e)}
                    aria-pressed={Boolean(cart[detailDrone.id])}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-sm transition-all ${
                      cart[detailDrone.id]
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'border-2 border-[#5a00b8] bg-white text-[#5a00b8] hover:bg-purple-50'
                    }`}
                  >
                    {cart[detailDrone.id] ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>In Cart</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Add to Cart</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBookNowDirect(detailDrone)}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#5a00b8] py-3 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
                  >
                    <span>Book Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
