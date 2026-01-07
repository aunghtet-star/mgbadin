
import React, { useState } from 'react';
import { User } from '../types';
import api from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await api.login(username, password);
      
      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      if (result.data?.user) {
        const user: User = {
          id: result.data.user.id,
          username: result.data.user.username,
          role: result.data.user.role,
          balance: result.data.user.balance || 0,
          token: result.data.token
        };
        onLogin(user);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-4xl font-bold text-white shadow-2xl shadow-indigo-600/30 mb-4">
            MB
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">MgBaDin</h1>
          <p className="text-slate-400 mt-2">Login to manage your entries</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <div className="space-y-6">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/50 p-3 rounded-lg text-rose-500 text-xs font-bold animate-fade-in">
                <i className="fa-solid fa-circle-exclamation mr-2"></i>
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-lg text-white transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center"
            >
              {isLoading ? (
                <i className="fa-solid fa-circle-notch animate-spin"></i>
              ) : (
                'Login'
              )}
            </button>
          </div>
          
        
        </form>
        <p className="text-center text-slate-600 text-xs mt-8">
          Secure Fintech Platform &copy; 2024
        </p>
      </div>
    </div>
  );
};

export default Login;
