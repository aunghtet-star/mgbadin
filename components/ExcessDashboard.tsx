import React, { useMemo, useState } from 'react';
import { Bet } from '../types';

interface ExcessDashboardProps {
  bets: Bet[];
  limits: Record<string, number>;
  onClearExcess: () => void;
  isReadOnly: boolean;
}

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

const ExcessDashboard: React.FC<ExcessDashboardProps> = ({ bets, limits, onClearExcess, isReadOnly }) => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [manifestPage, setManifestPage] = useState(0);
  const itemsPerPage = 100;

  const [showSlip, setShowSlip] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const excessStats = useMemo(() => {
    const data: Record<string, number> = {};
    bets.forEach(b => {
      data[b.number] = (data[b.number] || 0) + b.amount;
    });

    const results = [];
    for (let i = 0; i < 1000; i++) {
      const numStr = i.toString().padStart(3, '0');
      const total = data[numStr] || 0;
      const limit = limits[numStr] || limits['global'] || 5000;
      const excess = Math.max(0, total - limit);

      if (excess > 0) {
        results.push({ number: numStr, total, limit, excess });
      }
    }
    return results.sort((a, b) => a.number.localeCompare(b.number));
  }, [bets, limits]);

  const filteredExcess = useMemo(() => {
    if (!search) return excessStats;
    return excessStats.filter(item => item.number.includes(search));
  }, [excessStats, search]);

  const totalFilteredExcessAmount = useMemo(() => {
    return filteredExcess.reduce((sum, item) => sum + item.excess, 0);
  }, [filteredExcess]);

  const totalPages = Math.ceil(filteredExcess.length / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(0, totalPages - 1));

  const paginatedExcess = useMemo(() => {
    const start = activePage * itemsPerPage;
    return filteredExcess.slice(start, start + itemsPerPage);
  }, [filteredExcess, activePage]);

  // Manifest Pagination
  const totalManifestPages = Math.ceil(excessStats.length / itemsPerPage);
  const activeManifestPage = Math.min(manifestPage, Math.max(0, totalManifestPages - 1));
  const paginatedManifestStats = useMemo(() => {
    const start = activeManifestPage * itemsPerPage;
    return excessStats.slice(start, start + itemsPerPage);
  }, [excessStats, activeManifestPage]);

  // UI Grids
  const colsCount = 10;
  const verticalExcessUI = useMemo(() => toVerticalGrid(paginatedExcess, colsCount), [paginatedExcess]);
  const verticalManifestUI = useMemo(() => toVerticalGrid(paginatedManifestStats, colsCount), [paginatedManifestStats]);
  
  // Full Excess Grid for PDF (Vertical Sorting)
  const verticalFullExcessGrid = useMemo(() => toVerticalGrid(excessStats, colsCount), [excessStats]);

  const handleExportPDF = async () => {
    const element = document.getElementById('full-excess-export-manifest');
    const html2pdfLib = (window as any).html2pdf;
    if (!element || !html2pdfLib) return;
    
    setIsExporting(true);
    const opt = {
      margin:       [5, 5, 5, 5],
      filename:     `3D_Excess_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true , backgroundColor: '#ffffff'},
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await html2pdfLib().set(opt).from(element).save();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden Print Template - Standardized with RiskDashboard style */}
      <div style={{ position: 'fixed', top: 0, left: '-10000mm', width: '297mm', pointerEvents: 'none' }} aria-hidden="true">
        <div id="full-excess-export-manifest" style={{ width: '287mm', padding: '10mm', backgroundColor: '#ffffff', color: '#000000' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '15px', textTransform: 'uppercase' }}>MgBaDin 3D Excess Report</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '1px', border: '1px solid black', backgroundColor: '#000' }}>
            {verticalFullExcessGrid.map((item, idx) => (
              <div key={item?.number || idx} style={{ 
                backgroundColor: '#fff', 
                color: '#000',
                padding: '2px',
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: '700',
                border: '0.5px solid #000',
                whiteSpace: 'nowrap'
              }}>
                {item ? `${item.number} - ${item.excess.toLocaleString()}` : ''}
              </div>
            ))}
          </div>
           <div style={{ display: 'flex', justifyContent: 'end', alignItems: 'center', borderBottom: '2px solid black', paddingBottom: '10px', marginTop: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '18px', fontWeight: '900' }}>TOTAL EXCESS : {excessStats.reduce((a, b) => a + b.excess, 0).toLocaleString()}</p>
              <p style={{ fontSize: '10px', fontWeight: '700' }}>Generated on {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] uppercase font-black text-slate-500 mb-1">Hot Numbers Count</p>
          <p className="text-3xl font-black">{excessStats.length}</p>
        </div>
        <div className="flex gap-2 lg:col-span-2">
          <button 
            onClick={() => setShowSlip(true)}
            className="flex-grow py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            3 ကျွံ ကြည့်မည်
          </button>
          <button 
            onClick={() => setIsConfirmingClear(true)}
            disabled={excessStats.length === 0 || isReadOnly}
            className="flex-grow py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-30"
          >
            3 ကျွံဖျက်မည်
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-fire text-rose-500"></i>
            <span>3 ကျွံ Overview</span>
          </h3>
          
          <div className="relative w-full md:w-80">
             <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
             <input 
               type="text" placeholder="Search hot numbers..." value={search}
               onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
               className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
             />
          </div>
        </div>

        <div className="grid grid-cols-10 gap-2 min-h-[500px]">
          {verticalExcessUI.map((item, idx) => {
            if (!item) return <div key={`empty-${idx}`} className="h-[64px]"></div>;
            return (
              <div 
                key={item.number}
                className="flex items-center justify-start px-2 text-dark rounded-lg py-4 font-black shadow-md transform transition-all hover:scale-110 h-full border border-slate-200 dark:border-slate-800"
              >
                <div style={{ fontSize: '17px' }} className="font-black leading-none truncate whitespace-nowrap tracking-tighter">
                  {item.number} - {item.excess.toLocaleString()}
                </div>
              </div>
            );
          })}
          {filteredExcess.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400 font-black uppercase tracking-widest opacity-20">
              ကျွံမရှိပါ
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between mt-10 gap-4 bg-rose-50 dark:bg-rose-950/20 p-4 rounded-3xl border border-rose-100 dark:border-rose-900/50 shadow-sm">
          <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl items-center space-x-3 shadow-sm border border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={activePage === 0}
              className="w-10 h-10 flex items-center justify-center text-[14px] font-black uppercase disabled:opacity-20 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <div className="px-4 flex flex-col items-center">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Page</span>
              <span className="text-sm font-black text-rose-600 leading-none">
                {activePage + 1} / {Math.max(1, totalPages)}
              </span>
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={activePage >= totalPages - 1}
              className="w-10 h-10 flex items-center justify-center text-[14px] font-black uppercase disabled:opacity-20 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95"
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-rose-400 block mb-1 leading-none tracking-widest">Current Page Excess</span>
            <span className="text-2xl font-black text-rose-600 leading-none">
              {totalFilteredExcessAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {showSlip && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-7xl h-[95vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50 text-slate-900">
                 <div className="flex flex-col">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Excess Manifest View</h2>
                 </div>
                 <div className="flex items-center gap-6">
                    <button 
                      onClick={handleExportPDF} 
                      disabled={isExporting}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                    >
                      {isExporting ? 'Generating...' : 'Export Full PDF'}
                    </button>
                    <button onClick={() => setShowSlip(false)} className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-200 hover:bg-slate-300 transition-all">
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
                        className="text-dark p-3 font-black text-left border-r border-b border-black"
                      >
                       {item.number} - {item.excess.toLocaleString()}
                     </div>
                   ) : <div key={`man-ex-empty-${idx}`} className="bg-white border-r border-b border-black"></div>)}
                </div>

                <div className="border-b-4 border-black pb-4 mb-8 mt-4 flex justify-between items-end">
                   <div></div>
                   <div className="text-right">
                     <p className="font-black text-3xl leading-none mb-1">Total: {excessStats.reduce((a, b) => a + b.excess, 0).toLocaleString()}</p>
                     <p className="font-bold text-slate-500">{new Date().toLocaleString()}</p>
                   </div>
                </div>

                {/* Manifest Pagination Controls - Bottom Center */}
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

      {isConfirmingClear && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 max-md w-full text-center shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-trash-alt text-3xl text-rose-600"></i>
            </div>
            <h3 className="text-2xl font-black mb-4 text-slate-900 dark:text-white">Clear All Excess?</h3>
            <p className="text-sm text-slate-500 mb-10 font-medium">This will automatically generate reduction entries for all {excessStats.length} hot numbers to bring them back to their set limits.</p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => { onClearExcess(); setIsConfirmingClear(false); }}
                className="py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-sm shadow-xl shadow-rose-600/30 hover:bg-rose-500 transition-all active:scale-95"
              >
                Confirm Board Reset
              </button>
              <button onClick={() => setIsConfirmingClear(false)} className="py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-sm transition-all hover:bg-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcessDashboard;