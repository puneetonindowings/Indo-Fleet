import React, { useState, useEffect } from 'react';
import { DRONE_PRODUCTS } from '../data/indowingsData';
import { apiClient } from '../api/client';
import { DroneItem } from '../types';
import { Database } from 'lucide-react';

interface ProductSpotlightProps {
  onOpenDemoBooking: (droneName?: string) => void;
}

export const ProductSpotlight: React.FC<ProductSpotlightProps> = ({ onOpenDemoBooking }) => {
  const [dbFleet, setDbFleet] = useState<DroneItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getFleet()
      .then((data) => {
        if (data && data.length > 0) {
          setDbFleet(data);
        }
      })
      .catch((err) => console.error('Error fetching fleet from DB:', err))
      .finally(() => setLoading(false));
  }, []);

  // Display either the live Supabase fleet or fallback if still loading
  const displayDrones = dbFleet.length > 0 ? dbFleet : DRONE_PRODUCTS.map(d => ({
    id: d.id,
    model_name: d.name,
    category: d.category,
    serial_number: 'IW-UAV-SERIES',
    status: 'ready' as const,
    battery_pct: 100,
    flight_hours: 150,
    max_range_km: parseFloat(d.range) || 25,
    endurance_mins: parseInt(d.endurance) || 60,
    max_speed_kmh: parseInt(d.speed) || 75,
    payload_capacity_kg: parseFloat(d.payload) || 2.5,
    image_url: d.image
  }));
  return (
    <section id="fleet" className="py-20 bg-white border-b border-[#d7cce2]/50 text-[#171222]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">

        {/* Full Drone Fleet Lineup */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono bg-purple-100 text-[#3b0080] border border-purple-200 mb-3">
            <Database className="w-3 h-3 text-emerald-600" />
            <span>PostgreSQL Inventory: {displayDrones.length} Operational Units</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#171222]">
            Engineering Excellence Across Every Flight Envelope
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {displayDrones.map((drone) => (
            <div 
              key={drone.id}
              className="glass-card rounded-2xl p-6 flex flex-col justify-between border border-[#d7cce2] hover:border-[#6d28d9]/50 transition-all group"
            >
              <div>
                {/* Drone Image Container (Loaded directly from DB image_url) */}
                <div className="h-48 w-full rounded-xl bg-gradient-to-b from-[#f7f4fb] to-purple-50/50 mb-5 flex items-center justify-center p-3 relative overflow-hidden border border-purple-100">
                  <img 
                    src={drone.image_url} 
                    alt={drone.model_name} 
                    className="max-h-full max-w-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#3b0080] text-white">
                    {drone.category}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-bold text-[#171222] group-hover:text-[#3b0080] transition-colors">
                    {drone.model_name}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                    {drone.status}
                  </span>
                </div>
                <p className="text-xs text-purple-700 font-mono mb-4">SN: {drone.serial_number}</p>

                {/* Specs Pill Grid from DB */}
                <div className="grid grid-cols-2 gap-2 mb-5 text-xs font-mono">
                  <div className="bg-[#f7f4fb] p-2 rounded-lg border border-[#d7cce2]/60">
                    <span className="text-slate-400 block text-[10px]">MAX RANGE</span>
                    <span className="font-bold text-[#171222]">{drone.max_range_km} KM</span>
                  </div>
                  <div className="bg-[#f7f4fb] p-2 rounded-lg border border-[#d7cce2]/60">
                    <span className="text-slate-400 block text-[10px]">ENDURANCE</span>
                    <span className="font-bold text-[#171222]">{drone.endurance_mins} MIN</span>
                  </div>
                </div>

                {/* Database Metrics */}
                <div className="p-2.5 rounded-lg bg-purple-50/50 border border-purple-100 mb-6 text-xs text-slate-600 font-mono flex justify-between">
                  <span>Flight Hours: <strong>{drone.flight_hours} h</strong></span>
                  <span>Battery: <strong className="text-emerald-700">{drone.battery_pct}%</strong></span>
                </div>
              </div>

              <button 
                onClick={() => onOpenDemoBooking(drone.model_name)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#3b0080] hover:bg-[#6d28d9] text-white shadow-sm transition-all"
              >
                Request Flight Demonstration
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
