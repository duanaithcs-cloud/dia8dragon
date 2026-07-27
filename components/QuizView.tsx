
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AdaptiveEvidenceResult, AdaptiveSessionPlan, LearningRecommendationRecord, QuizSession, Question, Topic, ArenaStats, LearningEvidenceDraft, LearningEvidenceSaveStatus, StudentConfidence } from '../types';
import { COGNITIVE_LEVELS, CognitiveBadge, CognitiveStyles, cognitiveLevelMeta, getQuestionLevel } from '../utils/cognitiveLevel';
import { cleanDisplayText } from '../utils/textQuality';
import TopicIcon from './TopicIcon';
import { classifyLearningError } from '../utils/learningDiagnostics';
import { createLearningEvidenceDraft } from '../core/learningEvidence';
import { createRepairRecommendation, findEquivalentQuestionIndex } from '../core/adaptiveLearning';
import AdaptiveRepairCard from './AdaptiveRepairCard';
import AdaptiveSessionPlanView from './AdaptiveSessionPlan';

interface QuizViewProps {
  topic: Topic;
  session: QuizSession;
  arenaStore?: Record<number, ArenaStats>;
  onCorrect?: (topicId: number) => void;
  onEvidence?: (draft: LearningEvidenceDraft) => AdaptiveEvidenceResult | void | Promise<AdaptiveEvidenceResult | void>;
  onBuildAdaptivePlan?: (sessionId: string, topicId: number) => Promise<AdaptiveSessionPlan>;
  onComplete: (answers: Record<string, string>) => void;
  onCancel: () => void;
}

const normalizeAnswer = (val: string): string => {
  const v = val.toUpperCase().trim();
  if (v === 'TRUE' || v === 'T' || v === 'ĐÚNG' || v === '1') return 'TRUE';
  if (v === 'FALSE' || v === 'F' || v === 'SAI' || v === '0') return 'FALSE';
  return v;
};

const EVIDENCE_SAVE_TIMEOUT_MS = 4000;

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => new Promise((resolve, reject) => {
  const timeoutId = globalThis.setTimeout(() => reject(new Error('Learning evidence save timed out.')), timeoutMs);
  promise.then(
    value => {
      globalThis.clearTimeout(timeoutId);
      resolve(value);
    },
    error => {
      globalThis.clearTimeout(timeoutId);
      reject(error);
    }
  );
});


