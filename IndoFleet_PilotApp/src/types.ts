export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'pilot' | 'delivery' | 'admin' | 'dispatcher' | string;
  station?: string;
  organization?: string;
  dl_id?: string;
  employee_id?: string;
  vehicle_id?: string;
  must_change_password?: boolean;
  status: string;
  created_at?: string;
}

export interface LocationCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface DeliveryOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  recipient_name?: string;
  pickup_address?: string;
  drop_address: string;
  delivery_address?: string;
  pickup_location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  destination_location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  delivery_lat?: number;
  delivery_lng?: number;
  drone_model?: string;
  drone_id?: string;
  status: 'pending' | 'assigned' | 'taking-off' | 'in-flight' | 'out-for-delivery' | 'delivered' | 'cancelled' | string;
  units_count?: number;
  weight_kg?: number;
  fare_inr?: number;
  payment_status?: string;
  items?: any[];
  assigned_by_name?: string;
  assigned_by_role?: string;
  assigned_at?: string;
  pilot_acceptance_status?: 'pending_acceptance' | 'accepted';
  pilot_acceptance_otp?: string;
  last_known_location?: string | null;
  created_at: string;
}

export interface PilotKpis {
  total_assigned: number;
  total_delivered: number;
  total_missed: number;
  total_queue: number;
  todays_total: number;
  todays_assigned: number;
  todays_delivered: number;
  todays_missed: number;
  todays_queue: number;
  completion_rate: number;
}

export interface ChartData {
  weekly_trend: { day: string; completed: number; missed: number }[];
  hourly_active: { time: string; orders: number }[];
}

export interface TelemetryStats {
  packetsSent: number;
  lastSyncTime: string | null;
  speedKmh: number;
  altitudeM: number;
  headingDeg: number;
  batteryPct: number;
  distanceRemainingKm: number | null;
  isSyncing: boolean;
  lastError: string | null;
}

export interface PilotTelemetryPayload {
  order_id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  battery_pct?: number;
  pilot_id?: string;
  timestamp?: string;
}
