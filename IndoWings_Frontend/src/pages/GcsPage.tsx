import React from 'react';
import { 
  MonitorUp, 
  DownloadCloud, 
  Workflow, 
  BookOpen, 
  UserPlus, 
  Building2, 
  ShieldCheck, 
  MonitorCheck, 
  Plane, 
  RadioTower, 
  Settings2, 
  Route, 
  Radar, 
  Factory, 
  PackageCheck, 
  GitBranch, 
  DatabaseZap, 
  Download 
} from 'lucide-react';

interface GcsPageProps {
  onNavigate: (page: 'home' | 'platform' | 'command-center' | 'gcs') => void;
  onOpenCommandCenter: () => void;
  onOpenDemoBooking: () => void;
}

const beforeSignInPills = [
  { title: 'Named account', icon: ShieldCheck },
  { title: 'Organization scope', icon: Building2 },
  { 
    title: 'Role permissions', 
    icon: ShieldCheck, 
    hasHelp: true, 
    tooltip: 'Role permissions decide which aircraft, tools, and records an IndoWings account can use.' 
  },
  { title: 'Trusted workstation', icon: MonitorCheck },
  { title: 'Aircraft assignments', icon: Plane },
  { title: 'Command Center sync', icon: RadioTower }
];

const productDetailCards = [
  {
    icon: Settings2,
    title: 'Aircraft connection',
    desc: 'Connect supported aircraft and field systems through operator-approved workstation workflows.'
  },
  {
    icon: Route,
    title: 'Mission planning',
    desc: 'Plan operational routes, review mission readiness, and prepare controlled field execution.'
  },
  {
    icon: Radar,
    title: 'Telemetry monitoring',
    desc: 'Monitor aircraft state and operational signals in a focused operations workspace.'
  },
  {
    icon: Plane,
    title: 'Operations workspace',
    desc: 'Give approved operations staff a focused environment for assigned aircraft, preflight review, and mission activity.'
  },
  {
    icon: Factory,
    title: 'Manufacturer workspace',
    desc: 'Support approved vehicle profile workflows, release readiness, and manufacturer-facing configuration tasks.'
  },
  {
    icon: PackageCheck,
    title: 'Firmware Manager',
    desc: 'Provide a UI surface for firmware-management workflows while release validation remains governed by backend policy.'
  },
  {
    icon: GitBranch,
    title: 'Vehicle profiles',
    desc: 'Represent aircraft configuration and readiness data in a consistent operational model.'
  },
  {
    icon: DatabaseZap,
    title: 'Command Center sync',
    desc: 'Synchronize access, mission, and operational state with Command Center for enterprise oversight.'
  }
];

const releaseChannelPills = [
  'Mission Planner',
  'Operations Mode',
  'Telemetry',
  'Vehicle Profiles',
  'Firmware Manager',
  'Command Sync'
];

