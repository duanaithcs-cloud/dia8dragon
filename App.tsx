
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppState, Topic, Timeframe, QuizSession, Question, HistoryEntry, HistoryType, Pokemon, RankLevel, SpecialMission, UIPreferences, SessionSummary, ArenaStats } from './types';
import { MOCK_TOPICS } from './data';
import BubbleCanvas from './components/BubbleCanvas';
import TopicDrawer from './components/TopicDrawer';
import QuizView from './components/QuizView';
import RankPanel from './components/RankPanel';
import TeacherDashboard from './components/TeacherDashboard';
import ArenaMode from './components/ArenaMode';
import CanvasOptionsDialog from './components/CanvasOptionsDialog';
import IdentityDialog from './components/IdentityDialog';
import InfographicModal from './components/InfographicModal'; 
import { GeminiService } from './services/geminiService';

const APP_STATE_KEY = 'dia_ai_state_v18_identity_reset'; 
const ARENA_STORE_KEY = 'ARENA_STORE_V1';

const defaultUI: UIPreferences = {
  theme: 'CRYPTO',
  showBreathing: true,
  showDrifting: true,
  showShimmering: true,
  fontSize: 16,
  intensity: 1.0,
  transparency: 0.8,
  brightness: 1.0,
  bubbleScale: 1.0
};

const getRankFromPoints = (points: number): RankLevel => {
  if (points < 500) return RankLevel.DONG;
  if (points < 1500) return RankLevel.BAC;
  if (points < 3000) return RankLevel.VANG;
  if (points < 5000) return RankLevel.BACH_KIM;
  if (points < 8000) return RankLevel.KIM_CUONG;
  if (points < 12000) return RankLevel.CAO_THU;
  return RankLevel.THACH_DAU;
};

