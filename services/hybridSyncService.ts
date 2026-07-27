import {
  HybridSyncPolicy,
  HybridSyncSettings,
  HybridSyncSummary,
  SyncOutboxRecord,
} from '../types';
import { openLearningEvidenceDb } from './learningEvidenceDb';

export const HYBRID_SYNC_SETTINGS_KEY = 'dia8dragon-hybrid-sync-settings';

const defaultSettings = (): HybridSyncSettings => ({
  version: 'hybrid-sync-v1',
  policy: 'MANUAL',
  lastStatus: 'IDLE',
  officialAssessmentMode: false,
});

export const loadHybridSyncSettings = (): HybridSyncSettings => {
  try {
    const parsed = JSON.parse(localStorage.getItem(HYBRID_SYNC_SETTINGS_KEY) || 'null') as Partial<HybridSyncSettings> | null;
    return { ...defaultSettings(), ...(parsed || {}), version: 'hybrid-sync-v1' };
  } catch {
    return defaultSettings();
  }
};

export const saveHybridSyncSettings = (settings: HybridSyncSettings): HybridSyncSettings => {
  const next = { ...settings, version: 'hybrid-sync-v1' as const };
  try { localStorage.setItem(HYBRID_SYNC_SETTINGS_KEY, JSON.stringify(next)); } catch {}
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

const connectionType = (): string => {
  const connection = (navigator as Navigator & { connection?: { type?: string; effectiveType?: string } }).connection;
  return String(connection?.type || connection?.effectiveType || 'unknown');
};

const isWifi = (): boolean => connectionType().toLowerCase() === 'wifi';

const getOutbox = async (): Promise<SyncOutboxRecord[]> => {
  const db = await openLearningEvidenceDb();
  const tx = db.transaction('sync_outbox', 'readonly');
  const done = transactionDone(tx);
  const rows = await requestToPromise(tx.objectStore('sync_outbox').getAll()) as SyncOutboxRecord[];
  await done;
  return rows;
};

export const getHybridSyncSummary = async (): Promise<HybridSyncSummary> => {
  const rows = await getOutbox().catch(() => [] as SyncOutboxRecord[]);
  return {
    online: typeof navigator === 'undefined' ? false : navigator.onLine,
    connectionType: typeof navigator === 'undefined' ? 'unknown' : connectionType(),
    pending: rows.filter(row => row.status === 'PENDING' || row.status === 'SYNCING').length,
    failed: rows.filter(row => row.status === 'FAILED').length,
    confirmed: rows.filter(row => row.status === 'CONFIRMED').length,
    settings: loadHybridSyncSettings(),
  };
};

const updateRows = async (rows: SyncOutboxRecord[]): Promise<void> => {
  if (!rows.length) return;
  const db = await openLearningEvidenceDb();
  const tx = db.transaction('sync_outbox', 'readwrite');
  const store = tx.objectStore('sync_outbox');
  rows.forEach(row => store.put(row));
  await transactionDone(tx);
};

export interface HybridSyncResult {
  ok: boolean;
  confirmed: number;
  pending: number;
  message: string;
  settings: HybridSyncSettings;
}

export const attemptHybridSync = async (
  learnerId: string,
  options: { manual?: boolean } = {},
): Promise<HybridSyncResult> => {
  let settings = loadHybridSyncSettings();
  const now = new Date().toISOString();
  const manual = Boolean(options.manual);
  const fail = (lastStatus: HybridSyncSettings['lastStatus'], message: string, pending = 0): HybridSyncResult => {
    settings = saveHybridSyncSettings({ ...settings, lastAttemptAt: now, lastStatus, lastMessage: message });
    return { ok: false, confirmed: 0, pending, message, settings };
  };

  if (settings.policy === 'OFF') return fail('IDLE', 'Đồng bộ đang tắt theo lựa chọn của người học.');
  if (!navigator.onLine) return fail('WAITING_NETWORK', 'Không có mạng. Dữ liệu vẫn nằm an toàn trong Hàng đợi đồng bộ.');
  if (!manual && settings.policy === 'MANUAL') return fail('IDLE', 'Chế độ đồng bộ thủ công đang bật.');
  if (!manual && settings.policy === 'WIFI_ONLY' && !isWifi()) return fail('WAITING_WIFI', 'Đang chờ kết nối Wi-Fi được trình duyệt xác nhận.');

  const rows = (await getOutbox()).filter(row => row.status === 'PENDING' || row.status === 'FAILED').slice(0, 100);
  if (!rows.length) {
    settings = saveHybridSyncSettings({ ...settings, lastAttemptAt: now, lastSuccessAt: now, lastStatus: 'SUCCESS', lastMessage: 'Không có bản ghi mới cần đồng bộ.' });
    return { ok: true, confirmed: 0, pending: 0, message: settings.lastMessage || '', settings };
  }

  const syncingRows = rows.map(row => ({ ...row, status: 'SYNCING' as const, updatedAt: now }));
  await updateRows(syncingRows);
  settings = saveHybridSyncSettings({ ...settings, lastAttemptAt: now, lastStatus: 'SYNCING', lastMessage: `Đang gửi ${rows.length} bản ghi local-first.` });

  try {
    const response = await fetch('/api/student-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learnerId, records: rows, clientVersion: '3.5.0.2' }),
    });
    const payload = await response.json().catch(() => ({})) as { ok?: boolean; confirmedIds?: string[]; error?: string };
    if (!response.ok || !payload.ok) {
      const waitingRemote = response.status === 404 || response.status === 503;
      const failedRows = rows.map(row => ({ ...row, status: 'FAILED' as const, attempts: row.attempts + 1, updatedAt: new Date().toISOString(), nextAttemptAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }));
      await updateRows(failedRows);
      return fail(waitingRemote ? 'WAITING_REMOTE' : 'ERROR', payload.error || `Máy chủ đồng bộ trả về HTTP ${response.status}.`, rows.length);
    }
    const confirmedIds = new Set(payload.confirmedIds || rows.map(row => row.id));
    const updated = rows.map(row => confirmedIds.has(row.id)
      ? { ...row, status: 'CONFIRMED' as const, updatedAt: new Date().toISOString() }
      : { ...row, status: 'PENDING' as const, updatedAt: new Date().toISOString() });
    await updateRows(updated);
    const confirmed = updated.filter(row => row.status === 'CONFIRMED').length;
    const pending = updated.length - confirmed;
    settings = saveHybridSyncSettings({ ...settings, lastAttemptAt: now, lastSuccessAt: new Date().toISOString(), lastStatus: 'SUCCESS', lastMessage: `Đã xác nhận ${confirmed} bản ghi; còn ${pending} bản ghi chờ.` });
    return { ok: true, confirmed, pending, message: settings.lastMessage || '', settings };
  } catch (error) {
    const failedRows = rows.map(row => ({ ...row, status: 'FAILED' as const, attempts: row.attempts + 1, updatedAt: new Date().toISOString(), nextAttemptAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }));
    await updateRows(failedRows);
    return fail('ERROR', error instanceof Error ? error.message : 'Không thể kết nối máy chủ đồng bộ.', rows.length);
  }
};

