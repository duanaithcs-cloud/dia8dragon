
import React, { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { AppState, Topic, Timeframe, QuizSession, Question, HistoryEntry, HistoryType, Pokemon, RankLevel, SpecialMission, UIPreferences, SessionSummary, ArenaStats, TeacherWorkspace, LearningEvidenceDraft, MonsterBattleReward } from './types';
import BubbleCanvas from './components/BubbleCanvas';
import { GeminiService } from './services/geminiService';
import { preloadImage, preloadImagesInBatches } from './utils/imagePreloader';
import { ARENA_STORE_KEY, TransferSnapshot, clearDia8LocalData, persistCurrentData, safeReadJson, saveBackup } from './utils/dataPersistence';
import { collectLearningErrors } from './utils/learningDiagnostics';
import PrimaryNavigation, { PrimaryDestination } from './components/PrimaryNavigation';
import { createInitialAppState } from './core/createInitialAppState';
import { defaultUI } from './core/appDefaults';
import { mergeSavedTopicsWithCatalog } from './core/topicState';
import { getRankFromPoints, scoreQuizAnswers } from './core/quizScoring';
import { useAppPersistence } from './hooks/useAppPersistence';
import { useDocumentPreferences } from './hooks/useDocumentPreferences';
import { createLearningSessionId } from './core/learningEvidence';
import { buildAdaptiveSessionPlan, importLearningEvidenceData, initializeLearningEvidenceDb, recordLearningEvidence } from './services/learningEvidenceDb';
import { loadTeacherCommandPolicy } from './services/teacherCommandService';

const TopicDrawer = React.lazy(() => import('./components/TopicDrawer'));
const QuizView = React.lazy(() => import('./components/QuizView'));
const RankPanel = React.lazy(() => import('./components/RankPanel'));
const TeacherDashboard = React.lazy(() => import('./components/TeacherDashboard'));
const ArenaMode = React.lazy(() => import('./components/ArenaMode'));
const CanvasOptionsDialog = React.lazy(() => import('./components/CanvasOptionsDialog'));
const IdentityDialog = React.lazy(() => import('./components/IdentityDialog'));
const InfographicModal = React.lazy(() => import('./components/InfographicModal'));
const TransferHub = React.lazy(() => import('./components/TransferHub'));
const RoleSelectionDialog = React.lazy(() => import('./components/RoleSelectionDialog'));
const StudentAssignmentHub = React.lazy(() => import('./components/StudentAssignmentHub'));
const DocumentLibrary = React.lazy(() => import('./components/DocumentLibrary'));
const PracticeHub = React.lazy(() => import('./components/PracticeHub'));
const ProfileCenter = React.lazy(() => import('./components/ProfileCenter'));
const MonsterBattleHub = React.lazy(() => import('./components/MonsterBattleHub'));
const AdventureCommandHub = React.lazy(() => import('./components/AdventureCommandHub'));

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(createInitialAppState);
  const [teacherCommandPolicy, setTeacherCommandPolicy] = useState(loadTeacherCommandPolicy);

  const [arenaStore, setArenaStore] = useState<Record<number, ArenaStats>>(() =>
    safeReadJson<Record<number, ArenaStats>>(ARENA_STORE_KEY, {})
  );

  const [isEvolutionModalOpen, setIsEvolutionModalOpen] = useState(false);
  const [evolutionData, setEvolutionData] = useState<{ oldRank: RankLevel, newRank: RankLevel } | null>(null);

  useAppPersistence(state, arenaStore);
  useDocumentPreferences(state.user_profile.preferences);

  useEffect(() => {
    void initializeLearningEvidenceDb();
  }, []);

  useEffect(() => {
    const refreshPolicy = (event?: Event) => setTeacherCommandPolicy((event as CustomEvent | undefined)?.detail || loadTeacherCommandPolicy());
    window.addEventListener('dia8:teacher-policy', refreshPolicy);
    return () => window.removeEventListener('dia8:teacher-policy', refreshPolicy);
  }, []);

  const learnerEvidenceId = useMemo(() => {
    const name = state.user_profile.fullName?.trim() || 'anonymous';
    const className = state.user_profile.className?.trim() || 'local';
    return `${className}::${name}`.toLocaleLowerCase('vi');
  }, [state.user_profile.className, state.user_profile.fullName]);

  const handleLearningEvidence = useCallback(async (draft: LearningEvidenceDraft) => {
    return recordLearningEvidence(learnerEvidenceId, draft);
  }, [learnerEvidenceId]);

  const handleBuildAdaptivePlan = useCallback((sessionId: string, topicId: number) => {
    return buildAdaptiveSessionPlan(learnerEvidenceId, sessionId, topicId);
  }, [learnerEvidenceId]);

  useEffect(() => {
    if (state.topics.some(topic => !topic.infographic_url)) {
      setState(prev => ({ ...prev, topics: mergeSavedTopicsWithCatalog(prev.topics) }));
    }
  }, [state.topics]);



  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRankOpen, setIsRankOpen] = useState(false);
  const [isCanvasSettingsOpen, setIsCanvasSettingsOpen] = useState(false);
  const [isTopLeftMenuOpen, setIsTopLeftMenuOpen] = useState(false);
  const [isTransferHubOpen, setIsTransferHubOpen] = useState(false);
  const [isStudentAssignmentsOpen, setIsStudentAssignmentsOpen] = useState(false);
  const [isDocumentLibraryOpen, setIsDocumentLibraryOpen] = useState(false);
  const [monsterInitialTopicId, setMonsterInitialTopicId] = useState(1);
  const [showIdentityDialog, setShowIdentityDialog] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(() => !state.user_profile.roleConfirmed);
  const [pendingQuiz, setPendingQuiz] = useState<{ topicId: number; count: 10 | 25; isArena?: boolean; practiceMode?: 'quick' | 'hsg' | 'visual' | 'arena' } | null>(null);
  const [pendingManualQuiz, setPendingManualQuiz] = useState<{ topicId: number; rawJson: string } | null>(null);
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [aiOutput, setAiOutput] = useState<string>("Địa AI sẵn sàng.");
  const [loadingQuiz, setLoadingQuiz] = useState<{ active: boolean; stage: string }>({ active: false, stage: '' });
  const [generatingTopicId, setGeneratingTopicId] = useState<number | null>(null);
  const [celebrationTopicId, setCelebrationTopicId] = useState<number | null>(null);
  const [activeInfographic, setActiveInfographic] = useState<{ url: string; topicName: string } | null>(null); 

  const openStudentAssignments = () => {
    setIsTopLeftMenuOpen(false);
    setIsCanvasSettingsOpen(false);
    setIsRankOpen(false);
    setIsTransferHubOpen(false);
    setIsDocumentLibraryOpen(false);
    setIsDrawerOpen(false);
    setActiveInfographic(null);
    setIsStudentAssignmentsOpen(true);
  };

  const openDocumentLibrary = () => {
    setIsTopLeftMenuOpen(false);
    setIsCanvasSettingsOpen(false);
    setIsRankOpen(false);
    setIsTransferHubOpen(false);
    setIsStudentAssignmentsOpen(false);
    setIsDrawerOpen(false);
    setActiveInfographic(null);
    setIsDocumentLibraryOpen(true);
  };

  const activePrimaryDestination: PrimaryDestination = isStudentAssignmentsOpen
    ? 'ASSIGNMENTS'
    : isDocumentLibraryOpen
      ? 'DOCUMENTS'
      : state.view_mode === 'PRACTICE_HUB' || state.view_mode === 'ARENA_MODE' || state.view_mode === 'MONSTER_BATTLE' || state.view_mode === 'ADVENTURE_COMMAND'
        ? 'PRACTICE'
        : state.view_mode === 'PROFILE_CENTER'
          ? 'PROFILE'
          : 'LEARN';

  const openMonsterBattle = (topicId: number) => {
    if (!teacherCommandPolicy.gamificationEnabled) {
      setAiOutput('Giáo viên đang tắt game hóa. Quiz và học thích ứng vẫn hoạt động bình thường.');
      return;
    }
    setMonsterInitialTopicId(topicId);
    setIsTopLeftMenuOpen(false);
    setIsCanvasSettingsOpen(false);
    setIsRankOpen(false);
    setIsTransferHubOpen(false);
    setIsDrawerOpen(false);
    setActiveInfographic(null);
    setIsStudentAssignmentsOpen(false);
    setIsDocumentLibraryOpen(false);
    setState(prev => ({ ...prev, view_mode: 'MONSTER_BATTLE' }));
  };

  const openAdventureCommand = () => {
    if (!teacherCommandPolicy.gamificationEnabled) {
      setAiOutput('Giáo viên đang tắt Hành trình Thất Ngọc.');
      return;
    }
    setIsTopLeftMenuOpen(false);
    setIsCanvasSettingsOpen(false);
    setIsRankOpen(false);
    setIsTransferHubOpen(false);
    setIsDrawerOpen(false);
    setActiveInfographic(null);
    setIsStudentAssignmentsOpen(false);
    setIsDocumentLibraryOpen(false);
    setState(prev => ({ ...prev, view_mode: 'ADVENTURE_COMMAND' }));
  };

  const navigatePrimary = (destination: PrimaryDestination) => {
    setIsTopLeftMenuOpen(false);
    setIsCanvasSettingsOpen(false);
    setIsRankOpen(false);
    setIsTransferHubOpen(false);
    setIsDrawerOpen(false);
    setActiveInfographic(null);
    setIsStudentAssignmentsOpen(false);
    setIsDocumentLibraryOpen(false);
    if (destination === 'ASSIGNMENTS') return openStudentAssignments();
    if (destination === 'DOCUMENTS') return openDocumentLibrary();
    setState(prev => ({
      ...prev,
      view_mode: destination === 'PRACTICE' ? 'PRACTICE_HUB' : destination === 'PROFILE' ? 'PROFILE_CENTER' : 'STUDENT_CANVAS'
    }));
  };

  const openTopicWorkspace = (topicId: number) => {
    const topic = state.topics.find(item => item.topic_id === topicId);
    void preloadImage(topic?.infographic_url);
    setSelectedTopicId(topicId);
    setIsDrawerOpen(true);
  };

  const resetLocalData = async () => {
    await clearDia8LocalData();
    window.location.reload();
  };

  const hasIdentity = useMemo(() => !!state.user_profile.fullName && !!state.user_profile.className, [state.user_profile]);
  const selectedTopic = useMemo(
    () => state.topics.find(t => t.topic_id === selectedTopicId) || null,
    [selectedTopicId, state.topics]
  );
  const infographicUrls = useMemo(
    () => state.topics.map(t => t.infographic_url || "").filter(Boolean),
    [state.topics]
  );

  useEffect(() => {
    preloadImagesInBatches(infographicUrls, 4);
  }, [infographicUrls]);

  useEffect(() => {
    if (isDrawerOpen && selectedTopic?.infographic_url) {
      void preloadImage(selectedTopic.infographic_url);
    }
  }, [isDrawerOpen, selectedTopic?.infographic_url]);

  const handleUpdateUIPreference = (key: keyof UIPreferences, value: any) => {
    setState(prev => ({
      ...prev,
      user_profile: { ...prev.user_profile, preferences: { ...prev.user_profile.preferences, [key]: value } }
    }));
  };

  const setLayoutMode = (mode: 'AUTO' | 'DESKTOP' | 'MOBILE') => {
    handleUpdateUIPreference('layoutMode', mode);
    setAiOutput(mode === 'AUTO' ? 'Giao diện đang tự nhận diện thiết bị.' : mode === 'DESKTOP' ? 'Đã ưu tiên bố cục desktop rộng.' : 'Đã ưu tiên bố cục mobile gọn.');
  };

  const cycleLayoutMode = () => {
    const current = state.user_profile.preferences.layoutMode || 'AUTO';
    setLayoutMode(current === 'AUTO' ? 'MOBILE' : current === 'MOBILE' ? 'DESKTOP' : 'AUTO');
  };

  const toggleReadingTheme = () => {
    const next = (state.user_profile.preferences.readingTheme || 'NIGHT') === 'NIGHT' ? 'DAY' : 'NIGHT';
    handleUpdateUIPreference('readingTheme', next);
    setAiOutput(next === 'DAY' ? 'Đã bật nền đọc ban ngày.' : 'Đã bật nền đọc ban đêm.');
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
    setAiOutput("Đã đồng bộ.");
    setTimeout(() => { setState(prev => ({ ...prev, topics: prev.topics.map(t => ({ ...t, pulse_type: null })) })); }, 2000);
  };

  const handleSelectRole = useCallback((role: 'STUDENT' | 'TEACHER') => {
    setState(prev => ({
      ...prev,
      user_profile: { ...prev.user_profile, role, roleConfirmed: true },
      view_mode: role === 'TEACHER' ? 'TEACHER_DASHBOARD' : 'STUDENT_CANVAS'
    }));
    setShowRoleSelection(false);
    setIsTopLeftMenuOpen(false);
    setAiOutput(role === 'TEACHER' ? 'Đã mở không gian giáo viên.' : 'Đã mở không gian học sinh.');
  }, []);

  const openRoleSelection = useCallback(() => {
    setIsTopLeftMenuOpen(false);
    setShowRoleSelection(true);
  }, []);

  const handleIdentityConfirm = async (fullName: string, className: string) => {
    setState(prev => ({
      ...prev,
      user_profile: { ...prev.user_profile, fullName, className, rank: RankLevel.DONG, rankPoints: 0 },
      topics: prev.topics.map(t => ({ ...t, mastery_percent: 0, attempts_count: 0, delta: 0, competency_scores: { C1: 0, C2: 0, C3: 0, C4: 0 }, pulse_type: null })),
      session_log: [], has_started: true
    }));
    setShowIdentityDialog(false);
    setAiOutput("AI đang tạo lộ trình.");
    if (state.user_profile.preferences.allowAiProcessing) {
      GeminiService.generateLoginCoach(fullName, className, state.topics).then(setAiOutput);
    } else {
      setAiOutput(`Chào ${fullName}. AI đang tắt; app dùng học liệu và ngân hàng câu hỏi cục bộ.`);
    }
    if (pendingQuiz) {
      executeStartQuiz(pendingQuiz.topicId, pendingQuiz.count, pendingQuiz.isArena, pendingQuiz.practiceMode);
      setPendingQuiz(null);
    }
    if (pendingManualQuiz) {
      executeManualQuiz(pendingManualQuiz.topicId, pendingManualQuiz.rawJson);
      setPendingManualQuiz(null);
    }
  };

  const startQuiz = (topicId: number, count: 10 | 25, isArena: boolean = false, practiceMode: 'quick' | 'hsg' | 'visual' | 'arena' = isArena ? 'arena' : count === 25 ? 'hsg' : 'quick') => {
    if (!hasIdentity) {
      setPendingQuiz({ topicId, count, isArena, practiceMode });
      setShowIdentityDialog(true);
      return;
    }
    executeStartQuiz(topicId, count, isArena, practiceMode);
  };

  const startManualQuiz = (topicId: number, rawJson: string) => {
    if (!hasIdentity) {
      setPendingManualQuiz({ topicId, rawJson });
      setShowIdentityDialog(true);
      return;
    }
    executeManualQuiz(topicId, rawJson);
  };

  const executeManualQuiz = (topicId: number, rawJson: string) => {
    try {
      const topic = state.topics.find(t => t.topic_id === topicId);
      if (!topic) throw new Error("Topic not found");
      const questions = GeminiService.parseManualQuizJson(topic, rawJson);
      const type = questions.length >= 20 ? '25 câu TN' : '10 câu TN';
      setQuizSession({
        session_id: createLearningSessionId(),
        started_at: new Date().toISOString(),
        topic_id: topicId,
        type,
        questions,
        currentQuestionIndex: 0,
        answers: {},
        time_limit_seconds: questions.length >= 20 ? 900 : 300
      });
      setIsDrawerOpen(false);
      setAiOutput("Đã nạp đề AI.");
    } catch (error) {
      console.error("Manual Quiz Import Error:", error);
      setAiOutput("JSON lỗi: " + (error as Error).message);
    }
  };

  const executeStartQuiz = async (topicId: number, count: 10 | 25, isArena: boolean = false, practiceMode: 'quick' | 'hsg' | 'visual' | 'arena' = isArena ? 'arena' : count === 25 ? 'hsg' : 'quick') => {
    setLoadingQuiz({ active: true, stage: isArena ? 'Đang ghép đấu...' : 'Đang tạo đề...' });
    setGeneratingTopicId(topicId); setIsDrawerOpen(false); setIsCanvasSettingsOpen(false);
    try {
      const topic = state.topics.find(t => t.topic_id === topicId);
      if (!topic) throw new Error("Topic not found");
      const auditedQuestions = await GeminiService.generateQuiz(topic, count, isArena, practiceMode, Boolean(state.user_profile.preferences.allowAiProcessing));
      if (!auditedQuestions.length) {
        setAiOutput("Chưa có TN chuẩn accepted cho chuyên đề này. Câu cần GV duyệt đang giữ ở quarantine.");
        return;
      }
      setQuizSession({ 
        session_id: createLearningSessionId(),
        started_at: new Date().toISOString(),
        topic_id: topicId, type: isArena ? 'ARENA_COMBAT' : (count === 10 ? '10 câu TN' : '25 câu TN'), 
        practice_mode: practiceMode,
        questions: auditedQuestions, currentQuestionIndex: 0, answers: {},
        time_limit_seconds: isArena ? 300 : (count === 10 ? 300 : 900)
      });
    } catch (e) {
      console.error("Quiz Generation Error:", e);
      setAiOutput("Lỗi tạo đề.");
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

  const handleMonsterReward = useCallback((reward: MonsterBattleReward) => {
    setState(prev => {
      const oldRank = prev.user_profile.rank;
      const newPoints = prev.user_profile.rankPoints + reward.rankPoints;
      const newRank = getRankFromPoints(newPoints);
      if (newRank !== oldRank) {
        setEvolutionData({ oldRank, newRank });
        setTimeout(() => setIsEvolutionModalOpen(true), 800);
      }
      const topic = prev.topics.find(item => item.topic_id === reward.topicId);
      const historyEntry: HistoryEntry = {
        id: `monster-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        type: reward.sealed ? 'MONSTER_SEALED' : 'MONSTER_BATTLE',
        topicId: reward.topicId,
        topicLabel: topic?.short_label || topic?.keyword_label || `Chuyên đề ${reward.topicId}`,
        details: `${reward.sealed ? 'Phong ấn' : 'Giao chiến'} · đúng ${reward.correctCount}/${reward.totalQuestions}`,
      };
      return {
        ...prev,
        topics: prev.topics.map(item => item.topic_id === reward.topicId ? {
          ...item,
          mastery_percent: Number(Math.min(200, item.mastery_percent + reward.masteryDelta).toFixed(1)),
          attempts_count: item.attempts_count + 1,
          last_attempt_at: new Date().toISOString(),
          pulse_type: reward.sealed ? 'achievement' : 'correct',
        } : item),
        user_profile: { ...prev.user_profile, rankPoints: newPoints, rank: newRank },
        session_log: [historyEntry, ...(prev.session_log || [])].slice(0, 50),
      };
    });
    setCelebrationTopicId(reward.topicId);
    setTimeout(() => {
      setCelebrationTopicId(null);
      setState(prev => ({ ...prev, topics: prev.topics.map(topic => ({ ...topic, pulse_type: null })) }));
    }, 1800);
  }, []);

  const handleQuizComplete = (finalAnswers: Record<string, string>) => {
    if (!quizSession) return;
    const isArenaMatch = quizSession.type === 'ARENA_COMBAT';
    const { correctCount, scoreTotal, competencyDelta: compDelta, accuracy } = scoreQuizAnswers(
      quizSession.questions,
      finalAnswers
    );
    const learningErrors = collectLearningErrors(quizSession.questions, finalAnswers);

    const currentStats = arenaStore[quizSession.topic_id] || { star_level: 0, matches_played: 0, best_accuracy: 0, last_match_at: null, last_result: null };
    let newStarLevel = currentStats.star_level;
    if (accuracy >= 80) newStarLevel = Math.min(5, newStarLevel + 1);

    setArenaStore(prev => ({
      ...prev,
      [quizSession.topic_id]: {
        ...currentStats,
        star_level: newStarLevel, 
        matches_played: isArenaMatch ? currentStats.matches_played + 1 : currentStats.matches_played,
        best_accuracy: Math.max(currentStats.best_accuracy, accuracy), 
        last_match_at: new Date().toISOString(),
        last_result: { correct_count: correctCount, wrong_count: quizSession.questions.length - correctCount, accuracy }
      }
    }));

    setCelebrationTopicId(quizSession.topic_id);
    
    const oldRank = state.user_profile.rank;
    const newPoints = state.user_profile.rankPoints + scoreTotal;
    const newRank = getRankFromPoints(newPoints);

    if (newRank !== oldRank) {
       setEvolutionData({ oldRank, newRank });
       setTimeout(() => setIsEvolutionModalOpen(true), 1500);
    }

    setState(prev => {
      const updatedTopics = prev.topics.map(t => {
        if (t.topic_id === quizSession.topic_id) {
          return { ...t, pulse_type: t.mastery_percent >= 100 ? 'achievement' : 'correct' as any, attempts_count: t.attempts_count + 1, competency_scores: { C1: Math.min(100, t.competency_scores.C1 + compDelta.C1 * 2), C2: Math.min(100, t.competency_scores.C2 + compDelta.C2 * 2), C3: Math.min(100, t.competency_scores.C3 + compDelta.C3 * 2), C4: Math.min(100, t.competency_scores.C4 + compDelta.C4 * 2) }, error_tags: [...learningErrors, ...(t.error_tags || [])].slice(0, 40) };
        }
        return t;
      });
      const newHistoryEntry: HistoryEntry = { id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), type: isArenaMatch ? 'ARENA_MATCH_END' : 'QUIZ_COMPLETE', topicId: quizSession.topic_id, topicLabel: updatedTopics.find(t => t.topic_id === quizSession.topic_id)?.short_label || '', details: isArenaMatch ? `Đúng ${correctCount}/10` : `Đúng ${correctCount}/${quizSession.questions.length}` };
      return { ...prev, topics: updatedTopics, user_profile: { ...prev.user_profile, rankPoints: newPoints, rank: newRank, streak: accuracy >= 80 ? prev.user_profile.streak + 1 : 0 }, session_log: [newHistoryEntry, ...(prev.session_log || [])].slice(0, 50) };
    });
    
    setTimeout(() => { setCelebrationTopicId(null); setState(prev => ({ ...prev, topics: prev.topics.map(t => ({ ...t, pulse_type: null })) })); }, 3000);
    setQuizSession(null);
  };

  const handleAssignMission = (mission: SpecialMission) => { setState(prev => ({ ...prev, missions: [mission, ...prev.missions] })); };

  const handleImportSnapshot = async (snapshot: TransferSnapshot) => {
    saveBackup(state, arenaStore, 'Trước khi khôi phục');
    const restoredState: AppState = {
      ...snapshot.appState,
      topics: mergeSavedTopicsWithCatalog(snapshot.appState?.topics),
      user_profile: {
        ...state.user_profile,
        ...snapshot.appState.user_profile,
        preferences: {
          ...defaultUI,
          ...(snapshot.appState.user_profile?.preferences || {})
        }
      },
      last_activity_ts: new Date().toISOString()
    };
    setState(restoredState);
    setArenaStore(snapshot.arenaStore || {});
    persistCurrentData(restoredState, snapshot.arenaStore || {});
    await importLearningEvidenceData(snapshot.learningEvidence).catch(error => {
      console.warn('Không thể nhập phần bằng chứng học tập; tiến trình chính vẫn được khôi phục.', error);
    });
    setAiOutput("Đã khôi phục dữ liệu an toàn; bản cũ đã được lưu làm điểm phục hồi.");
  };

  const lazyFallback = (
    <div className="absolute inset-0 z-[190] flex items-center justify-center pointer-events-none">
      <div className="px-5 py-3 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-xl text-[10px] font-black uppercase tracking-[0.25em] text-c4-green">
        Đang nạp
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col bg-background-dark text-white font-display overflow-hidden">
      <Suspense fallback={lazyFallback}>
        {showRoleSelection && <RoleSelectionDialog currentRole={state.user_profile.role} onSelect={handleSelectRole} onClose={state.user_profile.roleConfirmed ? () => setShowRoleSelection(false) : undefined} />}
        {showIdentityDialog && <IdentityDialog onConfirm={handleIdentityConfirm} onCancel={() => setShowIdentityDialog(false)} />}
        {activeInfographic && <InfographicModal url={activeInfographic.url} topicName={activeInfographic.topicName} onClose={() => setActiveInfographic(null)} />}
        {isTransferHubOpen && <TransferHub appState={state} arenaStore={arenaStore} onImportSnapshot={handleImportSnapshot} onClose={() => setIsTransferHubOpen(false)} />}
        {isDocumentLibraryOpen && <DocumentLibrary role={state.user_profile.role} onClose={() => setIsDocumentLibraryOpen(false)} />}
      </Suspense>
      
      {/* EVOLUTION MODAL */}
      {isEvolutionModalOpen && evolutionData && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl animate-fade-in" onClick={() => setIsEvolutionModalOpen(false)}></div>
           <div className="relative w-full max-w-xl text-center space-y-10 evolution-enter">
              <div className="relative">
                 <div className="absolute inset-0 bg-primary/20 blur-[100px] animate-pulse"></div>
                 <h2 className="text-6xl font-black italic uppercase text-primary drop-shadow-[0_0_20px_rgba(13,51,242,0.8)]">Lên hạng</h2>
                 <p className="text-xl font-bold text-gray-400 mt-2 uppercase">Từ {evolutionData.oldRank} lên {evolutionData.newRank}</p>
              </div>
              
              <div className="flex items-center justify-center gap-12 relative py-10">
                 <div className="flex flex-col items-center opacity-40 grayscale">
                    <img src="/assets/riolu.png" className="size-40 object-contain" />
                    <span className="text-xs font-black uppercase mt-4 text-gray-500">{evolutionData.oldRank}</span>
                 </div>
                 <div className="material-symbols-outlined text-5xl text-primary animate-pulse">double_arrow</div>
                 <div className="flex flex-col items-center">
                    <div className="relative">
                       <div className="absolute inset-[-40px] border-2 border-primary border-dashed rounded-full animate-spin-slow opacity-30"></div>
                       <img src="/assets/lucario.png" className="size-64 object-contain animate-lightning relative z-10" />
                    </div>
                    <span className="text-2xl font-black uppercase mt-6 text-primary italic tracking-widest drop-shadow-[0_0_10px_#0d33f2]">{evolutionData.newRank}</span>
                 </div>
              </div>

              <button 
                onClick={() => setIsEvolutionModalOpen(false)}
                className="px-12 py-5 bg-primary text-white font-black uppercase tracking-[0.3em] rounded-2xl shadow-[0_20px_50px_rgba(13,51,242,0.5)] hover:scale-105 active:scale-95 transition-all"
              >
                Tiếp tục
              </button>
           </div>
        </div>
      )}

      {loadingQuiz.active && (
        <div className="fixed inset-0 z-[200] bg-transparent flex flex-col items-center justify-center animate-fade-in pointer-events-none">
           <div className="mt-8 text-center bg-black/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/10">
             <h2 className="text-2xl font-black uppercase tracking-widest text-white italic animate-pulse">{loadingQuiz.stage}</h2>
           </div>
        </div>
      )}
      <header className="app-shell-header flex items-center backdrop-blur-xl p-2 px-4 justify-between z-50 border-b border-white/10 shrink-0 h-16 bg-background-dark/95">
        <div className="flex items-center gap-4 relative">
          <button onClick={() => setIsTopLeftMenuOpen(!isTopLeftMenuOpen)} className={`size-10 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10 ${isTopLeftMenuOpen ? 'rotate-90 text-primary border-primary' : ''}`}>
            <span className="material-symbols-outlined">settings</span>
          </button>
          {isTopLeftMenuOpen && (
            <div className="absolute top-12 left-0 w-64 bg-background-dark/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-slide-up">
              <div className="p-2 space-y-1">
                <button onClick={openRoleSelection} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${state.user_profile.role === 'TEACHER' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                  <span className="material-symbols-outlined text-xl">switch_account</span>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-black uppercase tracking-widest">Đổi không gian</span>
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Hiện tại: {state.user_profile.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'}</span>
                  </div>
                </button>
                {state.user_profile.role === 'STUDENT' && <button onClick={() => { setIsTopLeftMenuOpen(false); setIsRankOpen(true); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-300 transition-all">
                  <span className="material-symbols-outlined text-xl text-amber-500">leaderboard</span>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-black uppercase tracking-widest">Hạng</span>
                    <span className="text-[9px] font-bold text-gray-500 uppercase">{state.user_profile.rankPoints} điểm | {state.user_profile.rank}</span>
                  </div>
                </button>}
                {state.user_profile.role === 'STUDENT' && <button onClick={openStudentAssignments} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-300 transition-all">
                  <span className="material-symbols-outlined text-xl text-c4-green">assignment</span>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-black uppercase tracking-widest">Bài giao</span>
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Nhận bài | Nộp bài | Xem phản hồi</span>
                  </div>
                </button>}
                <button onClick={() => { setIsTopLeftMenuOpen(false); setIsTransferHubOpen(true); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-300 transition-all">
                  <span className="material-symbols-outlined text-xl text-c4-green">ios_share</span>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-black uppercase tracking-widest">Gói</span>
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Xuất | Nhập | Copy</span>
                  </div>
                </button>
                <button onClick={() => { openDocumentLibrary(); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-300 transition-all">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-sky-300 shrink-0" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 12h5M10 16h5"/></svg>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-black uppercase tracking-widest">Tài liệu HSG</span>
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Đề thi | Hướng dẫn chấm | DOCX</span>
                  </div>
                </button>
                <button onClick={cycleLayoutMode} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-300 transition-all">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><rect x="15.5" y="9" width="5" height="9" rx="1" fill="#05070a"/></svg>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-black uppercase">Giao diện {state.user_profile.preferences.layoutMode || 'AUTO'}</span>
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Chạm để đổi Auto → Mobile → Desktop</span>
                  </div>
                </button>
                <button onClick={toggleReadingTheme} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-300 transition-all">
                  {(state.user_profile.preferences.readingTheme || 'NIGHT') === 'NIGHT' ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-amber-300 shrink-0" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z"/></svg> : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-amber-300 shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>}
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-black uppercase">Đọc {(state.user_profile.preferences.readingTheme || 'NIGHT') === 'NIGHT' ? 'ban đêm' : 'ban ngày'}</span>
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Đổi nền đọc sáng hoặc tối</span>
                  </div>
                </button>
                <div className="h-px bg-white/5 my-1"></div>
                <div className="p-3">
                  <div className="flex items-center gap-3 mb-2"><div className="size-2 rounded-full bg-c4-green animate-pulse"></div><span className="text-[10px] font-black uppercase tracking-widest text-primary italic">Trạng thái</span></div>
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
              <h2 className="text-[11px] font-black uppercase text-white tracking-widest">ĐỊA AI | {state.user_profile.rank}</h2>
              {hasIdentity && <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter truncate max-w-[120px]">{state.user_profile.fullName}</span>}
            </div>
          </div>
        </div>
        <div className="flex-1 flex justify-center px-6">
          <div className="primary-navigation-shell flex items-center bg-white/5 rounded-2xl p-1 gap-1 border border-white/10">
            {state.user_profile.role === 'STUDENT' ? (
              <PrimaryNavigation active={activePrimaryDestination} onNavigate={navigatePrimary} />
            ) : (
              <>
                <span className="px-4 py-2 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest">Bảng giáo viên</span>
                <button onClick={openDocumentLibrary} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-sky-300">Tài liệu</button>
                <button onClick={() => setIsTransferHubOpen(true)} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white">Dữ liệu</button>
              </>
            )}
          </div>
        </div>
        <div className="app-display-controls flex items-center gap-2 shrink-0">
          <button type="button" onClick={cycleLayoutMode} className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center gap-2 text-[9px] font-black uppercase" title="Chuyển chế độ giao diện">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><rect x="15.5" y="9" width="5" height="9" rx="1" fill="#05070a"/></svg>
            <span>{state.user_profile.preferences.layoutMode || 'AUTO'}</span>
          </button>
          <button type="button" onClick={toggleReadingTheme} className="size-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center" title={(state.user_profile.preferences.readingTheme || 'NIGHT') === 'NIGHT' ? 'Chuyển sang đọc ban ngày' : 'Chuyển sang đọc ban đêm'}>
            {(state.user_profile.preferences.readingTheme || 'NIGHT') === 'NIGHT' ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z"/></svg> : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>}
          </button>
        </div>
      </header>
      <main className="app-shell-main flex-1 relative overflow-hidden bg-background-dark">
        <Suspense fallback={lazyFallback}>
          {quizSession ? <QuizView topic={state.topics.find(t => t.topic_id === quizSession.topic_id)!} session={quizSession} arenaStore={arenaStore} onCorrect={handleMidQuizCorrect} onEvidence={handleLearningEvidence} onBuildAdaptivePlan={handleBuildAdaptivePlan} onComplete={handleQuizComplete} onCancel={() => setQuizSession(null)} /> : (
            <>
              {state.user_profile.role === 'STUDENT' && state.view_mode === 'STUDENT_CANVAS' && (
                <>
                  <BubbleCanvas 
                    topics={state.topics} 
                    generatingTopicId={generatingTopicId} 
                    celebrationTopicId={celebrationTopicId} 
                    preferences={state.user_profile.preferences} 
                    arenaStore={arenaStore} 
                    onBubbleClick={openTopicWorkspace} 
                  />
                  <button 
                    onClick={() => setIsCanvasSettingsOpen(true)}
                    className={`dia8-canvas-settings-button fixed size-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 group ${isCanvasSettingsOpen ? 'opacity-0 pointer-events-none' : 'z-[110] opacity-100'}`}
                    aria-label="Mở công cụ tùy chỉnh"
                    title="Tùy chỉnh bong bóng và hình nền"
                    style={{
                      right: 'max(28px, env(safe-area-inset-right))',
                      bottom: 'calc(max(16px, env(safe-area-inset-bottom)) + 52px)'
                    } as React.CSSProperties}
                    >
                    <span className="material-symbols-outlined text-[30px] group-hover:rotate-90 transition-transform duration-500">settings</span>
                  </button>
                </>
              )}
              {state.user_profile.role === 'STUDENT' && state.view_mode === 'PRACTICE_HUB' && (
                <PracticeHub
                  topics={state.topics}
                  onOpenTopic={openTopicWorkspace}
                  onStartQuiz={(topicId, count, mode) => startQuiz(topicId, count, mode === 'arena', mode)}
                  onOpenArena={() => setState(prev => ({ ...prev, view_mode: 'ARENA_MODE' }))}
                  onOpenMonsterBattle={openMonsterBattle}
                  onOpenAdventure={openAdventureCommand}
                  gamificationEnabled={teacherCommandPolicy.gamificationEnabled}
                />
              )}
              {state.user_profile.role === 'STUDENT' && state.view_mode === 'PROFILE_CENTER' && (
                <ProfileCenter
                  userProfile={state.user_profile}
                  topics={state.topics}
                  sessionCount={state.session_log.length}
                  onUpdatePreference={handleUpdateUIPreference}
                  onOpenTransferHub={() => setIsTransferHubOpen(true)}
                  onOpenRank={() => setIsRankOpen(true)}
                  onChangeRole={openRoleSelection}
                  onResetLocalData={resetLocalData}
                />
              )}
              {state.user_profile.role === 'STUDENT' && state.view_mode === 'ADVENTURE_COMMAND' && (
                <AdventureCommandHub
                  topics={state.topics}
                  learnerId={learnerEvidenceId}
                  reduceMotion={Boolean(state.user_profile.preferences.reduceMotion)}
                  visualQuality={state.user_profile.preferences.visualQuality || 'LOW'}
                  onUpdateVisualQuality={(quality) => handleUpdateUIPreference('visualQuality', quality)}
                  onUpdateReduceMotion={(value) => handleUpdateUIPreference('reduceMotion', value)}
                  onOpenMonsterBattle={openMonsterBattle}
                  onOpenTopic={openTopicWorkspace}
                  onEvidence={handleLearningEvidence}
                  onBack={() => setState(prev => ({ ...prev, view_mode: 'PRACTICE_HUB' }))}
                />
              )}
              {state.user_profile.role === 'STUDENT' && state.view_mode === 'MONSTER_BATTLE' && (
                <MonsterBattleHub
                  topics={state.topics}
                  learnerId={learnerEvidenceId}
                  initialTopicId={monsterInitialTopicId}
                  allowAiProcessing={Boolean(state.user_profile.preferences.allowAiProcessing)}
                  reduceMotion={Boolean(state.user_profile.preferences.reduceMotion)}
                  onOpenTopic={openTopicWorkspace}
                  onEvidence={handleLearningEvidence}
                  onReward={handleMonsterReward}
                  onBack={() => setState(prev => ({ ...prev, view_mode: 'PRACTICE_HUB' }))}
                />
              )}
              {state.user_profile.role === 'STUDENT' && state.view_mode === 'ARENA_MODE' && <ArenaMode topics={state.topics} userProfile={state.user_profile} arenaStore={arenaStore} onStartMatch={(id) => startQuiz(id, 10, true, 'arena')} />}
              {state.user_profile.role === 'TEACHER' && <TeacherDashboard topics={state.topics} workspace={state.teacher_workspace || { classrooms: [], assignments: [] }} onChangeWorkspace={(teacher_workspace: TeacherWorkspace) => setState(prev => ({ ...prev, teacher_workspace }))} />}
            </>
          )}
        </Suspense>
      </main>
      <Suspense fallback={lazyFallback}>
        {isCanvasSettingsOpen && <CanvasOptionsDialog preferences={state.user_profile.preferences} onUpdate={handleUpdateUIPreference} onClose={() => setIsCanvasSettingsOpen(false)} />}
        {isDrawerOpen && selectedTopic && <TopicDrawer topic={selectedTopic} history={state.session_log.filter(e => e && e.topicId === selectedTopic.topic_id)} arenaStore={arenaStore} preferences={state.user_profile.preferences} onUpdatePreference={handleUpdateUIPreference} onClose={() => setIsDrawerOpen(false)} onStartLuyen10={() => startQuiz(selectedTopic.topic_id, 10, false, 'quick')} onStartLuyen25={() => startQuiz(selectedTopic.topic_id, 25, false, 'hsg')} onStartArena={() => startQuiz(selectedTopic.topic_id, 10, true, 'arena')} onStartVisual={() => startQuiz(selectedTopic.topic_id, 10, false, 'visual')} onStartManualQuiz={(rawJson) => startManualQuiz(selectedTopic.topic_id, rawJson)} onFetchInsights={(topic) => state.user_profile.preferences.allowAiProcessing ? GeminiService.fetchTopicInsights(topic) : Promise.resolve({ summary: topic.source_excerpt || topic.full_text, sources: [] })} onShowInfographic={(url, title) => setActiveInfographic({ url: url || selectedTopic.infographic_url || "", topicName: title || selectedTopic.keyword_label })} />}
        {state.user_profile.role === 'STUDENT' && teacherCommandPolicy.leaderboardEnabled && isRankOpen && <RankPanel topics={state.topics} isDemo={state.is_demo || false} userProfile={state.user_profile} onClose={() => setIsRankOpen(false)} onImportTopics={handleImportTopics} />}
        {state.user_profile.role === 'STUDENT' && isStudentAssignmentsOpen && <StudentAssignmentHub onClose={() => setIsStudentAssignmentsOpen(false)} />}
      </Suspense>
    </div>
  );
};
export default App;
