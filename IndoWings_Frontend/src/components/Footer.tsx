import React from 'react';
import { DeliveryUser } from '../types';

interface FooterProps {
  currentUser?: DeliveryUser | null;
  onNavigate?: (page: string) => void;
  onOpenFeedback?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, currentUser }) => {
  const navTo = (page: string, url: string, hash?: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) onNavigate(page);
    window.history.pushState({}, '', hash ? `${url}#${hash}` : url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#191b30] text-slate-300 pt-16 pb-12 px-4 sm:px-8 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] border-t border-white/[0.08]">
      {/* Background Subtle Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Atmospheric Glow Highlights */}
      <div className="absolute top-0 left-1/4 w-[450px] h-[250px] bg-purple-500/[0.04] blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[250px] bg-indigo-500/[0.03] blur-[110px] rounded-full pointer-events-none" />

      {/* Giant Watermark */}
      <div className="absolute bottom-2 sm:bottom-0 left-0 right-0 overflow-hidden pointer-events-none select-none flex justify-center items-end z-0">
        <span
          className="font-black tracking-tighter leading-none whitespace-nowrap text-transparent font-['Space_Grotesk',sans-serif]"
          style={{
            fontSize: 'clamp(70px, 17vw, 240px)',
            WebkitTextStroke: '1px rgba(255, 255, 255, 0.04)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 75%, transparent 100%)',
            WebkitBackgroundClip: 'text',
            letterSpacing: '-0.04em',
            transform: 'translateY(14%)',
          }}
        >
          indofleet
        </span>
      </div>

      <div className="relative z-10 max-w-[1360px] mx-auto">
        {/* Brand Header & Inventory System Overview */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-10 border-b border-white/[0.08]">
          <div className="max-w-2xl">
            <a href="/" onClick={navTo('home', '/')} className="inline-flex items-center gap-3">
              <img
                src="/indofleet-logo-white.svg"
                alt="IndoFleet"
                className="h-8 w-auto object-contain"
              />
            </a>
            <h2 className="text-base sm:text-lg font-bold text-white mt-3.5 tracking-tight">
              Enterprise UAV Inventory &amp; Fleet Asset Management System
            </h2>
            <p className="text-[13px] sm:text-sm text-slate-300/80 mt-1.5 leading-relaxed">
              Centralized warehouse stock governance, hardware serial verification, tamper-proof QR code linking, pre-flight QC diagnostics, and automated sortie allocation.
            </p>
          </div>

          {/* Plant & Stock Live Status Badge */}
          <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] px-4 py-3 rounded-2xl shrink-0 self-start lg:self-center">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Central Warehouse Hub</p>
              <p className="text-xs font-semibold text-white">Noida Sector 62 Plant &bull; Live Fleet Inventory</p>
            </div>
          </div>
        </div>

        {/* 4 Inventory-Relevant Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10">
          {/* Column 1: Fleet & Inventory Assets */}
          <div>
            <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-[0.16em] text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Fleet &amp; Inventory Assets
            </h3>
            <ul className="space-y-3 text-[13.5px] sm:text-sm text-slate-300">
              <li>
                <a href="/store" onClick={navTo('shop', '/store')} className="hover:text-purple-400 transition-colors flex items-center justify-between">
                  <span>Central Drone Catalog</span>
                  <span className="text-[10px] bg-purple-950/80 text-purple-200 px-1.5 py-0.5 rounded border border-purple-700/50">1000 UAVs</span>
                </a>
              </li>
              <li>
                <a href="/admin" onClick={navTo('admin', '/admin')} className="hover:text-purple-400 transition-colors">
                  Hardware Serial &amp; QR Registry
                </a>
              </li>
              <li>
                <a href="/store" onClick={navTo('shop', '/store')} className="hover:text-purple-400 transition-colors">
                  Stock Reserves &amp; Allocation
                </a>
              </li>
              <li>
                <a href="/admin" onClick={navTo('admin', '/admin')} className="hover:text-purple-400 transition-colors">
                  Maintenance &amp; Grounded Units
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Warehouse Operations */}
          <div>
            <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-[0.16em] text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Warehouse Operations
            </h3>
            <ul className="space-y-3 text-[13.5px] sm:text-sm text-slate-300">
              <li>
                <a href="/dispatch" onClick={navTo('dispatch', '/dispatch')} className="hover:text-purple-400 transition-colors">
                  Dispatch Handover Station
                </a>
              </li>
              <li>
                <a href="/track" onClick={navTo('track', '/track')} className="hover:text-purple-400 transition-colors">
                  Sortie Transit &amp; Route Tracking
                </a>
              </li>
              <li>
                <a href="/dispatch" onClick={navTo('dispatch', '/dispatch')} className="hover:text-purple-400 transition-colors">
                  Pilot Asset Assignment
                </a>
              </li>
              <li>
                <a href="/admin" onClick={navTo('admin', '/admin')} className="hover:text-purple-400 transition-colors">
                  Bulk Batch Ingestion &amp; ZIP
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Quality & Compliance */}
          <div>
            <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-[0.16em] text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Asset QC &amp; Compliance
            </h3>
            <ul className="space-y-3 text-[13.5px] sm:text-sm text-slate-300">
              <li>
                <a href="/docs" onClick={navTo('docs', '/docs')} className="hover:text-purple-400 transition-colors">
                  Pre-Flight Hardware QC Checklist
                </a>
              </li>
              <li>
                <a href="/admin" onClick={navTo('admin', '/admin')} className="hover:text-purple-400 transition-colors">
                  Tamper-Proof QR Audits
                </a>
              </li>
              <li>
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span>DGCA Type Certified</span>
                  <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-700/50">Verified</span>
                </span>
              </li>
              <li>
                <a href="/support" onClick={navTo('support-desk', '/support-desk')} className="hover:text-purple-400 transition-colors">
                  Battery Cycles &amp; Maintenance Logs
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Operations Desks */}
          <div>
            <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-[0.16em] text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              System Portals
            </h3>
            <ul className="space-y-3 text-[13.5px] sm:text-sm text-slate-300">
              <li>
                {currentUser ? (
                  <a
                    href={
                      currentUser.role === 'admin'
                        ? '/admin'
                        : currentUser.role === 'fleet_manager'
                          ? '/fleet'
                          : currentUser.role === 'dispatcher'
                            ? '/dispatch'
                            : '/support-desk'
                    }
                    onClick={navTo(
                      currentUser.role === 'admin'
                        ? 'admin'
                        : currentUser.role === 'fleet_manager'
                          ? 'fleet'
                          : currentUser.role === 'dispatcher'
                            ? 'dispatch'
                            : 'support-desk',
                      currentUser.role === 'admin'
                        ? '/admin'
                        : currentUser.role === 'fleet_manager'
                          ? '/fleet'
                          : currentUser.role === 'dispatcher'
                            ? '/dispatch'
                            : '/support-desk'
                    )}
                    className="hover:text-white transition-colors flex items-center gap-1.5 text-purple-300 font-semibold"
                  >
                    <span>Operations Console</span>
                    <span className="text-[10px] bg-purple-950/80 text-purple-200 px-1.5 py-0.5 rounded border border-purple-700/50 uppercase">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                  </a>
                ) : (
                  <a href="/login" onClick={navTo('login', '/login')} className="hover:text-purple-400 transition-colors">
                    Operations Portal Sign In
                  </a>
                )}
              </li>
              <li>
                <a href="/fleet" onClick={navTo('fleet', '/fleet')} className="hover:text-purple-400 transition-colors">
                  Fleet Manager Workspace
                </a>
              </li>
              <li>
                <a href="/dispatch" onClick={navTo('dispatch', '/dispatch')} className="hover:text-purple-400 transition-colors">
                  Dispatcher Hub Console
                </a>
              </li>
              <li>
                <a href="/support-desk" onClick={navTo('support-desk', '/support-desk')} className="hover:text-purple-400 transition-colors">
                  Technical Support &amp; RMA Desk
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Strip */}
        <div className="pt-6 border-t border-white/[0.08] flex flex-col lg:flex-row items-center justify-between text-[13px] text-slate-400 gap-4">
          <p>Copyright &copy; 2026 IndoFleet UAV Systems. All rights reserved.</p>

          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 sm:gap-3 text-[12.5px] sm:text-[13px] text-slate-300">
            <span className="text-purple-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              24/7 Operations Desk:
            </span>
            <a href="tel:+917669478937" className="font-mono text-white hover:text-purple-300 transition-colors font-bold">
              +91 7669478937
            </a>
            <span className="text-white/20">|</span>
            <span className="font-mono text-slate-300">
              Toll-Free: 1800 572 7363
            </span>
            <span className="text-white/20">|</span>
            <a href="mailto:connect@indowings.com" className="text-purple-400 hover:text-white transition-colors font-medium">
              connect@indowings.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
