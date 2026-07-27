import {
  AdaptiveEvidenceResult,
  AdaptiveSessionPlan,
  ErrorCaseRecord,
  LearningEvent,
  LearningEvidenceDraft,
  LearningRecommendationRecord,
  LearningReviewQueueRecord,
  QuestionIntelligenceRecord,
  QuestionIntelligenceSignal,
  Question,
  QuestionLifecycleStatus,
  QuestionPatchDraft,
  QuestionReportRecord,
  QuestionVersionRecord,
  StudentSkillRecord,
  SyncOutboxRecord,
} from '../types';
import {
  createRepairRecommendation,
  getErrorRepairProfile,
  updateAdaptiveSkillRecord,
} from '../core/adaptiveLearning';

export const LEARNING_DB_NAME = 'dia8dragon-learning-evidence';
export const LEARNING_DB_VERSION = 3;
export const LEARNING_DB_STORES = [
  'learning_events',
  'student_skills',
  'error_cases',
  'review_queue',
  'recommendations',
  'question_versions',
  'question_intelligence',
  'question_reports',
  'inventory',
  'story_progress',
  'sync_outbox',
] as const;

type LearningStoreName = typeof LEARNING_DB_STORES[number];

const APP_VERSION = '3.5.0.2';
let dbPromise: Promise<IDBDatabase> | null = null;

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
});

const transactionDone = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
  transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted.'));
});

const ensureIndex = (store: IDBObjectStore, name: string, keyPath: string | string[], options?: IDBIndexParameters) => {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, options);
};

const configureStore = (database: IDBDatabase, transaction: IDBTransaction, name: LearningStoreName): IDBObjectStore => {
  const store = database.objectStoreNames.contains(name)
    ? transaction.objectStore(name)
    : database.createObjectStore(name, { keyPath: 'id' });

  if (name === 'learning_events') {
    ensureIndex(store, 'learnerId', 'learnerId');
    ensureIndex(store, 'topicId', 'topicId');
    ensureIndex(store, 'questionId', 'questionId');
    ensureIndex(store, 'occurredAt', 'occurredAt');
    ensureIndex(store, 'sessionId', 'sessionId');
  } else if (name === 'student_skills') {
    ensureIndex(store, 'learnerId', 'learnerId');
    ensureIndex(store, 'topicId', 'topicId');
    ensureIndex(store, 'skillId', 'skillId');
    ensureIndex(store, 'learnerSkill', ['learnerId', 'skillId'], { unique: true });
    ensureIndex(store, 'nextReviewAt', 'nextReviewAt');
  } else if (name === 'error_cases') {
    ensureIndex(store, 'learnerId', 'learnerId');
    ensureIndex(store, 'questionId', 'questionId');
    ensureIndex(store, 'status', 'status');
    ensureIndex(store, 'errorTag', 'errorTag');
  } else if (name === 'review_queue') {
    ensureIndex(store, 'learnerId', 'learnerId');
    ensureIndex(store, 'status', 'status');
    ensureIndex(store, 'reason', 'reason');
    ensureIndex(store, 'questionId', 'questionId');
    ensureIndex(store, 'dueAt', 'dueAt');
  } else if (name === 'recommendations') {
    ensureIndex(store, 'learnerId', 'learnerId');
    ensureIndex(store, 'status', 'status');
    ensureIndex(store, 'topicId', 'topicId');
    ensureIndex(store, 'sessionId', 'sessionId');
    ensureIndex(store, 'type', 'type');
    ensureIndex(store, 'dueAt', 'dueAt');
  } else if (name === 'question_versions') {
    ensureIndex(store, 'questionId', 'questionId');
    ensureIndex(store, 'topicId', 'topicId');
    ensureIndex(store, 'status', 'status');
    ensureIndex(store, 'createdAt', 'createdAt');
  } else if (name === 'question_intelligence') {
    ensureIndex(store, 'questionId', 'questionId', { unique: true });
    ensureIndex(store, 'topicId', 'topicId');
    ensureIndex(store, 'status', 'status');
    ensureIndex(store, 'riskScore', 'riskScore');
    ensureIndex(store, 'updatedAt', 'updatedAt');
  } else if (name === 'question_reports') {
    ensureIndex(store, 'questionId', 'questionId');
    ensureIndex(store, 'topicId', 'topicId');
    ensureIndex(store, 'status', 'status');
    ensureIndex(store, 'category', 'category');
    ensureIndex(store, 'createdAt', 'createdAt');
  } else if (name === 'sync_outbox') {
    ensureIndex(store, 'status', 'status');
    ensureIndex(store, 'createdAt', 'createdAt');
    ensureIndex(store, 'entityType', 'entityType');
  }

  return store;
};

export const openLearningEvidenceDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable.'));

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(LEARNING_DB_NAME, LEARNING_DB_VERSION);
    let settled = false;
    request.onupgradeneeded = () => {
      const database = request.result;
      const transaction = request.transaction;
      if (!transaction) return;
      LEARNING_DB_STORES.forEach(name => configureStore(database, transaction, name));
    };
    request.onsuccess = () => {
      const database = request.result;
      if (settled) {
        database.close();
        return;
      }
      settled = true;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => {
      if (settled) return;
      settled = true;
      dbPromise = null;
      reject(request.error || new Error('Cannot open learning evidence database.'));
    };
    request.onblocked = () => {
      if (settled) return;
      settled = true;
      dbPromise = null;
      reject(new Error('Learning evidence database upgrade is blocked by another tab.'));
    };
  });

  return dbPromise;
};

