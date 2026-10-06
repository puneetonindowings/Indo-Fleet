import React from 'react';
import { RadioTower, MonitorUp, Network } from 'lucide-react';

interface ArchitectureGridProps {
  onOpenCommandCenter: () => void;
}

export const ArchitectureGrid: React.FC<ArchitectureGridProps> = ({ onOpenCommandCenter }) => {
  return (
    <section className="py-16 sm:py-20 bg-[#f8f7fc] text-[#171222]" id="platform">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* 2-Column Section Heading matching SkyGrid exactly */}
        <div className="grid grid-cols-1 md:grid-cols-[0.82fr_1fr] gap-6 md:gap-9 items-end mb-10 sm:mb-12">
          <div>
            <p className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#581c87] mb-3">
              Product Architecture
            </p>
          </div>
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold text-[#171222] leading-[1.08] tracking-tight">
              A complete drone operations ecosystem from command oversight to field execution.
            </h2>
          </div>
        </div>

        {/* 3-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7">
          {/* Card 1: IndoWings Command Center */}
          <article className="bg-white rounded-2xl p-6 sm:p-7 border border-[#3b0080]/10 shadow-[0_16px_36px_rgba(23,18,34,0.04)] flex flex-col justify-between hover:shadow-[0_20px_45px_rgba(59,0,128,0.08)] transition-all duration-300 group">
            <div>
              {/* Card Visual / Screenshot */}
              <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-[#3b0080]/10 mb-5 bg-[#171222]">
                <img 
                  src="/images/command-overview.webp" 
                  alt="IndoWings Command Center mission overview analytics dashboard"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Pill Kicker */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#ede9fe] text-[#581c87] text-xs font-bold mb-4">
                <RadioTower className="w-3.5 h-3.5" />
                <span>Control tower</span>
              </div>

              {/* Title */}
              <h3 className="text-[22px] font-bold text-[#171222] mb-2.5 leading-snug">
                IndoWings Command Center
              </h3>

              {/* Description */}
              <p className="text-[15px] text-[#4b5563] leading-relaxed mb-6">
                Manage organizations, users, roles, trusted devices, fleet oversight, mission approvals, and review records.
              </p>
            </div>

            {/* Link */}
            <div>
              <button 
                onClick={onOpenCommandCenter}
                className="text-[#3b0080] font-extrabold text-[15px] hover:underline inline-flex items-center transition-colors text-left"
              >
                Explore Command Center
              </button>
            </div>
          </article>

          {/* Card 2: IndoWings Ground Control Station */}
          <article className="bg-white rounded-2xl p-6 sm:p-7 border border-[#3b0080]/10 shadow-[0_16px_36px_rgba(23,18,34,0.04)] flex flex-col justify-between hover:shadow-[0_20px_45px_rgba(59,0,128,0.08)] transition-all duration-300 group">
            <div>
              {/* Card Visual / Screenshot */}
              <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-[#3b0080]/10 mb-5 bg-[#171222]">
                <img 
                  src="/images/indowings-route-planner.webp" 
                  alt="IndoWings GCS waypoint route planner with mission controls"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Pill Kicker */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#ede9fe] text-[#581c87] text-xs font-bold mb-4">
                <MonitorUp className="w-3.5 h-3.5" />
                <span>Mission execution</span>
              </div>

              {/* Title */}
              <h3 className="text-[22px] font-bold text-[#171222] mb-2.5 leading-snug">
                IndoWings Ground Control Station
              </h3>

              {/* Description */}
              <p className="text-[15px] text-[#4b5563] leading-relaxed mb-6">
                Connect aircraft, plan missions, monitor telemetry, prepare flights, manage vehicle profiles, and sync with Command Center.
              </p>
            </div>

            {/* Link */}
            <div>
              <a 
                href="#gcs"
                className="text-[#3b0080] font-extrabold text-[15px] hover:underline inline-flex items-center transition-colors"
              >
                Explore GCS
              </a>
            </div>
          </article>

          {/* Card 3: Fleet Lifecycle Management */}
          <article className="bg-white rounded-2xl p-6 sm:p-7 border border-[#3b0080]/10 shadow-[0_16px_36px_rgba(23,18,34,0.04)] flex flex-col justify-between hover:shadow-[0_20px_45px_rgba(59,0,128,0.08)] transition-all duration-300 group">
            <div>
              {/* Card Visual / Screenshot */}
              <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-[#3b0080]/10 mb-5 bg-[#171222]">
                <img 
                  src="/images/mission-operation-center.webp" 
                  alt="IndoWings mission operation center with aircraft readiness and dispatch assignment"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Pill Kicker */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#ede9fe] text-[#581c87] text-xs font-bold mb-4">
                <Network className="w-3.5 h-3.5" />
                <span>Aircraft & fleet layer</span>
              </div>

              {/* Title */}
              <h3 className="text-[22px] font-bold text-[#171222] mb-2.5 leading-snug">
                Fleet lifecycle management
              </h3>

              {/* Description */}
              <p className="text-[15px] text-[#4b5563] leading-relaxed mb-6">
                Coordinate aircraft assignments, manufacturer workflows, fleet readiness, vehicle profiles, and lifecycle history.
              </p>
            </div>

            {/* Link */}
            <div>
              <a 
                href="#platform"
                className="text-[#3b0080] font-extrabold text-[15px] hover:underline inline-flex items-center transition-colors"
              >
                Learn how it works
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};
