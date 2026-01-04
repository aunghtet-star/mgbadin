import React, { useState, useMemo } from 'react';
import { Bet } from '../types';

interface RiskDashboardProps {
  bets: Bet[];
  limits: Record<string, number>;
  onUpdateLimit: (num: string, limit: number) => void;
  onVoidBet: (id: string) => void;
  onUpdateBetAmount: (id: string, newAmount: number) => void;
  onApplyReduction: (number: string, amount: number) => void;
  isReadOnly: boolean;
}

type LedgerTab = 'all' | 'tickets' | 'corrections';
type SortOrder = 'none' | 'asc' | 'desc';

const RiskDashboard: React.FC<RiskDashboardProps> = ({ 
  bets, limits, onUpdateLimit, onVoidBet, onUpdateBetAmount, onApplyReduction, isReadOnly 
}) => {
  const [search, setSearch] = useState('');
  const [showLimitSettings, setShowLimitSettings] = useState(false);
  const [showManifest, setShowManifest] = useState(false);
  const [manifestPage, setManifestPage] = useState(0);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [reductionInput, setReductionInput] = useState<string>('');
  
  const [activeLedgerTab, setActiveLedgerTab] = useState<LedgerTab>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  const itemsPerManifestPage = 100; // 10x10 Grid

  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  const [hideEmpty, setHideEmpty] = useState(false);

  // Core Statistics Calculation
  const stats = useMemo(() => {
    const data: Record<string, number> = {};
    for(let i=0; i<1000; i++) {
      data[i.toString().padStart(3, '0')] = 0;
    }
    bets.forEach(b => {
      const num = b.number;
      if (data[num] !== undefined) {
        data[num] += b.amount;
      }
    });
    
    return Object.entries(data).map(([number, total]) => {
      const limit = limits[number] || limits['global'] || 5000;
      return {
        number,
        total,
        limit,
        excess: Math.max(0, total - limit)
      };
    });
  }, [bets, limits]);

  // Combined Financial Summary
  const financialSummary = useMemo(() => {
    return bets.reduce((acc, b) => acc + b.amount, 0);
  }, [bets]);

  const filteredStats = useMemo(() => {
    let results = [...stats];
    if (hideEmpty) results = results.filter(s => s.total !== 0);
    if (search) results = results.filter(s => s.number.includes(search));
    
    if (sortOrder === 'asc') {
      results.sort((a, b) => a.total - b.total);
    } else if (sortOrder === 'desc') {
      results.sort((a, b) => b.total - a.total);
    }
    
    return results;
  }, [stats, search, sortOrder, hideEmpty]);

  const activeStats = useMemo(() => stats.filter(s => s.total !== 0), [stats]);

  const paginatedStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStats.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStats, currentPage]);

  const totalPages = Math.ceil(filteredStats.length / itemsPerPage);

  const manifestStats = useMemo(() => {
    const start = manifestPage * itemsPerManifestPage;
    return activeStats.slice(start, start + itemsPerManifestPage);
  }, [activeStats, manifestPage]);

  const totalManifestPages = Math.ceil(activeStats.length / itemsPerManifestPage);

  const getHeatColor = (total: number, limit: number) => {
    if (total === 0) return 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600';
    if (total > limit) return 'bg-red-600 border-red-400 text-white shadow-lg animate-pulse border-2';
    const percent = (total / limit) * 100;
    if (percent > 95) return 'bg-orange-600 border-orange-400 text-white';
    if (percent > 75) return 'bg-amber-600 border-amber-400 text-white';
    if (percent > 40) return 'bg-indigo-600 border-indigo-400 text-white';
    return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300';
  };

  const handleApplyCorrection = () => {
    if (selectedNumber && reductionInput) {
      onApplyReduction(selectedNumber, parseInt(reductionInput));
      setReductionInput('');
      setSelectedNumber(null);
    }
  };

  const recentTickets = useMemo(() => {
    const sorted = [...bets].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sorted.filter(b => b.number !== 'ADJ');
  }, [bets]);

  const toggleSort = () => {
    if (sortOrder === 'none') setSortOrder('desc');
    else if (sortOrder === 'desc') setSortOrder('asc');
    else setSortOrder('none');
  };

  return (
    <div className="space-y-6">
      {/* Risk Limits Settings Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <i className="fa-solid fa-sliders"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Risk Limits</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Adjust Safety Boundaries</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowManifest(true)}
              disabled={activeStats.length === 0}
              className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all disabled:opacity-30"
            >
              <i className="fa-solid fa-receipt"></i>
              ကြည့်မည်
            </button>
            <button 
              onClick={() => setShowLimitSettings(!showLimitSettings)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${showLimitSettings ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
            >
              {showLimitSettings ? 'Close Settings' : 'Edit Limits'}
            </button>
          </div>
        </div>
        {showLimitSettings && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="block">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Global Limit</span>
                <input 
                  type="number"
                  value={limits['global']}
                  onChange={(e) => onUpdateLimit('global', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Grid Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-fire text-red-500"></i>
          <span>3D Risk Grid</span>
        </h3>
        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          <button
            onClick={toggleSort}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${sortOrder !== 'none' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500'}`}
          >
            <i className={`fa-solid ${sortOrder === 'none' ? 'fa-sort' : (sortOrder === 'desc' ? 'fa-sort-down' : 'fa-sort-up')}`}></i>
            <span>{sortOrder === 'none' ? 'Default' : (sortOrder === 'desc' ? 'Highest' : 'Lowest')}</span>
          </button>
          <button
            onClick={() => setHideEmpty(!hideEmpty)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${hideEmpty ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500'}`}
          >
            <i className={`fa-solid ${hideEmpty ? 'fa-eye' : 'fa-eye-slash'}`}></i>
            <span>Active Only</span>
          </button>
          <div className="relative flex-grow md:w-48 lg:w-64">
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text" placeholder="Filter number..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm outline-none"
            />
          </div>
        </div>
      </div>

      {/* Centered Large Font Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-20 gap-2">
        {paginatedStats.map(row => (
          <div 
            key={row.number}
            onClick={() => setSelectedNumber(row.number)}
            className={`aspect-square flex flex-col items-center justify-center rounded-lg border cursor-pointer transition-all hover:scale-110 p-1 relative overflow-hidden ${getHeatColor(row.total, row.limit)}`}
            title={`${row.number}: Total ${row.total.toLocaleString()}`}
          >
            <span className="text-2xl font-black leading-none">{row.number}</span>
            {row.total !== 0 && (
              <span className="text-[11px] font-bold mt-1.5 truncate w-full text-center">
                {row.total.toLocaleString()}
              </span>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button 
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
            disabled={currentPage === 1} 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-lg text-xs font-black transition-all shadow-md shadow-indigo-600/20 uppercase tracking-widest"
          >
            PREV
          </button>
          <span className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest">Page {currentPage} / {totalPages}</span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} 
            disabled={currentPage === totalPages} 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-lg text-xs font-black transition-all shadow-md shadow-indigo-600/20 uppercase tracking-widest"
          >
            NEXT
          </button>
        </div>
      )}

      {/* Simplified Turnover Summary Bar */}
      <div className="mt-8 bg-slate-900 dark:bg-black text-white p-6 md:p-10 rounded-[2.5rem] flex flex-col items-center shadow-2xl border border-white/10">
        <div className="flex items-center space-x-6 bg-white/5 p-8 rounded-[2rem] border border-white/5 w-full max-w-lg justify-center">
          <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-3xl flex items-center justify-center text-3xl border border-indigo-500/30">
            <i className="fa-solid fa-chart-pie"></i>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase opacity-50 tracking-widest mb-1">Total</p>
            <p className="text-4xl md:text-6xl font-black tracking-tighter text-indigo-400">{financialSummary.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Manifest Modal (ကြည့်မည်) */}
      {showManifest && (
        <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-2xl flex items-center justify-center p-0 md:p-6 overflow-hidden">
          <div className="bg-white w-full max-w-[95vw] h-full md:h-[98vh] rounded-none md:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
             <div className="bg-slate-50 px-10 py-5 flex justify-between items-center border-b border-slate-200 shrink-0 print:hidden">
                <div className="flex items-center space-x-5">
                   <div className="bg-black text-white px-4 py-1 rounded-full font-black text-[12px] tracking-widest uppercase">
                     P{manifestPage + 1} / {totalManifestPages || 1}
                   </div>
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                     Full Risk Manifest
                   </span>
                </div>
                <div className="flex items-center space-x-3">
                   <button onClick={() => window.print()} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 transition-all">
                      <i className="fa-solid fa-print"></i>
                   </button>
                   <button onClick={() => setShowManifest(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-200/50 text-slate-400 hover:bg-slate-200 transition-colors">
                      <i className="fa-solid fa-xmark text-lg"></i>
                   </button>
                </div>
             </div>

             <div className="flex-grow p-8 md:p-12 bg-white text-black font-mono overflow-y-auto custom-scrollbar flex flex-col" id="banker-slip">
                <div className="min-h-full flex flex-col">
                  <div className="flex justify-between items-end border-b-[6px] border-black pb-6 mb-6">
                     <div>
                        <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-1">3D စုစုပေါင်းစာရင်း</h2>
                        <div className="flex gap-4">
                           <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Page {manifestPage + 1} of {totalManifestPages || 1}</span>
                           <span className="text-[10px] font-black text-slate-400 uppercase">Timestamp: {new Date().toLocaleString()}</span>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-lg font-black uppercase tracking-widest">Official Manifest</p>
                     </div>
                  </div>

                  <div className="flex-grow">
                    <div className="grid grid-cols-5 md:grid-cols-10 border-t border-l border-black">
                       {manifestStats.map(item => (
                         <div key={item.number} className="flex flex-col items-start justify-center border-r border-b border-black py-1 px-3 min-h-[40px]">
                            <div className="flex items-center whitespace-nowrap overflow-hidden">
                              <span className="text-[12px] font-black text-slate-400 leading-none">{item.number}</span>
                              <span className="text-[12px] font-black text-slate-400 mx-1">-</span>
                              <span className="text-[12px] font-black leading-none truncate">
                                {item.total.toLocaleString()}
                              </span>
                            </div>
                         </div>
                       ))}
                       {manifestStats.length < itemsPerManifestPage && Array.from({ length: itemsPerManifestPage - manifestStats.length }).map((_, idx) => (
                         <div key={`empty-${idx}`} className="flex items-center justify-start border-r border-b border-black py-1 px-3 opacity-5 min-h-[40px]">
                            <span className="text-[12px] font-black text-slate-300 leading-none">--- - 0</span>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="mt-8 border-t-[6px] border-black pt-8 flex justify-between items-end">
                     <div>
                        <p className="text-[10px] font-black uppercase opacity-30 mb-1">Total Numbers Hit</p>
                        <p className="text-4xl font-black leading-none">{activeStats.length}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[12px] font-black uppercase opacity-40 mb-2 tracking-[0.2em]">TOTAL</p>
                        <div className="bg-black text-white px-8 py-5 rounded-xl inline-block shadow-lg">
                           <p className="text-6xl font-black tracking-tighter leading-none">
                             {financialSummary.toLocaleString()}
                           </p>
                        </div>
                     </div>
                  </div>
                </div>
             </div>

             <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-center space-x-6 print:hidden">
                <button 
                  disabled={manifestPage === 0}
                  onClick={() => setManifestPage(prev => prev - 1)}
                  className="w-14 h-14 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl flex items-center justify-center disabled:opacity-20 shadow-lg shadow-indigo-600/20 transition-all active:scale-90"
                >
                  <i className="fa-solid fa-chevron-left text-lg"></i>
                </button>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">PAGE {manifestPage + 1} / {totalManifestPages || 1}</p>
                <button 
                  disabled={manifestPage >= totalManifestPages - 1}
                  onClick={() => setManifestPage(prev => prev + 1)}
                  className="w-14 h-14 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl flex items-center justify-center disabled:opacity-20 shadow-lg shadow-indigo-600/20 transition-all active:scale-90"
                >
                  <i className="fa-solid fa-chevron-right text-lg"></i>
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {selectedNumber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-sm w-full shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black">Adjust #{selectedNumber}</h3>
              <button onClick={() => setSelectedNumber(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Reduction Amount</label>
                <input 
                  type="number" value={reductionInput} onChange={(e) => setReductionInput(e.target.value)}
                  placeholder="E.g. 5000"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-xl font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <button 
                onClick={handleApplyCorrection}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 transition-all"
              >
                Apply Reduction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Ledger Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
           <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest">Transaction Ledger</h4>
           <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl">
             <button onClick={() => setActiveLedgerTab('all')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase ${activeLedgerTab === 'all' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400'}`}>All</button>
             <button onClick={() => setActiveLedgerTab('tickets')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase ${activeLedgerTab === 'tickets' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400'}`}>In</button>
             <button onClick={() => setActiveLedgerTab('corrections')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase ${activeLedgerTab === 'corrections' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400'}`}>Out</button>
           </div>
        </div>
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 font-black uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Number</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTickets.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-4">
                    <span className="font-mono font-black text-lg text-slate-900 dark:text-white">#{t.number}</span>
                  </td>
                  <td className={`px-6 py-4 font-mono font-bold text-sm ${t.amount < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {t.amount < 0 ? '-' : '+'}{Math.abs(t.amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!isReadOnly && (
                      <button onClick={() => onVoidBet(t.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default RiskDashboard;
