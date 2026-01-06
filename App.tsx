
import React, { useState, useEffect } from 'react';
import { User, GamePhase, Bet, LedgerEntry } from './types';
import BulkEntry from './components/BulkEntry';
import RiskDashboard from './components/RiskDashboard';
import ExcessDashboard from './components/ExcessDashboard';
import { PhaseManager } from './components/PhaseManager';
import Login from './components/Login';
import UserHistory from './components/UserHistory';
import AdjustmentsManager from './components/AdjustmentsManager';
import { api } from './services/apiService';

type TabType = 'entry' | 'reduction' | 'risk' | 'excess' | 'phases' | 'history' | 'adjustments';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('phases');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [phases, setPhases] = useState<GamePhase[]>([]);
  const [activePhase, setActivePhase] = useState<GamePhase | null>(null);
  const [allBets, setAllBets] = useState<Bet[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [limits, setLimits] = useState<Record<string, number>>({
    'global': 5000,
  });

  // Load Initial Data from API
  useEffect(() => {
    const token = localStorage.getItem('banker_token');
    const userStr = localStorage.getItem('banker_session');
    
    if (token && userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      loadPhases();
    }
  }, []);

  const loadPhases = async () => {
    try {
      const data = await api.getPhases();
      setPhases(data);
      const active = data.find(p => p.active);
      if (active) handleSelectPhase(active.id);
    } catch (e) {
      handleLogout();
    }
  };

  const loadBets = async (phaseId: string) => {
    const data = await api.getBets(phaseId);
    setAllBets(data);
  };

  const handleLogin = (data: { user: User; token: string }) => {
    setCurrentUser(data.user);
    localStorage.setItem('banker_token', data.token);
    localStorage.setItem('banker_session', JSON.stringify(data.user));
    loadPhases();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('banker_token');
    localStorage.removeItem('banker_session');
  };

  const handleAddPhase = async (name: string) => {
    try {
      await api.createPhase(name);
      await loadPhases();
    } catch (e) {
      alert("Error creating phase");
    }
  };

  const handleSelectPhase = async (phaseId: string) => {
    if (!phaseId) {
      setActivePhase(null);
      setAllBets([]);
      return;
    }
    const targetPhase = phases.find(p => p.id === phaseId);
    if (!targetPhase) return;
    setActivePhase(targetPhase);
    await loadBets(phaseId);
  };

  const handleNewBets = async (newBets: { number: string; amount: number }[]) => {
    if (!currentUser || !activePhase) return;
    try {
      await api.submitBets(activePhase.id, newBets);
      await loadBets(activePhase.id);
      await loadPhases(); // Update phase stats
    } catch (e) {
      alert("Error submitting bets");
    }
  };

  // UI state logic...
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  if (!currentUser) return <Login onLogin={handleLogin} />;

  const navItems = [
    { id: 'entry', label: 'ထိုးမည်', icon: 'fa-keyboard', roles: ['ADMIN', 'COLLECTOR'] },
    { id: 'reduction', label: 'တင်ပြီးသားအကွက် ပြန်နှုတ်ရန်', icon: 'fa-minus-circle', roles: ['ADMIN', 'COLLECTOR'] },
    { id: 'adjustments', label: '3OVA ပြင်ဆင်ရန်', icon: 'fa-calculator', roles: ['ADMIN'] },
    { id: 'history', label: 'My History', icon: 'fa-history', roles: ['COLLECTOR'] },
    { id: 'risk', label: '3 ချပ်ကြည့်ရန်', icon: 'fa-chart-line', roles: ['ADMIN'] },
    { id: 'excess', label: '3 ကျွံများကြည့်ရန်', icon: 'fa-fire-alt', roles: ['ADMIN'] },
    { id: 'phases', label: '3 ချပ်အသစ်လုပ်ရန်', icon: 'fa-calendar-days', roles: ['ADMIN'] },
  ].filter(item => item.roles.includes(currentUser.role));

  const appDisplayName = `MgBaDin (${currentUser.role === 'ADMIN' ? 'Admin' : 'User'})`;

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${theme === 'dark' ? 'dark bg-slate-950' : 'bg-slate-50'} text-slate-800 dark:text-slate-200 transition-colors duration-300`}>
      <nav className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} hidden md:flex bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col p-4 print:hidden transition-all duration-300 relative`}>
        <button onClick={toggleSidebar} className="absolute -right-3 top-10 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg"><i className={`fa-solid ${isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-[10px]`}></i></button>
        <div className="mb-10 px-2 flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex-shrink-0 flex items-center justify-center text-xl font-bold text-white">MB</div>
          {!isSidebarCollapsed && <span className="text-xl font-black text-slate-900 dark:text-white truncate">{appDisplayName}</span>}
        </div>
        <div className="space-y-2 flex-grow">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as TabType)} className={`w-full flex items-center p-3 rounded-lg transition-all text-left ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`}>
              <i className={`fa-solid ${item.icon} ${isSidebarCollapsed ? 'mx-auto' : 'w-6'}`}></i>
              {!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">{item.label}</span>}
            </button>
          ))}
        </div>
        <div className="mt-auto pt-4 space-y-4">
          <button onClick={toggleTheme} className="w-full flex items-center p-3 text-slate-500"><i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>{!isSidebarCollapsed && <span className="ml-3">Theme</span>}</button>
          <button onClick={handleLogout} className="w-full flex items-center p-3 text-red-400"><i className="fa-solid fa-right-from-bracket"></i>{!isSidebarCollapsed && <span className="ml-3">Logout</span>}</button>
        </div>
      </nav>

      <main className="flex-grow p-4 md:p-6 overflow-y-auto custom-scrollbar">
          {activeTab === 'entry' && activePhase && <BulkEntry onNewBets={handleNewBets} variant="entry" />}
          {activeTab === 'phases' && currentUser.role === 'ADMIN' && (
            <PhaseManager 
              phases={phases} 
              currentPhase={activePhase} 
              ledger={ledger} 
              onAddPhase={handleAddPhase} 
              onDeletePhase={()=>{}} 
              onClosePhase={()=>{}} 
              onSelectPhase={handleSelectPhase} 
              bets={allBets} 
            />
          )}
          {activeTab === 'risk' && currentUser.role === 'ADMIN' && activePhase && (
            <RiskDashboard bets={allBets} limits={limits} onUpdateLimit={()=>{}} onVoidBet={()=>{}} onUpdateBetAmount={()=>{}} onApplyReduction={()=>{}} isReadOnly={false} />
          )}
          {activeTab === 'history' && currentUser.role === 'COLLECTOR' && <UserHistory bets={allBets} />}
      </main>
    </div>
  );
};

export default App;