const normalizeAnswer = (val: string | undefined): string => {
  if (!val) return "";
  const v = val.toUpperCase().trim();
  if (v === 'TRUE' || v === 'T' || v === 'ĐÚNG' || v === '1') return 'TRUE';
  if (v === 'FALSE' || v === 'F' || v === 'SAI' || v === '0') return 'FALSE';
  return v;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(APP_STATE_KEY);
    const defaults: AppState = {
      user_profile: { school: "KNTT - Địa 8", level: "HSG", role: 'STUDENT', rank: RankLevel.DONG, rankPoints: 0, streak: 0, preferences: defaultUI },
      timeframe: Timeframe.D7,
      topics: MOCK_TOPICS,
      pokemon_collection: [],
      session_log: [],
      missions: [],
      has_started: false,
      is_demo: false,
      last_activity_ts: new Date().toISOString(),
      view_mode: 'STUDENT_CANVAS'
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { 
          ...defaults, 
          ...parsed,
          user_profile: {
            ...defaults.user_profile,
            ...(parsed.user_profile || {}),
            preferences: {
              ...defaults.user_profile.preferences,
              ...(parsed.user_profile?.preferences || {})
            }
          }
        };
      } catch (e) { return defaults; }
    }
    return defaults;
  });

  const [arenaStore, setArenaStore] = useState<Record<number, ArenaStats>>(() => {
    const saved = localStorage.getItem(ARENA_STORE_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(ARENA_STORE_KEY, JSON.stringify(arenaStore));
  }, [arenaStore]);

  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRankOpen, setIsRankOpen] = useState(false);
  const [isCanvasSettingsOpen, setIsCanvasSettingsOpen] = useState(false);
  const [isTopLeftMenuOpen, setIsTopLeftMenuOpen] = useState(false);
  const [showIdentityDialog, setShowIdentityDialog] = useState(false);
  const [pendingQuiz, setPendingQuiz] = useState<{ topicId: number; count: 10 | 25; isArena?: boolean } | null>(null);
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [aiOutput, setAiOutput] = useState<string>("BỘ NÃO ĐỊA AI SẴN SÀNG.");
  const [loadingQuiz, setLoadingQuiz] = useState<{ active: boolean; stage: string }>({ active: false, stage: '' });
  const [generatingTopicId, setGeneratingTopicId] = useState<number | null>(null);
  const [celebrationTopicId, setCelebrationTopicId] = useState<number | null>(null);
  const [showInfographic, setShowInfographic] = useState<boolean>(false); 

  const hasIdentity = useMemo(() => !!state.user_profile.fullName && !!state.user_profile.className, [state.user_profile]);

  const handleUpdateUIPreference = (key: keyof UIPreferences, value: any) => {
    setState(prev => ({
      ...prev,
      user_profile: { ...prev.user_profile, preferences: { ...prev.user_profile.preferences, [key]: value } }
    }));
  };

  const handleImportTopics = (imported: Partial<Topic>[]) => {
    setState(prev => ({
      ...prev,
      topics: prev.topics.map(t => {
        const found = imported.find(i => i.topic_id === t.topic_id);
        if (found) {
          return { ...t, mastery_percent: found.mastery_percent ?? t.mastery_percent, competency_scores: { ...t.competency_scores, ...(found.competency_scores || {}) }, pulse_type: 'correct' as any };
        }
        return t;
      })
    }));
    setAiOutput("ĐỒNG BỘ DỮ LIỆU THÀNH CÔNG.");
    setTimeout(() => { setState(prev => ({ ...prev, topics: prev.topics.map(t => ({ ...t, pulse_type: null })) })); }, 2000);
  };

  const toggleRoleView = useCallback(() => {
    setState(prev => {
      const isCurrentlyStudent = prev.user_profile.role === 'STUDENT';
      const nextRole = isCurrentlyStudent ? 'TEACHER' : 'STUDENT';
      return { ...prev, user_profile: { ...prev.user_profile, role: nextRole }, view_mode: nextRole === 'TEACHER' ? 'TEACHER_DASHBOARD' : 'STUDENT_CANVAS' };
    });
    setAiOutput(state.user_profile.role === 'STUDENT' ? "KÍCH HOẠT QUYỀN CHUYÊN GIA. ĐANG NẠP MA TRẬN CCTV..." : "CHẾ ĐỘ HỌC VIÊN.");
  }, [state.user_profile.role]);

  const handleIdentityConfirm = (fullName: string, className: string) => {
    setState(prev => ({
      ...prev,
      user_profile: { ...prev.user_profile, fullName, className, rank: RankLevel.DONG, rankPoints: 0 },
      topics: prev.topics.map(t => ({ ...t, mastery_percent: 0, attempts_count: 0, delta: 0, competency_scores: { C1: 0, C2: 0, C3: 0, C4: 0 }, pulse_type: null })),
      session_log: [], has_started: true
    }));
    setShowIdentityDialog(false);
    if (pendingQuiz) {
      executeStartQuiz(pendingQuiz.topicId, pendingQuiz.count, pendingQuiz.isArena);
      setPendingQuiz(null);
    }
  };

  const startQuiz = (topicId: number, count: 10 | 25, isArena: boolean = false) => {
    if (!hasIdentity) {
      setPendingQuiz({ topicId, count, isArena });
      setShowIdentityDialog(true);
      return;
    }
    executeStartQuiz(topicId, count, isArena);
  };

  const executeStartQuiz = async (topicId: number, count: 10 | 25, isArena: boolean = false) => {
    setLoadingQuiz({ active: true, stage: isArena ? 'ĐANG KẾT NỐI ĐỐI THỦ AI...' : 'AI ĐANG KHỞI TẠO MA TRẬN ĐỀ...' });
    setGeneratingTopicId(topicId); setIsDrawerOpen(false); setIsCanvasSettingsOpen(false);
    try {
      const topic = state.topics.find(t => t.topic_id === topicId);
      if (!topic) throw new Error("Topic not found");
      const auditedQuestions = await GeminiService.generateQuiz(topic, count, isArena);
      setQuizSession({ 
        topic_id: topicId, type: isArena ? 'ARENA_COMBAT' : (count === 10 ? 'Luyện 10' : 'Luyện 25'), 
        questions: auditedQuestions, currentQuestionIndex: 0, answers: {},
        time_limit_seconds: isArena ? 300 : (count === 10 ? 300 : 900)
      });
    } catch (e) {
      console.error("Quiz Generation Error:", e);
      setAiOutput("AUDIT FAILED: Không thể khởi tạo đề thi.");
    } finally {
      setLoadingQuiz({ active: false, stage: '' }); setGeneratingTopicId(null);
    }
  };

  const handleMidQuizCorrect = useCallback((topicId: number) => {
    setState(prev => ({
      ...prev,
      topics: prev.topics.map(t => (t.topic_id === topicId ? { ...t, mastery_percent: Number(Math.min(200, t.mastery_percent + 2).toFixed(1)), delta: 2, pulse_type: 'correct' } : t))
    }));
    setTimeout(() => { setState(prev => ({ ...prev, topics: prev.topics.map(t => (t.topic_id === topicId ? { ...t, pulse_type: null } : t)) })); }, 1200);
  }, []);

  const handleQuizComplete = (finalAnswers: Record<string, string>) => {
    if (!quizSession) return;
    const isArenaMatch = quizSession.type === 'ARENA_COMBAT';
    let correctCount = 0, scoreTotal = 0;
    const compDelta = { C1: 0, C2: 0, C3: 0, C4: 0 };
    quizSession.questions.forEach(q => {
      const isCorrect = normalizeAnswer(finalAnswers[q.qid]) === normalizeAnswer(q.answer_key);
      if (isCorrect) {
        correctCount++; scoreTotal += (10 * (q.difficulty || 1));
        if (q.skill_tag in compDelta) compDelta[q.skill_tag as keyof typeof compDelta]++;
      }
    });
    const accuracy = (correctCount / quizSession.questions.length) * 100;
    if (isArenaMatch) {
      const currentStats = arenaStore[quizSession.topic_id] || { star_level: 0, matches_played: 0, best_accuracy: 0, last_match_at: null, last_result: null };
      let newStarLevel = currentStats.star_level;
      if (accuracy >= 80) newStarLevel = Math.min(5, newStarLevel + 1);
      setArenaStore(prev => ({
        ...prev,
        [quizSession.topic_id]: {
          star_level: newStarLevel, matches_played: currentStats.matches_played + 1,
          best_accuracy: Math.max(currentStats.best_accuracy, accuracy), last_match_at: new Date().toISOString(),
          last_result: { correct_count: correctCount, wrong_count: quizSession.questions.length - correctCount, accuracy }
        }
      }));
    }
    setCelebrationTopicId(quizSession.topic_id);
    setState(prev => {
      const updatedTopics = prev.topics.map(t => {
        if (t.topic_id === quizSession.topic_id) {
          return { ...t, pulse_type: t.mastery_percent >= 100 ? 'achievement' : 'correct' as any, attempts_count: t.attempts_count + 1, competency_scores: { C1: Math.min(100, t.competency_scores.C1 + compDelta.C1 * 2), C2: Math.min(100, t.competency_scores.C2 + compDelta.C2 * 2), C3: Math.min(100, t.competency_scores.C3 + compDelta.C3 * 2), C4: Math.min(100, t.competency_scores.C4 + compDelta.C4 * 2) } };
        }
        return t;
      });
      const newPoints = prev.user_profile.rankPoints + scoreTotal;
      const newHistoryEntry: HistoryEntry = { id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), type: isArenaMatch ? 'ARENA_MATCH_END' : 'QUIZ_COMPLETE', topicId: quizSession.topic_id, topicLabel: updatedTopics.find(t => t.topic_id === quizSession.topic_id)?.short_label || '', details: isArenaMatch ? `Đúng ${correctCount}/10` : `Đúng ${correctCount}/${quizSession.questions.length}` };
      return { ...prev, topics: updatedTopics, user_profile: { ...prev.user_profile, rankPoints: newPoints, rank: getRankFromPoints(newPoints), streak: accuracy >= 80 ? prev.user_profile.streak + 1 : 0 }, session_log: [newHistoryEntry, ...(prev.session_log || [])].slice(0, 50) };
    });
    setTimeout(() => { setCelebrationTopicId(null); setState(prev => ({ ...prev, topics: prev.topics.map(t => ({ ...t, pulse_type: null })) })); }, 3000);
    setQuizSession(null);
  };

  const handleAssignMission = (mission: SpecialMission) => { setState(prev => ({ ...prev, missions: [mission, ...prev.missions] })); };

  return (
    <div className="h-screen w-full flex flex-col bg-background-dark text-white font-display overflow-hidden">
      {showIdentityDialog && <IdentityDialog onConfirm={handleIdentityConfirm} onCancel={() => setShowIdentityDialog(false)} />}
      {showInfographic && selectedTopicId && <InfographicModal url={state.topics.find(t => t.topic_id === selectedTopicId)?.infographic_url || ""} topicName={state.topics.find(t => t.topic_id === selectedTopicId)?.keyword_label || ""} onClose={() => setShowInfographic(false)} />}
      {loadingQuiz.active && (
        <div className="fixed inset-0 z-[200] bg-transparent flex flex-col items-center justify-center animate-fade-in pointer-events-none">
           <div className="mt-8 text-center bg-black/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/10">
             <h2 className="text-2xl font-black uppercase tracking-widest text-white italic animate-pulse">{loadingQuiz.stage}</h2>
           </div>
        </div>
      )}
      <header className="flex items-center backdrop-blur-xl p-2 px-4 justify-between z-50 border-b border-white/10 shrink-0 h-16 bg-background-dark/95">
        <div className="flex items-center gap-4 relative">
          <button onClick={() => setIsTopLeftMenuOpen(!isTopLeftMenuOpen)} className={`size-10 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10 ${isTopLeftMenuOpen ? 'rotate-90 text-primary border-primary' : ''}`}>
            <span className="material-symbols-outlined">settings</span>
          </button>
          {isTopLeftMenuOpen && (
            <div className="absolute top-12 left-0 w-64 bg-background-dark/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-slide-up">
              <div className="p-2 space-y-1">
                <button onClick={() => { setIsTopLeftMenuOpen(false); if (state.user_profile.role === 'STUDENT' && !hasIdentity) setShowIdentityDialog(true); else toggleRoleView(); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${state.user_profile.role === 'TEACHER' ? 'bg-amber-500/10 text-amber-500' : 'hover:bg-white/5 text-gray-300'}`}>
                  <span className="material-symbols-outlined text-xl">{state.user_profile.role === 'TEACHER' ? 'verified_user' : 'person_search'}</span>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-black uppercase tracking-widest">Học viên / Chuyên gia</span>
                    <span className="text-[9px] font-bold text-gray-500 uppercase">{state.user_profile.role === 'TEACHER' ? 'Quyền Chuyên Gia' : (hasIdentity ? state.user_profile.fullName : 'Chưa định danh')}</span>
                  </div>
                </button>
                <button onClick={() => { setIsTopLeftMenuOpen(false); setIsRankOpen(true); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-300 transition-all">
                  <span className="material-symbols-outlined text-xl text-amber-500">leaderboard</span>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-black uppercase tracking-widest">Rankings</span>
                    <span className="text-[9px] font-bold text-gray-500 uppercase">{state.user_profile.rankPoints} LP • {state.user_profile.rank}</span>
                  </div>
                </button>
                <div className="h-px bg-white/5 my-1"></div>
                <div className="p-3">
                  <div className="flex items-center gap-3 mb-2"><div className="size-2 rounded-full bg-c4-green animate-pulse"></div><span className="text-[10px] font-black uppercase tracking-widest text-primary italic">Địa AI Status</span></div>
                  <p className="text-[9px] text-gray-500 font-bold leading-relaxed line-clamp-2 px-1">{aiOutput}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className={`flex size-10 items-center justify-center rounded-xl border text-white transition-all ${state.user_profile.role === 'TEACHER' ? 'bg-amber-500 border-amber-500 shadow-lg' : 'bg-primary border-primary shadow-lg'}`}>
              <span className="material-symbols-outlined text-xl">{state.user_profile.role === 'TEACHER' ? 'admin_panel_settings' : 'shield'}</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-[11px] font-black uppercase text-white tracking-widest">ĐỊA AI • {state.user_profile.rank}</h2>
              {hasIdentity && <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter truncate max-w-[120px]">{state.user_profile.fullName}</span>}
            </div>
          </div>
        </div>
        <div className="flex-1 flex justify-center px-6">
          <nav className="flex items-center bg-white/5 rounded-2xl p-1 gap-1 border border-white/10">
            <button onClick={() => setState(p => ({...p, view_mode: 'STUDENT_CANVAS'}))} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${state.view_mode === 'STUDENT_CANVAS' ? 'bg-primary text-white' : 'text-gray-500 hover:text-white'}`}>Canvas</button>
            <button onClick={() => setState(p => ({...p, view_mode: 'ARENA_MODE'}))} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${state.view_mode === 'ARENA_MODE' ? 'bg-danger-glow text-white' : 'text-gray-500 hover:text-white'}`}>Arena</button>
            {state.user_profile.role === 'TEACHER' && <button onClick={() => setState(p => ({...p, view_mode: 'TEACHER_DASHBOARD'}))} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${state.view_mode === 'TEACHER_DASHBOARD' ? 'bg-amber-500 text-black' : 'text-amber-500/60 hover:text-amber-500'}`}>CCTV Matrix</button>}
          </nav>
        </div>
      </header>
      <main className="flex-1 relative overflow-hidden bg-background-dark">
        {quizSession ? <QuizView topic={state.topics.find(t => t.topic_id === quizSession.topic_id)!} session={quizSession} arenaStore={arenaStore} onCorrect={handleMidQuizCorrect} onComplete={handleQuizComplete} onCancel={() => setQuizSession(null)} /> : (
          <>
            {state.view_mode === 'STUDENT_CANVAS' && <BubbleCanvas topics={state.topics} generatingTopicId={generatingTopicId} celebrationTopicId={celebrationTopicId} preferences={state.user_profile.preferences} arenaStore={arenaStore} onBubbleClick={(id) => { setSelectedTopicId(id); setIsDrawerOpen(true); }} />}
            {state.view_mode === 'ARENA_MODE' && <ArenaMode topics={state.topics} userProfile={state.user_profile} arenaStore={arenaStore} onStartMatch={(id) => startQuiz(id, 10, true)} />}
            {state.view_mode === 'TEACHER_DASHBOARD' && <TeacherDashboard topics={state.topics} onAssignMission={handleAssignMission} />}
          </>
        )}
      </main>
      {isCanvasSettingsOpen && <CanvasOptionsDialog preferences={state.user_profile.preferences} onUpdate={handleUpdateUIPreference} onClose={() => setIsCanvasSettingsOpen(false)} />}
      {isDrawerOpen && selectedTopicId && <TopicDrawer topic={state.topics.find(t => t.topic_id === selectedTopicId)!} history={state.session_log.filter(e => e && e.topicId === selectedTopicId)} arenaStore={arenaStore} onClose={() => setIsDrawerOpen(false)} onStartLuyen10={() => startQuiz(selectedTopicId, 10)} onStartLuyen25={() => startQuiz(selectedTopicId, 25)} onStartArena={() => startQuiz(selectedTopicId, 10, true)} onFetchInsights={(topic) => GeminiService.fetchTopicInsights(topic)} onShowInfographic={() => setShowInfographic(true)} />}
      {isRankOpen && <RankPanel topics={state.topics} isDemo={state.is_demo || false} userProfile={state.user_profile} onClose={() => setIsRankOpen(false)} onImportTopics={handleImportTopics} />}
    </div>
  );
};
export default App;
