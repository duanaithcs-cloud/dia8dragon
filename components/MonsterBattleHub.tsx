import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AdaptiveEvidenceResult,
  LearningEvidenceDraft,
  LearningRecommendationRecord,
  MonsterBattleDefinition,
  MonsterBattlePhase,
  MonsterBattleProgressRecord,
  MonsterBattleReward,
  Question,
  QuizSession,
  Topic,
} from '../types';
import { GeminiService } from '../services/geminiService';
import { createLearningEvidenceDraft, createLearningSessionId } from '../core/learningEvidence';
import {
  buildMonsterCatalog,
  calculateInitialBattleOutcome,
  calculateReplayOutcome,
  calculateSealOutcome,
  createDefaultMonsterProgress,
  formatSealCountdown,
  isSealReady,
  phaseForQuestionIndex,
  phaseInstruction,
  phaseLabel,
  selectMonsterBattleQuestions,
} from '../core/monsterBattle';
import { loadAllMonsterProgress, saveMonsterProgress } from '../services/monsterBattleService';
import MonsterGlyph from './MonsterGlyph';
import AdaptiveRepairCard from './AdaptiveRepairCard';

interface MonsterBattleHubProps {
  topics: Topic[];
  learnerId: string;
  initialTopicId?: number;
  allowAiProcessing: boolean;
  reduceMotion?: boolean;
  onOpenTopic: (topicId: number) => void;
  onEvidence: (draft: LearningEvidenceDraft) => Promise<AdaptiveEvidenceResult>;
  onReward: (reward: MonsterBattleReward) => void;
  onBack: () => void;
}

type BattleMode = 'INITIAL' | 'SEAL' | 'REPLAY';

interface ActiveBattle {
  sessionId: string;
  topic: Topic;
  monster: MonsterBattleDefinition;
  progress: MonsterBattleProgressRecord;
  mode: BattleMode;
  questions: Question[];
  index: number;
  answers: Record<string, string>;
  correctByPhase: Partial<Record<MonsterBattlePhase, number>>;
  selectedAnswer: string;
  locked: boolean;
  repairCard?: LearningRecommendationRecord;
  evidenceStatus: 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR';
  startedAt: number;
}

interface BattleOutcome {
  monster: MonsterBattleDefinition;
  progress: MonsterBattleProgressRecord;
  reward: MonsterBattleReward;
}

const EVIDENCE_TIMEOUT_MS = 5_000;

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Learning evidence save timed out.')), timeoutMs);
  promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
});

const normalizeAnswer = (value: string): string => {
  const normalized = value.toUpperCase().trim();
  if (['TRUE', 'T', 'ĐÚNG', '1'].includes(normalized)) return 'TRUE';
  if (['FALSE', 'F', 'SAI', '0'].includes(normalized)) return 'FALSE';
  return normalized;
};

