import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const CapabilitiesAccordion: React.FC = () => {
  // Card 1 (index 0) open by default, Card 2 and 3 closed
  const [openCards, setOpenCards] = useState<{ [key: number]: boolean }>({
    0: true,
    1: false,
    2: false
  });

  const toggleCard = (index: number) => {
    setOpenCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <section className="py-16 sm:py-20 bg-white text-[#171222] border-t border-[#3b0080]/10" id="capabilities">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading matching SkyGrid compact heading */}
        <div className="max-w-[760px] mb-8 sm:mb-10">
          <p className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#581c87] mb-3">
            Core Capabilities
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold text-[#171222] leading-[1.08] tracking-tight">
            Understand the platform without reading every feature at once.
          </h2>
        </div>

        {/* 3 Separate Cards Stack matching user screenshot */}
        <div className="max-w-[860px] space-y-4 sm:space-y-5">
          {/* Card 1: Plan and fly missions (Open by default) */}
          <div className="bg-white rounded-xl border border-[#3b0080]/10 shadow-[0_4px_16px_rgba(23,18,34,0.02)] overflow-hidden transition-colors">
            <button
              onClick={() => toggleCard(0)}
              className="w-full text-left px-6 py-4.5 sm:py-5 flex items-center justify-between gap-4 hover:bg-[#faf8fd] transition-colors"
              aria-expanded={openCards[0]}
            >
              <h3 className="text-lg sm:text-[19px] font-bold text-[#171222]">
                Plan and fly missions
              </h3>
              <ChevronDown 
                className={`w-5 h-5 text-[#581c87] transition-transform duration-200 shrink-0 ${
                  openCards[0] ? 'rotate-180' : ''
                }`} 
              />
            </button>
            {openCards[0] && (
              <div className="border-t border-gray-100 px-6 py-4.5 sm:py-5 bg-white animate-in fade-in duration-200">
                <p className="text-[15px] text-[#4b5563] leading-relaxed">
                  Create routes, validate waypoints, review readiness, monitor telemetry, and keep mission status visible to approved users.
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Control user access (Closed by default, opens on click) */}
          <div className="bg-white rounded-xl border border-[#3b0080]/10 shadow-[0_4px_16px_rgba(23,18,34,0.02)] overflow-hidden transition-colors">
            <button
              onClick={() => toggleCard(1)}
              className="w-full text-left px-6 py-4.5 sm:py-5 flex items-center justify-between gap-4 hover:bg-[#faf8fd] transition-colors"
              aria-expanded={openCards[1]}
            >
              <h3 className="text-lg sm:text-[19px] font-bold text-[#171222]">
                Control user access
              </h3>
              <ChevronDown 
                className={`w-5 h-5 text-[#581c87] transition-transform duration-200 shrink-0 ${
                  openCards[1] ? 'rotate-180' : ''
                }`} 
              />
            </button>
            {openCards[1] && (
              <div className="border-t border-gray-100 px-6 py-4.5 sm:py-5 bg-white animate-in fade-in duration-200">
                <p className="text-[15px] text-[#4b5563] leading-relaxed">
                  IndoWings uses{' '}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#ede9fe] text-[#581c87] font-extrabold text-xs tracking-wide">
                    RBAC
                  </span>{' '}
                  so administrators, fleet managers, dispatchers, support staff, and customers only see the workflows they need.
                </p>
              </div>
            )}
          </div>

          {/* Card 3: Manage fleets and records (Closed by default, opens on click) */}
          <div className="bg-white rounded-xl border border-[#3b0080]/10 shadow-[0_4px_16px_rgba(23,18,34,0.02)] overflow-hidden transition-colors">
            <button
              onClick={() => toggleCard(2)}
              className="w-full text-left px-6 py-4.5 sm:py-5 flex items-center justify-between gap-4 hover:bg-[#faf8fd] transition-colors"
              aria-expanded={openCards[2]}
            >
              <h3 className="text-lg sm:text-[19px] font-bold text-[#171222]">
                Manage fleets and records
              </h3>
              <ChevronDown 
                className={`w-5 h-5 text-[#581c87] transition-transform duration-200 shrink-0 ${
                  openCards[2] ? 'rotate-180' : ''
                }`} 
              />
            </button>
            {openCards[2] && (
              <div className="border-t border-gray-100 px-6 py-4.5 sm:py-5 bg-white animate-in fade-in duration-200">
                <p className="text-[15px] text-[#4b5563] leading-relaxed">
                  Track aircraft assignments, readiness, release history, mission evidence, and review records from one Command Center workflow.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
