
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { parseBulkInput, voiceToFormat } from '../utils/parser';
import { extractBetsFromImage, ExtractedBet } from '../services/geminiService';

interface BulkEntryProps {
  onNewBets: (bets: { number: string; amount: number }[]) => Promise<boolean> | void;
  readOnly?: boolean;
  variant?: 'entry' | 'reduction';
  currentTotals?: Record<string, number>;
}

const BulkEntry: React.FC<BulkEntryProps> = ({ onNewBets, readOnly = false, variant = 'entry', currentTotals }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [scanToast, setScanToast] = useState<{ count: number; time: number } | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [clearingLineIndex, setClearingLineIndex] = useState(-1);
  const [clearingItems, setClearingItems] = useState<[string, { count: number; amount: number; isPerm: boolean; baseNum: string; isCompound: boolean }][]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clearingListRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const isReduction = variant === 'reduction';
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

  // Handle Success Message timeout
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const parsedBetsInfo = useMemo(() => {
    return parseBulkInput(text).filter(bet => bet.amount > 0);
  }, [text]);

  // Enhanced grouping logic to handle compound notations properly
  const validationGroups = useMemo(() => {
    const groups: Record<string, { count: number; amount: number; isPerm: boolean; baseNum: string; isCompound: boolean }> = {};

    parsedBetsInfo.forEach(bet => {
      if (!groups[bet.original]) {
        // Detect if it's a compound notation (contains both 'R' and a separator like '-')
        const isCompound = /[Rr]/.test(bet.original) && /[-=@*\.\/]\d+/.test(bet.original);
        // Extract the base number from the original string
        const baseMatch = bet.original.match(/^(\d{3})/);
        const baseNum = baseMatch ? baseMatch[1] : bet.number;

        groups[bet.original] = {
          count: 0,
          amount: 0,
          isPerm: bet.isPermutation,
          baseNum: baseNum,
          isCompound: isCompound
        };
      }
      groups[bet.original].count++;
      groups[bet.original].amount += bet.amount; // Sum the amounts
    });
    return Object.entries(groups);
  }, [parsedBetsInfo]);

  const totalSum = useMemo(() => {
    return parsedBetsInfo.reduce((acc, curr) => acc + curr.amount, 0);
  }, [parsedBetsInfo]);

  const handleProcessClick = () => {
    if (readOnly || parsedBetsInfo.length === 0 || isProcessing) return;

    if (isReduction && currentTotals) {
      // Aggregate reduction amounts by number first
      const reductionAmounts: Record<string, number> = {};
      parsedBetsInfo.forEach(bet => {
        reductionAmounts[bet.number] = (reductionAmounts[bet.number] || 0) + bet.amount;
      });

      const invalidNumbers = [];
      for (const [num, amount] of Object.entries(reductionAmounts)) {
        const currentAmount = currentTotals[num] || 0;
        if (amount > currentAmount) {
          invalidNumbers.push(`${num} (Try: ${amount}, Max: ${currentAmount})`);
        }
      }

      if (invalidNumbers.length > 0) {
        alert(`Cannot reduce more than available amount for:\n${invalidNumbers.join('\n')}`);
        return;
      }
    }

    setShowConfirmModal(true);
  };

  const handleConfirmProcess = async () => {
    if (parsedBetsInfo.length > 0) {
      setIsProcessing(true);
      try {
        const success = await onNewBets(parsedBetsInfo.map(b => ({ number: b.number, amount: b.amount })));
        if (success !== false) {
          setShowConfirmModal(false);

          // Store snapshot of current items for animation
          const itemsSnapshot = [...validationGroups];
          setClearingItems(itemsSnapshot);
          setText(''); // Clear text immediately
          setIsClearing(true);
          setClearingLineIndex(0); // Start with first item
          if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);

          // Scroll to the clearing list on mobile for better UX
          setTimeout(() => {
            if (clearingListRef.current && window.innerWidth < 1024) {
              clearingListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);

          // Animate line-by-line removal
          const totalItems = itemsSnapshot.length;
          const delayBetweenItems = Math.max(300, Math.min(450, 2500 / Math.max(totalItems, 1)));

          for (let i = 1; i <= totalItems; i++) {
            setTimeout(() => {
              setClearingLineIndex(i);
            }, i * delayBetweenItems);
          }

          // After all lines animated, show success
          setTimeout(() => {
            setIsClearing(false);
            setClearingLineIndex(-1);
            setClearingItems([]);
            setShowSuccess(true);
          }, totalItems * delayBetweenItems + 300);
        }
      } catch (err) {
        console.error("Processing failed:", err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const startCamera = async () => {
    setIsVideoReady(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
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
        if (video.videoWidth === 0) throw new Error("Video not ready.");

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
          if ('vibrate' in navigator) navigator.vibrate(50);
        } else {
          alert("ဂဏန်းများ သေချာမမြင်ရပါ။");
        }
      }
    } catch (error) {
      console.error("Scanning error:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const startVoiceCapture = () => {
    if (readOnly) return;
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition not supported.");
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

      {/* Success Message Overlay - Perfectly Centered at Top */}
      {showSuccess && (
        <div className="fixed top-10 inset-x-0 z-[200] flex justify-center px-4 pointer-events-none animate-toast-in">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-white/20 max-w-md w-full sm:w-auto pointer-events-auto">
            <i className="fa-solid fa-circle-check text-xl shrink-0"></i>
            <span className="font-black uppercase tracking-tight text-sm md:text-base text-center">Successfully Processed!</span>
          </div>
        </div>
      )}

      {showCamera && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-0 md:p-4 touch-none" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
          <div className="relative w-full h-full md:max-w-2xl md:aspect-[3/4] md:rounded-3xl overflow-hidden border-0 md:border-4 border-slate-800 bg-slate-900 shadow-2xl" style={{ maxHeight: '80dvh', marginTop: '-300px' }}>
            <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`} />

            <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center pointer-events-none" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
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
                  <span className="textxl font-black uppercase tracking-tight">+{scanToast.count} {isReduction ? 'Reduced' : 'Scanned'}</span>
                </div>
              </div>
            )}

            {!isVideoReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900">
                <i className="fa-solid fa-circle-notch animate-spin text-4xl mb-4"></i>
                <p className="text-[10px] font-black uppercase tracking-widest">Warming Up Camera...</p>
              </div>
            )}

            <div className={`absolute inset-0 border-[20px] md:border-[40px] border-black/50 pointer-events-none flex items-center justify-center transition-opacity ${isVideoReady ? 'opacity-100' : 'opacity-0'}`} style={{ borderTopWidth: 'max(20px, calc(env(safe-area-inset-top) + 20px))', borderBottomWidth: 'max(20px, calc(env(safe-area-inset-bottom) + 20px))' }}>
              <div className="w-full max-w-md aspect-[4/3] border-2 border-white/30 rounded-xl relative">
                <div className={`absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-${accentColorClass}-500 rounded-tl-xl`}></div>
                <div className={`absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-${accentColorClass}-500 rounded-tr-xl`}></div>
                <div className={`absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-${accentColorClass}-500 rounded-bl-xl`}></div>
                <div className={`absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-${accentColorClass}-500 rounded-br-xl`}></div>
                {isScanning && <div className={`absolute inset-0 bg-${accentColorClass}-500/10 animate-pulse`}></div>}
                <div className={`absolute inset-x-0 h-1 bg-${accentColorClass}-500/60 shadow-[0_0_20px_rgba(${isReduction ? '225,29,72' : '99,102,241'},1)] ${isScanning ? 'animate-scan-line' : 'top-1/2 opacity-20'}`}></div>
              </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 flex justify-center items-end pb-8 md:pb-10 px-4" style={{ paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))' }}>
              <button onClick={stopCamera} className="group flex flex-col items-center touch-manipulation" style={{ WebkitTapHighlightColor: 'transparent' }}>
                <div className="w-20 h-20 md:w-16 md:h-16 rounded-full bg-slate-900/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 group-active:scale-90 transition-all">
                  <i className="fa-solid fa-check text-2xl md:text-xl"></i>
                </div>
                <span className="text-[9px] md:text-[10px] font-black text-white uppercase mt-2 opacity-60">Finish</span>
              </button>
              <button onClick={captureAndScan} disabled={isScanning || !isVideoReady} className="relative group active:scale-95 transition-all mx-8 md:mx-12 touch-manipulation" style={{ WebkitTapHighlightColor: 'transparent' }}>
                <div className="w-28 h-28 md:w-24 md:h-24 rounded-full bg-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                  <div className={`w-24 h-24 md:w-20 md:h-20 rounded-full border-8 border-slate-900 flex items-center justify-center ${isScanning ? 'animate-pulse' : ''}`}>
                    {isScanning ? <i className={`fa-solid fa-cloud-arrow-up text-${accentColorClass}-600 text-3xl md:text-2xl`}></i> : <div className={`w-16 h-16 md:w-14 md:h-14 rounded-full bg-${accentColorClass}-600`}></div>}
                  </div>
                </div>
              </button>
              <div className="w-20 h-20 md:w-16 md:h-16 opacity-0 pointer-events-none"></div>
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
                {isReduction ? 'အကွက်များပြန်နှုတ်ရန်' : 'အကွက်များတင်ရန်'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-black block leading-none mb-1">အရေအတွက်</span>
                <span className={`text-base font-black text-${accentColorClass}-600 dark:text-${accentColorClass}-400 block leading-none`}>{parsedBetsInfo.length}</span>
              </div>
              <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-4">
                <span className="text-[10px] text-slate-500 uppercase font-black block leading-none mb-1">စုစုပေါင်း</span>
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
              disabled={readOnly || isProcessing || isClearing}
              placeholder={isReduction ? "Subtract syntax:&#10;123 500&#10;123R 1000&#10;777@200" : "Examples:&#10;123.10000R5000 (35,000 Total)&#10;123/10000R5000&#10;123R1000-10000&#10;123 R 1000&#10;123@500&#10;123.200"}
              className={`w-full h-80 md:h-96 bg-transparent p-6 md:p-8 text-2xl md:text-3xl font-mono focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-800 text-slate-900 dark:text-white custom-scrollbar resize-none leading-tight ${isReduction ? 'text-rose-600 dark:text-rose-400' : ''}`}
            />

            {!readOnly && (
              <div className="absolute bottom-4 right-4 flex flex-col space-y-3">

                <button onClick={startCamera} disabled={isProcessing} className={`w-16 h-16 rounded-2xl bg-${accentColorClass}-600 text-white flex items-center justify-center transition-all shadow-2xl border-4 border-white dark:border-slate-900 hover:scale-105 active:scale-95 disabled:opacity-50`} title="Open Rapid Scanner">
                  <i className="fa-solid fa-camera text-2xl"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleProcessClick}
          disabled={!text.trim() || readOnly || parsedBetsInfo.length === 0 || isProcessing}
          className={`w-full py-6 bg-${accentColorClass}-600 hover:bg-${accentColorClass}-500 disabled:opacity-30 rounded-3xl font-black text-2xl text-white transition-all shadow-xl shadow-${accentColorClass}-600/30 flex items-center justify-center space-x-3`}
        >
          {isProcessing ? (
            <i className="fa-solid fa-circle-notch animate-spin"></i>
          ) : (
            <i className={`fa-solid ${isReduction ? 'fa-minus-square' : 'fa-check-double'}`}></i>
          )}
          <span>{isReduction ? 'နှုတ်မည်' : 'တင်မည်'}</span>
        </button>
      </div>

      <div className="space-y-6" ref={clearingListRef}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          <div className={`${isReduction ? 'bg-rose-50 dark:bg-rose-900/10' : 'bg-slate-50 dark:bg-slate-800/30'} px-5 py-4 border-b border-slate-200 dark:border-slate-800`}>
            <h3 className={`text-[10px] font-black uppercase tracking-widest text-${accentColorClass}-600 dark:text-${accentColorClass}-400 flex items-center space-x-2`}>
              <i className={`fa-solid ${isReduction ? 'fa-filter-circle-xmark' : 'fa-list-check'}`}></i>
              <span>စစ်ပြီးအကွက်များ</span>
            </h3>
          </div>
          <div className="p-4 max-h-[480px] overflow-y-auto custom-scrollbar space-y-2 relative">
            {/* Loading overlay during clearing */}
            {isClearing && (
              <div className="absolute top-2 right-2 z-10">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full shadow-lg border border-slate-200 dark:border-slate-700">
                  <i className="fa-solid fa-circle-notch animate-spin text-indigo-500 text-sm"></i>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Clearing...</span>
                </div>
              </div>
            )}

            {/* Show clearing animation items */}
            {isClearing && clearingItems.length > 0 ? (
              clearingItems.map(([original, data], index) => {
                const isRemoved = index < clearingLineIndex;
                const isRemoving = index === clearingLineIndex;

                if (isRemoved) return null;

                return (
                  <div
                    key={original}
                    className={`bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/50 p-4 rounded-2xl flex justify-between items-center cursor-default ${data.isCompound ? 'border-l-4 border-l-amber-500' : ''} ${isRemoving ? 'animate-line-remove' : ''}`}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className={`w-10 h-10 shrink-0 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 font-mono font-black text-${accentColorClass}-600`}>
                        {data.baseNum}
                      </div>
                      <div className="truncate">
                        <span className="font-mono text-slate-900 dark:text-white font-black text-lg truncate">{original}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`${isReduction ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'} font-mono font-black text-sm`}>
                        {isReduction ? '-' : ''}{data.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : validationGroups.length > 0 ? (
              validationGroups.map(([original, data], index) => (
                <div
                  key={original}
                  className={`bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/50 p-4 rounded-2xl flex justify-between items-center transition-all duration-200 cursor-default ${data.isCompound ? 'border-l-4 border-l-amber-500' : ''} animate-slide-up hover:scale-[1.02] hover:shadow-md`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className={`w-10 h-10 shrink-0 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 font-mono font-black text-${accentColorClass}-600`}>
                      {data.baseNum}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-900 dark:text-white font-black text-lg truncate">{original}</span>
                        {data.isCompound && (
                          <span className="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Compound</span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-500 uppercase font-black">
                        {data.isCompound
                          ? `1 Direct + ${data.count - 1} Perms`
                          : (data.isPerm ? `${data.count} items (R)` : 'Direct')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`${isReduction ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'} font-mono font-black text-sm`}>
                      {isReduction ? '-' : ''}{data.amount.toLocaleString()}
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

        {/* Notation Guide */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-book text-amber-600"></i>
            Notation Guide
          </h4>
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-2">
              <span className="font-mono text-amber-600 font-bold min-w-[120px]">123-1000</span>
              <span>= 123 တစ်လုံးထိုး 1000</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-amber-600 font-bold min-w-[120px]">123R1000</span>
              <span>= 123 အစုံ 1000 စီ (6 ခု x 1000)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-amber-600 font-bold min-w-[120px]">123@1000</span>
              <span>= 123 အစုံ 1000 စီ (R နှင့်အတူ)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-amber-600 font-bold min-w-[120px]">123R1000-2000</span>
              <span>= 123 ကို 2000, ကျန် 1000 စီ</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-amber-600 font-bold min-w-[120px]">123.5000R1000</span>
              <span>= 123 ကို 5000, ကျန် 1000 စီ</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Accepted separators: - = @ * . , /</p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal - Flex Centered perfectly */}
      {showConfirmModal && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in-backdrop" style={{ height: '100vh', height: '100dvh' }}>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 w-[95%] sm:max-w-sm text-center shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden animate-modal-in">
            {/* Decorative background element */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-${accentColorClass}-600`}></div>

            <div className={`w-16 h-16 md:w-20 md:h-20 bg-${accentColorClass}-100 dark:bg-${accentColorClass}-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6`}>
              <i className={`fa-solid ${isReduction ? 'fa-minus-square' : 'fa-check-double'} text-2xl md:text-3xl text-${accentColorClass}-600`}></i>
            </div>

            <h3 className="text-xl md:text-2xl font-black mb-3 text-slate-900 dark:text-white uppercase tracking-tight">
              {isReduction ? 'နှုတ်မည်?' : 'တင်မည်?'}
            </h3>

            <div className="mb-8 space-y-3">
              <p className="text-sm md:text-base text-slate-500 font-medium px-2">
                Are you sure you want to process this batch of <b className="text-slate-900 dark:text-white">{parsedBetsInfo.length}</b> items?
              </p>
              <div className={`text-2xl md:text-3xl font-black text-${accentColorClass}-600 font-mono`}>
                {isReduction ? '-' : ''}{totalSum.toLocaleString()}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirmProcess}
                disabled={isProcessing}
                className={`py-4 md:py-4.5 bg-${accentColorClass}-600 text-white rounded-2xl font-black uppercase text-xs md:text-sm shadow-xl shadow-${accentColorClass}-600/30 hover:bg-${accentColorClass}-500 transition-all active:scale-95 flex items-center justify-center gap-3`}
              >
                {isProcessing ? (
                  <i className="fa-solid fa-circle-notch animate-spin text-lg"></i>
                ) : (
                  <i className="fa-solid fa-paper-plane text-xs"></i>
                )}
                <span>{isProcessing ? 'Processing...' : 'Yes, Confirm'}</span>
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isProcessing}
                className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black uppercase text-xs md:text-sm transition-all hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
        .animate-scan-line { position: absolute; width: 100%; height: 2px; animation: scan 3s linear infinite; }
        
        @keyframes toast-in {
          0% { transform: translateY(-20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-toast-in { animation: toast-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

        @keyframes modal-in {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-modal-in { animation: modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

        @keyframes fade-in-backdrop {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-fade-in-backdrop { animation: fade-in-backdrop 0.2s ease-out forwards; }

        @keyframes bounce-in { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } 70% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
        .animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }

        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes line-remove {
          0% { opacity: 1; transform: translateX(0) scale(1); }
          30% { opacity: 0.8; transform: translateX(20px) scale(0.98); }
          100% { opacity: 0; transform: translateX(100px) scale(0.9); }
        }
        .animate-line-remove { animation: line-remove 0.35s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default BulkEntry;
