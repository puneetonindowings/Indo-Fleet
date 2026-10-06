import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, User, LogOut, LayoutDashboard, Clock, ChevronDown, Zap, Navigation, BookOpen, Headphones, Wrench, Shield } from 'lucide-react';
import { DeliveryUser } from './AuthModal';

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
  const profileRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // 3. Protocols & SOP
  const PROTOCOL_ITEMS = [
    {
      icon: BookOpen,
      label: 'Hardware QC SOP Checklist',
      sub: 'Pre-dispatch technical standards',
      page: 'docs',
      url: '/docs'
    },
    {
      icon: Wrench,
      label: 'Avionics Diagnostics & Fixes',
      sub: 'IMU, RTK & motor calibration',
      page: 'support',
      url: '/support?tab=fix'
    },
    {
      icon: Headphones,
      label: 'Operations Hotline Support',
      sub: '24/7 technical escort desk',
      page: 'support',
      url: '/support',
      badge: '24/7'
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
                openDropdown === 'transit' ? 'bg-purple-100/80 text-[#3b0080]' : 'hover:bg-slate-100/80 text-slate-700 hover:text-slate-900'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-purple-600" />
              <span>Track Drone</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openDropdown === 'transit' ? 'rotate-180 text-[#3b0080]' : 'text-slate-400'}`} />
            </button>

            {openDropdown === 'transit' && (
              <div className="absolute top-[calc(100%+10px)] left-0 pt-1 w-72 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="dropdown-glass rounded-2xl p-2">
                  <div className="px-3 pt-2 pb-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Flight Tracking</p>
                  </div>
                  {TRANSIT_ITEMS.map((item) => (
                    <a key={item.label} href={item.url} onClick={nav(item.page, item.url)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all group">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-purple-100 group-hover:text-[#3b0080] flex items-center justify-center shrink-0">
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

          {/* 2. Protocols & SOP */}
          <div className="relative" onMouseEnter={() => handleMouseEnter('sop')} onMouseLeave={handleMouseLeave}>
            <button
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all ${
                openDropdown === 'sop' ? 'bg-purple-100/80 text-[#3b0080]' : 'hover:bg-slate-100/80 text-slate-700 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Protocols &amp; SOP</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openDropdown === 'sop' ? 'rotate-180 text-[#3b0080]' : 'text-slate-400'}`} />
            </button>

            {openDropdown === 'sop' && (
              <div className="absolute top-[calc(100%+10px)] left-0 pt-1 w-72 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="dropdown-glass rounded-2xl p-2">
                  <div className="px-3 pt-2 pb-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Standard Operating Procedures</p>
                  </div>
                  {PROTOCOL_ITEMS.map((item) => (
                    <a key={item.label} href={item.url} onClick={nav(item.page, item.url)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all group">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-purple-100 group-hover:text-[#3b0080] flex items-center justify-center shrink-0">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.label}</p>
                          {item.badge && <span className="text-[9px] font-black px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full">{item.badge}</span>}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.sub}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Direct Support Desk Link with Inquiries Form & Numbers */}
          <a
            href="/support"
            onClick={nav('support', '/support')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full hover:bg-purple-50 hover:text-[#3b0080] transition-all text-slate-700 font-bold group"
          >
            <Headphones className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span>Support Desk</span>
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">24/7</span>
          </a>

          {/* 4. Direct Link: IndoWings Aerospace */}
          <a href="/company" onClick={nav('company', '/company')} className="px-3.5 py-2 rounded-full hover:bg-slate-100/80 hover:text-slate-900 transition-all text-slate-700 font-bold">
            IndoWings Aerospace
          </a>
        </nav>

        {/* ── Right Actions ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* User Auth / Profile Dropdown */}
          {currentUser ? (
            <div className="relative" ref={profileRef} onMouseEnter={() => handleMouseEnter('profile')} onMouseLeave={handleMouseLeave}>
              <button
                onClick={() => setOpenDropdown(openDropdown === 'profile' ? null : 'profile')}
                className="flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full border border-slate-200/90 hover:border-purple-300 hover:bg-purple-50/80 bg-white/70 backdrop-blur-sm transition-all shadow-sm"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3b0080] to-purple-600 flex items-center justify-center text-white text-xs font-black">
                  {currentUser.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[100px]">{currentUser.name?.split(' ')[0]}</p>
                  <p className="text-[10px] font-semibold text-purple-700 capitalize">{currentUser.role.replace('_', ' ')}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${openDropdown === 'profile' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'profile' && (
                <div className="absolute top-[calc(100%+10px)] right-0 w-64 dropdown-glass rounded-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                  <div className="px-3.5 py-3 mb-1 bg-gradient-to-br from-purple-50 to-slate-50 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3b0080] to-purple-600 flex items-center justify-center text-white text-sm font-black">
                        {currentUser.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#171222] truncate">{currentUser.name}</p>
                        <p className="text-xs text-slate-400 truncate">{currentUser.email || currentUser.phone}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wide bg-[#3b0080] text-white">
                        {currentUser.role === 'admin'
                          ? 'Super Admin'
                          : currentUser.role === 'fleet_manager'
                            ? 'Fleet Manager'
                            : currentUser.role === 'dispatcher'
                              ? 'Dispatcher'
                              : currentUser.role === 'support'
                                ? 'Support Desk Officer'
                                : currentUser.role === 'customer'
                                  ? 'Customer'
                                  : 'Staff'}
                      </span>
                    </div>
                  </div>

                  {/* Direct Dedicated Workspace Link */}
                  {dashboardInfo && (
                    <button
                      onClick={nav(dashboardInfo.page, dashboardInfo.url)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#3b0080] text-xs font-bold transition-colors mb-1.5 border border-purple-200/60 group"
                    >
                      <div className="flex items-center gap-2">
                        <dashboardInfo.icon className="w-4 h-4 text-[#3b0080]" />
                        <span>Go to {dashboardInfo.label}</span>
                      </div>
                      <span className="text-[9px] bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full font-black uppercase">Workspace</span>
                    </button>
                  )}

                  <button onClick={nav('profile', '/profile')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors">
                    <User className="w-4 h-4 text-slate-400" />
                    My Profile
                  </button>

                  <button
                    onClick={nav('orders', '/profile?tab=orders')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                  >
                    <Clock className="w-4 h-4 text-slate-400" />
                    Shipment History
                  </button>

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        onLogout?.();
                        setOpenDropdown(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-600 text-xs font-medium transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 text-[14px] font-bold text-white bg-gradient-to-r from-[#3b0080] to-[#5100a8] hover:from-[#2c0060] hover:to-[#3e0082] px-5 py-2.5 rounded-full shadow-md shadow-purple-900/20 transition-all active:scale-95"
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
            <div className="px-3 py-2 mb-2 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-purple-700 mb-1">Your Operations Workspace</p>
              <a href={dashboardInfo.url} onClick={nav(dashboardInfo.page, dashboardInfo.url)} className="flex items-center gap-2.5 py-1 text-xs font-bold text-[#3b0080]">
                <dashboardInfo.icon className="w-4 h-4 text-[#3b0080]" />
                <span>{dashboardInfo.label}</span>
              </a>
            </div>
          )}

          <a
            href="/support"
            onClick={nav('support', '/support')}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-emerald-50/70 border border-emerald-100 hover:bg-emerald-100/80 transition-all mb-1"
          >
            <div className="flex items-center gap-2.5">
              <Headphones className="w-4 h-4 text-emerald-600" />
              <span>Support Desk &amp; Inquiries</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white">24/7</span>
          </a>

          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Flight &amp; Drone Tracking</p>
          </div>
          {TRANSIT_ITEMS.map((item) => (
            <a key={item.label} href={item.url} onClick={nav(item.page, item.url)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50">
              <item.icon className="w-4 h-4 text-sky-600 shrink-0" />
              <span>{item.label}</span>
            </a>
          ))}

          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Protocols &amp; SOP</p>
          </div>
          {PROTOCOL_ITEMS.map((item) => (
            <a key={item.label} href={item.url} onClick={nav(item.page, item.url)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50">
              <item.icon className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{item.label}</span>
            </a>
          ))}

          <div className="px-3 pt-2 pb-1">
            <a href="/company" onClick={nav('company', '/company')} className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#3b0080]">
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
                className="w-full py-2.5 rounded-xl bg-[#3b0080] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
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
