import React from 'react';
import { UserPlus, KeyRound, ShieldCheck } from 'lucide-react';

interface EcosystemSummaryProps {
  onOpenCommandCenter?: () => void;
}

export const EcosystemSummary: React.FC<EcosystemSummaryProps> = ({ onOpenCommandCenter }) => {
  return (
    <section className="py-16 sm:py-20 bg-white text-[#171222] border-t border-[#3b0080]/10" id="ecosystem">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[0.92fr_1fr] gap-10 lg:gap-14 items-center">
          {/* Left Column: Copy */}
          <div>
            <p className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#581c87] mb-3">
              How the ecosystem works
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#171222] leading-[1.08] tracking-tight mb-5 max-w-[560px]">
              Command Center governs access. GCS executes field operations. Fleet workflows keep aircraft accountable.
            </h2>
            <p className="text-[15px] sm:text-base text-[#4b5563] leading-relaxed max-w-[520px]">
              IndoWings GCS requires an active IndoWings Command Center account. Command Center is the source of truth for users, roles, organization scope, trusted devices, aircraft assignments, release records, and audit review.
            </p>
          </div>

          {/* Right Column: Quick Answer Grid */}
          <div className="grid gap-3.5 sm:gap-4">
            {/* Card 1: How do users get access? */}
            <article className="p-6 rounded-xl border border-[#3b0080]/12 bg-[#faf8fc]/80 shadow-[0_12px_32px_rgba(31,18,45,0.04)]">
              <div className="w-10 h-10 rounded-lg bg-[#ede9fe] text-[#581c87] flex items-center justify-center mb-4">
                <UserPlus className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-[19px] font-bold text-[#171222] mb-2">
                How do users get access?
              </h3>
              <p className="text-[15px] text-[#4b5563] leading-relaxed">
                Organization administrators create or approve accounts. New organizations can contact IndoWings support for onboarding.
              </p>
            </article>

            {/* Card 2: Why is an account required? */}
            <article className="p-6 rounded-xl border border-[#3b0080]/12 bg-[#faf8fc]/80 shadow-[0_12px_32px_rgba(31,18,45,0.04)]">
              <div className="w-10 h-10 rounded-lg bg-[#ede9fe] text-[#581c87] flex items-center justify-center mb-4">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-[19px] font-bold text-[#171222] mb-2">
                Why is an account required?
              </h3>
              <p className="text-[15px] text-[#4b5563] leading-relaxed">
                GCS depends on identity,{' '}
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#ede9fe] text-[#581c87] font-extrabold text-xs tracking-wide">
                  RBAC
                </span>{' '}
                permissions, aircraft scope, trusted devices, and Command Center sync.
              </p>
            </article>

            {/* Bottom Button */}
            <a
              href="#platform"
              onClick={(e) => {
                if (onOpenCommandCenter) {
                  e.preventDefault();
                  onOpenCommandCenter();
                }
              }}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl border border-[#3b0080]/15 bg-white text-[#171222] font-bold text-[15px] flex items-center justify-center gap-2 shadow-sm hover:bg-[#f8f5fc] hover:border-[#3b0080]/30 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#581c87]" />
              <span>Read how IndoWings works</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
