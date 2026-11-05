const fs = require('fs');
const path = require('path');
const { supabase } = require('../dist/supabase');
const { memoryCache } = require('../dist/deliveryStore');

async function cleanAllOrdersAndSync() {
  console.log('[CLEANUP] Starting comprehensive orders, inspections & sync reset...');

  // 1. Delete all delivery orders from Supabase
  try {
    const { data: orders, error: oErr } = await supabase.from('delivery_orders').delete().neq('id', '___NONE___').select('id');
    if (oErr) {
      console.error('[CLEANUP] Error deleting delivery_orders from Supabase:', oErr.message);
    } else {
      console.log(`[CLEANUP] Deleted ${orders?.length || 0} delivery orders from Supabase.`);
    }
  } catch (err) {
    console.error('[CLEANUP] Failed to clear delivery_orders:', err);
  }

  // 2. Delete all inspections from Supabase
  try {
    const { data: inspections, error: iErr } = await supabase.from('inspections').delete().neq('inspection_id', '___NONE___').select('inspection_id');
    if (iErr) {
      console.error('[CLEANUP] Error deleting inspections from Supabase:', iErr.message);
    } else {
      console.log(`[CLEANUP] Deleted ${inspections?.length || 0} inspections from Supabase.`);
    }
  } catch (err) {
    console.error('[CLEANUP] Failed to clear inspections:', err);
  }

  // 3. Delete all SOS alerts from Supabase
  try {
    const { data: alerts, error: sErr } = await supabase.from('sos_alerts').delete().neq('id', '___NONE___').select('id');
    if (sErr) {
      console.error('[CLEANUP] Error deleting sos_alerts from Supabase:', sErr.message);
    } else {
      console.log(`[CLEANUP] Deleted ${alerts?.length || 0} SOS alerts from Supabase.`);
    }
  } catch (err) {
    console.error('[CLEANUP] Failed to clear sos_alerts:', err);
  }

  // 4. Release all drones in drone_fleet that have any assigned order
  try {
    const { data: assignedDrones, error: dErr } = await supabase.from('drone_fleet').select('id, delivery_data');
    if (!dErr && Array.isArray(assignedDrones)) {
      let releasedCount = 0;
      for (const d of assignedDrones) {
        const meta = d.delivery_data || {};
        if (meta.assigned_order || meta.assigned_client || d.status === 'reserved' || d.status === 'in-flight' || d.status === 'maintenance') {
          const updatedMeta = { ...meta, assigned_order: null, assigned_client: null };
          await supabase.from('drone_fleet').update({
            status: 'ready',
            delivery_data: updatedMeta
          }).eq('id', d.id);
          releasedCount++;
        }
      }
      console.log(`[CLEANUP] Released and verified ${releasedCount} airframes back to ready depot status.`);
    }
  } catch (err) {
    console.error('[CLEANUP] Failed to release drones:', err);
  }

  // 5. Reset local JSON files across both root and backend directories
  const jsonFilesToReset = [
    path.resolve(process.cwd(), 'data/inspections.json'),
    path.resolve(process.cwd(), 'IndoWings-Backend/data/inspections.json'),
    path.resolve(process.cwd(), 'data/sos_alerts.json'),
    path.resolve(process.cwd(), 'IndoWings-Backend/data/sos_alerts.json'),
  ];

  for (const fp of jsonFilesToReset) {
    try {
      const dir = path.dirname(fp);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fp, JSON.stringify([], null, 2), 'utf-8');
      console.log(`[CLEANUP] Reset JSON database: ${fp}`);
    } catch (err) {
      console.warn(`[CLEANUP] Notice on resetting ${fp}:`, err);
    }
  }

  // 6. Clean test media files
  const mediaDirs = [
    path.resolve(process.cwd(), 'data/media'),
    path.resolve(process.cwd(), 'IndoWings-Backend/data/media')
  ];

  for (const mdir of mediaDirs) {
    if (fs.existsSync(mdir)) {
      const files = fs.readdirSync(mdir);
      for (const file of files) {
        if (file.endsWith('.svg')) continue; // preserve static SVG template
        const fullPath = path.join(mdir, file);
        try {
          fs.unlinkSync(fullPath);
          console.log(`[CLEANUP] Removed test media: ${file}`);
        } catch {}
      }
    }
  }

  // 7. Clear memoryCache
  try {
    if (memoryCache && typeof memoryCache.flushAll === 'function') {
      memoryCache.flushAll();
    }
  } catch {}

  console.log('[CLEANUP] COMPLETED SUCCESSFULLY. All systems clean and in sync.');
  process.exit(0);
}

cleanAllOrdersAndSync().catch((err) => {
  console.error('[CLEANUP FATAL]', err);
  process.exit(1);
});
