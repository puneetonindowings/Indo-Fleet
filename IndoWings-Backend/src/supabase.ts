import './env.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, DroneItem, MissionItem, AuditLogItem, DemoRequestItem } from './types.js';

const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();
const placeholderPattern = /^(?:YOUR_|PLACEHOLDER|your-|replace-with-)/i;

function getConfigurationError(): string | null {
  if (!supabaseUrl) return 'SUPABASE_URL is missing from IndoFleet-Backend/.env.';
  try {
    const parsedUrl = new URL(supabaseUrl);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
      return 'SUPABASE_URL must use HTTPS (except for localhost development).';
    }
  } catch {
    return 'SUPABASE_URL is not a valid URL.';
  }

  if (!supabaseKey || placeholderPattern.test(supabaseKey)) {
    return 'SUPABASE_SERVICE_ROLE_KEY is missing or still a placeholder in IndoFleet-Backend/.env.';
  }

  const tokenPayload = supabaseKey.split('.')[1];
  if (tokenPayload) {
    try {
      const claims = JSON.parse(Buffer.from(tokenPayload, 'base64url').toString('utf8'));
      if (claims.role === 'anon') {
        return 'SUPABASE_SERVICE_ROLE_KEY contains an anon key. Use the server-only service-role/secret key.';
      }
      const projectRef = String(claims.ref || '');
      const host = new URL(supabaseUrl).hostname;
      if (projectRef && host.endsWith('.supabase.co') && host !== `${projectRef}.supabase.co`) {
        return 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY belong to different Supabase projects.';
      }
    } catch {
      return 'SUPABASE_SERVICE_ROLE_KEY is not a valid Supabase key.';
    }
  }

  return null;
}

const configurationError = getConfigurationError();

export const isSupabaseConfigured = configurationError === null;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

function client(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the backend environment.');
  }
  return supabase;
}

