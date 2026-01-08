
import React, { useMemo, useState } from 'react';
import { Bet } from '../types';

interface ExcessDashboardProps {
  bets: Bet[];
  limits: Record<string, number>;
  globalLimit: number;
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

const ExcessDashboard: React.FC<ExcessDashboardProps> = ({
  bets, limits, globalLimit, onClearExcess, isReadOnly
}) => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [manifestPage, setManifestPage] = useState(0);
  const itemsPerPage = 100;

  const [showSlip, setShowSlip] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate full board stats for PDF export (000-999)
  const fullBoardStats = useMemo(() => {
    const data: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      data[i.toString().padStart(3, '0')] = 0;
    }

    bets.forEach(b => {
      if (data[b.number] !== undefined) {
        data[b.number] += b.amount;
      }
    });

    return Object.entries(data).map(([number, total]) => {
      const limit = limits[number] || globalLimit;
      return {
        number,
        total,
        limit,
        excess: Math.max(0, total - limit)
      };
    }).sort((a, b) => a.number.localeCompare(b.number));
  }, [bets, limits, globalLimit]);

  // Only the numbers with actual excess
  const excessOnlyStats = useMemo(() => {
    return fullBoardStats.filter(s => s.excess > 0);
  }, [fullBoardStats]);

  const filteredExcess = useMemo(() => {
    if (!search) return excessOnlyStats;
    return excessOnlyStats.filter(item => item.number.includes(search));
  }, [excessOnlyStats, search]);

  const totalExcessVolume = useMemo(() => {
    const baseExcess = excessOnlyStats.reduce((sum, item) => sum + item.excess, 0);
    const excessAdjustment = bets
      .filter(b => b.number === 'EXC')
      .reduce((sum, b) => sum + b.amount, 0);
    return baseExcess + excessAdjustment;
  }, [excessOnlyStats, bets]);

  const totalPages = Math.ceil(filteredExcess.length / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(0, totalPages - 1));

  const paginatedExcess = useMemo(() => {
    const start = activePage * itemsPerPage;
    return filteredExcess.slice(start, start + itemsPerPage);
  }, [filteredExcess, activePage]);

  // Manifest View Pagination
  const totalManifestPages = Math.ceil(excessOnlyStats.length / itemsPerPage);
  const activeManifestPage = Math.min(manifestPage, Math.max(0, totalManifestPages - 1));
  const paginatedManifestStats = useMemo(() => {
    const start = activeManifestPage * itemsPerPage;
    return excessOnlyStats.slice(start, start + itemsPerPage);
  }, [excessOnlyStats, activeManifestPage]);

  // UI Grids
  const colsCount = 10;
  const verticalExcessUI = useMemo(() => toVerticalGrid(paginatedExcess, colsCount), [paginatedExcess]);
  const verticalManifestUI = useMemo(() => toVerticalGrid(paginatedManifestStats, colsCount), [paginatedManifestStats]);

  // PDF Grid blocks (10 batches of 100)
  const verticalFullGridBlocks = useMemo(() => {
    const blocks = [];
    for (let i = 0; i < 10; i++) {
      const slice = fullBoardStats.slice(i * 100, (i + 1) * 100);
      blocks.push(toVerticalGrid(slice, 10));
    }
    return blocks;
  }, [fullBoardStats]);

  const handleCopyToClipboard = () => {
    const numbersWithExcess = excessOnlyStats
      .map(item => `${item.number}-${item.excess}`)
      .join(', ');

    navigator.clipboard.writeText(numbersWithExcess).then(() => {
      alert('Copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('full-excess-export-manifest');
    const html2pdfLib = (window as any).html2pdf;
    if (!element || !html2pdfLib) return;

    setIsExporting(true);
    setShowExportConfirm(false);
    const opt = {
      margin: [5, 5, 5, 5],
      filename: `3D_Excess_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await html2pdfLib().set(opt).from(element).save();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Hidden Print Template */}
      <div style={{ position: 'fixed', top: 0, left: '-10000mm', width: '297mm', pointerEvents: 'none' }} aria-hidden="true">
        <div id="full-excess-export-manifest" style={{ width: '287mm', padding: '10mm', backgroundColor: '#ffffff', color: '#000000' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '15px', textTransform: 'uppercase' }}>Excess Full Board</h2>

          {verticalFullGridBlocks.map((grid, bIdx) => (
            <div key={bIdx} style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
              <div style={{ fontSize: '10px', fontWeight: '900', marginBottom: '5px', color: '#666' }}>
                EXCESS BATCH {bIdx + 1} ({bIdx}00 - {bIdx}99)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '1px', border: '1px solid black', backgroundColor: '#000' }}>
                {grid.map((item, idx) => (
                  <div key={item?.number || `empty-${idx}`} style={{
                    backgroundColor: '#ffffff',
                    color: item?.excess > 0 ? '#ef4444' : '#000000',
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
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'end', alignItems: 'center', borderBottom: '2px solid black', paddingBottom: '10px', marginTop: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '18px', fontWeight: '900' }}>TOTAL : {totalExcessVolume.toLocaleString()}</p>
              <p style={{ fontSize: '10px', fontWeight: '700' }}>Generated on {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center md:text-left">
          <p className="text-[10px] uppercase font-black text-slate-500 mb-1">Hot Numbers Count</p>
          <p className="text-3xl font-black">{excessOnlyStats.length}</p>
        </div>
        <div className="flex gap-2 lg:col-span-2">
          <button
            onClick={handleCopyToClipboard}
            disabled={excessOnlyStats.length === 0}
            className="flex-grow py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-30"
          >
            <i className="fa-solid fa-copy mr-2"></i>
            Copy All
          </button>
          <button
            onClick={() => setShowSlip(true)}
            className="flex-grow py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            3 ကျွံ ကြည့်မည်
          </button>
          <button
            onClick={() => setIsConfirmingClear(true)}
            disabled={excessOnlyStats.length === 0 || isReadOnly}
            className="flex-grow py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/20 active:scale-95 disabled:opacity-30"
          >
            3 ကျွံဖျက်မည်
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
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

        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
          {verticalExcessUI.map((item, idx) => {
            if (!item) return <div key={`empty-${idx}`} className="hidden md:block h-[64px]"></div>;
            return (
              <div
                key={item.number}
                className="flex items-center justify-center px-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg py-4 font-black shadow-md border-none"
              >
                <div style={{ fontSize: '15px' }} className="font-black leading-none truncate whitespace-nowrap tracking-tighter">
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

        <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-4 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-3xl border border-slate-100 dark:border-slate-900/50 shadow-sm">
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
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 leading-none">
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

          <div className="flex flex-col text-center md:text-right">
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1 leading-none tracking-widest">Total Excess</span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
              {totalExcessVolume.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {showSlip && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-7xl h-[95vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 md:p-6 border-b flex justify-between items-center bg-slate-50 text-slate-900">
              <div className="flex flex-col">
                <h2 className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-slate-500">Excess Manifest View</h2>
              </div>
              <div className="flex items-center gap-3 md:gap-6">
                <button
                  onClick={() => setShowExportConfirm(true)}
                  disabled={isExporting}
                  className="px-4 md:px-8 py-2 md:py-3 bg-indigo-600 text-white rounded-xl text-[10px] md:text-sm font-black uppercase shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                >
                  {isExporting ? 'Generating...' : 'Export PDF'}
                </button>
                <button onClick={() => setShowSlip(false)} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl bg-slate-200 hover:bg-slate-300 transition-all">
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>
            </div>
            <div className="flex-grow overflow-auto p-4 md:p-10 bg-white text-black font-mono custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 border-t border-l border-black gap-[1px]">
                {verticalManifestUI.map((item, idx) => item ? (
                  <div
                    key={item.number}
                    style={{ fontSize: '11px' }}
                    className="text-slate-900 p-2 md:p-3 font-black text-left border-r border-b border-black"
                  >
                    {item.number} - {item.excess.toLocaleString()}
                  </div>
                ) : <div key={`man-ex-empty-${idx}`} className="bg-white border-r border-b border-black"></div>)}
              </div>

              <div className="border-b-4 border-black pb-4 mb-8 mt-4 flex justify-between items-end">
                <div></div>
                <div className="text-right">
                  <p className="font-black text-xl md:text-3xl leading-none mb-1">Total: {totalExcessVolume.toLocaleString()}</p>
                  <p className="font-bold text-[10px] text-slate-500">{new Date().toLocaleString()}</p>
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
                  <span className="px-2 md:px-4 text-[10px] md:text-xs font-black uppercase tracking-widest">Page {activeManifestPage + 1} / {totalManifestPages}</span>
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

      {/* REFINED: Responsive Export Confirmation */}
      {showExportConfirm && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <i className="fa-solid fa-file-pdf text-2xl text-indigo-600"></i>
            </div>
            <h3 className="text-xl font-black mb-3 text-slate-900 dark:text-white">Export Excess PDF?</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium">Download the full 3D Excess report for the active phase.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleExportPDF}
                className="py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all active:scale-95"
              >
                Confirm Export
              </button>
              <button onClick={() => setShowExportConfirm(false)} className="py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs transition-all hover:bg-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* REFINED: Responsive Clear Excess Confirmation */}
      {isConfirmingClear && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <i className="fa-solid fa-trash-alt text-2xl text-rose-600"></i>
            </div>
            <h3 className="text-xl font-black mb-3 text-slate-900 dark:text-white uppercase tracking-tight">3 ကျွံဖျက်မည်</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium">
              Hot numbers ({excessOnlyStats.length}) ကို သတ်မှတ်ထားသော limit အတွင်းသို့ အလိုအလျောက် ပြန်လျှော့ချပါမည်။
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { onClearExcess(); setIsConfirmingClear(false); }}
                className="py-3.5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-rose-600/30 hover:bg-rose-500 transition-all active:scale-95"
              >
                Confirm Board Reset
              </button>
              <button onClick={() => setIsConfirmingClear(false)} className="py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs transition-all hover:bg-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcessDashboard;
