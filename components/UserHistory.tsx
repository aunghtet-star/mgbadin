
import React, { useMemo, useState } from 'react';
import { Bet } from '../types';

interface UserHistoryProps {
  bets: Bet[];
}

interface BetBatch {
  id: string;
  timestamp: Date;
  bets: Bet[];
  totalAmount: number;
  count: number;
  phaseName?: string;
}

const BatchItem: React.FC<{ batch: BetBatch }> = ({ batch }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex flex-col md:flex-row items-start md:items-center justify-between p-5 gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 ${isOpen ? 'bg-indigo-600 text-white rotate-90' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
            <i className="fa-solid fa-chevron-right"></i>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-slate-900 dark:text-white">
                {batch.timestamp.toLocaleDateString()}
              </span>
              <span className="text-xs font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                {batch.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Batch: <span className="font-bold text-indigo-600 dark:text-indigo-400">{batch.count} Numbers</span>
              <span className="text-xs text-slate-400 ml-1">(Click to see)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 pl-14 md:pl-0">
          {batch.phaseName && (
            <span className="hidden md:inline-block px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase">
              {batch.phaseName}
            </span>
          )}
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase font-black">Total Amount</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {batch.totalAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </button>

      {/* Accordion Body */}
      {isOpen && (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {batch.bets.map((bet) => (
              <div key={bet.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono mb-1">
                  {bet.number}
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {bet.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const UserHistory: React.FC<UserHistoryProps> = ({ bets }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // 1. Sort bets first
  const sortedBets = useMemo(() => (
    [...bets].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  ), [bets]);

  // 2. Filter bets
  const filteredBets = useMemo(() => {
    if (!search) return sortedBets;
    const q = search.trim().toLowerCase();
    return sortedBets.filter(b => {
      const dt = new Date(b.timestamp);
      const dateStr = dt.toLocaleDateString().toLowerCase();
      const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
      const phaseStr = b.phaseName ? b.phaseName.toLowerCase() : '';
      return (
        b.number.toLowerCase().includes(q) ||
        b.amount.toString().includes(q) ||
        dateStr.includes(q) ||
        timeStr.includes(q) ||
        phaseStr.includes(q)
      );
    });
  }, [sortedBets, search]);

  // 3. Group filtered bets into batches
  const batches = useMemo(() => {
    const groups: { [key: string]: Bet[] } = {};
    
    filteredBets.forEach(bet => {
      // Group by betSlipId if available, otherwise fallback to timestamp
      const key = bet.betSlipId || bet.timestamp; 
      if (!groups[key]) groups[key] = [];
      groups[key].push(bet);
    });

    const batchList: BetBatch[] = Object.entries(groups).map(([key, groupBets]) => {
      // If key is a valid date string (fallback), use it. If it's a UUID (betSlipId), take timestamp from first bet
      // Actually, since we want to display the time, we should always take the timestamp from the first bet in the group.
      const firstBet = groupBets[0];
      
      return {
        id: key, 
        timestamp: new Date(firstBet.timestamp),
        bets: groupBets,
        totalAmount: groupBets.reduce((sum, b) => sum + b.amount, 0),
        count: groupBets.length,
        phaseName: firstBet.phaseName
      };
    });

    // Sort batches by timestamp descending
    return batchList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [filteredBets]);

  const totalVolume = useMemo(() => filteredBets.reduce((a, b) => a + b.amount, 0), [filteredBets]);
  const totalCount = filteredBets.length;

  // 4. Paginate batches
  const totalPages = Math.max(1, Math.ceil(batches.length / pageSize));
  const activePage = Math.min(page, totalPages - 1);
  const paginatedBatches = useMemo(() => {
    const start = activePage * pageSize;
    return batches.slice(start, start + pageSize);
  }, [batches, activePage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Total Quantity</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Total Volume</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
            {totalVolume.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full md:w-80">
        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input
          type="text"
          placeholder="Search number, amount..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-9 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
        />
      </div>

      {/* Accordion List */}
      <div className="space-y-4">
        {paginatedBatches.map(batch => (
          <BatchItem key={batch.id} batch={batch} />
        ))}

        {paginatedBatches.length === 0 && (
          <div className="py-20 text-center bg-white dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <i className="fa-solid fa-box-open text-4xl text-slate-200 mb-4 block"></i>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No records found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={activePage === 0}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <span className="text-xs font-black text-slate-500">Page {activePage + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={activePage >= totalPages - 1}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
          <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Batches per page: {pageSize}</span>
        </div>
      )}
    </div>
  );
};

export default UserHistory;
