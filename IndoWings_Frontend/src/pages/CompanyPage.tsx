import React from 'react';
import { 
  Building2, 
  FileText, 
  ShieldCheck, 
  Users, 
  Network, 
  ExternalLink, 
  ArrowRight, 
  Globe,
  Award
} from 'lucide-react';

interface CompanyPageProps {
  onNavigate: (page: string) => void;
  onOpenDemoBooking?: () => void;
  onOpenCommandCenter?: () => void;
}

export const CompanyPage: React.FC<CompanyPageProps> = ({ 
  onNavigate,
  onOpenDemoBooking,
  onOpenCommandCenter 
}) => {
  const handleNav = (page: string, path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(page);
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-slate-200">
      {/* ── SECTION 1: HERO HEADER ─────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-[#191b30] px-4 pb-24 pt-28 text-white sm:px-6 sm:pb-28 sm:pt-36 lg:px-8">
        {/* Subtle background radial glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-white/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-[12%] h-96 w-96 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)', backgroundSize: '52px 52px', maskImage: 'linear-gradient(to bottom, black, transparent 88%)' }} />

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.15fr_.85fr] lg:gap-16">
          <div className="relative">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/[0.09] text-white shadow-xl shadow-black/10 ring-1 ring-white/10 backdrop-blur-md transition-transform duration-300 hover:-translate-y-1">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="h-px w-10 bg-white/35" />
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-300">
                Company
              </div>
            </div>

            <h1 className="mb-7 max-w-4xl text-5xl font-extrabold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              Company <span className="text-white/55">information.</span>
            </h1>

            <p className="max-w-3xl border-l-2 border-white/25 pl-5 text-base leading-8 text-slate-200/85 sm:text-lg sm:leading-8">
              IndoFleet (indowfleet.com) is the official public portal for Indo Wings Private Limited, India's leading aerospace manufacturer of DGCA type-certified UAVs, autonomous cargo transit systems, fleet ground control stations, and anti-drone security technologies.
            </p>
          </div>

          {/* Decorative company identity graphic */}
          <div className="relative mx-auto hidden aspect-square w-full max-w-[390px] items-center justify-center lg:flex">
            <div className="absolute inset-3 rounded-[3rem] border border-white/10 rotate-12" />
            <div className="absolute inset-8 rounded-[2.5rem] border border-white/15 -rotate-6" />
            <div className="absolute inset-14 rounded-[2rem] bg-white/[0.035] backdrop-blur-sm" />
            <div className="absolute left-2 top-1/4 h-2 w-2 rounded-full bg-white/70 shadow-[0_0_22px_rgba(255,255,255,.55)]" />
            <div className="absolute right-7 bottom-1/4 h-3 w-3 rounded-full border border-white/60" />
            <div className="absolute right-1 top-1/3 h-16 w-px bg-gradient-to-b from-transparent via-white/40 to-transparent" />
            <div className="relative flex h-36 w-36 items-center justify-center rounded-[2.25rem] border border-white/20 bg-white/[0.09] shadow-2xl shadow-black/20 ring-1 ring-white/10 backdrop-blur-xl">
              <div className="absolute inset-3 rounded-[1.6rem] border border-white/10" />
              <Building2 className="h-14 w-14 text-white" strokeWidth={1.2} />
            </div>
            <div className="absolute bottom-8 left-1 rounded-2xl border border-white/15 bg-[#191b30]/80 px-4 py-3 shadow-xl backdrop-blur-md">
              <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/50">Public identity</div>
              <div className="mt-1 text-sm font-semibold tracking-tight text-white">IndoFleet</div>
            </div>
            <div className="absolute right-0 top-8 rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/70">Est. 2020</div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: PUBLIC IDENTITY ─────────────────────────────────────── */}
      <section className="border-b border-slate-200/80 bg-[#f8fafc] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-14">
            
            {/* Left Column: Public Identity Narrative */}
            <div className="lg:col-span-7 lg:pt-3">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500 shadow-sm before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#191b30]">
                Public Identity
              </div>
              <h2 className="mb-5 max-w-2xl text-3xl font-extrabold leading-[1.12] tracking-[-0.035em] text-[#0f172a] sm:text-4xl lg:text-[2.7rem]">
                Clear IndoFleet facts without inventing private registration data.
              </h2>
              <p className="mb-8 max-w-2xl text-[15px] leading-7 text-slate-600">
                This page explains the public IndoFleet identity, corporate ownership, leadership attribution, manufacturing footprint, jurisdiction, DGCA certification status, and customer-reference policy. Fields that are not configured are intentionally shown as not yet published.
              </p>

              <ul className="space-y-3 text-sm leading-6 text-slate-700 sm:text-[15px]">
                <li className="group flex items-start gap-3.5 rounded-xl border border-transparent px-3 py-3 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm">
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#191b30] ring-4 ring-slate-200/70 transition-all group-hover:ring-slate-300" />
                  <span>IndoFleet designs and manufactures DGCA type-certified UAV platforms and Ground Control Station software for enterprise and logistics operations.</span>
                </li>
                <li className="group flex items-start gap-3.5 rounded-xl border border-transparent px-3 py-3 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm">
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#191b30] ring-4 ring-slate-200/70 transition-all group-hover:ring-slate-300" />
                  <span>Command Center governs organizations, users, roles, trusted ground devices, automated flight releases, and audit records.</span>
                </li>
                <li className="group flex items-start gap-3.5 rounded-xl border border-transparent px-3 py-3 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm">
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#191b30] ring-4 ring-slate-200/70 transition-all group-hover:ring-slate-300" />
                  <span>IndoFleet GCS supports approved operations personnel with aircraft connection, mission planning, encrypted telemetry, payload readiness, and synchronization.</span>
                </li>
                <li className="group flex items-start gap-3.5 rounded-xl border border-transparent px-3 py-3 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm">
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#191b30] ring-4 ring-slate-200/70 transition-all group-hover:ring-slate-300" />
                  <span>IndoFleet is owned by Indo Wings Private Limited and maintained as the indowfleet.com public platform.</span>
                </li>
                <li className="group flex items-start gap-3.5 rounded-xl border border-transparent px-3 py-3 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm">
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#191b30] ring-4 ring-slate-200/70 transition-all group-hover:ring-slate-300" />
                  <span>The company leadership is headed by Founder Paras Jain. Public corporate filings and profile links are provided for identity reference.</span>
                </li>
                <li className="group flex items-start gap-3.5 rounded-xl border border-transparent px-3 py-3 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm">
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#191b30] ring-4 ring-slate-200/70 transition-all group-hover:ring-slate-300" />
                  <span>Named government clients, defense deployments, partners, and case studies are published only when approved for public use under bilateral agreements.</span>
                </li>
              </ul>
            </div>

            {/* Right Column: Official Details Card */}
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-38px_rgba(25,27,48,0.38)] ring-1 ring-white sm:p-7">
                <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-5 text-lg font-bold tracking-tight text-[#0f172a]">
                  <FileText className="w-5 h-5 text-slate-700" />
                  <span>Official details</span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Brand */}
                  <div className="group min-w-0 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-[#f8fafc] to-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_-18px_rgba(25,27,48,0.35)]">
                    <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Brand
                    </div>
                    <div className="break-words text-sm font-bold leading-5 text-[#0f172a]">
                      IndoFleet
                    </div>
                  </div>

                  {/* Official Website */}
                  <div className="group min-w-0 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-[#f8fafc] to-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_-18px_rgba(25,27,48,0.35)]">
                    <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Official Website
                    </div>
                    <a 
                      href="https://indowfleet.com" 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-1 break-all text-sm font-bold text-[#191b30] transition-colors hover:underline"
                    >
                      <span>indowfleet.com</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Owner */}
                  <div className="group min-w-0 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-[#f8fafc] to-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_-18px_rgba(25,27,48,0.35)]">
                    <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Owner
                    </div>
                    <a 
                      href="https://indowfleet.com/company/about.php" 
                      target="_blank" 
                      rel="noreferrer"
                      className="break-words text-sm font-bold leading-5 text-[#191b30] transition-colors hover:underline"
                    >
                      Indo Wings Private Limited
                    </a>
                  </div>

                  {/* Founder / Developer */}
                  <div className="group min-w-0 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-[#f8fafc] to-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_-18px_rgba(25,27,48,0.35)]">
                    <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Founder & CEO
                    </div>
                    <a 
                      href="https://indowfleet.com/company/about.php" 
                      target="_blank" 
                      rel="noreferrer"
                      className="break-words text-sm font-bold leading-5 text-[#191b30] transition-colors hover:underline"
                    >
                      Paras Jain
                    </a>
                  </div>

                  {/* Legal Name */}
                  <div className="group min-w-0 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-[#f8fafc] to-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_-18px_rgba(25,27,48,0.35)]">
                    <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Legal Name
                    </div>
                    <div className="break-words text-sm font-bold leading-5 text-[#0f172a]">
                      Indo Wings Private Limited
                    </div>
                  </div>

                  {/* Registration Number */}
                  <div className="group min-w-0 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-[#f8fafc] to-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_-18px_rgba(25,27,48,0.35)]">
                    <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Registration Number
                    </div>
                    <div className="break-words text-sm font-bold leading-5 text-[#0f172a]">
                      U35999UP2020PTC126589
                    </div>
                  </div>

                  {/* Jurisdiction (Full Width) */}
                  <div className="group min-w-0 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-[#f8fafc] to-white p-4 transition-all duration-200 hover:border-slate-300 hover:shadow-[0_12px_24px_-18px_rgba(25,27,48,0.35)] sm:col-span-2">
                    <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Jurisdiction
                    </div>
                    <div className="break-words text-sm font-bold leading-5 text-[#0f172a]">
                      India (DGCA & Ministry of Civil Aviation - MoCA)
                    </div>
                  </div>

                  {/* Company Address (Full Width) */}
                  <div className="group min-w-0 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-[#f8fafc] to-white p-4 transition-all duration-200 hover:border-slate-300 hover:shadow-[0_12px_24px_-18px_rgba(25,27,48,0.35)] sm:col-span-2">
                    <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Company Address
                    </div>
                    <div className="break-words text-sm font-semibold leading-relaxed text-[#0f172a]">
                      Plot No. 11, Sector 62, Noida, Gautam Buddha Nagar, Uttar Pradesh - 201309, India
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 3: OWNERSHIP AND DEVELOPMENT ───────────────────────────── */}
      <section className="relative overflow-hidden bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500 shadow-sm before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#191b30]">
            Ownership and Development
          </div>
          <h2 className="mb-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-[-0.035em] text-[#0f172a] sm:text-4xl lg:text-[2.7rem]">
            indowfleet.com remains the public IndoFleet brand.
          </h2>
          <p className="mb-10 max-w-3xl text-[15px] leading-7 text-slate-600 sm:mb-12">
            Owner and manufacturing details are provided for accountability. The public product brand, autonomous transit network, GCS workstation downloads, documentation, and operational support routes remain under indowfleet.com.
          </p>

          {/* 3-Column Card Layout */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
            
            {/* Card 1: Public Site */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-[#f8fafc]/70 p-6 shadow-[0_12px_35px_-28px_rgba(25,27,48,0.42)] transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-[0_28px_55px_-30px_rgba(25,27,48,0.32)] sm:p-7">
              <div>
                <div className="mb-6 flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition-transform duration-300 group-hover:scale-105">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-600">
                    Public site
                  </span>
                </div>

                <h3 className="mb-3 text-xl font-extrabold leading-snug tracking-[-0.025em] text-[#0f172a]">
                  indowfleet.com
                </h3>
                <p className="mb-7 text-sm leading-7 text-slate-600">
                  The website introduces IndoFleet UAV platforms, autonomous fleet ecosystem, publishes GCS workstation releases, links documentation, and routes live expert support, orders, security, and feedback inquiries.
                </p>
              </div>

              <div>
                <a 
                  href="/" 
                  onClick={handleNav('home', '/')}
                  className="group/link inline-flex items-center gap-2 border-b border-slate-200 pb-1.5 text-sm font-bold text-[#191b30] transition-all duration-200 hover:border-[#191b30] hover:text-slate-800"
                >
                  <span>Visit IndoFleet home</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-1" />
                </a>
              </div>
            </div>

            {/* Card 2: Owner */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-[#f8fafc]/70 p-6 shadow-[0_12px_35px_-28px_rgba(25,27,48,0.42)] transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-[0_28px_55px_-30px_rgba(25,27,48,0.32)] sm:p-7">
              <div>
                <div className="mb-6 flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition-transform duration-300 group-hover:scale-105">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-600">
                    Owner
                  </span>
                </div>

                <h3 className="mb-3 text-xl font-extrabold leading-snug tracking-[-0.025em] text-[#0f172a]">
                  Indo Wings Private Limited
                </h3>
                <p className="mb-7 text-sm leading-7 text-slate-600">
                  Indo Wings Private Limited is listed as the owner of IndoFleet. Public company information, manufacturing facility certifications, and corporate filings can be reviewed through the owner website.
                </p>
              </div>

              <div>
                <a 
                  href="https://indowfleet.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="group/link inline-flex items-center gap-2 border-b border-slate-200 pb-1.5 text-sm font-bold text-[#191b30] transition-all duration-200 hover:border-[#191b30] hover:text-slate-800"
                >
                  <span>Open owner website</span>
                  <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                </a>
              </div>
            </div>

            {/* Card 3: Leadership & Developer */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-[#f8fafc]/70 p-6 shadow-[0_12px_35px_-28px_rgba(25,27,48,0.42)] transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-[0_28px_55px_-30px_rgba(25,27,48,0.32)] sm:p-7">
              <div>
                <div className="mb-6 flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition-transform duration-300 group-hover:scale-105">
                    <Award className="w-4 h-4" />
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-600">
                    Founder
                  </span>
                </div>

                <h3 className="mb-3 text-xl font-extrabold leading-snug tracking-[-0.025em] text-[#0f172a]">
                  Paras Jain
                </h3>
                <p className="mb-7 text-sm leading-7 text-slate-600">
                  Paras Jain is listed as the founder and managing leadership contact for IndoFleet. The public profile link and corporate about pages are included for corporate identity reference only.
                </p>
              </div>

              <div>
                <a 
                  href="https://indowfleet.com/company/about.php" 
                  target="_blank" 
                  rel="noreferrer"
                  className="group/link inline-flex items-center gap-2 border-b border-slate-200 pb-1.5 text-sm font-bold text-[#191b30] transition-all duration-200 hover:border-[#191b30] hover:text-slate-800"
                >
                  <span>View leadership profile</span>
                  <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 4: REFERENCES & TRUST ──────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-slate-200/80 bg-[#f8fafc] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500 shadow-sm before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#191b30]">
            References
          </div>
          <h2 className="mb-10 text-3xl font-extrabold leading-tight tracking-[-0.035em] text-[#0f172a] sm:mb-12 sm:text-4xl lg:text-[2.7rem]">
            Customer and partner information
          </h2>

          {/* 3-Column Card Layout */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
            
            {/* Reference Card 1: Customers */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-[#f8fafc]/70 p-6 shadow-[0_12px_35px_-28px_rgba(25,27,48,0.42)] transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-[0_28px_55px_-30px_rgba(25,27,48,0.32)] sm:p-7">
              <div>
                <div className="mb-6 flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition-transform duration-300 group-hover:scale-105">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-600">
                    Customers
                  </span>
                </div>

                <h3 className="mb-3 text-xl font-extrabold leading-snug tracking-[-0.025em] text-[#0f172a]">
                  No unapproved customer claims
                </h3>
                <p className="mb-7 text-sm leading-7 text-slate-600">
                  Customer logos, flight telemetry, named enterprise references, and defense case studies are not published unless the customer has approved public use under bilateral security agreements.
                </p>
              </div>

              <div>
                <a 
                  href="/support?tab=expert" 
                  onClick={handleNav('support', '/support?tab=expert')}
                  className="group/link inline-flex items-center gap-2 border-b border-slate-200 pb-1.5 text-sm font-bold text-[#191b30] transition-all duration-200 hover:border-[#191b30] hover:text-slate-800"
                >
                  <span>Request reference information</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-1" />
                </a>
              </div>
            </div>

            {/* Reference Card 2: Partners */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-[#f8fafc]/70 p-6 shadow-[0_12px_35px_-28px_rgba(25,27,48,0.42)] transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-[0_28px_55px_-30px_rgba(25,27,48,0.32)] sm:p-7">
              <div>
                <div className="mb-6 flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition-transform duration-300 group-hover:scale-105">
                    <Network className="w-4 h-4" />
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-600">
                    Partners
                  </span>
                </div>

                <h3 className="mb-3 text-xl font-extrabold leading-snug tracking-[-0.025em] text-[#0f172a]">
                  Partner information by approval
                </h3>
                <p className="mb-7 text-sm leading-7 text-slate-600">
                  Partner names, payload sensor integrations, and avionics supply chain details should be verified and approved before they appear on the public site.
                </p>
              </div>

              <div>
                <a 
                  href="/support?tab=expert" 
                  onClick={handleNav('support', '/support?tab=expert')}
                  className="group/link inline-flex items-center gap-2 border-b border-slate-200 pb-1.5 text-sm font-bold text-[#191b30] transition-all duration-200 hover:border-[#191b30] hover:text-slate-800"
                >
                  <span>Contact IndoFleet</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-1" />
                </a>
              </div>
            </div>

            {/* Reference Card 3: Trust */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white to-[#f8fafc]/70 p-6 shadow-[0_12px_35px_-28px_rgba(25,27,48,0.42)] transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-[0_28px_55px_-30px_rgba(25,27,48,0.32)] sm:p-7">
              <div>
                <div className="mb-6 flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition-transform duration-300 group-hover:scale-105">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-600">
                    Trust
                  </span>
                </div>

                <h3 className="mb-3 text-xl font-extrabold leading-snug tracking-[-0.025em] text-[#0f172a]">
                  Operational transparency
                </h3>
                <p className="mb-7 text-sm leading-7 text-slate-600">
                  Public pages explain privacy, terms, security disclosure, DGCA civil aviation standards, customer support, downloads, and verified release history.
                </p>
              </div>

              <div>
                <a 
                  href="/docs" 
                  onClick={handleNav('docs', '/docs')}
                  className="group/link inline-flex items-center gap-2 border-b border-slate-200 pb-1.5 text-sm font-bold text-[#191b30] transition-all duration-200 hover:border-[#191b30] hover:text-slate-800"
                >
                  <span>View documentation & safety</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-1" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
