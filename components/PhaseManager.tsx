
import React, { useState, useMemo } from 'react';
import { GamePhase, LedgerEntry, Bet } from '../types';

interface PhaseManagerProps {
  phases: GamePhase[];
  currentPhase: GamePhase | null;
  ledger: LedgerEntry[];
  onAddPhase: (name: string) => void;
  onDeletePhase: (id: string) => void;
  onClosePhase: () => void;
  onSelectPhase: (phaseId: string) => void;
  bets: Bet[];
}

export const PhaseManager: React.FC<PhaseManagerProps> = ({
  phases,
  currentPhase,
  ledger,
  onAddPhase,
  onDeletePhase,
  onClosePhase,
  onSelectPhase,
  bets
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const groupedSummary = useMemo(() => {
    if (!currentPhase) return [];
    const phaseBets = bets.filter(b => b.phaseId === currentPhase.id && b.number !== 'ADJ');
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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPhaseName.trim()) {
      onAddPhase(newPhaseName.trim());
      setNewPhaseName('');
    }
  };

  if (!currentPhase) {
    return (
      <div className="space-y-10 animate-fade-in print:hidden">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">3 ချပ်အသစ်လုပ်ရန်</h2>
            <p className="text-slate-500 font-medium text-sm">Create and manage your 3D draw cycles or review settled accounts.</p>
          </div>

          <form onSubmit={handleCreate} className="flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-full md:w-auto">
            <input
              type="text"
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              placeholder="Phase Name (e.g. Draw-101)"
              className="bg-transparent px-4 py-2 outline-none text-sm font-bold w-full"
              required
            />
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-indigo-600/20 active:scale-95 transition-all whitespace-nowrap"
            >
              Create Phase
            </button>
          </form>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-triangle-exclamation text-rose-600 text-2xl"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Delete Phase?</h3>
                <p className="text-sm text-slate-500">This action cannot be undone. All data associated with this phase will be permanently deleted.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirmId) {
                      onDeletePhase(deleteConfirmId);
                      setDeleteConfirmId(null);
                    }
                  }}
                  className="py-3.5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {phases.map((phase) => {
            const isSettled = ledger.some(l => l.phaseId === phase.id);
            const phaseBetsCount = bets.filter(b => b.phaseId === phase.id).length;

            return (
              <div
                key={phase.id}
                className={`group border-2 p-6 rounded-3xl transition-all duration-300 relative overflow-hidden shadow-sm flex flex-col justify-between h-48 ${isSettled
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-600'
                  }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div className={`text-2xl ${isSettled ? 'text-emerald-500' : 'text-indigo-600'}`}>
                      <i className={`fa-solid ${isSettled ? 'fa-box-archive' : 'fa-ticket'}`}></i>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(phase.id); }}
                        className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                        title="Delete Phase"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className={`block text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isSettled ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {isSettled ? 'Settled Account' : (phaseBetsCount > 0 ? 'Active Entries' : 'Empty Draft')}
                    </span>
                    <h4 className={`text-xl font-black block truncate ${isSettled ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-900 dark:text-white'}`}>
                      {phase.name}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <p className="text-[10px] font-black text-slate-400 uppercase">{phaseBetsCount} Slips</p>
                  <button
                    onClick={() => onSelectPhase(phase.id)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all active:scale-90 ${isSettled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      }`}
                  >
                    {isSettled ? 'Review' : 'Enter'}
                  </button>
                </div>
              </div>
            );
          })}

          {phases.length === 0 && (
            <div className="col-span-full py-20 bg-slate-100/50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-400">
              <i className="fa-solid fa-folder-plus text-4xl mb-4 opacity-20"></i>
              <p className="font-black uppercase tracking-widest text-xs">No phases created yet</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm print:hidden">
        <button
          onClick={() => onSelectPhase(null as any)}
          className="flex items-center space-x-2 text-slate-500 hover:text-indigo-600 transition-colors text-xs font-black uppercase tracking-widest"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span>Back to Phases</span>
        </button>
      </div>

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-10 shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">{currentPhase.name}</h2>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</span>
                <span className={`text-sm font-bold uppercase ${isReadOnly ? 'text-emerald-600' : 'text-indigo-600'}`}>{isReadOnly ? 'Settled' : 'Active'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Tickets</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{currentPhase.totalBets.toLocaleString()} units</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Volume</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{totalIn.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex flex-col items-end space-y-3">
              <button
                onClick={() => setIsConfirming(true)}
                className="w-full md:w-auto px-10 py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-black text-white transition-all shadow-xl shadow-red-900/40"
              >
                သိမ်းမည်
              </button>
              {isConfirming && (
                <div className="flex items-center space-x-3 animate-fade-in">
                  <button onClick={onClosePhase} className="text-sm font-black text-emerald-600 hover:underline uppercase">သိမ်းမည် (အတည်ပြုပါ)</button>
                  <button onClick={() => setIsConfirming(false)} className="text-sm font-black text-slate-400 hover:underline uppercase">Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-black text-[10px] tracking-widest border-y border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5">Number</th>
                <th className="px-8 py-5 text-right">Amount</th>
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
                    No data available.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-black">
                <td className="px-8 py-8 uppercase tracking-widest text-sm">Total Revenue</td>
                <td className="px-8 py-8 text-right text-3xl font-mono">{totalIn.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-slate-900/50 border-x border-b border-slate-200 dark:border-slate-800 rounded-b-3xl px-6 py-4 shadow-sm">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-black uppercase shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center"
            >
              <i className="fa-solid fa-chevron-left mr-2"></i> PREV
            </button>
            <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">
              PAGE {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-black uppercase shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center"
            >
              NEXT <i className="fa-solid fa-chevron-right ml-2"></i>
            </button>
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-fade-in border border-slate-200 dark:border-slate-800">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-triangle-exclamation text-rose-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Delete Phase?</h3>
              <p className="text-sm text-slate-500">This action cannot be undone. All data associated with this phase will be permanently deleted.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmId) {
                    onDeletePhase(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }
                }}
                className="py-3.5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
