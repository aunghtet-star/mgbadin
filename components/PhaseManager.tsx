
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
  'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
  'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'
];

const PHASE_OPTIONS = MONTHS.flatMap(month => [`${month}-၀၁`, `${month}-၀၂`]);

export const PhaseManager: React.FC<PhaseManagerProps> = ({ currentPhase, ledger, onClosePhase, onSelectPhase, bets }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const totalPages = Math.ceil(groupedSummary.length / itemsPerPage);
  
  const paginatedSummary = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return groupedSummary.slice(start, start + itemsPerPage);
  }, [groupedSummary, currentPage]);

  const isReadOnly = ledger.some(l => l.phaseId === currentPhase?.id);

  if (!currentPhase) {
    return (
      <div className="space-y-10 animate-fade-in print:hidden">
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">လုပ်ငန်းစဉ်ကဏ္ဍများ</h2>
          <p className="text-slate-500 font-medium text-sm">စာရင်းသွင်းရန် သို့မဟုတ် အပြီးသတ်စာရင်းများ စစ်ဆေးရန် ကဏ္ဍတစ်ခုကို ရွေးချယ်ပါ။</p>
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
                <span className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isSettled ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {isSettled ? 'စာရင်းပိတ်ပြီး' : 'လက်ခံနိုင်သည်'}
                </span>
                <span className={`text-xl font-black block ${isSettled ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-900 dark:text-white'}`}>
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
              <span>စာရင်းပိတ်သိမ်းမှု မှတ်တမ်း</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {ledger.map(item => (
                <div key={item.id} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => onSelectPhase(item.phaseId)}>
                   <div className="flex justify-between items-start mb-4">
                      <p className="text-lg font-black text-slate-900 dark:text-white">{item.phaseId}</p>
                      <span className="text-[10px] bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase">အပြီးသတ်</span>
                   </div>
                   <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">အသားတင်အမြတ်</p>
                      <p className={`text-lg font-mono font-black ${item.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        ကျပ် {item.profit.toLocaleString()}
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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Action Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm print:hidden">
        <button 
          onClick={() => onSelectPhase(null as any)}
          className="flex items-center space-x-2 text-slate-500 hover:text-indigo-600 transition-colors text-xs font-black uppercase tracking-widest"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span>အစီအစဉ်ရွေးချယ်မှုသို့</span>
        </button>
      </div>

      {/* Main UI View */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-10 shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">{currentPhase.name}</h2>
            <div className="flex flex-wrap items-center gap-6">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">အခြေအနေ</span>
                  <span className={`text-sm font-bold uppercase ${isReadOnly ? 'text-emerald-600' : 'text-indigo-600'}`}>{isReadOnly ? 'စာရင်းပိတ်ပြီး' : 'ဖွင့်ထားဆဲ'}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">စုစုပေါင်းထိုးကွက်</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{currentPhase.totalBets.toLocaleString()} ကွက်</span>
               </div>
            </div>
          </div>
          
          {!isReadOnly && (
            <div className="flex flex-col items-end space-y-3">
              <button 
                onClick={() => setIsConfirming(true)}
                className="w-full md:w-auto px-10 py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-black text-white transition-all shadow-xl shadow-red-900/40"
              >
                စာရင်းပိတ်သိမ်းမည်
              </button>
              {isConfirming && (
                <div className="flex items-center space-x-3 animate-fade-in">
                   <button onClick={onClosePhase} className="text-sm font-black text-emerald-600 hover:underline uppercase">အတည်ပြုသည်</button>
                   <button onClick={() => setIsConfirming(false)} className="text-sm font-black text-slate-400 hover:underline uppercase">မလုပ်တော့ပါ</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
             <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-black text-[10px] tracking-widest border-y border-slate-100 dark:border-slate-800">
                   <th className="px-8 py-5">ဂဏန်း</th>
                   <th className="px-8 py-5 text-right">ပမာဏ (ကျပ်)</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {paginatedSummary.map((item) => (
                   <tr key={item.number} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className="px-8 py-5">
                         <span className="font-mono text-xl font-black text-slate-900 dark:text-white">#{item.number}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <span className="font-mono text-xl font-black text-slate-900 dark:text-white">{item.total.toLocaleString()}</span>
                      </td>
                   </tr>
                ))}
                {paginatedSummary.length === 0 && (
                   <tr>
                      <td colSpan={2} className="px-8 py-10 text-center text-slate-400 font-bold italic">
                         အချက်အလက်မရှိပါ။
                      </td>
                   </tr>
                )}
             </tbody>
             <tfoot>
                <tr className="bg-slate-900 text-white font-black">
                   <td className="px-8 py-8 uppercase tracking-widest text-sm">စုစုပေါင်းရငွေ</td>
                   <td className="px-8 py-8 text-right text-3xl font-mono">ကျပ် {totalIn.toLocaleString()}</td>
                </tr>
             </tfoot>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border-x border-b border-slate-200 dark:border-slate-800 rounded-b-3xl px-6 py-4">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white dark:bg-slate-900 disabled:opacity-30 rounded-xl text-xs font-black uppercase shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:bg-slate-50"
            >
              <i className="fa-solid fa-chevron-left mr-2"></i> ရှေ့သို့
            </button>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              စာမျက်နှာ {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white dark:bg-slate-900 disabled:opacity-30 rounded-xl text-xs font-black uppercase shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:bg-slate-50"
            >
              နောက်သို့ <i className="fa-solid fa-chevron-right ml-2"></i>
            </button>
          </div>
        )}

        {isReadOnly && (
          <button 
            onClick={() => onSelectPhase(null as any)}
            className="mt-12 w-full py-5 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black text-slate-400 hover:text-indigo-600 transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-3"
          >
            <i className="fa-solid fa-grid-view"></i>
            <span className="uppercase tracking-widest text-xs">အခြားအစီအစဉ်တစ်ခု ရွေးချယ်ရန်</span>
          </button>
        )}
      </section>
    </div>
  );
};
