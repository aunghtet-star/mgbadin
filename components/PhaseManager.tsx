
import React, { useState, useMemo } from 'react';
import { GamePhase, LedgerEntry, Bet } from '../types';

interface PhaseManagerProps {
  currentPhase: GamePhase | null;
  ledger: LedgerEntry[];
  onClosePhase: () => void;
  onSelectPhase: (phaseName: string) => void;
  bets: Bet[];
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const PHASE_OPTIONS = MONTHS.flatMap(month => [`${month}-01`, `${month}-02`]);

const PhaseManager: React.FC<PhaseManagerProps> = ({ currentPhase, ledger, onClosePhase, onSelectPhase, bets }) => {
  const [isConfirming, setIsConfirming] = useState(false);

  // GROUPED SUMMARY LOGIC
  const groupedSummary = useMemo(() => {
    if (!currentPhase) return [];
    const phaseBets = bets.filter(b => b.phaseId === currentPhase.id);
    const groups: Record<string, number> = {};
    phaseBets.forEach(bet => {
      groups[bet.number] = (groups[bet.number] || 0) + bet.amount;
    });
    return Object.entries(groups)
      .map(([number, total]) => ({ number, total }))
      .sort((a, b) => b.total - a.total);
  }, [bets, currentPhase]);

  const totalIn = useMemo(() => {
    return groupedSummary.reduce((sum, item) => sum + item.total, 0);
  }, [groupedSummary]);

  const isReadOnly = ledger.some(l => l.phaseId === currentPhase?.id);
  const settlementInfo = ledger.find(l => l.phaseId === currentPhase?.id);

  const handlePrint = () => {
    window.print();
  };

  if (!currentPhase) {
    return (
      <div className="space-y-10 animate-fade-in print:hidden">
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Operation Slots</h2>
          <p className="text-slate-500 font-medium">Select a slot to manage bets or review finalized settlements.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {PHASE_OPTIONS.map((phase) => {
            const isSettled = ledger.some(l => l.phaseId === phase);
            return (
              <button
                key={phase}
                onClick={() => onSelectPhase(phase)}
                className={`group border-2 p-6 rounded-2xl transition-all duration-300 text-center relative overflow-hidden shadow-sm ${
                  isSettled 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50 hover:border-emerald-500' 
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-600 hover:shadow-xl'
                }`}
              >
                <div className={`text-3xl mb-4 transition-transform group-hover:scale-110 ${isSettled ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700'}`}>
                   <i className={`fa-solid ${isSettled ? 'fa-box-archive' : 'fa-ticket'}`}></i>
                </div>
                
                <span className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${
                  isSettled ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {isSettled ? 'Settled' : 'Available'}
                </span>
                
                <span className={`text-xl font-black block ${
                  isSettled ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-900 dark:text-white'
                }`}>
                  {phase}
                </span>
              </button>
            );
          })}
        </div>

        {ledger.length > 0 && (
          <section className="mt-12 bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center space-x-3">
              <i className="fa-solid fa-clock-rotate-left"></i>
              <span>Settlement History</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {ledger.map(item => (
                <div key={item.id} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => onSelectPhase(item.phaseId)}>
                   <div className="flex justify-between items-start mb-4">
                      <p className="text-lg font-black text-slate-900 dark:text-white">{item.phaseId}</p>
                      <span className="text-[10px] bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase">Final</span>
                   </div>
                   <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Net Profit</p>
                      <p className={`text-lg font-mono font-black ${item.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        Ks {item.profit.toLocaleString()}
                      </p>
                   </div>
                </div>
               ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  const estimatedProfit = currentPhase.totalVolume * 0.28; 

  return (
    <div className="space-y-8 animate-fade-in">
      {/* UI Controls - Hidden on Print */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm print:hidden">
        <button 
          onClick={() => onSelectPhase(null as any)}
          className="flex items-center space-x-2 text-slate-500 hover:text-indigo-600 transition-colors text-xs font-black uppercase tracking-widest"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span>Phase Selection</span>
        </button>
        <div className="flex items-center space-x-4">
          <button 
            onClick={handlePrint}
            className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30"
          >
            <i className="fa-solid fa-file-pdf"></i>
            <span>Export Summary</span>
          </button>
          <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-800 pl-4">
            <span className={`w-2.5 h-2.5 rounded-full ${isReadOnly ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`}></span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {isReadOnly ? 'Settled' : 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* REPORT CONTENT */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 shadow-2xl print:border-none print:shadow-none print:p-0">
        
        {/* Print Only Header */}
        <div className="hidden print:block border-b-4 border-slate-900 mb-10 pb-6">
           <h1 className="text-3xl font-black uppercase tracking-tighter">Banker Settlement Summary</h1>
           <p className="text-sm font-bold text-slate-500">PHASE: {currentPhase.name} | DATE: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8">
          <div className="space-y-4">
            <h2 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter print:text-5xl">{currentPhase.name}</h2>
            <div className="flex flex-wrap items-center gap-6">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</span>
                  <span className={`text-sm font-bold uppercase ${isReadOnly ? 'text-emerald-600' : 'text-indigo-600'}`}>{isReadOnly ? 'Verified Settlement' : 'Open Phase'}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tickets</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{currentPhase.totalBets.toLocaleString()} Units</span>
               </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-4 print:hidden">
            {!isReadOnly ? (
              <div className="flex flex-col items-end space-y-3">
                <button 
                  onClick={() => setIsConfirming(true)}
                  className="px-10 py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-black text-white transition-all shadow-xl shadow-red-900/40"
                >
                  SETTLE & LOCK
                </button>
                {isConfirming && (
                  <div className="flex items-center space-x-3 animate-fade-in">
                     <button onClick={onClosePhase} className="text-sm font-black text-emerald-600 hover:underline uppercase">Confirm Settle</button>
                     <button onClick={() => setIsConfirming(false)} className="text-sm font-black text-slate-400 hover:underline uppercase">Cancel</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/20 px-8 py-4 rounded-3xl text-center">
                 <p className="text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest">Audited & Settled</p>
                 {settlementInfo && <p className="text-slate-400 text-[10px] font-mono mt-1">{new Date(settlementInfo.closedAt).toLocaleString()}</p>}
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-3xl border border-slate-100 dark:border-white/5 print:border-black print:border-2">
            <p className="text-slate-500 text-[11px] mb-2 uppercase font-black tracking-widest">Phase Volume</p>
            <p className="text-4xl font-mono font-black text-emerald-600 dark:text-emerald-400 print:text-black">
              Ks {currentPhase.totalVolume.toLocaleString()}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-3xl border border-slate-100 dark:border-white/5 print:border-black print:border-2">
            <p className="text-slate-500 text-[11px] mb-2 uppercase font-black tracking-widest">Est. Commission</p>
            <p className="text-4xl font-mono font-black text-indigo-600 dark:text-indigo-400 print:text-black">
              Ks {estimatedProfit.toLocaleString()}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-3xl border border-slate-100 dark:border-white/5 print:border-black print:border-2">
            <p className="text-slate-500 text-[11px] mb-2 uppercase font-black tracking-widest">Jackpot Liability</p>
            <p className="text-4xl font-mono font-black text-red-500 print:text-black">
              Ks {(currentPhase.totalVolume * 80).toLocaleString()}
            </p>
          </div>
        </div>

        {/* GROUPED SUMMARY TABLE (FOR EXPORT) */}
        <div className="mt-12">
           <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4 mb-6 print:border-black">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest">Liability Summary per Number</h3>
              <span className="text-[10px] font-black text-slate-400 uppercase">Phase Audit Log</span>
           </div>
           
           <div className="overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                 <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-black text-[10px] tracking-widest border-y border-slate-100 dark:border-slate-800 print:bg-slate-200 print:text-black">
                       <th className="px-8 py-5">3D Number</th>
                       <th className="px-8 py-5 text-right">Total Aggregate (Ks)</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 print:divide-slate-300">
                    {groupedSummary.map((item) => (
                       <tr key={item.number} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                          <td className="px-8 py-5">
                             <span className="font-mono text-xl font-black text-slate-900 dark:text-white print:text-black">#{item.number}</span>
                          </td>
                          <td className="px-8 py-5 text-right">
                             <span className="font-mono text-xl font-black text-slate-900 dark:text-white print:text-black">{item.total.toLocaleString()}</span>
                          </td>
                       </tr>
                    ))}
                    {groupedSummary.length === 0 && (
                       <tr>
                          <td colSpan={2} className="px-8 py-20 text-center opacity-30 italic uppercase font-black text-sm tracking-widest">No entries recorded in this phase</td>
                       </tr>
                    )}
                 </tbody>
                 <tfoot>
                    <tr className="bg-slate-900 text-white font-black print:bg-white print:text-black print:border-t-4 print:border-black">
                       <td className="px-8 py-8 uppercase tracking-[0.3em] text-sm">Phase Grand Total</td>
                       <td className="px-8 py-8 text-right text-3xl font-mono">Ks {totalIn.toLocaleString()}</td>
                    </tr>
                 </tfoot>
              </table>
           </div>

           {/* Professional Sign-off for Print */}
           <div className="hidden print:block mt-24">
              <div className="grid grid-cols-2 gap-20">
                 <div className="border-t-2 border-black pt-6">
                    <p className="text-[10px] font-black uppercase mb-16">Authorized Banker Signature</p>
                    <div className="flex justify-between items-center text-[8px] text-slate-400 font-mono">
                       <span>Report Generated: {new Date().toISOString()}</span>
                    </div>
                 </div>
                 <div className="text-right pt-6">
                    <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Internal Audit Note</p>
                    <p className="text-[9px] text-slate-400 leading-relaxed italic">The values summarized here represent absolute aggregate liabilities. All manual corrections and adjustments have been factored into these final numbers.</p>
                 </div>
              </div>
           </div>
        </div>

        {isReadOnly && (
          <button 
            onClick={() => onSelectPhase(null as any)}
            className="mt-12 w-full py-5 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black text-slate-400 hover:text-indigo-600 transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-3 print:hidden"
          >
            <i className="fa-solid fa-grid-view"></i>
            <span className="uppercase tracking-widest text-xs">Choose Another Operational Slot</span>
          </button>
        )}
      </section>
    </div>
  );
};

export default PhaseManager;
