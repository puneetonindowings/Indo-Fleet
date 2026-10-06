import React from 'react';
import { CLIENT_LOGOS } from '../data/indowingsData';

export const ClientMarquee: React.FC = () => {
  return (
    <section className="py-14 bg-[#171222] border-b border-purple-900/30 text-white overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-purple-400 mb-8">
          Trusted by India&apos;s Leading Public & Private Enterprises
        </p>

        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-80">
          {CLIENT_LOGOS.map((client, idx) => (
            <div 
              key={idx}
              className="bg-white/90 hover:bg-white px-5 py-2.5 rounded-xl transition-all hover:scale-105 shadow-md flex items-center justify-center min-w-[120px] h-14"
            >
              <img 
                src={client.logo} 
                alt={client.name} 
                className="max-h-8 max-w-full object-contain filter grayscale hover:grayscale-0 transition-all"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
