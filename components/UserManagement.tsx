
import React, { useState, useEffect } from 'react';
import { User, Bet } from '../types';
import api from '../services/api';
import UserHistory from './UserHistory';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // History State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState<User | null>(null);
  const [historyBets, setHistoryBets] = useState<Bet[]>([]);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'USER' | 'COLLECTOR'>('COLLECTOR');
  
  useEffect(() => {
    loadUsers();
    
    // Poll for updates every 5 seconds to keep "Current Volume" live
    const interval = setInterval(() => {
      loadUsers();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadUsers = async () => {
    const result = await api.getUsers();
    if (result.data?.users) {
      setUsers(result.data.users);
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setRole('COLLECTOR');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setPassword(''); // Don't show existing password
    setRole(user.role);
    setIsModalOpen(true);
  };

  const handleViewHistory = async (user: User) => {
    setHistoryUser(user);
    setHistoryBets([]);
    setIsHistoryModalOpen(true);
    
    const result = await api.getUserHistory(user.id);
    if (result.data?.bets) {
      setHistoryBets(result.data.bets);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      // Update
      const updates: any = { username, role };
      if (password) updates.password = password;
      
      const result = await api.updateUser(editingUser.id, updates);
      if (result.error) {
        alert(result.error);
      } else {
        await loadUsers();
        setIsModalOpen(false);
      }
    } else {
      // Create
      if (!password) {
        alert("Password is required for new users");
        return;
      }
      const result = await api.createUser(username, password, role);
      if (result.error) {
        alert(result.error);
      } else {
        await loadUsers();
        setIsModalOpen(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this user? This cannot be undone.")) {
      const result = await api.deleteUser(id);
      if (result.error) {
        alert(result.error);
      } else {
        await loadUsers();
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">အကောင့်များစီမံရန်</h2>
          <p className="text-slate-500 font-medium text-sm">Manage user access and roles.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"
        >
          <i className="fa-solid fa-user-plus"></i> Create User
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Username</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Current Volume</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-500">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide ${
                      user.role === 'ADMIN' 
                        ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' 
                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      {user.role === 'COLLECTOR' ? 'USER' : user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm font-bold text-slate-600 dark:text-slate-300">
                    {user.balance.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleViewHistory(user)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                        title="View History"
                      >
                        <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                      </button>
                      <button 
                        onClick={() => handleOpenEdit(user)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                        title="Edit User"
                      >
                        <i className="fa-solid fa-pen-to-square text-xs"></i>
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                        title="Delete User"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">
              {editingUser ? 'Edit User' : 'Create New User'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">
                  Password {editingUser && <span className="text-slate-400 font-normal normal-case">(Leave blank to keep current)</span>}
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  required={!editingUser}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Role</label>
                  <select 
                    value={role}
                    onChange={e => setRole(e.target.value as 'ADMIN' | 'USER' | 'COLLECTOR')}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white appearance-none"
                  >
                    <option value="COLLECTOR">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl text-xs font-black uppercase shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-3.5 rounded-xl text-xs font-black uppercase transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isHistoryModalOpen && historyUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {historyUser.username}'s History
                </h3>
                <p className="text-xs font-medium text-slate-500">Recent betting activity</p>
              </div>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 transition-all"
              >
                <i className="fa-solid fa-xmark text-slate-500 dark:text-slate-300"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
              <UserHistory bets={historyBets} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
