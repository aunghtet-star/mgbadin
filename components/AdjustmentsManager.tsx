
import React, { useState, useMemo } from 'react';
import { Bet } from '../types';

interface AdjustmentsManagerProps {
  bets: Bet[];
  onApplyAdjustment: (amount: number) => void;
  onVoidAdjustment: (id: string) => void;
  onUpdateAdjustment: (id: string, amount: number) => void;
  isReadOnly: boolean;
}

const AdjustmentsManager: React.FC<AdjustmentsManagerProps> = ({ 
  bets, onApplyAdjustment, onVoidAdjustment, onUpdateAdjustment, isReadOnly 
}) => {
  const [amountInput, setAmountInput] = useState('');

  // CRUD: State for Update (Editing)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmt, setEditAmt] = useState('');

  // CRUD: Read (List) - Filtering for entries with reserved 'ADJ' code
  const adjustments = useMemo(() => {
    return bets.filter(b => b.number === 'ADJ')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [bets]);

  const totalAddedVolume = useMemo(() => {
    return adjustments.reduce((acc, curr) => acc + curr.amount, 0);
  }, [adjustments]);

  // CRUD: Create
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountInput) {
      onApplyAdjustment(parseInt(amountInput));
      setAmountInput('');
    }
  };

  // CRUD: Update (Trigger)
  const handleEditInit = (adj: Bet) => {
    setEditingId(adj.id);
    setEditAmt(adj.amount.toString());
  };

  // CRUD: Update (Finalize)
  const handleSaveEdit = () => {
    if (editingId && editAmt) {
      onUpdateAdjustment(editingId, parseInt(editAmt));
      setEditingId(null);
      setEditAmt('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmt('');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CRUD: Create UI */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <i className="fa-solid fa-plus-circle text-indigo-600"></i>
              3OVA ပြင်ဆင်ရန်
            </h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Entry Amount (use minus to subtract)</label>
                <input 
                  type="number" value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="E.g. 100000 or -50000"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-xl font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isReadOnly || !amountInput}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 transition-all"
              >
                Add Volume Entry
              </button>
            </form>
          </div>
        </div>

        {/* CRUD: Read & Update & Delete UI */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-indigo-600 text-white p-6 rounded-3xl flex justify-between items-center shadow-xl">
             <div>
               <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Total Adjust Volume</p>
               <p className="text-3xl font-black">{totalAddedVolume.toLocaleString()}</p>
             </div>
             <div className="w-12 h-12 bg-white/20 text-white rounded-2xl flex items-center justify-center text-2xl">
               <i className="fa-solid fa-calculator"></i>
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
               <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest">Active Adjust Amounts</h4>
               <span className="text-[10px] font-black text-slate-400 uppercase">{adjustments.length} Entries</span>
            </div>
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Ref ID</th>
                    <th className="px-6 py-4">Added Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adjustments.map(adj => (
                    <tr key={adj.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                      <td className="px-6 py-4">
                        <span className="font-mono text-[10px] font-black text-slate-400 uppercase">
                          {adj.id.split('-').pop()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-lg">
                        {editingId === adj.id ? (
                          <input 
                            type="number" value={editAmt}
                            onChange={(e) => setEditAmt(e.target.value)}
                            className="w-32 bg-white dark:bg-slate-800 border border-indigo-500 rounded px-2 py-1 font-mono font-bold outline-none"
                          />
                        ) : (
                          <>{adj.amount.toLocaleString()}</>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isReadOnly && (
                          <div className="flex justify-end items-center space-x-2">
                             {editingId === adj.id ? (
                               <>
                                 <button onClick={handleSaveEdit} className="w-9 h-9 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-md">
                                   <i className="fa-solid fa-check"></i>
                                 </button>
                                 <button onClick={handleCancelEdit} className="w-9 h-9 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">
                                   <i className="fa-solid fa-xmark"></i>
                                 </button>
                               </>
                             ) : (
                               <>
                                 <button onClick={() => handleEditInit(adj)} className="w-9 h-9 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                                   <i className="fa-solid fa-pen-to-square"></i>
                                 </button>
                                 <button 
                                   onClick={() => onVoidAdjustment(adj.id)}
                                   className="w-9 h-9 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg hover:bg-rose-100 transition-all"
                                 >
                                   <i className="fa-solid fa-trash-can"></i>
                                 </button>
                               </>
                             )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {adjustments.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-20 text-center text-slate-400 italic">
                         No adjustments currently active.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdjustmentsManager;
