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
    title: 'Chương I · Mạch sống dân cư',
    subtitle: 'Dân tộc, phân bố dân cư và lao động',
    topicIds: [1, 2, 3],
    orbName: 'Ngọc Nhân Văn',
    orbColor: '#38bdf8',
    bossName: 'Huyễn Chủ Nhân Văn',
    bossTrick: 'Tráo số liệu dân cư, mật độ và chất lượng lao động trong cùng một chuỗi suy luận.',
    clue: 'Tần số đầu tiên xuất hiện nơi con người, lãnh thổ và việc làm cùng giao thoa.',
  },
  {
    id: 2,
    title: 'Chương II · Nguồn lực sinh tồn',
    subtitle: 'Biến động dân cư, nông nghiệp, lâm nghiệp và thủy sản',
    topicIds: [4, 5, 6],
    orbName: 'Ngọc Sinh Kế',
    orbColor: '#22c55e',
    bossName: 'Mộc Hải Song Vương',
    bossTrick: 'Đánh đồng điều kiện tự nhiên với giải pháp phát triển và bảo vệ tài nguyên.',
    clue: 'Mảnh ngọc thứ hai cộng hưởng với rừng, đồng ruộng và vùng biển nuôi sống con người.',
  },
  {
    id: 3,
    title: 'Chương III · Dòng chảy kinh tế',
    subtitle: 'Công nghiệp, dịch vụ, thương mại và du lịch',
    topicIds: [7, 8, 9],
    orbName: 'Ngọc Liên Kết',
    orbColor: '#f59e0b',
    bossName: 'Cơ Thương Mê Thành',
    bossTrick: 'Hoán đổi vai trò ngành, thị trường, hạ tầng và các trung tâm kinh tế.',
    clue: 'Tần số thứ ba nằm trên mạng lưới kết nối hàng hóa, con người và thông tin.',
  },
  {
    id: 4,
    title: 'Chương IV · Miền Bắc chuyển động',
    subtitle: 'Trung du miền núi, Đồng bằng sông Hồng và Bắc Trung Bộ',
    topicIds: [10, 11, 12],
    orbName: 'Ngọc Bắc Vực',
    orbColor: '#8b5cf6',
    bossName: 'Trường Sơn Hồng Hà',
    bossTrick: 'Trộn tiểu vùng, thế mạnh, hạn chế và liên kết lãnh thổ của ba vùng kinh tế.',
    clue: 'Mảnh ngọc thứ tư ẩn giữa núi cao, châu thổ và dải đất hẹp ven biển.',
  },
  {
    id: 5,
    title: 'Chương V · Miền Nam hội tụ',
    subtitle: 'Duyên hải Nam Trung Bộ, Tây Nguyên, Đông Nam Bộ và Đồng bằng sông Cửu Long',
    topicIds: [13, 14, 15],
    orbName: 'Ngọc Nam Phương',
    orbColor: '#ec4899',
    bossName: 'Cao Nguyên Cửu Long',
    bossTrick: 'Đánh tráo thế mạnh vùng, liên kết lãnh thổ và sức ép phát triển nhanh.',
    clue: 'Tần số thứ năm lan từ cao nguyên bazan xuống vùng kinh tế động lực và châu thổ cuối nguồn.',
  },
  {
    id: 6,
    title: 'Chương VI · Biển và khí hậu',
    subtitle: 'Biến đổi khí hậu và kinh tế biển đảo',
    topicIds: [16, 17],
    orbName: 'Ngọc Hải Khí',
    orbColor: '#06b6d4',
    bossName: 'Phong Triều Biến Dị',
    bossTrick: 'Trộn nguyên nhân, tác động, thích ứng khí hậu với khai thác tổng hợp biển đảo.',
    clue: 'Mảnh ngọc thứ sáu chỉ hiện khi người học đọc đúng tín hiệu của khí hậu và đại dương.',
  },
  {
    id: 7,
    title: 'Chương VII · Dấu ấn lãnh thổ',
    subtitle: 'Đô thị, văn minh châu thổ và chủ quyền Biển Đông',
    topicIds: [18, 19, 20],
    orbName: 'Ngọc Chủ Quyền',
    orbColor: '#ef4444',
    bossName: 'Cổ Ấn Hải Quyền',
    bossTrick: 'Đảo lẫn lịch sử đô thị, thích nghi châu thổ và các khái niệm pháp lí về biển đảo.',
    clue: 'Viên ngọc cuối cùng nằm ở giao điểm giữa ký ức lãnh thổ và trách nhiệm công dân.',
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
    compassCalibration: Math.min(100, Math.round((sealedCount / 20) * 72 + (collected.size / 7) * 28)),
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
