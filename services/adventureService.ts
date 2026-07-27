import {
  ErrorCaseRecord,
  JourneyProgressRecord,
  LearningReviewQueueRecord,
  StudentSkillRecord,
  SyncOutboxRecord,
} from '../types';
import { createDefaultJourneyProgress } from '../core/sevenOrbJourney';
import { openLearningEvidenceDb } from './learningEvidenceDb';

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
});

const transactionDone = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
  transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted.'));
});

export const loadJourneyProgress = async (learnerId: string): Promise<JourneyProgressRecord> => {
  try {
    const db = await openLearningEvidenceDb();
    const tx = db.transaction('story_progress', 'readonly');
    const done = transactionDone(tx);
    const existing = await requestToPromise(tx.objectStore('story_progress').get(`journey-progress:${learnerId}`)) as JourneyProgressRecord | undefined;
    await done;
    return existing?.version === 'seven-orb-journey-v1' ? existing : createDefaultJourneyProgress(learnerId);
  } catch (error) {
    console.warn('Không đọc được hành trình Thất Ngọc; dùng dữ liệu tạm trong phiên.', error);
    return createDefaultJourneyProgress(learnerId);
  }
};

export const saveJourneyProgress = async (progress: JourneyProgressRecord): Promise<void> => {
  try {
    const db = await openLearningEvidenceDb();
    const tx = db.transaction(['story_progress', 'sync_outbox'], 'readwrite');
    const now = new Date().toISOString();
    tx.objectStore('story_progress').put(progress);
    const outbox: SyncOutboxRecord = {
      id: `sync:journey:${progress.id}:${Date.now()}`,
      entityType: 'JOURNEY_PROGRESS',
      entityId: progress.id,
      payload: progress,
      status: 'PENDING',
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    tx.objectStore('sync_outbox').put(outbox);
    await transactionDone(tx);
  } catch (error) {
    console.warn('Không lưu được hành trình; tiến độ hiện tại vẫn giữ trên giao diện.', error);
  }
};

export interface CompassDataSnapshot {
  skills: StudentSkillRecord[];
  errors: ErrorCaseRecord[];
  reviews: LearningReviewQueueRecord[];
  learningEventCount: number;
}

export const loadCompassData = async (learnerId: string): Promise<CompassDataSnapshot> => {
  try {
    const db = await openLearningEvidenceDb();
    const tx = db.transaction(['student_skills', 'error_cases', 'review_queue', 'learning_events'], 'readonly');
    const done = transactionDone(tx);
    const [skills, errors, reviews, events] = await Promise.all([
      requestToPromise(tx.objectStore('student_skills').getAll()) as Promise<StudentSkillRecord[]>,
      requestToPromise(tx.objectStore('error_cases').getAll()) as Promise<ErrorCaseRecord[]>,
      requestToPromise(tx.objectStore('review_queue').getAll()) as Promise<LearningReviewQueueRecord[]>,
      requestToPromise(tx.objectStore('learning_events').getAll()) as Promise<Array<{ learnerId?: string }>>,
    ]);
    await done;
    return {
      skills: skills.filter(item => item.learnerId === learnerId),
      errors: errors.filter(item => item.learnerId === learnerId),
      reviews: reviews.filter(item => item.learnerId === learnerId),
      learningEventCount: events.filter(item => item.learnerId === learnerId).length,
    };
  } catch (error) {
    console.warn('Không đọc được dữ liệu La Bàn.', error);
    return { skills: [], errors: [], reviews: [], learningEventCount: 0 };
  }
};
