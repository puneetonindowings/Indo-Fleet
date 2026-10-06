import fs from 'fs';
import path from 'path';
import { deliveryStore } from './deliveryStore.js';
import { verifySupabaseConnection } from './supabase.js';

function readCollection(name: string): Record<string, any>[] {
  const file = path.resolve(process.cwd(), 'data', `${name}.json`);
  if (!fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Legacy collection ${name}.json must contain a JSON array.`);
  }
  return parsed;
}

async function main() {
  await verifySupabaseConnection();
  const report = await deliveryStore.migrateLegacyData({
    users: readCollection('users'),
    drones: readCollection('drones'),
    orders: readCollection('orders'),
    supportRequests: readCollection('expert_requests'),
    feedbacks: readCollection('feedbacks')
  });
  console.log('Legacy JSON migration report:', report);
  console.log('Local JSON files were left untouched as a backup.');
}

main().catch(error => {
  console.error('[migration] Failed to migrate local JSON data to Supabase:', error);
  process.exitCode = 1;
});
