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
      {/* Subtle dot matrix background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Atmospheric aerospace glows */}
      <div className="absolute top-0 left-1/4 w-[450px] h-[250px] bg-white/[0.04] blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[250px] bg-white/[0.03] blur-[110px] rounded-full pointer-events-none" />

      {/* Watermark */}
      <div className="absolute bottom-2 sm:bottom-0 left-0 right-0 overflow-hidden pointer-events-none select-none flex justify-center items-end z-0">
        <span
          className="font-black tracking-tighter leading-none whitespace-nowrap text-transparent font-['Space_Grotesk',sans-serif]"
          style={{
            fontSize: 'clamp(70px, 17vw, 240px)',
            WebkitTextStroke: '1px rgba(255, 255, 255, 0.05)',
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
        {/* Top bar: Brand */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-10 border-b border-white/[0.07]">
          <div className="max-w-2xl">
            <a href="/" onClick={navTo('home', '/')} className="inline-flex items-center gap-3">
              <img
                src="/indofleet-logo-white.svg"
                alt="IndoFleet"
                className="h-8 w-auto object-contain"
              />
            </a>
            <p className="text-[13.5px] sm:text-sm text-slate-300/80 mt-3 leading-relaxed">
              IndoFleet Enterprise UAV Fleet Logistics &amp; Handover Hub. Operations infrastructure governing factory assembly diagnostics, corridor dispatch, and technical acceptance.
            </p>
          </div>
        </div>

        {/* Links Grid with slightly larger readable font */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10">
          {/* Column 1: Operations Gateway */}
          <div>
            <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-[0.16em] text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Operations Gateway
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
                    Personnel Portal Sign In
                  </a>
                )}
              </li>
              <li>
                <a href="/support" onClick={navTo('support', '/support')} className="hover:text-purple-400 transition-colors">
                  Operations Hotline &amp; Support
                </a>
              </li>
              <li>
                <a href="/track" onClick={navTo('track', '/track')} className="hover:text-purple-400 transition-colors">
                  Live Drone Tracking
                </a>
              </li>
              <li>
                <a href="/docs" onClick={navTo('docs', '/docs')} className="hover:text-purple-400 transition-colors">
                  Avionics &amp; SOP Guidelines
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Flight Tracking */}
          <div>
            <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-[0.16em] text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Flight Tracking
            </h3>
            <ul className="space-y-3 text-[13.5px] sm:text-sm text-slate-300">
              <li>
                <a href="/track" onClick={navTo('track', '/track')} className="hover:text-purple-400 transition-colors">
                  Live Drone Transit Tracking
                </a>
              </li>
              <li>
                <a href="/command-center" onClick={navTo('command-center', '/command-center')} className="hover:text-purple-400 transition-colors">
                  Telemetry Command Center
                </a>
              </li>
              <li>
                <a href="/downloads" onClick={navTo('downloads', '/downloads')} className="hover:text-purple-400 transition-colors">
                  Telemetry Log Exports
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Protocols & Specifications */}
          <div>
            <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-[0.16em] text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              SOP Protocols
            </h3>
            <ul className="space-y-3 text-[13.5px] sm:text-sm text-slate-300">
              <li>
                <a href="/docs" onClick={navTo('docs', '/docs')} className="hover:text-purple-400 transition-colors">
                  Hardware QC SOP Checklist
                </a>
              </li>
              <li>
                <a href="/support" onClick={navTo('support', '/support')} className="hover:text-purple-400 transition-colors">
                  Internal Operations Helpdesk
                </a>
              </li>
              <li>
                <a href="/support?tab=fix" onClick={navTo('support', '/support?tab=fix')} className="hover:text-purple-400 transition-colors">
                  Hardware Diagnostics &amp; Fixes
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Compliance & Governance */}
          <div>
            <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-[0.16em] text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Compliance
            </h3>
            <ul className="space-y-3 text-[13.5px] sm:text-sm text-slate-300">
              <li>
                <span className="text-slate-300">DGCA Type Certified</span>
              </li>
              <li>
                <span className="text-slate-300">NPNT Airspace Governance</span>
              </li>
              <li>
                <a href="/legal#security" onClick={navTo('legal', '/legal', 'security')} className="hover:text-purple-400 transition-colors">
                  Security Disclosure
                </a>
              </li>
              <li>
                <a href="/legal#privacy" onClick={navTo('legal', '/legal', 'privacy')} className="hover:text-purple-400 transition-colors">
                  Internal Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright on Left, 24/7 Operations Support on Right */}
        <div className="pt-6 border-t border-white/[0.08] flex flex-col lg:flex-row items-center justify-between text-[13px] text-slate-400 gap-4">
          <p>Copyright &copy; 2026 IndoWings. All rights reserved.</p>

          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 sm:gap-3 text-[12.5px] sm:text-[13px] text-slate-300">
            <span className="text-purple-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              24/7 Support:
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
