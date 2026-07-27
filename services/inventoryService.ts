import {
  InventoryCatalogItem,
  InventoryOwnedRecord,
  SyncOutboxRecord,
} from '../types';
import { fetchJsonOnce } from './runtimeDataService';
import { openLearningEvidenceDb } from './learningEvidenceDb';

interface InventoryCatalogPayload {
  schema: string;
  version: string;
  items: InventoryCatalogItem[];
}

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
});

const transactionDone = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
  transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted.'));
});

export const loadInventoryCatalog = async (): Promise<InventoryCatalogItem[]> => {
  const payload = await fetchJsonOnce<InventoryCatalogPayload>('/data/game/inventory-catalog.json');
  return Array.isArray(payload?.items) ? payload.items : [];
};

export const loadInventoryRecords = async (learnerId: string): Promise<Record<string, InventoryOwnedRecord>> => {
  try {
    const db = await openLearningEvidenceDb();
    const tx = db.transaction('inventory', 'readonly');
    const done = transactionDone(tx);
    const rows = await requestToPromise(tx.objectStore('inventory').getAll()) as InventoryOwnedRecord[];
    await done;
    return Object.fromEntries(rows.filter(row => row.learnerId === learnerId).map(row => [row.itemId, row]));
  } catch (error) {
    console.warn('Không đọc được Kho Hành Trang.', error);
    return {};
  }
};

export const saveInventoryRecord = async (record: InventoryOwnedRecord): Promise<void> => {
  try {
    const db = await openLearningEvidenceDb();
    const tx = db.transaction(['inventory', 'sync_outbox'], 'readwrite');
    const now = new Date().toISOString();
    tx.objectStore('inventory').put(record);
    const outbox: SyncOutboxRecord = {
      id: `sync:inventory:${record.id}:${Date.now()}`,
      entityType: 'INVENTORY_UPDATE',
      entityId: record.id,
      payload: record,
      status: 'PENDING',
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    tx.objectStore('sync_outbox').put(outbox);
    await transactionDone(tx);
  } catch (error) {
    console.warn('Không lưu được vật phẩm; trạng thái hiện tại vẫn giữ trong phiên.', error);
  }
};

export const craftInventoryItem = async (learnerId: string, itemId: string): Promise<InventoryOwnedRecord> => {
  const now = new Date().toISOString();
  const record: InventoryOwnedRecord = {
    id: `inventory:${learnerId}:${itemId}`,
    learnerId,
    itemId,
    status: 'OWNED',
    craftedAt: now,
    unlockedAt: now,
    equipped: false,
    updatedAt: now,
  };
  await saveInventoryRecord(record);
  return record;
};

export const toggleInventoryEquipped = async (record: InventoryOwnedRecord): Promise<InventoryOwnedRecord> => {
  const next = { ...record, equipped: !record.equipped, updatedAt: new Date().toISOString() };
  await saveInventoryRecord(next);
  return next;
};
