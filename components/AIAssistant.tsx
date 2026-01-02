
import React, { useState } from 'react';
import { RiskAI } from '../services/geminiService';

interface AIAssistantProps {
  bets: any[];
  limits: any;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ bets, limits }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    const ai = new RiskAI();
    const result = await ai.analyzeRisk(bets, limits);
    setAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-1 rounded-2xl">
        <div className="bg-slate-950 p-8 rounded-[15px] text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-6 text-3xl shadow-xl shadow-indigo-600/20">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </div>
          <h2 className="text-2xl font-bold mb-2">AI Risk Intelligence</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Utilize Google Gemini 3 Pro to perform deep thinking analysis on your betting patterns and suggest safety optimizations.
          </p>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-bold transition-all"
          >
            {loading ? (
              <span className="flex items-center">
                <i className="fa-solid fa-spinner animate-spin mr-2"></i>
                Thinking deeply...
              </span>
            ) : (
              'Run Risk Audit'
            )}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 animate-fade-in">
          <div className="flex items-center space-x-2 mb-4 text-indigo-400">
            <i className="fa-solid fa-robot"></i>
            <span className="font-bold uppercase tracking-wider text-sm">Gemini Analysis Report</span>
          </div>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap text-slate-300">
            {analysis}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
