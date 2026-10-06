import React from 'react';
import { 
  Workflow, 
  DownloadCloud, 
  Building2, 
  RadioTower, 
  MonitorUp, 
  Network, 
  UserPlus, 
  BookOpenCheck,
  Plane,
  Factory,
  ShieldCheck,
  ClipboardCheck,
  Headphones,
  ScrollText,
  KeyRound,
  MonitorCheck,
  Fingerprint,
  UserCheck,
  Lock,
  PlaneTakeoff,
  Route,
  ClipboardList,
  CloudCog,
  Download,
  PackageCheck,
  FileCode,
  FileText,
  AlertCircle,
  History,
  LifeBuoy
} from 'lucide-react';

interface PlatformPageProps {
  onOpenCommandCenter: () => void;
  onOpenDemoBooking: () => void;
}

const dataFlowCards = [
  {
    title: 'Identity',
    icon: UserCheck,
    desc: 'GCS uses the IndoWings account to identify the user and load approved organization scope.'
  },
  {
    title: 'Permission scope',
    icon: Lock,
    desc: 'Role and permission data determines which workspaces, aircraft, and workflows are visible.'
  },
  {
    title: 'Aircraft scope',
    icon: PlaneTakeoff,
    desc: 'Aircraft assignments and vehicle profiles keep users focused on approved assets.'
  },
  {
    title: 'Mission state',
    icon: Route,
    desc: 'Mission planning, readiness, and operational activity are aligned with organization oversight.'
  },
  {
    title: 'Review records',
    icon: ClipboardList,
    desc: 'Audit and review surfaces help authorized teams understand access, release, and operational history.'
  },
  {
    title: 'Support context',
    icon: CloudCog,
    desc: 'Support requests should include version, device status, account context, and workflow step without exposing secrets.'
  }
];

const releasePillItems = [
  { title: 'Latest installer', icon: PackageCheck },
  { title: 'SHA-256 checksum', icon: FileCode },
  { title: 'Release notes', icon: FileText },
  { title: 'Known limitations', icon: AlertCircle },
  { title: 'Version archive', icon: History },
  { title: 'Support and feedback', icon: LifeBuoy }
];

const platformFaqs = [
  {
    question: 'What is IndoWings?',
    answer: 'IndoWings is an enterprise UAV software ecosystem that connects organization-level command oversight with field mission execution, aircraft lifecycle workflows, release governance, and audit review.'
  },
  {
    question: 'Do I need an IndoWings account to use GCS?',
    answer: 'Yes. IndoWings GCS requires an active IndoWings Command Center account for identity, role permissions, organization scope, aircraft access, trusted-device workflows, and synchronization.'
  },
  {
    question: 'How do I get an IndoWings account?',
    answer: 'Administrators provision named accounts for fleet managers, dispatchers, support staff, and customers. New organizations should contact IndoWings support to begin onboarding.'
  },
  {
    question: 'What does IndoWings Command Center do?',
    answer: 'Command Center manages organizations, users, roles, trusted devices, fleet visibility, mission oversight, release records, and audit activity. It is the source of truth for access and operational governance.'
  },
  {
    question: 'What does IndoWings GCS do?',
    answer: 'IndoWings GCS is the Windows field application for aircraft connection, mission planning, telemetry monitoring, readiness workflows, vehicle configuration, manufacturer workflows, and Command Center sync.'
  },
  {
    question: 'Can users share one IndoWings account?',
    answer: 'No. IndoWings is designed around named accounts so access decisions, approvals, operational actions, and audit records stay accountable.'
  }
];

const workflowSteps = [
  {
    step: '01',
    title: 'Organization onboarding',
    desc: 'An organization is created or approved for IndoWings use, then administrative ownership is assigned.'
  },
  {
    step: '02',
    title: 'User and role setup',
    desc: 'Administrators create named customer and staff accounts, then assign one of the five supported platform roles.'
  },
  {
    step: '03',
    title: 'Trusted workstation review',
    desc: 'Where required, devices are approved before protected workflows are available.'
  },
  {
    step: '04',
    title: 'GCS download and install',
    desc: 'Users download the current Windows MSI installer, review the checksum, and install GCS on an approved workstation.'
  },
  {
    step: '05',
    title: 'Command Center login',
    desc: 'GCS signs in with the user account and synchronizes role scope, aircraft assignments, and organization policy.'
  },
  {
    step: '06',
    title: 'Mission and aircraft workflows',
    desc: 'Approved users plan missions, connect aircraft, monitor telemetry, manage vehicle workflows, or review evidence based on their role.'
  },
  {
    step: '07',
    title: 'Review and audit',
    desc: 'Operational records, access activity, releases, and mission evidence remain available to authorized administrators.'
  }
];

