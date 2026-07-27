import { MonsterBattleDefinition, MonsterBattlePhase, MonsterBattleProgressRecord, MonsterDefenseLayer, Question, Topic } from '../types';

export const MONSTER_BATTLE_VERSION = 'monster-battle-local-v1' as const;
export const MONSTER_SEAL_DELAY_MS = 24 * 60 * 60 * 1000;
export const MONSTER_RETRY_DELAY_MS = 12 * 60 * 60 * 1000;

const DEFINITIONS: Array<Omit<MonsterBattleDefinition, 'topicLabel'>> = [
  { topicId: 1, name: 'Vọng Dân Mê', epithet: 'Kẻ tráo tỉ lệ và quy mô', signatureTrick: 'Đánh tráo số dân, cơ cấu dân tộc và tốc độ gia tăng để người học nhớ đúng số nhưng dùng sai chỉ tiêu.', archetype: 1, accent: '#38bdf8', accent2: '#8b5cf6' },
  { topicId: 2, name: 'Ảo Phân Bố', epithet: 'Chúa mê cung mật độ', signatureTrick: 'Trộn lẫn phân bố dân cư, mật độ và đô thị hóa giữa các vùng lãnh thổ.', archetype: 2, accent: '#22d3ee', accent2: '#0ea5e9' },
  { topicId: 3, name: 'Nghiệp Lao Vô Việc', epithet: 'Kẻ giấu chất lượng lao động', signatureTrick: 'Làm người học nhầm nguồn lao động dồi dào với năng suất, chất lượng và khả năng tạo việc làm.', archetype: 3, accent: '#f59e0b', accent2: '#ef4444' },
  { topicId: 4, name: 'Ma Trận Dân Cư', epithet: 'Người bẻ cong biểu đồ', signatureTrick: 'Che giấu từ khóa, đơn vị và mốc thời gian trong bảng số liệu dân cư.', archetype: 4, accent: '#a78bfa', accent2: '#ec4899' },
  { topicId: 5, name: 'Nông Vực Tham Sinh', epithet: 'Kẻ tráo điều kiện sản xuất', signatureTrick: 'Đánh đồng điều kiện tự nhiên, kinh tế xã hội và giải pháp phát triển nông nghiệp.', archetype: 5, accent: '#84cc16', accent2: '#22c55e' },
  { topicId: 6, name: 'Lâm Hải Song Thú', epithet: 'Hai mặt rừng và biển', signatureTrick: 'Trộn chức năng của rừng với điều kiện nuôi trồng, khai thác và bảo vệ nguồn lợi thủy sản.', archetype: 1, accent: '#10b981', accent2: '#06b6d4' },
  { topicId: 7, name: 'Cơ Giới Khói Đen', epithet: 'Kẻ tráo ngành và trung tâm', signatureTrick: 'Làm lẫn lộn cơ cấu ngành, nhân tố phân bố và các trung tâm công nghiệp.', archetype: 2, accent: '#64748b', accent2: '#f97316' },
  { topicId: 8, name: 'Dịch Chuyển Mê Cung', epithet: 'Kẻ đảo mạng lưới dịch vụ', signatureTrick: 'Đánh tráo vai trò, điều kiện phát triển và phân bố của giao thông, bưu chính, tài chính và dịch vụ.', archetype: 3, accent: '#0ea5e9', accent2: '#6366f1' },
  { topicId: 9, name: 'Thương Lữ Huyễn Ảnh', epithet: 'Kẻ đổi thị trường thành tài nguyên', signatureTrick: 'Làm người học nhầm nội thương, ngoại thương, tài nguyên du lịch và cơ sở hạ tầng.', archetype: 4, accent: '#fbbf24', accent2: '#fb7185' },
  { topicId: 10, name: 'Sơn Vực Phong Chướng', epithet: 'Chúa núi che tiềm năng', signatureTrick: 'Trộn các tiểu vùng, khoáng sản, cây công nghiệp và thế mạnh thủy điện của Trung du và miền núi Bắc Bộ.', archetype: 5, accent: '#14b8a6', accent2: '#8b5cf6' },
  { topicId: 11, name: 'Hồng Hà Trầm Tích', epithet: 'Kẻ giấu sức ép đồng bằng', signatureTrick: 'Đánh đồng lợi thế vị trí, dân cư đông, thâm canh và sức ép tài nguyên môi trường của Đồng bằng sông Hồng.', archetype: 1, accent: '#ef4444', accent2: '#f59e0b' },
  { topicId: 12, name: 'Trường Sơn Nghịch Phong', epithet: 'Kẻ đảo chiều tự nhiên', signatureTrick: 'Làm lẫn thiên tai, gió phơn, dải đồng bằng hẹp và thế mạnh kinh tế của Bắc Trung Bộ.', archetype: 2, accent: '#fb923c', accent2: '#38bdf8' },
  { topicId: 13, name: 'Cao Nguyên Hải Hỏa', epithet: 'Song giới cao nguyên và duyên hải', signatureTrick: 'Trộn điều kiện, sản phẩm và liên kết giữa Duyên hải Nam Trung Bộ với Tây Nguyên.', archetype: 3, accent: '#f97316', accent2: '#a3e635' },
  { topicId: 14, name: 'Đông Nam Cực Tốc', epithet: 'Kẻ phóng đại tăng trưởng', signatureTrick: 'Đánh tráo thế mạnh công nghiệp, dịch vụ, cơ sở hạ tầng và các vấn đề môi trường của Đông Nam Bộ.', archetype: 4, accent: '#ec4899', accent2: '#8b5cf6' },
  { topicId: 15, name: 'Cửu Long Thủy Biến', epithet: 'Kẻ đổi dòng phù sa', signatureTrick: 'Làm lẫn thế mạnh lúa gạo, thủy sản, mạng lưới sông ngòi và các hạn chế tự nhiên của Đồng bằng sông Cửu Long.', archetype: 5, accent: '#06b6d4', accent2: '#22c55e' },
  { topicId: 16, name: 'Khí Hậu Xâm Thực', epithet: 'Kẻ kéo mặn vào ký ức', signatureTrick: 'Đánh tráo nguyên nhân, biểu hiện, tác động và giải pháp thích ứng với biến đổi khí hậu ở Đồng bằng sông Cửu Long.', archetype: 1, accent: '#0ea5e9', accent2: '#f43f5e' },
  { topicId: 17, name: 'Hải Đảo Đa Năng', epithet: 'Kẻ chia cắt kinh tế biển', signatureTrick: 'Làm người học nhìn riêng lẻ khai thác, giao thông, du lịch và bảo vệ tài nguyên biển đảo.', archetype: 2, accent: '#22d3ee', accent2: '#2563eb' },
  { topicId: 18, name: 'Đô Thị Thời Gian', epithet: 'Kẻ tráo lịch sử và hiện tại', signatureTrick: 'Đảo lẫn quá trình hình thành, chức năng, phân cấp và vấn đề của hệ thống đô thị Việt Nam.', archetype: 3, accent: '#a78bfa', accent2: '#38bdf8' },
  { topicId: 19, name: 'Châu Thổ Cổ Ấn', epithet: 'Kẻ làm mờ dấu ấn văn minh', signatureTrick: 'Tách rời điều kiện tự nhiên, sinh kế, văn hóa và quá trình thích nghi của các nền văn minh châu thổ.', archetype: 4, accent: '#eab308', accent2: '#10b981' },
  { topicId: 20, name: 'Biển Đông Chủ Quyền', epithet: 'Kẻ làm nhiễu căn cứ pháp lí', signatureTrick: 'Đánh tráo phạm vi biển, đảo, chủ quyền, quyền chủ quyền và trách nhiệm bảo vệ Biển Đông.', archetype: 5, accent: '#3b82f6', accent2: '#ef4444' },
];

