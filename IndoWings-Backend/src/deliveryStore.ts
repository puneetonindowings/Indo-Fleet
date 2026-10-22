import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { supabase } from './supabase.js';

const INSPECTIONS_FILE = path.resolve(process.cwd(), 'data/inspections.json');
const SOS_ALERTS_FILE = path.resolve(process.cwd(), 'data/sos_alerts.json');

export function loadSosAlertsFromFile(): JsonRecord[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(SOS_ALERTS_FILE)) {
      fs.writeFileSync(SOS_ALERTS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
    const raw = fs.readFileSync(SOS_ALERTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSosAlertToFile(alert: JsonRecord) {
  try {
    ensureDataDir();
    const existing = loadSosAlertsFromFile();
    const idx = existing.findIndex(a => a.id === alert.id);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...alert };
    } else {
      existing.unshift(alert);
    }
    fs.writeFileSync(SOS_ALERTS_FILE, JSON.stringify(existing, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SOS] Failed to save alert to file:', err);
  }
}

export function deleteSosAlertFromFile(id: string) {
  try {
    ensureDataDir();
    const existing = loadSosAlertsFromFile();
    const filtered = existing.filter(a => a.id !== id);
    fs.writeFileSync(SOS_ALERTS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SOS] Failed to delete alert from file:', err);
  }
}

function ensureDataDir() {
  const dir = path.dirname(INSPECTIONS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(INSPECTIONS_FILE)) {
    fs.writeFileSync(INSPECTIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function loadInspectionsFromFile(): JsonRecord[] {
  try {
    ensureDataDir();
    const raw = fs.readFileSync(INSPECTIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function appendInspectionToFile(inspection: JsonRecord) {
  try {
    ensureDataDir();
    const existing = loadInspectionsFromFile();
    existing.push(inspection);
    fs.writeFileSync(INSPECTIONS_FILE, JSON.stringify(existing, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Inspections] Failed to append inspection:', err);
  }
}

type JsonRecord = Record<string, any>;

function db() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the backend environment.');
  }
  return supabase;
}

function fail(operation: string, error: { message: string } | null): void {
  if (error) {
    console.error(`[supabase] ${operation} failed: ${error.message}`);
    throw new Error(`Supabase ${operation} failed: ${error.message}`);
  }
}

async function insertInBatches(table: string, rows: JsonRecord[], mode: 'insert' | 'upsert', conflict = 'id') {
  const results: JsonRecord[] = [];
  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100);
    const query = mode === 'upsert'
      ? db().from(table).upsert(batch, { onConflict: conflict }).select('*')
      : db().from(table).insert(batch).select('*');
    const { data, error } = await query;
    fail(`${mode} ${table}`, error);
    results.push(...(data || []));
  }
  return results;
}

function splitMetadata(record: JsonRecord, columns: string[]) {
  const row: JsonRecord = {};
  const metadata: JsonRecord = {};
  for (const [key, value] of Object.entries(record)) {
    if (columns.includes(key)) row[key] = value;
    else metadata[key] = value;
  }
  return { row, metadata };
}

function fromDrone(row: JsonRecord) {
  const metadata = row.delivery_data || {};
  const {
    delivery_data,
    id,
    model_name,
    category,
    serial_number,
    status,
    battery_pct,
    flight_hours,
    max_range_km,
    endurance_mins,
    max_speed_kmh,
    payload_capacity_kg,
    image_url,
    created_at,
    updated_at
  } = row;
  const isVerified = metadata.is_verified === true || metadata.verification_status === 'verified';
  return {
    ...metadata,
    id,
    model: model_name,
    category: category || metadata.category || 'General UAV',
    serial_number,
    status,
    battery: Number(battery_pct ?? 100),
    flight_hours: Number(flight_hours || 0),
    max_range_km: Number(max_range_km || 0),
    endurance_mins: Number(endurance_mins || 0),
    speed_kmh: typeof max_speed_kmh === 'number' ? max_speed_kmh : parseFloat(String(max_speed_kmh || '0').replace(/[^0-9.]/g, '')) || 0,
    payload_kg: typeof payload_capacity_kg === 'number' ? payload_capacity_kg : parseFloat(String(payload_capacity_kg || '0').replace(/[^0-9.]/g, '')) || 0,
    image_url: image_url || metadata.image_url || '',
    is_verified: isVerified,
    verification_status: isVerified ? 'verified' : 'unverified',
    created_at,
    updated_at
  };
}

function toDrone(drone: JsonRecord) {
  const { row, metadata } = splitMetadata(drone, [
    'id', 'serial_number', 'model', 'category', 'status', 'battery', 'speed_kmh',
    'payload_kg', 'payload_capacity_kg', 'image_url', 'created_at', 'updated_at'
  ]);
  const rawStatus = String(row.status || '').toLowerCase().trim();
  let dbStatus = 'idle';
  if (['reserved', 'maintenance', 'ready', 'idle'].includes(rawStatus)) {
    dbStatus = rawStatus;
  } else if (['available', 'active', 'online', 'operational'].includes(rawStatus)) {
    dbStatus = 'ready';
  }
  const isVerified = drone.is_verified === true || drone.verification_status === 'verified';

  return {
    id: row.id,
    model_name: row.model || 'Cyberone Pro',
    category: row.category || metadata.category || 'General UAV',
    serial_number: row.serial_number || row.id,
    status: dbStatus,
    battery_pct: Number(row.battery ?? 100),
    flight_hours: Number(metadata.flight_hours || 0),
    max_range_km: Number(metadata.max_range_km || 0),
    endurance_mins: Number(metadata.endurance_mins || 0),
    max_speed_kmh: Number(row.speed_kmh || 0),
    payload_capacity_kg: Number(row.payload_kg ?? row.payload_capacity_kg ?? 0),
    image_url: row.image_url || '',
    delivery_data: {
      ...metadata,
      is_verified: isVerified,
      verification_status: isVerified ? 'verified' : 'unverified'
    },
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  };
}

const orderColumns = [
  'id', 'order_type', 'challan_number', 'creator_id', 'customer_name',
  'client_name', 'customer_email', 'customer_phone', 'recipient_name',
  'recipient_phone', 'is_for_someone_else', 'delivery_notes',
  'pickup_address', 'drop_address', 'destination_address', 'address_id',
  'package_type', 'drones_shipped', 'drone_model', 'units_count', 'carrier',
  'weight_kg', 'fare_inr', 'payment_id', 'payment_status', 'payment_method',
  'aerial_distance_km', 'flight_duration_mins', 'status', 'drone_id',
  'scheduled_time', 'estimated_delivery', 'items', 'reserved_inventory_ids',
  'timeline', 'handover_details', 'feedback_submitted', 'cancelled_at',
  'cancellation_reason', 'delivered_at', 'inspection_id', 'inspection_status',
  'created_at', 'updated_at',
];

function fromOrder(row: JsonRecord) {
  const { delivery_data, ...columns } = row;
  const meta = (typeof delivery_data === 'object' && delivery_data !== null) ? delivery_data : {};

  const cleanList = (colVal: any, metaVal: any) => {
    const list1 = Array.isArray(colVal) ? colVal : [];
    const list2 = Array.isArray(metaVal) ? metaVal : [];
    return Array.from(new Set([...list1, ...list2].map(String).map(s => s.trim()).filter(Boolean)));
  };

  const inspected = cleanList(columns.inspected_drone_ids, meta.inspected_drone_ids);
  const hubInspected = cleanList(columns.hub_inspected_drone_ids, meta.hub_inspected_drone_ids);
  const depotInspected = cleanList(columns.depot_inspected_drone_ids, meta.depot_inspected_drone_ids);
  const allocated = cleanList(columns.allocated_drone_ids, meta.allocated_drone_ids);
  const assigned = cleanList(columns.assigned_drone_ids, meta.assigned_drone_ids || columns.reserved_inventory_ids);

  return {
    ...meta,
    ...columns,
    inspected_drone_ids: inspected,
    hub_inspected_drone_ids: hubInspected,
    depot_inspected_drone_ids: depotInspected,
    allocated_drone_ids: allocated,
    assigned_drone_ids: assigned.length > 0 ? assigned : (columns.reserved_inventory_ids || []),
    assigned_drone_id: columns.assigned_drone_id || meta.assigned_drone_id || columns.drone_id || null,
    hub_inspection_id: columns.hub_inspection_id || meta.hub_inspection_id || null,
    depot_inspection_id: columns.depot_inspection_id || meta.depot_inspection_id || null,
  };
}

function toOrder(order: JsonRecord) {
  const { row, metadata } = splitMetadata(order, orderColumns);
  if (row.fare !== undefined && row.fare_inr === undefined) row.fare_inr = row.fare;
  delete row.fare;

  const existingDeliveryData = typeof order.delivery_data === 'object' && order.delivery_data !== null
    ? { ...order.delivery_data }
    : {};
  delete existingDeliveryData.delivery_data;

  const mergedMetadata = {
    ...existingDeliveryData,
    ...metadata
  };
  delete mergedMetadata.delivery_data;

  const ensureStringArray = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return Array.from(new Set(val.map(String).map(s => s.trim()).filter(Boolean)));
    return [String(val).trim()].filter(Boolean);
  };

  mergedMetadata.assigned_drone_ids = ensureStringArray(order.assigned_drone_ids || mergedMetadata.assigned_drone_ids || row.reserved_inventory_ids);
  mergedMetadata.inspected_drone_ids = ensureStringArray(order.inspected_drone_ids || mergedMetadata.inspected_drone_ids);
  mergedMetadata.hub_inspected_drone_ids = ensureStringArray(order.hub_inspected_drone_ids || mergedMetadata.hub_inspected_drone_ids);
  mergedMetadata.depot_inspected_drone_ids = ensureStringArray(order.depot_inspected_drone_ids || mergedMetadata.depot_inspected_drone_ids);
  mergedMetadata.allocated_drone_ids = ensureStringArray(order.allocated_drone_ids || mergedMetadata.allocated_drone_ids);
  if (order.assigned_drone_id || mergedMetadata.assigned_drone_id) {
    mergedMetadata.assigned_drone_id = order.assigned_drone_id || mergedMetadata.assigned_drone_id;
  }
  if (order.hub_inspection_id || mergedMetadata.hub_inspection_id) {
    mergedMetadata.hub_inspection_id = order.hub_inspection_id || mergedMetadata.hub_inspection_id;
  }
  if (order.depot_inspection_id || mergedMetadata.depot_inspection_id) {
    mergedMetadata.depot_inspection_id = order.depot_inspection_id || mergedMetadata.depot_inspection_id;
  }

  delete (row as any).assigned_drone_ids;
  delete (row as any).assigned_drone_id;
  delete (row as any).inspected_drone_ids;
  delete (row as any).hub_inspected_drone_ids;
  delete (row as any).depot_inspected_drone_ids;
  delete (row as any).allocated_drone_ids;
  delete (row as any).hub_inspection_id;
  delete (row as any).depot_inspection_id;

  return {
    ...row,
    order_type: row.order_type || 'delivery',
    creator_id: row.creator_id || null,
    customer_name: row.customer_name || '',
    customer_email: row.customer_email || '',
    customer_phone: row.customer_phone || '',
    is_for_someone_else: Boolean(row.is_for_someone_else),
    delivery_notes: row.delivery_notes || '',
    pickup_address: row.pickup_address || '',
    drop_address: row.drop_address || '',
    package_type: row.package_type || '',
    units_count: Number(row.units_count || (row.items?.length) || (row.reserved_inventory_ids?.length) || 1),
    weight_kg: Number(row.weight_kg || 0),
    payment_status: row.payment_status || 'not_applicable',
    payment_method: row.payment_method || 'none',
    status: row.status || 'pending',
    items: row.items || [],
    reserved_inventory_ids: ensureStringArray(row.reserved_inventory_ids),
    timeline: row.timeline || [],
    feedback_submitted: Boolean(row.feedback_submitted),
    delivery_data: mergedMetadata,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  };
}

function fromUser(row: JsonRecord) {
  const { profile_data, ...columns } = row;
  const effectiveRole = (profile_data && profile_data.app_role) ? profile_data.app_role : columns.role;
  return {
    ...(profile_data || {}),
    ...columns,
    role: effectiveRole,
    phone: columns.phone || '',
    status: columns.status === 'disabled' ? 'restricted' : columns.status,
    saved_addresses: columns.saved_addresses || []
  };
}

const userColumns = [
  'id', 'name', 'email', 'phone', 'role', 'station', 'organization',
  'status', 'password', 'password_hash', 'must_change_password',
  'saved_addresses', 'is_email_verified', 'is_phone_verified',
  'authorized_by', 'created_at', 'updated_at', 'status_updated_at',
  'password_updated_at'
];

async function toUser(user: JsonRecord) {
  const { row, metadata } = splitMetadata(user, userColumns);
  const passwordHash = row.password
    ? await hashPassword(String(row.password).replace(/\s+/g, ''))
    : row.password_hash;
  delete row.password;
  delete row.password_hash;

  const validDbRoles = ['admin', 'fleet_manager', 'dispatcher', 'support', 'customer'];
  const actualRole = row.role || 'customer';
  const dbRole = validDbRoles.includes(actualRole) ? actualRole : 'dispatcher';

  return {
    id: row.id,
    name: row.name,
    email: String(row.email || '').toLowerCase(),
    phone: row.phone || null,
    role: dbRole,
    station: row.station || '',
    organization: row.organization || '',
    status: row.status === 'restricted' ? 'disabled' : (row.status || 'active'),
    password_hash: passwordHash || null,
    must_change_password: Boolean(row.must_change_password),
    saved_addresses: row.saved_addresses || [],
    is_email_verified: Boolean(row.is_email_verified),
    is_phone_verified: Boolean(row.is_phone_verified),
    authorized_by: row.authorized_by || null,
    profile_data: {
      ...metadata,
      app_role: actualRole,
      ...(row.status_updated_at ? { status_updated_at: row.status_updated_at } : {}),
      ...(row.password_updated_at ? { password_updated_at: row.password_updated_at } : {})
    },
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  };
}

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key));
  });
  return `scrypt:${salt}:${digest.toString('hex')}`;
}

