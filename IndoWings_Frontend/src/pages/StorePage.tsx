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
  SlidersHorizontal
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
        const loadedDrones = data.drones || data.products || [];
        setDrones(loadedDrones);
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

  // Filter 1,000 drones by Drone ID / search query
  const filteredDrones = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drones;
    return drones.filter(drone => {
      return (
        drone.id.toLowerCase().includes(q) ||
        drone.model.toLowerCase().includes(q) ||
        (drone.serial_number || '').toLowerCase().includes(q)
      );
    });
  }, [drones, search]);

  const totalUnits = useMemo(() => Object.keys(cart).length, [cart]);
  const pageCount = Math.max(1, Math.ceil(filteredDrones.length / pageSize));
  const visibleDrones = filteredDrones.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

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

  const handleBookNowDirect = (drone: StoreDrone) => {
    if (!cart[drone.id]) {
      setCart(prev => ({ ...prev, [drone.id]: drone }));
    }
    setDetailDrone(null);
    window.history.pushState({}, '', '/store');
    setTimeout(() => {
      const checkoutElement = document.getElementById('consignment-checkout-box');
      if (checkoutElement) {
        checkoutElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
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
  // RENDER: CLEAN LIGHT PRODUCT PAGE (GENUINE INDOWINGS DATA ONLY)
  // ─────────────────────────────────────────────────────────────────────────────
  if (detailDrone) {
    const isSelected = Boolean(cart[detailDrone.id]);
    const droneImg = detailDrone.image_url || '/images/cyberonemax.png';

    const capabilityPillars = [
      {
        title: 'Delivery of Multiple Payloads',
        desc: 'Delivery of multiple payloads at different locations.',
        icon: Package
      },
      {
        title: 'Bvlos Operations Over Mountains',
        desc: 'Autonomous Beyond Visual Line of Sight flight.',
        icon: Compass
      },
      {
        title: 'Surveillance of Critical Areas',
        desc: 'Driven by near silent acoustics for quiet operations.',
        icon: Radio
      },
      {
        title: 'Built to Fly High',
        desc: 'Engineered for high altitude launch and mission profiles.',
        icon: Zap
      },
      {
        title: 'Unprecedented Battery Back-Up',
        desc: 'Solid-state slide & lock battery pack.',
        icon: ShieldCheck
      }
    ];

    const techSpecs = [
      { label: 'Overall Length', value: '800 mm' },
      { label: 'UAV Type', value: 'Quadcopter' },
      { label: 'Weight (Including Battery)', value: '2.8 Kg' },
      { label: 'Max Payload Capacity', value: '2.2 Kg' },
      { label: 'Max Takeoff Weight Capacity', value: '5 Kg' },
      { label: 'Endurance AMSL (with Payload)', value: '65 minutes*' },
      { label: 'Endurance AMSL (At max launching altitude)', value: '45 minutes (with Payload) / 38 minutes (With Max Payload)' },
      { label: 'Wind Resistance', value: '54 Km/h (15m/s)' },
      { label: 'Max Speed', value: '72 Km/h (20m/s) (Electronically Controlled)' },
      { label: 'Telemetry Range (Instrumental Range)', value: '10 Km (Line of Sight)' },
      { label: 'Video Transmission Range', value: '10 Km (Line of Sight)' },
      { label: 'Port types on Controller', value: 'HDMI, C-Type x 2, USB Ports x 2' },
      { label: 'Propeller Type', value: 'Foldable' },
      { label: 'GPS', value: 'PPK/RTK Enabled (Compatible)' },
      { label: 'I.O. Function', value: 'H7 Based Onboard Computer (Embedding Capability, ETH Data Switch Hub, Exterior UART Interface)' },
      { label: 'Max Launch Altitude (AMSL)', value: '18000 ft.' },
      { label: 'Max Operational Altitude', value: '23000 ft.' },
      { label: 'Battery Type', value: 'Solid State Slide & Lock Battery' },
      { label: 'Protection Class', value: 'IP 53' },
      { label: 'Operating Temperature Limits', value: '-20°C | 55°C' },
      { label: 'BVLOS Control Compatibility', value: 'Yes (Optional)' },
      { label: 'Swarm Capability', value: 'Yes (Optional)' }
    ];

    const payloads = [
      {
        name: 'AI-INTEGRATED DAY/NIGHT CAMERA',
        desc: 'Electro-optical and infrared thermal imaging camera.'
      },
      {
        name: 'DROPPING PAYLOADS',
        desc: 'Mechanism for rapid and targeted cargo releases.'
      },
      {
        name: 'MULTISPECTRAL CAMERA',
        desc: 'Multi-band sensor for agricultural and environmental analysis.'
      },
      {
        name: 'CINEMAP',
        desc: 'Mapping camera for photogrammetry and topographical surveys.'
      },
      {
        name: 'TOO LOUD',
        desc: 'Megaphones for long-range audio announcements.'
      },
      {
        name: 'TOO BRIGHT',
        desc: 'High-power flash and illumination systems for night operations.'
      }
    ];

    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 pt-24 sm:pt-28 pb-24">
        {/* Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pb-3 border-b border-slate-200">
            <button
              onClick={handleBackToStore}
              className="inline-flex items-center gap-1.5 font-bold text-[#ef7f1a] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Store
            </button>

            {/* Prev / Next Unit Switcher */}
            <div className="flex items-center gap-2">
              {prevDrone && (
                <button
                  onClick={() => handleOpenDetail(prevDrone)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous Unit
                </button>
              )}
              {nextDrone && (
                <button
                  onClick={() => handleOpenDetail(nextDrone)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  Next Unit <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">

          {/* ═══════════════════════════════════════════════════════════════════
              MAIN PRODUCT CARD
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="grid lg:grid-cols-12 gap-8 items-start bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
            
            {/* Left: Product Image */}
            <div className="lg:col-span-5">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 h-72 sm:h-[380px] flex items-center justify-center relative overflow-hidden">
                <img
                  src={droneImg}
                  alt={detailDrone.model}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>

            {/* Middle: Details & Features */}
            <div className="lg:col-span-4 space-y-4">
              <div>
                <a
                  href="https://www.indowings.com/products/cyberonemax.php"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold uppercase tracking-wider text-[#ef7f1a] hover:underline"
                >
                  IndoWings
                </a>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                  Cyberone Max ({detailDrone.model})
                </h1>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: <strong className="text-slate-800">{detailDrone.id}</strong>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                <p className="font-bold text-slate-900 uppercase text-[11px] tracking-wide">
                  NO TERRAIN TOO RUGGED. NO MISSION TOO HIGH
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Surveillance, mapping and delivery tactical quadcopter UAV.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <h3 className="text-xs font-bold text-slate-900">Key Highlights</h3>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-[#ef7f1a] font-bold">•</span>
                    <span><strong>Endurance:</strong> 65 minutes AMSL flight time.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#ef7f1a] font-bold">•</span>
                    <span><strong>Altitude:</strong> Launch up to 18000 ft. AMSL, 23000 ft. operational ceiling.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#ef7f1a] font-bold">•</span>
                    <span><strong>Range:</strong> 10 Km Line of Sight telemetry &amp; video transmission.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#ef7f1a] font-bold">•</span>
                    <span><strong>Navigation:</strong> PPK/RTK Enabled precision GPS.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#ef7f1a] font-bold">•</span>
                    <span><strong>Max Speed:</strong> 72 Km/h (20m/s).</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: Booking Box */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                <div>
                  <span className="text-xs font-semibold text-slate-500">Unit ID</span>
                  <p className="font-mono font-bold text-slate-900 text-base">{detailDrone.id}</p>
                </div>

                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => toggleCartDrone(detailDrone)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        : 'bg-white text-[#ef7f1a] border border-orange-300 hover:bg-orange-50'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Remove from Cart</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>Add to Cart</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleBookNowDirect(detailDrone)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#ef7f1a] hover:bg-[#d96e11] text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Book Now</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              5 CAPABILITY BADGES (FROM INDOWINGS SITE)
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Capabilities</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {capabilityPillars.map((cap, idx) => {
                const Icon = cap.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900">{cap.title}</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{cap.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              FULL SPECIFICATIONS TABLE
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              Under The Hood: Full Specifications
            </h2>

            <div className="grid sm:grid-cols-2 gap-x-8 text-xs">
              {techSpecs.map((spec, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-2.5 border-b border-slate-100"
                >
                  <span className="text-slate-500 font-medium">{spec.label}</span>
                  <span className="text-slate-900 font-bold text-right ml-2">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              PAYLOAD INTEGRATIONS
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              Payload Integrations
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {payloads.map((payload, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                >
                  <h3 className="text-xs font-bold text-slate-900">{payload.name}</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{payload.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              INDUSTRIES TRANSFORMED
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              Impact Core Sectors of the Economy
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                <strong className="font-bold text-slate-900">Oil &amp; Gas</strong>
                <p className="text-slate-500 leading-relaxed">Drone-based plant and pipeline inspection, monitoring, and corridor route surveys.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                <strong className="font-bold text-slate-900">Power Transmission &amp; Thermal</strong>
                <p className="text-slate-500 leading-relaxed">Transmission tower inspection, utility line checking, and thermal infrared fault detection.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                <strong className="font-bold text-slate-900">Mining &amp; Topography</strong>
                <p className="text-slate-500 leading-relaxed">Visual and thermal inspections of chimneys, flares, canisters, and volumetric surveys.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                <strong className="font-bold text-slate-900">Solar Power Farms</strong>
                <p className="text-slate-500 leading-relaxed">Comprehensive drone-based solar module inspection, IR imaging, and aerial thermography.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                <strong className="font-bold text-slate-900">Rail Road &amp; Metro</strong>
                <p className="text-slate-500 leading-relaxed">Large-scale track surveys for railroads and metros, terrain analysis, and corridor mapping.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                <strong className="font-bold text-slate-900">High-Altitude Delivery</strong>
                <p className="text-slate-500 leading-relaxed">Rapid multi-payload medical and emergency equipment delivery to high-altitude outposts.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: MAIN STORE GRID (CLEAN, MINIMALIST & PROFESSIONAL)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div id="drone-store" className="min-h-screen bg-[#f8fafc] pt-24 sm:pt-32 pb-20">
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Clean, Elegant Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ef7f1a] mb-1.5">
            <ShieldCheck className="w-4 h-4 text-[#ef7f1a]" />
            <span>IndoWings Fleet Inventory</span>
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
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
              <ShoppingCart className="w-4 h-4 text-[#ef7f1a]" />
              <span><strong className="text-[#ef7f1a]">{totalUnits}</strong> in cart</span>
            </div>
          </div>
        </div>

        <div className={`grid ${embedded ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : 'lg:grid-cols-[minmax(0,1fr)_380px]'} gap-8 items-start`}>
          {/* Main Drones Grid Section */}
          <section>
            {/* Search Bar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 mb-6 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search by Drone ID (e.g. 0001, 0150, 0800)..."
                    className="w-full rounded-xl border-none pl-10 pr-3 py-2 text-xs outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all font-medium"
                  />
                </div>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Drone Cards Grid */}
            {loading ? (
              <div className="rounded-2xl bg-white border border-slate-200/80 p-16 text-center text-slate-500 shadow-2xs">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#ef7f1a]" />
                <p className="text-sm font-semibold text-slate-800">Loading fleet inventory...</p>
              </div>
            ) : filteredDrones.length === 0 ? (
              <div className="rounded-2xl bg-white border border-slate-200/80 p-12 text-center shadow-2xs">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-800 text-sm">No matching drone units found</h3>
                <p className="text-xs text-slate-500 mt-1">Try searching by another Drone ID number (e.g. 0001, 0250).</p>
                <button
                  onClick={() => setSearch('')}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#ef7f1a] text-white text-xs font-bold hover:bg-[#d96e11] cursor-pointer shadow-xs transition-all"
                >
                  Reset Search
                </button>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                  {visibleDrones.map(drone => {
                    const isSelected = Boolean(cart[drone.id]);
                    const droneImg = drone.image_url || '/images/cyberonemax.png';

                    return (
                      <article
                        key={drone.id}
                        onClick={() => handleOpenDetail(drone)}
                        className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-xs hover:shadow-lg flex flex-col justify-between group cursor-pointer ${
                          isSelected ? 'border-[#ef7f1a] ring-1 ring-[#ef7f1a]/30 shadow-md' : 'border-slate-200 hover:border-orange-300'
                        }`}
                      >
                        <div>
                          {/* Card Header: Drone ID */}
                          <div className="p-3.5 pb-0 flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
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
                          <div className="px-4 pb-3">
                            <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#ef7f1a] transition-colors leading-snug">
                              Cyberone Max ({drone.model})
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                              Surveillance, Mapping &amp; Delivery UAV
                            </p>

                            {/* Minimalist Specs row */}
                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                              <span>65 Mins Flight</span>
                              <span className="text-slate-300">•</span>
                              <span>10 KM Range</span>
                              <span className="text-slate-300">•</span>
                              <span>PPK / RTK</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="p-3.5 pt-0 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(drone);
                            }}
                            className="w-full rounded-xl py-2 px-2.5 text-xs font-bold border border-slate-200 hover:border-orange-300 bg-white hover:bg-orange-50 text-slate-700 hover:text-[#ef7f1a] flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#ef7f1a]" />
                            <span>Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => toggleCartDrone(drone, e)}
                            className={`w-full rounded-xl py-2 px-2.5 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs ${
                              isSelected
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-[#ef7f1a] hover:bg-[#d96e11] text-white'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>In Cart</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add to Cart</span>
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

          {/* Right Sidebar: Booking Cart & Consignment */}
          <aside id="consignment-checkout-box" className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 ${embedded ? 'xl:sticky xl:top-28' : 'lg:sticky lg:top-28'}`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-[#ef7f1a]">Consignment Cart</p>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">Selected Drone IDs</h2>
              </div>
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#ef7f1a] flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>

            {totalUnits === 0 ? (
              <div className="py-8 text-center border-y border-dashed border-slate-200 mb-5 space-y-1.5">
                <ShoppingCart className="w-7 h-7 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No drones selected</p>
                <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">Click "Add to Cart" on any unit to add its Drone ID to your order.</p>
              </div>
            ) : (
              <div className="border-y border-slate-100 py-3 mb-5 space-y-2 max-h-56 overflow-y-auto pr-1">
                {Object.values(cart).map(drone => (
                  <div key={drone.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-slate-900 truncate">{drone.id}</p>
                      <p className="text-[10px] text-slate-600 font-medium">Cyberone Max ({drone.model})</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDroneFromCart(drone.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove drone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between items-center text-xs font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Selected Drones</span>
                  <span className="text-sm text-[#ef7f1a] font-mono">{totalUnits} Units</span>
                </div>
              </div>
            )}

            {!currentUser ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200/70 p-4 space-y-2">
                <p className="text-xs font-bold text-amber-900">Customer Account Required</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">Please sign in with your customer account to place a drone booking.</p>
                <button
                  onClick={navigateToLogin}
                  className="w-full mt-1 rounded-xl bg-[#ef7f1a] hover:bg-[#d96e11] text-white py-2.5 text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  Sign In to Book
                </button>
              </div>
            ) : currentUser.role !== 'customer' ? (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">Operational Staff ({currentUser.role})</p>
                <p className="text-[11px] text-slate-500">Sign in with a customer account to place bookings, or use Admin Dispatch.</p>
              </div>
            ) : (
              <form onSubmit={placeBooking} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Destination Address *</label>
                  {addresses.length > 0 && (
                    <div className="relative mb-2">
                      <select
                        value={selectedAddressId}
                        onChange={event => setSelectedAddressId(event.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                      >
                        {addresses.map(address => (
                          <option key={address.id} value={address.id}>
                            {address.label} - {address.full_address}
                          </option>
                        ))}
                        <option value="">+ Enter a new destination address</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
                    </div>
                  )}
                  {!selectedAddress && (
                    <div className="space-y-2">
                      <input
                        required
                        value={addressDraft.recipient_name}
                        onChange={e => setAddressDraft({ ...addressDraft, recipient_name: e.target.value })}
                        placeholder="Recipient Name"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                      />
                      <PhoneInput
                        required
                        value={addressDraft.recipient_phone}
                        onChange={v => setAddressDraft({ ...addressDraft, recipient_phone: v })}
                        placeholder="Recipient Phone"
                        size="sm"
                        inputClassName="text-xs rounded-xl"
                      />
                      <textarea
                        required
                        value={addressDraft.full_address}
                        onChange={e => setAddressDraft({ ...addressDraft, full_address: e.target.value })}
                        placeholder="Facility / Delivery Address"
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs resize-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          required
                          value={addressDraft.city}
                          onChange={e => setAddressDraft({ ...addressDraft, city: e.target.value })}
                          placeholder="City"
                          className="min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        />
                        <input
                          required
                          value={addressDraft.pincode}
                          onChange={e => setAddressDraft({ ...addressDraft, pincode: e.target.value })}
                          placeholder="PIN Code"
                          className="min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Logistics Notes (Optional)</label>
                  <textarea
                    value={deliveryNotes}
                    onChange={e => setDeliveryNotes(e.target.value)}
                    rows={2}
                    placeholder="Instructions for carrier..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs resize-none"
                  />
                </div>

                {error && <p className="rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold p-2.5">{error}</p>}
                {notice && <p className="rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold p-2.5">{notice}</p>}

                <button
                  type="submit"
                  disabled={submitting || totalUnits === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ef7f1a] hover:bg-[#d96e11] disabled:opacity-50 text-white py-3 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirm Booking ({totalUnits}) <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Direct reservation synced with IndoWings Operations.</span>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};
