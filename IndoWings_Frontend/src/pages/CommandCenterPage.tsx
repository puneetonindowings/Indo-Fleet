import React from 'react';
import { 
  RadioTower, 
  Workflow, 
  BookOpen, 
  MonitorUp, 
  Building2, 
  UsersRound, 
  ShieldCheck, 
  MonitorCheck, 
  Network, 
  ClipboardCheck, 
  Plane, 
  UserCheck 
} from 'lucide-react';

interface CommandCenterPageProps {
  onNavigate: (page: 'home' | 'platform' | 'command-center') => void;
  onOpenCommandCenter: () => void;
  onOpenDemoBooking: () => void;
}

const accountGovernancePills = [
  { title: 'Organizations', icon: Building2 },
  { title: 'Named users', icon: UserCheck },
  { title: 'Role scope', icon: ShieldCheck },
  { title: 'Trusted devices', icon: MonitorCheck },
  { title: 'Aircraft visibility', icon: Plane },
  { title: 'Audit records', icon: ClipboardCheck }
];

const productDetailCards = [
  {
    icon: Building2,
    title: 'Organization management',
    desc: 'Structure organizations, operational teams, aircraft scope, and administrative responsibility around accountable enterprise workflows.'
  },
  {
    icon: UsersRound,
    title: 'User and role management',
    desc: 'Manage user access through role-based permissions, organization assignment, and clearly scoped operational responsibilities.'
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    hasHelp: true,
    tooltip: 'RBAC means role-based access control. It keeps each role limited to approved tools, aircraft, and review records.',
    desc: 'Keep administrator, fleet manager, dispatcher, support, and customer workflows aligned to approved permission boundaries.'
  },
  {
    icon: MonitorCheck,
    title: 'Trusted devices',
    desc: 'Support protected operations by tying sensitive workflows to approved workstations and accountable sessions.'
  },
  {
    icon: Network,
    title: 'Fleet visibility',
    desc: 'Give command and control teams a clear operating picture of assigned aircraft, mission readiness, and organization activity.'
  },
  {
    icon: ClipboardCheck,
    title: 'Audit logs',
    desc: 'Preserve review-ready activity records for administrators and operational leadership.'
  }
];

const connectedOperationsPills = [
  'Organization scope',
  'User roles',
  'Trusted devices',
  'Fleet assignments',
  'Mission oversight',
  'Audit review'
];

