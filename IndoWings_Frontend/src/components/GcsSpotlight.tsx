import React from 'react';
import { HardDriveDownload, KeyRound, DatabaseZap } from 'lucide-react';

export const GcsSpotlight: React.FC = () => {
  return (
    <section 
      id="gcs" 
      className="w-full py-20 lg:py-24 text-white relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #2b114d 0%, #240c42 100%)'
      }}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,1fr)] gap-10 lg:gap-12 items-center">
          {/* Left Column Copy & Metric Strip */}
          <div>
            <p className="text-xs font-bold tracking-widest text-[#d8b4fe] uppercase mb-4">
              IndoWings GCS
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-white tracking-tight leading-[1.08] mb-5">
              Ground control for mission planning, aircraft connection, and field execution.
            </h2>
            <p className="text-base sm:text-lg text-purple-100/75 leading-relaxed mb-8">
              GCS gives approved operations teams a focused desktop workspace for connecting aircraft, planning missions, monitoring telemetry, and syncing operational state back to Command Center.
            </p>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Windows */}
              <div className="p-4 sm:p-5 rounded-lg border border-white/15 bg-white/[0.06] text-white/80 flex flex-col justify-between min-h-[95px]">
                <HardDriveDownload className="w-5 h-5 text-purple-300 mb-2.5" />
                <div>
                  <strong className="block text-white text-lg sm:text-xl font-bold leading-tight">Windows</strong>
                  <span className="text-xs text-purple-200/70">MSI installer</span>
                </div>
              </div>

              {/* Role-aware */}
              <div className="p-4 sm:p-5 rounded-lg border border-white/15 bg-white/[0.06] text-white/80 flex flex-col justify-between min-h-[95px]">
                <KeyRound className="w-5 h-5 text-purple-300 mb-2.5" />
                <div>
                  <strong className="block text-white text-lg sm:text-xl font-bold leading-tight">Role-aware</strong>
                  <div className="flex items-center gap-1.5 text-xs text-purple-200/70 mt-0.5">
                    <span>tools</span>
                    <span 
                      className="relative inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#eee4ff] text-[#3b0080] text-[10px] font-black cursor-help group"
                    >
                      ?
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-2.5 bg-[#171222] text-white text-xs font-normal rounded-lg shadow-xl border border-white/10 z-50 text-left pointer-events-none">
                        Role-aware means the app adjusts tools based on the user account and approved responsibilities.
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Synced data */}
              <div className="p-4 sm:p-5 rounded-lg border border-white/15 bg-white/[0.06] text-white/80 flex flex-col justify-between min-h-[95px]">
                <DatabaseZap className="w-5 h-5 text-purple-300 mb-2.5" />
                <div>
                  <strong className="block text-white text-lg sm:text-xl font-bold leading-tight">Synced data</strong>
                  <div className="flex items-center gap-1.5 text-xs text-purple-200/70 mt-0.5">
                    <span>for field workflows</span>
                    <span 
                      className="relative inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#eee4ff] text-[#3b0080] text-[10px] font-black cursor-help group"
                    >
                      ?
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-2.5 bg-[#171222] text-white text-xs font-normal rounded-lg shadow-xl border border-white/10 z-50 text-left pointer-events-none">
                        Some workflows can use recently synced data, but login, account scope, and release policy still come from Command Center.
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column Interface Panel */}
          <figure className="rounded-xl overflow-hidden shadow-2xl border border-white/15 bg-[#130b20]">
            <img 
              src="/images/gcs-mission-planner.webp" 
              alt="IndoWings GCS mission planner with satellite map, route controls, and survey setup panel"
              className="w-full h-auto object-cover block"
              loading="lazy"
            />
          </figure>
        </div>
      </div>
    </section>
  );
};
