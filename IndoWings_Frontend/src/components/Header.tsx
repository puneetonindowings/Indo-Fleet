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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full pt-2 sm:pt-3.5 px-2.5 sm:px-6 pointer-events-none transition-all duration-300">
      {/* ── Floating Cylindrical Glassmorphic Capsule ────────────────── */}
      <div
        className={`max-w-[1360px] mx-auto h-[58px] sm:h-[68px] px-3 sm:px-6 rounded-full flex items-center justify-between pointer-events-auto transition-all duration-300 ${
          scrolled ? 'navbar-glass-capsule-scrolled' : 'navbar-glass-capsule'
        }`}
      >
        {/* ── Brand Logo (Bigger & Crisp) ───────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a href="/" onClick={nav('home', '/')} className="flex items-center gap-2 group">
            <img src="/indofleet-logo-dark.svg" alt="IndoFleet" className="h-8 sm:h-10 w-auto object-contain transition-transform group-hover:scale-[1.02]" />
          </a>
        </div>

        {/* ── Desktop Navigation Menu (Cylindrical Pills) ───────────── */}
        <nav className="hidden lg:flex items-center gap-1.5 text-[14px] font-bold text-slate-800" ref={dropdownRef}>
          {/* 1. Track Order (Direct Link) */}
          <a
            href="/track"
            onClick={nav('track', '/track')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full hover:bg-purple-50 hover:text-[#5a00b8] transition-all text-slate-700 font-bold group"
          >
            <Navigation className="w-3.5 h-3.5 text-[#5a00b8] group-hover:scale-110 transition-transform" />
            <span>Track Order</span>
          </a>

          {/* 2. Fleet Store */}
          <a
            href="/store"
            onClick={nav('shop', '/store')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full hover:bg-purple-50 hover:text-[#5a00b8] transition-all text-slate-700 font-bold group"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#5a00b8] group-hover:scale-110 transition-transform" />
            <span>Store</span>
          </a>

          {/* 3. Direct Support Desk Link with Inquiries Form & Numbers */}
          <a
            href="/support"
            onClick={nav('support', '/support')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full hover:bg-purple-50 hover:text-[#5a00b8] transition-all text-slate-700 font-bold group"
          >
            <Headphones className="w-3.5 h-3.5 text-slate-600 group-hover:text-[#5a00b8] group-hover:scale-110 transition-transform" />
            <span>Support Desk</span>
          </a>

          {/* 4. Direct Link: IndoWings */}
          <a href="/company" onClick={nav('company', '/company')} className="px-3.5 py-2 rounded-full hover:bg-slate-100/80 hover:text-slate-900 transition-all text-slate-700 font-bold">
            IndoWings
          </a>
        </nav>

        {/* ── Right Actions ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Cart Quick Access (Desktop & Tablet) */}
          <a
            href="/store"
            onClick={nav('shop', '/store')}
            className="hidden sm:flex relative items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-full border border-slate-200/90 hover:border-purple-300 hover:bg-purple-50/80 bg-white/70 backdrop-blur-sm transition-all shadow-xs text-slate-700 hover:text-[#5a00b8] shrink-0"
            title="Consignment Cart"
          >
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5a00b8]" />
            <span className="text-xs font-bold">Cart</span>
            {cartCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#5a00b8] text-white text-[10px] font-black rounded-full min-w-[18px] text-center leading-tight">
                {cartCount}
              </span>
            )}
          </a>

          {/* User Auth / Profile Dropdown (Desktop & Tablet) */}
          {currentUser ? (
            <div className="hidden sm:block relative shrink-0" ref={profileRef} onMouseEnter={() => handleMouseEnter('profile')} onMouseLeave={handleMouseLeave}>
              <button
                onClick={() => setOpenDropdown(openDropdown === 'profile' ? null : 'profile')}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 hover:border-purple-300 hover:bg-slate-50 bg-white transition-all shadow-2xs cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#191b30] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {currentUser.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="text-left">
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
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-50 text-[#5a00b8] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <dashboardInfo.icon className="w-4 h-4 text-[#5a00b8]" />
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
              className="hidden sm:flex items-center gap-2 text-[14px] font-bold text-white bg-[#5a00b8] hover:bg-[#4a0099] px-5 py-2.5 rounded-full shadow-md shadow-purple-900/20 transition-all active:scale-95 whitespace-nowrap cursor-pointer shrink-0"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Hamburger Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-full text-slate-700 hover:text-[#5a00b8] hover:bg-purple-50 bg-slate-50/80 border border-slate-200 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer (Rich, Complete Menu with Profile & Cart) ────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2.5 max-w-[1360px] mx-auto dropdown-glass rounded-3xl px-5 py-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[calc(100vh-5.5rem)] overflow-y-auto pointer-events-auto border border-slate-200/90 shadow-xl bg-white/95">
          {/* User Profile Card (if logged in) */}
          {currentUser ? (
            <div className="p-3 bg-gradient-to-br from-slate-50 to-orange-50/40 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#191b30] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {currentUser.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900 truncate">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{currentUser.email || currentUser.phone}</p>
                  <span className="inline-block px-2 py-0.5 mt-0.5 bg-purple-100 text-purple-800 rounded-full text-[9px] font-black uppercase tracking-wider">
                    {currentUser.role || 'Member'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={nav('profile', '/profile')}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-purple-50 hover:text-[#5a00b8] transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={nav('orders', '/profile?tab=orders')}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-purple-50 hover:text-[#5a00b8] transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>My Orders</span>
                </button>
              </div>

              {/* Dedicated role dashboard button if operational user */}
              {dashboardInfo && (
                <button
                  onClick={nav(dashboardInfo.page, dashboardInfo.url)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#5a00b8] text-white text-xs font-bold shadow-xs hover:bg-[#4a0099] transition-all"
                >
                  <dashboardInfo.icon className="w-4 h-4 text-white" />
                  <span>Open {dashboardInfo.label}</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenAuth?.();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 rounded-2xl bg-[#5a00b8] hover:bg-[#4a0099] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-900/20 active:scale-98 transition-all"
            >
              <User className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          )}

          {/* Cart Section in Mobile Drawer */}
          <a
            href="/store"
            onClick={nav('shop', '/store')}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-800 bg-purple-50/80 border border-purple-200/80 hover:bg-purple-100/80 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-4 h-4 text-[#5a00b8]" />
              <span>Consignment Cart</span>
            </div>
            {cartCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-[#5a00b8] text-white text-[10px] font-black shadow-xs">
                {cartCount} item{cartCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">Empty</span>
            )}
          </a>

          {/* Store Link */}
          <a
            href="/store"
            onClick={nav('shop', '/store')}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-[#5a00b8]" />
            <span>Fleet Store</span>
          </a>

          {/* Track Order Link */}
          <a
            href="/track"
            onClick={nav('track', '/track')}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all"
          >
            <Navigation className="w-4 h-4 text-[#5a00b8]" />
            <span>Track Order</span>
          </a>

          {/* Support Desk Link */}
          <a
            href="/support"
            onClick={nav('support', '/support')}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all"
          >
            <Headphones className="w-4 h-4 text-[#5a00b8]" />
            <span>Support Desk</span>
          </a>

          {/* IndoWings Link */}
          <div className="px-3 pt-1.5 pb-0.5">
            <a href="/company" onClick={nav('company', '/company')} className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#5a00b8]">
              <span>IndoWings</span>
            </a>
          </div>

          {/* Logout button (if logged in) */}
          {currentUser && (
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  onLogout?.();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
