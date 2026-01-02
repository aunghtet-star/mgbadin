
import React, { useState, useRef, useMemo } from 'react';
import { parseBulkInput, voiceToFormat, cleanOcrText } from '../utils/parser';

interface BulkEntryProps {
  onNewBets: (bets: { number: string; amount: number }[]) => void;
  readOnly?: boolean;
}

const BulkEntry: React.FC<BulkEntryProps> = ({ onNewBets, readOnly = false }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse bets for real-time validation preview
  const parsedBetsInfo = useMemo(() => {
    return parseBulkInput(text);
  }, [text]);

  // Group by original string for a cleaner "Validation" view
  const validationGroups = useMemo(() => {
    const groups: Record<string, { count: number; amount: number; isPerm: boolean }> = {};
    parsedBetsInfo.forEach(bet => {
      if (!groups[bet.original]) {
        groups[bet.original] = { count: 0, amount: bet.amount, isPerm: bet.isPermutation };
      }
      groups[bet.original].count++;
    });
    return Object.entries(groups);
  }, [parsedBetsInfo]);

  const totalSum = useMemo(() => {
    return parsedBetsInfo.reduce((acc, curr) => acc + curr.amount, 0);
  }, [parsedBetsInfo]);

  const handleProcess = () => {
    if (readOnly) return;
    if (parsedBetsInfo.length > 0) {
      // Map to the format the parent expects
      onNewBets(parsedBetsInfo.map(b => ({ number: b.number, amount: b.amount })));
      setText('');
    } else {
      alert("No valid bet patterns found. Use formats like 123-500 or 123R5000.");
    }
  };

  const startVoiceCapture = () => {
    if (readOnly) return;
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const formatted = voiceToFormat(transcript);
      setText(prev => prev + (prev ? '\n' : '') + formatted);
    };

    recognition.start();
  };

  const handleOcr = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    // In a real app, you'd use Tesseract.js or Cloud Vision here
    setTimeout(() => {
      const mockResult = "123-500\n456R1000\n789R-200";
      const cleaned = cleanOcrText(mockResult);
      setText(prev => prev + (prev ? '\n' : '') + cleaned);
      setIsOcrLoading(false);
    }, 1500);
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${readOnly ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
      <div className="lg:col-span-2 space-y-4">
        {readOnly && (
           <div className="bg-emerald-900/40 border border-emerald-500/30 p-4 rounded-xl flex items-center space-x-3 mb-2">
              <i className="fa-solid fa-lock text-emerald-400"></i>
              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Session Closed: Entry Disabled</span>
           </div>
        )}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          <div className="bg-slate-800/50 px-6 py-4 flex justify-between items-center border-b border-slate-700">
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-terminal text-indigo-400"></i>
              <span className="text-xs font-black uppercase tracking-widest text-slate-200">Batch Entry Console</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-black">Valid Items</span>
                <span className="text-sm font-bold text-indigo-400 block">{parsedBetsInfo.length}</span>
              </div>
              <div className="text-right border-l border-slate-700 pl-4">
                <span className="text-[10px] text-slate-500 uppercase font-black">Subtotal</span>
                <span className="text-sm font-bold text-emerald-400 block">Ks {totalSum.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={readOnly}
              placeholder={readOnly ? "Locked..." : "Enter bets: 123-500 or 123R5000..."}
              className="w-full h-96 bg-transparent p-8 text-2xl font-mono focus:outline-none placeholder:text-slate-700 custom-scrollbar resize-none leading-relaxed"
            />
            
            {!readOnly && (
              <div className="absolute bottom-6 right-6 flex items-center space-x-3">
                <button 
                  onClick={startVoiceCapture}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                  title="Voice Entry"
                >
                  <i className="fa-solid fa-microphone text-xl"></i>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all shadow-xl"
                  title="Image Scan"
                >
                  <i className="fa-solid fa-camera text-xl"></i>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleOcr} />
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleProcess}
          disabled={!text.trim() || readOnly || parsedBetsInfo.length === 0}
          className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 rounded-2xl font-black text-xl text-white transition-all shadow-xl shadow-indigo-900/30 flex items-center justify-center space-x-3"
        >
          {isOcrLoading ? (
            <i className="fa-solid fa-spinner animate-spin"></i>
          ) : (
            <>
              <i className="fa-solid fa-check-double"></i>
              <span>POST TICKETS (Ks {totalSum.toLocaleString()})</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* Validation Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-slate-800/30 px-5 py-3 border-b border-slate-800">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center space-x-2">
              <i className="fa-solid fa-list-check"></i>
              <span>Live Validation Feed</span>
            </h3>
          </div>
          <div className="p-4 max-h-[480px] overflow-y-auto custom-scrollbar space-y-2">
            {validationGroups.length > 0 ? (
              validationGroups.map(([original, data]) => (
                <div key={original} className="bg-slate-950/50 border border-slate-800/50 p-3 rounded-xl flex justify-between items-center group hover:border-indigo-500/30 transition-all">
                  <div>
                    <span className="font-mono text-white font-bold">{original}</span>
                    <p className="text-[9px] text-slate-500 uppercase font-black mt-1">
                      {data.isPerm ? `${data.count} Combinations` : 'Direct Entry'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono font-bold">Ks {data.amount.toLocaleString()}</span>
                    <p className="text-[9px] text-slate-600 uppercase font-black mt-1">
                      Total: {(data.amount * data.count).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center opacity-30 flex flex-col items-center">
                <i className="fa-solid fa-hourglass-start text-4xl mb-4"></i>
                <p className="text-[10px] font-black uppercase tracking-widest">Waiting for input...</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Parsing Guide</h4>
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <code className="text-indigo-400 text-xs font-bold bg-indigo-400/10 px-2 py-1 rounded">123-500</code>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Standard</span>
             </div>
             <div className="flex items-center justify-between">
                <code className="text-indigo-400 text-xs font-bold bg-indigo-400/10 px-2 py-1 rounded">123R5000</code>
                <span className="text-[10px] text-slate-500 uppercase font-bold">New Perm</span>
             </div>
             <div className="flex items-center justify-between">
                <code className="text-indigo-400 text-xs font-bold bg-indigo-400/10 px-2 py-1 rounded">123R-5000</code>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Alt Perm</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkEntry;
