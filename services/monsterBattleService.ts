import { MonsterBattleProgressRecord, SyncOutboxRecord } from '../types';
import { createDefaultMonsterProgress } from '../core/monsterBattle';
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

export const loadMonsterProgress = async (learnerId: string, topicId: number): Promise<MonsterBattleProgressRecord> => {
  try {
    const database = await openLearningEvidenceDb();
    const transaction = database.transaction('story_progress', 'readonly');
    const done = transactionDone(transaction);
    const id = `monster-progress:${learnerId}:${topicId}`;
    const existing = await requestToPromise(transaction.objectStore('story_progress').get(id)) as MonsterBattleProgressRecord | undefined;
    await done;
    return existing || createDefaultMonsterProgress(learnerId, topicId);
  } catch (error) {
    console.warn('Không đọc được tiến độ yêu quái; dùng tiến độ tạm trong phiên.', error);
    return createDefaultMonsterProgress(learnerId, topicId);
  }
};

export const loadAllMonsterProgress = async (learnerId: string): Promise<Record<number, MonsterBattleProgressRecord>> => {
  try {
    const database = await openLearningEvidenceDb();
    const transaction = database.transaction('story_progress', 'readonly');
    const done = transactionDone(transaction);
    const rows = await requestToPromise(transaction.objectStore('story_progress').getAll()) as MonsterBattleProgressRecord[];
    await done;
    return Object.fromEntries(rows.filter(row => row?.learnerId === learnerId && Number.isFinite(row.topicId)).map(row => [row.topicId, row]));
  } catch (error) {
    console.warn('Không đọc được danh sách tiến độ yêu quái.', error);
    return {};
  }
};

export const saveMonsterProgress = async (progress: MonsterBattleProgressRecord): Promise<void> => {
  try {
    const database = await openLearningEvidenceDb();
    const transaction = database.transaction(['story_progress', 'sync_outbox'], 'readwrite');
    transaction.objectStore('story_progress').put(progress);
    const now = new Date().toISOString();
    const outbox: SyncOutboxRecord = {
      id: `sync:monster:${progress.id}:${Date.now()}`,
      entityType: 'STORY_PROGRESS',
      entityId: progress.id,
      payload: progress,
      status: 'PENDING',
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    transaction.objectStore('sync_outbox').put(outbox);
    await transactionDone(transaction);
  } catch (error) {
    console.warn('Không lưu được tiến độ yêu quái; trận hiện tại vẫn được giữ trên giao diện.', error);
  }
};