export const GcsPage: React.FC<GcsPageProps> = ({
  onNavigate,
  onOpenCommandCenter,
  onOpenDemoBooking
}) => {
  const handleGoPlatform = (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate('platform');
    window.history.pushState({}, '', '/platform');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full bg-[#fbf9fd] text-[#171222]">
      {/* 1. Page Hero: Full Viewport Hero matching SkyGrid product-hero */}
      <section 
        className="w-full min-h-screen flex items-center pt-28 sm:pt-36 pb-16 sm:pb-20 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #2b114d 0%, #240c42 100%)'
        }}
      >
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(420px,1.15fr)] gap-10 lg:gap-14 items-center">
            {/* Left Copy */}
            <div className="space-y-6">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/20 text-[#d8b4fe]">
                <MonitorUp className="w-5 h-5 text-purple-300" />
              </span>
              <p className="text-xs font-bold tracking-widest text-[#d8b4fe] uppercase">
                INDOWINGS GROUND CONTROL STATION
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-[50px] font-extrabold text-white tracking-tight leading-[1.08]">
                Field software for professional UAV operations.
              </h1>
              <p className="text-base sm:text-[17px] text-purple-100/85 leading-relaxed max-w-2xl">
                IndoWings GCS gives approved operations teams a controlled desktop workspace for aircraft connection, mission planning, telemetry monitoring, vehicle configuration, readiness checks, and Command Center sync.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button 
                  onClick={onOpenCommandCenter}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#3b0080] hover:bg-[#4c0099] text-white text-sm font-semibold shadow-md transition-all active:scale-95 border border-purple-400/30"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>Get GCS</span>
                </button>
                <a 
                  href="/platform"
                  onClick={handleGoPlatform}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold shadow-md transition-all active:scale-95 border border-white/20"
                >
                  <Workflow className="w-4 h-4" />
                  <span>How it works</span>
                </a>
                <button 
                  onClick={onOpenDemoBooking}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-white hover:bg-slate-100 text-[#171222] text-sm font-semibold shadow-md transition-all active:scale-95"
                >
                  <BookOpen className="w-4 h-4 text-[#3b0080]" />
                  <span>Open guide</span>
                </button>
              </div>

              {/* Helper Note */}
              <p className="text-xs text-purple-200/60 pt-1 leading-relaxed max-w-lg">
                Use the download center to review the current version, account requirements, release notes, checksum, and archive before installing.
              </p>
            </div>

            {/* Right Visual Hero Shot */}
            <figure className="rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-[#12051e] group">
              <img 
                src="/images/indowings-gcs-realtime-planning.webp" 
                alt="IndoWings GCS real-time mission planning view with route validation and live mission status"
                className="w-full h-auto object-cover block group-hover:scale-[1.01] transition-transform duration-300"
              />
            </figure>
          </div>
        </div>
      </section>

      {/* 2. Before You Sign In Section */}
      <section className="w-full py-16 sm:py-20 lg:py-24 bg-[#fbf9fd]">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Left Copy */}
            <div>
              <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase mb-3">
                BEFORE YOU SIGN IN
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-[#111827] tracking-tight leading-tight mb-4">
                GCS is for approved IndoWings users and organizations.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed mb-4 max-w-xl">
                IndoWings GCS requires an active IndoWings Command Center account. The account determines who the user is, which organization they belong to, which aircraft they can access, which workspaces are visible, and whether trusted-device workflows are required.
              </p>
              <p className="text-base text-slate-600 leading-relaxed mb-6 max-w-xl">
                Administrators provision the supported IndoFleet accounts for fleet managers, dispatchers, support staff, and customers. If your organization is new to IndoWings, contact support to begin onboarding.
              </p>
              <button 
                onClick={onOpenDemoBooking}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white border border-[#3b0080]/20 hover:border-[#3b0080]/50 text-[#171222] font-semibold text-sm shadow-xs transition-all active:scale-95"
              >
                <UserPlus className="w-4 h-4 text-[#3b0080]" />
                <span>Get account help</span>
              </button>
            </div>

            {/* Right Console Grid */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white/90 border border-[#3b0080]/15 shadow-[0_12px_36px_rgba(31,18,45,0.05)] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {beforeSignInPills.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-[#3b0080]/12 bg-[#faf7fd] text-[#111827] font-semibold text-sm hover:border-[#3b0080]/30 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#3b0080] shadow-2xs shrink-0">
                        <ItemIcon className="w-4 h-4" />
                      </span>
                      <span className="tracking-tight truncate">{item.title}</span>
                    </div>
                    {item.hasHelp && (
                      <span 
                        className="w-4 h-4 rounded-full bg-[#eee4ff] text-[#3b0080] text-[10px] font-bold inline-flex items-center justify-center cursor-help shrink-0 ml-1.5"
                        title={item.tooltip}
                      >
                        ?
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. GCS Workspace (Screenshot Grid) */}
      <section className="w-full py-16 sm:py-20 lg:py-24 bg-white border-t border-[#3b0080]/10">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase mb-3">
              GCS WORKSPACE
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-[#111827] tracking-tight leading-tight">
              Real operating surfaces for planning, connecting, and flying.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:grid-rows-2 gap-[18px] items-stretch">
            {/* Left Large Screenshot: Waypoint route planner */}
            <figure className="relative lg:row-span-2 aspect-[16/10] lg:aspect-auto h-full min-h-0 rounded-xl overflow-hidden shadow-[0_20px_54px_rgba(31,18,45,0.16)] border border-[#3b0080]/15 bg-[#12051e] group">
              <img 
                src="/images/indowings-route-planner.webp" 
                alt="IndoWings GCS route planner with waypoint controls and mission execution panel"
                className="w-full h-full object-cover block group-hover:scale-[1.025] transition-all duration-400"
              />
              <figcaption className="absolute bottom-3.5 left-3.5 px-3 py-1.5 rounded-md bg-[#0c0418]/80 backdrop-blur-md text-white text-xs font-bold tracking-wide border border-white/10 pointer-events-none">
                Waypoint route planner
              </figcaption>
            </figure>

            {/* Right Top Screenshot: Approved operator workspace */}
            <figure className="relative aspect-[16/10] h-full min-h-0 rounded-xl overflow-hidden shadow-[0_20px_54px_rgba(31,18,45,0.16)] border border-[#3b0080]/15 bg-[#12051e] group">
              <img 
                src="/images/operator-start-mission.webp" 
                alt="IndoWings operator start mission screen with flight metrics and mission launch action"
                className="w-full h-full object-cover block group-hover:scale-[1.025] transition-all duration-400"
              />
              <figcaption className="absolute bottom-3.5 left-3.5 px-3 py-1.5 rounded-md bg-[#0c0418]/80 backdrop-blur-md text-white text-xs font-bold tracking-wide border border-white/10 pointer-events-none">
                Approved operator workspace
              </figcaption>
            </figure>

            {/* Right Bottom Screenshot: Mission operation center */}
            <figure className="relative aspect-[16/10] h-full min-h-0 rounded-xl overflow-hidden shadow-[0_20px_54px_rgba(31,18,45,0.16)] border border-[#3b0080]/15 bg-white group">
              <img 
                src="/images/indowings-mission-operation-center.webp" 
                alt="IndoWings mission operation center with aircraft readiness and quick actions"
                className="w-full h-full object-cover block group-hover:scale-[1.025] transition-all duration-400"
              />
              <figcaption className="absolute bottom-3.5 left-3.5 px-3 py-1.5 rounded-md bg-[#0c0418]/80 backdrop-blur-md text-white text-xs font-bold tracking-wide border border-white/10 pointer-events-none">
                Mission operation center
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* 4. Product Detail Grid (8 Cards in 3 Columns / 2 Columns) */}
      <section className="w-full py-16 sm:py-20 lg:py-24 bg-[#fbf9fd] border-t border-[#3b0080]/10">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productDetailCards.map((card, idx) => {
              const IconComp = card.icon;
              return (
                <div 
                  key={idx}
                  className="p-7 rounded-2xl border border-[#3b0080]/15 bg-gradient-to-b from-white to-[#fcfaff] shadow-[0_4px_24px_rgba(31,18,45,0.04)] hover:shadow-[0_16px_36px_rgba(59,0,128,0.08)] hover:border-[#3b0080]/30 transition-all duration-300 flex flex-col justify-start"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#f2ecf8] text-[#3b0080] flex items-center justify-center mb-5">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-[#111827] mb-2.5 tracking-tight">
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Release Channel (Dark Feature Section) */}
      <section 
        className="w-full py-16 sm:py-20 lg:py-24 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #2b114d 0%, #240c42 100%)'
        }}
      >
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Left Copy */}
            <div>
              <p className="text-xs font-bold tracking-widest text-[#d8b4fe] uppercase mb-3">
                RELEASE CHANNEL
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-white tracking-tight leading-[1.12] mb-5">
                GCS downloads are versioned, documented, and checksum-ready.
              </h2>
              <p className="text-base sm:text-lg text-purple-100/80 leading-relaxed max-w-xl mb-7">
                The public website keeps latest release metadata, archived versions, release notes, known limitations, and documentation close to the product story.
              </p>
              <button 
                onClick={onOpenCommandCenter}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#3b0080] hover:bg-[#4c0099] text-white text-sm font-semibold shadow-md transition-all active:scale-95 border border-purple-400/30"
              >
                <Download className="w-4 h-4" />
                <span>Get GCS</span>
              </button>
            </div>

            {/* Right Console */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.04] border border-white/10 shadow-2xl grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {releaseChannelPills.map((pill, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-start min-h-[52px] px-5 py-3.5 rounded-xl border border-white/10 bg-white/[0.08] hover:bg-white/[0.14] hover:border-purple-300/30 text-white font-bold text-sm sm:text-[15px] transition-all cursor-default"
                >
                  <span className="tracking-tight">{pill}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
