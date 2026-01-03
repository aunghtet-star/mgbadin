
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

  const parsedBetsInfo = useMemo(() => {
    return parseBulkInput(text);
  }, [text]);

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
      onNewBets(parsedBetsInfo.map(b => ({ number: b.number, amount: b.amount })));
      setText('');
    } else {
      alert("မှန်ကန်သောပုံစံကို အသုံးပြုပါ။ ဥပမာ - 123-500 သို့မဟုတ် 123R5000");
    }
  };

  const startVoiceCapture = () => {
    if (readOnly) return;
    if (!('webkitSpeechRecognition' in window)) {
      alert("ဤဘရောက်ဇာတွင် အသံဖမ်းစနစ်အား ထောက်ပံ့မပေးပါ။");
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
           <div className="bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-500/30 p-4 rounded-xl flex items-center space-x-3 mb-2">
              <i className="fa-solid fa-lock text-emerald-600 dark:text-emerald-400"></i>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">အစီအစဉ်ပိတ်သိမ်းပြီး - စာရင်းသွင်း၍မရပါ</span>
           </div>
        )}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          <div className="bg-slate-50 dark:bg-slate-800/50 px-5 md:px-6 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-terminal text-indigo-600 dark:text-indigo-400"></i>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-200">ကောင်တာ</span>
            </div>
            <div className="flex items-center space-x-3 md:space-x-4">
              <div className="text-right">
                <span className="text-[8px] md:text-[10px] text-slate-500 uppercase font-black block leading-none mb-1">အရေအတွက်</span>
                <span className="text-sm md:text-base font-black text-indigo-600 dark:text-indigo-400 block leading-none">{parsedBetsInfo.length}</span>
              </div>
              <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-3 md:pl-4">
                <span className="text-[8px] md:text-[10px] text-slate-500 uppercase font-black block leading-none mb-1">စုစုပေါင်း</span>
                <span className="text-sm md:text-base font-black text-emerald-600 dark:text-emerald-400 block leading-none">{totalSum.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="relative group">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={readOnly}
              placeholder={readOnly ? "စာရင်းပိတ်ပြီး..." : "123-500\n456R1000..."}
              className="w-full h-80 md:h-96 bg-transparent p-6 md:p-8 text-2xl md:text-3xl font-mono focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-800 text-slate-900 dark:text-white custom-scrollbar resize-none leading-tight"
            />
            
            {!readOnly && (
              <div className="absolute bottom-4 right-4 flex flex-col space-y-3">
                <button 
                  onClick={startVoiceCapture}
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all shadow-2xl border-4 border-white dark:border-slate-900 ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                  title="အသံဖြင့်သွင်းရန်"
                >
                  <i className="fa-solid fa-microphone text-xl md:text-2xl"></i>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center transition-all shadow-2xl border-4 border-white dark:border-slate-900"
                  title="ပုံဖတ်ပြီးသွင်းရန်"
                >
                  <i className="fa-solid fa-camera text-xl md:text-2xl"></i>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleOcr} />
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleProcess}
          disabled={!text.trim() || readOnly || parsedBetsInfo.length === 0}
          className="w-full py-5 md:py-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 rounded-3xl font-black text-xl md:text-2xl text-white transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-3 active:scale-95"
        >
          {isOcrLoading ? (
            <i className="fa-solid fa-spinner animate-spin"></i>
          ) : (
            <>
              <i className="fa-solid fa-check-double"></i>
              <span>အတည်ပြုမည်</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          <div className="bg-slate-50 dark:bg-slate-800/30 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center space-x-2">
              <i className="fa-solid fa-list-check"></i>
              <span>စစ်ဆေးခြင်း</span>
            </h3>
          </div>
          <div className="p-3 md:p-4 max-h-[300px] md:max-h-[480px] overflow-y-auto custom-scrollbar space-y-2">
            {validationGroups.length > 0 ? (
              validationGroups.map(([original, data]) => (
                <div key={original} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/50 p-4 rounded-2xl flex justify-between items-center group transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 font-mono font-black text-indigo-600">
                       {original.split(/[R-]/)[0]}
                    </div>
                    <div>
                      <span className="font-mono text-slate-900 dark:text-white font-black text-lg">{original}</span>
                      <p className="text-[9px] text-slate-500 uppercase font-black">
                        {data.isPerm ? `${data.count} ကွက် (R)` : 'တိုက်ရိုက်'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm">x{data.amount.toLocaleString()}</span>
                    <p className="text-[10px] text-slate-900 dark:text-white font-black mt-1">
                      {(data.amount * data.count).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center opacity-30 flex flex-col items-center">
                <i className="fa-solid fa-hourglass-start text-4xl mb-4 text-slate-400"></i>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">စာရင်းစောင့်ဆိုင်းနေပါသည်...</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">ဖြတ်လမ်းနည်းများ</h4>
          <div className="grid grid-cols-2 gap-3">
             <div className="flex flex-col p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <code className="text-indigo-600 dark:text-indigo-400 text-sm font-bold mb-1">123-500</code>
                <span className="text-[9px] text-slate-500 uppercase font-bold">ရိုးရိုး</span>
             </div>
             <div className="flex flex-col p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <code className="text-indigo-600 dark:text-indigo-400 text-sm font-bold mb-1">123R500</code>
                <span className="text-[9px] text-slate-500 uppercase font-bold">အာပတ်</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkEntry;
