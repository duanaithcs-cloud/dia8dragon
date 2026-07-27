import {
  ErrorCaseRecord,
  InventoryOwnedRecord,
  JourneyProgressRecord,
  LearningReviewQueueRecord,
  MonsterBattleProgressRecord,
  QuestionIntelligenceRecord,
  StudentSkillRecord,
  TeacherCommandPolicy,
} from '../types';
import { openLearningEvidenceDb } from './learningEvidenceDb';

export const TEACHER_COMMAND_POLICY_KEY = 'dia8dragon-teacher-command-policy';

export const createDefaultTeacherCommandPolicy = (): TeacherCommandPolicy => ({
  version: 'teacher-command-v1',
  gamificationEnabled: true,
  leaderboardEnabled: true,
  equipmentEnabled: true,
  officialAssessmentMode: false,
  topicWeights: {},
  lockedItemIds: [],
  updatedAt: new Date().toISOString(),
});

export const loadTeacherCommandPolicy = (): TeacherCommandPolicy => {
  try {
    const parsed = JSON.parse(localStorage.getItem(TEACHER_COMMAND_POLICY_KEY) || 'null') as Partial<TeacherCommandPolicy> | null;
    return {
      ...createDefaultTeacherCommandPolicy(),
      ...(parsed || {}),
      version: 'teacher-command-v1',
      topicWeights: parsed?.topicWeights || {},
      lockedItemIds: Array.isArray(parsed?.lockedItemIds) ? parsed!.lockedItemIds! : [],
    };
  } catch {
    return createDefaultTeacherCommandPolicy();
  }
};

export const saveTeacherCommandPolicy = (policy: TeacherCommandPolicy): TeacherCommandPolicy => {
  const next = { ...policy, version: 'teacher-command-v1' as const, updatedAt: new Date().toISOString() };
  try { localStorage.setItem(TEACHER_COMMAND_POLICY_KEY, JSON.stringify(next)); } catch {}
  window.dispatchEvent(new CustomEvent('dia8:teacher-policy', { detail: next }));
  return next;
};

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
});

const transactionDone = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
  transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted.'));
});

export interface TeacherIntelligenceLocalSnapshot {
  monsterProgress: MonsterBattleProgressRecord[];
  journeys: JourneyProgressRecord[];
  skills: StudentSkillRecord[];
  errors: ErrorCaseRecord[];
  reviews: LearningReviewQueueRecord[];
  questionRecords: QuestionIntelligenceRecord[];
  inventory: InventoryOwnedRecord[];
}

export const loadTeacherIntelligenceLocalSnapshot = async (): Promise<TeacherIntelligenceLocalSnapshot> => {
  try {
    const db = await openLearningEvidenceDb();
    const stores = ['story_progress', 'student_skills', 'error_cases', 'review_queue', 'question_intelligence', 'inventory'] as const;
    const tx = db.transaction([...stores], 'readonly');
    const done = transactionDone(tx);
    const [story, skills, errors, reviews, questions, inventory] = await Promise.all([
      requestToPromise(tx.objectStore('story_progress').getAll()) as Promise<Array<MonsterBattleProgressRecord | JourneyProgressRecord>>,
      requestToPromise(tx.objectStore('student_skills').getAll()) as Promise<StudentSkillRecord[]>,
      requestToPromise(tx.objectStore('error_cases').getAll()) as Promise<ErrorCaseRecord[]>,
      requestToPromise(tx.objectStore('review_queue').getAll()) as Promise<LearningReviewQueueRecord[]>,
      requestToPromise(tx.objectStore('question_intelligence').getAll()) as Promise<QuestionIntelligenceRecord[]>,
      requestToPromise(tx.objectStore('inventory').getAll()) as Promise<InventoryOwnedRecord[]>,
    ]);
    await done;
    return {
      monsterProgress: story.filter((row): row is MonsterBattleProgressRecord => String(row.id || '').startsWith('monster-progress:')),
      journeys: story.filter((row): row is JourneyProgressRecord => String(row.id || '').startsWith('journey-progress:')),
      skills,
      errors,
      reviews,
      questionRecords: questions,
      inventory,
    };
  } catch (error) {
    console.warn('Không đọc được dữ liệu Teacher Intelligence Command.', error);
    return { monsterProgress: [], journeys: [], skills: [], errors: [], reviews: [], questionRecords: [], inventory: [] };
  }
};

export const exportOfflineLearningPack = (topicIds: number[], policy: TeacherCommandPolicy): void => {
  const payload = {
    schema: 'dia8dragon-offline-learning-pack.v1',
    generatedAt: new Date().toISOString(),
    appVersion: '3.5.0.2',
    topicIds,
    teacherPolicy: policy,
    includes: ['core-topic-data', 'quiz-routing', 'repair-cards', 'review-schedule'],
    excludes: ['large-pdf-precache', 'docx-precache', 'student-personal-data'],
    note: 'Gói mô tả phạm vi tải offline. Ứng dụng chỉ tải học liệu khi người học mở chuyên đề.',
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `dia8dragon-offline-pack-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};
