
import React, { useState, useEffect, useCallback } from 'react';
import { User, GamePhase, Bet, LedgerEntry } from './types';
import BulkEntry from './components/BulkEntry';
import RiskDashboard from './components/RiskDashboard';
import ExcessDashboard from './components/ExcessDashboard';
import { PhaseManager } from './components/PhaseManager';
import Login from './components/Login';
import UserHistory from './components/UserHistory';
import AdjustmentsManager from './components/AdjustmentsManager';
import BetCalculator from './components/BetCalculator';
import ExcessAdjustmentsManager from './components/ExcessAdjustmentsManager';
import api from './services/api';

type TabType = 'entry' | 'reduction' | 'risk' | 'excess' | 'phases' | 'history' | 'adjustments' | 'calculator' | 'excessmanage';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('activeTab') as TabType;
    return saved || 'phases';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'light';
  });

  const [activePhase, setActivePhaseState] = useState<GamePhase | null>(null);
  const [phases, setPhases] = useState<GamePhase[]>([]);
  const [allBets, setAllBets] = useState<Bet[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  const [limits, setLimits] = useState<Record<string, number>>({});
  const [globalLimit, setGlobalLimit] = useState<number>(0);

  // Load data from API
  const loadData = useCallback(async () => {
    if (!api.getToken()) {
      setIsLoading(false);
      return;
    }

    try {
      // Load phases
      const phasesResult = await api.getPhases();
      if (phasesResult.data?.phases) {
        const mappedPhases: GamePhase[] = phasesResult.data.phases.map((p: any) => ({
          id: p.id,
          name: p.name,
          active: p.active,
          startDate: p.startDate || p.start_date,
          endDate: p.endDate || p.end_date,
          totalBets: p.totalBets || p.total_bets || 0,
          totalVolume: parseFloat(p.totalVolume || p.total_volume) || 0,
          globalLimit: parseFloat(p.globalLimit || p.global_limit) || 0
        }));
        setPhases(mappedPhases);

        // Set active phase from server (the one with active: true)
        const serverActivePhase = mappedPhases.find(p => p.active);
        if (serverActivePhase) {
          setActivePhaseState(serverActivePhase);
          // Set global limit from active phase
          setGlobalLimit(serverActivePhase.globalLimit || 0);
        }
      }

      // Load ledger
      const ledgerResult = await api.getLedger();
      if (ledgerResult.data?.entries) {
        const mappedLedger: LedgerEntry[] = ledgerResult.data.entries.map((l: any) => ({
          id: l.id,
          phaseId: l.phaseId || l.phase_id,
          totalIn: parseFloat(l.totalIn || l.total_in) || 0,
          totalOut: parseFloat(l.totalOut || l.total_out) || 0,
          profit: parseFloat(l.netProfit || l.net_profit || l.profit) || 0,
          closedAt: l.settledAt || l.settled_at || l.closedAt || l.closed_at
        }));
        setLedger(mappedLedger);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }

    setIsLoading(false);
  }, []);

  // Load bets for active phase
  const loadPhaseBets = useCallback(async (phaseId: string) => {
    try {
      const betsResult = await api.getBetsForPhase(phaseId);
      if (betsResult.data?.bets) {
        const mappedBets: Bet[] = betsResult.data.bets.map((b: any) => ({
          id: b.id,
          phaseId: b.phaseId || b.phase_id,
          userId: b.userId || b.user_id,
          userRole: b.userRole || b.user_role,
          number: b.number,
          amount: parseFloat(b.amount) || 0,
          timestamp: b.timestamp
        }));
        setAllBets(mappedBets);
      }
    } catch (error) {
      console.error('Error loading bets:', error);
    }
  }, []);

  // Persist activeTab to localStorage
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Real-time polling for bets data (every 5 seconds)
  useEffect(() => {
    if (!currentUser || !activePhase) return;

    const pollInterval = setInterval(() => {
      loadPhaseBets(activePhase.id);
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [currentUser, activePhase, loadPhaseBets]);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (api.getToken()) {
        const result = await api.getCurrentUser();
        if (result.data?.user) {
          const user: User = {
            id: result.data.user.id,
            username: result.data.user.username,
            role: result.data.user.role,
            balance: result.data.user.balance || 0,
            token: api.getToken() || undefined
          };
          setCurrentUser(user);
          await loadData();
        } else {
          api.setToken(null);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    checkSession();
  }, [loadData]);

  // Load bets when active phase changes
  useEffect(() => {
    if (!activePhase) return;
    if (phases.length && !phases.find(p => p.id === activePhase.id)) {
      setActivePhase(null);
      return;
    }
    loadPhaseBets(activePhase.id);
  }, [activePhase, loadPhaseBets, phases]);

  // Simple wrapper to set active phase state (no localStorage needed - synced from server)
  const setActivePhase = (phase: GamePhase | null | ((prev: GamePhase | null) => GamePhase | null)) => {
    setActivePhaseState(prev => {
      const next = typeof phase === 'function' ? phase(prev) : phase;
      return next;
    });
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    // Don't change tab if there's a saved one - only set default if no saved tab
    const savedTab = localStorage.getItem('activeTab') as TabType;
    if (!savedTab) {
      setActiveTab(user.role === 'ADMIN' ? 'phases' : 'entry');
    }
    await loadData();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    api.logout();
    // Keep phases, bets, ledger and activePhase in state - they will be reloaded on next login
    // Phase should persist independently of user login/logout
  };

  const handleAddPhase = async (name: string) => {
    if (phases.some(p => p.name === name)) {
      alert("A phase with this name already exists.");
      return;
    }

    const result = await api.createPhase(name);
    if (result.error) {
      alert(result.error);
      return;
    }

    if (result.data?.phase) {
      const newPhase: GamePhase = {
        id: result.data.phase.id,
        name: result.data.phase.name,
        active: result.data.phase.active,
        startDate: result.data.phase.startDate || result.data.phase.start_date,
        endDate: result.data.phase.endDate || result.data.phase.end_date,
        totalBets: 0,
        totalVolume: 0
      };
      // Mark all other phases as inactive in local state
      setPhases(prev => prev.map(p => ({ ...p, active: false })));
      setPhases(prev => [newPhase, ...prev]);
      // Set as active phase
      setActivePhaseState(newPhase);
    }
  };

  const handleDeletePhase = async (phaseId: string) => {
    const result = await api.deletePhase(phaseId);
    if (result.error) {
      alert(result.error);
      return;
    }

    setPhases(prev => prev.filter(p => p.id !== phaseId));
    if (activePhase?.id === phaseId) setActivePhaseState(null);
  };

  const handleSelectPhase = async (phaseId: string) => {
    if (!phaseId) {
      setActivePhaseState(null);
      return;
    }
    const targetPhase = phases.find(p => p.id === phaseId);
    if (!targetPhase) return;

    // If admin, set the phase as active on the server
    if (currentUser?.role === 'ADMIN') {
      const result = await api.setActivePhase(phaseId);
      if (result.error) {
        alert(result.error);
        return;
      }
      // Update all phases' active status in local state
      setPhases(prev => prev.map(p => ({ ...p, active: p.id === phaseId })));
      // Only switch tab if currently on phases view
      if (activeTab === 'phases') {
        setActiveTab('risk');
      }
    } else {
      // Only switch tab if currently on phases view
      if (activeTab === 'phases') {
        setActiveTab('entry');
      }
    }

    setActivePhaseState(targetPhase);
    // Set global limit from selected phase
    setGlobalLimit(targetPhase.globalLimit || 0);
  };

  // Handler to update global limit in database
  const handleUpdateGlobalLimit = async (limit: number) => {
    if (!activePhase || !currentUser || currentUser.role !== 'ADMIN') return;

    const result = await api.updatePhaseGlobalLimit(activePhase.id, limit);
    if (result.error) {
      alert(result.error);
      return;
    }

    // Update local state
    setGlobalLimit(limit);
    // Update phase in phases list
    setPhases(prev => prev.map(p =>
      p.id === activePhase.id ? { ...p, globalLimit: limit } : p
    ));
  };

  const handleNewBets = async (newBets: { number: string; amount: number }[]) => {
    if (!currentUser || !activePhase) return;
    if (ledger.some(l => l.phaseId === activePhase.id)) {
      alert("This phase is already closed and cannot accept new bets.");
      return;
    }

    const result = await api.createBulkBets(activePhase.id, newBets);
    if (result.error) {
      alert(result.error);
      return;
    }

    if (result.data?.bets) {
      const preparedBets: Bet[] = result.data.bets.map((b: any) => ({
        id: b.id,
        phaseId: b.phaseId || b.phase_id,
        userId: b.userId || b.user_id,
        userRole: b.userRole || b.user_role,
        number: b.number,
        amount: parseFloat(b.amount) || 0,
        timestamp: b.timestamp
      }));

      setAllBets(prev => [...prev, ...preparedBets]);

      setActivePhase(prev => prev ? ({
        ...prev,
        totalBets: prev.totalBets + preparedBets.length,
        totalVolume: prev.totalVolume + preparedBets.reduce((acc, curr) => acc + curr.amount, 0)
      }) : null);
    }
  };

  const handleBulkReduction = async (reductionBets: { number: string; amount: number }[]) => {
    if (!currentUser || !activePhase) return;
    if (ledger.some(l => l.phaseId === activePhase.id)) {
      alert("This phase is settled.");
      return;
    }

    // Convert to negative amounts for reduction
    const negativeBets = reductionBets.map(b => ({
      number: b.number,
      amount: -Math.abs(b.amount)
    }));

    const result = await api.createBulkBets(activePhase.id, negativeBets);
    if (result.error) {
      alert(result.error);
      return;
    }

    if (result.data?.bets) {
      const preparedReductions: Bet[] = result.data.bets.map((b: any) => ({
        id: b.id,
        phaseId: b.phaseId || b.phase_id,
        userId: b.userId || b.user_id,
        userRole: b.userRole || b.user_role,
        number: b.number,
        amount: parseFloat(b.amount) || 0,
        timestamp: b.timestamp
      }));

      setAllBets(prev => [...prev, ...preparedReductions]);

      setActivePhase(prev => prev ? ({
        ...prev,
        totalVolume: Math.max(-10000000, prev.totalVolume - Math.abs(reductionBets.reduce((a, c) => a + c.amount, 0)))
      }) : null);
    }
  };

  const handleVoidBet = async (betId: string) => {
    if (!activePhase || ledger.some(l => l.phaseId === activePhase.id)) return;

    const betToVoid = allBets.find(b => b.id === betId);
    if (!betToVoid) return;

    const result = await api.deleteBet(betId);
    if (result.error) {
      alert(result.error);
      return;
    }

    setAllBets(prev => prev.filter(b => b.id !== betId));

    setActivePhase(prev => prev ? ({
      ...prev,
      totalBets: Math.max(0, prev.totalBets - 1),
      totalVolume: prev.totalVolume - betToVoid.amount
    }) : null);
  };

  const handleUpdateBetAmount = async (betId: string, newAmount: number, newNumber?: string) => {
    if (!activePhase || ledger.some(l => l.phaseId === activePhase.id)) return;

    const betToUpdate = allBets.find(b => b.id === betId);
    if (!betToUpdate) return;

    const difference = betToUpdate.amount - newAmount;

    // Call API to update the bet
    const result = await api.updateBet(betId, newAmount);
    if (result.error) {
      alert(result.error);
      return;
    }

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

  const handleApplyAdjustment = async (amount: number) => {
    if (!activePhase || !currentUser || ledger.some(l => l.phaseId === activePhase.id)) return;

    const result = await api.createBet(activePhase.id, 'ADJ', amount);
    if (result.error) {
      alert(result.error);
      return;
    }

    if (result.data?.bet) {
      const adjBet: Bet = {
        id: result.data.bet.id,
        phaseId: result.data.bet.phaseId || result.data.bet.phase_id,
        userId: result.data.bet.userId || result.data.bet.user_id,
        userRole: result.data.bet.userRole || result.data.bet.user_role,
        number: result.data.bet.number,
        amount: parseFloat(result.data.bet.amount) || 0,
        timestamp: result.data.bet.timestamp
      };

      setAllBets(prev => [...prev, adjBet]);

      setActivePhase(prev => prev ? ({
        ...prev,
        totalVolume: prev.totalVolume + amount
      }) : null);
    }
  };

  // Excess Adjustment handlers
  const handleApplyExcessAdjustment = async (amount: number) => {
    if (!activePhase || !currentUser) return;

    const result = await api.createBet(activePhase.id, 'EXC', amount);
    if (result.error) {
      alert(result.error);
      return;
    }

    if (result.data?.bet) {
      const excBet: Bet = {
        id: result.data.bet.id,
        phaseId: result.data.bet.phaseId || result.data.bet.phase_id,
        userId: result.data.bet.userId || result.data.bet.user_id,
        userRole: result.data.bet.userRole || result.data.bet.user_role,
        number: result.data.bet.number,
        amount: parseFloat(result.data.bet.amount) || 0,
        timestamp: result.data.bet.timestamp
      };

      setAllBets(prev => [...prev, excBet]);

      setActivePhase(prev => prev ? ({
        ...prev,
        totalVolume: prev.totalVolume + amount
      }) : null);
    }
  };

  const handleClearExcess = async () => {
    if (!activePhase || !currentUser || ledger.some(l => l.phaseId === activePhase.id)) return;

    const totals: Record<string, number> = {};
    const phaseBets = allBets.filter(b => b.phaseId === activePhase.id);
    phaseBets.forEach(b => {
      totals[b.number] = (totals[b.number] || 0) + b.amount;
    });

    const corrections: { number: string; amount: number }[] = [];
    let totalReduction = 0;

    for (let i = 0; i < 1000; i++) {
      const numStr = i.toString().padStart(3, '0');
      const total = totals[numStr] || 0;
      const limit = limits[numStr] || globalLimit || 5000;
      const excess = total - limit;

      if (excess > 0) {
        corrections.push({
          number: numStr,
          amount: -excess
        });
        totalReduction += excess;
      }
    }

    if (corrections.length === 0) {
      alert("No excess volume found to clear.");
      return;
    }

    const result = await api.createBulkBets(activePhase.id, corrections);
    if (result.error) {
      alert(result.error);
      return;
    }

    if (result.data?.bets) {
      const newBets: Bet[] = result.data.bets.map((b: any) => ({
        id: b.id,
        phaseId: b.phase_id,
        userId: b.user_id,
        userRole: b.user_role,
        number: b.number,
        amount: parseFloat(b.amount) || 0,
        timestamp: b.timestamp
      }));

      setAllBets(prev => [...prev, ...newBets]);

      setActivePhase(prev => prev ? ({
        ...prev,
        totalVolume: Math.max(-10000000, prev.totalVolume - totalReduction)
      }) : null);
    }
  };

  const closeActivePhase = async () => {
    if (!activePhase) return;

    const result = await api.closePhase(activePhase.id);
    if (result.error) {
      alert(result.error);
      return;
    }

    if (result.data?.settlement) {
      const newLedgerEntry: LedgerEntry = {
        id: `l-${Date.now()}`,
        phaseId: activePhase.id,
        totalIn: result.data.settlement.totalIn,
        totalOut: result.data.settlement.totalOut,
        profit: result.data.settlement.profit,
        closedAt: new Date().toISOString()
      };

      setLedger(prev => [newLedgerEntry, ...prev]);
    }

    setActivePhase(null);
    setActiveTab('phases');
    await loadData(); // Refresh phases list
  };

  const currentPhaseBets = activePhase ? allBets.filter(b => b.phaseId === activePhase.id) : [];
  const isReadOnly = activePhase ? ledger.some(l => l.phaseId === activePhase.id) : false;

  // Show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-2xl font-bold text-white shadow-2xl shadow-indigo-600/30 mb-4 animate-pulse">
            MB
          </div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Login onLogin={handleLogin} />;

  const navItems = [
    { id: 'entry', label: 'ထိုးမည်', icon: 'fa-keyboard', roles: ['ADMIN', 'COLLECTOR'] },
    { id: 'reduction', label: 'တင်ပြီးသားအကွက် ပြန်နှုတ်ရန်', icon: 'fa-minus-circle', roles: ['ADMIN', 'COLLECTOR'] },
    { id: 'calculator', label: '3 Calculator', icon: 'fa-calculator', roles: ['ADMIN', 'COLLECTOR'] },
    { id: 'adjustments', label: '3OVA ပြင်ဆင်ရန်', icon: 'fa-sliders', roles: ['ADMIN'] }, { id: 'excessmanage', label: '3 ကျွံပြင်ဆင်ရန်', icon: 'fa-fire', roles: ['ADMIN'] }, { id: 'history', label: 'My History', icon: 'fa-history', roles: ['COLLECTOR'] },
    { id: 'risk', label: '3 ချပ်ကြည့်ရန်', icon: 'fa-chart-line', roles: ['ADMIN'] },
    { id: 'excess', label: '3 ကျွံများကြည့်ရန်', icon: 'fa-fire-alt', roles: ['ADMIN'] },
    { id: 'phases', label: '3 ချပ်အသစ်လုပ်ရန်', icon: 'fa-calendar-days', roles: ['ADMIN'] },
  ].filter(item => item.roles.includes(currentUser.role));

  const appDisplayName = `MgBaDin (${currentUser.role === 'ADMIN' ? 'Admin' : 'User'})`;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      {/* Desktop Sidebar */}
      <nav className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} hidden md:flex bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col p-4 print:hidden transition-all duration-300 relative`}>
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-10 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors z-10"
        >
          <i className={`fa-solid ${isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-[10px]`}></i>
        </button>

        <div className={`mb-10 px-2 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-3'} overflow-hidden`}>
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex-shrink-0 flex items-center justify-center text-xl font-bold text-white shadow-lg">MB</div>
          {!isSidebarCollapsed && (
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white truncate animate-fade-in">
              {appDisplayName}
            </span>
          )}
        </div>

        <div className="space-y-2 flex-grow">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              title={isSidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center p-3 rounded-lg transition-all text-left group ${activeTab === item.id ? (item.id === 'reduction' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20') : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`}
            >
              <i className={`fa-solid ${item.icon} ${isSidebarCollapsed ? 'mx-auto' : 'w-6'}`}></i>
              {!isSidebarCollapsed && (
                <span className="ml-3 font-medium text-sm leading-tight animate-fade-in">{item.label}</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto border-t border-slate-100 dark:border-slate-800 pt-4 px-2 space-y-4">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center p-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
          >
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} ${isSidebarCollapsed ? '' : 'w-6'}`}></i>
            {!isSidebarCollapsed && (
              <span className="ml-3 font-medium animate-fade-in">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            )}
          </button>

          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-10 h-10 rounded-full flex-shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <div className="text-sm overflow-hidden animate-fade-in">
                <p className="font-semibold truncate text-slate-900 dark:text-white">{currentUser.username}</p>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${currentUser.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'}`}>
                  {currentUser.role === 'ADMIN' ? 'Admin' : 'Collector'}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center p-3 rounded-lg text-slate-400 hover:text-red-500 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
          >
            <i className={`fa-solid fa-right-from-bracket ${isSidebarCollapsed ? '' : 'w-6'}`}></i>
            {!isSidebarCollapsed && (
              <span className="ml-3 font-medium animate-fade-in">Logout</span>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-6 py-2 pb-safe flex justify-between items-center print:hidden">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabType)}
            className={`flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === item.id ? (item.id === 'reduction' ? 'text-rose-600' : 'text-indigo-600 dark:text-indigo-400') + ' scale-110' : 'text-slate-400'}`}
          >
            <i className={`fa-solid ${item.icon} text-lg`}></i>
            <span className="text-[8px] font-black uppercase mt-1 tracking-tighter text-center max-w-[60px] leading-tight">{item.label}</span>
          </button>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center p-2 rounded-xl text-slate-400"
        >
          <i className="fa-solid fa-power-off text-lg"></i>
          <span className="text-[8px] font-black uppercase mt-1 tracking-tighter">Exit</span>
        </button>
      </nav>

      <main className="flex-grow p-4 md:p-6 print:p-0 mb-20 md:mb-0">
        <div className="animate-fade-in pb-10">
          <div className="md:hidden mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm">MB</div>
              <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{appDisplayName}</span>
            </div>
            <button onClick={toggleTheme} className="text-slate-400"><i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i></button>
          </div>

          {/* Active Phase Indicator - Shows on all pages */}
          <div className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 shadow-lg shadow-indigo-600/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <i className={`fa-solid ${activePhase ? 'fa-play-circle' : 'fa-pause-circle'} text-white text-lg`}></i>
                </div>
                <div>
                  <p className="text-[10px] text-white/70 uppercase font-black tracking-widest">Current Active Phase</p>
                  <p className="text-lg font-black text-white">
                    {activePhase ? activePhase.name : 'No Phase Selected'}
                  </p>
                </div>
              </div>
              {activePhase && (
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-white/70 uppercase font-black tracking-widest">Volume</p>
                  <p className="text-lg font-black text-white font-mono">
                    {currentPhaseBets.reduce((sum, b) => sum + b.amount, 0).toLocaleString()}
                  </p>
                </div>
              )}
              {currentUser.role === 'ADMIN' && !activePhase && (
                <button
                  onClick={() => setActiveTab('phases')}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-black uppercase transition-all"
                >
                  Select Phase
                </button>
              )}
            </div>
          </div>

          {activeTab === 'entry' && (
            activePhase
              ? <BulkEntry onNewBets={handleNewBets} readOnly={isReadOnly} variant="entry" />
              : <div className="text-center py-20 bg-white dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <h3 className="text-xl font-black text-slate-400">Please select an active phase</h3>
                <button onClick={() => setActiveTab('phases')} className="mt-4 text-indigo-600 hover:underline font-bold">Go to Phase Management</button>
              </div>
          )}
          {activeTab === 'reduction' && (
            activePhase
              ? <BulkEntry onNewBets={handleBulkReduction} readOnly={isReadOnly} variant="reduction" />
              : <div className="text-center py-20 bg-white dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <h3 className="text-xl font-black text-slate-400">Please select an active phase</h3>
              </div>
          )}
          {activeTab === 'calculator' && (
            <BetCalculator />
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
              : <div className="text-center py-20">Select a phase.</div>
          )}
          {activeTab === 'risk' && currentUser.role === 'ADMIN' && (
            activePhase
              ? <RiskDashboard
                bets={currentPhaseBets}
                limits={limits}
                globalLimit={globalLimit}
                onUpdateLimit={(num, lim) => setLimits(prev => ({ ...prev, [num]: lim }))}
                onUpdateGlobalLimit={handleUpdateGlobalLimit}
                onVoidBet={handleVoidBet}
                onUpdateBetAmount={handleUpdateBetAmount}
                isReadOnly={isReadOnly}
              />
              : <div className="text-center py-20">Select a phase.</div>
          )}
          {activeTab === 'excess' && currentUser.role === 'ADMIN' && (
            activePhase
              ? <ExcessDashboard
                bets={currentPhaseBets}
                limits={limits}
                globalLimit={globalLimit}
                onClearExcess={handleClearExcess}
                isReadOnly={isReadOnly}
              />
              : <div className="text-center py-20">Select a phase.</div>
          )}
          {activeTab === 'excessmanage' && currentUser.role === 'ADMIN' && (
            activePhase
              ? <ExcessAdjustmentsManager
                bets={currentPhaseBets}
                onApplyExcessAdjustment={handleApplyExcessAdjustment}
                onVoidExcessAdjustment={handleVoidBet}
                onUpdateExcessAdjustment={handleUpdateBetAmount}
                isReadOnly={isReadOnly}
              />
              : <div className="text-center py-20">Select a phase.</div>
          )}
          {activeTab === 'phases' && currentUser.role === 'ADMIN' && (
            <PhaseManager
              phases={phases}
              currentPhase={activePhase}
              ledger={ledger}
              onAddPhase={handleAddPhase}
              onDeletePhase={handleDeletePhase}
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
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
