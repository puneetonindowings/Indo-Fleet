import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AudienceRole {
  title: string;
  content: React.ReactNode;
}

const audienceRoles: AudienceRole[] = [
  {
    title: 'Operations teams',
    content: (
      <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
        <strong className="font-bold text-[#111827]">Dispatchers</strong> coordinate bookings and delivery updates.{' '}
        <strong className="font-bold text-[#111827]">Fleet managers</strong> prepare and maintain drone inventory.
      </p>
    ),
  },
  {
    title: 'Administration and support',
    content: (
      <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
        <strong className="font-bold text-[#111827]">Administrators</strong> provision customer and staff accounts.{' '}
        <strong className="font-bold text-[#111827]">Support teams</strong> help resolve customer questions and delivery issues.
      </p>
    ),
  },
  {
    title: 'Customers',
    content: (
      <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
        <strong className="font-bold text-[#111827]">Customers</strong> browse available drones, book shipments, save delivery addresses, and track order history.
      </p>
    ),
  },
];

export const AudienceMatrix: React.FC = () => {
  // Card 1 (index 0) open by default, Card 2 and 3 closed
  const [openCards, setOpenCards] = useState<{ [key: number]: boolean }>({
    0: true,
    1: false,
    2: false,
  });

  const toggleCard = (index: number) => {
    setOpenCards(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <section id="roles" className="py-20 lg:py-24 bg-[#fbf9fd] text-[#171222]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        {/* Section Heading */}
        <div className="mb-10 text-left">
          <p className="text-xs font-bold tracking-widest text-[#3b0080] uppercase mb-3">
            BUILT FOR
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#111827] tracking-tight leading-tight">
            Every team around the operation.
          </h2>
        </div>

        {/* 3 Interactive Accordion Cards */}
        <div className="space-y-4 max-w-full">
          {audienceRoles.map((role, idx) => {
            const isOpen = !!openCards[idx];
            return (
              <div 
                key={role.title}
                className="rounded-xl border border-[#3b0080]/15 bg-white shadow-sm overflow-hidden transition-colors"
                style={{
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.94)), radial-gradient(circle at 0 0, rgba(220, 196, 255, 0.35), transparent 18rem)'
                }}
              >
                {/* Clickable Card Header */}
                <button
                  type="button"
                  onClick={() => toggleCard(idx)}
                  className="w-full text-left px-6 py-4.5 sm:px-8 sm:py-5 flex items-center justify-between gap-4 hover:bg-[#faf8fd] transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                    {role.title}
                  </h3>
                  <ChevronDown 
                    className={`w-5 h-5 text-[#3b0080] transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`} 
                  />
                </button>

                {/* Collapsible Card Body */}
                {isOpen && (
                  <>
                    <div className="border-t border-[#3b0080]/10 w-full" />
                    <div className="px-6 py-4.5 sm:px-8 sm:py-5 animate-in fade-in duration-200">
                      {role.content}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