export const buildMonsterCatalog = (topics: Topic[]): MonsterBattleDefinition[] => DEFINITIONS.map(definition => ({
  ...definition,
  topicLabel: topics.find(topic => topic.topic_id === definition.topicId)?.keyword_label || `Chuyên đề ${definition.topicId}`,
}));

export const createDefaultMonsterProgress = (learnerId: string, topicId: number): MonsterBattleProgressRecord => {
  const now = new Date().toISOString();
  return {
    id: `monster-progress:${learnerId}:${topicId}`,
    learnerId,
    topicId,
    version: MONSTER_BATTLE_VERSION,
    status: 'UNSEEN',
    phase: 'SCOUT',
    layers: {
      knowledgeArmor: 100,
      skillShield: 100,
      memorySeal: 100,
    },
    attempts: 0,
    victories: 0,
    questionHistory: [],
    phaseResults: {},
    createdAt: now,
    updatedAt: now,
  };
};

export const phaseForQuestionIndex = (index: number): MonsterBattlePhase => {
  if (index < 3) return 'SCOUT';
  if (index < 6) return 'BREAK_ARMOR';
  return 'COUNTERATTACK';
};

export const phaseLabel: Record<MonsterBattlePhase, string> = {
  SCOUT: 'Trinh sát',
  BREAK_ARMOR: 'Phá giáp',
  COUNTERATTACK: 'Phản công',
  SEAL: 'Phong ấn',
};

