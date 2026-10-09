export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'fleet_manager' | 'dispatcher' | 'support' | 'customer';
  organization: string;
  badge_id: string;
}

export interface DroneItem {
  id: string;
  model_name?: string;
  model?: string;
  category?: string;
  serial_number: string;
  status: 'ready' | 'in-flight' | 'maintenance' | 'standby' | 'idle' | string;
  battery_pct?: number;
  battery?: number;
  flight_hours?: number;
  max_range_km?: number;
  endurance_mins?: number;
  max_speed_kmh?: number;
  payload_capacity_kg?: number;
  payload_kg?: number;
  image_url: string;
  is_verified?: boolean;
  verification_status?: 'verified' | 'unverified';
  qc_status?: 'passed' | 'inspection_required' | 'pending' | string;
  qc_notes?: string;
  qc_certified_by?: string;
  current_city?: string;
  created_at?: string;
}

export interface MissionItem {
  id: string;
  title: string;
  operator_email: string;
  drone_model: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'ABORTED';
  location_name: string;
  area_hectares: number;
  altitude_meters: number;
  waypoints?: Array<{ lat: number; lng: number; alt: number }>;
  created_at?: string;
}

export interface AuditLogItem {
  id: string;
  user_email: string;
  role: string;
  action: string;
  resource: string;
  ip_address: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  timestamp: string;
}

export interface SavedAddress {
  id: string;
  label: 'Home' | 'Work' | 'Office' | 'Warehouse' | 'Other';
  recipient_name?: string;
  recipient_phone?: string;
  full_address: string;
  landmark?: string;
  city?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
}

export interface DeliveryUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'fleet_manager' | 'dispatcher' | 'customer' | 'support' | 'delivery' | 'pilot';
  station?: string;
  organization?: string;
  status?: string;
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  dl_id?: string;
  vehicle_id?: string;
  saved_addresses?: SavedAddress[];
}

export interface OrderTimeline {
  step: string;
  time: string | null;
  done: boolean;
}

export interface DeliveryOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_address: string;
  drop_address: string;
  package_type: string;
  weight_kg: number;
  status: 'pending' | 'assigned' | 'taking-off' | 'in-flight' | 'approaching' | 'delivered' | 'failed' | 'on-hold' | 'rescheduled';
  drone_id: string | null;
  drone_model: string | null;
  scheduled_time: string | null;
  estimated_delivery: string;
  created_at: string;
  timeline: OrderTimeline[];
}
