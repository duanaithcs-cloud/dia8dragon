import {
  CompassRecommendation,
  JourneyChapterDefinition,
  JourneyChapterProgress,
  JourneyProgressRecord,
  MonsterBattleProgressRecord,
  StudentSkillRecord,
  ErrorCaseRecord,
  LearningReviewQueueRecord,
  Topic,
} from '../types';

export const SEVEN_ORB_JOURNEY_VERSION = 'seven-orb-journey-v1' as const;

export const SEVEN_ORB_CHAPTERS: JourneyChapterDefinition[] = [
  {
    id: 1,
    title: 'Chương I · Nền móng lãnh thổ',
    subtitle: 'Vị trí địa lí, phạm vi lãnh thổ, địa hình và khoáng sản',
    topicIds: [1, 2, 3, 4, 5, 6, 7],
    orbName: 'Ngọc Lãnh Thổ',
    orbColor: '#38bdf8',
    bossName: 'Sơn Ấn Lãnh Thổ',
    bossTrick: 'Trộn vị trí, phạm vi lãnh thổ, đặc điểm địa hình và khoáng sản khiến người học nhầm điều kiện tự nhiên với thế mạnh khai thác.',
    clue: 'Viên ngọc đầu tiên hiện ra khi bản đồ, địa hình và tài nguyên được đặt đúng vị trí.',
  },
  {
    id: 2,
    title: 'Chương II · Khí hậu gió mùa',
    subtitle: 'Khí hậu nhiệt đới ẩm gió mùa, phân hoá khí hậu và tác động tới sản xuất',
    topicIds: [8, 9, 10, 11, 12],
    orbName: 'Ngọc Khí Vân',
    orbColor: '#22c55e',
    bossName: 'Phong Vân Nhiệt Đới',
    bossTrick: 'Đảo lẫn tính chất nhiệt đới, gió mùa, phân hoá khí hậu, hệ thống sông và tác động biến đổi khí hậu.',
    clue: 'Mảnh ngọc thứ hai chỉ sáng khi người học đọc đúng tín hiệu nhiệt, mưa, gió mùa và dòng chảy.',
  },
  {
    id: 3,
    title: 'Chương III · Sông nước và thích ứng',
    subtitle: 'Hệ thống sông, hồ đầm, biểu đồ khí hậu, du lịch, ứng phó khí hậu và tài nguyên nước',
    topicIds: [13, 14, 15, 16, 17, 18, 19, 20],
    orbName: 'Ngọc Thủy Khí',
    orbColor: '#f59e0b',
    bossName: 'Thủy Ảnh Biến Thiên',
    bossTrick: 'Làm lẫn đọc biểu đồ, phân tích hệ thống sông, vai trò nước, du lịch khí hậu và giải pháp ứng phó biến đổi khí hậu.',
    clue: 'Tần số thứ ba nằm trong đường biểu đồ, mực nước, hồ đầm và những lựa chọn thích ứng.',
  },
  {
    id: 4,
    title: 'Chương IV · Đất mẹ nhiệt đới',
    subtitle: 'Ba nhóm đất chính, tính chất thổ nhưỡng và giá trị sử dụng đất',
    topicIds: [21, 22, 23, 24],
    orbName: 'Ngọc Thổ Nhưỡng',
    orbColor: '#8b5cf6',
    bossName: 'Thổ Linh Feralit',
    bossTrick: 'Trộn nhóm đất feralit, đất phù sa, quá trình hình thành đất và giá trị sử dụng khiến học sinh nhầm phân bố với tính chất.',
    clue: 'Mảnh ngọc thứ tư ẩn dưới lớp đất đỏ, đất phù sa và dấu vết khí hậu gió mùa.',
  },
  {
    id: 5,
    title: 'Chương V · Sinh giới hộ mệnh',
    subtitle: 'Đa dạng sinh vật, chống thoái hoá đất và bảo tồn đa dạng sinh học',
    topicIds: [25, 26, 27],
    orbName: 'Ngọc Sinh Giới',
    orbColor: '#ec4899',
    bossName: 'Mộc Thú Bảo Tồn',
    bossTrick: 'Đánh tráo đa dạng thành phần loài, suy giảm sinh học, thoái hoá đất và biện pháp bảo vệ.',
    clue: 'Tần số thứ năm mở khi người học nối được sinh vật, đất và trách nhiệm bảo tồn.',
  },
  {
    id: 6,
    title: 'Chương VI · Biển đảo tự nhiên',
    subtitle: 'Phạm vi Biển Đông, vùng biển Việt Nam, tự nhiên biển đảo và tài nguyên biển',
    topicIds: [28, 29, 30],
    orbName: 'Ngọc Hải Nguyên',
    orbColor: '#06b6d4',
    bossName: 'Hải Long Thềm Lục Địa',
    bossTrick: 'Trộn phạm vi Biển Đông, các bộ phận vùng biển, địa hình ven biển, sinh vật biển và tài nguyên thềm lục địa.',
    clue: 'Mảnh ngọc thứ sáu nằm giữa sóng, đảo, thềm lục địa và nguồn tài nguyên biển.',
  },
  {
    id: 7,
    title: 'Chương VII · Chủ quyền biển đảo',
    subtitle: 'Môi trường biển đảo, luật biển, kinh tế biển và bảo vệ chủ quyền',
    topicIds: [31, 32, 33],
    orbName: 'Ngọc Hải Quyền',
    orbColor: '#ef4444',
    bossName: 'Cổ Ấn Chủ Quyền',
    bossTrick: 'Làm nhiễu môi trường biển, luật biển, thuận lợi khó khăn kinh tế biển và trách nhiệm bảo vệ chủ quyền.',
    clue: 'Viên ngọc cuối cùng sáng lên khi tri thức biển đảo gắn với hành động bảo vệ Tổ quốc.',
  },
];

