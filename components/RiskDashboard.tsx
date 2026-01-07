
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
  const itemsPerPage = 100;

  const [showManifest, setShowManifest] = useState(false);
  const [showBrakeModal, setShowBrakeModal] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [reductionInput, setReductionInput] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const stats = useMemo(() => {
    const data: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      data[i.toString().padStart(3, '0')] = 0;
    }
    bets.forEach(b => {
      const num = b.number;
      if (data[num] !== undefined) {
        data[num] += b.amount;
      }
    });

    const globalLimit = limits['global'] || 5000;

    return Object.entries(data).map(([number, total]) => {
      return {
        number,
        total,
        limit: globalLimit,
        excess: Math.max(0, total - globalLimit)
      };
    }).sort((a, b) => a.number.localeCompare(b.number));
  }, [bets, limits]);

  const filteredStats = useMemo(() => {
    if (!search) return stats;
    return stats.filter(s => s.number.includes(search));
  }, [stats, search]);

  const totalAmount = useMemo(() => {
    const statsTotal = filteredStats.reduce((sum, s) => sum + s.total, 0);
    const adjTotal = bets.filter(b => b.number === 'ADJ').reduce((sum, b) => sum + b.amount, 0);
    return statsTotal + adjTotal;
  }, [filteredStats, bets]);

  const totalPages = Math.ceil(filteredStats.length / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(0, totalPages - 1));

  const paginatedStats = useMemo(() => {
    const start = activePage * itemsPerPage;
    return filteredStats.slice(start, start + itemsPerPage);
  }, [filteredStats, activePage]);

  // Manifest Pagination
  const totalManifestPages = Math.ceil(stats.length / itemsPerPage);
  const activeManifestPage = Math.min(manifestPage, Math.max(0, totalManifestPages - 1));
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
    setShowExportConfirm(false);
    const opt = {
      margin: [5, 5, 5, 5],
      filename: `3D_Risk_Report_${new Date().toISOString().split('T')[0]}.pdf`,
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
        <div id="full-risk-export-manifest" style={{ width: '287mm', padding: '10mm', backgroundColor: '#ffffff', color: '#000000' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '15px', textTransform: 'uppercase' }}>Ova Full Board</h2>

          {verticalFullGridBlocks.map((grid, bIdx) => (
            <div key={bIdx} style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
              <div style={{ fontSize: '10px', fontWeight: '900', marginBottom: '5px', color: '#666' }}>
                BATCH {bIdx + 1} ({bIdx}00 - {bIdx}99)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '1px', border: '1px solid black', backgroundColor: '#000' }}>
                {grid.map((item, idx) => (
                  <div key={item?.number || `empty-${idx}`} style={{
                    backgroundColor: '#fff',
                    color: item?.total > item?.limit ? '#ef4444' : '#000',
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
              <p style={{ fontSize: '18px', fontWeight: '900' }}>TOTAL : {(stats.reduce((a, b) => a + b.total, 0) + bets.filter(b => b.number === 'ADJ').reduce((sum, b) => sum + b.amount, 0)).toLocaleString()}</p>
              <p style={{ fontSize: '10px', fontWeight: '700' }}>Generated on {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-grid-horizontal text-indigo-600"></i>
          <span>3 ချပ်ကြည့်ရန်</span>
        </h3>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowBrakeModal(true)}
            className="flex-grow md:flex-none px-4 md:px-6 py-3 md:py-4 bg-rose-600 text-white rounded-2xl text-[10px] md:text-xs font-black uppercase flex items-center justify-center gap-2 shadow-lg hover:bg-rose-500 transition-all active:scale-95"
          >
            ဘရိတ်
          </button>
          <div className="relative flex-grow min-w-[120px]">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text" placeholder="Search..." value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 h-full"
            />
          </div>
          <button
            onClick={() => setShowManifest(true)}
            className="flex-grow md:flex-none px-4 md:px-6 py-3 md:py-4 bg-indigo-600 text-white rounded-2xl text-[10px] md:text-xs font-black uppercase flex items-center justify-center gap-2 shadow-lg"
          >
            3D ကြည့်မည်
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
        {verticalStatsUI.map((item, idx) => {
          if (!item) return <div key={`empty-${idx}`} className="hidden md:block h-[56px]"></div>;
          const hasAmount = item.total > 0;
          const overLimit = item.total > item.limit;

          return (
            <div
              key={item.number}
              onClick={() => setSelectedNumber(item.number)}
              className={`flex flex-col items-center justify-center border-none rounded-lg py-3 px-1 transition-all hover:scale-105 cursor-pointer h-full relative bg-white dark:bg-slate-950 shadow-sm ${overLimit
                ? 'text-red-600 dark:text-red-500 z-10'
                : hasAmount
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-300 dark:text-slate-800'
                }`}
            >
              <div style={{ fontSize: '15px' }} className="font-black leading-none truncate whitespace-nowrap tracking-tighter">
                {item.number} {hasAmount ? `- ${item.total.toLocaleString()}` : '--'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination and Totals */}
      <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-4 bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
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

        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex flex-col text-center md:text-right">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Global Brake</span>
            <span className="text-sm font-black text-rose-600 leading-none">
              {(limits['global'] || 5000).toLocaleString()}
            </span>
          </div>
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-800"></div>
          <div className="flex flex-col text-center md:text-right">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Batch Total</span>
            <span className="text-xl md:text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
              {totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* REFINED: Responsive Brake Settings Modal */}
      {showBrakeModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-fade-in border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-3">
                <i className="fa-solid fa-shield-halved text-rose-600"></i>
                Brake Setting
              </h3>
              <button onClick={() => setShowBrakeModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-circle-xmark text-2xl"></i>
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/50">
                <label className="block text-[10px] font-black uppercase text-rose-600 mb-2">Global Brake Limit</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    defaultValue={limits['global'] || 5000}
                    onChange={(e) => onUpdateLimit('global', parseInt(e.target.value) || 0)}
                    className="flex-grow bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-900/50 p-3 rounded-xl text-lg font-mono font-black outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowBrakeModal(false)}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-indigo-500 transition-all active:scale-95"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {showManifest && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-7xl h-[95vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 md:p-6 border-b flex justify-between items-center bg-slate-50 text-slate-900">
              <div className="flex flex-col">
                <h2 className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-slate-500">Manifest View</h2>
              </div>
              <div className="flex items-center gap-3 md:gap-6">
                <button
                  onClick={() => setShowExportConfirm(true)}
                  disabled={isExporting}
                  className="px-4 md:px-8 py-2 md:py-3 bg-indigo-600 text-white rounded-xl text-[10px] md:text-sm font-black uppercase shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                >
                  {isExporting ? 'Generating...' : 'Export PDF'}
                </button>
                <button onClick={() => setShowManifest(false)} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl bg-slate-200 hover:bg-slate-300 transition-all">
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
                    className={`p-2 md:p-3 font-black text-left border-r border-b border-black bg-white ${item.total > item.limit ? 'text-red-600' : 'text-black'}`}
                  >
                    {item.number} - {item.total.toLocaleString()}
                  </div>
                ) : <div key={`man-empty-${idx}`} className="bg-white border-r border-b border-black"></div>)}
              </div>

              <div className="border-b-4 border-black pb-4 mb-8 mt-4 flex justify-between items-end">
                <div></div>
                <div className="text-right">
                  <p className="font-black text-xl md:text-3xl leading-none mb-1">Total: {(stats.reduce((a, b) => a + b.total, 0) + bets.filter(b => b.number === 'ADJ').reduce((sum, b) => sum + b.amount, 0)).toLocaleString()}</p>
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
            <h3 className="text-xl font-black mb-3 text-slate-900 dark:text-white">Export Risk PDF?</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium">Download the full 3D Risk scan report.</p>
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

      {selectedNumber && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-fade-in border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-black mb-6 text-slate-900 dark:text-white uppercase">Reduce #{selectedNumber}</h3>
            <div className="mb-6">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Subtract Amount</label>
              <input
                type="number" value={reductionInput} onChange={(e) => setReductionInput(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-xl font-mono outline-none focus:ring-4 focus:ring-rose-500/20 text-rose-600"
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
                className="py-3.5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
              >
                Apply
              </button>
              <button onClick={() => setSelectedNumber(null)} className="py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskDashboard;
