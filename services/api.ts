// API Service - Replaces localStorage with backend API calls
/// <reference types="vite/client" />

const API_URL = import.meta.env.VITE_API_URL || '/api';

console.log('Using API URL:', API_URL);
interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on init
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return { error: 'Network error' };
    }
  }

  // Auth endpoints
  async login(username: string, password: string) {
    const result = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (result.data?.token) {
      this.setToken(result.data.token);
    }

    return result;
  }

  async logout() {
    this.setToken(null);
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me');
  }

  async register(username: string, password: string, role: 'ADMIN' | 'COLLECTOR') {
    return this.request<{ user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
  }

  // Phases endpoints
  async getPhases() {
    return this.request<{ phases: any[] }>('/phases');
  }

  async getActivePhase() {
    return this.request<{ phase: any }>('/phases/active');
  }

  async getPhase(id: string) {
    return this.request<{ phase: any }>(`/phases/${id}`);
  }

  async createPhase(name: string) {
    return this.request<{ phase: any }>('/phases', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async closePhase(id: string, winningNumber?: string) {
    return this.request<{ phase: any; settlement: any }>(`/phases/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({ winningNumber }),
    });
  }

  async deletePhase(id: string) {
    return this.request<{ success: boolean }>(`/phases/${id}`, {
      method: 'DELETE',
    });
  }

  async setActivePhase(id: string) {
    return this.request<{ phase: any }>(`/phases/${id}/activate`, {
      method: 'POST',
    });
  }

  async updatePhaseGlobalLimit(id: string, globalLimit: number) {
    return this.request<{ phase: any }>(`/phases/${id}/limit`, {
      method: 'PATCH',
      body: JSON.stringify({ globalLimit }),
    });
  }

  // Bets endpoints
  async getBetsForPhase(phaseId: string) {
    return this.request<{ bets: any[] }>(`/bets/phase/${phaseId}`);
  }

  async getAggregatedBets(phaseId: string) {
    return this.request<{ aggregated: any[] }>(`/bets/phase/${phaseId}/aggregated`);
  }

  async getMyBets(phaseId: string) {
    return this.request<{ bets: any[] }>(`/bets/phase/${phaseId}/my`);
  }

  async createBet(phaseId: string, number: string, amount: number) {
    return this.request<{ bet: any }>('/bets', {
      method: 'POST',
      body: JSON.stringify({ phaseId, number, amount }),
    });
  }

  async createBulkBets(phaseId: string, bets: { number: string; amount: number }[]) {
    return this.request<{ bets: any[] }>('/bets/bulk', {
      method: 'POST',
      body: JSON.stringify({ phaseId, bets }),
    });
  }

  async deleteBet(id: string) {
    return this.request<{ success: boolean }>(`/bets/${id}`, {
      method: 'DELETE',
    });
  }

  async updateBet(id: string, amount: number) {
    return this.request<{ bet: any }>(`/bets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ amount }),
    });
  }

  // Risk endpoints
  async getRiskData(phaseId: string) {
    return this.request<{ riskData: any[]; totalVolume: number; totalBets: number }>(
      `/risk/phase/${phaseId}`
    );
  }

  async getExcessData(phaseId: string) {
    return this.request<{ excessData: any[] }>(`/risk/phase/${phaseId}/excess`);
  }

  async setNumberLimit(phaseId: string, number: string, maxAmount: number) {
    return this.request<{ success: boolean }>('/risk/limits', {
      method: 'POST',
      body: JSON.stringify({ phaseId, number, maxAmount }),
    });
  }

  async setBulkLimits(phaseId: string, limits: { number: string; maxAmount: number }[]) {
    return this.request<{ success: boolean }>('/risk/limits/bulk', {
      method: 'POST',
      body: JSON.stringify({ phaseId, limits }),
    });
  }

  async getLimits(phaseId: string) {
    return this.request<{ limits: any[] }>(`/risk/limits/${phaseId}`);
  }

  // Ledger endpoints
  async getLedger() {
    return this.request<{ entries: any[] }>('/ledger');
  }

  async getLedgerSummary() {
    return this.request<{ summary: any }>('/ledger/summary');
  }

  async getPhaseLedger(phaseId: string) {
    return this.request<{ entries: any[] }>(`/ledger/phase/${phaseId}`);
  }

  // Users endpoints
  async getUsers() {
    return this.request<{ users: any[] }>('/users');
  }

  async createUser(username: string, password: string, role: 'ADMIN' | 'COLLECTOR') {
    return this.request<{ user: any }>('/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
  }

  async updateUser(id: string, data: { username?: string; password?: string; role?: string; balance?: number }) {
    return this.request<{ user: any }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string) {
    return this.request<{ success: boolean }>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getUserHistory(userId: string) {
    return this.request<{ bets: any[] }>(`/users/${userId}/history`);
  }
}

export const api = new ApiService();
export default api;