const createChapterProgress = (chapterId: number): JourneyChapterProgress => ({
  chapterId,
  status: chapterId === 1 ? 'OPEN' : 'LOCKED',
  bossStatus: 'LOCKED',
  recoveredOrb: false,
  bossAttempts: 0,
  bossBestCorrect: 0,
  bossQuestionHistory: [],
});

export const createDefaultJourneyProgress = (learnerId: string): JourneyProgressRecord => {
  const now = new Date().toISOString();
  return {
    id: `journey-progress:${learnerId}`,
    learnerId,
    version: SEVEN_ORB_JOURNEY_VERSION,
    collectedOrbIds: [],
    frequencyFragments: 0,
    compassCalibration: 0,
    chapters: SEVEN_ORB_CHAPTERS.map(chapter => createChapterProgress(chapter.id)),
    currentChapterId: 1,
    createdAt: now,
    updatedAt: now,
  };
};

export const reconcileJourneyProgress = (
  current: JourneyProgressRecord,
  monsterProgress: Record<number, MonsterBattleProgressRecord>,
): JourneyProgressRecord => {
  const collected = new Set(current.collectedOrbIds || []);
  const sealedCount = Object.values(monsterProgress).filter(item => item.status === 'SEALED').length;
  const chapters = SEVEN_ORB_CHAPTERS.map((chapter, index) => {
    const previous = current.chapters?.find(item => item.chapterId === chapter.id) || createChapterProgress(chapter.id);
    const allSealed = chapter.topicIds.every(topicId => monsterProgress[topicId]?.status === 'SEALED');
    const priorRecovered = index === 0 || collected.has(SEVEN_ORB_CHAPTERS[index - 1].id);
    const recoveredOrb = collected.has(chapter.id) || previous.recoveredOrb;
    const status = recoveredOrb
      ? 'ORB_RECOVERED'
      : allSealed && priorRecovered
        ? 'BOSS_READY'
        : priorRecovered
          ? 'OPEN'
          : 'LOCKED';
    return {
      ...previous,
      recoveredOrb,
      status,
      bossStatus: recoveredOrb ? 'DEFEATED' : status === 'BOSS_READY' ? 'READY' : previous.bossStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'LOCKED',
    } satisfies JourneyChapterProgress;
  });
  const currentChapter = chapters.find(item => !item.recoveredOrb && item.status !== 'LOCKED')?.chapterId || 7;
  return {
    ...current,
    chapters,
    frequencyFragments: Math.max(current.frequencyFragments || 0, sealedCount),
    compassCalibration: Math.min(100, Math.round((sealedCount / 33) * 72 + (collected.size / 7) * 28)),
    currentChapterId: currentChapter,
    updatedAt: new Date().toISOString(),
  };
};

