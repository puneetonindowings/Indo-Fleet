import React, { useState } from 'react';

type RoleTab = 'admin' | 'fleet_manager' | 'dispatcher' | 'support' | 'customer';

interface DemoContent {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
}

export const InteractiveDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RoleTab>('dispatcher');

  const tabContents: Record<RoleTab, DemoContent> = {
    dispatcher: {
      eyebrow: 'DISPATCH WORKSPACE',
      title: 'Order dispatch and tracking',
      description: 'Review customer bookings, coordinate shipment milestones, and keep delivery status visible to customers.',
      image: '/images/operator-start-mission.webp',
      alt: 'IndoWings operations workspace with mission and order status'
    },
    admin: {
      eyebrow: 'COMMAND CENTER',
      title: 'Enterprise administration',
      description: 'Provision customer and staff accounts, manage inventory, and oversee platform activity.',
      image: '/images/command-overview.webp',
      alt: 'IndoWings Command Center dashboard view with flight summary and alert review'
    },
    fleet_manager: {
      eyebrow: 'FLEET WORKSPACE',
      title: 'Inventory and quality control',
      description: 'Register manufactured drones, review quality checks, and maintain accurate available stock.',
      image: '/images/manufacturer-config.webp',
      alt: 'Fleet inventory and quality-control workspace'
    },
    support: {
      eyebrow: 'SUPPORT WORKSPACE',
      title: 'Customer assistance',
      description: 'Review support requests, help resolve delivery questions, and follow up on customer issues.',
      image: '/images/mission-log-detail.webp',
      alt: 'IndoWings operational record detail for customer support'
    },
    customer: {
      eyebrow: 'CUSTOMER STORE',
      title: 'Browse, book, and track',
      description: 'Explore available drones, submit a booking request without online payment, and follow order updates.',
      image: '/images/command-overview.webp',
      alt: 'IndoWings customer order and booking experience'
    }
  };

  const current = tabContents[activeTab];

  return (
    <section className="pt-20 pb-20 sm:pt-24 sm:pb-24 bg-[#f8f7fc] text-[#171222] border-t border-[#3b0080]/10 scroll-mt-24" id="demo">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading with generous spacing and line break matching SkyGrid */}
        <div className="max-w-[760px] mb-8 sm:mb-10">
          <p className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#581c87] mb-3">
            Interactive Product Demo
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#171222] leading-[1.08] tracking-tight max-w-[620px]">
            Explore the five workspaces supported by IndoFleet.
          </h2>
        </div>

        {/* Outer Workspace Card (.demo-workspace) with soft lavender tint and equal padding */}
        <div className="p-4 sm:p-5 rounded-xl border border-[#3b0080]/15 bg-[#f2ecf8] shadow-[0_16px_36px_rgba(31,18,45,0.06)]">
          {/* Tabs Row (.demo-tabs) */}
          <div className="flex flex-wrap gap-2 sm:gap-2.5 mb-4" role="tablist" aria-label="IndoWings product views">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'dispatcher'}
              onClick={() => setActiveTab('dispatcher')}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-sm sm:text-[14px] font-extrabold transition-all cursor-pointer ${
                activeTab === 'dispatcher'
                  ? 'bg-[#3b0080] text-white shadow-sm border border-[#3b0080]'
                  : 'bg-white/90 text-[#171222] border border-[#3b0080]/15 hover:border-[#3b0080]/40 hover:bg-white'
              }`}
            >
              Dispatcher View
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'admin'}
              onClick={() => setActiveTab('admin')}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-sm sm:text-[14px] font-extrabold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#3b0080] text-white shadow-sm border border-[#3b0080]'
                  : 'bg-white/90 text-[#171222] border border-[#3b0080]/15 hover:border-[#3b0080]/40 hover:bg-white'
              }`}
            >
              Administrator View
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'fleet_manager'}
              onClick={() => setActiveTab('fleet_manager')}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-sm sm:text-[14px] font-extrabold transition-all cursor-pointer ${
                activeTab === 'fleet_manager'
                  ? 'bg-[#3b0080] text-white shadow-sm border border-[#3b0080]'
                  : 'bg-white/90 text-[#171222] border border-[#3b0080]/15 hover:border-[#3b0080]/40 hover:bg-white'
              }`}
            >
              Fleet Manager View
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'support'}
              onClick={() => setActiveTab('support')}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-sm sm:text-[14px] font-extrabold transition-all cursor-pointer ${
                activeTab === 'support'
                  ? 'bg-[#3b0080] text-white shadow-sm border border-[#3b0080]'
                  : 'bg-white/90 text-[#171222] border border-[#3b0080]/15 hover:border-[#3b0080]/40 hover:bg-white'
              }`}
            >
              Support View
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'customer'}
              onClick={() => setActiveTab('customer')}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-sm sm:text-[14px] font-extrabold transition-all cursor-pointer ${
                activeTab === 'customer'
                  ? 'bg-[#3b0080] text-white shadow-sm border border-[#3b0080]'
                  : 'bg-white/90 text-[#171222] border border-[#3b0080]/15 hover:border-[#3b0080]/40 hover:bg-white'
              }`}
            >
              Customer View
            </button>
          </div>

          {/* Inner Panel Card (.demo-panel) in pure crisp white */}
          <div className="p-6 sm:p-7 lg:p-8 rounded-lg border border-[#3b0080]/12 bg-white shadow-[0_8px_24px_rgba(23,18,34,0.03)]">
            <div className="grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr] gap-6 sm:gap-8 lg:gap-10 items-center">
              {/* Left Copy Column */}
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#581c87] mb-2.5">
                  {current.eyebrow}
                </p>
                <h3 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-[#171222] leading-[1.12] mb-3.5">
                  {current.title}
                </h3>
                <p className="text-[15px] sm:text-base text-[#4b5563] leading-[1.65]">
                  {current.description}
                </p>
              </div>

              {/* Right Screenshot Column (.demo-shot) */}
              <div className="aspect-[16/9] w-full rounded-lg overflow-hidden border border-[#3b0080]/10 shadow-[0_4px_16px_rgba(23,18,34,0.05)] bg-[#171222] relative group">
                <img 
                  key={activeTab}
                  src={current.image} 
                  alt={current.alt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
