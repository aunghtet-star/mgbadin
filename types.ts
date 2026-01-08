
export interface User {
  id: string;
  username: string;
  role: 'ADMIN' | 'COLLECTOR';
  balance: number;
  token?: string;
}

export interface GamePhase {
  id: string;
  name: string; // e.g., "Jan-01", "Jan-02"
  active: boolean;
  startDate: string;
  endDate: string | null;
  totalBets: number;
  totalVolume: number;
  globalLimit?: number;
}

export interface Bet {
  id: string;
  phaseId: string;
  userId: string;
  userRole: 'ADMIN' | 'COLLECTOR';
  number: string; // "000" to "999"
  amount: number;
  timestamp: string;
}

export interface LedgerEntry {
  id: string;
  phaseId: string;
  totalIn: number;
  totalOut: number;
  profit: number;
  closedAt: string;
}

export interface HotNumber {
  number: string;
  totalAmount: number;
  limit: number;
}

export interface ParsedBet {
  number: string;
  amount: number;
  originalInput: string;
  status: 'valid' | 'invalid' | 'limit_exceeded';
}