export const setHybridSyncPolicy = (policy: HybridSyncPolicy): HybridSyncSettings =>
  saveHybridSyncSettings({ ...loadHybridSyncSettings(), policy, lastStatus: 'IDLE', lastMessage: 'Đã cập nhật chính sách đồng bộ.' });

export const downloadOfflineTopicPack = async (topicIds: number[]): Promise<{ cached: number; failed: number }> => {
  if (typeof caches === 'undefined') throw new Error('Trình duyệt không hỗ trợ Cache Storage.');
  const cache = await caches.open('dia8dragon-offline-pack-3.5.0.2');
  const urls = Array.from(new Set(topicIds.flatMap(topicId => {
    const id = String(topicId).padStart(2, '0');
    return [`/data/topics/topic-${id}.json`, `/data/quiz/topics/topic-${id}.json`];
  })));
  let cached = 0;
  let failed = 0;
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'reload' });
      if (!response.ok) throw new Error(String(response.status));
      await cache.put(url, response.clone());
      cached += 1;
    } catch {
      failed += 1;
    }
  }
  return { cached, failed };
};

export const clearOfflineTopicPack = async (): Promise<boolean> =>
  typeof caches !== 'undefined' ? caches.delete('dia8dragon-offline-pack-3.5.0.2') : false;