async function verifyPassword(password: string, encoded: string | null | undefined) {
  if (!encoded) return false;
  const [scheme, salt, expectedHex] = encoded.split(':');
  if (scheme !== 'scrypt' || !salt || !expectedHex) return false;
  const actual = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key));
  });
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

function otpDestinationHash(identifier: string) {
  return crypto.createHash('sha256').update(normalizeOtpKey(identifier)).digest('hex');
}

function normalizeOtpKey(identifier: string) {
  return identifier.includes('@')
    ? identifier.toLowerCase().trim()
    : identifier.replace(/[^0-9]/g, '').slice(-10);
}

function otpHash(destination: string, otp: string) {
  return crypto.createHash('sha256').update(`${normalizeOtpKey(destination)}:${otp.trim()}`).digest('hex');
}

function fromSupport(row: JsonRecord) {
  const { request_data, ...columns } = row;
  return { ...(request_data || {}), ...columns };
}

function toSupport(request: JsonRecord) {
  const known = [
    'id', 'customer_id', 'name', 'email', 'phone', 'order_id', 'category',
    'priority', 'preferred_time', 'message', 'status', 'resolution_notes',
    'call_logs', 'created_at', 'updated_at'
  ];
  const { row, metadata } = splitMetadata(request, known);
  return {
    ...row,
    customer_id: row.customer_id || null,
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    order_id: row.order_id || null,
    category: row.category || '',
    priority: row.priority || 'normal',
    message: row.message || '',
    status: row.status || 'open',
    call_logs: row.call_logs || [],
    request_data: metadata,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  };
}

