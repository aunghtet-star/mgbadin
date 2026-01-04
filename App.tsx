import React, { useState, useEffect } from 'react';
import { User, GamePhase, Bet, LedgerEntry } from './types';
import BulkEntry from './components/BulkEntry';
import RiskDashboard from './components/RiskDashboard';
import ExcessDashboard from './components/ExcessDashboard';
import { PhaseManager } from './components/PhaseManager';
import Login from './components/Login';
import UserHistory from './components/UserHistory';
import AdjustmentsManager from './components/AdjustmentsManager';

type TabType = 'entry' | 'reduction' | 'risk' | 'excess' | 'phases' | 'history' | 'adjustments';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('phases');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });
  
  const [activePhase, setActivePhase] = useState<GamePhase | null>(() => {
    const saved = localStorage.getItem('banker_active_phase');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  
  const [allBets, setAllBets] = useState<Bet[]>(() => {
    const saved = localStorage.getItem('banker_all_bets');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  
  const [ledger, setLedger] = useState<LedgerEntry[]>(() => {
    const saved = localStorage.getItem('banker_ledger');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  const [limits, setLimits] = useState<Record<string, number>>({
    'global': 5000,
    '777': 2000,
    '000': 1000
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('banker_active_phase', JSON.stringify(activePhase));
  }, [activePhase]);

  useEffect(() => {
    localStorage.setItem('banker_all_bets', JSON.stringify(allBets));
  }, [allBets]);

  useEffect(() => {
    localStorage.setItem('banker_ledger', JSON.stringify(ledger));
  }, [ledger]);

  useEffect(() => {
    const saved = localStorage.getItem('banker_session');
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('banker_session', JSON.stringify(user));
    setActiveTab(user.role === 'ADMIN' ? 'phases' : 'entry');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('banker_session');
  };

  const handleSelectPhase = (phaseName: string) => {
    if (!phaseName) {
      setActivePhase(null);
      return;
    }
    const phaseBets = allBets.filter(b => b.phaseId === phaseName);
    const totalVolume = phaseBets.reduce((sum, b) => sum + b.amount, 0);
    
    const existingPhase: GamePhase = {
      id: phaseName,
      name: phaseName,
      active: !ledger.some(l => l.phaseId === phaseName),
      startDate: new Date().toISOString(),
      endDate: null,
      totalBets: phaseBets.length,
      totalVolume: totalVolume
    };

    setActivePhase(existingPhase);
    if (currentUser?.role === 'ADMIN') {
      setActiveTab('risk');
    } else {
      setActiveTab('entry');
    }
  };

  const handleNewBets = (newBets: { number: string; amount: number }[]) => {
    if (!currentUser || !activePhase) return;
    if (ledger.some(l => l.phaseId === activePhase.id)) {
      alert("This phase is already closed and cannot accept new bets.");
      return;
    }
    
    const timestamp = new Date().toISOString();
    const preparedBets: Bet[] = newBets.map((b, i) => ({
      id: `b-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
      phaseId: activePhase.id,
      userId: currentUser.id,
      userRole: currentUser.role,
      number: b.number,
      amount: b.amount,
      timestamp
    }));

    setAllBets(prev => [...prev, ...preparedBets]);
    
    setActivePhase(prev => prev ? ({
      ...prev,
      totalBets: prev.totalBets + preparedBets.length,
      totalVolume: prev.totalVolume + preparedBets.reduce((acc, curr) => acc + curr.amount, 0)
    }) : null);
  };

  const handleBulkReduction = (reductionBets: { number: string; amount: number }[]) => {
    if (!currentUser || !activePhase) return;
    if (ledger.some(l => l.phaseId === activePhase.id)) {
      alert("This phase is settled.");
      return;
    }
    
    const timestamp = new Date().toISOString();
    const preparedReductions: Bet[] = reductionBets.map((b, i) => ({
      id: `red-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
      phaseId: activePhase.id,
      userId: currentUser.id,
      userRole: currentUser.role,
      number: b.number,
      amount: -Math.abs(b.amount), 
      timestamp
    }));

    setAllBets(prev => [...prev, ...preparedReductions]);
    
    setActivePhase(prev => prev ? ({
      ...prev,
      totalVolume: Math.max(-10000000, prev.totalVolume - Math.abs(reductionBets.reduce((a,c)=>a+c.amount, 0)))
    }) : null);
  };

  const handleVoidBet = (betId: string) => {
    if (!activePhase || ledger.some(l => l.phaseId === activePhase.id)) return;
    
    const betToVoid = allBets.find(b => b.id === betId);
    if (!betToVoid) return;

    setAllBets(prev => prev.filter(b => b.id !== betId));
    
    setActivePhase(prev => prev ? ({
      ...prev,
      totalBets: Math.max(0, prev.totalBets - 1),
      totalVolume: prev.totalVolume - betToVoid.amount
    }) : null);
  };

  const handleUpdateBetAmount = (betId: string, newAmount: number, newNumber?: string) => {
    if (!activePhase || ledger.some(l => l.phaseId === activePhase.id)) return;
    
    const betToUpdate = allBets.find(b => b.id === betId);
    if (!betToUpdate) return;

    const difference = betToUpdate.amount - newAmount;

    setAllBets(prev => prev.map(b => b.id === betId ? { 
      ...b, 
      amount: newAmount, 
      number: newNumber !== undefined ? newNumber : b.number 
    } : b));
    
    setActivePhase(prev => prev ? ({
      ...prev,
      totalVolume: prev.totalVolume - difference
    }) : null);
  };

  const handleApplyAdjustment = (amount: number) => {
    if (!activePhase || !currentUser || ledger.some(l => l.phaseId === activePhase.id)) return;

    const adjBet: Bet = {
      id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      phaseId: activePhase.id,
      userId: currentUser.id,
      userRole: currentUser.role,
      number: 'ADJ', // Reserved code for adjustments
      amount: Math.abs(amount), // Force positive
      timestamp: new Date().toISOString()
    };

    setAllBets(prev => [...prev, adjBet]);
    
    setActivePhase(prev => prev ? ({
      ...prev,
      totalVolume: prev.totalVolume + Math.abs(amount)
    }) : null);
  };

  const handleClearExcess = () => {
    if (!activePhase || !currentUser || ledger.some(l => l.phaseId === activePhase.id)) return;

    const totals: Record<string, number> = {};
    const phaseBets = allBets.filter(b => b.phaseId === activePhase.id);
    phaseBets.forEach(b => {
      totals[b.number] = (totals[b.number] || 0) + b.amount;
    });

    const timestamp = new Date().toISOString();
    const corrections: Bet[] = [];
    let totalReduction = 0;

    for (let i = 0; i < 1000; i++) {
      const numStr = i.toString().padStart(3, '0');
      const total = totals[numStr] || 0;
      const limit = limits[numStr] || limits['global'] || 5000;
      const excess = total - limit;

      if (excess > 0) {
        corrections.push({
          id: `corr-auto-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          phaseId: activePhase.id,
          userId: currentUser.id,
          userRole: currentUser.role,
          number: numStr,
          amount: -excess,
          timestamp
        });
        totalReduction += excess;
      }
    }

    if (corrections.length === 0) {
      alert("No excess volume found to clear.");
      return;
    }

    setAllBets(prev => [...prev, ...corrections]);
    
    setActivePhase(prev => prev ? ({
      ...prev,
      totalVolume: Math.max(-10000000, prev.totalVolume - totalReduction)
    }) : null);
  };

  const closeActivePhase = () => {
    if (!activePhase) return;
    
    const totalIn = activePhase.totalVolume;
    const totalOut = totalIn * 0.72; 
    const profit = totalIn - totalOut;

    const newLedgerEntry: LedgerEntry = {
      id: `l-${Date.now()}`,
      phaseId: activePhase.id,
      totalIn,
      totalOut,
      profit,
      closedAt: new Date().toISOString()
    };

    setLedger(prev => [newLedgerEntry, ...prev]);
    setActivePhase(null);
    setActiveTab('phases');
  };

  const currentPhaseBets = activePhase ? allBets.filter(b => b.phaseId === activePhase.id) : [];
  const isReadOnly = activePhase ? ledger.some(l => l.phaseId === activePhase.id) : false;

  if (!currentUser) return <Login onLogin={handleLogin} />;

  const navItems = [
    { id: 'entry', label: 'ထိုးမည်', icon: 'fa-keyboard', roles: ['ADMIN', 'COLLECTOR'] },
    { id: 'reduction', label: 'လျှော့မည်', icon: 'fa-minus-circle', roles: ['ADMIN', 'COLLECTOR'] },
    { id: 'adjustments', label: 'Adjust Amount', icon: 'fa-calculator', roles: ['ADMIN'] },
    { id: 'history', label: 'My History', icon: 'fa-history', roles: ['COLLECTOR'] },
    { id: 'risk', label: '3D Overview', icon: 'fa-chart-line', roles: ['ADMIN'] },
    { id: 'excess', label: '3D ကျွံ', icon: 'fa-fire-alt', roles: ['ADMIN'] },
    { id: 'phases', label: 'အပတ်စဥ်', icon: 'fa-calendar-days', roles: ['ADMIN'] },
  ].filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <nav className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col p-4 print:hidden">
        <div className="mb-10 px-2 flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-xl font-bold text-white shadow-lg">MB</div>
          <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">MgBaDin</span>
        </div>

        <div className="space-y-2 flex-grow">
          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center p-3 rounded-lg transition-all ${activeTab === item.id ? (item.id === 'reduction' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20') : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`}
            >
              <i className={`fa-solid ${item.icon} w-6`}></i>
              <span className="ml-3 font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto border-t border-slate-100 dark:border-slate-800 pt-4 px-2 space-y-4">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center p-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} w-6`}></i>
            <span className="ml-3 font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            <div className="text-sm overflow-hidden">
              <p className="font-semibold truncate text-slate-900 dark:text-white">{currentUser.username}</p>
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${currentUser.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'}`}>
                {currentUser.role === 'ADMIN' ? 'Admin' : 'Collector'}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center p-3 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
            <i className="fa-solid fa-right-from-bracket w-6"></i>
            <span className="ml-3 font-medium">Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-6 py-2 pb-safe flex justify-between items-center print:hidden">
        {navItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id as TabType)}
            className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === item.id ? (item.id === 'reduction' ? 'text-rose-600' : 'text-indigo-600 dark:text-indigo-400') + ' scale-110' : 'text-slate-400'}`}
          >
            <i className={`fa-solid ${item.icon} text-lg`}></i>
            <span className="text-[10px] font-black uppercase mt-1 tracking-tighter">{item.label}</span>
          </button>
        ))}
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center p-2 rounded-xl text-slate-400"
        >
          <i className="fa-solid fa-power-off text-lg"></i>
          <span className="text-[10px] font-black uppercase mt-1 tracking-tighter">Exit</span>
        </button>
      </nav>

      <header className="md:hidden sticky top-0 z-40 bg-white dark:bg-slate-950 px-5 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-900">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-lg">MB</div>
          <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">MgBaDin</span>
        </div>
        <button 
          onClick={toggleTheme}
          className="w-10 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-500"
        >
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>
      </header>

      <main className="flex-grow p-4 md:p-6 overflow-y-auto custom-scrollbar print:p-0 mb-20 md:mb-0">
        <header className="mb-6 hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {activeTab === 'entry' && 'ထိုးမည်'}
              {activeTab === 'reduction' && 'လျှော့မည်'}
              {activeTab === 'adjustments' && 'Adjust Amount'}
              {activeTab === 'risk' && '3D Overview'}
              {activeTab === 'excess' && '3D ကျွံ စာရင်း'}
              {activeTab === 'phases' && 'အပတ်စဥ် စီမံခန့်ခွဲမှု'}
              {activeTab === 'history' && 'Transaction History'}
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-slate-500 text-sm">Active:</p>
              {activePhase ? (
                <div className="flex items-center space-x-3">
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{activePhase.name}</span>
                  {isReadOnly && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-500 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-black uppercase">
                      Settled
                    </span>
                  )}
                  {currentUser.role === 'ADMIN' && (
                    <button
                      onClick={() => {
                        setActivePhase(null);
                        setActiveTab('phases');
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-all text-[10px] font-black uppercase tracking-wider"
                    >
                      <i className="fa-solid fa-right-left"></i>
                      <span>Switch Phase</span>
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-slate-400 italic text-sm">No phase selected</span>
              )}
            </div>
          </div>

          {activePhase && currentUser.role === 'ADMIN' && (
            <div className="flex space-x-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-lg shadow-sm">
                <p className="text-[10px] text-slate-500 uppercase font-black">Total</p>
                <p className={`text-lg font-bold ${activePhase.totalVolume >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {activePhase.totalVolume.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </header>

        <div className="animate-fade-in pb-10">
          {activeTab === 'entry' && (
            activePhase 
              ? <BulkEntry onNewBets={handleNewBets} readOnly={isReadOnly} variant="entry" />
              : <div className="text-center py-20 md:py-32 bg-white dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <i className="fa-solid fa-calendar-xmark text-6xl text-slate-300 dark:text-slate-800 mb-6 block"></i>
                  <h3 className="text-xl md:text-2xl font-black text-slate-400 dark:text-slate-600">Please select an active phase</h3>
                  <button onClick={() => setActiveTab('phases')} className="mt-4 text-indigo-600 hover:underline font-bold">Go to Phase Management</button>
                </div>
          )}
          {activeTab === 'reduction' && (
            activePhase 
              ? <BulkEntry onNewBets={handleBulkReduction} readOnly={isReadOnly} variant="reduction" />
              : <div className="text-center py-20 md:py-32 bg-white dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <i className="fa-solid fa-minus-circle text-6xl text-slate-300 dark:text-slate-800 mb-6 block"></i>
                  <h3 className="text-xl md:text-2xl font-black text-slate-400 dark:text-slate-600">Please select an active phase</h3>
                  <button onClick={() => setActiveTab('phases')} className="mt-4 text-rose-600 hover:underline font-bold">Go to Phase Management</button>
                </div>
          )}
          {activeTab === 'adjustments' && currentUser.role === 'ADMIN' && (
            activePhase 
              ? <AdjustmentsManager 
                  bets={currentPhaseBets} 
                  onApplyAdjustment={handleApplyAdjustment}
                  onVoidAdjustment={handleVoidBet}
                  onUpdateAdjustment={handleUpdateBetAmount}
                  isReadOnly={isReadOnly}
                />
              : <div className="text-center py-20 bg-white dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <p className="text-slate-400 font-bold">Select a phase to manage adjustments.</p>
                  <button onClick={() => setActiveTab('phases')} className="mt-4 px-6 py-2 bg-indigo-600 rounded-lg text-xs font-black uppercase text-white shadow-lg">Select Phase</button>
                </div>
          )}
          {activeTab === 'risk' && currentUser.role === 'ADMIN' && (
            activePhase 
              ? <RiskDashboard 
                  bets={currentPhaseBets} 
                  limits={limits} 
                  onUpdateLimit={(num, lim) => setLimits(prev => ({ ...prev, [num]: lim }))} 
                  onVoidBet={handleVoidBet}
                  onUpdateBetAmount={handleUpdateBetAmount}
                  onApplyReduction={handleBulkReduction as any}
                  isReadOnly={isReadOnly}
                />
              : <div className="text-center py-20 bg-white dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <p className="text-slate-400 font-bold">Select a phase to view 3D overview.</p>
                  <button onClick={() => setActiveTab('phases')} className="mt-4 px-6 py-2 bg-indigo-600 rounded-lg text-xs font-black uppercase text-white shadow-lg">Select Phase</button>
                </div>
          )}
          {activeTab === 'excess' && currentUser.role === 'ADMIN' && (
            activePhase 
              ? <ExcessDashboard 
                  bets={currentPhaseBets} 
                  limits={limits} 
                  onClearExcess={handleClearExcess}
                  isReadOnly={isReadOnly}
                />
              : <div className="text-center py-20 bg-white dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <p className="text-slate-400 font-bold">Select a phase to view Excess Risk.</p>
                  <button onClick={() => setActiveTab('phases')} className="mt-4 px-6 py-2 bg-indigo-600 rounded-lg text-xs font-black uppercase text-white shadow-lg">Select Phase</button>
                </div>
          )}
          {activeTab === 'phases' && currentUser.role === 'ADMIN' && (
            <PhaseManager 
              key={activePhase?.id || 'idle'} 
              currentPhase={activePhase} 
              ledger={ledger} 
              onClosePhase={closeActivePhase} 
              onSelectPhase={handleSelectPhase}
              bets={allBets}
            />
          )}
          {activeTab === 'history' && currentUser.role === 'COLLECTOR' && (
            <UserHistory bets={allBets.filter(b => b.userId === currentUser.id && (!activePhase || b.phaseId === activePhase.id))} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;