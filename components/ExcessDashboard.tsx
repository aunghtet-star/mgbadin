import React, { useMemo, useState } from 'react';
import { Bet } from '../types';

interface ExcessDashboardProps {
  bets: Bet[];
  limits: Record<string, number>;
  onClearExcess: () => void;
  isReadOnly: boolean;
}

const ExcessDashboard: React.FC<ExcessDashboardProps> = ({ bets, limits, onClearExcess, isReadOnly }) => {
  const [search, setSearch] = useState('');
  const [showSlip, setShowSlip] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [currentSlipPage, setCurrentSlipPage] = useState(0);
  const itemsPerSlipPage = 100;

  const excessStats = useMemo(() => {
    const data: Record<string, { total: number; admin: number; collector: number }> = {};
    bets.forEach(b => {
      const num = b.number;
      if (!data[num]) data[num] = { total: 0, admin: 0, collector: 0 };
      data[num].total += b.amount;
      if (b.userRole === 'ADMIN') {
        data[num].admin += b.amount;
      } else {
        data[num].collector += b.amount;
      }
    });

    const results = [];
    for (let i = 0; i < 1000; i++) {
      const numStr = i.toString().padStart(3, '0');
      const val = data[numStr] || { total: 0, admin: 0, collector: 0 };
      const limit = limits[numStr] || limits['global'] || 5000;
      const excess = Math.max(0, val.total - limit);

      if (excess > 0) {
        results.push({
          number: numStr,
          total: val.total,
          adminTotal: val.admin,
          collectorTotal: val.collector,
          limit,
          excess
        });
      }
    }
    return results.sort((a, b) => b.excess - a.excess);
  }, [bets, limits]);

  const totalSlipPages = Math.ceil(excessStats.length / itemsPerSlipPage);

  const paginatedExcessStats = useMemo(() => {
    const start = currentSlipPage * itemsPerSlipPage;
    return excessStats.slice(start, start + itemsPerSlipPage);
  }, [excessStats, currentSlipPage]);

  const totalExcessValue = useMemo(() => {
    return excessStats.reduce((sum, item) => sum + item.excess, 0);
  }, [excessStats]);

  const filteredExcess = useMemo(() => {
    if (!search) return excessStats;
    return excessStats.filter(item => item.number.includes(search));
  }, [excessStats, search]);

  const handleOpenSlip = () => {
    setCurrentSlipPage(0);
    setShowSlip(true);
  };

  const executeClear = () => {
    onClearExcess();
    setIsConfirmingClear(false);
  };

  const getIntensityColor = (excess: number) => {
    if (excess > 50000) return 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800';
    if (excess > 10000) return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
    if (excess > 5000) return 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
    return 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700';
  };

  const getTextColor = (excess: number) => {
    if (excess > 50000) return 'text-rose-600 dark:text-rose-400';
    if (excess > 10000) return 'text-orange-600 dark:text-orange-400';
    if (excess > 5000) return 'text-amber-600 dark:text-amber-400';
    return 'text-slate-900 dark:text-white';
  };

  return (
    <div className="space-y-6">
      {/* Custom Confirmation Modal */}
      {isConfirmingClear && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scale-in text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">Clear All Excess?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">
              This will automatically apply reduction entries for all {excessStats.length} numbers currently over limit.
            </p>
            <div className="space-y-3">
              <button 
                onClick={executeClear}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 transition-all"
              >
                Yes, Clear Board
              </button>
              <button 
                onClick={() => setIsConfirmingClear(false)}
                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black transition-all hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Total Over-Limit Value</p>
          <div className="flex items-center space-x-3">
             <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600">
               <i className="fa-solid fa-fire-flame-curved text-xl"></i>
             </div>
             <p className="text-3xl font-black text-rose-600 dark:text-rose-500 leading-none">
               {totalExcessValue.toLocaleString()}
             </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Over-Limit Hits</p>
          <div className="flex items-center space-x-3">
             <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600">
               <i className="fa-solid fa-triangle-exclamation text-xl"></i>
             </div>
             <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
               {excessStats.length}
             </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-center space-y-3">
          <button 
            onClick={handleOpenSlip}
            disabled={excessStats.length === 0 || isReadOnly}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-file-invoice"></i>
            ကြည့်မည်
          </button>
          <button 
            onClick={() => setIsConfirmingClear(true)} 
            disabled={excessStats.length === 0 || isReadOnly}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-check-double"></i>
            Clear Board
          </button>
        </div>
      </div>

      {showSlip && (
        <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-2xl flex items-center justify-center p-0 md:p-6 overflow-hidden">
          <div className="bg-white w-full max-w-[95vw] h-full md:h-[98vh] rounded-none md:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
             <div className="bg-slate-50 px-10 py-5 flex justify-between items-center border-b border-slate-200 shrink-0 print:hidden">
                <div className="flex items-center space-x-5">
                   <div className="bg-black text-white px-4 py-1 rounded-full font-black text-[12px] tracking-widest uppercase">
                     P{currentSlipPage + 1} / {totalSlipPages}
                   </div>
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                     10x10 Excess Grid
                   </span>
                </div>
                <div className="flex items-center space-x-3">
                   <button onClick={() => window.print()} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 transition-all">
                      <i className="fa-solid fa-print"></i>
                   </button>
                   <button onClick={() => setShowSlip(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-200/50 text-slate-400 hover:bg-slate-200 transition-colors">
                      <i className="fa-solid fa-xmark text-lg"></i>
                   </button>
                </div>
             </div>

             <div className="flex-grow p-8 md:p-12 bg-white text-black font-mono overflow-y-auto custom-scrollbar flex flex-col" id="banker-slip">
                <div className="min-h-full flex flex-col">
                  <div className="flex justify-between items-end border-b-[6px] border-black pb-6 mb-6">
                     <div>
                        <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-1">3D ကျွံစာရင်း</h2>
                        <div className="flex gap-4">
                           <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Page {currentSlipPage + 1} of {totalSlipPages}</span>
                           <span className="text-[10px] font-black text-slate-400 uppercase">Hash: {Date.now().toString(36).toUpperCase()}</span>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-lg font-black">{new Date().toLocaleString()}</p>
                     </div>
                  </div>

                  <div className="flex-grow">
                    <div className="grid grid-cols-10 border-t border-l border-black">
                       {paginatedExcessStats.map(item => (
                         <div key={item.number} className="flex flex-col items-start justify-center border-r border-b border-black py-1 px-3 min-h-[40px]">
                            <div className="flex items-center whitespace-nowrap overflow-hidden">
                              <span className="text-[12px] font-black text-slate-400 leading-none">{item.number}</span>
                              <span className="text-[12px] font-black text-slate-400 mx-1">-</span>
                              <span className="text-[12px] font-black leading-none truncate">
                                {item.excess.toLocaleString()}
                              </span>
                            </div>
                         </div>
                       ))}
                       {paginatedExcessStats.length < itemsPerSlipPage && Array.from({ length: itemsPerSlipPage - paginatedExcessStats.length }).map((_, idx) => (
                         <div key={`empty-${idx}`} className="flex items-center justify-start border-r border-b border-black py-1 px-3 opacity-5 min-h-[40px]">
                            <span className="text-[12px] font-black text-slate-300 leading-none">--- - 0</span>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="mt-8 border-t-[6px] border-black pt-8 flex justify-between items-end">
                     <div>
                        <p className="text-[10px] font-black uppercase opacity-30 mb-1">Total Items</p>
                        <p className="text-4xl font-black leading-none">{excessStats.length}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[12px] font-black uppercase opacity-40 mb-2 tracking-[0.2em]">TOTAL EXCESS VOLUME</p>
                        <div className="bg-black text-white px-8 py-5 rounded-xl inline-block shadow-lg">
                           <p className="text-6xl font-black tracking-tighter leading-none">
                             {totalExcessValue.toLocaleString()}
                           </p>
                        </div>
                     </div>
                  </div>
                </div>
             </div>

             <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-center space-x-6 print:hidden">
                <button 
                  disabled={currentSlipPage === 0}
                  onClick={() => setCurrentSlipPage(prev => prev - 1)}
                  className="w-14 h-14 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl flex items-center justify-center disabled:opacity-20 shadow-lg shadow-indigo-600/20 transition-all active:scale-90"
                >
                  <i className="fa-solid fa-chevron-left text-lg"></i>
                </button>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">PAGE {currentSlipPage + 1} / {totalSlipPages}</p>
                <button 
                  disabled={currentSlipPage >= totalSlipPages - 1}
                  onClick={() => setCurrentSlipPage(prev => prev + 1)}
                  className="w-14 h-14 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl flex items-center justify-center disabled:opacity-20 shadow-lg shadow-indigo-600/20 transition-all active:scale-90"
                >
                  <i className="fa-solid fa-chevron-right text-lg"></i>
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Main Excess Board Design Update */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center space-x-3">
             <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600">
                <i className="fa-solid fa-bolt"></i>
             </div>
             <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
               3D ကျွံ စာရင်း
             </h3>
           </div>
           <div className="relative">
             <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
             <input 
               type="text" 
               placeholder="Search Number..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
             />
           </div>
        </div>

        {filteredExcess.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {filteredExcess.map(item => (
              <div 
                key={item.number}
                className={`flex items-center justify-start border rounded-xl py-1 px-4 min-h-[40px] transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer overflow-hidden ${getIntensityColor(item.excess)}`}
              >
                <div className="flex items-center whitespace-nowrap">
                  <span className="text-[14px] font-black text-slate-400 dark:text-slate-500 leading-none">
                    {item.number}
                  </span>
                  <span className="text-[14px] font-black text-slate-400 dark:text-slate-500 mx-1.5">-</span>
                  <span className={`text-[14px] font-black leading-none truncate ${getTextColor(item.excess)}`}>
                    {item.excess.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-32 text-center">
             <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                <i className="fa-solid fa-shield-check text-4xl"></i>
             </div>
             <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">Safe Zone</h4>
             <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium">Risk levels are currently within safe limits.</p>
          </div>
        )}

        {/* Strong Pagination for Dashboard */}
        {filteredExcess.length > 48 && (
          <div className="mt-8 flex items-center justify-between p-2 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
            <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-20">
              PREV
            </button>
            <span className="text-xs font-black uppercase text-slate-400">Total: {filteredExcess.length} entries</span>
            <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-20">
              NEXT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcessDashboard;