export const initializeLearningEvidenceDb = async (): Promise<boolean> => {
  try {
    await openLearningEvidenceDb();
    return true;
  } catch (error) {
    console.warn('Adaptive Learning Engine is unavailable; the legacy progress flow remains active.', error);
    return false;
  }
};

const hashText = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const makeReviewQueueItems = (
  learnerId: string,
  draft: LearningEvidenceDraft,
  updatedSkills: StudentSkillRecord[],
  now: string
): LearningReviewQueueRecord[] => {
  const items: LearningReviewQueueRecord[] = [];
  if (draft.questionStatus !== 'STABLE') {
    items.push({
      id: `review-${draft.eventId}-status`, learnerId, eventId: draft.eventId, topicId: draft.topicId,
      questionId: draft.questionId, reason: 'QUESTION_STATUS', status: 'PENDING',
      detail: `Câu hỏi đang ở trạng thái ${draft.questionStatus}; chưa dùng làm kết luận chắc chắn.`,
      skillIds: draft.skillIds, createdAt: now, updatedAt: now,
    });
  }
  if (draft.timingFlag !== 'EXPECTED') {
    items.push({
      id: `review-${draft.eventId}-timing`, learnerId, eventId: draft.eventId, topicId: draft.topicId,
      questionId: draft.questionId, reason: 'TIMING_ANOMALY', status: 'PENDING',
      detail: `Thời gian phản hồi được phân loại ${draft.timingFlag}.`,
      skillIds: draft.skillIds, createdAt: now, updatedAt: now,
    });
  }
  if (draft.inferenceConfidence < 0.55) {
    items.push({
      id: `review-${draft.eventId}-confidence`, learnerId, eventId: draft.eventId, topicId: draft.topicId,
      questionId: draft.questionId, reason: 'LOW_INFERENCE_CONFIDENCE', status: 'PENDING',
      detail: `Độ chắc chắn nhận định ${Math.round(draft.inferenceConfidence * 100)}%.`,
      skillIds: draft.skillIds, createdAt: now, updatedAt: now,
    });
  }
  const earliestReview = [...updatedSkills].sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))[0];
  if (earliestReview) {
    items.push({
      id: `review-${draft.eventId}-${draft.isCorrect ? 'spaced' : 'repair'}`,
      learnerId,
      eventId: draft.eventId,
      topicId: draft.topicId,
      questionId: draft.questionId,
      reason: draft.isCorrect ? 'SPACED_REVIEW_DUE' : 'REPAIR_VERIFICATION',
      status: 'PENDING',
      detail: draft.isCorrect
        ? `Kiểm chứng độ bền của ${earliestReview.skillId}.`
        : `Kiểm chứng lại sau thẻ vá lỗi cho ${earliestReview.skillId}.`,
      dueAt: earliestReview.nextReviewAt,
      skillIds: draft.skillIds,
      createdAt: now,
      updatedAt: now,
    });
  }
  return items;
};

const openReadWriteTransaction = (database: IDBDatabase, storeNames: LearningStoreName[]): IDBTransaction => {
  try {
    return database.transaction(storeNames, 'readwrite', { durability: 'relaxed' });
  } catch (error) {
    console.warn('IndexedDB durability option is unavailable; using the compatible transaction mode.', error);
    return database.transaction(storeNames, 'readwrite');
  }
};

const readByIndex = async <T>(database: IDBDatabase, storeName: LearningStoreName, indexName: string, key: IDBValidKey): Promise<T[]> => {
  const transaction = database.transaction(storeName, 'readonly');
  const done = transactionDone(transaction);
  const result = await requestToPromise(transaction.objectStore(storeName).index(indexName).getAll(key)) as T[];
  await done;
  return result;
};

const mergeIntelligenceSignals = (...groups: QuestionIntelligenceSignal[][]): QuestionIntelligenceSignal[] => {
  const severityRank = { INFO: 1, WARNING: 2, CRITICAL: 3 } as const;
  const merged = new Map<string, QuestionIntelligenceSignal>();
  groups.flat().forEach(item => {
    const current = merged.get(item.code);
    if (!current || severityRank[item.severity] >= severityRank[current.severity]) merged.set(item.code, item);
  });
  return Array.from(merged.values());
};