function fromFeedback(row: JsonRecord) {
  const { feedback_data, ...columns } = row;
  return { ...(feedback_data || {}), ...columns };
}

function toFeedback(feedback: JsonRecord) {
  const known = [
    'id', 'customer_id', 'user_name', 'user_email', 'drone_name', 'order_id',
    'rating', 'category', 'message', 'verified_order', 'status',
    'created_at', 'updated_at'
  ];
  const { row, metadata } = splitMetadata(feedback, known);
  return {
    ...row,
    customer_id: row.customer_id || null,
    user_name: row.user_name || 'Anonymous',
    user_email: row.user_email || '',
    drone_name: row.drone_name || '',
    order_id: row.order_id || null,
    rating: Number(row.rating) || 5,
    category: row.category || 'General',
    message: row.message || '',
    verified_order: Boolean(row.verified_order),
    status: row.status || 'published',
    feedback_data: metadata,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  };
}


class InMemoryCache {
  private cache = new Map<string, { data: any; expiresAt: number }>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): T {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  deletePattern(prefix: string): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const memoryCache = new InMemoryCache();

export const deliveryStore = {
  normalizeOtpKey,
  verifyPassword,

  async migrateLegacyData(collections: {
    users?: JsonRecord[];
    drones?: JsonRecord[];
    orders?: JsonRecord[];
    supportRequests?: JsonRecord[];
    feedbacks?: JsonRecord[];
  }) {
    const report: Record<string, number | string> = {};
    const tables: Array<{
      key: string;
      table: string;
      rows: JsonRecord[];
      map: (row: JsonRecord) => Promise<JsonRecord>;
    }> = [
      { key: 'users', table: 'delivery_users', rows: collections.users || [], map: toUser },
      { key: 'drones', table: 'drone_fleet', rows: collections.drones || [], map: async row => toDrone(row) },
      { key: 'orders', table: 'delivery_orders', rows: collections.orders || [], map: async row => toOrder(row) },
      { key: 'supportRequests', table: 'support_requests', rows: collections.supportRequests || [], map: async row => toSupport(row) },
      { key: 'feedbacks', table: 'feedbacks', rows: collections.feedbacks || [], map: async row => toFeedback(row) }
    ];

    for (const collection of tables) {
      if (collection.rows.length === 0) {
        report[collection.key] = 'no local records';
        continue;
      }
      const { data: existingRows, error: readError } = await db().from(collection.table).select('id');
      fail(`check ${collection.table} before legacy migration`, readError);
      const existingIds = new Set((existingRows || []).map((row: JsonRecord) => row.id));
      const mappedRows = await Promise.all(collection.rows.map(collection.map));
      const rows = mappedRows.filter(row => !existingIds.has(row.id));
      if (collection.key === 'feedbacks' || collection.key === 'supportRequests') {
        const { data: orderRows } = await db().from('delivery_orders').select('id');
        const validOrderIds = new Set((orderRows || []).map((r: JsonRecord) => r.id));
        const { data: userRows } = await db().from('delivery_users').select('id');
        const validUserIds = new Set((userRows || []).map((r: JsonRecord) => r.id));
        rows.forEach(r => {
          if (r.order_id && !validOrderIds.has(r.order_id)) r.order_id = null;
          if (r.customer_id && !validUserIds.has(r.customer_id)) r.customer_id = null;
        });
      }
      await insertInBatches(collection.table, rows, 'insert');
      report[collection.key] = `imported ${rows.length}; left ${existingIds.size} existing records unchanged`;
    }
    report.otps = 'skipped; active OTP codes are short-lived and must not be migrated';
    return report;
  },

  async getUsers() {
    const cached = memoryCache.get<JsonRecord[]>('users:all');
    if (cached) return cached;
    const { data, error } = await db().from('delivery_users').select('*').order('created_at');
    fail('list delivery users', error);
    const users = (data || []).map(fromUser);
    return memoryCache.set('users:all', users, 30_000);
  },
  async findUserById(id: string) {
    const { data, error } = await db().from('delivery_users').select('*').eq('id', id).maybeSingle();
    fail('find delivery user', error);
    return data ? fromUser(data) : null;
  },
  async findUserByEmail(email: string) {
    const { data, error } = await db().from('delivery_users').select('*').eq('email', email.trim().toLowerCase()).maybeSingle();
    fail('find delivery user by email', error);
    return data ? fromUser(data) : null;
  },
  async findUserByPhone(phone: string) {
    const digits = phone.replace(/[^0-9]/g, '').slice(-10);
    const { data, error } = await db().from('delivery_users')
      .select('*')
      .in('phone', [digits, `+91${digits}`]);
    fail('find delivery user by phone', error);
    const match = (data || []).find(row => (row.phone || '').replace(/[^0-9]/g, '').endsWith(digits));
    return match ? fromUser(match) : null;
  },
  async addUser(user: JsonRecord) {
    const row = await toUser(user);
    const { data, error } = await db().from('delivery_users').insert(row).select('*').single();
    fail('create delivery user', error);
    memoryCache.deletePattern('users:');
    return fromUser(data);
  },
  async updateUser(id: string, updates: JsonRecord) {
    const existing = await this.findUserById(id);
    if (!existing) return null;
    const row = await toUser({ ...existing, ...updates, id: existing.id });
    const { data, error } = await db().from('delivery_users').update(row).eq('id', existing.id).select('*').maybeSingle();
    fail('update delivery user', error);
    memoryCache.deletePattern('users:');
    return data ? fromUser(data) : null;
  },
  async deleteUser(id: string) {
    const { data, error } = await db().from('delivery_users').delete().eq('id', id).select('id').maybeSingle();
    fail('delete delivery user', error);
    memoryCache.deletePattern('users:');
    return Boolean(data);
  },

  async getOrders() {
    const cached = memoryCache.get<JsonRecord[]>('orders:all');
    if (cached) return cached;
    const { data, error } = await db().from('delivery_orders').select('*').order('created_at', { ascending: false });
    fail('list delivery orders', error);
    const orders = (data || []).map(fromOrder);

    // Cross-verify with inspections table to guarantee complete real-time sync
    try {
      const { data: insList } = await db().from('inspections').select('inspection_id,delivery_id,drone_id,stage,inspection_type,overall_inspection');
      if (Array.isArray(insList) && insList.length > 0) {
        const byOrd = new Map<string, any[]>();
        for (const ins of insList) {
          if (!ins.delivery_id) continue;
          const items = byOrd.get(ins.delivery_id) || [];
          items.push(ins);
          byOrd.set(ins.delivery_id, items);
        }
        for (const ord of orders) {
          const match = byOrd.get(ord.id);
          if (match && match.length > 0) {
            for (const ins of match) {
              const d = String(ins.drone_id || '').trim();
              if (!d) continue;
              const isHub = ins.stage === 'hub_pickup' || ins.inspection_type === 'HUB_PRE_FLIGHT_CHECK';
              const isDepot = ins.stage === 'depot_dispatch' || ins.inspection_type === 'DEPOT_MAINTENANCE';
              if (isHub) {
                ord.hub_inspected_drone_ids = Array.from(new Set([...(ord.hub_inspected_drone_ids || []), d]));
                if (!ord.hub_inspection_id) ord.hub_inspection_id = ins.inspection_id;
              } else if (isDepot) {
                ord.depot_inspected_drone_ids = Array.from(new Set([...(ord.depot_inspected_drone_ids || []), d]));
                if (!ord.depot_inspection_id) ord.depot_inspection_id = ins.inspection_id;
              } else {
                ord.inspected_drone_ids = Array.from(new Set([...(ord.inspected_drone_ids || []), d]));
                if (!ord.inspection_id) ord.inspection_id = ins.inspection_id;
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('[OrdersInspectionMerge] Notice:', e?.message);
    }

    return memoryCache.set('orders:all', orders, 15_000);
  },
  async findOrderById(id: string) {
    if (!id || typeof id !== 'string') return undefined;
    const cleanId = id.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanId) return undefined;
    const { data, error } = await db().from('delivery_orders')
      .select('*')
      .or(`id.eq.${cleanId},challan_number.eq.${cleanId}`)
      .limit(1)
      .maybeSingle();
    fail('find delivery order', error);
    let resolvedOrder = data ? fromOrder(data) : undefined;

    if (!resolvedOrder) {
      const normalized = cleanId.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
      if (normalized) {
        const { data: fuzzyData } = await db().from('delivery_orders')
          .select('*')
          .ilike('id', `%${normalized}%`)
          .limit(1)
          .maybeSingle();
        if (fuzzyData) resolvedOrder = fromOrder(fuzzyData);
      }
    }

    if (resolvedOrder) {
      try {
        const { data: insList } = await db().from('inspections')
          .select('inspection_id,delivery_id,drone_id,stage,inspection_type,overall_inspection')
          .eq('delivery_id', resolvedOrder.id);
        if (Array.isArray(insList) && insList.length > 0) {
          for (const ins of insList) {
            const d = String(ins.drone_id || '').trim();
            if (!d) continue;
            const isHub = ins.stage === 'hub_pickup' || ins.inspection_type === 'HUB_PRE_FLIGHT_CHECK';
            const isDepot = ins.stage === 'depot_dispatch' || ins.inspection_type === 'DEPOT_MAINTENANCE';
            if (isHub) {
              resolvedOrder.hub_inspected_drone_ids = Array.from(new Set([...(resolvedOrder.hub_inspected_drone_ids || []), d]));
              if (!resolvedOrder.hub_inspection_id) resolvedOrder.hub_inspection_id = ins.inspection_id;
            } else if (isDepot) {
              resolvedOrder.depot_inspected_drone_ids = Array.from(new Set([...(resolvedOrder.depot_inspected_drone_ids || []), d]));
              if (!resolvedOrder.depot_inspection_id) resolvedOrder.depot_inspection_id = ins.inspection_id;
            } else {
              resolvedOrder.inspected_drone_ids = Array.from(new Set([...(resolvedOrder.inspected_drone_ids || []), d]));
              if (!resolvedOrder.inspection_id) resolvedOrder.inspection_id = ins.inspection_id;
            }
          }
        }
      } catch (e: any) {
        console.warn('[OrderInspectionLink] Notice:', e?.message);
      }
    }

    return resolvedOrder;
  },
  async addOrder(order: JsonRecord) {
    const { data, error } = await db().from('delivery_orders').insert(toOrder(order)).select('*').single();
    fail('create delivery order', error);
    memoryCache.deletePattern('orders:');
    return fromOrder(data);
  },
  async updateOrder(id: string, updates: JsonRecord) {
    const existing = await this.findOrderById(id);
    if (!existing) return null;
    const { data, error } = await db().from('delivery_orders').update(toOrder({
      ...existing,
      ...updates,
      id: existing.id,
      updated_at: updates.updated_at || new Date().toISOString()
    })).eq('id', existing.id).select('*').maybeSingle();
    fail('update delivery order', error);
    memoryCache.deletePattern('orders:');
    return data ? fromOrder(data) : null;
  },
  async deleteOrder(id: string) {
    const { error } = await db().from('delivery_orders').delete().eq('id', id);
    fail('delete delivery order', error);
    memoryCache.deletePattern('orders:');
    return true;
  },
  async createBooking(order: JsonRecord) {
    const { data, error } = await db().rpc('create_delivery_booking', {
      p_order: toOrder(order),
      p_drone_ids: order.reserved_inventory_ids || []
    });
    fail('reserve inventory and create booking', error);
    memoryCache.deletePattern('orders:');
    return fromOrder(data);
  },
  async cancelBooking(orderId: string, customerId: string, reason: string) {
    const { data, error } = await db().rpc('cancel_delivery_booking', {
      p_order_id: orderId,
      p_customer_id: customerId,
      p_reason: reason
    });
    fail('cancel customer booking', error);
    memoryCache.deletePattern('orders:');
    return fromOrder(data);
  },
  async getDispatchHistory() {
    const cached = memoryCache.get<JsonRecord[]>('dispatch_history:all');
    if (cached) return cached;
    const { data, error } = await db().from('dispatch_history').select('*').order('dispatched_at', { ascending: false });
    fail('list dispatch history', error);
    return memoryCache.set('dispatch_history:all', data || [], 30_000);
  },
  async dispatchBookedDrones(orderId: string, droneIds: string[], dispatcher: JsonRecord) {
    const { data, error } = await db().rpc('dispatch_booked_drones', {
      p_order_id: orderId,
      p_drone_ids: droneIds,
      p_dispatcher: dispatcher
    });
    fail('dispatch booked drones', error);
    memoryCache.deletePattern('orders:');
    memoryCache.deletePattern('dispatch_history:');
    memoryCache.deletePattern('fleet:');
    return data;
  },

  async getFleet() {
    const cached = memoryCache.get<JsonRecord[]>('fleet:all');
    if (cached) return cached;
    const { data, error } = await db().from('drone_fleet').select('*').order('model_name');
    fail('list drone fleet', error);
    const fleet = (data || []).map(fromDrone);
    return memoryCache.set('fleet:all', fleet, 30_000);
  },
  async saveFleet(fleet: JsonRecord[]) {
    if (!fleet.length) return [];
    const rows = await insertInBatches('drone_fleet', fleet.map(toDrone), 'upsert');
    return rows.map(fromDrone);
  },
  async updateDrone(id: string, updates: JsonRecord) {
    const { data: existing, error: readError } = await db().from('drone_fleet').select('*').eq('id', id).maybeSingle();
    fail('find drone', readError);
    if (!existing) return null;
    const drone = { ...fromDrone(existing), ...updates, id };
    const { data, error } = await db().from('drone_fleet').update(toDrone(drone)).eq('id', id).select('*').maybeSingle();
    fail('update drone', error);
    memoryCache.deletePattern('fleet:');
    return data ? fromDrone(data) : null;
  },
  async addDrone(drone: JsonRecord) {
    const { data, error } = await db().from('drone_fleet').insert(toDrone(drone)).select('*').single();
    fail('add drone', error);
    memoryCache.deletePattern('fleet:');
    return fromDrone(data);
  },
  async addDronesBatch(drones: JsonRecord[]) {
    if (!drones.length) return [];
    const rows = await insertInBatches('drone_fleet', drones.map(toDrone), 'insert');
    return rows.map(fromDrone);
  },
  async deleteDrone(id: string) {
    const { error } = await db().from('drone_fleet').delete().eq('id', id);
    fail('delete drone', error);
    memoryCache.deletePattern('fleet:');
    return true;
  },

  async saveOTP(identifier: string, otp: string, meta: JsonRecord = {}) {
    const destination_hash = otpDestinationHash(identifier);
    const { error: expireError } = await db().from('otp_challenges')
      .update({ consumed_at: new Date().toISOString() })
      .eq('destination_hash', destination_hash)
      .is('consumed_at', null);
    fail('replace OTP challenge', expireError);
    const { error } = await db().from('otp_challenges').insert({
      destination_hash,
      otp_hash: otpHash(identifier, otp),
      purpose: meta.purpose || 'login',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      challenge_data: meta
    });
    fail('save OTP challenge', error);
  },
  async verifyOTP(identifier: string, otp: string): Promise<{ valid: boolean; reason?: string; meta?: Record<string, any> }> {
    const cleanOtp = (otp || '').trim();
    if (!cleanOtp) return { valid: false, reason: 'Verification code is required.' };

    const destination_hash = otpDestinationHash(identifier);
    const { data, error } = await db().from('otp_challenges')
      .select('*')
      .eq('destination_hash', destination_hash)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    fail('find OTP challenge', error);
    if (!data) return { valid: false, reason: 'No verification code requested for this destination. Please click Request OTP first.' };

    if (Date.now() > new Date(data.expires_at).getTime()) {
      await db().from('otp_challenges')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', data.id)
        .is('consumed_at', null);
      return { valid: false, reason: 'Verification code has expired. Please request a new one.' };
    }

    const candidate = Buffer.from(otpHash(identifier, cleanOtp));
    const expected = Buffer.from(data.otp_hash || '');
    if (candidate.length !== expected.length || !crypto.timingSafeEqual(candidate, expected)) {
      return { valid: false, reason: 'Invalid verification code. Please check and try again.' };
    }

    await db().from('otp_challenges')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', data.id)
      .is('consumed_at', null);

    return { valid: true, meta: data.challenge_data || { purpose: data.purpose } };
  },

  async getExpertRequests() {
    const { data, error } = await db().from('support_requests').select('*').order('created_at', { ascending: false });
    fail('list support requests', error);
    return (data || []).map(fromSupport);
  },
  async saveExpertRequest(request: JsonRecord) {
    const { data, error } = await db().from('support_requests').insert(toSupport(request)).select('*').single();
    fail('create support request', error);
    return fromSupport(data);
  },
  async updateExpertRequest(id: string, updates: JsonRecord) {
    const { data: existing, error: readError } = await db().from('support_requests').select('*').eq('id', id).maybeSingle();
    fail('find support request', readError);
    if (!existing) return null;
    const { data, error } = await db().from('support_requests')
      .update(toSupport({ ...fromSupport(existing), ...updates, id, updated_at: new Date().toISOString() }))
      .eq('id', id).select('*').maybeSingle();
    fail('update support request', error);
    return data ? fromSupport(data) : null;
  },
  async claimResendWebhookEvent(eventId: string, eventType: string) {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + 2 * 60 * 1000).toISOString();
    const { error: insertError } = await db().from('resend_webhook_events').insert({
      event_id: eventId,
      event_type: eventType,
      status: 'processing',
      lease_expires_at: leaseExpiresAt,
      received_at: now.toISOString()
    });
    if (!insertError) return 'claimed' as const;
    if (insertError.code !== '23505') {
      fail('claim Resend webhook event', insertError);
    }

    const { data: existing, error: readError } = await db().from('resend_webhook_events')
      .select('status,lease_expires_at')
      .eq('event_id', eventId)
      .maybeSingle();
    fail('read Resend webhook event', readError);
    if (!existing) throw new Error('Resend webhook event claim disappeared.');
    if (existing.status === 'processed') return 'duplicate' as const;
    if (existing.status === 'processing' && new Date(existing.lease_expires_at).getTime() > now.getTime()) {
      return 'busy' as const;
    }

    const { data: claimed, error: claimError } = await db().from('resend_webhook_events')
      .update({ status: 'processing', lease_expires_at: leaseExpiresAt, error_code: null })
      .eq('event_id', eventId)
      .eq('status', existing.status)
      .eq('lease_expires_at', existing.lease_expires_at)
      .select('event_id')
      .maybeSingle();
    fail('reclaim Resend webhook event', claimError);
    return claimed ? 'claimed' as const : 'busy' as const;
  },
  async completeResendWebhookEvent(eventId: string) {
    const { error } = await db().from('resend_webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString(), lease_expires_at: new Date().toISOString(), error_code: null })
      .eq('event_id', eventId);
    fail('complete Resend webhook event', error);
  },
  async failResendWebhookEvent(eventId: string, errorCode: string) {
    const { error } = await db().from('resend_webhook_events')
      .update({ status: 'failed', lease_expires_at: new Date().toISOString(), error_code: errorCode })
      .eq('event_id', eventId)
      .eq('status', 'processing');
    fail('fail Resend webhook event', error);
  },
  async getResendWebhookHealth() {
    const { data, error } = await db().from('resend_webhook_events')
      .select('event_type,status,received_at,processed_at')
      .order('received_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    fail('read Resend webhook health', error);
    return data;
  },

  async getFeedbacks() {
    const { data, error } = await db().from('feedbacks').select('*').order('created_at', { ascending: false });
    fail('list feedback', error);
    return (data || []).map(fromFeedback);
  },
  async saveFeedback(feedback: JsonRecord) {
    const { data, error } = await db().from('feedbacks').insert(toFeedback(feedback)).select('*').single();
    fail('save feedback', error);
    return fromFeedback(data);
  },
  async updateFeedback(id: string, updates: JsonRecord) {
    const { data: existing, error: readError } = await db().from('feedbacks').select('*').eq('id', id).maybeSingle();
    fail('find feedback', readError);
    if (!existing) return null;
    const { data, error } = await db().from('feedbacks')
      .update(toFeedback({ ...fromFeedback(existing), ...updates, id, updated_at: new Date().toISOString() }))
      .eq('id', id).select('*').maybeSingle();
    fail('update feedback', error);
    return data ? fromFeedback(data) : null;
  },
  async deleteFeedback(id: string) {
    const { data, error } = await db().from('feedbacks').delete().eq('id', id).select('id').maybeSingle();
    fail('delete feedback', error);
    return Boolean(data);
  },

  // --- 700 RPAV Quality & Post-Delivery Inspection System ---
  async getInspections(filter?: { drone_id?: string; delivery_id?: string; inspection_type?: string; stage?: string }) {
    const mergedMap = new Map<string, any>();

    // 1. Load from Supabase DB
    try {
      let query = db().from('inspections').select('*');
      if (filter?.drone_id) {
        query = query.ilike('drone_id', filter.drone_id.trim());
      }
      if (filter?.delivery_id) {
        query = query.ilike('delivery_id', filter.delivery_id.trim());
      }
      if (filter?.inspection_type) {
        query = query.eq('inspection_type', filter.inspection_type.trim().toUpperCase());
      }
      const { data, error } = await query.order('inspected_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item?.inspection_id) mergedMap.set(item.inspection_id, item);
        });
      }
    } catch {
      // Fallback to file storage if database table is not yet migrated
    }

    // 2. Load from file storage
    const fileRecords = loadInspectionsFromFile();
    fileRecords.forEach((item: any) => {
      const key = item?.inspection_id;
      if (key && !mergedMap.has(key)) {
        mergedMap.set(key, item);
      }
    });

    // 3. Synthesize any completed order inspections from database orders
    try {
      const orders = await this.getOrders();
      orders.forEach((ord: any) => {
        // Hub Pre-Acceptance Inspection (for EVERY inspected airframe in the consignment)
        if (ord.hub_inspection_id || (Array.isArray(ord.hub_inspected_drone_ids) && ord.hub_inspected_drone_ids.length > 0)) {
          const hubDrones: string[] = Array.from(new Set([
            ...(Array.isArray(ord.hub_inspected_drone_ids) ? ord.hub_inspected_drone_ids : []),
            ...(Array.isArray(ord.reserved_inventory_ids) ? ord.reserved_inventory_ids : []),
            ...(ord.drone_id ? [ord.drone_id] : [])
          ])).filter(Boolean);

          const fallbackHubList = hubDrones.length > 0 ? hubDrones : ['INW-700RPAV'];

          fallbackHubList.forEach((dId: string) => {
            const key = `${ord.hub_inspection_id || 'HUB'}-${dId}`;
            if (!mergedMap.has(key)) {
              const hubReports = ord.delivery_data?.hub_inspections || {};
              const generalReport = ord.post_delivery_inspection || ord.delivery_data?.post_delivery_inspection || {};
              const droneReport = hubReports[dId] || generalReport;
              const photos = [...(droneReport.photo_references || droneReport.photos || [])];
              const videos = [...(droneReport.video_references || droneReport.videos || [])];
              const mediaEvidence = [...(droneReport.media_evidence || [])];

              if (Array.isArray(mediaEvidence)) {
                mediaEvidence.forEach((m: any) => {
                  if (m?.type === 'video' && m?.uri && !videos.includes(m.uri)) videos.push(m.uri);
                  else if (m?.uri && !photos.includes(m.uri)) photos.push(m.uri);
                });
              }

              mergedMap.set(key, {
                inspection_id: key,
                inspection_type: 'HUB_PRE_FLIGHT_CHECK',
                stage: 'hub_pickup',
                drone_id: dId,
                delivery_id: ord.id,
                cargo_bay_condition: droneReport.cargo_bay_condition || 'SECURE_LATCHED',
                landing_surface: droneReport.landing_surface || 'DEPOT_PAD',
                propeller_debris_check: droneReport.propeller_debris_check || 'SPINS_FREE_NO_DEBRIS',
                zero_defect_certified: true,
                overall_inspection: droneReport.overall_inspection || 'PASSED',
                remarks: droneReport.remarks || `Hub Pre-Acceptance Inspection certified for Airframe ${dId} under Order #${ord.order_number || ord.id}`,
                photo_references: photos,
                video_references: videos,
                media_evidence: mediaEvidence,
                inspected_at: droneReport.inspected_at || ord.assigned_at || ord.created_at || new Date().toISOString(),
                inspector_name: ord.pilot_name || 'Delivery Partner',
                inspector_role: 'delivery'
              });
            }
          });
        }

        // Customer Handover Inspection (for EVERY delivered airframe in the consignment)
        if (ord.inspection_id || ord.status === 'delivered' || ord.status === 'completed' || (Array.isArray(ord.inspected_drone_ids) && ord.inspected_drone_ids.length > 0)) {
          const custDrones: string[] = Array.from(new Set([
            ...(Array.isArray(ord.inspected_drone_ids) ? ord.inspected_drone_ids : []),
            ...(Array.isArray(ord.reserved_inventory_ids) ? ord.reserved_inventory_ids : []),
            ...(ord.drone_id ? [ord.drone_id] : [])
          ])).filter(Boolean);

          const fallbackCustList = custDrones.length > 0 ? custDrones : ['INW-700RPAV'];

          fallbackCustList.forEach((dId: string) => {
            const key = `${ord.inspection_id || 'DEL'}-${dId}`;
            if (!mergedMap.has(key)) {
              const custReports = ord.delivery_data?.customer_inspections || {};
              const generalCustReport = ord.post_delivery_inspection || ord.delivery_data?.post_delivery_inspection || {};
              const droneReport = custReports[dId] || generalCustReport;
              const photos = [...(droneReport.photo_references || droneReport.photos || (ord.delivery_data?.pod_photo ? [ord.delivery_data.pod_photo] : []))];
              const videos = [...(droneReport.video_references || droneReport.videos || [])];
              const mediaEvidence = [...(droneReport.media_evidence || [])];

              if (Array.isArray(mediaEvidence)) {
                mediaEvidence.forEach((m: any) => {
                  if (m?.type === 'video' && m?.uri && !videos.includes(m.uri)) videos.push(m.uri);
                  else if (m?.uri && !photos.includes(m.uri)) photos.push(m.uri);
                });
              }

              mergedMap.set(key, {
                inspection_id: key,
                inspection_type: 'DELIVERY_PERSON_CHECK',
                stage: 'customer_delivery',
                drone_id: dId,
                delivery_id: ord.id,
                cargo_bay_condition: droneReport.cargo_bay_condition || 'CLEAN_RELEASE',
                landing_surface: droneReport.landing_surface || 'SAFE_FLAT',
                propeller_debris_check: droneReport.propeller_debris_check || 'SPINS_FREE_NO_DEBRIS',
                zero_defect_certified: true,
                overall_inspection: ord.drone_inspection_status || droneReport.overall_inspection || 'PASSED',
                remarks: droneReport.remarks || `Customer Handover Inspection passed for Airframe ${dId} under Order #${ord.order_number || ord.id}`,
                photo_references: photos,
                video_references: videos,
                media_evidence: mediaEvidence,
                inspected_at: ord.delivered_at || ord.completed_at || new Date().toISOString(),
                inspector_name: ord.pilot_name || 'Delivery Partner',
                inspector_role: 'delivery'
              });
            }
          });
        }
      });
    } catch {}

    let filtered = Array.from(mergedMap.values());
    if (filter?.drone_id) {
      const targetDrone = String(filter.drone_id).toLowerCase().trim();
      filtered = filtered.filter(i => String(i.drone_id || '').toLowerCase().trim() === targetDrone);
    }
    if (filter?.delivery_id) {
      const targetDelivery = String(filter.delivery_id).toLowerCase().trim();
      filtered = filtered.filter(i => String(i.delivery_id || '').toLowerCase().trim() === targetDelivery);
    }
    if (filter?.inspection_type) {
      const targetType = String(filter.inspection_type).toUpperCase().trim();
      filtered = filtered.filter(i => String(i.inspection_type || '').toUpperCase().trim() === targetType);
    }
    if (filter?.stage) {
      const targetStage = String(filter.stage).toLowerCase().trim();
      filtered = filtered.filter(i => String(i.stage || '').toLowerCase().trim() === targetStage);
    }
    return filtered.sort((a, b) => new Date(b.inspected_at).getTime() - new Date(a.inspected_at).getTime());
  },

  async saveInspection(inspection: JsonRecord) {
    const id = inspection.inspection_id || `INS-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();
    const role = String(inspection.inspector_role || 'dispatcher').toLowerCase();
    const isDeliveryPerson = role === 'delivery' || role === 'pilot';
    const inspectionType = inspection.inspection_type || (isDeliveryPerson ? 'DELIVERY_PERSON_CHECK' : 'DEPOT_MAINTENANCE');
    const stage = inspection.stage || (
      inspectionType === 'HUB_PRE_FLIGHT_CHECK' || inspectionType === 'pre-flight'
        ? 'hub_pickup'
        : (['admin', 'dispatcher', 'fleet_manager'].includes(role) || inspectionType === 'DEPOT_MAINTENANCE'
            ? 'depot_dispatch'
            : 'customer_delivery')
    );

    const record = {
      inspection_id: id,
      inspection_type: inspectionType, // 'HUB_PRE_FLIGHT_CHECK' | 'DELIVERY_PERSON_CHECK' | 'DEPOT_MAINTENANCE'
      stage, // 'hub_pickup' | 'customer_delivery' | 'depot_dispatch'
      drone_id: String(inspection.drone_id || '').trim(),
      delivery_id: String(inspection.delivery_id || '').trim() || null,

      // === Delivery Person Specific Field Verification Details ===
      cargo_bay_condition: inspection.cargo_bay_condition || (isDeliveryPerson ? 'CLEAN_RELEASE' : 'NOT_INSPECTED'),
      landing_surface: inspection.landing_surface || (isDeliveryPerson ? 'SAFE_FLAT' : 'NOT_INSPECTED'),
      propeller_debris_check: inspection.propeller_debris_check || (isDeliveryPerson ? 'SPINS_FREE_NO_DEBRIS' : 'NOT_INSPECTED'),
      field_battery_level: typeof inspection.field_battery_level === 'number' ? inspection.field_battery_level : null,
      zero_defect_certified: typeof inspection.zero_defect_certified === 'boolean' ? inspection.zero_defect_certified : (isDeliveryPerson ? true : false),
      delivery_handover_notes: inspection.delivery_handover_notes || inspection.remarks || '',

      // === Dispatcher & Fleet Manager Depot Technical Inspection Details ===
      body_condition: inspection.body_condition || (isDeliveryPerson ? 'GOOD' : 'NOT_INSPECTED'),
      propeller_condition: inspection.propeller_condition || (isDeliveryPerson ? 'GOOD' : 'NOT_INSPECTED'),
      battery_condition: inspection.battery_condition || (isDeliveryPerson ? 'NORMAL' : 'NOT_INSPECTED'),
      landing_gear_condition: inspection.landing_gear_condition || (isDeliveryPerson ? 'GOOD' : 'NOT_INSPECTED'),
      depot_avionics_cleared: typeof inspection.depot_avionics_cleared === 'boolean' ? inspection.depot_avionics_cleared : true,
      ready_for_next_sortie: typeof inspection.ready_for_next_sortie === 'boolean' ? inspection.ready_for_next_sortie : true,

      overall_inspection: inspection.overall_inspection || 'PASSED',
      remarks: inspection.remarks || '',
      photo_references: Array.isArray(inspection.photo_references) ? inspection.photo_references : [],
      video_references: Array.isArray(inspection.video_references) ? inspection.video_references : [],
      media_evidence: Array.isArray(inspection.media_evidence) ? inspection.media_evidence : [],
      inspected_at: inspection.inspected_at || now,
      inspected_by: inspection.inspected_by || 'system',
      inspector_name: inspection.inspector_name || (isDeliveryPerson ? 'Delivery Partner' : 'Operations Inspector'),
      inspector_role: role
    };

    // 1. Save to append-only persistent storage (File)
    appendInspectionToFile(record);

    // 2. Persist to Supabase public.inspections table
    try {
      await db().from('inspections').upsert({
        inspection_id: record.inspection_id,
        inspection_type: record.inspection_type,
        drone_id: record.drone_id,
        delivery_id: record.delivery_id,
        cargo_bay_condition: record.cargo_bay_condition,
        landing_surface: record.landing_surface,
        propeller_debris_check: record.propeller_debris_check,
        field_battery_level: record.field_battery_level,
        zero_defect_certified: record.zero_defect_certified,
        delivery_handover_notes: record.delivery_handover_notes,
        body_condition: record.body_condition,
        propeller_condition: record.propeller_condition,
        battery_condition: record.battery_condition,
        landing_gear_condition: record.landing_gear_condition,
        depot_avionics_cleared: record.depot_avionics_cleared,
        ready_for_next_sortie: record.ready_for_next_sortie,
        overall_inspection: record.overall_inspection,
        remarks: record.remarks,
        photo_references: record.photo_references,
        inspected_by: record.inspected_by,
        inspector_name: record.inspector_name,
        inspector_role: record.inspector_role,
        inspected_at: record.inspected_at
      });
    } catch (insTableErr: any) {
      console.warn('[InspectionsDB] Non-blocking DB upsert notice:', insTableErr?.message);
    }

    // 3. Log to Supabase audit_logs (append-only compliance)
    try {
      await db().from('audit_logs').insert({
        user_email: record.inspected_by,
        role: record.inspector_role,
        action: isDeliveryPerson ? 'DELIVERY_FIELD_INSPECTION' : 'DEPOT_MAINTENANCE_INSPECTION',
        resource: `${record.drone_id} (${record.inspection_type})`,
        severity: record.overall_inspection === 'PASSED' ? 'INFO' : 'WARN',
        timestamp: now
      });
    } catch (auditErr: any) {
      console.warn('[AuditLog] Non-blocking audit log warning:', auditErr?.message);
    }

    // 3. State Transition for Drone Master:
    // If PASSED -> status: 'ready' (AVAILABLE), current_condition: 'GOOD', is_verified: true
    // If FAILED -> status: 'maintenance', current_condition: 'NEEDS_REVIEW'
    try {
      const isPassed = record.overall_inspection === 'PASSED';
      const droneStatus = isPassed ? 'ready' : 'maintenance';
      const currentCondition = isPassed ? 'GOOD' : 'NEEDS_REVIEW';
      await this.updateDrone(record.drone_id, {
        status: droneStatus,
        current_condition: currentCondition,
        last_inspection_id: id,
        last_inspection_type: record.inspection_type,
        last_inspection_result: record.overall_inspection,
        last_inspected_at: now,
        is_verified: isPassed,
        verification_status: isPassed ? 'verified' : 'unverified',
        qc_status: isPassed ? 'passed' : 'failed'
      });
    } catch (droneErr: any) {
      console.warn('[DroneUpdate] Non-blocking drone update warning:', droneErr?.message);
    }

    // 4. Update order if delivery_id is linked
    if (record.delivery_id) {
      try {
        const order = await this.findOrderById(record.delivery_id);
        if (order) {
          const cleanDrone = String(record.drone_id || '').trim();
          const isHub = stage === 'hub_pickup' || record.inspection_type === 'HUB_PRE_FLIGHT_CHECK';
          const isDepot = stage === 'depot_dispatch' || stage === 'depot' || record.inspection_type === 'DEPOT_MAINTENANCE';

          const prevInspected = Array.isArray(order.inspected_drone_ids) ? order.inspected_drone_ids : [];
          const prevHub = Array.isArray(order.hub_inspected_drone_ids) ? order.hub_inspected_drone_ids : [];
          const prevDepot = Array.isArray(order.depot_inspected_drone_ids) ? order.depot_inspected_drone_ids : [];

          const updatedHub = isHub && cleanDrone ? Array.from(new Set([...prevHub, cleanDrone])) : prevHub;
          const updatedDepot = isDepot && cleanDrone ? Array.from(new Set([...prevDepot, cleanDrone])) : prevDepot;
          const updatedInspected = (!isHub && !isDepot && cleanDrone) ? Array.from(new Set([...prevInspected, cleanDrone])) : prevInspected;

          const orderUpdates: JsonRecord = {
            inspection_id: id,
            inspection_status: record.overall_inspection,
            post_delivery_inspection: record,
            inspected_drone_ids: updatedInspected,
            hub_inspected_drone_ids: updatedHub,
            depot_inspected_drone_ids: updatedDepot,
          };

          if (isHub) orderUpdates.hub_inspection_id = id;
          if (isDepot) orderUpdates.depot_inspection_id = id;

          await this.updateOrder(record.delivery_id, orderUpdates);
        }
      } catch (orderErr: any) {
        console.warn('[OrderUpdate] Non-blocking order inspection warning:', orderErr?.message);
      }
    }

    memoryCache.deletePattern('fleet:');
    memoryCache.deletePattern('orders:');
    memoryCache.deletePattern('inspections:');
    return record;
  },

  async getInspectionStats() {
    const all = await this.getInspections();
    const passedCount = all.filter(i => i.overall_inspection === 'PASSED').length;
    const failedOrPendingCount = all.filter(i => i.overall_inspection !== 'PASSED').length;

    const deliveryChecks = all.filter(i => i.inspection_type === 'DELIVERY_PERSON_CHECK');
    const depotChecks = all.filter(i => i.inspection_type === 'DEPOT_MAINTENANCE' || !i.inspection_type);

    return {
      passedCount,
      failedOrPendingCount,
      totalCount: all.length,
      deliveryPersonChecks: {
        total: deliveryChecks.length,
        passed: deliveryChecks.filter(i => i.overall_inspection === 'PASSED').length,
        defectReported: deliveryChecks.filter(i => i.overall_inspection !== 'PASSED').length,
        zeroDefectCertifiedCount: deliveryChecks.filter(i => i.zero_defect_certified === true).length
      },
      depotMaintenanceChecks: {
        total: depotChecks.length,
        passed: depotChecks.filter(i => i.overall_inspection === 'PASSED').length,
        maintenanceRequired: depotChecks.filter(i => i.overall_inspection !== 'PASSED').length
      }
    };
  }
};