const roleModelCards = [
  {
    icon: Plane,
    title: 'Dispatchers',
    desc: 'Coordinate customer bookings, shipments, delivery milestones, and operational status updates.'
  },
  {
    icon: Network,
    title: 'Fleet managers',
    desc: 'Register drone inventory, coordinate quality checks, and maintain fleet availability.'
  },
  {
    icon: Factory,
    title: 'Support staff',
    desc: 'Assist customers with account access, booking questions, order status, and delivery issues.'
  },
  {
    icon: ShieldCheck,
    title: 'Administrators',
    desc: 'Provision customers and staff, manage inventory, oversee bookings, and govern platform access.'
  },
  {
    icon: PackageCheck,
    title: 'Customers',
    desc: 'Browse available drone inventory, place booking requests, save delivery addresses, and track order history.'
  },
];

export const PlatformPage: React.FC<PlatformPageProps> = ({ 
  onOpenCommandCenter, 
  onOpenDemoBooking 
}) => {
  return (
    <div className="w-full bg-[#fbf9fd] text-[#171222]">
      {/* 1. Page Hero: Full Viewport Hero ("screen tak rakho pura") */}
      <section 
        className="w-full min-h-screen flex items-center pt-28 sm:pt-36 pb-16 sm:pb-20 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #2b114d 0%, #240c42 100%)'
        }}
      >
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(400px,1.15fr)] gap-10 lg:gap-14 items-center">
            {/* Left Copy */}
            <div className="space-y-6">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/20 text-[#d8b4fe]">
                <Workflow className="w-5 h-5 text-purple-300" />
              </span>
              <p className="text-xs font-bold tracking-widest text-[#d8b4fe] uppercase">
                HOW INDOWINGS WORKS
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-[50px] font-extrabold text-white tracking-tight leading-[1.08]">
                A complete UAV operations ecosystem.
              </h1>
              <p className="text-base sm:text-[17px] text-purple-100/85 leading-relaxed max-w-2xl">
                IndoWings connects organization-level command oversight, field ground control, aircraft lifecycle workflows, release governance, documentation, support, and audit review into one enterprise operating model.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button 
                  onClick={onOpenCommandCenter}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#3b0080] hover:bg-[#4c0099] text-white text-sm font-semibold shadow-md transition-all active:scale-95 border border-purple-400/30"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>Get GCS</span>
                </button>
                <button 
                  onClick={onOpenDemoBooking}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-white hover:bg-slate-100 text-[#171222] text-sm font-semibold shadow-md transition-all active:scale-95"
                >
                  <Building2 className="w-4 h-4 text-[#3b0080]" />
                  <span>Request onboarding</span>
                </button>
              </div>

              {/* Helper Note */}
              <p className="text-xs text-purple-200/60 pt-1 leading-relaxed max-w-lg">
                The download center explains versions, account access, requirements, checksums, and release notes before installation.
              </p>
            </div>

            {/* Right Visual Hero Shot */}
            <figure className="rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-[#12051e] group">
              <img 
                src="/images/indowings-route-planner.webp" 
                alt="IndoWings GCS waypoint route planning interface showing mission parameters and execution controls"
                className="w-full h-auto object-cover block group-hover:scale-[1.01] transition-transform duration-300"
              />
            </figure>
          </div>
        </div>
      </section>

      {/* 2. Platform Architecture: 3 Connected Layers */}
      <section className="py-20 lg:py-24 bg-[#fbf9fd] text-[#171222]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          {/* Section Heading */}
          <div className="mb-12 text-left max-w-3xl">
            <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase mb-3">
              PLATFORM ARCHITECTURE
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#111827] tracking-tight leading-tight">
              Three connected layers keep operations controlled from policy to aircraft.
            </h2>
          </div>

          {/* 3 Architecture Layer Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 items-stretch">
            {/* Layer 01: Command Center */}
            <article 
              className="rounded-2xl border border-[#3b0080]/15 bg-white shadow-sm p-6 sm:p-7 flex flex-col justify-between"
              style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.94)), radial-gradient(circle at 0 0, rgba(220, 196, 255, 0.35), transparent 18rem)'
              }}
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-[#f2ecf8] flex items-center justify-center">
                  <RadioTower className="w-5 h-5 text-[#3b0080]" />
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-[#eee4ff] text-[#3b0080]">
                  Layer 01
                </span>
                <h3 className="text-xl font-bold text-[#111827] tracking-tight">
                  IndoWings Command Center
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The command, administration, and governance layer for organizations. Command Center manages users, roles, trusted devices, aircraft scope, fleet visibility, mission oversight, release records, and audit activity.
                </p>
              </div>

              <ul className="space-y-2.5 text-sm text-slate-600 pt-6 mt-6 border-t border-[#3b0080]/10 list-disc list-inside">
                <li>Organization and team management</li>
                <li>Named user accounts and role-based access</li>
                <li>Trusted-device approval workflows</li>
                <li>Fleet visibility, review records, and audit trails</li>
              </ul>
            </article>

            {/* Layer 02: Ground Control Station */}
            <article 
              className="rounded-2xl border border-[#3b0080]/15 bg-white shadow-sm p-6 sm:p-7 flex flex-col justify-between"
              style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.94)), radial-gradient(circle at 0 0, rgba(220, 196, 255, 0.35), transparent 18rem)'
              }}
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-[#f2ecf8] flex items-center justify-center">
                  <MonitorUp className="w-5 h-5 text-[#3b0080]" />
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-[#eee4ff] text-[#3b0080]">
                  Layer 02
                </span>
                <h3 className="text-xl font-bold text-[#111827] tracking-tight">
                  IndoWings Ground Control Station
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The Windows field application used by approved operators. GCS supports aircraft connection, mission planning, telemetry monitoring, preflight readiness, vehicle configuration, manufacturer workflows, and Command Center synchronization.
                </p>
              </div>

              <ul className="space-y-2.5 text-sm text-slate-600 pt-6 mt-6 border-t border-[#3b0080]/10 list-disc list-inside">
                <li>Aircraft connection and mission execution surfaces</li>
                <li>Mission planning, operations workspace, and telemetry review</li>
                <li>Vehicle profiles and manufacturer tools</li>
                <li>Access, mission, and operational sync with Command Center</li>
              </ul>
            </article>

            {/* Layer 03: Aircraft and Fleet */}
            <article 
              className="rounded-2xl border border-[#3b0080]/15 bg-white shadow-sm p-6 sm:p-7 flex flex-col justify-between"
              style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.94)), radial-gradient(circle at 0 0, rgba(220, 196, 255, 0.35), transparent 18rem)'
              }}
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-[#f2ecf8] flex items-center justify-center">
                  <Network className="w-5 h-5 text-[#3b0080]" />
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-[#eee4ff] text-[#3b0080]">
                  Layer 03
                </span>
                <h3 className="text-xl font-bold text-[#111827] tracking-tight">
                  Aircraft and fleet layer
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The operational asset layer covering UAV assignments, vehicle profiles, manufacturer lifecycle workflows, fleet readiness, firmware-related readiness workflows, and field operations under approved organization scope.
                </p>
              </div>

              <ul className="space-y-2.5 text-sm text-slate-600 pt-6 mt-6 border-t border-[#3b0080]/10 list-disc list-inside">
                <li>Aircraft assignment and lifecycle visibility</li>
                <li>Manufacturer profile and readiness workflows</li>
                <li>Fleet status for dispatch and operations teams</li>
                <li>Versioned release review before production rollout</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* 3. Account Access: Split Layout */}
      <section className="py-20 lg:py-24 bg-white border-y border-[#3b0080]/10 text-[#171222]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1fr)] gap-10 lg:gap-14 items-center">
            {/* Left Copy */}
            <div className="space-y-6">
              <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase">
                ACCOUNT ACCESS
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-[#111827] tracking-tight leading-[1.15]">
                IndoWings GCS requires an IndoWings Command Center account.
              </h2>
              <div className="space-y-4 text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                <p>
                  A user cannot properly use IndoWings GCS without an approved IndoWings account because GCS depends on Command Center for identity, role permissions, organization scope, aircraft assignments, trusted-device workflows, and synchronization.
                </p>
                <p>
                  Accounts are created or approved by an organization administrator. New organizations should contact IndoWings support to request onboarding. Shared accounts are not supported because operational actions must remain accountable to named users.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button 
                  onClick={onOpenCommandCenter}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#3b0080] hover:bg-[#260052] text-white text-sm font-semibold shadow-md transition-all active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Request account help</span>
                </button>
                <a 
                  href="#docs"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[#111827] text-sm font-semibold shadow-sm transition-all"
                >
                  <BookOpenCheck className="w-4 h-4 text-[#3b0080]" />
                  <span>Read access guidance</span>
                </a>
              </div>
            </div>

            {/* Right Visual: Operator Start Mission Card */}
            <figure className="rounded-xl overflow-hidden shadow-2xl border border-[#3b0080]/15 bg-[#12051e] group">
              <img 
                src="/images/operator-start-mission.webp" 
                alt="IndoWings approved operator start mission view with profile metrics and mission launch action"
                className="w-full h-auto object-cover block group-hover:scale-[1.02] transition-transform duration-300"
              />
            </figure>
          </div>
        </div>
      </section>

      {/* 4. Visual Operating Story: 3 Screenshots */}
      <section className="py-20 lg:py-24 bg-[#fbf9fd] text-[#171222]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          {/* Section Heading */}
          <div className="mb-12 text-left max-w-3xl">
            <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase mb-3">
              VISUAL OPERATING STORY
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#111827] tracking-tight leading-tight">
              Each product surface explains a part of the IndoWings workflow.
            </h2>
          </div>

          {/* 3 Screenshot Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7">
            {/* Card 1: Mission operation center */}
            <figure className="relative rounded-xl overflow-hidden shadow-lg border border-[#3b0080]/15 bg-[#12051e] group aspect-[16/10]">
              <img 
                src="/images/mission-operation-center.webp" 
                alt="IndoWings mission operation center showing readiness, aircraft assignment, quick actions, and weather status"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <figcaption className="absolute bottom-3 left-3 px-3 py-1.5 rounded-md bg-[#0c0418]/85 text-white text-xs font-bold backdrop-blur-md border border-white/10">
                Mission operation center
              </figcaption>
            </figure>

            {/* Card 2: Mission review and evidence */}
            <figure className="relative rounded-xl overflow-hidden shadow-lg border border-[#3b0080]/15 bg-[#12051e] group aspect-[16/10]">
              <img 
                src="/images/mission-log-detail.webp" 
                alt="IndoWings Command Center mission detail view with flight metrics and playback review"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <figcaption className="absolute bottom-3 left-3 px-3 py-1.5 rounded-md bg-[#0c0418]/85 text-white text-xs font-bold backdrop-blur-md border border-white/10">
                Mission review and evidence
              </figcaption>
            </figure>

            {/* Card 3: Performance and analytics */}
            <figure className="relative rounded-xl overflow-hidden shadow-lg border border-[#3b0080]/15 bg-[#12051e] group aspect-[16/10]">
              <img 
                src="/images/command-performance-insights.webp" 
                alt="IndoWings Command Center performance insights dashboard with mission success and flight-hour analytics"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <figcaption className="absolute bottom-3 left-3 px-3 py-1.5 rounded-md bg-[#0c0418]/85 text-white text-xs font-bold backdrop-blur-md border border-white/10">
                Performance and analytics
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* 5. Operating Workflow: Clean Balanced Grid (Fixes scattered cards) */}
      <section className="py-20 lg:py-24 bg-white border-y border-[#3b0080]/10 text-[#171222]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="mb-12 text-left max-w-3xl">
            <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase mb-3">
              OPERATING WORKFLOW
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#111827] tracking-tight leading-tight">
              From onboarding to mission review.
            </h2>
          </div>

          {/* Row 1: Steps 01 to 04 (4 Balanced Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-4 sm:mb-5">
            {workflowSteps.slice(0, 4).map((step) => (
              <div 
                key={step.step}
                className="p-6 rounded-xl border border-[#3b0080]/15 bg-white shadow-sm flex flex-col justify-start space-y-3 min-h-[220px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.92)), radial-gradient(circle at 0 0, rgba(220, 196, 255, 0.3), transparent 16rem)'
                }}
              >
                <span className="w-fit px-3 py-1 rounded-full text-xs font-black bg-[#eee4ff] text-[#3b0080]">
                  {step.step}
                </span>
                <strong className="block text-base font-bold text-[#111827] leading-snug">
                  {step.title}
                </strong>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Row 2: Steps 05 to 07 (3 Balanced Columns across full container width) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {workflowSteps.slice(4).map((step) => (
              <div 
                key={step.step}
                className="p-6 rounded-xl border border-[#3b0080]/15 bg-white shadow-sm flex flex-col justify-start space-y-3 min-h-[220px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.92)), radial-gradient(circle at 0 0, rgba(220, 196, 255, 0.3), transparent 16rem)'
                }}
              >
                <span className="w-fit px-3 py-1 rounded-full text-xs font-black bg-[#eee4ff] text-[#3b0080]">
                  {step.step}
                </span>
                <strong className="block text-base font-bold text-[#111827] leading-snug">
                  {step.title}
                </strong>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Role Model: 6 Cards in 3x2 Grid */}
      <section className="py-20 lg:py-24 bg-[#fbf9fd] text-[#171222]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="mb-12 text-left max-w-3xl">
            <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase mb-3">
              ROLE MODEL
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#111827] tracking-tight leading-tight">
              Each user sees the workflows that match their responsibility.
            </h2>
          </div>

          {/* 3x2 Grid of 6 Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {roleModelCards.map((card) => {
              const IconComp = card.icon;
              return (
                <div 
                  key={card.title}
                  className="p-6 sm:p-7 rounded-2xl border border-[#3b0080]/15 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-start min-h-[210px]"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#f2ecf8] flex items-center justify-center mb-4">
                    <IconComp className="w-5 h-5 text-[#3b0080]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#111827] mb-2 tracking-tight">
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

      {/* 7. Security and Governance: Split Layout */}
      <section className="py-20 lg:py-24 bg-white border-t border-[#3b0080]/10 text-[#171222]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-10 lg:gap-14 items-start">
            {/* Left Copy */}
            <div className="space-y-6">
              <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase">
                SECURITY AND GOVERNANCE
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-[#111827] tracking-tight leading-[1.18]">
                IndoWings is designed around accountability, not anonymous access.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                The public operating model emphasizes named users, least privilege, role-based access control, trusted-device review, release integrity, and audit-ready records. Public documentation avoids private endpoints, secrets, tokens, internal hostnames, customer data, and sensitive implementation details.
              </p>
              <div>
                <a 
                  href="#release-notes" 
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-[#111827] hover:bg-slate-50 hover:border-[#3b0080]/30 transition-all shadow-sm"
                >
                  <ScrollText className="w-4 h-4 text-[#3b0080]" />
                  <span>Review release notes</span>
                </a>
              </div>
            </div>

            {/* Right 2x2 Security Stack */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {/* Named accounts */}
              <div className="p-6 rounded-2xl border border-[#3b0080]/15 bg-white shadow-sm flex flex-col justify-start min-h-[200px]">
                <div className="w-10 h-10 rounded-lg bg-[#f2ecf8] flex items-center justify-center mb-4">
                  <KeyRound className="w-5 h-5 text-[#3b0080]" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] mb-2 tracking-tight">
                  Named accounts
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Every user should sign in with an individual IndoWings account so actions remain accountable.
                </p>
              </div>

              {/* Role-based access */}
              <div className="p-6 rounded-2xl border border-[#3b0080]/15 bg-white shadow-sm flex flex-col justify-start min-h-[200px]">
                <div className="w-10 h-10 rounded-lg bg-[#f2ecf8] flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5 text-[#3b0080]" />
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <h3 className="text-lg font-bold text-[#111827] tracking-tight">
                    Role-based access
                  </h3>
                  <span 
                    className="w-4 h-4 rounded-full bg-[#eee4ff] text-[#3b0080] text-[10px] font-bold inline-flex items-center justify-center cursor-help"
                    title="RBAC means role-based access control. It limits each user to the tools, records, and aircraft approved for their role."
                  >
                    ?
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Permissions align workflows to administrators, fleet managers, dispatchers, support staff, and customers.
                </p>
              </div>

              {/* Trusted devices */}
              <div className="p-6 rounded-2xl border border-[#3b0080]/15 bg-white shadow-sm flex flex-col justify-start min-h-[200px]">
                <div className="w-10 h-10 rounded-lg bg-[#f2ecf8] flex items-center justify-center mb-4">
                  <MonitorCheck className="w-5 h-5 text-[#3b0080]" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] mb-2 tracking-tight">
                  Trusted devices
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Protected operational workflows can be tied to approved workstations and accountable sessions.
                </p>
              </div>

              {/* Release integrity */}
              <div className="p-6 rounded-2xl border border-[#3b0080]/15 bg-white shadow-sm flex flex-col justify-start min-h-[200px]">
                <div className="w-10 h-10 rounded-lg bg-[#f2ecf8] flex items-center justify-center mb-4">
                  <Fingerprint className="w-5 h-5 text-[#3b0080]" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] mb-2 tracking-tight">
                  Release integrity
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Downloads include version metadata and checksums so installers can be reviewed before rollout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Data Flow Section: GCS and Command Center stay aligned */}
      <section className="w-full py-16 sm:py-20 lg:py-24 bg-white border-t border-[#3b0080]/10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase mb-3">
              DATA FLOW
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-extrabold text-[#111827] tracking-tight leading-tight">
              GCS and Command Center stay aligned through synchronization.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dataFlowCards.map((card, idx) => {
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

      {/* 9. Downloads and Releases Section: Traceable version history */}
      <section className="w-full py-16 sm:py-20 lg:py-24 bg-[#fbf9fd] border-t border-[#3b0080]/10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-center">
            {/* Left Copy */}
            <div>
              <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase mb-3">
                DOWNLOADS AND RELEASES
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-[#111827] tracking-tight leading-tight mb-4">
                Professional UAV software needs traceable version history.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed mb-8 max-w-xl">
                The IndoWings website publishes the latest GCS release, release date, file size, platform, checksum, release summary, known limitations, and archived versions. Organizations should review release notes and verify checksums before production rollout.
              </p>
              <button 
                onClick={onOpenCommandCenter}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#3b0080] hover:bg-[#4c0099] text-white text-sm font-semibold shadow-md transition-all active:scale-95 border border-purple-400/30"
              >
                <Download className="w-4 h-4" />
                <span>Get GCS</span>
              </button>
            </div>

            {/* Right Console Grid */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white/90 border border-[#3b0080]/15 shadow-[0_12px_36px_rgba(31,18,45,0.06)] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {releasePillItems.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div 
                    key={idx}
                    className="flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border border-[#3b0080]/12 bg-[#faf7fd] text-[#111827] font-semibold text-sm hover:border-[#3b0080]/30 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#3b0080] shadow-2xs shrink-0">
                      <ItemIcon className="w-4 h-4" />
                    </span>
                    <span className="tracking-tight truncate">{item.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 10. Platform FAQ Section: Questions before installing GCS */}
      <section className="w-full py-16 sm:py-24 bg-white border-t border-[#3b0080]/10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase mb-3">
              PLATFORM FAQ
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-extrabold text-[#111827] tracking-tight leading-tight">
              Answers to the questions users ask before installing IndoWings GCS.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {platformFaqs.map((faq, idx) => (
              <div 
                key={idx}
                className="p-7 rounded-2xl border border-[#3b0080]/15 bg-white shadow-sm hover:shadow-md hover:border-[#3b0080]/30 transition-all flex flex-col justify-start"
              >
                <h3 className="text-lg sm:text-[19px] font-bold text-[#111827] mb-3 leading-snug tracking-tight">
                  {faq.question}
                </h3>
                <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