const calculateQuestionIntelligence = (
  draft: LearningEvidenceDraft,
  event: LearningEvent,
  priorEvents: LearningEvent[],
  allSkillRecords: StudentSkillRecord[],
  reports: QuestionReportRecord[],
  existing: QuestionIntelligenceRecord | undefined,
  now: string,
): QuestionIntelligenceRecord => {
  const events = [...priorEvents, event];
  const wrongEvents = events.filter(item => !item.isCorrect);
  const answerCounts = wrongEvents.reduce<Record<string, number>>((counts, item) => {
    const key = String(item.finalAnswer || '').toUpperCase();
    if (key) counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const leadingWrong = Object.entries(answerCounts).sort((a, b) => b[1] - a[1])[0];
  const dynamicSignals: QuestionIntelligenceSignal[] = [];
  const openReports = reports.filter(item => item.status === 'OPEN');

  if (events.length >= 8 && wrongEvents.length / events.length >= 0.72) {
    dynamicSignals.push({
      code: 'DISTRACTOR_ANOMALY', severity: 'WARNING', label: 'Tỉ lệ sai bất thường',
      detail: `${wrongEvents.length}/${events.length} lượt làm sai (${Math.round(wrongEvents.length * 100 / events.length)}%). Cần kiểm tra độ rõ của câu và phương án nhiễu.`,
      evidence: leadingWrong ? `Phương án sai được chọn nhiều nhất: ${leadingWrong[0]} (${leadingWrong[1]} lượt).` : undefined,
    });
  }

  const masteredLearners = new Set(
    allSkillRecords.filter(item => item.masteryEstimate >= 75 && draft.skillIds.includes(item.skillId)).map(item => item.learnerId)
  );
  const strongWrong = wrongEvents.filter(item => masteredLearners.has(item.learnerId) && item.confidence === 'HIGH');
  const strongCounts = strongWrong.reduce<Record<string, number>>((counts, item) => {
    const key = String(item.finalAnswer || '').toUpperCase();
    if (key) counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const strongAlternative = Object.entries(strongCounts).sort((a, b) => b[1] - a[1])[0];
  if (strongAlternative && strongAlternative[1] >= 3 && strongAlternative[1] / Math.max(1, strongWrong.length) >= 0.6) {
    dynamicSignals.push({
      code: 'HIGH_PERFORMER_ALTERNATIVE', severity: 'CRITICAL', label: 'Người học thành thạo chọn đáp án khác',
      detail: `${strongAlternative[1]} lượt có mức thành thạo cao và tự tin cao cùng chọn ${strongAlternative[0]}.`,
      evidence: 'Tín hiệu này không tự đổi đáp án; câu được chuyển cho giáo viên kiểm định.',
    });
  }

  const byVersion = events.reduce<Record<string, LearningEvent[]>>((groups, item) => {
    (groups[item.questionVersion] ||= []).push(item);
    return groups;
  }, {});
  const currentVersionEvents = byVersion[draft.questionVersion] || [];
  const priorVersionGroups = Object.entries(byVersion).filter(([version]) => version !== draft.questionVersion && byVersion[version].length >= 5);
  if (currentVersionEvents.length >= 5 && priorVersionGroups.length) {
    const currentRate = currentVersionEvents.filter(item => !item.isCorrect).length / currentVersionEvents.length;
    const priorEventsFlat = priorVersionGroups.flatMap(([, items]) => items);
    const priorRate = priorEventsFlat.filter(item => !item.isCorrect).length / priorEventsFlat.length;
    if (currentRate - priorRate >= 0.25) {
      dynamicSignals.push({
        code: 'ERROR_RATE_SPIKE', severity: 'CRITICAL', label: 'Tỉ lệ sai tăng sau cập nhật',
        detail: `Phiên bản ${draft.questionVersion}: ${Math.round(currentRate * 100)}% sai; các phiên bản trước: ${Math.round(priorRate * 100)}% sai.`,
      });
    }
  }

  if (openReports.length >= 2) {
    dynamicSignals.push({
      code: 'TEACHER_REPORTS', severity: openReports.length >= 3 ? 'CRITICAL' : 'WARNING', label: 'Có nhiều báo cáo kiểm định',
      detail: `${openReports.length} báo cáo chưa xử lý từ giáo viên/học sinh.`,
      evidence: openReports.slice(0, 3).map(item => item.detail).join(' | '),
    });
  }

  const staticSignals = draft.questionIntelligence?.signals || [];
  const retainedTeacherSignals = (existing?.signals || []).filter(item => item.code === 'TEACHER_REPORTS');
  const signals = mergeIntelligenceSignals(staticSignals, retainedTeacherSignals, dynamicSignals);
  const weights = { INFO: 8, WARNING: 22, CRITICAL: 55 } as const;
  const riskScore = Math.min(100, Math.max(draft.questionIntelligence?.riskScore || 0, signals.reduce((sum, item) => sum + weights[item.severity], 0)));
  const hasTeacherDecision = Boolean(existing?.teacherDecisionAt);
  const automaticStatus = signals.some(item => item.severity === 'CRITICAL')
    ? 'SUSPECT'
    : signals.length || riskScore >= 25
      ? 'MONITOR'
      : 'STABLE';

  return {
    id: draft.questionId,
    questionId: draft.questionId,
    topicId: draft.topicId,
    status: hasTeacherDecision ? existing!.status : automaticStatus,
    baselineVersion: draft.questionVersion,
    activeVersionId: existing?.activeVersionId,
    replacementQuestionId: existing?.replacementQuestionId,
    riskScore,
    signals,
    attempts: events.length,
    wrongCount: wrongEvents.length,
    errorRate: Number((wrongEvents.length / Math.max(1, events.length)).toFixed(4)),
    leadingWrongAnswer: leadingWrong?.[0],
    reportCount: openReports.length,
    teacherNote: existing?.teacherNote,
    teacherDecisionAt: existing?.teacherDecisionAt,
    lastAnalyzedAt: now,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
};

export const recordLearningEvidence = async (learnerId: string, draft: LearningEvidenceDraft): Promise<AdaptiveEvidenceResult> => {
  const database = await openLearningEvidenceDb();
  const now = new Date().toISOString();
  const event: LearningEvent = {
    ...draft,
    learnerId,
    appVersion: APP_VERSION,
    savedAt: now,
  };
  const excludedFromAssessment = draft.assessmentImpact === 'EXCLUDED_QUESTION_REVIEW' || draft.questionStatus === 'QUARANTINED';
  const skillIds = draft.skillIds.map(skillId => `${learnerId}::${skillId}`);
  const versionId = draft.contentSnapshot ? `${draft.questionId}@${draft.questionVersion}` : null;
  const readStores: LearningStoreName[] = ['student_skills', 'error_cases', 'learning_events', 'question_intelligence', 'question_reports'];
  if (versionId) readStores.push('question_versions');
  const readTransaction = database.transaction(readStores, 'readonly');
  const readDone = transactionDone(readTransaction);
  const skillStoreRead = readTransaction.objectStore('student_skills');
  const currentSkills = await Promise.all(skillIds.map(id => requestToPromise(skillStoreRead.get(id)) as Promise<StudentSkillRecord | undefined>));
  const allSkillRecordsNested = await Promise.all(draft.skillIds.map(skillId => requestToPromise(skillStoreRead.index('skillId').getAll(skillId)) as Promise<StudentSkillRecord[]>));
  const currentVersion = versionId
    ? await requestToPromise(readTransaction.objectStore('question_versions').get(versionId)) as QuestionVersionRecord | undefined
    : undefined;
  const priorQuestionErrors = await requestToPromise(readTransaction.objectStore('error_cases').index('questionId').getAll(draft.questionId)) as ErrorCaseRecord[];
  const priorQuestionEvents = await requestToPromise(readTransaction.objectStore('learning_events').index('questionId').getAll(draft.questionId)) as LearningEvent[];
  const currentIntelligence = await requestToPromise(readTransaction.objectStore('question_intelligence').get(draft.questionId)) as QuestionIntelligenceRecord | undefined;
  const questionReports = await requestToPromise(readTransaction.objectStore('question_reports').index('questionId').getAll(draft.questionId)) as QuestionReportRecord[];
  await readDone;

  const updatedSkills = excludedFromAssessment
    ? currentSkills.filter((item): item is StudentSkillRecord => Boolean(item))
    : draft.skillIds.map((skillId, index) => updateAdaptiveSkillRecord(currentSkills[index], learnerId, skillId, draft, now));
  const repairCard = excludedFromAssessment ? undefined : createRepairRecommendation(learnerId, draft, now);
  const reviewQueueItems = makeReviewQueueItems(learnerId, draft, updatedSkills, now);
  const intelligenceRecord = calculateQuestionIntelligence(
    draft, event, priorQuestionEvents, allSkillRecordsNested.flat(), questionReports, currentIntelligence, now
  );

  const storeNames: LearningStoreName[] = [
    'learning_events', 'student_skills', 'error_cases', 'review_queue', 'recommendations',
    'question_versions', 'question_intelligence', 'sync_outbox'
  ];
  const transaction = openReadWriteTransaction(database, storeNames);
  transaction.objectStore('learning_events').put(event);
  if (!excludedFromAssessment) updatedSkills.forEach(skill => transaction.objectStore('student_skills').put(skill));

  if (!excludedFromAssessment && !draft.isCorrect) {
    draft.errorTags.forEach(errorTag => {
      const errorCase: ErrorCaseRecord = {
        id: `${draft.eventId}::${errorTag}`, learnerId, eventId: draft.eventId, topicId: draft.topicId,
        questionId: draft.questionId, questionVersion: draft.questionVersion, errorTag,
        status: 'OPEN', createdAt: draft.occurredAt, updatedAt: now,
      };
      transaction.objectStore('error_cases').put(errorCase);
    });
  } else if (!excludedFromAssessment && draft.isCorrect) {
    priorQuestionErrors
      .filter(item => item.learnerId === learnerId && item.status === 'OPEN')
      .forEach(item => transaction.objectStore('error_cases').put({ ...item, status: 'RESOLVED', updatedAt: now }));
  }

  reviewQueueItems.forEach(item => transaction.objectStore('review_queue').put(item));
  if (repairCard) transaction.objectStore('recommendations').put(repairCard);
  transaction.objectStore('question_intelligence').put(intelligenceRecord);

  const snapshot = draft.contentSnapshot;
  if (snapshot && versionId) {
    const questionVersion: QuestionVersionRecord = {
      id: versionId, questionId: draft.questionId, contentVersion: draft.questionVersion, topicId: draft.topicId,
      status: draft.questionStatus, checksum: hashText(JSON.stringify(snapshot)), prompt: snapshot.prompt,
      answerKey: snapshot.answerKey, choices: snapshot.choices, explanation: undefined,
      repairGuidance: draft.repairGuidance, sourceEvidence: draft.sourceEvidence,
      createdBy: currentVersion?.createdBy || 'SYSTEM', createdAt: currentVersion?.createdAt || draft.occurredAt,
      firstSeenAt: currentVersion?.firstSeenAt || draft.occurredAt, lastSeenAt: now,
    };
    transaction.objectStore('question_versions').put(questionVersion);
  }

  const outboxRecords: SyncOutboxRecord[] = [{
    id: `outbox-${draft.eventId}`, entityType: 'LEARNING_EVENT', entityId: draft.eventId, payload: event,
    status: 'PENDING', attempts: 0, createdAt: now, updatedAt: now,
  }, {
    id: `outbox-question-intelligence-${draft.questionId}-${Date.now()}`,
    entityType: 'QUESTION_INTELLIGENCE', entityId: draft.questionId, payload: intelligenceRecord,
    status: 'PENDING', attempts: 0, createdAt: now, updatedAt: now,
  }];
  if (repairCard) outboxRecords.push({
    id: `outbox-${repairCard.id}`, entityType: 'RECOMMENDATION', entityId: repairCard.id, payload: repairCard,
    status: 'PENDING', attempts: 0, createdAt: now, updatedAt: now,
  });
  outboxRecords.forEach(item => transaction.objectStore('sync_outbox').put(item));

  await transactionDone(transaction);
  return {
    event,
    repairCard,
    updatedSkills,
    equivalentQuestionSuggested: Boolean(repairCard && intelligenceRecord.status === 'STABLE'),
  };
};

const taskPriorityScore = (task: LearningRecommendationRecord): number => {
  const priority = task.priority === 'HIGH' ? 30 : task.priority === 'MEDIUM' ? 20 : 10;
  return priority + task.confidence * 10 + (task.type === 'REPAIR' ? 8 : task.type === 'VERIFY' ? 4 : 0);
};

export const buildAdaptiveSessionPlan = async (
  learnerId: string,
  sessionId: string,
  topicId: number
): Promise<AdaptiveSessionPlan> => {
  const database = await openLearningEvidenceDb();
  const [sessionEvents, learnerTasks, learnerSkills, learnerReviews] = await Promise.all([
    readByIndex<LearningEvent>(database, 'learning_events', 'sessionId', sessionId),
    readByIndex<LearningRecommendationRecord>(database, 'recommendations', 'learnerId', learnerId),
    readByIndex<StudentSkillRecord>(database, 'student_skills', 'learnerId', learnerId),
    readByIndex<LearningReviewQueueRecord>(database, 'review_queue', 'learnerId', learnerId),
  ]);
  const now = new Date().toISOString();
  const topicSkills = learnerSkills.filter(skill => skill.topicId === topicId && skill.skillId !== 'QUESTION-VALIDATION');
  const pendingSessionRepairs = learnerTasks
    .filter(task => task.topicId === topicId && task.type === 'REPAIR' && task.status === 'PENDING' && task.sessionId === sessionId)
    .sort((a, b) => taskPriorityScore(b) - taskPriorityScore(a) || b.createdAt.localeCompare(a.createdAt));
  const tasks: LearningRecommendationRecord[] = [];

  if (pendingSessionRepairs[0]) tasks.push(pendingSessionRepairs[0]);

  const weakestSkill = [...topicSkills].sort((a, b) => a.masteryEstimate - b.masteryEstimate || b.attempts - a.attempts)[0];
  if (weakestSkill) {
    tasks.push({
      id: `plan-${sessionId}-strengthen-${weakestSkill.skillId}`,
      learnerId,
      topicId,
      sourceEventId: sessionEvents.at(-1)?.eventId || sessionId,
      sessionId,
      type: 'STRENGTHEN',
      title: 'Củng cố kỹ năng yếu nhất',
      reason: `${weakestSkill.skillId} đang có mức thành thạo ước tính ${Math.round(weakestSkill.masteryEstimate)}%. ${weakestSkill.explanation}`,
      action: 'Làm một cụm 5–10 câu cùng kỹ năng, tăng dần độ khó và dừng khi xuất hiện hai câu đúng liên tiếp.',
      estimatedMinutes: weakestSkill.masteryEstimate < 50 ? 10 : 7,
      offlineReady: true,
      completionCriteria: 'Đạt ít nhất 70% và có 2 câu đúng liên tiếp không dùng gợi ý.',
      priority: weakestSkill.masteryEstimate < 45 ? 'HIGH' : 'MEDIUM',
      confidence: weakestSkill.evidenceConfidence,
      targetSkillIds: [weakestSkill.skillId],
      errorTag: weakestSkill.lastErrorTag,
      status: 'PENDING',
      createdAt: now,
      dueAt: now,
    });
  }

  const dueReview = learnerReviews
    .filter(item => item.topicId === topicId && item.status === 'PENDING' && Boolean(item.dueAt))
    .sort((a, b) => (a.dueAt || '').localeCompare(b.dueAt || ''))[0];
  const verificationSkill = dueReview?.skillIds?.length
    ? topicSkills.find(skill => dueReview.skillIds?.includes(skill.skillId)) || weakestSkill
    : [...topicSkills].sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))[0];
  if (verificationSkill) {
    const dueAt = dueReview?.dueAt || verificationSkill.nextReviewAt;
    tasks.push({
      id: `plan-${sessionId}-verify-${verificationSkill.skillId}`,
      learnerId,
      topicId,
      sourceEventId: dueReview?.eventId || sessionEvents.at(-1)?.eventId || sessionId,
      sessionId,
      type: 'VERIFY',
      title: dueAt <= now ? 'Kiểm chứng kiến thức đến hạn' : 'Hẹn kiểm chứng độ bền',
      reason: `${verificationSkill.skillId} cần được kiểm tra lại để xác nhận kiến thức không chỉ đúng trong một lần.`,
      action: 'Làm 3 câu mới cùng kỹ năng, không xem lại đáp án cũ trước khi bắt đầu.',
      estimatedMinutes: 5,
      offlineReady: true,
      completionCriteria: 'Đúng ít nhất 2/3 câu; câu sai sẽ tạo thẻ vá lỗi mới.',
      priority: dueAt <= now ? 'HIGH' : 'LOW',
      confidence: verificationSkill.evidenceConfidence,
      targetSkillIds: [verificationSkill.skillId],
      errorTag: verificationSkill.lastErrorTag,
      status: 'PENDING',
      createdAt: now,
      dueAt,
    });
  }

  const uniqueTasks = tasks
    .filter((task, index, all) => all.findIndex(item => item.type === task.type) === index)
    .sort((a, b) => taskPriorityScore(b) - taskPriorityScore(a))
    .slice(0, 3);

  if (uniqueTasks.length) {
    const transaction = database.transaction('recommendations', 'readwrite');
    uniqueTasks.forEach(task => transaction.objectStore('recommendations').put(task));
    await transactionDone(transaction);
  }

  return { sessionId, topicId, generatedAt: now, tasks: uniqueTasks };
};


export interface QuestionIntelligenceSnapshot {
  records: QuestionIntelligenceRecord[];
  reports: QuestionReportRecord[];
  versions: QuestionVersionRecord[];
}

const getAllFromStore = async <T>(database: IDBDatabase, storeName: LearningStoreName): Promise<T[]> => {
  const transaction = database.transaction(storeName, 'readonly');
  const done = transactionDone(transaction);
  const rows = await requestToPromise(transaction.objectStore(storeName).getAll()) as T[];
  await done;
  return rows;
};

export const getQuestionIntelligenceSnapshot = async (): Promise<QuestionIntelligenceSnapshot> => {
  const database = await openLearningEvidenceDb();
  const [records, reports, versions] = await Promise.all([
    getAllFromStore<QuestionIntelligenceRecord>(database, 'question_intelligence'),
    getAllFromStore<QuestionReportRecord>(database, 'question_reports'),
    getAllFromStore<QuestionVersionRecord>(database, 'question_versions'),
  ]);
  return { records, reports, versions };
};

export interface QuestionLifecycleDecisionInput {
  questionId: string;
  topicId: number;
  baselineVersion: string;
  status: QuestionLifecycleStatus;
  teacherNote?: string;
  replacementQuestionId?: string;
}

export const saveQuestionLifecycleDecision = async (input: QuestionLifecycleDecisionInput): Promise<QuestionIntelligenceRecord> => {
  const database = await openLearningEvidenceDb();
  const readTransaction = database.transaction('question_intelligence', 'readonly');
  const readDone = transactionDone(readTransaction);
  const existing = await requestToPromise(readTransaction.objectStore('question_intelligence').get(input.questionId)) as QuestionIntelligenceRecord | undefined;
  await readDone;
  const now = new Date().toISOString();
  const record: QuestionIntelligenceRecord = {
    id: input.questionId,
    questionId: input.questionId,
    topicId: input.topicId,
    status: input.status,
    baselineVersion: input.baselineVersion,
    activeVersionId: existing?.activeVersionId,
    replacementQuestionId: input.replacementQuestionId || existing?.replacementQuestionId,
    riskScore: existing?.riskScore || 0,
    signals: existing?.signals || [],
    attempts: existing?.attempts || 0,
    wrongCount: existing?.wrongCount || 0,
    errorRate: existing?.errorRate || 0,
    leadingWrongAnswer: existing?.leadingWrongAnswer,
    reportCount: existing?.reportCount || 0,
    teacherNote: input.teacherNote?.trim() || existing?.teacherNote,
    teacherDecisionAt: now,
    lastAnalyzedAt: existing?.lastAnalyzedAt || now,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  const transaction = openReadWriteTransaction(database, ['question_intelligence', 'sync_outbox']);
  transaction.objectStore('question_intelligence').put(record);
  transaction.objectStore('sync_outbox').put({
    id: `outbox-question-decision-${input.questionId}-${Date.now()}`,
    entityType: 'QUESTION_INTELLIGENCE', entityId: input.questionId, payload: record,
    status: 'PENDING', attempts: 0, createdAt: now, updatedAt: now,
  } satisfies SyncOutboxRecord);
  await transactionDone(transaction);
  return record;
};

export interface SubmitQuestionReportInput {
  questionId: string;
  topicId: number;
  reporterRole?: QuestionReportRecord['reporterRole'];
  category: QuestionReportRecord['category'];
  detail: string;
}

export const submitQuestionReport = async (input: SubmitQuestionReportInput): Promise<QuestionReportRecord> => {
  const database = await openLearningEvidenceDb();
  const now = new Date().toISOString();
  const report: QuestionReportRecord = {
    id: `question-report-${input.questionId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    questionId: input.questionId,
    topicId: input.topicId,
    reporterRole: input.reporterRole || 'TEACHER',
    category: input.category,
    detail: input.detail.trim(),
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
  };
  const transaction = openReadWriteTransaction(database, ['question_reports', 'sync_outbox']);
  transaction.objectStore('question_reports').put(report);
  transaction.objectStore('sync_outbox').put({
    id: `outbox-${report.id}`, entityType: 'QUESTION_REPORT', entityId: report.id, payload: report,
    status: 'PENDING', attempts: 0, createdAt: now, updatedAt: now,
  } satisfies SyncOutboxRecord);
  await transactionDone(transaction);
  return report;
};

export const resolveQuestionReport = async (reportId: string, status: 'RESOLVED' | 'DISMISSED'): Promise<void> => {
  const database = await openLearningEvidenceDb();
  const readTransaction = database.transaction('question_reports', 'readonly');
  const readDone = transactionDone(readTransaction);
  const existing = await requestToPromise(readTransaction.objectStore('question_reports').get(reportId)) as QuestionReportRecord | undefined;
  await readDone;
  if (!existing) return;
  const transaction = database.transaction('question_reports', 'readwrite');
  transaction.objectStore('question_reports').put({ ...existing, status, updatedAt: new Date().toISOString() });
  await transactionDone(transaction);
};

const nextPatchVersion = (baseline: string, versions: QuestionVersionRecord[]): string => {
  const parts = baseline.split('.').map(value => Number.parseInt(value, 10));
  const major = Number.isFinite(parts[0]) ? parts[0] : 1;
  const minor = Number.isFinite(parts[1]) ? parts[1] : 0;
  const patches = versions
    .map(item => item.contentVersion.split('.').map(value => Number.parseInt(value, 10)))
    .filter(parts => parts[0] === major && parts[1] === minor)
    .map(parts => Number.isFinite(parts[2]) ? parts[2] : 0);
  return `${major}.${minor}.${Math.max(0, ...patches) + 1}`;
};

const buildPatchedRepairGuidance = (question: Question, draft: QuestionPatchDraft) => {
  const correctText = draft.choices?.[draft.answerKey] || draft.answerKey;
  const existing = question.repairGuidance;
  if (!existing) return undefined;
  return {
    ...existing,
    version: `question-patch-${Date.now()}`,
    knowledgeAnchor: draft.sourceEvidence?.text || draft.explanation || existing.knowledgeAnchor,
    correctAnswerKey: draft.answerKey,
    correctAnswerText: correctText,
    optionFeedback: Object.keys(draft.choices || {}).reduce<Record<string, string>>((feedback, key) => {
      feedback[key] = key === draft.answerKey
        ? `Phương án ${key} đúng theo bản vá đã được giáo viên duyệt: ${correctText}.`
        : `Phương án ${key} không phù hợp với căn cứ của bản vá; đáp án được duyệt là ${draft.answerKey}: ${correctText}.`;
      return feedback;
    }, {}),
    sourceLabel: draft.sourceEvidence?.source || existing.sourceLabel,
    sourceExcerpt: draft.sourceEvidence?.text || existing.sourceExcerpt,
  };
};

export const approveQuestionPatch = async (draft: QuestionPatchDraft, currentQuestion: Question): Promise<QuestionVersionRecord> => {
  const database = await openLearningEvidenceDb();
  const [versions, currentRecord] = await Promise.all([
    readByIndex<QuestionVersionRecord>(database, 'question_versions', 'questionId', draft.questionId),
    (async () => {
      const transaction = database.transaction('question_intelligence', 'readonly');
      const done = transactionDone(transaction);
      const record = await requestToPromise(transaction.objectStore('question_intelligence').get(draft.questionId)) as QuestionIntelligenceRecord | undefined;
      await done;
      return record;
    })(),
  ]);
  const now = new Date().toISOString();
  const contentVersion = nextPatchVersion(currentQuestion.contentVersion || currentRecord?.baselineVersion || '1.0.0', versions);
  const id = `${draft.questionId}@${contentVersion}`;
  const parentVersionId = currentRecord?.activeVersionId || `${draft.questionId}@${currentQuestion.contentVersion || '1.0.0'}`;
  const snapshot = { prompt: draft.prompt, answerKey: draft.answerKey, choices: draft.choices, explanation: draft.explanation };
  const version: QuestionVersionRecord = {
    id,
    questionId: draft.questionId,
    contentVersion,
    topicId: draft.topicId,
    status: draft.targetStatus || 'PATCHED',
    checksum: hashText(JSON.stringify(snapshot)),
    prompt: draft.prompt,
    answerKey: draft.answerKey,
    choices: draft.choices,
    explanation: draft.explanation,
    repairGuidance: buildPatchedRepairGuidance(currentQuestion, draft),
    sourceEvidence: draft.sourceEvidence,
    parentVersionId,
    changeSummary: draft.changeSummary.trim(),
    createdBy: 'TEACHER',
    createdAt: now,
    firstSeenAt: now,
    lastSeenAt: now,
  };
  const record: QuestionIntelligenceRecord = {
    id: draft.questionId,
    questionId: draft.questionId,
    topicId: draft.topicId,
    status: draft.targetStatus || 'PATCHED',
    baselineVersion: currentRecord?.baselineVersion || currentQuestion.contentVersion || '1.0.0',
    activeVersionId: id,
    replacementQuestionId: currentRecord?.replacementQuestionId,
    riskScore: currentRecord?.riskScore || currentQuestion.questionIntelligence?.riskScore || 0,
    signals: currentRecord?.signals || currentQuestion.questionIntelligence?.signals || [],
    attempts: currentRecord?.attempts || 0,
    wrongCount: currentRecord?.wrongCount || 0,
    errorRate: currentRecord?.errorRate || 0,
    leadingWrongAnswer: currentRecord?.leadingWrongAnswer,
    reportCount: currentRecord?.reportCount || 0,
    teacherNote: draft.changeSummary.trim(),
    teacherDecisionAt: now,
    lastAnalyzedAt: currentRecord?.lastAnalyzedAt || now,
    createdAt: currentRecord?.createdAt || now,
    updatedAt: now,
  };
  const transaction = openReadWriteTransaction(database, ['question_versions', 'question_intelligence', 'sync_outbox']);
  transaction.objectStore('question_versions').put(version);
  transaction.objectStore('question_intelligence').put(record);
  transaction.objectStore('sync_outbox').put({
    id: `outbox-question-patch-${id}`, entityType: 'QUESTION_PATCH', entityId: id, payload: version,
    status: 'PENDING', attempts: 0, createdAt: now, updatedAt: now,
  } satisfies SyncOutboxRecord);
  await transactionDone(transaction);
  return version;
};

export const rollbackQuestionToBaseline = async (questionId: string): Promise<QuestionIntelligenceRecord | null> => {
  const database = await openLearningEvidenceDb();
  const readTransaction = database.transaction('question_intelligence', 'readonly');
  const readDone = transactionDone(readTransaction);
  const record = await requestToPromise(readTransaction.objectStore('question_intelligence').get(questionId)) as QuestionIntelligenceRecord | undefined;
  await readDone;
  if (!record) return null;
  const now = new Date().toISOString();
  const updated: QuestionIntelligenceRecord = {
    ...record,
    activeVersionId: undefined,
    status: record.signals.some(item => item.severity === 'CRITICAL') ? 'SUSPECT' : record.signals.length ? 'MONITOR' : 'STABLE',
    teacherNote: `Khôi phục về bản gốc ${record.baselineVersion}.`,
    teacherDecisionAt: now,
    updatedAt: now,
  };
  const transaction = database.transaction('question_intelligence', 'readwrite');
  transaction.objectStore('question_intelligence').put(updated);
  await transactionDone(transaction);
  return updated;
};

export const rollbackQuestionPatch = async (questionId: string, targetVersionId: string): Promise<QuestionIntelligenceRecord | null> => {
  const database = await openLearningEvidenceDb();
  const transactionRead = database.transaction(['question_intelligence', 'question_versions'], 'readonly');
  const readDone = transactionDone(transactionRead);
  const record = await requestToPromise(transactionRead.objectStore('question_intelligence').get(questionId)) as QuestionIntelligenceRecord | undefined;
  const version = await requestToPromise(transactionRead.objectStore('question_versions').get(targetVersionId)) as QuestionVersionRecord | undefined;
  await readDone;
  if (!record || !version || version.questionId !== questionId) return null;
  const now = new Date().toISOString();
  const updated: QuestionIntelligenceRecord = {
    ...record,
    activeVersionId: targetVersionId,
    status: version.status === 'QUARANTINED' || version.status === 'REPLACED' ? 'MONITOR' : version.status,
    teacherNote: `Khôi phục về phiên bản ${version.contentVersion}.`,
    teacherDecisionAt: now,
    updatedAt: now,
  };
  const transaction = database.transaction('question_intelligence', 'readwrite');
  transaction.objectStore('question_intelligence').put(updated);
  await transactionDone(transaction);
  return updated;
};

export interface QuestionRuntimePolicy {
  records: Record<string, QuestionIntelligenceRecord>;
  versions: Record<string, QuestionVersionRecord>;
}

export const loadQuestionRuntimePolicy = async (): Promise<QuestionRuntimePolicy> => {
  try {
    const database = await openLearningEvidenceDb();
    const [records, versions] = await Promise.all([
      getAllFromStore<QuestionIntelligenceRecord>(database, 'question_intelligence'),
      getAllFromStore<QuestionVersionRecord>(database, 'question_versions'),
    ]);
    return {
      records: Object.fromEntries(records.map(item => [item.questionId, item])),
      versions: Object.fromEntries(versions.map(item => [item.id, item])),
    };
  } catch (error) {
    console.warn('Question Intelligence policy is unavailable; using the audited static bank.', error);
    return { records: {}, versions: {} };
  }
};

export const countLearningRecords = async (): Promise<Record<LearningStoreName, number>> => {
  const database = await openLearningEvidenceDb();
  const result = {} as Record<LearningStoreName, number>;
  for (const storeName of LEARNING_DB_STORES) {
    const transaction = database.transaction(storeName, 'readonly');
    result[storeName] = await requestToPromise(transaction.objectStore(storeName).count());
  }
  return result;
};

export interface LearningEvidenceExportSnapshot {
  schema: 'dia8dragon-learning-evidence.v1';
  databaseVersion: number;
  exportedAt: string;
  stores: Partial<Record<LearningStoreName, unknown[]>>;
}

export const exportLearningEvidenceData = async (): Promise<LearningEvidenceExportSnapshot> => {
  const database = await openLearningEvidenceDb();
  const stores: Partial<Record<LearningStoreName, unknown[]>> = {};
  for (const storeName of LEARNING_DB_STORES) {
    const transaction = database.transaction(storeName, 'readonly');
    const done = transactionDone(transaction);
    stores[storeName] = await requestToPromise(transaction.objectStore(storeName).getAll());
    await done;
  }
  return {
    schema: 'dia8dragon-learning-evidence.v1',
    databaseVersion: LEARNING_DB_VERSION,
    exportedAt: new Date().toISOString(),
    stores,
  };
};

export const importLearningEvidenceData = async (snapshot: LearningEvidenceExportSnapshot | undefined): Promise<void> => {
  if (!snapshot || snapshot.schema !== 'dia8dragon-learning-evidence.v1' || !snapshot.stores) return;
  const database = await openLearningEvidenceDb();
  const transaction = database.transaction([...LEARNING_DB_STORES], 'readwrite');
  for (const storeName of LEARNING_DB_STORES) {
    const records = snapshot.stores[storeName];
    if (!Array.isArray(records)) continue;
    const store = transaction.objectStore(storeName);
    records.forEach(record => {
      if (record && typeof record === 'object' && 'id' in record) store.put(record);
    });
  }
  await transactionDone(transaction);
};

export const deleteLearningEvidenceDb = async (): Promise<void> => {
  if (dbPromise) {
    try {
      const database = await dbPromise;
      database.close();
    } catch {
      // Ignore an unavailable database during a user-requested reset.
    }
    dbPromise = null;
  }
  if (typeof indexedDB === 'undefined') return;
  await new Promise<void>(resolve => {
    const request = indexedDB.deleteDatabase(LEARNING_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
};
