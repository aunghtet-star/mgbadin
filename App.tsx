
import React, { useState, useEffect } from 'react';
import { User, GamePhase, Bet, LedgerEntry } from './types';
import BulkEntry from './components/BulkEntry';
import RiskDashboard from './components/RiskDashboard';
import PhaseManager from './components/PhaseManager';
import AIAssistant from './components/AIAssistant';
import Login from './components/Login';
import UserHistory from './components/UserHistory';

type TabType = 'entry' | 'risk' | 'phases' | 'ai' | 'history';

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
    'global': 50000,
    '777': 20000,
    '000': 10000
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
      alert("This phase is settled and cannot accept new bets.");
      return;
    }
    
    const timestamp = new Date().toISOString();
    const preparedBets: Bet[] = newBets.map((b, i) => ({
      id: `b-${Date.now()}-${i}`,
      phaseId: activePhase.id,
      userId: currentUser.id,
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

  const handleVoidBet = (betId: string) => {
    if (!activePhase || ledger.some(l => l.phaseId === activePhase.id)) return;
    
    const betToVoid = allBets.find(b => b.id === betId);
    if (!betToVoid) return;

    setAllBets(prev => prev.filter(b => b.id !== betId));
    
    setActivePhase(prev => prev ? ({
      ...prev,
      totalBets: Math.max(0, prev.totalBets - 1),
      totalVolume: Math.max(0, prev.totalVolume - betToVoid.amount)
    }) : null);
  };

  const handleUpdateBetAmount = (betId: string, newAmount: number) => {
    if (!activePhase || ledger.some(l => l.phaseId === activePhase.id)) return;
    
    const betToUpdate = allBets.find(b => b.id === betId);
    if (!betToUpdate) return;

    const difference = betToUpdate.amount - newAmount;

    setAllBets(prev => prev.map(b => b.id === betId ? { ...b, amount: newAmount } : b));
    
    setActivePhase(prev => prev ? ({
      ...prev,
      totalVolume: Math.max(0, prev.totalVolume - difference)
    }) : null);
  };

  const handleApplyReduction = (number: string, reductionAmount: number) => {
    if (!activePhase || !currentUser || ledger.some(l => l.phaseId === activePhase.id)) return;

    const correctionBet: Bet = {
      id: `corr-${Date.now()}`,
      phaseId: activePhase.id,
      userId: currentUser.id,
      number: number,
      amount: -reductionAmount,
      timestamp: new Date().toISOString()
    };

    setAllBets(prev => [...prev, correctionBet]);
    
    setActivePhase(prev => prev ? ({
      ...prev,
      totalVolume: Math.max(0, prev.totalVolume - reductionAmount)
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
    { id: 'entry', label: 'Bulk Entry', icon: 'fa-keyboard', roles: ['ADMIN', 'COLLECTOR'] },
    { id: 'history', label: 'My History', icon: 'fa-history', roles: ['COLLECTOR'] },
    { id: 'risk', label: 'Risk Analysis', icon: 'fa-chart-line', roles: ['ADMIN'] },
    { id: 'phases', label: 'Phase Control', icon: 'fa-calendar-days', roles: ['ADMIN'] },
    { id: 'ai', label: 'AI Intelligence', icon: 'fa-brain', roles: ['ADMIN'] },
  ].filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <nav className="w-20 md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 print:hidden">
        <div className="mb-10 px-2 flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-xl font-bold text-white shadow-lg">3D</div>
          <span className="hidden md:block text-xl font-black tracking-tight text-slate-900 dark:text-white">Banker Pro</span>
        </div>

        <div className="space-y-2 flex-grow">
          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center p-3 rounded-lg transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`}
            >
              <i className={`fa-solid ${item.icon} w-6`}></i>
              <span className="hidden md:block ml-3 font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto border-t border-slate-100 dark:border-slate-800 pt-4 px-2 space-y-4">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center p-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} w-6`}></i>
            <span className="hidden md:block ml-3 font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-sm overflow-hidden">
              <p className="font-semibold truncate text-slate-900 dark:text-white">{currentUser.username}</p>
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${currentUser.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'}`}>
                {currentUser.role}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center p-3 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
            <i className="fa-solid fa-right-from-bracket w-6"></i>
            <span className="hidden md:block ml-3 font-medium">Logout</span>
          </button>
        </div>
      </nav>

      <main className="flex-grow p-6 overflow-y-auto custom-scrollbar print:p-0">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {activeTab === 'entry' && 'Terminal Entry'}
              {activeTab === 'risk' && 'Phase Intelligence'}
              {activeTab === 'phases' && 'Operation Slots'}
              {activeTab === 'ai' && 'Risk Analytics'}
              {activeTab === 'history' && 'Collection Log'}
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-slate-500 text-sm">Context:</p>
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
                      <span>Change Slot</span>
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-slate-400 italic text-sm">No phase selected</span>
              )}
            </div>
          </div>

          {activePhase && (
            <div className="flex space-x-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-lg shadow-sm">
                <p className="text-[10px] text-slate-500 uppercase font-black">Gross Volume</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Ks {activePhase.totalVolume.toLocaleString()}</p>
              </div>
            </div>
          )}
        </header>

        <div className="animate-fade-in pb-10">
          {activeTab === 'entry' && (
            activePhase 
              ? <BulkEntry onNewBets={handleNewBets} readOnly={isReadOnly} />
              : <div className="text-center py-32 bg-white dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <i className="fa-solid fa-calendar-xmark text-6xl text-slate-300 dark:text-slate-800 mb-6 block"></i>
                  <h3 className="text-2xl font-black text-slate-400 dark:text-slate-600">Select an Operation Slot</h3>
                  <button onClick={() => setActiveTab('phases')} className="mt-4 text-indigo-600 hover:underline font-bold">Go to Phase Manager</button>
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
                  onApplyReduction={handleApplyReduction}
                  isReadOnly={isReadOnly}
                />
              : <div className="text-center py-20 bg-white dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <p className="text-slate-400 font-bold">Select a phase to view its risk distribution.</p>
                  <button onClick={() => setActiveTab('phases')} className="mt-4 px-6 py-2 bg-indigo-600 rounded-lg text-xs font-black uppercase text-white shadow-lg">Choose Phase</button>
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
          {activeTab === 'ai' && currentUser.role === 'ADMIN' && (
            activePhase
              ? <AIAssistant bets={currentPhaseBets} limits={limits} />
              : <div className="text-center py-20 bg-white dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <p className="text-slate-400 font-bold">Risk AI requires an active context.</p>
                  <button onClick={() => setActiveTab('phases')} className="mt-4 px-6 py-2 bg-indigo-600 rounded-lg text-xs font-black uppercase text-white shadow-lg">Choose Phase</button>
                </div>
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