export async function verifySupabaseConnection(): Promise<void> {
  if (!supabaseUrl) {
    throw new Error(configurationError || 'SUPABASE_URL is missing from IndoFleet-Backend/.env.');
  }

  const healthUrl = `${supabaseUrl}/rest/v1/`;
  try {
    await fetch(healthUrl, {
      headers: anonKey ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` } : {},
      signal: AbortSignal.timeout(10000)
    });
  } catch (error) {
    const cause = error instanceof Error && 'cause' in error ? error.cause : undefined;
    const causeCode = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
    const detail =
      causeCode === 'ENOTFOUND'
        ? `DNS could not find ${new URL(supabaseUrl).hostname}. Check that the project URL was copied correctly and the Supabase project is active.`
        : causeCode === 'ECONNREFUSED'
          ? `Connection to ${new URL(supabaseUrl).hostname} was refused.`
          : causeCode === 'ETIMEDOUT' || causeCode === 'UND_ERR_CONNECT_TIMEOUT'
            ? `Connection to ${new URL(supabaseUrl).hostname} timed out.`
            : error instanceof Error
              ? error.message
              : String(error);
    throw new Error(`Cannot reach Supabase at ${healthUrl}: ${detail}`);
  }

  if (configurationError) {
    throw new Error(configurationError);
  }

  const requiredSchema = [
    { table: 'profiles', columns: 'id' },
    { table: 'drone_fleet', columns: 'id,model_name,category,serial_number,status,battery_pct,flight_hours,max_range_km,endurance_mins,max_speed_kmh,payload_capacity_kg,image_url,delivery_data' },
    { table: 'missions', columns: 'id' },
    { table: 'audit_logs', columns: 'id' },
    { table: 'demo_requests', columns: 'id' },
    {
      table: 'delivery_users',
      columns: 'id,name,email,phone,role,station,organization,status,password_hash,must_change_password,saved_addresses,is_email_verified,is_phone_verified,profile_data,authorized_by'
    },
    { table: 'customer_addresses', columns: 'id' },
    {
      table: 'delivery_orders',
      columns:
        'id,order_type,challan_number,creator_id,customer_name,client_name,customer_email,customer_phone,recipient_name,recipient_phone,is_for_someone_else,delivery_notes,pickup_address,drop_address,destination_address,address_id,package_type,drones_shipped,drone_model,units_count,carrier,weight_kg,fare_inr,payment_id,payment_status,payment_method,aerial_distance_km,flight_duration_mins,status,drone_id,scheduled_time,estimated_delivery,items,reserved_inventory_ids,timeline,handover_details,feedback_submitted,cancelled_at,cancellation_reason,delivered_at,delivery_data'
    },
    { table: 'support_requests', columns: 'id,customer_id,name,email,phone,order_id,category,priority,preferred_time,message,status,resolution_notes,call_logs,request_data' },
    { table: 'feedbacks', columns: 'id,customer_id,user_name,user_email,drone_name,order_id,rating,category,message,verified_order,status,feedback_data' },
    { table: 'otp_challenges', columns: 'id,destination_hash,otp_hash,purpose,challenge_data,expires_at,consumed_at' },
    { table: 'dispatch_history', columns: 'id,order_id,client_id,client_name,drone_id,drone_model,dispatcher_id,dispatcher_name,dispatcher_role,status,otp_verified,dispatched_at' }
  ];
  const checks = await Promise.all(
    requiredSchema.map(async ({ table, columns }) => {
      const { error } = await client().from(table).select(columns).limit(0);
      return { table, columns, error };
    })
  );
  const failed = checks.find((check) => check.error);
  if (failed?.error) {
    const message = failed.error.message;
    if (/fetch failed|network|timeout/i.test(message)) {
      throw new Error(`Supabase responded to the network check, but the database request failed: ${message}. Check the service-role key and project API settings.`);
    }
    throw new Error(`Supabase schema check failed for ${failed.table} (${failed.columns}): ${message}`);
  }
  console.log('Supabase connection and delivery schema verified:', supabaseUrl);
}

function assertSuccess(operation: string, error: { message: string } | null): void {
  if (error) {
    throw new Error(`Supabase ${operation} failed: ${error.message}`);
  }
}

export const dbService = {
  async getProfileByEmail(email: string): Promise<UserProfile | null> {
    const { data, error } = await client().from('profiles').select('*').eq('email', email).maybeSingle();
    assertSuccess('profile lookup', error);
    return data as UserProfile | null;
  },

  async getAllProfiles(): Promise<UserProfile[]> {
    const { data, error } = await client().from('profiles').select('*');
    assertSuccess('profile listing', error);
    return (data || []) as UserProfile[];
  },

  async getFleet(): Promise<DroneItem[]> {
    const { data, error } = await client().from('drone_fleet').select('*').order('model_name');
    assertSuccess('fleet listing', error);
    return (data || []) as DroneItem[];
  },

  async addDrone(drone: Omit<DroneItem, 'id'>): Promise<DroneItem> {
    const { data, error } = await client().from('drone_fleet').insert([drone]).select().single();
    assertSuccess('add drone', error);
    return data as DroneItem;
  },

  async getMissions(): Promise<MissionItem[]> {
    const { data, error } = await client().from('missions').select('*').order('created_at', { ascending: false });
    assertSuccess('mission listing', error);
    return (data || []) as MissionItem[];
  },

  async createMission(mission: Omit<MissionItem, 'id' | 'created_at'>): Promise<MissionItem> {
    const { data, error } = await client().from('missions').insert([mission]).select().single();
    assertSuccess('create mission', error);
    return data as MissionItem;
  },

  async updateMissionStatus(id: string, status: MissionItem['status']): Promise<MissionItem | null> {
    const { data, error } = await client().from('missions').update({ status }).eq('id', id).select().maybeSingle();
    assertSuccess('update mission', error);
    return data as MissionItem | null;
  },

  async getAuditLogs(): Promise<AuditLogItem[]> {
    const { data, error } = await client().from('audit_logs').select('*').order('timestamp', { ascending: false });
    assertSuccess('audit log listing', error);
    return (data || []) as AuditLogItem[];
  },

  async logAudit(entry: Omit<AuditLogItem, 'id' | 'timestamp'>): Promise<AuditLogItem> {
    const { data, error } = await client().from('audit_logs').insert([entry]).select().single();
    assertSuccess('write audit log', error);
    return data as AuditLogItem;
  },

  async saveDemoRequest(request: Omit<DemoRequestItem, 'id' | 'created_at'>): Promise<DemoRequestItem> {
    const { data, error } = await client().from('demo_requests').insert([request]).select().single();
    assertSuccess('save demo request', error);
    return data as DemoRequestItem;
  }
};

