import './env.js';
import { deliveryStore } from './deliveryStore.js';

type SeedAccount = {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  station?: string;
  organization?: string;
  password: string;
};

function defaultAccounts(): SeedAccount[] {
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();
  const adminName = (process.env.ADMIN_NAME || '').trim() || 'Administrator';

  if (!adminEmail || !adminPassword) return [];
  return [{
    id: 'ADMIN-001',
    name: adminName,
    email: adminEmail,
    role: 'admin',
    station: 'IndoWings HQ & Plant, Noida',
    organization: 'IndoWings Corporate',
    password: adminPassword
  }];
}

export async function seedDefaultAccounts(): Promise<void> {
  const accounts = defaultAccounts();
  if (!accounts.length) {
    console.log('[seed] Admin bootstrap skipped; set ADMIN_EMAIL and ADMIN_PASSWORD to create the initial admin.');
    return;
  }
  const created: string[] = [];
  const skipped: string[] = [];

  for (const account of accounts) {
    const existing = await deliveryStore.findUserByEmail(account.email);
    if (existing) {
      skipped.push(account.email);
      continue;
    }
    await deliveryStore.addUser({
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      station: account.station || '',
      organization: account.organization || '',
      status: 'active',
      password: account.password,
      must_change_password: false,
      is_email_verified: true,
      authorized_by: account.role === 'admin' ? null : 'ADMIN-001'
    });
    created.push(`${account.email} (${account.role})`);
  }

  if (created.length) console.log(`[seed] Created default accounts: ${created.join(', ')}`);
  if (skipped.length) console.log(`[seed] Existing accounts left unchanged: ${skipped.join(', ')}`);
}

const invokedDirectly = (process.argv[1] || '').replace(/\\/g, '/');
if (/\/seed\.(ts|js)$/.test(invokedDirectly)) {
  seedDefaultAccounts()
    .then(() => console.log('[seed] Done.'))
    .catch(error => {
      console.error('[seed] Failed:', error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
