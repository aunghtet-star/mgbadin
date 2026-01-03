
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
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [reductionInput, setReductionInput] = useState<string>('');
  
  const [newOverrideNum, setNewOverrideNum] = useState('');
  const [newOverrideVal, setNewOverrideVal] = useState('');

  const [activeLedgerTab, setActiveLedgerTab] = useState<LedgerTab>('all');

  const [editingBetId, setEditingBetId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // New sorting and filtering states
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  const [hideEmpty, setHideEmpty] = useState(false);

  const stats = useMemo(() => {
    const data: Record<string, number> = {};
    for(let i=0; i<1000; i++) {
      data[i.toString().padStart(3, '0')] = 0;
    }
    bets.forEach(b => {
      data[b.number] = (data[b.number] || 0) + b.amount;
    });
    
    return Object.entries(data)
      .map(([number, total]) => ({
        number,
        total,
        limit: limits[number] || limits['global'] || 50000
      }));
  }, [bets, limits]);

  const filteredStats = useMemo(() => {
    let results = [...stats];

    // 1. Apply "Hide Empty" filter
    if (hideEmpty) {
      results = results.filter(s => s.total > 0);
    }

    // 2. Apply Search
    if (search) {
      results = results.filter(s => s.number.includes(search));
    }

    // 3. Apply Sorting
    if (sortOrder === 'asc') {
      results.sort((a, b) => a.total - b.total);
    } else if (sortOrder === 'desc') {
      results.sort((a, b) => b.total - a.total);
    }
    // Default (none) is already 000-999 from the initial mapping

    return results;
  }, [stats, search, sortOrder, hideEmpty]);

  const paginatedStats = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStats.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStats, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredStats.length / itemsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1); 
  };

  const toggleSort = () => {
    setSortOrder(prev => {
      if (prev === 'none') return 'desc';
      if (prev === 'desc') return 'asc';
      return 'none';
    });
    setCurrentPage(1);
  };

  const toggleHideEmpty = () => {
    setHideEmpty(prev => !prev);
    setCurrentPage(1);
  };

  const getHeatColor = (total: number, limit: number) => {
    if (total === 0) return 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600';
    if (total > limit) return 'bg-red-600 border-red-400 text-white shadow-lg animate-pulse border-2';
    const percent = (total / limit) * 100;
    if (percent > 95) return 'bg-orange-600 border-orange-400 text-white';
    if (percent > 75) return 'bg-amber-600 border-amber-400 text-white';
    if (percent > 40) return 'bg-indigo-600 border-indigo-400 text-white';
    return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-300';
  };

  const currentSelectionData = useMemo(() => {
    if (!selectedNumber) return null;
    return stats.find(s => s.number === selectedNumber);
  }, [selectedNumber, stats]);

  const overage = currentSelectionData ? Math.max(0, currentSelectionData.total - currentSelectionData.limit) : 0;

  const handleApplyCorrection = () => {
    if (selectedNumber && reductionInput) {
      onApplyReduction(selectedNumber, parseInt(reductionInput));
      setReductionInput('');
      setSelectedNumber(null);
    }
  };

  const handleSaveEdit = (betId: string) => {
    const newVal = parseInt(editValue);
    if (!isNaN(newVal)) {
      onUpdateBetAmount(betId, newVal);
    }
    setEditingBetId(null);
  };

  const handleAddOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOverrideNum.length === 3 && !isNaN(parseInt(newOverrideVal))) {
      onUpdateLimit(newOverrideNum, parseInt(newOverrideVal));
      setNewOverrideNum('');
      setNewOverrideVal('');
    }
  };

  const recentTickets = useMemo(() => {
    const sorted = [...bets].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (activeLedgerTab === 'tickets') return sorted.filter(b => b.amount > 0);
    if (activeLedgerTab === 'corrections') return sorted.filter(b => b.amount < 0);
    return sorted;
  }, [bets, activeLedgerTab]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <i className="fa-solid fa-sliders"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">3D overview သတ်မှတ်ချက်များ</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">ဘေးကင်းလုံခြုံမှု ကန့်သတ်ချက်များ</p>
            </div>
          </div>
          <button 
            onClick={() => setShowLimitSettings(!showLimitSettings)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${showLimitSettings ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
          >
            {showLimitSettings ? 'သတ်မှတ်ချက်များပိတ်ရန်' : 'ကန့်သတ်ချက်များပြင်ဆင်ရန်'}
          </button>
        </div>

        {showLimitSettings && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">အများဆုံး လက်ခံမည့်ပမာဏ (Global)</span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">ကျပ်</span>
                  <input 
                    type="number"
                    value={limits['global']}
                    onChange={(e) => onUpdateLimit('global', parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </label>

              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">သီးခြားကန့်သတ်ထားသော ဂဏန်းများ</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(limits).filter(([k]) => k !== 'global').map(([num, val]) => (
                    <div key={num} className="bg-white dark:bg-indigo-900/20 border border-slate-200 dark:border-indigo-500/30 pl-3 pr-1 py-1 rounded-lg flex items-center space-x-2 shadow-sm">
                      <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">{num}:</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">ကျပ် {val.toLocaleString()}</span>
                      <button onClick={() => onUpdateLimit(num, limits['global'])} className="w-6 h-6 hover:bg-red-50 dark:hover:bg-indigo-500/20 rounded-md transition-colors text-slate-400 hover:text-red-500">
                        <i className="fa-solid fa-xmark text-[10px]"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleAddOverride} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest block">သီးခြားကန့်သတ်ချက်အသစ်ထည့်ရန်</span>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" maxLength={3} placeholder="777" value={newOverrideNum}
                  onChange={(e) => setNewOverrideNum(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono"
                />
                <input 
                  type="number" placeholder="10000" value={newOverrideVal}
                  onChange={(e) => setNewOverrideVal(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono"
                />
              </div>
              <button type="submit" disabled={newOverrideNum.length !== 3 || !newOverrideVal} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase shadow-lg shadow-indigo-600/20">သတ်မှတ်ချက်အတည်ပြုမည်</button>
            </form>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-fire text-red-500"></i>
            <span>3D overview ({filteredStats.length} ကွက်)</span>
          </h3>
          
          <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Filtering - Show Only Betted Numbers */}
            <button
              onClick={toggleHideEmpty}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${hideEmpty ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500'}`}
            >
              <i className={`fa-solid ${hideEmpty ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              <span className="hidden sm:inline">ထိုးကြေးရှိသောဂဏန်းများသာ</span>
            </button>

            {/* Sorting Button */}
            <button
              onClick={toggleSort}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-black uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:border-indigo-500 transition-all`}
            >
              <i className={`fa-solid ${sortOrder === 'none' ? 'fa-sort' : sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down'}`}></i>
              <span>{sortOrder === 'none' ? 'စီစစ်ရန်' : sortOrder === 'asc' ? 'အနည်းမှအများ' : 'အများမှအနည်း'}</span>
            </button>

            {/* Search Input */}
            <div className="relative flex-grow md:w-48 lg:w-64">
              <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="text" placeholder="ဂဏန်းရှာရန်..." value={search}
                onChange={handleSearchChange}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-20 gap-1">
          {paginatedStats.map(row => (
            <div 
              key={row.number}
              onClick={() => setSelectedNumber(row.number)}
              className={`aspect-square flex flex-col items-center justify-center rounded-md border cursor-pointer transition-all hover:scale-110 p-0.5 ${getHeatColor(row.total, row.limit)}`}
              title={`${row.number}: ကျပ် ${row.total.toLocaleString()}`}
            >
              <span className="text-[13px] font-black leading-none">{row.number}</span>
              {row.total > 0 && (
                <span className="text-[10px] font-bold mt-0.5 truncate w-full text-center overflow-hidden">
                  {row.total.toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 mt-4 shadow-sm">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 disabled:opacity-30 rounded-lg text-xs font-black uppercase transition-all"
            >
              <i className="fa-solid fa-chevron-left mr-1"></i> ရှေ့သို့
            </button>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              စာမျက်နှာ {currentPage} (စုစုပေါင်း {totalPages})
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 disabled:opacity-30 rounded-lg text-xs font-black uppercase transition-all"
            >
              နောက်သို့ <i className="fa-solid fa-chevron-right ml-1"></i>
            </button>
          </div>
        )}
      </div>

      {selectedNumber && currentSelectionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-scale-in">
             <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-4">
                   <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-indigo-600/20">
                     {selectedNumber}
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">ကိုယ်တိုင်ပြင်ဆင်ရန်</h3>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">ကျော်လွန်ပမာဏများ လျှော့ချရန်</p>
                   </div>
                </div>
                <button onClick={() => setSelectedNumber(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
             </div>
             
             <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                   <p className="text-[10px] text-slate-400 uppercase font-black mb-1">လက်ရှိပမာဏ</p>
                   <p className="text-xl font-mono font-black text-slate-900 dark:text-white">ကျပ် {currentSelectionData.total.toLocaleString()}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${overage > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}>
                   <p className={`text-[10px] uppercase font-black mb-1 ${overage > 0 ? 'text-red-500' : 'text-slate-400'}`}>ကျော်လွန်နေမှု</p>
                   <p className={`text-xl font-mono font-black ${overage > 0 ? 'text-red-600' : 'text-emerald-500'}`}>ကျပ် {overage.toLocaleString()}</p>
                </div>
             </div>

             <div className="space-y-4">
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">ကျပ်</span>
                   <input 
                    type="number" value={reductionInput} onChange={(e) => setReductionInput(e.target.value)}
                    placeholder="လျှော့ချမည့် ပမာဏ..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-slate-900 dark:text-white font-mono text-lg outline-none"
                   />
                </div>
                <button 
                  onClick={handleApplyCorrection}
                  disabled={!reductionInput || isReadOnly}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 disabled:opacity-30 transition-all"
                >
                  ပမာဏ လျှော့ချမည်
                </button>
             </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
           <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest">တိုက်ရိုက် လုပ်ဆောင်ချက်မှတ်တမ်း</h4>
           <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl">
             <button onClick={() => setActiveLedgerTab('all')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase ${activeLedgerTab === 'all' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400'}`}>အားလုံး</button>
             <button onClick={() => setActiveLedgerTab('tickets')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase ${activeLedgerTab === 'tickets' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400'}`}>စာရင်းသွင်းမှု</button>
             <button onClick={() => setActiveLedgerTab('corrections')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase ${activeLedgerTab === 'corrections' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-400'}`}>ပြင်ဆင်မှု</button>
           </div>
        </div>
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 font-black uppercase">
              <tr>
                <th className="px-6 py-4">အသေးစိတ်</th>
                <th className="px-6 py-4">ပမာဏ</th>
                <th className="px-6 py-4 text-right">လုပ်ဆောင်ချက်</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTickets.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-black text-lg text-slate-900 dark:text-white">#{t.number}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 font-mono font-bold text-sm ${t.amount < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {editingBetId === t.id ? (
                      <div className="flex items-center space-x-2">
                        <input 
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-24 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded outline-none text-slate-900 dark:text-white font-mono"
                          autoFocus
                        />
                        <button onClick={() => handleSaveEdit(t.id)} className="text-indigo-600 hover:text-indigo-400">
                          <i className="fa-solid fa-check"></i>
                        </button>
                        <button onClick={() => setEditingBetId(null)} className="text-slate-400 hover:text-slate-300">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    ) : (
                      <>{t.amount < 0 ? '-' : '+'}ကျပ် {Math.abs(t.amount).toLocaleString()}</>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!isReadOnly && editingBetId !== t.id && (
                      <div className="flex items-center justify-end space-x-3">
                        <button 
                          onClick={() => {
                            setEditingBetId(t.id);
                            setEditValue(t.amount.toString());
                          }} 
                          className="text-slate-300 hover:text-indigo-500 transition-colors"
                          title="ပြင်ဆင်ရန်"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onClick={() => onVoidBet(t.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="ပယ်ဖျက်ရန်">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RiskDashboard;
