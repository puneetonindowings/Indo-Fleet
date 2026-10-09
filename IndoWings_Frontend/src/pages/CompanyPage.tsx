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
    <div className="min-h-screen bg-white">
      {/* ── SECTION 1: HERO HEADER ─────────────────────────────────────────── */}
      <section className="bg-[#191b30] text-white pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Subtle background radial glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Building Icon Badge */}
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center text-white mb-6 shadow-inner">
            <Building2 className="w-6 h-6" />
          </div>

          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 mb-3">
            Company
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Company information
          </h1>

          <p className="text-base sm:text-lg text-slate-200/90 max-w-3xl leading-relaxed">
            IndoFleet (indowfleet.com) is the official public portal for Indo Wings Private Limited, India's leading aerospace manufacturer of DGCA type-certified UAVs, autonomous cargo transit systems, fleet ground control stations, and anti-drone security technologies.
          </p>
        </div>
      </section>

      {/* ── SECTION 2: PUBLIC IDENTITY ─────────────────────────────────────── */}
      <section className="bg-[#f8fafc] border-b border-slate-200/80 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Column: Public Identity Narrative */}
            <div className="lg:col-span-7">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Public Identity
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] leading-tight mb-6">
                Clear IndoFleet facts without inventing private registration data.
              </h2>
              <p className="text-slate-600 text-base leading-relaxed mb-8">
                This page explains the public IndoFleet identity, corporate ownership, leadership attribution, manufacturing footprint, jurisdiction, DGCA certification status, and customer-reference policy. Fields that are not configured are intentionally shown as not yet published.
              </p>

              <ul className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#191b30] mt-2.5 shrink-0" />
                  <span>IndoFleet designs and manufactures DGCA type-certified UAV platforms and Ground Control Station software for enterprise and logistics operations.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#191b30] mt-2.5 shrink-0" />
                  <span>Command Center governs organizations, users, roles, trusted ground devices, automated flight releases, and audit records.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#191b30] mt-2.5 shrink-0" />
                  <span>IndoFleet GCS supports approved operations personnel with aircraft connection, mission planning, encrypted telemetry, payload readiness, and synchronization.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#191b30] mt-2.5 shrink-0" />
                  <span>IndoFleet is owned by Indo Wings Private Limited and maintained as the indowfleet.com public platform.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#191b30] mt-2.5 shrink-0" />
                  <span>The company leadership is headed by Founder Paras Jain. Public corporate filings and profile links are provided for identity reference.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#191b30] mt-2.5 shrink-0" />
                  <span>Named government clients, defense deployments, partners, and case studies are published only when approved for public use under bilateral agreements.</span>
                </li>
              </ul>
            </div>

            {/* Right Column: Official Details Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
                <div className="flex items-center gap-2.5 text-lg font-bold text-[#0f172a] pb-4 mb-4 border-b border-slate-100">
                  <FileText className="w-5 h-5 text-slate-700" />
                  <span>Official details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Brand */}
                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Brand
                    </div>
                    <div className="text-sm font-bold text-[#0f172a]">
                      IndoFleet
                    </div>
                  </div>

                  {/* Official Website */}
                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Official Website
                    </div>
                    <a 
                      href="https://indowfleet.com" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-sm font-bold text-[#191b30] hover:underline flex items-center gap-1"
                    >
                      <span>indowfleet.com</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Owner */}
                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Owner
                    </div>
                    <a 
                      href="https://indowfleet.com/company/about.php" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-sm font-bold text-[#191b30] hover:underline"
                    >
                      Indo Wings Private Limited
                    </a>
                  </div>

                  {/* Founder / Developer */}
                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Founder & CEO
                    </div>
                    <a 
                      href="https://indowfleet.com/company/about.php" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-sm font-bold text-[#191b30] hover:underline"
                    >
                      Paras Jain
                    </a>
                  </div>

                  {/* Legal Name */}
                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Legal Name
                    </div>
                    <div className="text-sm font-bold text-[#0f172a]">
                      Indo Wings Private Limited
                    </div>
                  </div>

                  {/* Registration Number */}
                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Registration Number
                    </div>
                    <div className="text-sm font-bold text-[#0f172a]">
                      U35999UP2020PTC126589
                    </div>
                  </div>

                  {/* Jurisdiction (Full Width) */}
                  <div className="sm:col-span-2 bg-[#f8fafc] border border-slate-100 rounded-xl p-3.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Jurisdiction
                    </div>
                    <div className="text-sm font-bold text-[#0f172a]">
                      India (DGCA & Ministry of Civil Aviation - MoCA)
                    </div>
                  </div>

                  {/* Company Address (Full Width) */}
                  <div className="sm:col-span-2 bg-[#f8fafc] border border-slate-100 rounded-xl p-3.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Company Address
                    </div>
                    <div className="text-sm font-semibold text-[#0f172a] leading-relaxed">
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
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Ownership and Development
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] mb-4">
            indowfleet.com remains the public IndoFleet brand.
          </h2>
          <p className="text-slate-600 text-base max-w-3xl leading-relaxed mb-12">
            Owner and manufacturing details are provided for accountability. The public product brand, autonomous transit network, GCS workstation downloads, documentation, and operational support routes remain under indowfleet.com.
          </p>

          {/* 3-Column Card Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Public Site */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-7 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                    Public site
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#0f172a] mb-3">
                  indowfleet.com
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  The website introduces IndoFleet UAV platforms, autonomous fleet ecosystem, publishes GCS workstation releases, links documentation, and routes live expert support, orders, security, and feedback inquiries.
                </p>
              </div>

              <div>
                <a 
                  href="/" 
                  onClick={handleNav('home', '/')}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#191b30] hover:text-slate-800 transition-colors"
                >
                  <span>Visit IndoFleet home</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Card 2: Owner */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-7 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                    Owner
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#0f172a] mb-3">
                  Indo Wings Private Limited
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Indo Wings Private Limited is listed as the owner of IndoFleet. Public company information, manufacturing facility certifications, and corporate filings can be reviewed through the owner website.
                </p>
              </div>

              <div>
                <a 
                  href="https://indowfleet.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#191b30] hover:text-slate-800 transition-colors"
                >
                  <span>Open owner website</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Card 3: Leadership & Developer */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-7 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <Award className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                    Founder
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#0f172a] mb-3">
                  Paras Jain
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Paras Jain is listed as the founder and managing leadership contact for IndoFleet. The public profile link and corporate about pages are included for corporate identity reference only.
                </p>
              </div>

              <div>
                <a 
                  href="https://indowfleet.com/company/about.php" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#191b30] hover:text-slate-800 transition-colors"
                >
                  <span>View leadership profile</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 4: REFERENCES & TRUST ──────────────────────────────────── */}
      <section className="bg-[#f8fafc] border-t border-slate-200/80 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            References
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] mb-12">
            Customer and partner information
          </h2>

          {/* 3-Column Card Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Reference Card 1: Customers */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-7 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                    Customers
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#0f172a] mb-3">
                  No unapproved customer claims
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Customer logos, flight telemetry, named enterprise references, and defense case studies are not published unless the customer has approved public use under bilateral security agreements.
                </p>
              </div>

              <div>
                <a 
                  href="/support?tab=expert" 
                  onClick={handleNav('support', '/support?tab=expert')}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#191b30] hover:text-slate-800 transition-colors"
                >
                  <span>Request reference information</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Reference Card 2: Partners */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-7 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <Network className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                    Partners
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#0f172a] mb-3">
                  Partner information by approval
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Partner names, payload sensor integrations, and avionics supply chain details should be verified and approved before they appear on the public site.
                </p>
              </div>

              <div>
                <a 
                  href="/support?tab=expert" 
                  onClick={handleNav('support', '/support?tab=expert')}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#191b30] hover:text-slate-800 transition-colors"
                >
                  <span>Contact IndoFleet</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Reference Card 3: Trust */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-7 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                    Trust
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#0f172a] mb-3">
                  Operational transparency
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Public pages explain privacy, terms, security disclosure, DGCA civil aviation standards, customer support, downloads, and verified release history.
                </p>
              </div>

              <div>
                <a 
                  href="/docs" 
                  onClick={handleNav('docs', '/docs')}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#191b30] hover:text-slate-800 transition-colors"
                >
                  <span>View documentation & safety</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
