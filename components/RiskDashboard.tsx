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

/**
 * Reshapes a flat array into a column-major (vertical) grid.
 */
const toVerticalGrid = (data: any[], cols: number) => {
  const rows = Math.ceil(data.length / cols);
  const result = new Array(rows * cols).fill(null);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const srcIndex = c * rows + r;
      if (srcIndex < data.length) {
        result[r * cols + c] = data[srcIndex];
      }
    }
  }
  return result;
};

const RiskDashboard: React.FC<RiskDashboardProps> = ({ 
  bets, limits, onUpdateLimit, onVoidBet, onUpdateBetAmount, onApplyReduction, isReadOnly 
}) => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [manifestPage, setManifestPage] = useState(0);
  const itemsPerPage = 100; // 10x10 grid
  
  const [showManifest, setShowManifest] = useState(false);
  const [showBrakeModal, setShowBrakeModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [reductionInput, setReductionInput] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Brake Management State
  const [brakeSearch, setBrakeSearch] = useState('');
  const [tempLimitValue, setTempLimitValue] = useState('');
  
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
    }).sort((a, b) => a.number.localeCompare(b.number));
  }, [bets, limits]);

  const filteredStats = useMemo(() => {
    if (!search) return stats;
    return stats.filter(s => s.number.includes(search));
  }, [stats, search]);

  const totalAmount = useMemo(() => {
    return filteredStats.reduce((sum, s) => sum + s.total, 0);
  }, [filteredStats]);

  const totalPages = Math.ceil(filteredStats.length / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(0, totalPages - 1));

  const paginatedStats = useMemo(() => {
    const start = activePage * itemsPerPage;
    return filteredStats.slice(start, start + itemsPerPage);
  }, [filteredStats, activePage]);

  // Manifest Pagination
  const totalManifestPages = Math.ceil(stats.length / itemsPerPage);
  const activeManifestPage = Math.min(manifestPage, totalManifestPages - 1);
  const paginatedManifestStats = useMemo(() => {
    const start = activeManifestPage * itemsPerPage;
    return stats.slice(start, start + itemsPerPage);
  }, [stats, activeManifestPage]);

  const colsCount = 10;
  const verticalStatsUI = useMemo(() => toVerticalGrid(paginatedStats, colsCount), [paginatedStats]);
  const verticalManifestUI = useMemo(() => toVerticalGrid(paginatedManifestStats, colsCount), [paginatedManifestStats]);
  
  const verticalFullGridBlocks = useMemo(() => {
    const blocks = [];
    for (let i = 0; i < 10; i++) {
      const slice = stats.slice(i * 100, (i + 1) * 100);
      blocks.push(toVerticalGrid(slice, 10));
    }
    return blocks;
  }, [stats]);

  const handleExportPDF = async () => {
    const element = document.getElementById('full-risk-export-manifest');
    const html2pdfLib = (window as any).html2pdf;
    if (!element || !html2pdfLib) return;
    
    setIsExporting(true);
    const opt = {
      margin:       [5, 5, 5, 5],
      filename:     `3D_Risk_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true , backgroundColor: '#ffffff' },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await html2pdfLib().set(opt).from(element).save();
    } finally {
      setIsExporting(false);
    }
  };

  const handleSetBrake = () => {
    if (!tempLimitValue) return;
    const num = brakeSearch.padStart(3, '0');
    if (brakeSearch.toLowerCase() === 'global' || brakeSearch === '') {
      onUpdateLimit('global', parseInt(tempLimitValue));
    } else {
      onUpdateLimit(num, parseInt(tempLimitValue));
    }
    setTempLimitValue('');
    setBrakeSearch('');
  };

  return (
    <div className="space-y-6">
      {/* Hidden Print Template */}
      <div style={{ position: 'fixed', top: 0, left: '-10000mm', width: '297mm', pointerEvents: 'none' }} aria-hidden="true">
        <div id="full-risk-export-manifest" style={{ width: '287mm', padding: '10mm', backgroundColor: '#ffffff', color: '#000000' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '15px', textTransform: 'uppercase' }}>MgBaDin 3D Risk Full Scan</h2>
          
          {verticalFullGridBlocks.map((grid, bIdx) => (
            <div key={bIdx} style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
              <div style={{ fontSize: '10px', fontWeight: '900', marginBottom: '5px', color: '#666' }}>
                BATCH {bIdx + 1} ({bIdx}00 - {bIdx}99)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '1px', border: '1px solid black', backgroundColor: '#000' }}>
                {grid.map((item, idx) => (
                  <div key={item?.number || `empty-${idx}`} style={{ 
                    backgroundColor: item?.total > item?.limit ? '#ef4444' : '#fff', 
                    color: item?.total > item?.limit ? '#fff' : '#000',
                    padding: '2px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: '0.5px solid #000',
                    whiteSpace: 'nowrap'
                  }}>
                    {item ? `${item.number} - ${item.total.toLocaleString()}` : ''}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'end', alignItems: 'center', borderBottom: '2px solid black', paddingBottom: '10px', marginTop: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '18px', fontWeight: '900' }}>GRAND TOTAL : {stats.reduce((a, b) => a + b.total, 0).toLocaleString()}</p>
              <p style={{ fontSize: '10px', fontWeight: '700' }}>Generated on {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-grid-horizontal text-indigo-600"></i>
          <span>3D Overview (10x10 Grid)</span>
        </h3>

        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setShowBrakeModal(true)}
            className="px-6 py-4 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase flex items-center gap-2 shadow-lg hover:bg-rose-500 transition-all active:scale-95"
          >
            <i className="fa-solid fa-hand-stop"></i>
            ဘရိတ်သတ်မှတ်မည်
          </button>
          <div className="relative flex-grow">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text" placeholder="Search number..." value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 h-full"
            />
          </div>
          <button 
            onClick={() => setShowManifest(true)}
            className="px-6 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase flex items-center gap-2 shadow-lg"
          >
            3D ကြည့်မည်
          </button>
        </div>
      </div>

      <div className="grid grid-cols-10 gap-2 min-h-[450px]">
        {verticalStatsUI.map((item, idx) => {
          if (!item) return <div key={`empty-${idx}`} className="h-[56px]"></div>;
          const isOverLimit = item.total > item.limit;
          return (
            <div 
              key={item.number}
              onClick={() => setSelectedNumber(item.number)}
              className={`flex flex-col items-center justify-center border-2 rounded-xl py-4 px-1 transition-all hover:scale-110 cursor-pointer h-full relative ${
                isOverLimit 
                  ? 'bg-red-600 border-red-700 text-white shadow-lg z-10' 
                  : (item.total > 0 ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-900 text-slate-300 dark:text-slate-800 opacity-60')
              }`}
            >
              <div style={{ fontSize: '17px' }} className="font-black leading-none truncate whitespace-nowrap tracking-tighter">
                {item.number} - {item.total > 0 ? item.total.toLocaleString() : '-'}
              </div>
              {limits[item.number] && (
                <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black px-1 rounded-sm shadow-sm border border-white">
                  LIMIT
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination and Totals */}
      <div className="flex flex-col md:flex-row items-center justify-between mt-8 gap-4 bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl items-center space-x-3 shadow-inner">
           <button 
             onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
             disabled={activePage === 0}
             className="w-10 h-10 flex items-center justify-center text-[14px] font-black uppercase disabled:opacity-20 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95 shadow-sm"
           >
             <i className="fa-solid fa-chevron-left"></i>
           </button>
           <div className="px-4 flex flex-col items-center">
             <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Page</span>
             <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
               {activePage + 1} / {Math.max(1, totalPages)}
             </span>
           </div>
           <button 
             onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
             disabled={activePage >= totalPages - 1}
             className="w-10 h-10 flex items-center justify-center text-[14px] font-black uppercase disabled:opacity-20 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95 shadow-sm"
           >
             <i className="fa-solid fa-chevron-right"></i>
           </button>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex flex-col text-right">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Global Brake</span>
            <span className="text-sm font-black text-rose-600 leading-none">
              { (limits['global'] || 5000).toLocaleString() }
            </span>
          </div>
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-800"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Batch Total</span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
              {totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Brake Settings Modal */}
      {showBrakeModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-fade-in border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-3">
                 <i className="fa-solid fa-shield-halved text-rose-600"></i>
                 Brake Settings
               </h3>
               <button onClick={() => setShowBrakeModal(false)} className="text-slate-400 hover:text-slate-600">
                 <i className="fa-solid fa-circle-xmark text-2xl"></i>
               </button>
            </div>

            <div className="space-y-6">
              <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/50">
                <label className="block text-[10px] font-black uppercase text-rose-600 mb-2">Global Brake Limit (Default for all)</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    defaultValue={limits['global'] || 5000}
                    onChange={(e) => onUpdateLimit('global', parseInt(e.target.value) || 0)}
                    className="flex-grow bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-900/50 p-4 rounded-xl text-xl font-mono font-black outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <div className="w-14 h-14 bg-rose-600 text-white rounded-xl flex items-center justify-center text-xl shadow-lg">
                    <i className="fa-solid fa-earth-asia"></i>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Set Specific Number Brake</label>
                <div className="flex flex-col gap-3">
                   <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Number (e.g. 777)"
                      value={brakeSearch}
                      onChange={(e) => setBrakeSearch(e.target.value.replace(/\D/g, '').substring(0,3))}
                      className="w-1/3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-xl font-mono font-black outline-none"
                    />
                    <input 
                      type="number" 
                      placeholder="Custom Brake Amount"
                      value={tempLimitValue}
                      onChange={(e) => setTempLimitValue(e.target.value)}
                      className="flex-grow bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-xl font-mono font-black outline-none"
                    />
                   </div>
                   <button 
                     onClick={handleSetBrake}
                     className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-indigo-500 transition-all active:scale-95"
                   >
                     Update Specific Brake
                   </button>
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto custom-scrollbar border-t border-slate-100 dark:border-slate-800 pt-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Active Specific Limits</p>
                 {Object.entries(limits).filter(([k]) => k !== 'global').length > 0 ? (
                   <div className="grid grid-cols-2 gap-2">
                     {Object.entries(limits).filter(([k]) => k !== 'global').map(([num, val]) => (
                       <div key={num} className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg text-xs font-black">
                         <span className="text-indigo-600">#{num}</span>
                         <span className="text-slate-900 dark:text-white">{val.toLocaleString()}</span>
                         <button onClick={() => onUpdateLimit(num, 0)} className="text-rose-500 hover:scale-110">
                           <i className="fa-solid fa-times"></i>
                         </button>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <p className="text-[10px] italic text-slate-400">No specific limits set.</p>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showManifest && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-7xl h-[95vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50 text-slate-900">
                 <div className="flex flex-col">
                   <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Manifest View</h2>
                 </div>
                 <div className="flex items-center gap-6">
                    <button 
                      onClick={handleExportPDF} 
                      disabled={isExporting}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                    >
                      {isExporting ? 'Generating...' : 'Export Full PDF'}
                    </button>
                    <button onClick={() => setShowManifest(false)} className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-200 hover:bg-slate-300 transition-all">
                      <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                 </div>
              </div>
              <div className="flex-grow overflow-auto p-10 bg-white text-black font-mono custom-scrollbar">
                {/* 10x10 Paginated Grid in Manifest with 11px font and Vertical Sorting */}
                <div className="grid grid-cols-10 border-t border-l border-black gap-[1px]">
                   {verticalManifestUI.map((item, idx) => item ? (
                     <div 
                        key={item.number} 
                        style={{ fontSize: '11px' }}
                        className={`p-3 font-black text-left border-r border-b border-black ${item.total > item.limit ? 'bg-red-600 text-white' : 'bg-white text-black'}`}
                      >
                       {item.number} - {item.total.toLocaleString()}
                     </div>
                   ) : <div key={`man-empty-${idx}`} className="bg-white border-r border-b border-black"></div>)}
                </div>

                <div className="border-b-4 border-black pb-4 mb-8 mt-4 flex justify-between items-end">
                   <div></div>
                   <div className="text-right">
                     <p className="font-black text-3xl leading-none mb-1">Total: {stats.reduce((a, b) => a + b.total, 0).toLocaleString()}</p>
                     <p className="font-bold text-slate-500">{new Date().toLocaleString()}</p>
                   </div>
                </div>

                <div className="flex justify-center mt-4">
                  <div className="flex bg-white p-1 rounded-xl shadow-inner border border-slate-200 items-center space-x-2">
                     <button 
                       onClick={() => setManifestPage(p => Math.max(0, p - 1))} 
                       disabled={activeManifestPage === 0}
                       className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg disabled:opacity-30" 
                     >
                       <i className="fa-solid fa-chevron-left"></i>
                     </button>
                     <span className="px-4 text-xs font-black uppercase tracking-widest">Page {activeManifestPage + 1} / {totalManifestPages}</span>
                     <button 
                       onClick={() => setManifestPage(p => Math.min(totalManifestPages - 1, p + 1))} 
                       disabled={activeManifestPage >= totalManifestPages - 1}
                       className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg disabled:opacity-30" 
                     >
                       <i className="fa-solid fa-chevron-right"></i>
                     </button>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {selectedNumber && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-fade-in border border-slate-200 dark:border-slate-800">
            <h3 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">Reduce #{selectedNumber}</h3>
            <div className="mb-6">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Subtract Amount</label>
              <input 
                type="number" value={reductionInput} onChange={(e) => setReductionInput(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl text-2xl font-mono outline-none focus:ring-4 focus:ring-rose-500/20 text-rose-600"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  if (reductionInput) {
                    onApplyReduction(selectedNumber, parseInt(reductionInput));
                  }
                  setReductionInput('');
                  setSelectedNumber(null);
                }}
                className="py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
              >
                Apply
              </button>
              <button onClick={() => setSelectedNumber(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskDashboard;