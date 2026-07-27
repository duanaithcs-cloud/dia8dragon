import { AppState, ArenaStats } from '../types';
import { deleteLearningEvidenceDb, type LearningEvidenceExportSnapshot } from '../services/learningEvidenceDb';

export const DATA_SCHEMA_VERSION = 2;
export const APP_STATE_KEY = 'dia8_ai_state_v1_identity';
export const ARENA_STORE_KEY = 'DIA8_ARENA_STORE_V1';
const LEGACY_BACKUP_KEY = 'dia8_ai_state_v1_backup';
const BACKUP_INDEX_KEY = 'dia8dragon_backup_index_v2';
const BACKUP_PREFIX = 'dia8dragon_backup_v2_';
const MAX_BACKUPS = 8;

export interface TransferSnapshot {
  app: 'dia8dragon';
  version: number;
  exportedAt: string;
  reason?: string;
  appState: AppState;
  arenaStore: Record<number, ArenaStats>;
  learningEvidence?: LearningEvidenceExportSnapshot;
  checksum?: string;
}

export interface BackupMeta {
  id: string;
  createdAt: string;
  reason: string;
  checksum: string;
  studentName: string;
  className: string;
  sessions: number;
  size: number;
}

export interface ReadResult<T> {
  value: T;
  source: 'primary' | 'restore-point' | 'legacy-backup' | 'default';
  warning?: string;
}

const fnv1a = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const payloadForChecksum = (snapshot: Omit<TransferSnapshot, 'checksum'> | TransferSnapshot): string =>
  JSON.stringify({
    app: snapshot.app,
    version: snapshot.version,
    exportedAt: snapshot.exportedAt,
    reason: snapshot.reason,
    appState: snapshot.appState,
    arenaStore: snapshot.arenaStore,
    learningEvidence: snapshot.learningEvidence
  });

export const addChecksum = (snapshot: Omit<TransferSnapshot, 'checksum'>): TransferSnapshot => ({
  ...snapshot,
  checksum: fnv1a(payloadForChecksum(snapshot))
});

export const validateSnapshot = (input: unknown): TransferSnapshot => {
  if (!input || typeof input !== 'object') throw new Error('Gói dữ liệu trống hoặc sai định dạng.');
  const raw = input as Partial<TransferSnapshot>;
  if (raw.app !== 'dia8dragon') throw new Error('Đây không phải gói dữ liệu Dia8Dragon.');
  if (!raw.appState || !Array.isArray(raw.appState.topics)) throw new Error('Gói thiếu dữ liệu tiến trình.');
  if (!raw.appState.user_profile || !Array.isArray(raw.appState.session_log)) throw new Error('Gói thiếu hồ sơ hoặc lịch sử học tập.');
  const snapshot: TransferSnapshot = {
    app: 'dia8dragon',
    version: Number(raw.version || 1),
    exportedAt: raw.exportedAt || new Date().toISOString(),
    reason: raw.reason,
    appState: raw.appState as AppState,
    arenaStore: raw.arenaStore && typeof raw.arenaStore === 'object' ? raw.arenaStore : {},
    learningEvidence: raw.learningEvidence,
    checksum: raw.checksum
  };
  if (snapshot.checksum && snapshot.checksum !== fnv1a(payloadForChecksum(snapshot))) {
    throw new Error('Gói dữ liệu không còn nguyên vẹn hoặc đã bị chỉnh sửa.');
  }
  return snapshot;
};

export const safeReadJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

export const safeWriteJson = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Không thể lưu dữ liệu ${key}.`, error);
    return false;
  }
};

export const loadAppState = <T,>(fallback: T): ReadResult<T> => {
  try {
    const raw = localStorage.getItem(APP_STATE_KEY);
    if (raw) return { value: JSON.parse(raw) as T, source: 'primary' };
  } catch (error) {
    console.warn('Dữ liệu chính bị lỗi.', error);
  }
  try {
    const latest = listBackups()[0];
    if (latest) {
      const snapshot = readBackup(latest.id);
      return { value: snapshot.appState as T, source: 'restore-point', warning: 'Dữ liệu chính bị lỗi; đã phục hồi từ điểm lưu gần nhất.' };
    }
  } catch (error) {
    console.warn('Điểm khôi phục gần nhất bị lỗi.', error);
  }
  try {
    const raw = localStorage.getItem(LEGACY_BACKUP_KEY);
    if (raw) return { value: JSON.parse(raw) as T, source: 'legacy-backup', warning: 'Đã phục hồi từ bản sao lưu cũ.' };
  } catch (error) {
    console.warn('Bản sao lưu cũ bị lỗi.', error);
  }
  return { value: fallback, source: 'default' };
};

export const createSnapshot = (
  appState: AppState,
  arenaStore: Record<number, ArenaStats>,
  reason = 'manual'
): TransferSnapshot => addChecksum({
  app: 'dia8dragon',
  version: DATA_SCHEMA_VERSION,
  exportedAt: new Date().toISOString(),
  reason,
  appState,
  arenaStore
});

const readBackupIndex = (): BackupMeta[] => safeReadJson<BackupMeta[]>(BACKUP_INDEX_KEY, []);

export const listBackups = (): BackupMeta[] => readBackupIndex().filter(meta => !!localStorage.getItem(`${BACKUP_PREFIX}${meta.id}`));

export const saveBackup = (
  appState: AppState,
  arenaStore: Record<number, ArenaStats>,
  reason: string
): BackupMeta | null => {
  const snapshot = createSnapshot(appState, arenaStore, reason);
  const serialized = JSON.stringify(snapshot);
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const key = `${BACKUP_PREFIX}${id}`;
  try {
    localStorage.setItem(key, serialized);
    const meta: BackupMeta = {
      id,
      createdAt: snapshot.exportedAt,
      reason,
      checksum: snapshot.checksum || '',
      studentName: appState.user_profile.fullName || 'Chưa đặt tên',
      className: appState.user_profile.className || '',
      sessions: appState.session_log.length,
      size: new Blob([serialized]).size
    };
    const index = [meta, ...readBackupIndex()];
    const keep = index.slice(0, MAX_BACKUPS);
    index.slice(MAX_BACKUPS).forEach(old => localStorage.removeItem(`${BACKUP_PREFIX}${old.id}`));
    localStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(keep));
    return meta;
  } catch (error) {
    console.error('Không thể tạo điểm khôi phục.', error);
    try { localStorage.removeItem(key); } catch { /* no-op */ }
    return null;
  }
};

export const readBackup = (id: string): TransferSnapshot => {
  const raw = localStorage.getItem(`${BACKUP_PREFIX}${id}`);
  if (!raw) throw new Error('Không tìm thấy điểm khôi phục.');
  return validateSnapshot(JSON.parse(raw));
};

export const deleteBackup = (id: string): void => {
  localStorage.removeItem(`${BACKUP_PREFIX}${id}`);
  safeWriteJson(BACKUP_INDEX_KEY, readBackupIndex().filter(item => item.id !== id));
};

export const persistCurrentData = (appState: AppState, arenaStore: Record<number, ArenaStats>): boolean => {
  const stateOk = safeWriteJson(APP_STATE_KEY, appState);
  const arenaOk = safeWriteJson(ARENA_STORE_KEY, arenaStore);
  return stateOk && arenaOk;
};

export const clearDia8LocalData = async (): Promise<void> => {
  const keysToRemove: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;
    if (
      key === APP_STATE_KEY ||
      key === ARENA_STORE_KEY ||
      key === LEGACY_BACKUP_KEY ||
      key === BACKUP_INDEX_KEY ||
      key.startsWith(BACKUP_PREFIX) ||
      key.startsWith('dia8_') ||
      key.startsWith('DIA8_') ||
      key.startsWith('dia8dragon_')
    ) keysToRemove.push(key);
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  if ('indexedDB' in window) {
    await Promise.allSettled([
      new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase('dia8dragon-document-library');
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      }),
      deleteLearningEvidenceDb(),
    ]);
  }
};
