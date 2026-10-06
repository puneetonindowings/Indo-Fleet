import React from 'react';
import { KeyRound, MonitorCheck, Radio, FileText, BookOpen } from 'lucide-react';

interface SecurityFeature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const securityFeatures: SecurityFeature[] = [
  {
    icon: KeyRound,
    title: 'Least privilege',
    description: 'Users see workflows aligned to approved roles, organization scope, and aircraft responsibility.',
  },
  {
    icon: MonitorCheck,
    title: 'Trusted devices',
    description: 'Operational access is designed around approved workstations and accountable sessions.',
  },
  {
    icon: Radio,
    title: 'Release integrity',
    description: 'Download metadata, version records, and checksums support controlled installer validation.',
  },
  {
    icon: FileText,
    title: 'Audit ready',
    description: 'Administrative and operational activity is positioned for review by authorized teams.',
  },
];

export const SecuritySection: React.FC = () => {
  return (
    <section id="security" className="py-20 lg:py-24 bg-[#fbf9fd] text-[#171222]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] gap-8 items-start">
          {/* Left Column Unified Container Card */}
          <div 
            className="rounded-2xl p-6 sm:p-8 bg-white border border-[#3b0080]/15 shadow-sm space-y-6"
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.92)), radial-gradient(circle at top left, rgba(220, 196, 255, 0.45), transparent 18rem)'
            }}
          >
            <div className="space-y-3">
              <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase">
                SECURITY MODEL
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight leading-[1.25]">
                Security built for teams that need clear records.
              </h2>
              <p className="text-sm sm:text-[15px] text-[#4b5563] leading-relaxed">
                IndoWings emphasizes named accounts, least-privilege access, trusted-device workflows, and review-ready records without exposing internal endpoints, credentials, or private deployment details.
              </p>
            </div>

            {/* Login Card Visual */}
            <div className="rounded-xl overflow-hidden border border-[#110b1a]/20 shadow-md">
              <img 
                src="/images/gcs-secure-login.webp" 
                alt="IndoWings GCS Secure Login" 
                className="w-full h-auto object-cover block"
                loading="lazy"
              />
            </div>

            {/* Public Guide Action Button */}
            <div>
              <a 
                href="#docs" 
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-white border border-slate-200 shadow-sm text-sm font-semibold text-[#111827] hover:bg-slate-50 hover:border-[#3b0080]/30 transition-all duration-200"
              >
                <BookOpen className="w-4 h-4 text-[#3b0080]" />
                <span>Open public guide</span>
              </a>
            </div>
          </div>

          {/* Right Column 2x2 Feature Cards Stack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {securityFeatures.map((feat) => {
              const IconComponent = feat.icon;
              return (
                <div 
                  key={feat.title}
                  className="p-6 sm:p-7 rounded-2xl bg-white border border-[#3b0080]/15 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-start min-h-[220px]"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#f2ecf8] flex items-center justify-center mb-5">
                    <IconComponent className="w-5 h-5 text-[#3b0080]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#111827] mb-2 tracking-tight">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-[#4b5563] leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