export const completeChapterBoss = (
  current: JourneyProgressRecord,
  chapterId: number,
  correct: number,
  questionIds: string[],
): JourneyProgressRecord => {
  const passed = correct >= 4;
  const collected = new Set(current.collectedOrbIds || []);
  if (passed) collected.add(chapterId);
  const chapters = current.chapters.map(chapter => chapter.chapterId === chapterId
    ? {
        ...chapter,
        status: passed ? 'ORB_RECOVERED' : 'BOSS_READY',
        bossStatus: passed ? 'DEFEATED' : 'READY',
        recoveredOrb: passed,
        recoveredAt: passed ? new Date().toISOString() : chapter.recoveredAt,
        bossAttempts: chapter.bossAttempts + 1,
        bossBestCorrect: Math.max(chapter.bossBestCorrect, correct),
        bossQuestionHistory: Array.from(new Set([...(chapter.bossQuestionHistory || []), ...questionIds])).slice(-70),
      }
    : chapter);
  return {
    ...current,
    collectedOrbIds: Array.from(collected).sort((a, b) => a - b),
    chapters: chapters.map(chapter => chapter.chapterId === chapterId + 1 && passed && chapter.status === 'LOCKED' ? { ...chapter, status: 'OPEN' } : chapter),
    currentChapterId: Math.min(7, passed ? chapterId + 1 : chapterId),
    updatedAt: new Date().toISOString(),
  };
};

export interface CompassSourceSnapshot {
  skills: StudentSkillRecord[];
  errors: ErrorCaseRecord[];
  reviews: LearningReviewQueueRecord[];
  monsterProgress: Record<number, MonsterBattleProgressRecord>;
  topicWeights?: Record<number, number>;
}

const topicLabel = (topics: Topic[], topicId: number): string =>
  topics.find(topic => topic.topic_id === topicId)?.keyword_label || `Chuyên đề ${topicId}`;

export const buildCompassRecommendations = (
  learnerId: string,
  topics: Topic[],
  snapshot: CompassSourceSnapshot,
  limit = 3,
): CompassRecommendation[] => {
  const now = Date.now();
  const score = new Map<number, { value: number; source: CompassRecommendation['source']; reason: string; confidence: number }>();
  const add = (topicId: number, value: number, source: CompassRecommendation['source'], reason: string, confidence: number) => {
    const weighted = value * Math.max(0.5, Math.min(2, snapshot.topicWeights?.[topicId] || 1));
    const existing = score.get(topicId);
    if (!existing || weighted > existing.value) score.set(topicId, { value: weighted, source, reason, confidence });
  };

  snapshot.skills.filter(item => item.learnerId === learnerId).forEach(skill => {
    const weakness = 100 - skill.masteryEstimate;
    if (weakness >= 25) add(skill.topicId, weakness, 'WEAK_SKILL', `${skill.skillId} mới đạt khoảng ${Math.round(skill.masteryEstimate)}% và cần thêm bằng chứng.`, skill.evidenceConfidence);
    if (Date.parse(skill.nextReviewAt || '') <= now) add(skill.topicId, 88, 'DUE_REVIEW', `${skill.skillId} đã đến hạn kiểm chứng ghi nhớ.`, Math.max(.65, skill.evidenceConfidence));
  });
  snapshot.errors.filter(item => item.learnerId === learnerId && item.status === 'OPEN').forEach(error => {
    add(error.topicId, 92, 'OPEN_ERROR', `Còn lỗi mở: ${error.errorTag}.`, .82);
  });
  snapshot.reviews.filter(item => item.learnerId === learnerId && item.status === 'PENDING' && (!item.dueAt || Date.parse(item.dueAt) <= now)).forEach(review => {
    add(review.topicId, 86, 'DUE_REVIEW', review.detail || 'Có nhiệm vụ kiểm chứng đến hạn.', .76);
  });
  SEVEN_ORB_CHAPTERS.flatMap(chapter => chapter.topicIds).forEach(topicId => {
    const progress = snapshot.monsterProgress[topicId];
    if (!progress || progress.status !== 'SEALED') add(topicId, progress?.status === 'AWAITING_SEAL' ? 78 : 58, 'MONSTER_PROGRESS', progress?.status === 'AWAITING_SEAL' ? 'Yêu quái đang chờ phong ấn bằng câu mới.' : 'Chuyên đề chưa hoàn tất đủ ba lớp phòng thủ.', .72);
  });

  return [...score.entries()]
    .sort((left, right) => right[1].value - left[1].value)
    .slice(0, limit)
    .map(([topicId, item], index) => ({
      id: `compass:${learnerId}:${topicId}:${index}`,
      topicId,
      title: topicLabel(topics, topicId),
      reason: item.reason,
      estimatedMinutes: item.source === 'DUE_REVIEW' ? 6 : item.source === 'OPEN_ERROR' ? 8 : 10,
      confidence: Number(Math.min(.96, Math.max(.5, item.confidence)).toFixed(2)),
      offlineReady: true,
      source: item.source,
    }));
};
