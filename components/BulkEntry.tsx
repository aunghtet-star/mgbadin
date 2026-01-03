
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { parseBulkInput, voiceToFormat } from '../utils/parser';
import { extractBetsFromImage } from '../services/geminiService';

interface BulkEntryProps {
  onNewBets: (bets: { number: string; amount: number }[]) => void;
  readOnly?: boolean;
}

const BulkEntry: React.FC<BulkEntryProps> = ({ onNewBets, readOnly = false }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Sync stream to video element
  useEffect(() => {
    let intervalId: number;

    if (showCamera && stream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      
      // Explicitly call play to handle browsers that might pause on attach
      video.play().catch(err => console.error("Video play failed:", err));

      const checkReady = () => {
        if (video && video.readyState >= 2) {
          setIsVideoReady(true);
          clearInterval(intervalId);
        }
      };

      intervalId = window.setInterval(checkReady, 200);
      
      // Initial check
      checkReady();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showCamera, stream]);

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
      alert("ካሜራ መክፈတ် አልተቻለም။ እባက်ዎ ፍቃဒ ይስጡ። (Camera access denied)");
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

  const handleVideoReady = () => {
    if (videoRef.current && videoRef.current.readyState >= 2) {
      setIsVideoReady(true);
    }
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current || !isVideoReady) return;
    
    setIsScanning(true);
    try {
      const context = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (context) {
        const video = videoRef.current;
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          throw new Error("Video dimensions are not yet available.");
        }

        const targetWidth = 1280;
        const scale = Math.min(1, targetWidth / video.videoWidth);
        canvasRef.current.width = video.videoWidth * scale;
        canvasRef.current.height = video.videoHeight * scale;
        
        context.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);
        
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
        const base64Image = dataUrl.split(',')[1];
        
        if (!base64Image) {
          throw new Error("Failed to capture image data.");
        }

        const results = await extractBetsFromImage(base64Image);
        if (results && results.length > 0) {
          const formatted = results.map(r => `${r.number}${r.isPermutation ? 'R' : '-'}${r.amount}`).join('\n');
          setText(prev => prev + (prev ? '\n' : '') + formatted);
          stopCamera();
        } else {
          alert("ምንም መረጃ ማግኘት አልተቻለም။ እባክዎ በድጋሚ ይሞክሩ။ (No data found)");
        }
      }
    } catch (error: any) {
      console.error("Scanning error:", error);
      alert(`စစ်ဆေးမှု မအောင်မြင်ပါ။ Error: ${error.message || 'Unknown'}`);
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
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-2xl aspect-[3/4] rounded-3xl overflow-hidden border-4 border-slate-800 bg-slate-900 shadow-2xl">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              onLoadedMetadata={handleVideoReady}
              onCanPlay={handleVideoReady}
              onPlaying={handleVideoReady}
              className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`} 
            />
            
            {!isVideoReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                <i className="fa-solid fa-circle-notch animate-spin text-4xl mb-4"></i>
                <p className="text-[10px] font-black uppercase tracking-widest">ካሜራ በመဖွင့်နေသည်...</p>
              </div>
            )}

            {/* Viewfinder Overlay */}
            <div className={`absolute inset-0 border-[40px] border-black/60 pointer-events-none flex items-center justify-center transition-opacity ${isVideoReady ? 'opacity-100' : 'opacity-0'}`}>
               <div className="w-full aspect-[4/3] border-2 border-indigo-500/50 rounded-xl relative">
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>
                  
                  {(isScanning || isVideoReady) && (
                    <div className={`absolute inset-x-0 h-1 bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.8)] ${isScanning ? 'animate-scan-line' : 'top-0 opacity-20'}`}></div>
                  )}
               </div>
            </div>

            <div className="absolute bottom-8 inset-x-0 flex justify-center items-center space-x-8">
               <button onClick={stopCamera} className="w-14 h-14 rounded-full bg-slate-800/80 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-90">
                 <i className="fa-solid fa-xmark text-xl"></i>
               </button>
               <button 
                 onClick={captureAndScan} 
                 disabled={isScanning || !isVideoReady}
                 className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-95 transition-all disabled:opacity-20 disabled:scale-90"
               >
                 <div className="w-16 h-16 rounded-full border-4 border-slate-900 flex items-center justify-center">
                    {isScanning ? (
                      <i className="fa-solid fa-spinner animate-spin text-indigo-600 text-xl"></i>
                    ) : (
                      <div className={`w-12 h-12 rounded-full transition-colors ${isVideoReady ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                    )}
                 </div>
               </button>
               <div className="w-14 h-14 opacity-0 pointer-events-none"></div>
            </div>
            
            <div className="absolute top-6 left-6 right-6 text-center">
              <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full">
                Slip Scanner Mode
              </span>
            </div>
          </div>
          <p className="text-slate-400 text-xs font-bold mt-6 text-center">ဘောက်စ်အတွင်းမှာ ရှိအောင် ထားပေးပါ</p>
        </div>
      )}

      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-terminal text-indigo-600 dark:text-indigo-400"></i>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-200">ကောင်တာ</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-black block leading-none mb-1">အရေအတွက်</span>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400 block leading-none">{parsedBetsInfo.length}</span>
              </div>
              <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-4">
                <span className="text-[10px] text-slate-500 uppercase font-black block leading-none mb-1">စုစုပေါင်း</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block leading-none">{totalSum.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="relative group">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={readOnly}
              placeholder="123-500\n456R1000..."
              className="w-full h-80 md:h-96 bg-transparent p-6 md:p-8 text-2xl md:text-3xl font-mono focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-800 text-slate-900 dark:text-white custom-scrollbar resize-none leading-tight"
            />
            
            {!readOnly && (
              <div className="absolute bottom-4 right-4 flex flex-col space-y-3">
                <button 
                  onClick={startVoiceCapture}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-2xl border-4 border-white dark:border-slate-900 ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                  title="အသံဖြင့်သွင်းရန်"
                >
                  <i className="fa-solid fa-microphone text-2xl"></i>
                </button>
                <button 
                  onClick={startCamera}
                  className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center transition-all shadow-2xl border-4 border-white dark:border-slate-900"
                  title="ပုံဖတ်ပြီးသွင်းရန်"
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
          className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 rounded-3xl font-black text-2xl text-white transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-3"
        >
          <i className="fa-solid fa-check-double"></i>
          <span>အတည်ပြုမည်</span>
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
          <div className="p-4 max-h-[480px] overflow-y-auto custom-scrollbar space-y-2">
            {validationGroups.length > 0 ? (
              validationGroups.map(([original, data]) => (
                <div key={original} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/50 p-4 rounded-2xl flex justify-between items-center">
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
      `}</style>
    </div>
  );
};

export default BulkEntry;
