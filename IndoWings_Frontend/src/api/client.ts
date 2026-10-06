import { UserProfile, DroneItem, MissionItem, AuditLogItem } from '../types';

const API_BASE = '/api';

export const apiClient = {
  // Auth
  async login(email: string): Promise<{ token: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async getDemoAccounts(): Promise<UserProfile[]> {
    try {
      const res = await fetch(`${API_BASE}/auth/demo-accounts`);
      if (res.ok) {
        const data = await res.json();
        return data.accounts || [];
      }
    } catch (e) {
      console.warn('API error fetching demo accounts, using fallback');
    }
    return [];
  },

  // Fleet
  async getFleet(): Promise<DroneItem[]> {
    try {
      const res = await fetch(`${API_BASE}/fleet`);
      if (res.ok) {
        const data = await res.json();
        return data.fleet || [];
      }
    } catch (e) {
      console.warn('API error fetching fleet');
    }
    return [];
  },

  // Missions
  async getMissions(): Promise<MissionItem[]> {
    try {
      const res = await fetch(`${API_BASE}/missions`);
      if (res.ok) {
        const data = await res.json();
        return data.missions || [];
      }
    } catch (e) {
      console.warn('API error fetching missions');
    }
    return [];
  },

  async createMission(mission: Partial<MissionItem>, token: string): Promise<MissionItem> {
    const res = await fetch(`${API_BASE}/missions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(mission)
    });
    if (!res.ok) throw new Error('Failed to create mission');
    const data = await res.json();
    return data.mission;
  },

  async updateMissionStatus(id: string, status: string, token: string): Promise<void> {
    await fetch(`${API_BASE}/missions/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
  },

  // Audit
  async getAuditLogs(): Promise<AuditLogItem[]> {
    try {
      const res = await fetch(`${API_BASE}/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        return data.logs || [];
      }
    } catch (e) {
      console.warn('API error fetching audit logs');
    }
    return [];
  },

  // Stats
  async getStats() {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API error fetching stats');
    }
    return null;
  },

  // Demo Booking & Leads
  async submitDemoRequest(formData: {
    name: string;
    email: string;
    phone?: string;
    organization?: string;
    drone_interest: string;
    use_case?: string;
    message?: string;
  }) {
    const res = await fetch(`${API_BASE}/contact/demo-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (!res.ok) throw new Error('Submission failed');
    return res.json();
  }
};
