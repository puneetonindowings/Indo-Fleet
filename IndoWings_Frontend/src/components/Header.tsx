import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, User, LogOut, LayoutDashboard, Clock, ChevronDown, Zap, Navigation, Headphones, Wrench, Shield, ShoppingBag, ShoppingCart } from 'lucide-react';
import { DeliveryUser } from '../types';

interface HeaderProps {
  currentUser: DeliveryUser | null;
  onOpenCommandCenter?: () => void;
  onOpenDemoBooking?: () => void;
  onOpenFeedback?: () => void;
  onNavigate?: (page: string) => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentUser, onOpenAuth, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState<number>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('iw_store_cart_drones') || '{}');
      return Object.keys(saved).length;
    } catch {
      return 0;
    }
  });
  const profileRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const updateCart = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('iw_store_cart_drones') || '{}');
        setCartCount(Object.keys(saved).length);
      } catch {
        setCartCount(0);
      }
    };
    window.addEventListener('storage', updateCart);
    window.addEventListener('iw_cart_updated', updateCart);
    return () => {
      window.removeEventListener('storage', updateCart);
      window.removeEventListener('iw_cart_updated', updateCart);
    };
  }, []);

  const handleMouseEnter = (menu: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpenDropdown(menu);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        if (openDropdown === 'profile') setOpenDropdown(null);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (openDropdown && openDropdown !== 'profile') setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openDropdown]);

  const nav = (page: string, url: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate?.(page);
    window.history.pushState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  };

  const getDashboardInfo = (role?: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin Dashboard', page: 'admin', url: '/admin', icon: Shield, badge: 'Super Admin' };
      case 'fleet_manager':
        return { label: 'Fleet Dashboard', page: 'fleet', url: '/fleet', icon: Wrench, badge: 'QC Lead' };
      case 'dispatcher':
        return { label: 'Drone Dispatch Dashboard', page: 'drone-dispatch', url: '/drone-dispatch', icon: LayoutDashboard, badge: 'Dispatcher' };
      case 'support':
        return { label: 'Support Desk', page: 'support-desk', url: '/support-desk', icon: Headphones, badge: 'Support' };
      default:
        return null;
    }
  };

  const dashboardInfo = currentUser ? getDashboardInfo(currentUser.role) : null;

  // 2. Transit & Tracking
  const TRANSIT_ITEMS = [
    {
      icon: Navigation,
      label: 'Live Drone Tracking',
      sub: 'Real-time GPS flight path & status',
      page: 'track',
      url: '/track',
      badge: 'Live'
    },
    {
      icon: Clock,
      label: 'Flight & Dispatch History',
      sub: 'Dispatches, transit logs & challans',
      page: 'orders',
      url: '/profile?tab=orders'
    }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full pt-2.5 sm:pt-3.5 px-3 sm:px-6 pointer-events-none transition-all duration-300">
      {/* ── Floating Cylindrical Glassmorphic Capsule ────────────────── */}
      <div
        className={`max-w-[1360px] mx-auto h-[64px] sm:h-[68px] px-4 sm:px-6 rounded-full flex items-center justify-between pointer-events-auto transition-all duration-300 ${
          scrolled ? 'navbar-glass-capsule-scrolled' : 'navbar-glass-capsule'
        }`}
      >
        {/* ── Brand Logo (Bigger & Crisp) ───────────────────────────── */}
        <div className="flex items-center gap-3 shrink-0">
          <a href="/" onClick={nav('home', '/')} className="flex items-center gap-3 group">
            <img src="/indofleet-logo-dark.svg" alt="IndoFleet" className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-[1.02]" />
          </a>
        </div>

        {/* ── Desktop Navigation Menu (Cylindrical Pills) ───────────── */}
        <nav className="hidden lg:flex items-center gap-1.5 text-[14px] font-bold text-slate-800" ref={dropdownRef}>
          {/* 1. Track Drone Dropdown */}
          <div className="relative" onMouseEnter={() => handleMouseEnter('transit')} onMouseLeave={handleMouseLeave}>
            <button
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all ${
                openDropdown === 'transit' ? 'bg-orange-50 text-[#ef7f1a]' : 'hover:bg-slate-100/80 text-slate-700 hover:text-slate-900'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-[#ef7f1a]" />
              <span>Track Drone</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openDropdown === 'transit' ? 'rotate-180 text-[#ef7f1a]' : 'text-slate-400'}`} />
            </button>

            {openDropdown === 'transit' && (
              <div className="absolute top-[calc(100%+10px)] left-0 pt-1 w-72 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="dropdown-glass rounded-2xl p-2">
                  <div className="px-3 pt-2 pb-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Flight Tracking</p>
                  </div>
                  {TRANSIT_ITEMS.map((item) => (
                    <a key={item.label} href={item.url} onClick={nav(item.page, item.url)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all group">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-orange-50 group-hover:text-[#ef7f1a] flex items-center justify-center shrink-0">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.label}</p>
                          {item.badge && <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full animate-pulse">{item.badge}</span>}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.sub}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Fleet Store */}
          <a
            href="/store"
            onClick={nav('shop', '/store')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full hover:bg-orange-50 hover:text-[#ef7f1a] transition-all text-slate-700 font-bold group"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#ef7f1a] group-hover:scale-110 transition-transform" />
            <span>Store</span>
          </a>

          {/* 3. Direct Support Desk Link with Inquiries Form & Numbers */}
          <a
            href="/support"
            onClick={nav('support', '/support')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full hover:bg-orange-50 hover:text-[#ef7f1a] transition-all text-slate-700 font-bold group"
          >
            <Headphones className="w-3.5 h-3.5 text-slate-600 group-hover:text-[#ef7f1a] group-hover:scale-110 transition-transform" />
            <span>Support Desk</span>
          </a>

          {/* 4. Direct Link: IndoWings Aerospace */}
          <a href="/company" onClick={nav('company', '/company')} className="px-3.5 py-2 rounded-full hover:bg-slate-100/80 hover:text-slate-900 transition-all text-slate-700 font-bold">
            IndoWings Aerospace
          </a>
        </nav>

        {/* ── Right Actions ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Cart Quick Access */}
          <a
            href="/store"
            onClick={nav('shop', '/store')}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200/90 hover:border-orange-300 hover:bg-orange-50/80 bg-white/70 backdrop-blur-sm transition-all shadow-sm text-slate-700 hover:text-[#ef7f1a]"
            title="Consignment Cart"
          >
            <ShoppingCart className="w-4 h-4 text-[#ef7f1a]" />
            <span className="hidden sm:inline text-xs font-bold">Cart</span>
            {cartCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#ef7f1a] text-white text-[10px] font-black rounded-full min-w-[18px] text-center leading-tight">
                {cartCount}
              </span>
            )}
          </a>

          {/* User Auth / Profile Dropdown */}
          {currentUser ? (
            <div className="relative" ref={profileRef} onMouseEnter={() => handleMouseEnter('profile')} onMouseLeave={handleMouseLeave}>
              <button
                onClick={() => setOpenDropdown(openDropdown === 'profile' ? null : 'profile')}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 hover:border-orange-300 hover:bg-slate-50 bg-white transition-all shadow-2xs cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#191b30] flex items-center justify-center text-white text-xs font-bold">
                  {currentUser.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[100px]">{currentUser.name?.split(' ')[0]}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${openDropdown === 'profile' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'profile' && (
                <div className="absolute top-[calc(100%+8px)] right-0 w-60 dropdown-glass rounded-2xl p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 z-50 shadow-lg border border-slate-200/80 bg-white">
                  <div className="px-3 py-2.5 mb-1 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#191b30] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {currentUser.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{currentUser.email || currentUser.phone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Direct Workspace Link */}
                  {dashboardInfo && (
                    <button
                      onClick={nav(dashboardInfo.page, dashboardInfo.url)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-orange-50 text-[#ef7f1a] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <dashboardInfo.icon className="w-4 h-4 text-[#ef7f1a]" />
                      <span>{dashboardInfo.label}</span>
                    </button>
                  )}

                  <button onClick={nav('profile', '/profile')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={nav('orders', '/profile?tab=orders')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Consignment Orders</span>
                  </button>

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        onLogout?.();
                        setOpenDropdown(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-600 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 text-[14px] font-bold text-white bg-[#ef7f1a] hover:bg-[#d96e11] px-5 py-2.5 rounded-full shadow-md shadow-orange-900/20 transition-all active:scale-95"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 rounded-full text-slate-600 hover:bg-slate-100 transition-colors ml-1">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ─────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2.5 max-w-[1360px] mx-auto dropdown-glass rounded-3xl px-5 py-4 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[calc(100vh-5.5rem)] overflow-y-auto pointer-events-auto">
          {/* If user is logged in, show their dedicated role dashboard button */}
          {dashboardInfo && (
            <div className="px-3 py-2 mb-2 bg-orange-50/80 border border-orange-200/80 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#ef7f1a] mb-1">Your Operations Workspace</p>
              <a href={dashboardInfo.url} onClick={nav(dashboardInfo.page, dashboardInfo.url)} className="flex items-center gap-2.5 py-1 text-xs font-bold text-[#191b30]">
                <dashboardInfo.icon className="w-4 h-4 text-[#ef7f1a]" />
                <span>{dashboardInfo.label}</span>
              </a>
            </div>
          )}

          <a
            href="/store"
            onClick={nav('shop', '/store')}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-orange-50/80 border border-orange-200/80 hover:bg-orange-100/80 transition-all mb-1"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-[#ef7f1a]" />
              <span>Fleet Store</span>
            </div>
            {cartCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#ef7f1a] text-white text-[10px] font-black">
                {cartCount} in Cart
              </span>
            )}
          </a>

          <a
            href="/support"
            onClick={nav('support', '/support')}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all mb-1"
          >
            <Headphones className="w-4 h-4 text-[#ef7f1a]" />
            <span>Support Desk</span>
          </a>

          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Flight &amp; Drone Tracking</p>
          </div>
          {TRANSIT_ITEMS.map((item) => (
            <a key={item.label} href={item.url} onClick={nav(item.page, item.url)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50">
              <item.icon className="w-4 h-4 text-[#ef7f1a] shrink-0" />
              <span>{item.label}</span>
            </a>
          ))}

          <div className="px-3 pt-2 pb-1">
            <a href="/company" onClick={nav('company', '/company')} className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#ef7f1a]">
              <span>IndoWings Aerospace Platform</span>
            </a>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {currentUser ? (
              <button
                onClick={() => {
                  onLogout?.();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 font-bold text-xs flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onOpenAuth?.();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-[#ef7f1a] hover:bg-[#d96e11] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <User className="w-4 h-4" />
                <span>Personnel Portal Login</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
