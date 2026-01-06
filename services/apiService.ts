
const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('banker_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const api = {
  login: async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  getPhases: async () => {
    const res = await fetch(`${API_BASE}/phases`, { headers: getHeaders() });
    return res.json();
  },

  createPhase: async (name) => {
    const res = await fetch(`${API_BASE}/phases`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name })
    });
    return res.json();
  },

  getBets: async (phaseId) => {
    const res = await fetch(`${API_BASE}/bets/${phaseId}`, { headers: getHeaders() });
    return res.json();
  },

  submitBets: async (phaseId, bets) => {
    const res = await fetch(`${API_BASE}/bets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ phaseId, bets })
    });
    return res.json();
  }
};
