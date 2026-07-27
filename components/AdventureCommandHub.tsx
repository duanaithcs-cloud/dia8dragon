import React, { useEffect, useMemo, useState } from 'react';
import {
  AdaptiveEvidenceResult,
  CompassRecommendation,
  HybridSyncSettings,
  HybridSyncSummary,
  InventoryCatalogItem,
  InventoryOwnedRecord,
  JourneyChapterDefinition,
  JourneyProgressRecord,
  LearningEvidenceDraft,
  LearningRecommendationRecord,
  MonsterBattleProgressRecord,
  Question,
  QuizSession,
  TeacherCommandPolicy,
  Topic,
  VisualQuality,
} from '../types';
import { GeminiService } from '../services/geminiService';
import { createLearningEvidenceDraft, createLearningSessionId } from '../core/learningEvidence';
import {
  buildCompassRecommendations,
  completeChapterBoss,
  createDefaultJourneyProgress,
  reconcileJourneyProgress,
  SEVEN_ORB_CHAPTERS,
} from '../core/sevenOrbJourney';
import { buildMonsterCatalog, createDefaultMonsterProgress } from '../core/monsterBattle';
import { loadAllMonsterProgress } from '../services/monsterBattleService';
import { loadCompassData, loadJourneyProgress, saveJourneyProgress } from '../services/adventureService';
import {
  craftInventoryItem,
  loadInventoryCatalog,
  loadInventoryRecords,
  toggleInventoryEquipped,
} from '../services/inventoryService';
import {
  describeInventoryRequirement,
  inventoryRequirementMet,
  isInventoryItemUsable,
  resolveInventoryStatus,
} from '../core/inventory';
import {
  attemptHybridSync,
  clearOfflineTopicPack,
  downloadOfflineTopicPack,
  getHybridSyncSummary,
  loadHybridSyncSettings,
  saveHybridSyncSettings,
  setHybridSyncPolicy,
} from '../services/hybridSyncService';
import { loadTeacherCommandPolicy } from '../services/teacherCommandService';
import AdaptiveRepairCard from './AdaptiveRepairCard';
import MonsterGlyph from './MonsterGlyph';
import './adventure.css';

interface AdventureCommandHubProps {
  topics: Topic[];
  learnerId: string;
  reduceMotion: boolean;
  visualQuality: VisualQuality;
  onUpdateVisualQuality: (quality: VisualQuality) => void;
  onUpdateReduceMotion: (value: boolean) => void;
  onOpenMonsterBattle: (topicId: number) => void;
  onOpenTopic: (topicId: number) => void;
  onEvidence: (draft: LearningEvidenceDraft) => Promise<AdaptiveEvidenceResult>;
  onBack: () => void;
}

type AdventureTab = 'JOURNEY' | 'INVENTORY' | 'BASE' | 'VISUAL';

interface ActiveBossBattle {
  chapter: JourneyChapterDefinition;
  questions: Question[];
  sessionId: string;
  index: number;
  selectedAnswer: string;
  answers: Record<string, string>;
  correct: number;
  locked: boolean;
  startedAt: number;
  repairCard?: LearningRecommendationRecord;
  evidenceStatus: 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR';
}

const normalizeAnswer = (value: string): string => {
  const normalized = value.toUpperCase().trim();
  if (['TRUE', 'T', 'ĐÚNG', '1'].includes(normalized)) return 'TRUE';
  if (['FALSE', 'F', 'SAI', '0'].includes(normalized)) return 'FALSE';
  return normalized;
};

const formatPercent = (value: number): string => `${Math.round(value)}%`;
const formatDate = (value?: string): string => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Chưa có';

const categoryLabel: Record<InventoryCatalogItem['category'], string> = {
  VEHICLE: 'Phương tiện',
  DEVICE: 'Thiết bị học tập',
  STATION: 'Trạm',
  DECORATION: 'Trang trí',
};