const stripPrivateSourceDetails = (value: string): string => cleanDisplayText(value)
  .replace(/\s*Nguồn\s*:\s*[A-Za-z]:[\\/][\s\S]*?(?=\s*\[[A-Z ]+\]\s*:|$)/gi, ' ')
  .replace(/\s*Nguồn\s+(?:Word|Worrd)\s+cũ[^[]*(?=\s*\[[A-Z ]+\]\s*:|$)/gi, ' ')
  .replace(/\s*(?:Word|Worrd)\s+cũ\s*\/?\s*đổi\s+đuôi[^[]*(?=\s*\[[A-Z ]+\]\s*:|$)/gi, ' ')
  .replace(/[ \t]{2,}/g, ' ')
  .trim();

const getPublicSourceLabel = (source?: string): string | null => {
  const label = cleanDisplayText(source || '');
  if (!label) return null;
  if (/^[A-Za-z]:[\\/]/.test(label)) return null;
  if (/(?:Word|Worrd)\s+cũ|đổi\s+đuôi|HSSG\s*0\s*mới/i.test(label)) return null;
  return label;
};

const QuizView: React.FC<QuizViewProps> = ({ topic, session, arenaStore = {}, onCorrect, onEvidence, onBuildAdaptivePlan, onComplete, onCancel }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [orderedQuestions, setOrderedQuestions] = useState<Question[]>(() => [...session.questions]);
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
  const [showEvidence, setShowEvidence] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [confidence, setConfidence] = useState<StudentConfidence>('MEDIUM');
  const [showHint, setShowHint] = useState(false);
  const [lastEvidence, setLastEvidence] = useState<LearningEvidenceDraft | null>(null);
  const [evidenceSaveStatus, setEvidenceSaveStatus] = useState<LearningEvidenceSaveStatus>('IDLE');
  const [adaptiveRepairTask, setAdaptiveRepairTask] = useState<LearningRecommendationRecord | null>(null);
  const [adaptivePlan, setAdaptivePlan] = useState<LearningRecommendationRecord[]>([]);
  const [adaptivePlanLoading, setAdaptivePlanLoading] = useState(false);
  const [adaptiveNextMessage, setAdaptiveNextMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const questionStartedAtRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : Date.now());
  const firstAnswerRef = useRef<string | null>(null);
  const hintUsedRef = useRef(false);
  const answerLockedRef = useRef(false);
  const quizMainRef = useRef<HTMLElement>(null);
  const explanationRef = useRef<HTMLDivElement>(null);
  const pendingEvidencePromisesRef = useRef<Set<Promise<unknown>>>(new Set());

  const isArena = session.type === 'ARENA_COMBAT';
  const stars = arenaStore[topic.topic_id]?.star_level || 0;
  const modeLabel = session.practice_mode === 'visual'
    ? 'Tư liệu'
    : session.practice_mode === 'hsg'
      ? 'Vận dụng'
      : session.practice_mode === 'arena'
        ? 'Đấu'
        : 'Nhớ';


  useEffect(() => {
    setOrderedQuestions([...session.questions]);
    setCurrentIndex(0);
    setAdaptivePlan([]);
  }, [session.session_id, session.questions]);

  const liveMastery = useMemo(() => {
    return Number(topic.mastery_percent.toFixed(1));
  }, [topic.mastery_percent]);

  const currentQuestion: Question = orderedQuestions[currentIndex] || { 
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

  const publicSourceLabel = useMemo(
    () => getPublicSourceLabel(currentQuestion.source_file),
    [currentQuestion.source_file]
  );
  const visibleSourceLabel = isArena ? null : publicSourceLabel;

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
    setShowEvidence(false);
    setConfidence('MEDIUM');
    setShowHint(false);
    setLastEvidence(null);
    setEvidenceSaveStatus('IDLE');
    setAdaptiveRepairTask(null);
    setAdaptiveNextMessage('');
    questionStartedAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    firstAnswerRef.current = null;
    hintUsedRef.current = false;
    answerLockedRef.current = false;
    if (currentQuestion.type === 'FILL') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, currentQuestion.type]);

  const handleAction = useCallback((val: string, event?: React.MouseEvent | React.KeyboardEvent | React.FormEvent | MouseEvent | KeyboardEvent) => {
    if (showExplanation || isAuditing || isScanning || answerLockedRef.current || !val.trim()) return;
    answerLockedRef.current = true;
    setIsScanning(true);

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const responseTimeMs = Math.max(0, now - questionStartedAtRef.current);
    if (!firstAnswerRef.current) firstAnswerRef.current = val;
    const evidenceDraft = createLearningEvidenceDraft({
      session,
      question: currentQuestion,
      answer: val,
      firstAnswer: firstAnswerRef.current,
      responseTimeMs,
      confidence,
      hintUsed: hintUsedRef.current,
    });
    setLastEvidence(evidenceDraft);
    setEvidenceSaveStatus('SAVING');

    // Local-first UI: render the repair card immediately from the evidence draft.
    // IndexedDB persistence enriches/replaces it later, but a storage failure must
    // never hide the learning intervention from the student.
    const repairPreview = currentQuestion.status === 'QUARANTINED'
      ? undefined
      : createRepairRecommendation('local-preview', evidenceDraft, new Date().toISOString());
    setAdaptiveRepairTask(repairPreview || null);

    let evidencePromise: Promise<AdaptiveEvidenceResult | void>;
    evidencePromise = withTimeout(Promise.resolve(onEvidence?.(evidenceDraft)), EVIDENCE_SAVE_TIMEOUT_MS)
      .then(result => {
        setEvidenceSaveStatus('SAVED');
        if (!result) return;
        if (result.repairCard) setAdaptiveRepairTask(result.repairCard);
        if (result.equivalentQuestionSuggested) {
          const equivalentIndex = findEquivalentQuestionIndex(
            orderedQuestions,
            currentIndex,
            currentQuestion,
            evidenceDraft,
            answers
          );
          if (equivalentIndex > currentIndex + 1) {
            setOrderedQuestions(previous => {
              const next = [...previous];
              const [equivalent] = next.splice(equivalentIndex, 1);
              next.splice(currentIndex + 1, 0, equivalent);
              return next;
            });
            setAdaptiveNextMessage('Câu tiếp theo đã được điều chỉnh để kiểm chứng đúng kỹ năng vừa sai.');
          }
        }
      })
      .catch(error => {
        console.warn('Learning evidence could not be stored:', error);
        setEvidenceSaveStatus('ERROR');
      })
      .finally(() => pendingEvidencePromisesRef.current.delete(evidencePromise));
    pendingEvidencePromisesRef.current.add(evidencePromise);
    
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

    // Delay ngắn để học sinh thấy trạng thái kiểm tra
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
        if (onCorrect && currentQuestion.status !== 'QUARANTINED') onCorrect(topic.topic_id);
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

  }, [answers, confidence, currentIndex, currentQuestion, isArena, isAuditing, isScanning, onCorrect, onEvidence, orderedQuestions, session, showExplanation, topic.topic_id]);

  const handleNext = useCallback(() => {
    if (evidenceSaveStatus === 'SAVING') return;
    if (currentIndex < (orderedQuestions.length - 1)) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowSummary(true);
    }
  }, [currentIndex, evidenceSaveStatus, orderedQuestions.length]);

  // Tách ý giải thích
  const renderExplainParts = (explain: string) => {
    const safeExplain = stripPrivateSourceDetails(explain);
    const parts = {
      core: safeExplain.match(/\[CORE FACT\]:(.*?)(?=\[|$)/i)?.[1]?.trim() || "",
      dive: safeExplain.match(/\[DEEP DIVE\]:(.*?)(?=\[|$)/i)?.[1]?.trim() || "",
      tip: safeExplain.match(/\[PRO TIP\]:(.*?)(?=\[|$)/i)?.[1]?.trim() || "",
    };

    if (!parts.core && !parts.dive && !parts.tip) {
      return <p className="quiz-explain-fallback dia8-readable text-gray-300 italic">{safeExplain}</p>;
    }

    return (
      <div className="space-y-6">
        {parts.core && (
          <div className="flex gap-4 group">
            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 group-hover:bg-primary group-hover:text-white transition-all">
              <span className="material-symbols-outlined text-sm">key</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-1">Cốt lõi</span>
              <p className="quiz-explain-core dia8-readable text-sm text-white font-medium">{parts.core}</p>
            </div>
          </div>
        )}
        {parts.dive && (
          <div className="flex gap-4 group">
            <div className="size-8 rounded-full bg-c2-indigo/20 flex items-center justify-center shrink-0 border border-c2-indigo/30 group-hover:bg-c2-indigo group-hover:text-white transition-all">
              <span className="material-symbols-outlined text-sm">psychology</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-c2-indigo tracking-widest block mb-1">Phân tích</span>
              <p className="quiz-explain-dive dia8-readable text-sm text-gray-300 leading-relaxed italic">{parts.dive}</p>
            </div>
          </div>
        )}
        {parts.tip && (
          <div className="flex gap-4 group">
            <div className="size-8 rounded-full bg-c4-green/20 flex items-center justify-center shrink-0 border border-c4-green/30 group-hover:bg-c4-green group-hover:text-black transition-all">
              <span className="material-symbols-outlined text-sm">lightbulb</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-c4-green tracking-widest block mb-1">Mẹo</span>
              <p className="quiz-explain-tip dia8-readable text-sm text-c4-green font-bold">{parts.tip}</p>
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
  const currentLevel = getQuestionLevel(currentQuestion);
  const levelStats = useMemo(() => {
    return COGNITIVE_LEVELS.map(level => {
      const questions = orderedQuestions.filter(question => getQuestionLevel(question) === level);
      const correct = questions.filter(question => normalizeAnswer(answers[question.qid] || "") === normalizeAnswer(question.answer_key)).length;
      const total = questions.length;
      return {
        level,
        correct,
        total,
        pct: total ? Math.round((correct / total) * 100) : 0
      };
    });
  }, [answers, orderedQuestions]);
  const currentErrorTag = useMemo(() => classifyLearningError(currentQuestion), [currentQuestion]);
  const totalCorrect = levelStats.reduce((sum, item) => sum + item.correct, 0);
  const totalQuestions = orderedQuestions.length;
  const nextLabel = evidenceSaveStatus === 'SAVING'
    ? 'Đang lưu bằng chứng...'
    : currentIndex === (orderedQuestions.length - 1) ? 'Lưu kết quả' : 'Câu tiếp theo';
  const confidenceLabels: Record<StudentConfidence, string> = { LOW: 'Chưa chắc', MEDIUM: 'Khá chắc', HIGH: 'Rất chắc' };
  const timingLabels = { FAST: 'Rất nhanh', EXPECTED: 'Hợp lý', SLOW: 'Kéo dài' } as const;
  const saveStatusLabel = evidenceSaveStatus === 'SAVED'
    ? 'Đã lưu cục bộ'
    : evidenceSaveStatus === 'SAVING'
      ? 'Đang lưu cục bộ'
      : evidenceSaveStatus === 'ERROR'
        ? 'Chưa lưu được'
        : 'Chưa ghi nhận';

  useEffect(() => {
    if (!showExplanation) return;

    const frame = window.requestAnimationFrame(() => {
      explanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [showExplanation, currentIndex]);

  // Mobile browsers and installed PWAs can reserve a visual area below the
  // layout viewport (browser chrome, keyboard or gesture navigation). Keep the
  // next-question action above that area instead of letting it be clipped.
  useEffect(() => {
    if (!showExplanation || typeof window === 'undefined') return;

    const updateVisualViewportInset = () => {
      const viewport = window.visualViewport;
      const coveredBottom = viewport
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0;
      document.documentElement.style.setProperty('--quiz-visual-bottom', `${Math.round(coveredBottom)}px`);
    };

    updateVisualViewportInset();
    window.addEventListener('resize', updateVisualViewportInset);
    window.visualViewport?.addEventListener('resize', updateVisualViewportInset);
    window.visualViewport?.addEventListener('scroll', updateVisualViewportInset);

    return () => {
      window.removeEventListener('resize', updateVisualViewportInset);
      window.visualViewport?.removeEventListener('resize', updateVisualViewportInset);
      window.visualViewport?.removeEventListener('scroll', updateVisualViewportInset);
      document.documentElement.style.removeProperty('--quiz-visual-bottom');
    };
  }, [showExplanation]);

  useEffect(() => {
    if (!showSummary || !onBuildAdaptivePlan || !session.session_id) return;
    let cancelled = false;
    setAdaptivePlanLoading(true);
    const loadPlan = async () => {
      await Promise.allSettled([...pendingEvidencePromisesRef.current]);
      const plan = await onBuildAdaptivePlan(session.session_id as string, topic.topic_id);
      if (!cancelled) setAdaptivePlan(plan.tasks.slice(0, 3));
    };
    void loadPlan()
      .catch(error => console.warn('Không thể tạo lộ trình thích ứng:', error))
      .finally(() => { if (!cancelled) setAdaptivePlanLoading(false); });
    return () => { cancelled = true; };
  }, [onBuildAdaptivePlan, session.session_id, showSummary, topic.topic_id]);

  if (showSummary) {
    return (
      <div className="quiz-view quiz-summary-view absolute inset-0 z-50 bg-[#05070a] flex flex-col font-display overflow-hidden">
        <div className="dragon-bg-container">
          <div className="dragon-bg-image"></div>
          <div className="dragon-bg-overlay bg-dim-active"></div>
        </div>
        <main className="quiz-summary-main relative z-20 flex-1 overflow-y-auto p-6 md:p-10 no-scrollbar flex items-center justify-center">
          <section className="w-full max-w-4xl rounded-[36px] border border-white/10 bg-background-dark/95 backdrop-blur-2xl p-6 md:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-c4-green">Thống kê quiz</p>
                <h2 className="mt-2 text-2xl md:text-4xl font-black uppercase text-white tracking-tight">{topic.keyword_label}</h2>
              </div>
              <div className="rounded-3xl border border-primary/30 bg-primary/10 px-6 py-4 text-right shadow-[0_0_32px_rgba(13,51,242,0.22)]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Tổng</p>
                <p className="text-4xl font-black tabular-nums text-white">{totalCorrect}/{totalQuestions}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {levelStats.map(item => {
                const meta = cognitiveLevelMeta[item.level];
                return (
                  <div key={item.level} className={`rounded-3xl border ${meta.border} ${meta.bg} ${meta.shadow} p-5 overflow-hidden relative`}>
                    <div className="flex items-center justify-between gap-3">
                      <CognitiveBadge level={item.level} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${meta.tone}`}>{meta.hint}</span>
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <p className="text-3xl font-black text-white tabular-nums">{item.correct}/{item.total}</p>
                      <p className={`text-xl font-black tabular-nums ${meta.tone}`}>{item.pct}%</p>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-black/30 overflow-hidden">
                      <div className={`h-full rounded-full ${item.level === 'NB' ? 'bg-c4-green' : item.level === 'TH' ? 'bg-c1-cyan' : item.level === 'VD' ? 'bg-c3-amber' : 'bg-danger-glow'}`} style={{ width: `${item.pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <AdaptiveSessionPlanView tasks={adaptivePlan} loading={adaptivePlanLoading} />

            <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={onCancel} className="h-14 px-6 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.22em]">
                Về CĐ
              </button>
              <button onClick={() => onComplete(answers)} className="h-14 px-8 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.22em] shadow-[0_18px_42px_rgba(13,51,242,0.35)]">
                Lưu kết quả
              </button>
            </div>
          </section>
        </main>
        <CognitiveStyles />
      </div>
    );
  }

  return (
    <div className={`quiz-view absolute inset-0 z-50 bg-[#05070a] flex flex-col font-display overflow-hidden ${shake ? 'animate-shake' : ''}`}>
      
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
            <TopicIcon name={topic.icon} topicId={topic.topic_id} size="20vh" title={topic.keyword_label} className="text-white opacity-40 mb-4" />
            <h4 className="text-4xl font-black text-white uppercase tracking-tighter line-clamp-2 px-8 leading-tight mb-2">
              {topic.short_label}
            </h4>
            
            <div className="flex flex-col items-center group relative">
               <span className={`text-6xl font-black text-white tabular-nums transition-all duration-300 ${showShockwave ? 'scale-125 text-c4-green drop-shadow-[0_0_20px_#00ff88]' : 'animate-pulse'}`}>
                  {liveMastery}%
               </span>
               <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] mt-2">Nắm vững</span>
            </div>
          </div>
      </div>

      <header className="quiz-header px-6 py-4 border-b border-white/10 bg-black/40 flex items-center justify-between relative z-20 backdrop-blur-md">
        <button onClick={onCancel} className="text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-danger-glow transition-colors shrink-0">Thoát</button>
        
        <div className="quiz-header-center flex items-center gap-12">
            {isArena && (
              <div className="quiz-arena flex items-center gap-6">
                <div className={`relative flex flex-col items-center group transition-all duration-500 ${heroAnimate === 'LEVEL_UP' ? 'hero-levelup-spring' : ''} ${heroAnimate === 'MISS' ? 'animate-shake-mini' : ''}`}>
                   <div className="absolute inset-0 bg-c3-amber/20 blur-xl rounded-full scale-150 animate-pulse-fast"></div>
                   <div className="relative size-16 rounded-2xl border-2 border-c3-amber/40 bg-black/60 overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                      <img 
                        src="/assets/lucario.png"
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
                      <span className="text-[9px] font-black uppercase tracking-tighter">Bạn</span>
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${((currentIndex + 1) / orderedQuestions.length) * 100}%` }}></div>
                      </div>
                  </div>
                  <span className="text-xs font-black italic text-gray-600">VS</span>
                  <div className="flex flex-col items-start text-danger-glow">
                      <span className="text-[9px] font-black uppercase tracking-tighter">AI</span>
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-danger-glow" style={{ width: `75%` }}></div>
                      </div>
                  </div>
                </div>
              </div>
            )}

            <div className="quiz-progress text-center">
                <span className="text-[11px] font-black text-white tabular-nums uppercase tracking-widest">Câu {currentIndex + 1} / {orderedQuestions.length}</span>
                <div className="w-32 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((currentIndex+1)/orderedQuestions.length)*100}%` }}></div>
                </div>
            </div>

            {session.time_limit_seconds && (
                <div className="quiz-timer flex flex-col items-center">
                    <div className={`flex items-center gap-2 ${timeLeft < 60 ? 'text-danger-glow animate-pulse' : 'text-white'}`}>
                        <span className="material-symbols-outlined text-sm">timer</span>
                        <span className="text-xl font-black tabular-nums tracking-tighter">{formatTime(timeLeft)}</span>
                    </div>
                </div>
            )}
        </div>

        <div className="quiz-header-meta flex items-center gap-3 shrink-0">
           <CognitiveBadge level={currentLevel} compact />
           <div className="quiz-mode-label px-3 py-1 bg-c4-green/10 border border-c4-green/20 rounded-lg text-c4-green text-[10px] font-black uppercase tracking-tighter shrink-0">{modeLabel}</div>
        </div>
      </header>

      <main ref={quizMainRef} className={`quiz-main flex-1 overflow-y-auto p-6 md:p-12 no-scrollbar bg-transparent relative z-20 ${showExplanation ? 'has-next-action' : ''}`}>
        <div className="quiz-content w-full max-w-6xl mx-auto space-y-10 relative">
          <div className="quiz-question-card space-y-6">
            <h2 className={`quiz-question dia8-readable text-2xl font-bold text-white leading-relaxed text-halo transition-all ${isScanning ? 'blur-sm opacity-50' : ''}`}>
              <span className="inline-flex items-center gap-3 mr-3 align-middle">
                <span className="text-primary italic font-black">#{currentIndex + 1}</span>
                <CognitiveBadge level={currentLevel} compact />
              </span>
              {cleanDisplayText(currentQuestion.prompt)}
            </h2>
          </div>

          {!showExplanation && (
            <section className="learning-evidence-controls" aria-label="Thiết lập bằng chứng học tập">
              <div className="learning-confidence-control">
                <span>Mức tự tin</span>
                <div role="group" aria-label="Chọn mức tự tin trước khi trả lời">
                  {(['LOW', 'MEDIUM', 'HIGH'] as StudentConfidence[]).map(level => (
                    <button
                      type="button"
                      key={level}
                      onClick={() => setConfidence(level)}
                      aria-pressed={confidence === level}
                      className={confidence === level ? 'is-active' : ''}
                    >
                      {confidenceLabels[level]}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className={`learning-hint-button ${showHint ? 'is-active' : ''}`}
                onClick={() => {
                  hintUsedRef.current = true;
                  setShowHint(prev => !prev);
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">lightbulb</span>
                Gợi ý cách làm
              </button>
              {showHint && (
                <p className="learning-strategy-hint" role="status">
                  Xác định từ khóa hỏi, phạm vi không gian và kỹ năng {currentQuestion.skill_tag}; loại phương án không có căn cứ trước khi chọn.
                </p>
              )}
            </section>
          )}

          <div className={`quiz-answer-area space-y-4 transition-all ${isScanning ? 'scale-95 opacity-70 blur-[2px]' : ''}`}>
            {currentQuestion.type === 'MCQ' && (
              <div className="quiz-answer-list grid grid-cols-1 gap-3">
                {Object.entries(currentQuestion.choices || { A: "...", B: "...", C: "...", D: "..." }).map(([key, text]) => (
                  <button
                    key={key}
                    onClick={(e) => handleAction(key, e)}
                    disabled={showExplanation || isAuditing || isScanning}
                    className={`quiz-answer-option w-full p-5 rounded-2xl border-2 flex items-center gap-4 text-left transition-all relative overflow-hidden ${
                      showExplanation 
                        ? (key === currentQuestion.answer_key ? 'border-c4-green bg-c4-green/10 text-c4-green shadow-[0_0_25px_rgba(0,255,136,0.3)]' : (userAnswer === key ? 'border-danger-glow bg-danger-glow/10 text-danger-glow shadow-[0_0_20px_rgba(255,0,85,0.2)]' : 'border-white/5 opacity-30'))
                        : 'border-white/10 bg-white/[0.03] hover:border-primary hover:bg-white/[0.06] backdrop-blur-sm shadow-xl'
                    }`}
                  >
                    <div className={`quiz-choice-key size-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center font-black transition-colors ${showExplanation && key === currentQuestion.answer_key ? 'text-c4-green' : 'text-primary'}`}>{key}</div>
                    <span className="quiz-choice-text dia8-readable font-semibold text-lg">{cleanDisplayText(text)}</span>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'TF' && (
              <div className="quiz-tf-grid grid grid-cols-2 gap-6">
                {['Đúng', 'Sai'].map(val => (
                  <button
                    key={val}
                    onClick={(e) => handleAction(val, e)}
                    disabled={showExplanation || isAuditing || isScanning}
                    className={`quiz-tf-option h-32 rounded-3xl border-4 flex flex-col items-center justify-center gap-2 transition-all backdrop-blur-sm relative overflow-hidden ${
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
                           <span className="text-[10px] font-black uppercase text-c1-cyan tracking-[0.3em]">Đang kiểm tra...</span>
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
                      placeholder="Nhập đáp án..."
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
            <div ref={explanationRef} className={`quiz-explanation dia8-text-box p-10 rounded-[48px] border-2 animate-slide-up bg-background-dark/95 backdrop-blur-2xl shadow-2xl relative overflow-hidden ${isCorrect ? 'border-c4-green/30' : 'border-danger-glow/30'}`}>
              <div className="quiz-explanation-heading flex items-center gap-5 mb-8 relative z-10">
                 <div className={`size-14 rounded-2xl flex items-center justify-center shadow-lg ${isCorrect ? 'bg-c4-green text-black' : 'bg-danger-glow text-white'}`}>
                    <span className="material-symbols-outlined text-2xl">{isCorrect ? 'verified' : 'emergency_home'}</span>
                 </div>
                 <div>
                    <h4 className={`text-sm font-black uppercase tracking-widest ${isCorrect ? 'text-c4-green' : 'text-danger-glow'}`}>
                        {isCorrect ? 'Đúng' : 'Sai'}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter mt-0.5">Giải thích</p>
                 </div>
              </div>
              
              {!isCorrect && (
                <div className="quiz-error-diagnosis relative z-10" role="status">
                  <span>Nhóm lỗi cần chú ý</span>
                  <strong>{currentErrorTag}</strong>
                </div>
              )}

              {currentQuestion.status === 'QUARANTINED' && (
                <div className="mt-4 relative z-10 rounded-2xl border border-amber-400/30 bg-amber-400/[.06] p-4 text-xs leading-relaxed text-amber-200" role="status">
                  <b>Câu đang được kiểm định:</b> kết quả này được lưu để giáo viên xem nhưng không tính vào năng lực, điểm thích ứng hoặc gợi ý học tiếp.
                </div>
              )}

              {adaptiveRepairTask && (
                <div className="adaptive-repair-slot" role="status" aria-live="polite">
                  <AdaptiveRepairCard task={adaptiveRepairTask} equivalentQueued={Boolean(adaptiveNextMessage)} />
                  {adaptiveNextMessage && <p className="adaptive-next-message">{adaptiveNextMessage}</p>}
                </div>
              )}

              {lastEvidence && (
                <section className="learning-evidence-card relative z-10" aria-label="Bằng chứng học tập mới">
                  <div className="learning-evidence-card-head">
                    <div>
                      <span>Bằng chứng mới</span>
                      <strong>{lastEvidence.isCorrect ? 'Đã xác nhận đúng' : 'Đã ghi nhận điểm cần vá'}</strong>
                    </div>
                    <small className={`save-${evidenceSaveStatus.toLowerCase()}`}>{saveStatusLabel}</small>
                  </div>
                  <div className="learning-evidence-grid">
                    <div>
                      <span>Phản hồi</span>
                      <strong>{lastEvidence.finalAnswer} · {(lastEvidence.responseTimeMs / 1000).toFixed(1)} giây</strong>
                      <small>{timingLabels[lastEvidence.timingFlag]} · {lastEvidence.networkState === 'ONLINE' ? 'Online' : 'Offline'}</small>
                    </div>
                    <div>
                      <span>Kỹ năng đang đo</span>
                      <strong>{lastEvidence.skillIds.slice(0, 2).join(' · ')}</strong>
                      <small>{lastEvidence.cognitiveLevel} · độ khó {lastEvidence.difficulty}</small>
                    </div>
                    <div>
                      <span>Lỗi có khả năng</span>
                      <strong>{lastEvidence.errorTags[0] || 'Chưa ghi nhận lỗi'}</strong>
                      <small>{lastEvidence.hintUsed ? 'Có dùng gợi ý' : 'Không dùng gợi ý'} · {confidenceLabels[lastEvidence.confidence]}</small>
                    </div>
                    <div>
                      <span>Độ chắc chắn nhận định</span>
                      <strong>{Math.round(lastEvidence.inferenceConfidence * 100)}%</strong>
                      <small>Phiên bản câu {lastEvidence.questionVersion}</small>
                    </div>
                  </div>
                </section>
              )}

              <div className="quiz-explanation-body bg-white/5 p-8 rounded-[32px] border border-white/5 relative z-10 shadow-inner">
                 {renderExplainParts(currentQuestion.explain)}
              </div>

              {(currentQuestion.evidence_text || visibleSourceLabel) && (
                <div className="mt-5 relative z-10">
                  <button
                    onClick={() => setShowEvidence(prev => !prev)}
                    className="h-11 px-4 rounded-2xl bg-c4-green/10 border border-c4-green/30 text-c4-green text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">fact_check</span>
                    Căn cứ
                  </button>
                  {showEvidence && (
                    <div className="mt-3 rounded-2xl border border-c4-green/20 bg-black/30 p-5">
                      {currentQuestion.evidence_id && <p className="text-[10px] font-black uppercase tracking-widest text-c4-green mb-2">{currentQuestion.evidence_id}</p>}
                      {currentQuestion.evidence_text && <p className="quiz-evidence-text dia8-readable text-sm text-white leading-relaxed">{currentQuestion.evidence_text}</p>}
                      {visibleSourceLabel && <p className="mt-3 text-[10px] font-bold text-gray-400">Nguồn học liệu: {visibleSourceLabel}</p>}
                    </div>
                  )}
                </div>
              )}

              <div className="quiz-next-inline mt-10 flex justify-end relative z-10">
                <button 
                  onClick={handleNext}
                  disabled={evidenceSaveStatus === 'SAVING'}
                  className="px-12 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] hover:bg-primary hover:text-white transition-all shadow-xl active:scale-95"
                >
                  {nextLabel}
                </button>
              </div>
              <div className={`absolute top-0 right-0 p-4 text-[60px] font-black opacity-[0.03] select-none pointer-events-none italic ${isCorrect ? 'text-c4-green' : 'text-danger-glow'}`}>
                {isCorrect ? 'ĐÚNG' : 'SAI'}
              </div>
            </div>
          )}
        </div>
      </main>

      {showExplanation && typeof document !== 'undefined' && createPortal(
        <div className="quiz-mobile-next-bar quiz-mobile-next-portal" role="navigation" aria-label="Điều hướng câu hỏi">
          <button type="button" onClick={handleNext} disabled={evidenceSaveStatus === 'SAVING'} className="quiz-mobile-next-button">
            <span>{nextLabel}</span>
            <span className="material-symbols-outlined" aria-hidden="true">
              {currentIndex === (orderedQuestions.length - 1) ? 'task_alt' : 'arrow_forward'}
            </span>
          </button>
        </div>,
        document.body
      )}

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
      <CognitiveStyles />
    </div>
  );
};

export default QuizView;
