
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { parseBulkInput, voiceToFormat } from '../utils/parser';
import { extractBetsFromImage, ExtractedBet } from '../services/geminiService';

interface BulkEntryProps {
  onNewBets: (bets: { number: string; amount: number }[]) => void;
  readOnly?: boolean;
  variant?: 'entry' | 'reduction';
}

const BulkEntry: React.FC<BulkEntryProps> = ({ onNewBets, readOnly = false, variant = 'entry' }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [scanToast, setScanToast] = useState<{ count: number; time: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const isReduction = variant === 'reduction';
  const themeColorClass = isReduction ? 'rose' : 'indigo';
  const accentColorClass = isReduction ? 'rose' : 'indigo';

  // Sync stream to video element
  useEffect(() => {
    let intervalId: number;

    if (showCamera && stream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      
      video.play().catch(err => console.error("Video play failed:", err));

      const checkReady = () => {
        if (video && video.readyState >= 2) {
          setIsVideoReady(true);
          clearInterval(intervalId);
        }
      };

      intervalId = window.setInterval(checkReady, 200);
      checkReady();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showCamera, stream]);

  // Handle Scan Toast timeout
  useEffect(() => {
    if (scanToast) {
      const timer = setTimeout(() => setScanToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [scanToast]);

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
    }
  };

  const startCamera = async () => {
    setIsVideoReady(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        } 
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not open camera. Please ensure permissions are granted.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setIsVideoReady(false);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current || !isVideoReady || isScanning) return;
    
    setIsScanning(true);
    try {
      const context = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (context) {
        const video = videoRef.current;
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          throw new Error("Video dimensions not ready.");
        }

        const targetWidth = 1440;
        const scale = Math.min(1, targetWidth / video.videoWidth);
        canvasRef.current.width = video.videoWidth * scale;
        canvasRef.current.height = video.videoHeight * scale;
        
        context.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);
        
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
        const base64Image = dataUrl.split(',')[1];
        
        const results: ExtractedBet[] = await extractBetsFromImage(base64Image);
        
        if (results && results.length > 0) {
          const formatted = results.map(r => `${r.number}${r.isPermutation ? 'R' : '-'}${r.amount}`).join('\n');
          setText(prev => prev + (prev ? '\n' : '') + formatted);
          setScanToast({ count: results.length, time: Date.now() });
          
          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }
        } else {
          alert("No clear numbers detected. Try better lighting.");
        }
      }
    } catch (error: any) {
      console.error("Scanning error:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const startVoiceCapture = () => {
    if (readOnly) return;
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setText(prev => prev + (prev ? '\n' : '') + voiceToFormat(transcript));
    };
    recognition.start();
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${readOnly ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
      <canvas ref={canvasRef} className="hidden" />
      
      {showCamera && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-0 md:p-4">
          <div className="relative w-full h-full md:max-w-2xl md:aspect-[3/4] md:rounded-3xl overflow-hidden border-0 md:border-4 border-slate-800 bg-slate-900 shadow-2xl">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`} 
            />
            
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center space-x-2">
                <div className={`w-2 h-2 ${isReduction ? 'bg-rose-500' : 'bg-red-500'} rounded-full animate-pulse`}></div>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">{isReduction ? 'Reduction Burst' : 'Rapid Burst Scanner'}</span>
              </div>
              <div className={`bg-${accentColorClass}-600/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg`}>
                <span className="text-xs font-black text-white">{parsedBetsInfo.length} Items Queued</span>
              </div>
            </div>

            {scanToast && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 animate-bounce-in">
                <div className={`bg-${isReduction ? 'rose' : 'emerald'}-500 text-white px-8 py-4 rounded-3xl shadow-2xl flex flex-col items-center border-4 border-white/20`}>
                  <i className="fa-solid fa-circle-check text-4xl mb-2"></i>
                  <span className="text-xl font-black uppercase tracking-tight">+{scanToast.count} {isReduction ? 'Reduced' : 'Scanned'}</span>
                </div>
              </div>
            )}

            {!isVideoReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900">
                <i className="fa-solid fa-circle-notch animate-spin text-4xl mb-4"></i>
                <p className="text-[10px] font-black uppercase tracking-widest">Warming Up Camera...</p>
              </div>
            )}

            <div className={`absolute inset-0 border-[30px] md:border-[40px] border-black/50 pointer-events-none flex items-center justify-center transition-opacity ${isVideoReady ? 'opacity-100' : 'opacity-0'}`}>
               <div className="w-full aspect-[4/3] border-2 border-white/30 rounded-xl relative">
                  <div className={`absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-${accentColorClass}-500 rounded-tl-xl`}></div>
                  <div className={`absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-${accentColorClass}-500 rounded-tr-xl`}></div>
                  <div className={`absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-${accentColorClass}-500 rounded-bl-xl`}></div>
                  <div className={`absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-${accentColorClass}-500 rounded-br-xl`}></div>
                  
                  {isScanning && (
                    <div className={`absolute inset-0 bg-${accentColorClass}-500/10 animate-pulse`}></div>
                  )}
                  <div className={`absolute inset-x-0 h-1 bg-${accentColorClass}-500/60 shadow-[0_0_20px_rgba(${isReduction ? '225,29,72' : '99,102,241'},1)] ${isScanning ? 'animate-scan-line' : 'top-1/2 opacity-20'}`}></div>
               </div>
            </div>

            <div className="absolute bottom-10 inset-x-0 flex justify-center items-center space-x-12 px-8">
               <button onClick={stopCamera} className="group flex flex-col items-center">
                 <div className="w-16 h-16 rounded-full bg-slate-900/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 group-active:scale-90 transition-all">
                   <i className="fa-solid fa-check text-xl"></i>
                 </div>
                 <span className="text-[10px] font-black text-white uppercase mt-2 opacity-60">Finish</span>
               </button>

               <button 
                 onClick={captureAndScan} 
                 disabled={isScanning || !isVideoReady}
                 className="relative group active:scale-95 transition-all"
               >
                 <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                    <div className={`w-20 h-20 rounded-full border-8 border-slate-900 flex items-center justify-center ${isScanning ? 'animate-pulse' : ''}`}>
                       {isScanning ? (
                         <i className={`fa-solid fa-cloud-arrow-up text-${accentColorClass}-600 text-2xl`}></i>
                       ) : (
                         <div className={`w-14 h-14 rounded-full bg-${accentColorClass}-600`}></div>
                       )}
                    </div>
                 </div>
               </button>

               <div className="w-16 h-16 opacity-0 pointer-events-none"></div>
            </div>
          </div>
        </div>
      )}

      <div className="lg:col-span-2 space-y-4">
        <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col ${isReduction ? 'border-rose-200 dark:border-rose-900/40' : ''}`}>
          <div className={`${isReduction ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-slate-50 dark:bg-slate-800/50'} px-6 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700`}>
            <div className="flex items-center space-x-2">
              <i className={`fa-solid ${isReduction ? 'fa-minus-circle text-rose-500' : 'fa-bolt text-amber-500'}`}></i>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-200">
                {isReduction ? 'Rapid Reduction Console' : 'Rapid Entry Console'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-black block leading-none mb-1">Items</span>
                <span className={`text-base font-black text-${accentColorClass}-600 dark:text-${accentColorClass}-400 block leading-none`}>{parsedBetsInfo.length}</span>
              </div>
              <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-4">
                <span className="text-[10px] text-slate-500 uppercase font-black block leading-none mb-1">Batch Total</span>
                <span className={`text-base font-black text-${isReduction ? 'rose' : 'emerald'}-600 dark:text-${isReduction ? 'rose' : 'emerald'}-400 block leading-none`}>
                  {isReduction ? '-' : ''}{totalSum.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="relative group">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={readOnly}
              placeholder={isReduction ? "Subtract syntax:&#10;123 500&#10;123R 1000&#10;777@200" : "Syntax examples:&#10;123 R 1000&#10;123@500&#10;123.200&#10;123 1000&#10;123R=2000"}
              className={`w-full h-80 md:h-96 bg-transparent p-6 md:p-8 text-2xl md:text-3xl font-mono focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-800 text-slate-900 dark:text-white custom-scrollbar resize-none leading-tight ${isReduction ? 'text-rose-600 dark:text-rose-400' : ''}`}
            />
            
            {!readOnly && (
              <div className="absolute bottom-4 right-4 flex flex-col space-y-3">
                <button 
                  onClick={startVoiceCapture}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-2xl border-4 border-white dark:border-slate-900 ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                  title="Voice Entry"
                >
                  <i className="fa-solid fa-microphone text-2xl"></i>
                </button>
                <button 
                  onClick={startCamera}
                  className={`w-16 h-16 rounded-2xl bg-${accentColorClass}-600 text-white flex items-center justify-center transition-all shadow-2xl border-4 border-white dark:border-slate-900 hover:scale-105 active:scale-95`}
                  title="Open Rapid Scanner"
                >
                  <i className="fa-solid fa-camera text-2xl"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleProcess}
          disabled={!text.trim() || readOnly || parsedBetsInfo.length === 0}
          className={`w-full py-6 bg-${accentColorClass}-600 hover:bg-${accentColorClass}-500 disabled:opacity-30 rounded-3xl font-black text-2xl text-white transition-all shadow-xl shadow-${accentColorClass}-600/30 flex items-center justify-center space-x-3`}
        >
          <i className={`fa-solid ${isReduction ? 'fa-minus-square' : 'fa-check-double'}`}></i>
          <span>{isReduction ? 'Confirm Reductions' : 'Finalize Batch'}</span>
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          <div className={`${isReduction ? 'bg-rose-50 dark:bg-rose-900/10' : 'bg-slate-50 dark:bg-slate-800/30'} px-5 py-4 border-b border-slate-200 dark:border-slate-800`}>
            <h3 className={`text-[10px] font-black uppercase tracking-widest text-${accentColorClass}-600 dark:text-${accentColorClass}-400 flex items-center space-x-2`}>
              <i className={`fa-solid ${isReduction ? 'fa-filter-circle-xmark' : 'fa-list-check'}`}></i>
              <span>{isReduction ? 'Reduction Queue' : 'Live Accumulator'}</span>
            </h3>
          </div>
          <div className="p-4 max-h-[480px] overflow-y-auto custom-scrollbar space-y-2">
            {validationGroups.length > 0 ? (
              validationGroups.map(([original, data]) => (
                <div key={original} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/50 p-4 rounded-2xl flex justify-between items-center animate-fade-in">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 font-mono font-black text-${accentColorClass}-600`}>
                       {original.split(/[R-r@=*\.,\/\s]/)[0].substring(0,3)}
                    </div>
                    <div>
                      <span className="font-mono text-slate-900 dark:text-white font-black text-lg">{original}</span>
                      <p className="text-[9px] text-slate-500 uppercase font-black">
                        {data.isPerm ? `${data.count} items (R)` : 'Direct'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`${isReduction ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'} font-mono font-black text-sm`}>
                      {isReduction ? '-' : 'x'}{data.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center opacity-30 flex flex-col items-center">
                <i className={`fa-solid ${isReduction ? 'fa-eraser' : 'fa-hourglass-start'} text-4xl mb-4 text-slate-400`}></i>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {isReduction ? 'Enter items to subtract' : 'Scan slips to begin'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan-line {
          position: absolute;
          width: 100%;
          height: 2px;
          animation: scan 3s linear infinite;
        }
        @keyframes bounce-in {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          70% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </div>
  );
};

export default BulkEntry;
