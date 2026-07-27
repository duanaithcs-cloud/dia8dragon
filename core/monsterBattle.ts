import { MonsterBattleDefinition, MonsterBattlePhase, MonsterBattleProgressRecord, MonsterDefenseLayer, Question, Topic } from '../types';

export const MONSTER_BATTLE_VERSION = 'monster-battle-local-v1' as const;
export const MONSTER_SEAL_DELAY_MS = 24 * 60 * 60 * 1000;
export const MONSTER_RETRY_DELAY_MS = 12 * 60 * 60 * 1000;

const DEFINITIONS: Array<Omit<MonsterBattleDefinition, 'topicLabel'>> = [
  { topicId: 1, name: 'La Bàn Lệch Tâm', epithet: 'Kẻ xoay sai tọa độ lãnh thổ', signatureTrick: 'Đánh tráo vị trí rìa đông bán đảo Đông Dương, nội chí tuyến, giáp biển và hệ tọa độ để người học nhầm ý nghĩa vị trí.', archetype: 1, accent: '#00f5ff', accent2: '#2563eb' },
  { topicId: 2, name: 'Ảo Cảnh Vị Trí', epithet: 'Kẻ phủ sương tác động tự nhiên', signatureTrick: 'Làm lẫn ảnh hưởng của vị trí địa lí với biểu hiện khí hậu, sinh vật, đất và sự phân hoá thiên nhiên.', archetype: 2, accent: '#22d3ee', accent2: '#8b5cf6' },
  { topicId: 3, name: 'Sơn Khổng Đồ', epithet: 'Vệ binh ba phần tư đồi núi', signatureTrick: 'Che mờ tỉ lệ đồi núi, đồng bằng, hướng nghiêng và tính phân bậc của địa hình Việt Nam.', archetype: 3, accent: '#6366f1', accent2: '#38bdf8' },
  { topicId: 4, name: 'Mê Cung Địa Hình', epithet: 'Kẻ tráo các khu vực núi', signatureTrick: 'Đảo lẫn Đông Bắc, Tây Bắc, Trường Sơn, đồng bằng và bờ biển khiến học sinh nhận diện sai khu vực địa hình.', archetype: 4, accent: '#818cf8', accent2: '#f97316' },
  { topicId: 5, name: 'Tinh Quặng Ngủ Sâu', epithet: 'Kẻ giấu cơ cấu khoáng sản', signatureTrick: 'Trộn cơ cấu, quy mô, phân bố và giá trị của khoáng sản để người học nhầm loại tài nguyên với nơi tập trung.', archetype: 5, accent: '#a78bfa', accent2: '#f59e0b' },
  { topicId: 6, name: 'Thiết Tượng Mỏ Quặng', epithet: 'Kẻ đổi chỗ than, dầu khí và bô-xít', signatureTrick: 'Đánh tráo phân bố than Quảng Ninh, dầu khí thềm lục địa, bô-xít Tây Nguyên và yêu cầu sử dụng hợp lí.', archetype: 6, accent: '#64748b', accent2: '#f97316' },
  { topicId: 7, name: 'Tam Đai Phân Hóa', epithet: 'Kẻ bẻ hướng sườn núi', signatureTrick: 'Làm lẫn phân hoá thiên nhiên theo độ cao, hướng sườn, địa hình và tác động của địa hình tới tự nhiên.', archetype: 7, accent: '#7c3aed', accent2: '#22c55e' },
  { topicId: 8, name: 'Phong Nhiệt Hỏa Linh', epithet: 'Linh thú khí hậu gió mùa', signatureTrick: 'Đánh tráo tính chất nhiệt đới, ẩm, gió mùa, số giờ nắng, nhiệt độ và lượng mưa.', archetype: 8, accent: '#00d1ff', accent2: '#f97316' },
  { topicId: 9, name: 'Long Mạch Sông Ngòi', epithet: 'Kẻ cuốn trôi lưu vực', signatureTrick: 'Trộn đặc điểm mạng lưới sông, hướng chảy, lưu vực và hệ thống sông lớn khiến học sinh chọn sai căn cứ.', archetype: 9, accent: '#0ea5e9', accent2: '#06b6d4' },
  { topicId: 10, name: 'Vân Giới Bắc Nam', epithet: 'Kẻ kéo lệch ranh khí hậu', signatureTrick: 'Làm lẫn phân hoá khí hậu theo bắc nam, độ cao, mùa và khu vực địa hình.', archetype: 10, accent: '#38bdf8', accent2: '#a78bfa' },
  { topicId: 11, name: 'Bão Ảnh Biến Đổi', epithet: 'Kẻ khuếch đại cực đoan', signatureTrick: 'Đảo lẫn biểu hiện biến đổi nhiệt độ, lượng mưa, thiên tai cực đoan và tác động tới thủy văn.', archetype: 11, accent: '#0ea5e9', accent2: '#f43f5e' },
  { topicId: 12, name: 'Nông Vân Sinh Trưởng', epithet: 'Kẻ tráo mùa vụ và khí hậu', signatureTrick: 'Đánh đồng thuận lợi nguồn nhiệt ẩm với khó khăn thiên tai, sâu bệnh và yêu cầu thích ứng trong nông nghiệp.', archetype: 1, accent: '#22c55e', accent2: '#fbbf24' },
  { topicId: 13, name: 'Hồng Hà Thủy Ấn', epithet: 'Kẻ giấu cấu trúc hệ thống sông', signatureTrick: 'Che sai quan hệ phụ lưu, chi lưu, chế độ nước và giá trị khai thác của một hệ thống sông.', archetype: 2, accent: '#06b6d4', accent2: '#ef4444' },
  { topicId: 14, name: 'Hồ Đầm Thủy Mẫu', epithet: 'Người giữ nước ngầm', signatureTrick: 'Trộn vai trò hồ, đầm, nước ngầm trong sản xuất, sinh hoạt, điều tiết nước và bảo vệ môi trường.', archetype: 3, accent: '#22d3ee', accent2: '#10b981' },
  { topicId: 15, name: 'Biểu Đồ Mắt Bão', epithet: 'Kẻ làm rơi trục nhiệt mưa', signatureTrick: 'Đánh tráo trục nhiệt độ, lượng mưa, mùa mưa khô và cách rút nhận xét từ biểu đồ khí hậu.', archetype: 4, accent: '#60a5fa', accent2: '#f59e0b' },
  { topicId: 16, name: 'Nét Vẽ Khí Tượng', epithet: 'Kẻ làm lệch đường biểu đồ', signatureTrick: 'Làm lẫn thao tác vẽ biểu đồ khí hậu, tính toán, nhận xét và giải thích số liệu.', archetype: 5, accent: '#38bdf8', accent2: '#ec4899' },
  { topicId: 17, name: 'Du Ảnh Mùa Gió', epithet: 'Kẻ đổi mùa du lịch', signatureTrick: 'Trộn vai trò khí hậu với điểm du lịch, loại hình du lịch, mùa vụ và điều kiện khai thác.', archetype: 6, accent: '#0ea5e9', accent2: '#fbbf24' },
  { topicId: 18, name: 'Hiệp Sĩ Thích Ứng', epithet: 'Kẻ thử lòng giải pháp khí hậu', signatureTrick: 'Đảo lẫn giảm nhẹ, thích ứng, tiết kiệm năng lượng, trồng cây và ứng phó thiên tai.', archetype: 7, accent: '#14b8a6', accent2: '#84cc16' },
  { topicId: 19, name: 'Thủy Khế Tổng Hợp', epithet: 'Kẻ khóa sai tài nguyên nước', signatureTrick: 'Làm người học nhầm khai thác tổng hợp nước với khai thác đơn ngành, lãng phí nước và suy thoái lưu vực.', archetype: 8, accent: '#0284c7', accent2: '#22c55e' },
  { topicId: 20, name: 'Thiên Tai Phản Chiếu', epithet: 'Kẻ nhiễu tác động tự nhiên', signatureTrick: 'Trộn tác động biến đổi khí hậu tới tự nhiên với tác động tới sản xuất và đời sống.', archetype: 9, accent: '#0891b2', accent2: '#ef4444' },
  { topicId: 21, name: 'Tam Thổ Hộ Pháp', epithet: 'Vệ binh ba nhóm đất', signatureTrick: 'Đánh tráo đất feralit, phù sa, đất mùn núi cao và đặc điểm phân bố của từng nhóm đất.', archetype: 10, accent: '#00ff88', accent2: '#a16207' },
  { topicId: 22, name: 'Feralit Hỏa Diệp', epithet: 'Kẻ giấu tính nhiệt đới gió mùa', signatureTrick: 'Làm lẫn nhân tố hình thành đất, quá trình feralit, rửa trôi, tích tụ oxit sắt nhôm và độ phì đất.', archetype: 11, accent: '#22c55e', accent2: '#ef4444' },
  { topicId: 23, name: 'Đất Đỏ Canh Tác', epithet: 'Kẻ tráo giá trị feralit', signatureTrick: 'Đánh tráo phân bố đất feralit với giá trị trồng rừng, cây công nghiệp và yêu cầu chống xói mòn.', archetype: 1, accent: '#16a34a', accent2: '#dc2626' },
  { topicId: 24, name: 'Phù Sa Ngọc Mạch', epithet: 'Kẻ đổi màu châu thổ', signatureTrick: 'Trộn phân bố đất phù sa, độ phì, giá trị trồng lúa hoa màu và vấn đề cải tạo sử dụng.', archetype: 2, accent: '#84cc16', accent2: '#0ea5e9' },
  { topicId: 25, name: 'Vạn Sinh Huyễn Thú', epithet: 'Kẻ giấu đa dạng loài', signatureTrick: 'Làm mờ đa dạng loài, nguồn gen, hệ sinh thái và ví dụ sinh vật quý hiếm ở Việt Nam.', archetype: 3, accent: '#10b981', accent2: '#8b5cf6' },
  { topicId: 26, name: 'Hoang Mạc Bạc Màu', epithet: 'Kẻ rút kiệt đất đai', signatureTrick: 'Đảo lẫn xói mòn, rửa trôi, nhiễm mặn, nhiễm phèn, hoang mạc hoá và biện pháp chống thoái hoá đất.', archetype: 4, accent: '#a3e635', accent2: '#f97316' },
  { topicId: 27, name: 'Linh Thú Bảo Tồn', epithet: 'Người gác đa dạng sinh học', signatureTrick: 'Trộn suy giảm số lượng loài, suy giảm hệ sinh thái, nguyên nhân và giải pháp bảo tồn.', archetype: 5, accent: '#22c55e', accent2: '#06b6d4' },
  { topicId: 28, name: 'Hải Bàn Đông Hải', epithet: 'Kẻ xoay phạm vi Biển Đông', signatureTrick: 'Đánh tráo diện tích Biển Đông, vùng biển Việt Nam, tọa độ và các quốc gia chung Biển Đông.', archetype: 6, accent: '#3357ff', accent2: '#22d3ee' },
  { topicId: 29, name: 'Đảo Ảnh Địa Mạo', epithet: 'Kẻ đổi dạng bờ biển', signatureTrick: 'Làm lẫn địa hình ven biển, thềm lục địa, vũng vịnh, đầm phá, cồn cát và đặc điểm tự nhiên biển đảo.', archetype: 7, accent: '#2563eb', accent2: '#f59e0b' },
  { topicId: 30, name: 'Kho Báu Thềm Lục Địa', epithet: 'Kẻ giấu tài nguyên biển', signatureTrick: 'Trộn sinh vật biển, dầu khí, khoáng sản, giao thông biển và giá trị khai thác tổng hợp.', archetype: 8, accent: '#1d4ed8', accent2: '#10b981' },
  { topicId: 31, name: 'Ô Nhiễm Hải Vực', epithet: 'Kẻ phủ độc môi trường biển', signatureTrick: 'Đánh tráo đặc điểm môi trường biển đảo, biểu hiện ô nhiễm, nguyên nhân và giải pháp bảo vệ.', archetype: 9, accent: '#0f766e', accent2: '#f43f5e' },
  { topicId: 32, name: 'Pháp Ấn Biển Xanh', epithet: 'Người canh đường cơ sở', signatureTrick: 'Làm nhiễu nội thủy, lãnh hải, vùng tiếp giáp, đặc quyền kinh tế, thềm lục địa và luật biển Việt Nam.', archetype: 10, accent: '#3b82f6', accent2: '#fbbf24' },
  { topicId: 33, name: 'Chủ Quyền Hải Long', epithet: 'Hộ pháp kinh tế biển đảo', signatureTrick: 'Trộn thuận lợi, khó khăn kinh tế biển, bảo vệ môi trường và trách nhiệm bảo vệ chủ quyền biển đảo.', archetype: 11, accent: '#1e40af', accent2: '#ef4444' },
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