const AdventureCommandHub: React.FC<AdventureCommandHubProps> = ({
  topics,
  learnerId,
  reduceMotion,
  visualQuality,
  onUpdateVisualQuality,
  onUpdateReduceMotion,
  onOpenMonsterBattle,
  onOpenTopic,
  onEvidence,
  onBack,
}) => {
  const [tab, setTab] = useState<AdventureTab>('JOURNEY');
  const [monsterProgress, setMonsterProgress] = useState<Record<number, MonsterBattleProgressRecord>>({});
  const [journey, setJourney] = useState<JourneyProgressRecord>(() => createDefaultJourneyProgress(learnerId));
  const [compass, setCompass] = useState<CompassRecommendation[]>([]);
  const [learningEventCount, setLearningEventCount] = useState(0);
  const [inventoryCatalog, setInventoryCatalog] = useState<InventoryCatalogItem[]>([]);
  const [inventoryRecords, setInventoryRecords] = useState<Record<string, InventoryOwnedRecord>>({});
  const [syncSummary, setSyncSummary] = useState<HybridSyncSummary | null>(null);
  const [syncSettings, setSyncSettings] = useState<HybridSyncSettings>(() => loadHybridSyncSettings());
  const [teacherPolicy, setTeacherPolicy] = useState<TeacherCommandPolicy>(() => loadTeacherCommandPolicy());
  const [selectedChapterId, setSelectedChapterId] = useState(1);
  const [activeBoss, setActiveBoss] = useState<ActiveBossBattle | null>(null);
  const [bossOutcome, setBossOutcome] = useState<{ passed: boolean; correct: number; chapter: JourneyChapterDefinition } | null>(null);
  const [storyChapter, setStoryChapter] = useState<JourneyChapterDefinition | null>(null);
  const [visualTopicId, setVisualTopicId] = useState(1);
  const [visualState, setVisualState] = useState<'SCOUTED' | 'ENGAGED' | 'SEALED'>('ENGAGED');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const catalog = useMemo(() => buildMonsterCatalog(topics), [topics]);

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [monsters, savedJourney, compassData, items, records, hybrid] = await Promise.all([
        loadAllMonsterProgress(learnerId),
        loadJourneyProgress(learnerId),
        loadCompassData(learnerId),
        loadInventoryCatalog(),
        loadInventoryRecords(learnerId),
        getHybridSyncSummary(),
      ]);
      const reconciled = reconcileJourneyProgress(savedJourney, monsters);
      setMonsterProgress(monsters);
      setJourney(reconciled);
      setSelectedChapterId(reconciled.currentChapterId || 1);
      setLearningEventCount(compassData.learningEventCount);
      setInventoryCatalog(items);
      setInventoryRecords(records);
      setSyncSummary(hybrid);
      setSyncSettings(hybrid.settings);
      const policy = loadTeacherCommandPolicy();
      setTeacherPolicy(policy);
      setCompass(buildCompassRecommendations(learnerId, topics, {
        skills: compassData.skills,
        errors: compassData.errors,
        reviews: compassData.reviews,
        monsterProgress: monsters,
        topicWeights: policy.topicWeights,
      }));
      if (JSON.stringify(reconciled) !== JSON.stringify(savedJourney)) await saveJourneyProgress(reconciled);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refreshAll(); }, [learnerId]);

  useEffect(() => {
    const handler = (event: Event) => setTeacherPolicy((event as CustomEvent<TeacherCommandPolicy>).detail || loadTeacherCommandPolicy());
    window.addEventListener('dia8:teacher-policy', handler);
    return () => window.removeEventListener('dia8:teacher-policy', handler);
  }, []);

  const sealedCount = useMemo(() => Object.values(monsterProgress).filter(item => item.status === 'SEALED').length, [monsterProgress]);
  const averageMastery = useMemo(() => {
    if (!topics.length) return 0;
    return topics.reduce((sum, topic) => sum + Math.max(0, Math.min(100, topic.mastery_percent || 0)), 0) / topics.length;
  }, [topics]);
  const currentChapter = SEVEN_ORB_CHAPTERS.find(chapter => chapter.id === selectedChapterId) || SEVEN_ORB_CHAPTERS[0];
  const currentChapterProgress = journey.chapters.find(chapter => chapter.chapterId === currentChapter.id);
  const ownedItemIds = useMemo(() => new Set(Object.values(inventoryRecords).filter(item => item.status === 'OWNED').map(item => item.itemId)), [inventoryRecords]);
  const inventoryMetrics = { sealedMonsters: sealedCount, recoveredOrbs: journey.collectedOrbIds.length, learningEvents: learningEventCount, averageMastery };
  const officialAssessmentMode = teacherPolicy.officialAssessmentMode || syncSettings.officialAssessmentMode;

  const startBossBattle = async (chapter: JourneyChapterDefinition) => {
    const progress = journey.chapters.find(item => item.chapterId === chapter.id);
    if (progress?.status !== 'BOSS_READY' || progress.bossStatus !== 'READY') {
      setMessage('Boss chương chỉ mở khi mọi yêu quái trong chương đã được phong ấn và chương trước đã hoàn thành.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const banks = await Promise.all(chapter.topicIds.map(async topicId => {
        const topic = topics.find(item => item.topic_id === topicId);
        if (!topic) return [] as Question[];
        return GeminiService.generateQuiz(topic, 10, false, 'hsg', false);
      }));
      const history = new Set(progress.bossQuestionHistory || []);
      const pools = banks.map(bank => [...bank.filter(question => !history.has(question.qid)), ...bank.filter(question => history.has(question.qid))]);
      const questions: Question[] = [];
      let cursor = 0;
      while (questions.length < 5 && pools.some(pool => pool.length)) {
        const pool = pools[cursor % pools.length];
        const candidate = pool.shift();
        if (candidate && !questions.some(question => question.qid === candidate.qid)) questions.push(candidate);
        cursor += 1;
      }
      if (questions.length < 5) throw new Error('Không đủ năm câu hợp lệ cho Boss chương.');
      setActiveBoss({
        chapter,
        questions,
        sessionId: createLearningSessionId(),
        index: 0,
        selectedAnswer: '',
        answers: {},
        correct: 0,
        locked: false,
        startedAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
        evidenceStatus: 'IDLE',
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không mở được Boss chương.');
    } finally {
      setLoading(false);
    }
  };

  const answerBossQuestion = async (answer: string) => {
    if (!activeBoss || activeBoss.locked || !answer.trim()) return;
    const question = activeBoss.questions[activeBoss.index];
    const isCorrect = normalizeAnswer(answer) === normalizeAnswer(question.answer_key);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const session: QuizSession = {
      session_id: activeBoss.sessionId,
      started_at: new Date().toISOString(),
      topic_id: Number(question.topicId || question.topic_id || activeBoss.chapter.topicIds[0]),
      type: 'MONSTER_BATTLE',
      practice_mode: 'monster',
      questions: activeBoss.questions,
      currentQuestionIndex: activeBoss.index,
      answers: activeBoss.answers,
    };
    const draft = createLearningEvidenceDraft({
      session,
      question,
      answer,
      responseTimeMs: Math.max(0, now - activeBoss.startedAt),
      confidence: 'MEDIUM',
      hintUsed: false,
    });
    setActiveBoss(previous => previous ? {
      ...previous,
      selectedAnswer: answer,
      locked: true,
      answers: { ...previous.answers, [question.qid]: answer },
      correct: previous.correct + (isCorrect ? 1 : 0),
      evidenceStatus: 'SAVING',
      repairCard: undefined,
    } : previous);
    try {
      const result = await onEvidence(draft);
      setActiveBoss(previous => previous ? { ...previous, evidenceStatus: 'SAVED', repairCard: result.repairCard } : previous);
    } catch {
      setActiveBoss(previous => previous ? { ...previous, evidenceStatus: 'ERROR' } : previous);
    }
  };

  const nextBossQuestion = async () => {
    if (!activeBoss || !activeBoss.locked || activeBoss.evidenceStatus === 'SAVING') return;
    if (activeBoss.index < activeBoss.questions.length - 1) {
      setActiveBoss(previous => previous ? {
        ...previous,
        index: previous.index + 1,
        selectedAnswer: '',
        locked: false,
        startedAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
        repairCard: undefined,
        evidenceStatus: 'IDLE',
      } : previous);
      return;
    }
    const next = completeChapterBoss(journey, activeBoss.chapter.id, activeBoss.correct, activeBoss.questions.map(question => question.qid));
    await saveJourneyProgress(next);
    setJourney(next);
    setBossOutcome({ passed: activeBoss.correct >= 4, correct: activeBoss.correct, chapter: activeBoss.chapter });
    setActiveBoss(null);
  };

  const craftItem = async (item: InventoryCatalogItem) => {
    if (!inventoryRequirementMet(item, inventoryMetrics, ownedItemIds)) return;
    const record = await craftInventoryItem(learnerId, item.id);
    setInventoryRecords(previous => ({ ...previous, [item.id]: record }));
    setMessage(`Đã chế tạo ${item.name} từ bằng chứng học tập; không sử dụng tiền thật hoặc phần thưởng ngẫu nhiên.`);
  };

  const equipItem = async (item: InventoryCatalogItem) => {
    const record = inventoryRecords[item.id];
    if (!record || !isInventoryItemUsable(item, record, { ...teacherPolicy, officialAssessmentMode })) {
      setMessage('Vật phẩm đang bị khóa bởi chế độ kiểm tra chính thức hoặc chính sách giáo viên.');
      return;
    }
    const next = await toggleInventoryEquipped(record);
    setInventoryRecords(previous => ({ ...previous, [item.id]: next }));
  };

  const updateSyncPolicy = (policy: HybridSyncSettings['policy']) => {
    const next = setHybridSyncPolicy(policy);
    setSyncSettings(next);
    setSyncSummary(previous => previous ? { ...previous, settings: next } : previous);
  };

  const toggleOfficialAssessment = () => {
    if (teacherPolicy.officialAssessmentMode) {
      setMessage('Giáo viên đang khóa chế độ kiểm tra chính thức; học sinh không thể tự tắt.');
      return;
    }
    const next = saveHybridSyncSettings({ ...syncSettings, officialAssessmentMode: !syncSettings.officialAssessmentMode });
    setSyncSettings(next);
  };

  const runManualSync = async () => {
    setMessage('Đang kiểm tra Hàng đợi đồng bộ…');
    const result = await attemptHybridSync(learnerId, { manual: true });
    setSyncSettings(result.settings);
    setMessage(result.message);
    setSyncSummary(await getHybridSyncSummary());
  };

  const downloadCurrentChapter = async () => {
    const result = await downloadOfflineTopicPack(currentChapter.topicIds);
    setMessage(`Đã lưu ${result.cached} tệp học cốt lõi; ${result.failed} tệp chưa tải được. PDF và DOCX nặng không được tải trước.`);
  };

  const clearOfflinePack = async () => {
    const removed = await clearOfflineTopicPack();
    setMessage(removed ? 'Đã dọn gói chuyên đề offline.' : 'Không có gói chuyên đề offline cần xóa.');
  };

  if (activeBoss) {
    const question = activeBoss.questions[activeBoss.index];
    const correct = activeBoss.locked && normalizeAnswer(activeBoss.selectedAnswer) === normalizeAnswer(question.answer_key);
    const options = question.type === 'TF' ? { TRUE: 'Đúng', FALSE: 'Sai' } : question.choices || {};
    return (
      <section className="orb-boss-screen" aria-labelledby="orb-boss-title">
        <header className="orb-boss-topbar">
          <button type="button" onClick={() => setActiveBoss(null)}>← Rút khỏi Boss</button>
          <div><span>{activeBoss.chapter.title}</span><strong>{activeBoss.chapter.bossName}</strong></div>
          <b>{activeBoss.index + 1}/5</b>
        </header>
        <main className="orb-boss-main">
          <div className="orb-boss-emblem" style={{ '--orb-color': activeBoss.chapter.orbColor } as React.CSSProperties} aria-hidden="true"><i/><i/><i/><span>◆</span></div>
          <article className="orb-boss-card">
            <p>Đòn tổng hợp liên chuyên đề</p>
            <h1 id="orb-boss-title">{question.prompt}</h1>
            {question.type === 'FILL' ? (
              <form onSubmit={event => { event.preventDefault(); void answerBossQuestion(activeBoss.selectedAnswer); }} className="orb-boss-fill">
                <input value={activeBoss.selectedAnswer} disabled={activeBoss.locked} onChange={event => setActiveBoss(previous => previous ? { ...previous, selectedAnswer: event.target.value } : previous)} placeholder="Nhập đáp án"/>
                <button disabled={activeBoss.locked || !activeBoss.selectedAnswer.trim()}>Xác nhận</button>
              </form>
            ) : (
              <div className="orb-boss-options">
                {Object.entries(options).map(([key, text]) => (
                  <button key={key} type="button" disabled={activeBoss.locked} onClick={() => void answerBossQuestion(key)} className={`${activeBoss.selectedAnswer === key ? 'is-selected' : ''} ${activeBoss.locked && normalizeAnswer(key) === normalizeAnswer(question.answer_key) ? 'is-correct' : ''}`}>
                    <span>{key}</span><strong>{text}</strong>
                  </button>
                ))}
              </div>
            )}
            {activeBoss.locked && (
              <div className={`orb-boss-feedback ${correct ? 'is-correct' : 'is-wrong'}`}>
                <strong>{correct ? 'Đã phá một tầng nhiễu của Boss' : 'Boss đã kích hoạt bẫy liên chuyên đề'}</strong>
                {!correct && <p>Đáp án đúng: {question.answer_key}{question.choices?.[question.answer_key] ? ` — ${question.choices[question.answer_key]}` : ''}</p>}
                {activeBoss.repairCard && <AdaptiveRepairCard task={activeBoss.repairCard} equivalentQueued={false}/>} 
                <button type="button" onClick={() => void nextBossQuestion()} disabled={activeBoss.evidenceStatus === 'SAVING'}>{activeBoss.index === 4 ? 'Kết thúc trận Boss' : 'Câu tiếp theo'}</button>
              </div>
            )}
          </article>
        </main>
      </section>
    );
  }

  const selectedVisualMonster = catalog.find(item => item.topicId === visualTopicId) || catalog[0];

  return (
    <section className="adventure-command" aria-labelledby="adventure-command-title">
      <div className="adventure-command-scroll">
        <header className="adventure-command-hero">
          <div>
            <button type="button" className="adventure-back" onClick={onBack}>← Luyện tập</button>
            <p>Dia8Dragon 3.5.0.2 · Hành trình local-first</p>
            <h1 id="adventure-command-title">Trạm Cơ Động và Hành trình Thất Ngọc</h1>
            <span>Game hóa có thể tắt; mạng có thể mất. Kiểm tra, chấm, vá lỗi, gợi ý học tiếp và lưu tiến độ vẫn hoạt động.</span>
          </div>
          <div className="adventure-command-summary">
            <div><span>Yêu quái phong ấn</span><strong>{sealedCount}/20</strong></div>
            <div><span>Ngọc thu hồi</span><strong>{journey.collectedOrbIds.length}/7</strong></div>
            <div><span>La Bàn</span><strong>{journey.compassCalibration}%</strong></div>
          </div>
        </header>

        <nav className="adventure-tabs" aria-label="Các trung tâm hành trình">
          {([
            ['JOURNEY', 'Hành trình', '7 chương và La Bàn'],
            ['INVENTORY', 'Hành Trang', 'Vật phẩm học tập'],
            ['BASE', 'Trạm Cơ Động', 'Offline và đồng bộ'],
            ['VISUAL', 'Tiến hóa hình ảnh', 'Chất lượng thấp/cao'],
          ] as Array<[AdventureTab, string, string]>).map(([id, label, description]) => (
            <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}><strong>{label}</strong><span>{description}</span></button>
          ))}
        </nav>

        {message && <div className="adventure-message"><span>{message}</span><button type="button" onClick={() => setMessage('')}>×</button></div>}
        {loading && <div className="adventure-loading">Đang hiệu chỉnh dữ liệu local-first…</div>}

        {!loading && tab === 'JOURNEY' && (
          <div className="journey-layout">
            <section className="orb-compass-panel">
              <div className="orb-ring" aria-label={`${journey.collectedOrbIds.length} trên 7 viên Ngọc đã thu hồi`}>
                {SEVEN_ORB_CHAPTERS.map(chapter => <i key={chapter.id} className={journey.collectedOrbIds.includes(chapter.id) ? 'is-collected' : ''} style={{ '--orb-color': chapter.orbColor } as React.CSSProperties}><span>{chapter.id}</span></i>)}
                <div><strong>{journey.compassCalibration}%</strong><span>La Bàn đã hiệu chỉnh</span></div>
              </div>
              <div className="compass-copy">
                <p>La Bàn Thất Ngọc</p>
                <h2>Ba tín hiệu học tiếp</h2>
                {compass.length ? compass.map(item => (
                  <button type="button" key={item.id} onClick={() => onOpenMonsterBattle(item.topicId)}>
                    <strong>{item.title}</strong><span>{item.reason}</span><small>{item.estimatedMinutes} phút · {item.offlineReady ? 'Làm offline' : 'Cần mạng'} · tin cậy {Math.round(item.confidence * 100)}%</small>
                  </button>
                )) : <div className="compass-empty">Chưa có đủ dữ liệu. Hãy hoàn thành một Quiz hoặc một trận yêu quái.</div>}
              </div>
            </section>

            <section className="chapter-map">
              <div className="chapter-map-head"><div><p>Bảy chương truy tìm Thất Ngọc</p><h2>Mỗi chương kết thúc bằng Boss tổng hợp</h2></div><span>{journey.frequencyFragments} Mảnh Tần Số</span></div>
              <div className="chapter-list">
                {SEVEN_ORB_CHAPTERS.map(chapter => {
                  const progress = journey.chapters.find(item => item.chapterId === chapter.id);
                  const isSelected = chapter.id === selectedChapterId;
                  return (
                    <button key={chapter.id} type="button" className={`${isSelected ? 'is-selected' : ''} is-${String(progress?.status || 'LOCKED').toLowerCase()}`} disabled={progress?.status === 'LOCKED'} onClick={() => setSelectedChapterId(chapter.id)}>
                      <span>{chapter.id}</span><div><strong>{chapter.title}</strong><small>{chapter.subtitle}</small></div><b>{progress?.recoveredOrb ? 'Đã có Ngọc' : progress?.status === 'BOSS_READY' ? 'Boss sẵn sàng' : progress?.status === 'LOCKED' ? 'Đang khóa' : 'Đang mở'}</b>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="chapter-detail" style={{ '--orb-color': currentChapter.orbColor } as React.CSSProperties}>
              <header><div><p>{currentChapter.title}</p><h2>{currentChapter.orbName}</h2><span>{currentChapter.clue}</span></div><div className={`chapter-orb ${currentChapterProgress?.recoveredOrb ? 'is-collected' : ''}`}>◆</div></header>
              <div className="chapter-monsters">
                {currentChapter.topicIds.map(topicId => {
                  const monster = catalog.find(item => item.topicId === topicId)!;
                  const progress = monsterProgress[topicId] || createDefaultMonsterProgress(learnerId, topicId);
                  return (
                    <article key={topicId}>
                      <MonsterGlyph monster={monster} size={112} animated={false} sealed={progress.status === 'SEALED'} state={progress.status === 'SEALED' ? 'SEALED' : progress.status === 'UNSEEN' ? 'SCOUTED' : 'ENGAGED'} quality={visualQuality}/>
                      <div><strong>{monster.name}</strong><span>{monster.topicLabel}</span><small>{progress.status === 'SEALED' ? 'Đã phong ấn' : progress.status === 'AWAITING_SEAL' ? 'Chờ kiểm chứng' : progress.status === 'IN_PROGRESS' ? 'Đang giao chiến' : 'Chưa trinh sát'}</small></div>
                      <button type="button" onClick={() => onOpenMonsterBattle(topicId)} disabled={!teacherPolicy.gamificationEnabled}>{progress.status === 'SEALED' ? 'Luyện lại' : 'Giao chiến'}</button>
                    </article>
                  );
                })}
              </div>
              <div className="chapter-boss">
                <div><p>Boss chương</p><h3>{currentChapter.bossName}</h3><span>{currentChapter.bossTrick}</span></div>
                <div className="chapter-boss-actions">
                  <button type="button" onClick={() => setStoryChapter(currentChapter)}>Đọc khung truyện</button>
                  <button type="button" className="is-primary" disabled={currentChapterProgress?.status !== 'BOSS_READY' || !teacherPolicy.gamificationEnabled} onClick={() => void startBossBattle(currentChapter)}>{currentChapterProgress?.recoveredOrb ? 'Boss đã bị đánh bại' : currentChapterProgress?.status === 'BOSS_READY' ? 'Đánh Boss chương' : 'Cần phong ấn đủ yêu quái'}</button>
                </div>
              </div>
            </section>
          </div>
        )}

        {!loading && tab === 'INVENTORY' && (
          <section className="inventory-hub">
            <header><div><p>Inventory & Learning Equipment 3.3.2</p><h2>Kho Hành Trang</h2><span>Không hộp quà ngẫu nhiên, không tiền thật, không tăng điểm thi và không phạt khi nghỉ.</span></div><div><strong>{ownedItemIds.size}/{inventoryCatalog.length}</strong><span>vật phẩm đã chế tạo</span></div></header>
            {officialAssessmentMode && <div className="assessment-lock-banner">Chế độ kiểm tra chính thức đang bật: thiết bị hỗ trợ tự khóa, vật phẩm trang trí vẫn an toàn.</div>}
            {(Object.keys(categoryLabel) as InventoryCatalogItem['category'][]).map(category => (
              <section key={category} className="inventory-category">
                <div className="inventory-category-head"><h3>{categoryLabel[category]}</h3><span>{inventoryCatalog.filter(item => item.category === category).length} vật phẩm</span></div>
                <div className="inventory-grid">
                  {inventoryCatalog.filter(item => item.category === category).map(item => {
                    const record = inventoryRecords[item.id];
                    const status = resolveInventoryStatus(item, record, inventoryMetrics, ownedItemIds);
                    const usable = isInventoryItemUsable(item, record, { ...teacherPolicy, officialAssessmentMode });
                    return (
                      <article key={item.id} className={`inventory-item is-${status.toLowerCase()} ${record?.equipped ? 'is-equipped' : ''}`}>
                        <div className="inventory-icon" aria-hidden="true">{status === 'LOCKED' ? <span>◇</span> : <svg viewBox="0 0 64 64"><use href={`/assets/game/equipment-sprite.svg#${item.iconId}`}/></svg>}</div>
                        <div className="inventory-copy"><p>{item.rarity === 'EPIC' ? 'Sử thi' : item.rarity === 'RARE' ? 'Hiếm' : 'Cơ bản'}</p><h4>{item.name}</h4><span>{item.description}</span><small>{item.learningBenefit}</small></div>
                        <div className="inventory-requirement">{status === 'OWNED' ? (usable ? 'Sẵn sàng sử dụng' : 'Đang bị khóa trong chế độ hiện tại') : describeInventoryRequirement(item)}</div>
                        {status === 'CRAFTABLE' && <button type="button" onClick={() => void craftItem(item)}>Chế tạo bằng bằng chứng học tập</button>}
                        {status === 'OWNED' && <button type="button" disabled={!usable} onClick={() => void equipItem(item)}>{record?.equipped ? 'Tháo trang bị' : usable ? 'Trang bị' : 'Đang khóa'}</button>}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </section>
        )}

        {!loading && tab === 'BASE' && (
          <section className="mobile-base">
            <header><div><p>Mobile Learning Base & Hybrid Sync 3.4.0</p><h2>Trạm Cơ Động</h2><span>Ghi local trước → Hàng đợi → có mạng mới gửi → chỉ xác nhận khi máy chủ phản hồi.</span></div><div className={syncSummary?.online ? 'is-online' : 'is-offline'}><strong>{syncSummary?.online ? 'Đang online' : 'Đang offline'}</strong><span>{syncSummary?.connectionType || 'unknown'}</span></div></header>
            <div className="mobile-base-grid">
              <article className="base-card">
                <p>Học cốt lõi offline</p><h3>Những việc không cần mạng</h3>
                <div className="capability-grid">{['Học chuyên đề','Quiz và chấm điểm','Phân loại lỗi','Thẻ vá lỗi','Gợi ý học tiếp','Trận yêu quái','Kho Hành Trang','Lịch kiểm chứng','Bài giao và bản nháp'].map(item => <span key={item}>✓ {item}</span>)}</div>
                <div className="base-actions"><button type="button" onClick={() => void downloadCurrentChapter()}>Tải chương hiện tại</button><button type="button" onClick={() => void clearOfflinePack()}>Dọn gói offline</button></div>
                <small>Không tải trước PDF SGK hoặc DOCX nặng. Chỉ JSON học cốt lõi và Quiz của chương được chọn.</small>
              </article>
              <article className="base-card">
                <p>Chính sách mạng</p><h3>Người học tự lựa chọn</h3>
                <div className="sync-policy-list">{([
                  ['WIFI_ONLY','Chỉ Wi-Fi'],['ANY_NETWORK','Wi-Fi hoặc dữ liệu di động'],['MANUAL','Đồng bộ thủ công'],['OFF','Không đồng bộ']
                ] as Array<[HybridSyncSettings['policy'],string]>).map(([policy,label]) => <button type="button" key={policy} className={syncSettings.policy === policy ? 'is-active' : ''} onClick={() => updateSyncPolicy(policy)}>{label}</button>)}</div>
                <button type="button" className="manual-sync" onClick={() => void runManualSync()}>Đồng bộ Hàng đợi ngay</button>
                <div className="sync-stats"><span>Chờ gửi <b>{syncSummary?.pending || 0}</b></span><span>Lỗi thử lại <b>{syncSummary?.failed || 0}</b></span><span>Đã xác nhận <b>{syncSummary?.confirmed || 0}</b></span></div>
                <small>{syncSettings.lastMessage || 'Chưa có lần đồng bộ.'} · Lần thành công: {formatDate(syncSettings.lastSuccessAt)}</small>
              </article>
              <article className="base-card">
                <p>An toàn kiểm tra</p><h3>Tự khóa thiết bị hỗ trợ</h3>
                <label className="base-toggle"><input type="checkbox" checked={officialAssessmentMode} disabled={teacherPolicy.officialAssessmentMode} onChange={toggleOfficialAssessment}/><span/><b>Chế độ kiểm tra chính thức</b></label>
                <ul><li>Thiết bị học tập không hiện đáp án.</li><li>Phương tiện và thiết bị tự khóa khi kiểm tra.</li><li>Tiến độ, bằng chứng và bài làm vẫn được lưu local.</li><li>Không xóa dữ liệu local khi chưa có xác nhận đồng bộ.</li></ul>
              </article>
            </div>
          </section>
        )}

        {!loading && tab === 'VISUAL' && selectedVisualMonster && (
          <section className="visual-evolution">
            <header><div><p>Visual Evolution 3.5.0</p><h2>Hai mươi chân dung · ba trạng thái</h2><span>SVG cục bộ, không video, không 3D; chỉ bản xem trước được chuyển động.</span></div><div className="visual-controls"><button type="button" className={visualQuality === 'LOW' ? 'is-active' : ''} onClick={() => onUpdateVisualQuality('LOW')}>Máy nhẹ</button><button type="button" className={visualQuality === 'HIGH' ? 'is-active' : ''} onClick={() => onUpdateVisualQuality('HIGH')}>Chất lượng cao</button><button type="button" className={reduceMotion ? 'is-active' : ''} onClick={() => onUpdateReduceMotion(!reduceMotion)}>{reduceMotion ? 'Đã giảm chuyển động' : 'Cho phép chuyển động'}</button></div></header>
            <div className="visual-preview">
              <div className="visual-monster-stage"><MonsterGlyph monster={selectedVisualMonster} size={280} animated={!reduceMotion} sealed={visualState === 'SEALED'} state={visualState} quality={visualQuality}/><div><p>{selectedVisualMonster.topicLabel}</p><h3>{selectedVisualMonster.name}</h3><span>{selectedVisualMonster.epithet}</span></div></div>
              <div className="visual-state-selector">{([['SCOUTED','Trinh sát'],['ENGAGED','Giao chiến'],['SEALED','Phong ấn']] as const).map(([state,label]) => <button type="button" key={state} className={visualState === state ? 'is-active' : ''} onClick={() => setVisualState(state)}>{label}</button>)}</div>
            </div>
            <div className="visual-gallery">{catalog.map(monster => <button type="button" key={monster.topicId} className={monster.topicId === visualTopicId ? 'is-active' : ''} onClick={() => setVisualTopicId(monster.topicId)}><MonsterGlyph monster={monster} size={92} animated={false} sealed={monsterProgress[monster.topicId]?.status === 'SEALED'} state={monsterProgress[monster.topicId]?.status === 'SEALED' ? 'SEALED' : 'SCOUTED'} quality="LOW"/><span>{monster.topicId}. {monster.name}</span></button>)}</div>
          </section>
        )}
      </div>

      {storyChapter && (
        <div className="chapter-story-overlay" role="dialog" aria-modal="true" aria-labelledby="chapter-story-title" onClick={() => setStoryChapter(null)}>
          <article onClick={event => event.stopPropagation()}>
            <div className="story-illustration" style={{ '--orb-color': storyChapter.orbColor } as React.CSSProperties}><span>◆</span><i/><i/></div>
            <p>Khung truyện ngắn · có thể bỏ qua</p><h2 id="chapter-story-title">{storyChapter.title}</h2>
            <blockquote>“La Bàn ghi nhận một tần số mới. {storyChapter.clue} Nhưng {storyChapter.bossName} đang dùng tuyệt chiêu: {storyChapter.bossTrick}”</blockquote>
            <div><button type="button" onClick={() => setStoryChapter(null)}>Bỏ qua</button><button type="button" className="is-primary" onClick={() => { setStoryChapter(null); const topicId = storyChapter.topicIds.find(id => monsterProgress[id]?.status !== 'SEALED') || storyChapter.topicIds[0]; onOpenMonsterBattle(topicId); }}>Tiếp tục hành trình</button></div>
          </article>
        </div>
      )}

      {bossOutcome && (
        <div className="boss-outcome-overlay" role="dialog" aria-modal="true" aria-labelledby="boss-outcome-title" onClick={() => setBossOutcome(null)}>
          <article onClick={event => event.stopPropagation()} style={{ '--orb-color': bossOutcome.chapter.orbColor } as React.CSSProperties}>
            <div className={`boss-outcome-orb ${bossOutcome.passed ? 'is-won' : ''}`}>◆</div>
            <p>{bossOutcome.passed ? 'Boss chương đã bị đánh bại' : 'Boss vẫn giữ được viên Ngọc'}</p>
            <h2 id="boss-outcome-title">{bossOutcome.chapter.orbName}</h2>
            <span>Đúng {bossOutcome.correct}/5 câu. {bossOutcome.passed ? 'La Bàn đã ghi nhận viên Ngọc mới.' : 'Cần đúng ít nhất 4/5 câu; các lỗi vừa phát hiện đã được đưa vào hệ thống vá lỗi.'}</span>
            <button type="button" onClick={() => setBossOutcome(null)}>Trở lại bản đồ chương</button>
          </article>
        </div>
      )}
    </section>
  );
};

export default AdventureCommandHub;
