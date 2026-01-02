
import React from 'react';
import { Bet } from '../types';

interface UserHistoryProps {
  bets: Bet[];
}

const UserHistory: React.FC<UserHistoryProps> = ({ bets }) => {
  // Sort bets by timestamp descending
  const sortedBets = [...bets].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <p className="text-slate-500 text-sm uppercase">Your Total Bets</p>
          <p className="text-3xl font-bold text-white">{bets.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <p className="text-slate-500 text-sm uppercase">Total Volume</p>
          <p className="text-3xl font-bold text-emerald-400">Ks {bets.reduce((a, b) => a + b.amount, 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 text-slate-400 text-sm uppercase">
            <tr>
              <th className="px-6 py-4">Time</th>
              <th className="px-6 py-4">Number</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedBets.map(bet => (
              <tr key={bet.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 text-slate-500 text-sm">
                  {new Date(bet.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-6 py-4 font-mono font-bold text-white text-lg">{bet.number}</td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-400">
                  Ks {bet.amount.toLocaleString()}
                </td>
              </tr>
            ))}
            {sortedBets.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-600 italic">
                  You haven't placed any bets in this phase yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserHistory;
