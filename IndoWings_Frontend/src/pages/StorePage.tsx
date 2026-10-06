import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Loader2, MapPin, Minus, Package, Plus, Search, ShoppingBag, ShoppingCart, ShieldCheck, Truck } from 'lucide-react';
import { DRONE_PRODUCTS } from '../data/indowingsData';
import { API_BASE_URL } from '../config/api';
import { DeliveryUser, SavedAddress } from '../components/AuthModal';
import PhoneInput from '../components/PhoneInput';

interface StorePageProps {
  currentUser: DeliveryUser | null;
  onNavigate: (page: string) => void;
  embedded?: boolean;
}

interface StoreProduct {
  model: string;
  available_stock: number;
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
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All drones');
  const [availabilityFilter, setAvailabilityFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [addresses, setAddresses] = useState<SavedAddress[]>(currentUser?.saved_addresses || []);
  const [cart, setCart] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('iw_store_cart') || '{}');
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
        setProducts(data.products || []);
      })
      .catch(err => setError(err.message || 'Could not load drone inventory.'))
      .finally(() => setLoading(false));
  }, []);

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
    localStorage.setItem('iw_store_cart', JSON.stringify(cart));
  }, [cart]);

  const totalUnits = useMemo(() => Object.values(cart).reduce((total, quantity) => total + quantity, 0), [cart]);
  const selectedAddress = addresses.find(address => address.id === selectedAddressId);
  const categories = useMemo(
    () => ['All drones', ...new Set(products.map(product => {
      const details = DRONE_PRODUCTS.find(item => item.name.toLowerCase() === product.model.toLowerCase());
      return details?.category || 'IndoWings UAV';
    }))],
    [products]
  );
  const filteredProducts = useMemo(() => products.filter(product => {
    const details = DRONE_PRODUCTS.find(item => item.name.toLowerCase() === product.model.toLowerCase());
    const category = details?.category || 'IndoWings UAV';
    return product.model.toLowerCase().includes(search.trim().toLowerCase())
      && (categoryFilter === 'All drones' || category === categoryFilter)
      && (!availabilityFilter || product.available_stock > 0);
  }), [products, search, categoryFilter, availabilityFilter]);
  const pageSize = embedded ? 6 : 8;
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, availabilityFilter]);

  const adjustQuantity = (model: string, change: number, available: number) => {
    setError('');
    setCart(previous => {
      const nextQuantity = Math.max(0, Math.min(available, (previous[model] || 0) + change));
      const next = { ...previous };
      if (nextQuantity) next[model] = nextQuantity;
      else delete next[model];
      return next;
    });
  };

  const navigateToLogin = () => {
    onNavigate('login');
    window.history.pushState({}, '', '/login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const placeBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!totalUnits) {
      setError('Add at least one drone to your cart first.');
      return;
    }
    if (!currentUser) {
      setError('Sign in with the customer ID provided by IndoWings to place a booking.');
      return;
    }
    if (currentUser.role !== 'customer') {
      setError('Drone bookings are available from a customer account. Sign out and use your customer ID.');
      return;
    }

    const address = selectedAddress || {
      ...addressDraft,
      label: 'Home' as const,
      id: `ADDR-${Date.now()}`,
      is_default: addresses.length === 0
    };
    if (!address.full_address.trim()) {
      setError('Enter a delivery address or choose one of your saved addresses.');
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
          items: Object.entries(cart).map(([model, quantity]) => ({ model, quantity })),
          address: bookingAddress,
          delivery_notes: deliveryNotes
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not place your booking.');
      setCart({});
      setDeliveryNotes('');
      setNotice(`Booking received. Your order ID is ${data.order.id}. A confirmation email has been sent.`);
      onNavigate('orders');
      window.history.pushState({}, '', '/profile?tab=orders');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place your booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="drone-store" className={`${embedded ? 'bg-[#f7f4fb] py-16 sm:py-24 scroll-mt-24' : 'min-h-screen bg-[#f7f4fb] pt-28 sm:pt-36 pb-20'}`}>
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        {!embedded && <div className="rounded-[2rem] bg-gradient-to-br from-[#1e0940] via-[#351064] to-[#54229a] text-white p-7 sm:p-12 mb-10 overflow-hidden relative">
          <div className="absolute -right-14 -top-20 w-80 h-80 rounded-full border-[40px] border-white/5" />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-purple-100 mb-5">
              <ShieldCheck className="w-4 h-4" /> IndoWings Customer Store
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">Choose your next drone.</h1>
            <p className="text-white/75 sm:text-lg max-w-2xl">
              Browse available, QC-cleared inventory and place a booking request. Our operations team will confirm and arrange delivery. No online payment is collected.
            </p>
            <div className="flex flex-wrap gap-5 mt-7 text-sm text-white/80">
              <span className="inline-flex items-center gap-2"><Package className="w-4 h-4" /> Live inventory</span>
              <span className="inline-flex items-center gap-2"><Truck className="w-4 h-4" /> Dispatch updates</span>
              <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4" /> Saved delivery addresses</span>
            </div>
          </div>
        </div>}

        <div className={`grid ${embedded ? 'xl:grid-cols-[minmax(0,1fr)_350px]' : 'lg:grid-cols-[minmax(0,1fr)_390px]'} gap-8 items-start`}>
          <section>
            <div className={`flex flex-col ${embedded ? 'lg:flex-row lg:items-end' : 'sm:flex-row sm:items-end'} justify-between gap-4 mb-5`}>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] font-black text-purple-700">{embedded ? 'Explore the IndoWings fleet' : 'Product catalogue'}</p>
                <h2 className={`font-black text-[#171222] mt-1 ${embedded ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>{embedded ? 'Find your next drone' : 'Available inventory'}</h2>
                {embedded && <p className="text-sm text-slate-500 mt-2 max-w-xl">Browse live, quality-cleared aircraft available for booking. Compare models and choose the platform that fits your mission.</p>}
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                <ShoppingCart className="w-4 h-4" /> {filteredProducts.length} models · {totalUnits} in cart
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 mb-5 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search drone models..." className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" aria-label="Search drone models" />
                </label>
                <label className="flex items-center gap-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
                  <input type="checkbox" checked={availabilityFilter} onChange={event => setAvailabilityFilter(event.target.checked)} className="accent-purple-800" />
                  In stock only
                </label>
              </div>
              <div className="flex gap-2 overflow-x-auto pt-3" aria-label="Filter by drone category">
                {categories.map(category => (
                  <button key={category} onClick={() => setCategoryFilter(category)} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${categoryFilter === category ? 'bg-[#3b0080] text-white' : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-800'}`}>
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center text-slate-500">
                <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-purple-700" /> Loading live inventory...
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-800">No inventory is listed yet</h3>
                <p className="text-sm text-slate-500 mt-1">Please check back when the fleet team has added stock.</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
                <Search className="w-9 h-9 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-800">No matching drones</h3>
                <p className="text-sm text-slate-500 mt-1">Try another search or switch the category filter.</p>
                <button onClick={() => { setSearch(''); setCategoryFilter('All drones'); setAvailabilityFilter(false); }} className="mt-4 text-sm font-bold text-purple-800 hover:underline">Clear filters</button>
              </div>
            ) : (
              <>
              <div className={`grid sm:grid-cols-2 ${embedded ? '2xl:grid-cols-3' : ''} gap-5`}>
                {visibleProducts.map(product => {
                  const details = DRONE_PRODUCTS.find(item => item.name.toLowerCase() === product.model.toLowerCase());
                  const quantity = cart[product.model] || 0;
                  return (
                    <article key={product.model} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                      <div className="h-48 bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center p-5">
                        <img
                          src={details?.image || '/images/home/cyberonepro.webp'}
                          alt={product.model}
                          className="max-h-full max-w-full object-contain drop-shadow-md"
                        />
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider font-black text-purple-700">{details?.category || 'IndoWings UAV'}</p>
                            <h3 className="text-xl font-black text-slate-900 mt-1">{product.model}</h3>
                          </div>
                          <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full ${product.available_stock ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {product.available_stock ? `${product.available_stock} IN STOCK` : 'OUT OF STOCK'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed mt-3 flex-1">
                          {details?.tagline || 'QC-cleared unit from current IndoWings manufacturing inventory.'}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-4 mb-4 text-xs">
                          <div className="bg-slate-50 rounded-lg p-2.5"><span className="block text-[9px] text-slate-400 font-bold">RANGE</span><strong>{details?.range || 'See specification'}</strong></div>
                          <div className="bg-slate-50 rounded-lg p-2.5"><span className="block text-[9px] text-slate-400 font-bold">PAYLOAD</span><strong>{details?.payload || 'See specification'}</strong></div>
                        </div>
                        {quantity === 0 ? (
                          <button
                            disabled={!product.available_stock}
                            onClick={() => adjustQuantity(product.model, 1, product.available_stock)}
                            className="w-full rounded-xl bg-[#3b0080] hover:bg-[#2c0060] text-white py-3 text-sm font-bold disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                          >
                            Add to cart
                          </button>
                        ) : (
                          <div className="flex items-center justify-between rounded-xl bg-purple-50 border border-purple-100 p-1.5">
                            <button onClick={() => adjustQuantity(product.model, -1, product.available_stock)} className="w-9 h-9 rounded-lg bg-white text-purple-800 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                            <span className="font-black text-purple-900">{quantity} in cart</span>
                            <button onClick={() => adjustQuantity(product.model, 1, product.available_stock)} disabled={quantity >= product.available_stock} className="w-9 h-9 rounded-lg bg-white text-purple-800 flex items-center justify-center disabled:opacity-40"><Plus className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
              {pageCount > 1 && <nav className="flex items-center justify-between gap-3 mt-6" aria-label="Drone catalogue pages">
                <p className="text-xs text-slate-500">Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, filteredProducts.length)} of {filteredProducts.length}</p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1} aria-label="Previous page" className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40"><ArrowLeft className="w-4 h-4" /></button>
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map(pageNumber => <button key={pageNumber} onClick={() => setPage(pageNumber)} aria-current={pageNumber === page ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-xs font-black ${pageNumber === page ? 'bg-[#3b0080] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-purple-50'}`}>{pageNumber}</button>)}
                  <button onClick={() => setPage(current => Math.min(pageCount, current + 1))} disabled={page === pageCount} aria-label="Next page" className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40"><ArrowRight className="w-4 h-4" /></button>
                </div>
              </nav>}
              </>
            )}
          </section>

          <aside className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 ${embedded ? 'xl:sticky xl:top-28' : 'lg:sticky lg:top-28'}`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-purple-700">Secure booking</p>
                <h2 className="text-xl font-black text-slate-900 mt-1">Your cart</h2>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center"><ShoppingBag className="w-5 h-5" /></div>
            </div>

            {totalUnits === 0 ? (
              <div className="py-5 text-center border-y border-dashed border-slate-200 mb-5">
                <ShoppingCart className="w-7 h-7 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">Your cart is empty</p>
                <p className="text-xs text-slate-400 mt-1">Add an in-stock drone to begin.</p>
              </div>
            ) : (
              <div className="space-y-3 border-y border-slate-100 py-4 mb-5">
                {Object.entries(cart).map(([model, quantity]) => (
                  <div key={model} className="flex justify-between items-center gap-3 text-sm">
                    <span className="font-semibold text-slate-700">{model}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => adjustQuantity(model, -1, products.find(item => item.model === model)?.available_stock || 0)} className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                      <span className="w-5 text-center font-black">{quantity}</span>
                      <button onClick={() => adjustQuantity(model, 1, products.find(item => item.model === model)?.available_stock || 0)} disabled={quantity >= (products.find(item => item.model === model)?.available_stock || 0)} className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center disabled:opacity-40"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2">
                  <span>Total units</span><span>{totalUnits}</span>
                </div>
              </div>
            )}

            {!currentUser ? (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-sm font-bold text-amber-900">Customer account required</p>
                <p className="text-xs text-amber-800 mt-1">Ask the IndoWings administrator to provision your customer ID.</p>
                <button onClick={navigateToLogin} className="w-full mt-3 rounded-lg bg-[#3b0080] text-white py-2.5 text-sm font-bold">Sign in to book</button>
              </div>
            ) : currentUser.role !== 'customer' ? (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600">
                Sign out of your staff account and use a provisioned customer ID to place a booking.
              </div>
            ) : (
              <form onSubmit={placeBooking} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Delivery address</label>
                  {addresses.length > 0 && (
                    <div className="relative mb-2">
                      <select
                        value={selectedAddressId}
                        onChange={event => setSelectedAddressId(event.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-xs font-semibold text-slate-700"
                      >
                        {addresses.map(address => <option key={address.id} value={address.id}>{address.label} - {address.full_address}</option>)}
                        <option value="">+ Add a new delivery address</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
                    </div>
                  )}
                  {!selectedAddress && (
                    <div className="space-y-2">
                      <input required value={addressDraft.recipient_name} onChange={e => setAddressDraft({ ...addressDraft, recipient_name: e.target.value })} placeholder="Recipient name" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs" />
                      <PhoneInput required value={addressDraft.recipient_phone} onChange={v => setAddressDraft({ ...addressDraft, recipient_phone: v })} placeholder="Recipient phone" size="sm" inputClassName="text-xs rounded-lg" />
                      <textarea required value={addressDraft.full_address} onChange={e => setAddressDraft({ ...addressDraft, full_address: e.target.value })} placeholder="House / street / area" rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs resize-none" />
                      <input value={addressDraft.landmark} onChange={e => setAddressDraft({ ...addressDraft, landmark: e.target.value })} placeholder="Landmark (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs" />
                      <div className="grid grid-cols-2 gap-2">
                        <input required value={addressDraft.city} onChange={e => setAddressDraft({ ...addressDraft, city: e.target.value })} placeholder="City" className="min-w-0 rounded-lg border border-slate-200 px-3 py-2.5 text-xs" />
                        <input required value={addressDraft.pincode} onChange={e => setAddressDraft({ ...addressDraft, pincode: e.target.value })} placeholder="PIN code" className="min-w-0 rounded-lg border border-slate-200 px-3 py-2.5 text-xs" />
                      </div>
                      <p className="text-[10px] text-slate-400">This address will be saved to your profile for next time.</p>
                    </div>
                  )}
                  {selectedAddress && <p className="text-[11px] text-slate-500 leading-relaxed">{selectedAddress.recipient_name || currentUser.name} · {selectedAddress.full_address}, {selectedAddress.city} {selectedAddress.pincode}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Delivery instructions (optional)</label>
                  <textarea value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} rows={2} placeholder="Any instructions for the dispatch team?" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs resize-none" />
                </div>
                {error && <p className="rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold p-3">{error}</p>}
                {notice && <p className="rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold p-3">{notice}</p>}
                <button type="submit" disabled={submitting || totalUnits === 0} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3b0080] hover:bg-[#2c0060] disabled:opacity-50 text-white py-3.5 text-sm font-black transition-colors">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Place booking request <ArrowRight className="w-4 h-4" /></>}
                </button>
                <p className="text-[10px] leading-relaxed text-center text-slate-400">
                  No payment is collected. Inventory is reserved when your booking is accepted; operations will contact you with confirmation and dispatch updates.
                </p>
              </form>
            )}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Your booking ID and updates are emailed to your account.
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};