const DefenseLayers = ({ progress }: { progress: MonsterBattleProgressRecord }) => {
  const layers = [
    { key: 'knowledgeArmor', label: 'Giáp Kiến thức', icon: '◇', value: progress.layers.knowledgeArmor },
    { key: 'skillShield', label: 'Khiên Kỹ năng', icon: '⬡', value: progress.layers.skillShield },
    { key: 'memorySeal', label: 'Phong ấn Ghi nhớ', icon: '✦', value: progress.layers.memorySeal },
  ] as const;
  return (
    <div className="monster-defense-layers" aria-label="Ba lớp phòng thủ của yêu quái">
      {layers.map(layer => (
        <div key={layer.key} className={`monster-defense-layer ${layer.value <= 0 ? 'is-broken' : ''}`}>
          <span className="monster-defense-icon" aria-hidden="true">{layer.icon}</span>
          <div>
            <span>{layer.label}</span>
            <strong>{layer.value <= 0 ? 'Đã phá' : `${layer.value}%`}</strong>
          </div>
          <div className="monster-defense-segments" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <i key={index} className={index < Math.ceil(layer.value / 20) ? 'is-active' : ''} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const statusLabel = (progress: MonsterBattleProgressRecord): string => {
  if (progress.status === 'SEALED') return 'Đã chinh phục';
  if (progress.status === 'AWAITING_SEAL') return isSealReady(progress) ? 'Đến hạn phong ấn' : 'Chờ kiểm chứng';
  if (progress.status === 'IN_PROGRESS') return 'Đang giao chiến';
  return 'Chưa trinh sát';
};

const MonsterBattleHub: React.FC<MonsterBattleHubProps> = ({
  topics,
  learnerId,
  initialTopicId,
  allowAiProcessing,
  reduceMotion,
  onOpenTopic,
  onEvidence,
  onReward,
  onBack,
}) => {
  const catalog = useMemo(() => buildMonsterCatalog(topics), [topics]);
  const [selectedTopicId, setSelectedTopicId] = useState(initialTopicId || catalog[0]?.topicId || 1);
  const [progressMap, setProgressMap] = useState<Record<number, MonsterBattleProgressRecord>>({});
  const [activeBattle, setActiveBattle] = useState<ActiveBattle | null>(null);
  const [outcome, setOutcome] = useState<BattleOutcome | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadAllMonsterProgress(learnerId)
      .then(rows => { if (mounted) setProgressMap(rows); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [learnerId]);

  useEffect(() => {
    if (initialTopicId) setSelectedTopicId(initialTopicId);
  }, [initialTopicId]);

  const selectedMonster = catalog.find(item => item.topicId === selectedTopicId) || catalog[0];
  const selectedTopic = topics.find(item => item.topic_id === selectedMonster?.topicId) || topics[0];
  const selectedProgress = selectedMonster
    ? progressMap[selectedMonster.topicId] || createDefaultMonsterProgress(learnerId, selectedMonster.topicId)
    : undefined;

  const sealedCount = catalog.filter(item => progressMap[item.topicId]?.status === 'SEALED').length;
  const awaitingCount = catalog.filter(item => progressMap[item.topicId]?.status === 'AWAITING_SEAL').length;

  const startBattle = async () => {
    if (!selectedMonster || !selectedTopic || !selectedProgress) return;
    setMessage('');
    setOutcome(null);
    const readyForSeal = isSealReady(selectedProgress);
    if (selectedProgress.status === 'AWAITING_SEAL' && !readyForSeal) {
      setMessage(`Phong ấn cần câu mới ở phiên sau. ${formatSealCountdown(selectedProgress.sealDueAt)}.`);
      return;
    }
    setLoading(true);
    try {
      const mode: BattleMode = readyForSeal ? 'SEAL' : selectedProgress.status === 'SEALED' ? 'REPLAY' : 'INITIAL';
      const bank = await GeminiService.generateQuiz(selectedTopic, 25, false, 'hsg', allowAiProcessing);
      const questions = selectMonsterBattleQuestions(bank, selectedProgress, mode === 'SEAL' ? 'SEAL' : 'INITIAL');
      if (questions.length < (mode === 'SEAL' ? 3 : 10)) {
        setMessage('Chưa đủ câu hỏi hợp lệ để mở trận. Hãy kiểm tra Trung tâm kiểm định câu.');
        return;
      }
      setActiveBattle({
        sessionId: createLearningSessionId(),
        topic: selectedTopic,
        monster: selectedMonster,
        progress: selectedProgress,
        mode,
        questions,
        index: 0,
        answers: {},
        correctByPhase: {},
        selectedAnswer: '',
        locked: false,
        evidenceStatus: 'IDLE',
        startedAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      });
    } catch (error) {
      console.error('Monster battle could not start:', error);
      setMessage('Không mở được trận. Dữ liệu cũ vẫn an toàn; hãy thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const answerQuestion = async (answer: string) => {
    if (!activeBattle || activeBattle.locked || !answer.trim()) return;
    const question = activeBattle.questions[activeBattle.index];
    const phase: MonsterBattlePhase = activeBattle.mode === 'SEAL' ? 'SEAL' : phaseForQuestionIndex(activeBattle.index);
    const isCorrect = normalizeAnswer(answer) === normalizeAnswer(question.answer_key);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const nextCorrect = {
      ...activeBattle.correctByPhase,
      [phase]: (activeBattle.correctByPhase[phase] || 0) + (isCorrect ? 1 : 0),
    };
    const quizSession: QuizSession = {
      session_id: activeBattle.sessionId,
      started_at: new Date().toISOString(),
      topic_id: activeBattle.topic.topic_id,
      type: 'MONSTER_BATTLE',
      practice_mode: 'monster',
      questions: activeBattle.questions,
      currentQuestionIndex: activeBattle.index,
      answers: activeBattle.answers,
    };
    const draft = createLearningEvidenceDraft({
      session: quizSession,
      question,
      answer,
      responseTimeMs: Math.max(0, now - activeBattle.startedAt),
      confidence: 'MEDIUM',
      hintUsed: false,
    });

    setActiveBattle(previous => previous ? {
      ...previous,
      selectedAnswer: answer,
      locked: true,
      answers: { ...previous.answers, [question.qid]: answer },
      correctByPhase: nextCorrect,
      evidenceStatus: 'SAVING',
      repairCard: undefined,
    } : previous);

    try {
      const result = await withTimeout(onEvidence(draft), EVIDENCE_TIMEOUT_MS);
      setActiveBattle(previous => previous ? { ...previous, repairCard: result.repairCard, evidenceStatus: 'SAVED' } : previous);
    } catch (error) {
      console.warn('Monster battle evidence could not be saved:', error);
      setActiveBattle(previous => previous ? { ...previous, evidenceStatus: 'ERROR' } : previous);
    }
  };

  const finishBattle = async (battle: ActiveBattle) => {
    const questionIds = battle.questions.map(question => question.qid);
    const correctCount = Object.values(battle.correctByPhase).reduce((sum, value) => sum + (value || 0), 0);
    const nextProgress = battle.mode === 'SEAL'
      ? calculateSealOutcome(battle.progress, battle.correctByPhase.SEAL || 0, questionIds)
      : battle.mode === 'REPLAY'
        ? calculateReplayOutcome(battle.progress, battle.correctByPhase, questionIds)
        : calculateInitialBattleOutcome(battle.progress, battle.correctByPhase, questionIds);
    await saveMonsterProgress(nextProgress);
    const sealed = nextProgress.status === 'SEALED';
    const reward: MonsterBattleReward = {
      topicId: battle.topic.topic_id,
      correctCount,
      totalQuestions: battle.questions.length,
      masteryDelta: sealed ? 5 : Number((correctCount * (battle.mode === 'REPLAY' ? 0.45 : 0.6)).toFixed(1)),
      rankPoints: correctCount * (battle.mode === 'SEAL' ? 15 : battle.mode === 'REPLAY' ? 6 : 8) + (sealed ? 80 : battle.mode !== 'REPLAY' && nextProgress.status === 'AWAITING_SEAL' ? 35 : 0),
      sealed,
      phase: battle.mode === 'SEAL' ? 'SEAL' : 'COUNTERATTACK',
    };
    setProgressMap(previous => ({ ...previous, [nextProgress.topicId]: nextProgress }));
    onReward(reward);
    setOutcome({ monster: battle.monster, progress: nextProgress, reward });
    setActiveBattle(null);
  };

  const nextQuestion = () => {
    if (!activeBattle || !activeBattle.locked || activeBattle.evidenceStatus === 'SAVING') return;
    if (activeBattle.index >= activeBattle.questions.length - 1) {
      void finishBattle(activeBattle);
      return;
    }
    setActiveBattle(previous => previous ? {
      ...previous,
      index: previous.index + 1,
      selectedAnswer: '',
      locked: false,
      repairCard: undefined,
      evidenceStatus: 'IDLE',
      startedAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    } : previous);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (activeBattle) {
    const question = activeBattle.questions[activeBattle.index];
    const phase: MonsterBattlePhase = activeBattle.mode === 'SEAL' ? 'SEAL' : phaseForQuestionIndex(activeBattle.index);
    const correct = activeBattle.locked && normalizeAnswer(activeBattle.selectedAnswer) === normalizeAnswer(question.answer_key);
    const answerOptions = question.type === 'TF'
      ? { TRUE: 'Đúng', FALSE: 'Sai' }
      : question.choices || {};
    const provisionalProgress: MonsterBattleProgressRecord = {
      ...activeBattle.progress,
      phase,
      layers: {
        knowledgeArmor: phase === 'SCOUT'
          ? Math.min(activeBattle.progress.layers.knowledgeArmor, (activeBattle.correctByPhase.SCOUT || 0) >= 2 ? 0 : Math.max(34, 100 - Math.round(((activeBattle.correctByPhase.SCOUT || 0) / 3) * 100)))
          : activeBattle.progress.layers.knowledgeArmor,
        skillShield: ['BREAK_ARMOR', 'COUNTERATTACK'].includes(phase)
          ? Math.min(activeBattle.progress.layers.skillShield, (activeBattle.correctByPhase.BREAK_ARMOR || 0) >= 2 ? 0 : Math.max(34, 100 - Math.round(((activeBattle.correctByPhase.BREAK_ARMOR || 0) / 3) * 100)))
          : activeBattle.progress.layers.skillShield,
        memorySeal: phase === 'SEAL'
          ? Math.min(activeBattle.progress.layers.memorySeal, (activeBattle.correctByPhase.SEAL || 0) >= 2 ? 0 : Math.max(20, 100 - Math.round(((activeBattle.correctByPhase.SEAL || 0) / 3) * 70)))
          : activeBattle.progress.layers.memorySeal,
      },
    };
    return (
      <section className="monster-battle-screen" aria-labelledby="monster-battle-question-title">
        <header className="monster-battle-topbar">
          <button type="button" onClick={() => setActiveBattle(null)} className="monster-back-button">← Rút lui</button>
          <div className="monster-phase-route" aria-label="Các pha trận đấu">
            {(['SCOUT', 'BREAK_ARMOR', 'COUNTERATTACK', 'SEAL'] as MonsterBattlePhase[]).map(item => (
              <span key={item} className={`${item === phase ? 'is-current' : ''} ${activeBattle.progress.phaseResults[item] ? 'is-done' : ''}`}>{phaseLabel[item]}</span>
            ))}
          </div>
          <span className="monster-question-count">{activeBattle.index + 1}/{activeBattle.questions.length}</span>
        </header>

        <div className="monster-battle-scroll">
          <div className="monster-battle-stage">
            <div className={`monster-stage-portrait ${correct ? 'is-hit' : activeBattle.locked ? 'is-countering' : ''}`}>
              <MonsterGlyph monster={activeBattle.monster} size={220} animated={!reduceMotion} sealed={activeBattle.progress.status === 'SEALED'} />
              <div className="monster-stage-title"><span>{activeBattle.monster.name}</span><strong>{activeBattle.monster.epithet}</strong></div>
            </div>
            <div className="monster-stage-status">
              <p>{phaseLabel[phase]}</p>
              <h1>{phaseInstruction[phase]}</h1>
              <DefenseLayers progress={provisionalProgress} />
            </div>
          </div>

          <article className="monster-question-card">
            <div className="monster-question-meta"><span>{activeBattle.topic.keyword_label}</span><strong>{question.skill_tag} · độ khó {question.difficulty}</strong></div>
            <h2 id="monster-battle-question-title">{question.prompt}</h2>
            {question.type === 'FILL' ? (
              <form onSubmit={event => { event.preventDefault(); void answerQuestion(activeBattle.selectedAnswer); }} className="monster-fill-answer">
                <input ref={inputRef} value={activeBattle.selectedAnswer} disabled={activeBattle.locked} onChange={event => setActiveBattle(previous => previous ? { ...previous, selectedAnswer: event.target.value } : previous)} placeholder="Nhập đáp án" />
                <button type="submit" disabled={activeBattle.locked || !activeBattle.selectedAnswer.trim()}>Xác nhận</button>
              </form>
            ) : (
              <div className="monster-answer-grid">
                {Object.entries(answerOptions).map(([key, text]) => {
                  const isSelected = activeBattle.selectedAnswer === key;
                  const isKey = normalizeAnswer(key) === normalizeAnswer(question.answer_key);
                  return (
                    <button
                      type="button"
                      key={key}
                      disabled={activeBattle.locked}
                      onClick={() => void answerQuestion(key)}
                      className={`${isSelected ? 'is-selected' : ''} ${activeBattle.locked && isKey ? 'is-correct' : ''} ${activeBattle.locked && isSelected && !isKey ? 'is-wrong' : ''}`}
                    >
                      <span>{key}</span><strong>{text}</strong>
                    </button>
                  );
                })}
              </div>
            )}

            {activeBattle.locked && (
              <div className={`monster-answer-feedback ${correct ? 'is-correct' : 'is-wrong'}`} role="status">
                <strong>{correct ? 'Đòn đánh chính xác' : 'Yêu quái đã dùng tuyệt chiêu gây nhiễu'}</strong>
                <p>{correct ? 'Bằng chứng này làm suy yếu đúng lớp phòng thủ của pha hiện tại.' : `Đáp án đúng: ${question.answer_key}${question.choices?.[question.answer_key] ? ` — ${question.choices[question.answer_key]}` : ''}.`}</p>
                {activeBattle.repairCard && <AdaptiveRepairCard task={activeBattle.repairCard} equivalentQueued={false} />}
                <button type="button" onClick={nextQuestion} disabled={activeBattle.evidenceStatus === 'SAVING'}>
                  {activeBattle.index >= activeBattle.questions.length - 1 ? 'Kết thúc pha chiến đấu' : 'Tiếp tục chiến đấu'}
                </button>
              </div>
            )}
          </article>
        </div>
      </section>
    );
  }

  if (outcome) {
    return (
      <section className="monster-outcome-screen" aria-labelledby="monster-outcome-title">
        <div className="monster-outcome-card">
          <MonsterGlyph monster={outcome.monster} size={230} animated={!reduceMotion} sealed={outcome.progress.status === 'SEALED'} />
          <p>{outcome.progress.status === 'SEALED' ? 'Phong ấn hoàn tất' : outcome.progress.status === 'AWAITING_SEAL' ? 'Ba lớp đã bị xuyên phá' : 'Trận chiến còn dang dở'}</p>
          <h1 id="monster-outcome-title">{outcome.monster.name}</h1>
          <DefenseLayers progress={outcome.progress} />
          <div className="monster-reward-row">
            <span>Đúng <strong>{outcome.reward.correctCount}/{outcome.reward.totalQuestions}</strong></span>
            <span>Năng lực <strong>+{outcome.reward.masteryDelta}%</strong></span>
            <span>Điểm hạng <strong>+{outcome.reward.rankPoints}</strong></span>
          </div>
          {outcome.progress.status === 'AWAITING_SEAL' && <p className="monster-seal-note">Phong ấn chỉ mở bằng câu mới ở phiên sau. {formatSealCountdown(outcome.progress.sealDueAt)}.</p>}
          <div className="monster-outcome-actions">
            <button type="button" onClick={() => setOutcome(null)}>Về bản đồ yêu quái</button>
            <button type="button" onClick={onBack}>Về Luyện tập</button>
          </div>
        </div>
      </section>
    );
  }

  if (!selectedMonster || !selectedTopic || !selectedProgress) return null;

  return (
    <section className="monster-hub" aria-labelledby="monster-hub-title">
      <div className="monster-hub-scroll">
        <header className="monster-hub-header">
          <div>
            <button type="button" onClick={onBack} className="monster-back-button">← Luyện tập</button>
            <p>Thirty Three Monsters Battle Core</p>
            <h1 id="monster-hub-title">33 chuyên đề · 33 yêu quái nhận thức</h1>
            <span>Mỗi trận kiểm tra kiến thức, kỹ năng và độ bền ghi nhớ. Không có vật phẩm trả tiền, không mất tiến độ khi nghỉ.</span>
          </div>
          <div className="monster-hub-summary">
            <div><span>Đã phong ấn</span><strong>{sealedCount}/{catalog.length}</strong></div>
            <div><span>Chờ kiểm chứng</span><strong>{awaitingCount}</strong></div>
            <div><span>Hoạt động offline</span><strong>100%</strong></div>
          </div>
        </header>

        <div className="monster-hub-layout">
          <aside className="monster-roster" aria-label="Danh sách 33 yêu quái">
            {catalog.map(monster => {
              const progress = progressMap[monster.topicId] || createDefaultMonsterProgress(learnerId, monster.topicId);
              const active = monster.topicId === selectedTopicId;
              return (
                <button type="button" key={monster.topicId} className={`${active ? 'is-active' : ''} status-${progress.status.toLowerCase()}`} onClick={() => { setSelectedTopicId(monster.topicId); setMessage(''); }}>
                  <MonsterGlyph monster={monster} size={62} animated={false} sealed={progress.status === 'SEALED'} />
                  <span><strong>{monster.topicId}. {monster.name}</strong><small>{monster.topicLabel}</small></span>
                  <em>{statusLabel(progress)}</em>
                </button>
              );
            })}
          </aside>

          <main className="monster-focus-card" style={{ '--monster-a': selectedMonster.accent, '--monster-b': selectedMonster.accent2 } as React.CSSProperties}>
            <div className="monster-focus-visual"><MonsterGlyph monster={selectedMonster} size={270} animated={!reduceMotion} sealed={selectedProgress.status === 'SEALED'} /></div>
            <div className="monster-focus-copy">
              <p>Yêu quái chuyên đề {selectedMonster.topicId}</p>
              <h2>{selectedMonster.name}</h2>
              <h3>{selectedMonster.epithet}</h3>
              <div className="monster-signature-trick"><span>Tuyệt chiêu gây nhầm lẫn</span><strong>{selectedMonster.signatureTrick}</strong></div>
              <DefenseLayers progress={selectedProgress} />
              <div className="monster-phase-cards">
                {(['SCOUT', 'BREAK_ARMOR', 'COUNTERATTACK', 'SEAL'] as MonsterBattlePhase[]).map((phase, index) => (
                  <article key={phase} className={`${selectedProgress.phase === phase ? 'is-current' : ''} ${selectedProgress.phaseResults[phase] ? 'is-done' : ''}`}>
                    <span>{index + 1}</span><div><strong>{phaseLabel[phase]}</strong><small>{phaseInstruction[phase]}</small></div>
                  </article>
                ))}
              </div>
              {message && <div className="monster-hub-message" role="status">{message}</div>}
              <div className="monster-focus-actions">
                <button type="button" className="monster-primary-action" onClick={() => void startBattle()} disabled={loading || (selectedProgress.status === 'AWAITING_SEAL' && !isSealReady(selectedProgress))}>
                  {loading ? 'Đang nạp...' : selectedProgress.status === 'SEALED' ? 'Tái đấu củng cố' : selectedProgress.status === 'AWAITING_SEAL' ? (isSealReady(selectedProgress) ? 'Mở pha Phong ấn' : formatSealCountdown(selectedProgress.sealDueAt)) : selectedProgress.status === 'IN_PROGRESS' ? 'Tiếp tục phá phòng thủ' : 'Bắt đầu Trinh sát'}
                </button>
                <button type="button" onClick={() => onOpenTopic(selectedTopic.topic_id)}>Ôn Trọng tâm trước trận</button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
};

export default MonsterBattleHub;
