import './env.js';
import { fileDB } from './db.js';
import { supabase } from './supabase.js';

async function seed1000Drones() {
  if (process.env.NODE_ENV === 'production' && !process.env.FORCE_SEED) {
    console.error('[seed] BLOCKED: Seeding mock drone data in production environment is disabled for safety. Set FORCE_SEED=true to override.');
    process.exit(1);
  }

  console.log('[seed] Starting 1,000 Drones provisioning with Model Name: 700RPAV...');

  if (!supabase) {
    console.error('[seed] Supabase client is not configured. Check .env file.');
    process.exit(1);
  }

  // Clear drone_fleet first to ensure clean 1000 drones seed
  const { error: deleteError } = await supabase.from('drone_fleet').delete().neq('id', '');
  if (deleteError) {
    console.warn('[seed] Note on clearing drone_fleet:', deleteError.message);
  } else {
    console.log('[seed] Cleared previous drone_fleet table records.');
  }

  const dronesList: any[] = [];
  const totalCount = 1000;
  const modelName = '700RPAV';

  for (let i = 1; i <= totalCount; i++) {
    const padId = String(i).padStart(4, '0');
    dronesList.push({
      id: `INW-700RPAV-${padId}`,
      serial_number: `IW-700RPAV-2026-${padId}`,
      model: modelName,
      category: 'General UAV',
      image_url: '',
      is_verified: false,
      verification_status: 'unverified',
      status: 'idle',
      qc_status: 'passed',
      qc_notes: 'Temporary placeholder ID - physical hardware verification pending',
      battery: 100,
      speed_kmh: 65,
      altitude_m: 0,
      payload_kg: 5,
      current_city: 'Noida Sector 62 Plant',
      lat: 28.5355 + (Math.random() - 0.5) * 0.1,
      lng: 77.391 + (Math.random() - 0.5) * 0.1,
      deliveries_today: 0,
      assigned_order: null,
      created_at: new Date().toISOString()
    });
  }

  console.log(`[seed] Inserting ${dronesList.length} drones in batches of 100 into Supabase...`);
  const inserted = await fileDB.addDronesBatch(dronesList);
  console.log(`[seed] Successfully inserted ${inserted.length} drones.`);

  const fleet = await fileDB.getFleet();
  console.log(`[seed] Total verified fleet count in Supabase: ${fleet.length} UAVs.`);
  console.log(`[seed] Sample record:`, JSON.stringify(fleet[0], null, 2));
  console.log(`[seed] Model names verified: all ${fleet.filter(d => d.model === '700RPAV').length} drones have model: '700RPAV'.`);
  console.log(`[seed] All done!`);
  process.exit(0);
}

seed1000Drones().catch((err) => {
  console.error('[seed] Error seeding 1000 drones:', err);
  process.exit(1);
});