export const CommandCenterPage: React.FC<CommandCenterPageProps> = ({
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
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-14 items-center">
            {/* Left Copy */}
            <div className="space-y-6">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/20 text-[#d8b4fe]">
                <RadioTower className="w-5 h-5 text-purple-300" />
              </span>
              <p className="text-xs font-bold tracking-widest text-[#d8b4fe] uppercase">
                INDOWINGS COMMAND CENTER
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-[50px] font-extrabold text-white tracking-tight leading-[1.08]">
                Enterprise control for UAV organizations.
              </h1>
              <p className="text-base sm:text-[17px] text-purple-100/85 leading-relaxed max-w-2xl">
                Command Center gives teams a central place to manage organizations, users, roles, trusted devices, fleet visibility, mission oversight, audit logs, and GCS synchronization.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <a 
                  href="/platform"
                  onClick={handleGoPlatform}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#3b0080] hover:bg-[#4c0099] text-white text-sm font-semibold shadow-md transition-all active:scale-95 border border-purple-400/30"
                >
                  <Workflow className="w-4 h-4" />
                  <span>How IndoWings works</span>
                </a>
                <button 
                  onClick={onOpenDemoBooking}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold shadow-md transition-all active:scale-95 border border-white/20"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>View documentation</span>
                </button>
                <button 
                  onClick={onOpenCommandCenter}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-white hover:bg-slate-100 text-[#171222] text-sm font-semibold shadow-md transition-all active:scale-95"
                >
                  <MonitorUp className="w-4 h-4 text-[#3b0080]" />
                  <span>Explore GCS</span>
                </button>
              </div>
            </div>

            {/* Right Visual Hero Shot */}
            <figure className="rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-[#12051e] group">
              <img 
                src="/images/command-overview.webp" 
                alt="IndoWings Command Center mission overview dashboard with flight summary and alerts"
                className="w-full h-auto object-cover block group-hover:scale-[1.01] transition-transform duration-300"
              />
            </figure>
          </div>
        </div>
      </section>

      {/* 2. Account Governance Section */}
      <section className="w-full py-16 sm:py-20 lg:py-24 bg-[#fbf9fd]">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Left Copy */}
            <div>
              <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase mb-3">
                ACCOUNT GOVERNANCE
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-[#111827] tracking-tight leading-tight mb-4">
                Command Center is where IndoWings accounts are created, approved, and scoped.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                IndoWings users should have named accounts tied to the correct organization, role, aircraft responsibility, and review permissions. This is why GCS access starts with Command Center instead of anonymous local use.
              </p>
            </div>

            {/* Right Console Grid */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white/90 border border-[#3b0080]/15 shadow-[0_12px_36px_rgba(31,18,45,0.05)] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {accountGovernancePills.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div 
                    key={idx}
                    className="flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border border-[#3b0080]/12 bg-[#faf7fd] text-[#111827] font-semibold text-sm hover:border-[#3b0080]/30 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#3b0080] shadow-2xs shrink-0">
                      <ItemIcon className="w-4 h-4" />
                    </span>
                    <span className="tracking-tight">{item.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Command Visibility Section */}
      <section className="w-full py-16 sm:py-20 lg:py-24 bg-white border-t border-[#3b0080]/10">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Left Copy */}
            <div>
              <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase mb-3">
                COMMAND VISIBILITY
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-[#111827] tracking-tight leading-tight mb-4">
                Command Center is the operational control layer around GCS.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                Public users can see how IndoWings presents aircraft readiness, telemetry state, mission actions, and system status without exposing private organization data.
              </p>
            </div>

            {/* Right Screenshot Frame */}
            <figure className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200/80 bg-[#12051e] group">
              <img 
                src="/images/mission-log-detail.webp" 
                alt="IndoWings Command Center mission detail with flight metrics, map playback, and safety events"
                className="w-full h-auto object-cover block group-hover:scale-[1.01] transition-transform duration-300"
              />
              <figcaption className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md text-white text-xs font-semibold tracking-wide border border-white/10">
                Mission detail and playback
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* 4. Command Center Views (Visual Story Grid) */}
      <section className="w-full py-16 sm:py-20 lg:py-24 bg-[#fbf9fd] border-t border-[#3b0080]/10">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase mb-3">
              COMMAND CENTER VIEWS
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold text-[#111827] tracking-tight leading-tight">
              Oversight teams can move from live readiness to historical evidence.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7">
            {/* 1. Operations readiness */}
            <figure className="relative rounded-2xl overflow-hidden shadow-md border border-slate-200/80 bg-white group hover:shadow-xl transition-all">
              <img 
                src="/images/mission-operation-center.webp" 
                alt="IndoWings mission operation center with assigned aircraft, readiness checks, weather, and quick actions"
                className="w-full h-auto object-cover block group-hover:scale-[1.02] transition-transform duration-300"
              />
              <figcaption className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md text-white text-xs font-semibold tracking-wide border border-white/10">
                Operations readiness
              </figcaption>
            </figure>

            {/* 2. Mission archive */}
            <figure className="relative rounded-2xl overflow-hidden shadow-md border border-slate-200/80 bg-white group hover:shadow-xl transition-all">
              <img 
                src="/images/mission-log-archive.webp" 
                alt="IndoWings mission log archive with filter controls and completed mission rows"
                className="w-full h-auto object-cover block group-hover:scale-[1.02] transition-transform duration-300"
              />
              <figcaption className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md text-white text-xs font-semibold tracking-wide border border-white/10">
                Mission archive
              </figcaption>
            </figure>

            {/* 3. Performance insights */}
            <figure className="relative rounded-2xl overflow-hidden shadow-md border border-slate-200/80 bg-white group hover:shadow-xl transition-all">
              <img 
                src="/images/command-performance-insights.webp" 
                alt="IndoWings performance dashboard with flight-hour chart and aircraft analytics"
                className="w-full h-auto object-cover block group-hover:scale-[1.02] transition-transform duration-300"
              />
              <figcaption className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md text-white text-xs font-semibold tracking-wide border border-white/10">
                Performance insights
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* 5. Product Detail Grid (6 Cards) */}
      <section className="w-full py-16 sm:py-20 lg:py-24 bg-white border-t border-[#3b0080]/10">
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
                  <div className="flex items-center gap-2 mb-2.5">
                    <h3 className="text-xl font-bold text-[#111827] tracking-tight">
                      {card.title}
                    </h3>
                    {card.hasHelp && (
                      <span 
                        className="w-4 h-4 rounded-full bg-[#eee4ff] text-[#3b0080] text-[10px] font-bold inline-flex items-center justify-center cursor-help"
                        title={card.tooltip}
                      >
                        ?
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Connected Operations (Dark Feature Section matching exact screenshot) */}
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
                CONNECTED OPERATIONS
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-white tracking-tight leading-[1.12] mb-5">
                Command Center keeps GCS workstations aligned with enterprise policy.
              </h2>
              <p className="text-base sm:text-lg text-purple-100/80 leading-relaxed max-w-xl">
                GCS synchronizes mission, access, device, and operational state with Command Center so field workstations can remain aligned with organization-level control.
              </p>
            </div>

            {/* Right Console matching media_1789756153609.png */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.04] border border-white/10 shadow-2xl grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {connectedOperationsPills.map((pill, idx) => (
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