export const phaseInstruction: Record<MonsterBattlePhase, string> = {
  SCOUT: '3 câu chẩn đoán để nhận diện lỗ hổng kiến thức.',
  BREAK_ARMOR: '3 câu tập trung đúng kỹ năng còn thiếu.',
  COUNTERATTACK: '4 câu mới để chứng minh khả năng vận dụng.',
  SEAL: '3 câu mới ở phiên sau để xác nhận kiến thức còn được ghi nhớ.',
};

export const defenseLayerLabel: Record<MonsterDefenseLayer, string> = {
  KNOWLEDGE_ARMOR: 'Giáp Kiến thức',
  SKILL_SHIELD: 'Khiên Kỹ năng',
  MEMORY_SEAL: 'Phong ấn Ghi nhớ',
};

export const isSealReady = (progress: MonsterBattleProgressRecord, now = Date.now()): boolean =>
  progress.status === 'AWAITING_SEAL' && Boolean(progress.sealDueAt) && new Date(progress.sealDueAt || 0).getTime() <= now;

export const calculateInitialBattleOutcome = (
  progress: MonsterBattleProgressRecord,
  correctByPhase: Partial<Record<MonsterBattlePhase, number>>,
  questionIds: string[],
): MonsterBattleProgressRecord => {
  const now = new Date();
  const scoutCorrect = correctByPhase.SCOUT || 0;
  const breakCorrect = correctByPhase.BREAK_ARMOR || 0;
  const counterCorrect = correctByPhase.COUNTERATTACK || 0;
  const freshKnowledgeArmor = scoutCorrect >= 2 ? 0 : Math.max(34, 100 - Math.round((scoutCorrect / 3) * 100));
  const freshSkillShield = breakCorrect >= 2 ? 0 : Math.max(34, 100 - Math.round((breakCorrect / 3) * 100));
  const freshMemorySeal = counterCorrect >= 3 ? 35 : Math.max(50, 100 - Math.round((counterCorrect / 4) * 60));
  const knowledgeArmor = Math.min(progress.layers.knowledgeArmor, freshKnowledgeArmor);
  const skillShield = Math.min(progress.layers.skillShield, freshSkillShield);
  const memorySeal = Math.min(progress.layers.memorySeal, freshMemorySeal);
  const readyForSeal = knowledgeArmor === 0 && skillShield === 0 && memorySeal <= 35;

  return {
    ...progress,
    status: readyForSeal ? 'AWAITING_SEAL' : 'IN_PROGRESS',
    phase: readyForSeal ? 'SEAL' : (knowledgeArmor > 0 ? 'SCOUT' : skillShield > 0 ? 'BREAK_ARMOR' : 'COUNTERATTACK'),
    layers: { knowledgeArmor, skillShield, memorySeal },
    attempts: progress.attempts + 1,
    questionHistory: Array.from(new Set([...progress.questionHistory, ...questionIds])).slice(-80),
    phaseResults: {
      ...progress.phaseResults,
      SCOUT: { correct: scoutCorrect, total: 3, completedAt: now.toISOString() },
      BREAK_ARMOR: { correct: breakCorrect, total: 3, completedAt: now.toISOString() },
      COUNTERATTACK: { correct: counterCorrect, total: 4, completedAt: now.toISOString() },
    },
    sealDueAt: readyForSeal ? new Date(now.getTime() + MONSTER_SEAL_DELAY_MS).toISOString() : undefined,
    lastBattleAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
};

export const calculateReplayOutcome = (
  progress: MonsterBattleProgressRecord,
  correctByPhase: Partial<Record<MonsterBattlePhase, number>>,
  questionIds: string[],
): MonsterBattleProgressRecord => {
  const now = new Date().toISOString();
  return {
    ...progress,
    status: 'SEALED',
    phase: 'SEAL',
    layers: { knowledgeArmor: 0, skillShield: 0, memorySeal: 0 },
    attempts: progress.attempts + 1,
    questionHistory: Array.from(new Set([...progress.questionHistory, ...questionIds])).slice(-80),
    phaseResults: {
      ...progress.phaseResults,
      SCOUT: { correct: correctByPhase.SCOUT || 0, total: 3, completedAt: now },
      BREAK_ARMOR: { correct: correctByPhase.BREAK_ARMOR || 0, total: 3, completedAt: now },
      COUNTERATTACK: { correct: correctByPhase.COUNTERATTACK || 0, total: 4, completedAt: now },
    },
    lastBattleAt: now,
    updatedAt: now,
  };
};

export const calculateSealOutcome = (
  progress: MonsterBattleProgressRecord,
  correct: number,
  questionIds: string[],
): MonsterBattleProgressRecord => {
  const now = new Date();
  const sealed = correct >= 2;
  return {
    ...progress,
    status: sealed ? 'SEALED' : 'AWAITING_SEAL',
    phase: 'SEAL',
    layers: { ...progress.layers, memorySeal: sealed ? 0 : Math.max(20, 100 - Math.round((correct / 3) * 70)) },
    attempts: progress.attempts + 1,
    victories: progress.victories + (sealed ? 1 : 0),
    questionHistory: Array.from(new Set([...progress.questionHistory, ...questionIds])).slice(-80),
    phaseResults: { ...progress.phaseResults, SEAL: { correct, total: 3, completedAt: now.toISOString() } },
    sealDueAt: sealed ? undefined : new Date(now.getTime() + MONSTER_RETRY_DELAY_MS).toISOString(),
    sealedAt: sealed ? now.toISOString() : progress.sealedAt,
    lastBattleAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
};

const seededNumber = (seed: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
};

export const selectMonsterBattleQuestions = (
  questions: Question[],
  progress: MonsterBattleProgressRecord,
  phase: 'INITIAL' | 'SEAL',
): Question[] => {
  const required = phase === 'SEAL' ? 3 : 10;
  const unseen = questions.filter(question => !progress.questionHistory.includes(question.qid));
  const pool = unseen.length >= required ? unseen : questions;
  return [...pool]
    .map(question => ({ question, weight: seededNumber(`${progress.id}:${progress.attempts}:${phase}:${question.qid}`) }))
    .sort((left, right) => left.weight - right.weight)
    .map(item => item.question)
    .slice(0, required);
};

export const formatSealCountdown = (sealDueAt?: string): string => {
  if (!sealDueAt) return 'Chưa đủ điều kiện phong ấn';
  const remaining = Math.max(0, new Date(sealDueAt).getTime() - Date.now());
  if (remaining <= 0) return 'Đã đến hạn kiểm chứng';
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.ceil((remaining % 3_600_000) / 60_000);
  return hours > 0 ? `Còn ${hours} giờ ${minutes} phút` : `Còn ${minutes} phút`;
};
