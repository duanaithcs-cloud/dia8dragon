import {
  InventoryCatalogItem,
  InventoryItemStatus,
  InventoryOwnedRecord,
  TeacherCommandPolicy,
} from '../types';

export interface InventoryProgressMetrics {
  sealedMonsters: number;
  recoveredOrbs: number;
  learningEvents: number;
  averageMastery: number;
}

export const inventoryRequirementMet = (
  item: InventoryCatalogItem,
  metrics: InventoryProgressMetrics,
  ownedItemIds: Set<string>,
): boolean => {
  const req = item.requirements || {};
  if ((req.sealedMonsters || 0) > metrics.sealedMonsters) return false;
  if ((req.recoveredOrbs || 0) > metrics.recoveredOrbs) return false;
  if ((req.learningEvents || 0) > metrics.learningEvents) return false;
  if ((req.minimumMastery || 0) > metrics.averageMastery) return false;
  if ((req.requiredItemIds || []).some(id => !ownedItemIds.has(id))) return false;
  return true;
};

export const resolveInventoryStatus = (
  item: InventoryCatalogItem,
  existing: InventoryOwnedRecord | undefined,
  metrics: InventoryProgressMetrics,
  ownedItemIds: Set<string>,
): InventoryItemStatus => {
  if (existing?.status === 'OWNED') return 'OWNED';
  return inventoryRequirementMet(item, metrics, ownedItemIds) ? 'CRAFTABLE' : 'LOCKED';
};

export const isInventoryItemUsable = (
  item: InventoryCatalogItem,
  record: InventoryOwnedRecord | undefined,
  policy: TeacherCommandPolicy,
): boolean => {
  if (record?.status !== 'OWNED') return false;
  if (!policy.equipmentEnabled) return false;
  if (policy.lockedItemIds.includes(item.id)) return false;
  if (policy.officialAssessmentMode && item.officialAssessmentLocked) return false;
  return true;
};

export const describeInventoryRequirement = (item: InventoryCatalogItem): string => {
  const parts: string[] = [];
  const req = item.requirements || {};
  if (req.sealedMonsters) parts.push(`phong ấn ${req.sealedMonsters} yêu quái`);
  if (req.recoveredOrbs) parts.push(`thu hồi ${req.recoveredOrbs} viên Ngọc`);
  if (req.learningEvents) parts.push(`tạo ${req.learningEvents} bằng chứng học tập`);
  if (req.minimumMastery) parts.push(`nắm vững trung bình ${req.minimumMastery}%`);
  if (req.requiredItemIds?.length) parts.push(`sở hữu ${req.requiredItemIds.length} vật phẩm nền`);
  return parts.length ? parts.join(' · ') : 'Mở ngay từ đầu';
};
