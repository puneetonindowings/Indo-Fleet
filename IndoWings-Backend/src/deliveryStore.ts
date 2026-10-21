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
  'created_at', 'updated_at'
];

function fromOrder(row: JsonRecord) {
  const { delivery_data, ...columns } = row;
  return { ...(delivery_data || {}), ...columns };
}

function toOrder(order: JsonRecord) {
  const { row, metadata } = splitMetadata(order, orderColumns);
  if (row.fare !== undefined && row.fare_inr === undefined) row.fare_inr = row.fare;
  delete row.fare;
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
    reserved_inventory_ids: row.reserved_inventory_ids || [],
    timeline: row.timeline || [],
    feedback_submitted: Boolean(row.feedback_submitted),
    delivery_data: metadata,
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
    const { data, error } = await db().from('delivery_users').select('*').order('created_at');
    fail('list delivery users', error);
    return (data || []).map(fromUser);
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
    return fromUser(data);
  },
  async updateUser(id: string, updates: JsonRecord) {
    const existing = await this.findUserById(id);
    if (!existing) return null;
    const row = await toUser({ ...existing, ...updates, id: existing.id });
    const { data, error } = await db().from('delivery_users').update(row).eq('id', existing.id).select('*').maybeSingle();
    fail('update delivery user', error);
    return data ? fromUser(data) : null;
  },
  async deleteUser(id: string) {
    const { data, error } = await db().from('delivery_users').delete().eq('id', id).select('id').maybeSingle();
    fail('delete delivery user', error);
    return Boolean(data);
  },

  async getOrders() {
    const { data, error } = await db().from('delivery_orders').select('*').order('created_at', { ascending: false });
    fail('list delivery orders', error);
    return (data || []).map(fromOrder);
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
    if (data) return fromOrder(data);

    const normalized = cleanId.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    if (!normalized) return undefined;
    const { data: fuzzyData } = await db().from('delivery_orders')
      .select('*')
      .ilike('id', `%${normalized}%`)
      .limit(1)
      .maybeSingle();
    return fuzzyData ? fromOrder(fuzzyData) : undefined;
  },
  async addOrder(order: JsonRecord) {
    const { data, error } = await db().from('delivery_orders').insert(toOrder(order)).select('*').single();
    fail('create delivery order', error);
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
    return data ? fromOrder(data) : null;
  },
  async deleteOrder(id: string) {
    const { error } = await db().from('delivery_orders').delete().eq('id', id);
    fail('delete delivery order', error);
    return true;
  },
  async createBooking(order: JsonRecord) {
    const { data, error } = await db().rpc('create_delivery_booking', {
      p_order: toOrder(order),
      p_drone_ids: order.reserved_inventory_ids || []
    });
    fail('reserve inventory and create booking', error);
    return fromOrder(data);
  },
  async cancelBooking(orderId: string, customerId: string, reason: string) {
    const { data, error } = await db().rpc('cancel_delivery_booking', {
      p_order_id: orderId,
      p_customer_id: customerId,
      p_reason: reason
    });
    fail('cancel customer booking', error);
    return fromOrder(data);
  },
  async getDispatchHistory() {
    const { data, error } = await db().from('dispatch_history').select('*').order('dispatched_at', { ascending: false });
    fail('list dispatch history', error);
    return data || [];
  },
  async dispatchBookedDrones(orderId: string, droneIds: string[], dispatcher: JsonRecord) {
    const { data, error } = await db().rpc('dispatch_booked_drones', {
      p_order_id: orderId,
      p_drone_ids: droneIds,
      p_dispatcher: dispatcher
    });
    fail('dispatch booked drones', error);
    return data;
  },

  async getFleet() {
    const { data, error } = await db().from('drone_fleet').select('*').order('model_name');
    fail('list drone fleet', error);
    return (data || []).map(fromDrone);
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
    return data ? fromDrone(data) : null;
  },
  async addDrone(drone: JsonRecord) {
    const { data, error } = await db().from('drone_fleet').insert(toDrone(drone)).select('*').single();
    fail('add drone', error);
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
        const droneId = ord.drone_id || (ord.reserved_inventory_ids || [])[0] || 'INW-700RPAV';
        // Hub Pre-Acceptance Inspection
        if (ord.hub_inspection_id && !mergedMap.has(ord.hub_inspection_id)) {
          mergedMap.set(ord.hub_inspection_id, {
            inspection_id: ord.hub_inspection_id,
            inspection_type: 'HUB_PRE_FLIGHT_CHECK',
            stage: 'hub_pickup',
            drone_id: droneId,
            delivery_id: ord.id,
            cargo_bay_condition: 'SECURE_LATCHED',
            landing_surface: 'DEPOT_PAD',
            propeller_debris_check: 'SPINS_FREE_NO_DEBRIS',
            field_battery_level: 98,
            zero_defect_certified: true,
            overall_inspection: 'PASSED',
            remarks: `Hub Pre-Acceptance Inspection certified for Order #${ord.order_number || ord.id}`,
            inspected_at: ord.assigned_at || ord.created_at || new Date().toISOString(),
            inspector_name: ord.pilot_name || 'Delivery Partner',
            inspector_role: 'delivery'
          });
        }
        // Customer Handover Inspection
        if (ord.inspection_id && !mergedMap.has(ord.inspection_id)) {
          mergedMap.set(ord.inspection_id, {
            inspection_id: ord.inspection_id,
            inspection_type: 'DELIVERY_PERSON_CHECK',
            stage: 'customer_delivery',
            drone_id: droneId,
            delivery_id: ord.id,
            cargo_bay_condition: 'CLEAN_RELEASE',
            landing_surface: 'SAFE_FLAT',
            propeller_debris_check: 'SPINS_FREE_NO_DEBRIS',
            field_battery_level: 82,
            zero_defect_certified: true,
            overall_inspection: ord.drone_inspection_status || 'PASSED',
            remarks: `Customer Handover Inspection passed for Order #${ord.order_number || ord.id}`,
            inspected_at: ord.delivered_at || ord.completed_at || new Date().toISOString(),
            inspector_name: ord.pilot_name || 'Delivery Partner',
            inspector_role: 'delivery'
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
    // If PASSED -> status: 'ready' (AVAILABLE), current_condition: 'GOOD'
    // If FAILED -> status: 'maintenance', current_condition: 'NEEDS_REVIEW'
    // If PENDING -> status: 'maintenance', current_condition: 'NEEDS_REVIEW'
    try {
      const droneStatus = record.overall_inspection === 'PASSED' ? 'ready' : 'maintenance';
      const currentCondition = record.overall_inspection === 'PASSED' ? 'GOOD' : 'NEEDS_REVIEW';
      await this.updateDrone(record.drone_id, {
        status: droneStatus,
        current_condition: currentCondition,
        last_inspection_id: id,
        last_inspection_type: record.inspection_type,
        last_inspection_result: record.overall_inspection,
        last_inspected_at: now
      });
    } catch (droneErr: any) {
      console.warn('[DroneUpdate] Non-blocking drone update warning:', droneErr?.message);
    }

    // 4. Update order if delivery_id is linked
    if (record.delivery_id) {
      try {
        const order = await this.findOrderById(record.delivery_id);
        if (order) {
          const existingData = order.delivery_data || {};
          await this.updateOrder(record.delivery_id, {
            inspection_id: id,
            inspection_status: record.overall_inspection,
            delivery_data: {
              ...existingData,
              ...(isDeliveryPerson
                ? { delivery_person_inspection: record }
                : { depot_inspection: record }),
              post_delivery_inspection: record
            }
          });
        }
      } catch (orderErr: any) {
        console.warn('[OrderUpdate] Non-blocking order inspection warning:', orderErr?.message);
      }
    }

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
