
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { QuizSession, Question, Topic, ArenaStats } from '../types';

interface QuizViewProps {
  topic: Topic;
  session: QuizSession;
  arenaStore?: Record<number, ArenaStats>;
  onCorrect?: (topicId: number) => void;
  onComplete: (answers: Record<string, string>) => void;
  onCancel: () => void;
}

const normalizeAnswer = (val: string): string => {
  const v = val.toUpperCase().trim();
  if (v === 'TRUE' || v === 'T' || v === 'ĐÚNG' || v === '1') return 'TRUE';
  if (v === 'FALSE' || v === 'F' || v === 'SAI' || v === '0') return 'FALSE';
  return v;
};

const QuizView: React.FC<QuizViewProps> = ({ topic, session, arenaStore = {}, onCorrect, onComplete, onCancel }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(false);
  const [showShockwave, setShowShockwave] = useState(false);
  const [showSurge, setShowSurge] = useState(false);
  const [surgePos, setSurgePos] = useState({ x: 0, y: 0 });
  const [timeLeft, setTimeLeft] = useState(session.time_limit_seconds || 0);
  const [heroLevel, setHeroLevel] = useState(0);
  const [heroAnimate, setHeroAnimate] = useState<'IDLE' | 'LEVEL_UP' | 'MISS'>('IDLE');
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isArena = session.type === 'ARENA_COMBAT';
  const stars = arenaStore[topic.topic_id]?.star_level || 0;

  const liveMastery = useMemo(() => {
    return Number(topic.mastery_percent.toFixed(1));
  }, [topic.mastery_percent]);

  const currentQuestion: Question = session.questions[currentIndex] || { 
    qid: 'err', 
    topic_id: topic.topic_id.toString(),
    skill_tag: 'C1',
    type: 'MCQ', 
    difficulty: 1,
    prompt: 'Dữ liệu lỗi', 
    answer_key: '', 
    explain: '',
    choices: { A: "...", B: "...", C: "...", D: "..." }
  };

  useEffect(() => {
    if (!session.time_limit_seconds) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete(answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [session.time_limit_seconds, onComplete, answers]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    setUserAnswer("");
    setShowExplanation(false);
    setIsAuditing(false);
    setShowShockwave(false);
    setIsScanning(false);
    if (currentQuestion.type === 'FILL') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, currentQuestion.type]);

  const handleAction = useCallback((val: string, event?: React.MouseEvent | React.KeyboardEvent | React.FormEvent | MouseEvent | KeyboardEvent) => {
    if (showExplanation || isAuditing || isScanning || !val.trim()) return;
    
    setIsScanning(true);
    
    const normalizedUser = normalizeAnswer(val);
    const normalizedKey = normalizeAnswer(currentQuestion.answer_key);
    const correct = normalizedUser === normalizedKey;
    
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2 - 100;

    if (event && 'clientX' in event) {
      x = (event as MouseEvent).clientX;
      y = (event as MouseEvent).clientY - 40;
    } else if (currentQuestion.type === 'FILL' && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top - 20;
    }

    setSurgePos({ x, y });

    // Matrix Audit Scan Delay (1.2s for dramatic effect)
    setTimeout(() => {
      setIsScanning(false);
      setIsAuditing(false);
      
      if (correct) {
        setShowShockwave(true);
        setShowSurge(true);
        if (isArena) {
          setHeroLevel(prev => Math.min(10, prev + 1));
          setHeroAnimate('LEVEL_UP');
          setTimeout(() => setHeroAnimate('IDLE'), 800);
        }
        if (onCorrect) onCorrect(topic.topic_id);
        setTimeout(() => setShowSurge(false), 2000); 
      } else {
        setShake(true);
        if (isArena) {
          setHeroAnimate('MISS');
          setTimeout(() => setHeroAnimate('IDLE'), 250);
        }
        setTimeout(() => setShake(false), 600);
      }

      setAnswers(prev => ({ ...prev, [currentQuestion.qid]: val }));
      setUserAnswer(val);
      setShowExplanation(true);
    }, 1200);

  }, [currentQuestion, showExplanation, isAuditing, isScanning, onCorrect, topic.topic_id, isArena]);

  const handleNext = useCallback(() => {
    if (currentIndex < (session.questions.length - 1)) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete(answers);
    }
  }, [currentIndex, session.questions.length, answers, onComplete]);

  // Helper to parse Expert Insight
  const renderExplainParts = (explain: string) => {
    const parts = {
      core: explain.match(/\[CORE FACT\]:(.*?)(?=\[|$)/i)?.[1]?.trim() || "",
      dive: explain.match(/\[DEEP DIVE\]:(.*?)(?=\[|$)/i)?.[1]?.trim() || "",
      tip: explain.match(/\[PRO TIP\]:(.*?)(?=\[|$)/i)?.[1]?.trim() || "",
    };

    if (!parts.core && !parts.dive && !parts.tip) {
      return <p className="text-gray-300 italic">{explain}</p>;
    }

    return (
      <div className="space-y-6">
        {parts.core && (
          <div className="flex gap-4 group">
            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 group-hover:bg-primary group-hover:text-white transition-all">
              <span className="material-symbols-outlined text-sm">key</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-1">Core Fact</span>
              <p className="text-sm text-white font-medium">{parts.core}</p>
            </div>
          </div>
        )}
        {parts.dive && (
          <div className="flex gap-4 group">
            <div className="size-8 rounded-full bg-c2-indigo/20 flex items-center justify-center shrink-0 border border-c2-indigo/30 group-hover:bg-c2-indigo group-hover:text-white transition-all">
              <span className="material-symbols-outlined text-sm">psychology</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-c2-indigo tracking-widest block mb-1">Deep Dive Analysis</span>
              <p className="text-sm text-gray-300 leading-relaxed italic">{parts.dive}</p>
            </div>
          </div>
        )}
        {parts.tip && (
          <div className="flex gap-4 group">
            <div className="size-8 rounded-full bg-c4-green/20 flex items-center justify-center shrink-0 border border-c4-green/30 group-hover:bg-c4-green group-hover:text-black transition-all">
              <span className="material-symbols-outlined text-sm">lightbulb</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-c4-green tracking-widest block mb-1">Pro Tip</span>
              <p className="text-sm text-c4-green font-bold">{parts.tip}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showExplanation) {
        if (e.key === 'Enter') handleNext();
        return;
      }
      if (isAuditing || isScanning) return;

      if (currentQuestion.type === 'MCQ') {
        const key = e.key.toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(key)) handleAction(key, e);
      } else if (currentQuestion.type === 'TF') {
        const k = e.key.toLowerCase();
        if (k === '1' || k === 't' || k === 'd') handleAction('Đúng', e);
        if (k === '2' || k === 'f' || k === 's') handleAction('Sai', e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion.type, showExplanation, isAuditing, isScanning, handleAction, handleNext]);

  const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(currentQuestion.answer_key);

  return (
    <div className={`absolute inset-0 z-50 bg-[#05070a] flex flex-col font-display overflow-hidden ${shake ? 'animate-shake' : ''}`}>
      
      {/* SHENRON DRAGON BACKGROUND LAYER */}
      <div className="dragon-bg-container">
          <div className="dragon-bg-image"></div>
          <div className={`dragon-bg-overlay ${showExplanation ? 'bg-dim-active' : ''}`}></div>
      </div>

      {isScanning && <div className="matrix-scanline" style={{ ['--scan-color' as any]: topic.color }}></div>}

      {showSurge && (
        <div 
          className="fixed z-[250] pointer-events-none animate-localized-surge"
          style={{ left: surgePos.x, top: surgePos.y }}
        >
          <span className="text-8xl font-black text-c4-green italic tracking-widest drop-shadow-[0_0_50px_#00ff88]">
            +2%
          </span>
        </div>
      )}

      {showShockwave && <div className="absolute inset-0 z-10 pointer-events-none animate-shockwave"></div>}

      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-15 overflow-hidden">
          <div 
            className="size-[60vh] rounded-full animate-breathing relative flex flex-col items-center justify-center text-center p-12 border-4 border-white/20"
            style={{ 
              background: `radial-gradient(circle at center, ${topic.color}44 0%, transparent 70%)`,
              boxShadow: `0 0 100px ${topic.color}22`
            }}
          >
            <span className="material-symbols-outlined text-[20vh] text-white opacity-40 mb-4">{topic.icon}</span>
            <h4 className="text-4xl font-black text-white uppercase tracking-tighter line-clamp-2 px-8 leading-tight mb-2">
              {topic.short_label}
            </h4>
            
            <div className="flex flex-col items-center group relative">
               <span className={`text-6xl font-black text-white tabular-nums transition-all duration-300 ${showShockwave ? 'scale-125 text-c4-green drop-shadow-[0_0_20px_#00ff88]' : 'animate-pulse'}`}>
                  {liveMastery}%
               </span>
               <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] mt-2">Live Mastery Matrix</span>
            </div>
          </div>
      </div>

      <header className="px-6 py-4 border-b border-white/10 bg-black/40 flex items-center justify-between relative z-20 backdrop-blur-md">
        <button onClick={onCancel} className="text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-danger-glow transition-colors shrink-0">Thoát phòng thi</button>
        
        <div className="flex items-center gap-12">
            {isArena && (
              <div className="flex items-center gap-6">
                <div className={`relative flex flex-col items-center group transition-all duration-500 ${heroAnimate === 'LEVEL_UP' ? 'hero-levelup-spring' : ''} ${heroAnimate === 'MISS' ? 'animate-shake-mini' : ''}`}>
                   <div className="absolute inset-0 bg-c3-amber/20 blur-xl rounded-full scale-150 animate-pulse-fast"></div>
                   <div className="relative size-16 rounded-2xl border-2 border-c3-amber/40 bg-black/60 overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                      <img 
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=warrior-${heroLevel}&backgroundColor=transparent`}
                        className={`size-full object-contain transition-all duration-500 ${heroLevel > 7 ? 'saturate-200 brightness-125' : ''}`}
                        alt="Warrior Hero"
                      />
                   </div>
                   <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-c3-amber text-black text-[8px] font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_#f59e0b]">
                      LVL {heroLevel}
                   </div>
                </div>

                <div className="flex items-center gap-4 text-primary">
                  <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black uppercase tracking-tighter">Your Power</span>
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${((currentIndex + 1) / session.questions.length) * 100}%` }}></div>
                      </div>
                  </div>
                  <span className="text-xs font-black italic text-gray-600">VS</span>
                  <div className="flex flex-col items-start text-danger-glow">
                      <span className="text-[9px] font-black uppercase tracking-tighter">AI Bot</span>
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-danger-glow" style={{ width: `75%` }}></div>
                      </div>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
                <span className="text-[11px] font-black text-white tabular-nums uppercase tracking-widest">Câu {currentIndex + 1} / {session.questions.length}</span>
                <div className="w-32 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((currentIndex+1)/session.questions.length)*100}%` }}></div>
                </div>
            </div>

            {session.time_limit_seconds && (
                <div className="flex flex-col items-center">
                    <div className={`flex items-center gap-2 ${timeLeft < 60 ? 'text-danger-glow animate-pulse' : 'text-white'}`}>
                        <span className="material-symbols-outlined text-sm">timer</span>
                        <span className="text-xl font-black tabular-nums tracking-tighter">{formatTime(timeLeft)}</span>
                    </div>
                </div>
            )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
           <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-lg text-primary text-[10px] font-black uppercase tracking-tighter shrink-0">LV: {currentQuestion.skill_tag}</div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-12 no-scrollbar bg-transparent relative z-20">
        <div className="max-w-3xl mx-auto space-y-10 relative">
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold text-white leading-relaxed text-halo transition-all ${isScanning ? 'blur-sm opacity-50' : ''}`}>
              <span className="text-primary mr-3 italic font-black">#{currentIndex + 1}</span>
              {currentQuestion.prompt}
            </h2>
          </div>

          <div className={`space-y-4 transition-all ${isScanning ? 'scale-95 opacity-70 blur-[2px]' : ''}`}>
            {currentQuestion.type === 'MCQ' && (
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(currentQuestion.choices || { A: "...", B: "...", C: "...", D: "..." }).map(([key, text]) => (
                  <button
                    key={key}
                    onClick={(e) => handleAction(key, e)}
                    disabled={showExplanation || isAuditing || isScanning}
                    className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4 text-left transition-all relative overflow-hidden ${
                      showExplanation 
                        ? (key === currentQuestion.answer_key ? 'border-c4-green bg-c4-green/10 text-c4-green shadow-[0_0_25px_rgba(0,255,136,0.3)]' : (userAnswer === key ? 'border-danger-glow bg-danger-glow/10 text-danger-glow shadow-[0_0_20px_rgba(255,0,85,0.2)]' : 'border-white/5 opacity-30'))
                        : 'border-white/10 bg-white/[0.03] hover:border-primary hover:bg-white/[0.06] backdrop-blur-sm shadow-xl'
                    }`}
                  >
                    <div className={`size-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center font-black transition-colors ${showExplanation && key === currentQuestion.answer_key ? 'text-c4-green' : 'text-primary'}`}>{key}</div>
                    <span className="font-semibold text-lg">{text}</span>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'TF' && (
              <div className="grid grid-cols-2 gap-6">
                {['Đúng', 'Sai'].map(val => (
                  <button
                    key={val}
                    onClick={(e) => handleAction(val, e)}
                    disabled={showExplanation || isAuditing || isScanning}
                    className={`h-32 rounded-3xl border-4 flex flex-col items-center justify-center gap-2 transition-all backdrop-blur-sm relative overflow-hidden ${
                        showExplanation 
                          ? (normalizeAnswer(val) === normalizeAnswer(currentQuestion.answer_key) ? 'border-c4-green bg-c4-green/10 text-c4-green shadow-[0_0_25px_#00ff8844]' : (userAnswer === val ? 'border-danger-glow bg-danger-glow/10 text-danger-glow shadow-[0_0_20px_#ff005533]' : 'border-white/5 opacity-30'))
                          : 'border-white/10 bg-white/5 hover:border-primary text-gray-400 hover:text-white hover:scale-105 shadow-xl'
                    }`}
                  >
                    <span className="material-symbols-outlined text-4xl">{val === 'Đúng' ? 'check_circle' : 'cancel'}</span>
                    <span className="font-black uppercase tracking-[0.2em]">{val}</span>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'FILL' && (
              <div className="space-y-12 flex flex-col items-center animate-fade-in">
                 <div className="relative group w-full max-w-md">
                   {isScanning && (
                     <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 rounded-full backdrop-blur-md border border-white/10">
                        <div className="flex items-center gap-3">
                           <span className="material-symbols-outlined text-c1-cyan animate-spin">refresh</span>
                           <span className="text-[10px] font-black uppercase text-c1-cyan tracking-[0.3em]">Auditing Matrix...</span>
                        </div>
                     </div>
                   )}
                   <input 
                      ref={inputRef}
                      type="text" 
                      value={userAnswer}
                      onChange={(e) => !showExplanation && !isAuditing && !isScanning && setUserAnswer(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && userAnswer.trim()) handleAction(userAnswer);
                      }}
                      disabled={showExplanation || isAuditing || isScanning}
                      placeholder="Gõ đáp án & nhấn Enter..."
                      className={`w-full h-24 bg-transparent border-0 border-b-4 text-center text-4xl font-black italic tracking-[0.15em] outline-none transition-all duration-500 uppercase placeholder:opacity-20 placeholder:text-sm placeholder:italic placeholder:tracking-widest
                        ${showExplanation 
                            ? (isCorrect ? 'border-c4-green text-c4-green text-shadow-green' : 'border-danger-glow text-danger-glow text-shadow-red animate-glitch') 
                            : 'border-white/20 text-white focus:border-primary focus:shadow-[0_10px_30px_-10px_rgba(13,51,242,0.4)]'}`}
                   />
                 </div>
              </div>
            )}
          </div>

          {showExplanation && (
            <div className={`p-10 rounded-[48px] border-2 animate-slide-up bg-background-dark/95 backdrop-blur-2xl shadow-2xl relative overflow-hidden ${isCorrect ? 'border-c4-green/30' : 'border-danger-glow/30'}`}>
              <div className="flex items-center gap-5 mb-8 relative z-10">
                 <div className={`size-14 rounded-2xl flex items-center justify-center shadow-lg ${isCorrect ? 'bg-c4-green text-black' : 'bg-danger-glow text-white'}`}>
                    <span className="material-symbols-outlined text-2xl">{isCorrect ? 'verified' : 'emergency_home'}</span>
                 </div>
                 <div>
                    <h4 className={`text-sm font-black uppercase tracking-widest ${isCorrect ? 'text-c4-green' : 'text-danger-glow'}`}>
                        {isCorrect ? 'DATA AUDIT: PASSED' : 'DATA AUDIT: FAILED - RECOVERY MODE'}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter mt-0.5">Expert Insight Analysis Sequence</p>
                 </div>
              </div>
              
              <div className="bg-white/5 p-8 rounded-[32px] border border-white/5 relative z-10 shadow-inner">
                 {renderExplainParts(currentQuestion.explain)}
              </div>

              <div className="mt-10 flex justify-end relative z-10">
                <button 
                  onClick={handleNext}
                  className="px-12 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] hover:bg-primary hover:text-white transition-all shadow-xl active:scale-95"
                >
                  {currentIndex === (session.questions.length - 1) ? 'Đồng bộ kết quả' : 'Cập nhật bước tiếp'}
                </button>
              </div>
              <div className={`absolute top-0 right-0 p-4 text-[60px] font-black opacity-[0.03] select-none pointer-events-none italic ${isCorrect ? 'text-c4-green' : 'text-danger-glow'}`}>
                {isCorrect ? 'CORRECT' : 'WRONG'}
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .text-shadow-green { text-shadow: 0 0 20px rgba(0, 255, 136, 0.5); }
        .text-shadow-red { text-shadow: 0 0 20px rgba(255, 0, 85, 0.5); }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.15s ease-in-out 3; }
        
        @keyframes shake-mini {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-2px, 2px); }
          50% { transform: translate(2px, -2px); }
          75% { transform: translate(-2px, -2px); }
        }
        .animate-shake-mini { animation: shake-mini 0.25s ease-in-out; }

        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }
        .animate-glitch { animation: glitch 0.3s infinite; }
        
        @keyframes slide-up {
          from { transform: translateY(60px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes localized-surge {
          0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
          10% { opacity: 1; filter: drop-shadow(0 0 10px #00ff88); }
          50% { transform: translate(-50%, -100px) scale(1.5); opacity: 1; }
          100% { transform: translate(-50%, -240px) scale(1); opacity: 0; }
        }
        .animate-localized-surge { 
          animation: localized-surge 1.8s cubic-bezier(0.23, 1, 0.32, 1) forwards; 
          position: fixed;
          left: 50%;
        }

        @keyframes shockwave {
           0% { transform: scale(0.8); opacity: 0.8; border-radius: 50%; }
           100% { transform: scale(3.5); opacity: 0; border-radius: 50%; }
        }
        .animate-shockwave {
           animation: shockwave 1s cubic-bezier(0.23, 1, 0.32, 1) forwards;
           background: radial-gradient(circle, rgba(0, 255, 136, 0.4) 0%, transparent 70%);
        }

        @keyframes hero-levelup {
          0% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.3); filter: brightness(1.8) drop-shadow(0 0 30px #f59e0b); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        .hero-levelup-spring { animation: hero-levelup 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); }

        @keyframes pulse-fast {
          0%, 100% { transform: scale(1.5); opacity: 0.2; }
          50% { transform: scale(1.7); opacity: 0.4; }
        }
        .animate-pulse-fast { animation: pulse-fast 1s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default QuizView;
