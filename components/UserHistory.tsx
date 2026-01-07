
import React, { useMemo, useState } from 'react';
import { Bet } from '../types';

interface UserHistoryProps {
  bets: Bet[];
}

const UserHistory: React.FC<UserHistoryProps> = ({ bets }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const sortedBets = useMemo(() => (
    [...bets].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  ), [bets]);

  const filteredBets = useMemo(() => {
    if (!search) return sortedBets;
    const q = search.trim().toLowerCase();
    return sortedBets.filter(b => {
      const dt = new Date(b.timestamp);
      const dateStr = dt.toLocaleDateString().toLowerCase();
      const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
      return (
        b.number.toLowerCase().includes(q) ||
        b.amount.toString().includes(q) ||
        dateStr.includes(q) ||
        timeStr.includes(q)
      );
    });
  }, [sortedBets, search]);

  const totalVolume = useMemo(() => filteredBets.reduce((a, b) => a + b.amount, 0), [filteredBets]);

  const totalPages = Math.max(1, Math.ceil(filteredBets.length / pageSize));
  const activePage = Math.min(page, totalPages - 1);
  const paginated = useMemo(() => {
    const start = activePage * pageSize;
    return filteredBets.slice(start, start + pageSize);
  }, [filteredBets, activePage]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Quantity</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{filteredBets.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Total</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
            {totalVolume.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="relative w-full md:w-80">
        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input
          type="text"
          placeholder="Search by number, amount, date..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            <tr>
              <th className="px-8 py-5">Date & Time</th>
              <th className="px-8 py-5">Number</th>
              <th className="px-8 py-5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginated.map(bet => {
              const dt = new Date(bet.timestamp);
              return (
                <tr key={bet.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-8 py-5 text-slate-500 font-medium text-sm">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {dt.toLocaleDateString()}
                      </span>
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 font-mono font-black text-slate-900 dark:text-white text-xl">#{bet.number}</td>
                  <td className="px-8 py-5 text-right font-black text-emerald-600 text-xl">
                    {bet.amount.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {paginated.map(bet => {
          const dt = new Date(bet.timestamp);
          return (
            <div key={bet.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between group active:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {bet.number}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{bet.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase whitespace-nowrap">
                    {dt.toLocaleDateString()} • {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right text-slate-300"></i>
            </div>
          );
        })}

        {filteredBets.length === 0 && (
          <div className="py-20 text-center bg-white dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <i className="fa-solid fa-box-open text-4xl text-slate-200 mb-4 block"></i>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No records found</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={activePage === 0}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30"
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <span className="text-xs font-black text-slate-500">Page {activePage + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={activePage >= totalPages - 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30"
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Page size: 10</span>
      </div>
    </div>
  );
};

export default UserHistory;
