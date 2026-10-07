import crypto from 'crypto';
import { supabase } from './supabase.js';

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
    speed_kmh: Number(max_speed_kmh || 0),
    payload_kg: Number(payload_capacity_kg || 0),
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
  const isVerified = drone.is_verified === true || drone.verification_status === 'verified';
  return {
    id: row.id,
    model_name: row.model || 'Cyberone Pro',
    category: row.category || metadata.category || 'General UAV',
    serial_number: row.serial_number || row.id,
    status: row.status || 'idle',
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
  'cancellation_reason', 'delivered_at', 'created_at', 'updated_at'
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
  return {
    ...(profile_data || {}),
    ...columns,
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
  return {
    id: row.id,
    name: row.name,
    email: String(row.email || '').toLowerCase(),
    phone: row.phone || null,
    role: row.role,
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
    if (!id) return undefined;
    const { data, error } = await db().from('delivery_orders').select('*').eq('id', id).maybeSingle();
    fail('find delivery order', error);
    if (data) return fromOrder(data);
    const normalized = id.toLowerCase().replace(/-/g, '');
    return (await this.getOrders()).find(order => String(order.id).toLowerCase().replace(/-/g, '') === normalized);
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
  async verifyOTP(identifier: string, otp: string) {
    const destination_hash = otpDestinationHash(identifier);
    const { data, error } = await db().from('otp_challenges')
      .select('*')
      .eq('destination_hash', destination_hash)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    fail('find OTP challenge', error);
    if (!data) return { valid: false, reason: 'No verification code requested for this destination' };
    if (Date.now() > new Date(data.expires_at).getTime()) {
      const { error: expireError } = await db().from('otp_challenges')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', data.id)
        .is('consumed_at', null);
      fail('expire OTP challenge', expireError);
      return { valid: false, reason: 'Verification code has expired. Please request a new one.' };
    }
    const candidate = Buffer.from(otpHash(identifier, otp));
    const expected = Buffer.from(data.otp_hash || '');
    if (candidate.length !== expected.length || !crypto.timingSafeEqual(candidate, expected)) {
      return { valid: false, reason: 'Invalid verification code. Please check and try again.' };
    }
    const { data: consumed, error: consumeError } = await db().from('otp_challenges')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', data.id)
      .is('consumed_at', null)
      .select('id')
      .maybeSingle();
    fail('consume OTP challenge', consumeError);
    if (!consumed) return { valid: false, reason: 'This verification code has already been used.' };
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
  }
};
