
import React from 'react';
import { Bet } from '../types';

interface UserHistoryProps {
  bets: Bet[];
}

const UserHistory: React.FC<UserHistoryProps> = ({ bets }) => {
  const sortedBets = [...bets].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalVolume = bets.reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase font-black mb-1">အရေအတွက်</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{bets.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] text-slate-400 uppercase font-black mb-1">စုစုပေါင်းထိုးငွေ</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
            {totalVolume.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            <tr>
              <th className="px-8 py-5">အချိန်</th>
              <th className="px-8 py-5">ဂဏန်း</th>
              <th className="px-8 py-5 text-right">ပမာဏ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedBets.map(bet => (
              <tr key={bet.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                <td className="px-8 py-5 text-slate-500 font-medium text-sm">
                  {new Date(bet.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-8 py-5 font-mono font-black text-slate-900 dark:text-white text-xl">#{bet.number}</td>
                <td className="px-8 py-5 text-right font-black text-emerald-600 text-xl">
                  {bet.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sortedBets.map(bet => (
          <div key={bet.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between group active:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {bet.number}
                </span>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">ကျပ် {bet.amount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-black uppercase">
                   {new Date(bet.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <i className="fa-solid fa-chevron-right text-slate-300"></i>
          </div>
        ))}

        {sortedBets.length === 0 && (
          <div className="py-20 text-center bg-white dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <i className="fa-solid fa-box-open text-4xl text-slate-200 mb-4 block"></i>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">မှတ်တမ်းမရှိသေးပါ</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserHistory;
