import {
  LearningErrorTag,
  LearningEvidenceDraft,
  LearningRecommendationRecord,
  Question,
  StudentSkillRecord,
} from '../types';

const MODEL_VERSION = 'adaptive-local-v1' as const;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const addDays = (iso: string, days: number): string => {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + Math.max(0, days));
  return date.toISOString();
};

export interface ErrorRepairProfile {
  title: string;
  diagnosis: string;
  repairAction: string;
  completionCriteria: string;
  estimatedMinutes: number;
}

const ERROR_REPAIR_PROFILES: Record<LearningErrorTag, ErrorRepairProfile> = {
  'Nhớ sai dữ kiện': {
    title: 'Vá lỗi dữ kiện cốt lõi',
    diagnosis: 'Đáp án cho thấy dữ kiện hoặc từ khóa nền chưa được nhớ chắc.',
    repairAction: 'Đọc lại trọng tâm, tự nhắc lại 3 dữ kiện chính rồi làm một câu tương đương.',
    completionCriteria: 'Làm đúng 2 câu cùng kỹ năng, trong đó ít nhất 1 câu không dùng gợi ý.',
    estimatedMinutes: 5,
  },
  'Hiểu sai quan hệ': {
    title: 'Vá lỗi quan hệ địa lí',
    diagnosis: 'Có dấu hiệu nhầm mối liên hệ giữa điều kiện, biểu hiện và kết quả.',
    repairAction: 'Vẽ chuỗi nguyên nhân → biểu hiện → hệ quả rồi đối chiếu lại phương án.',
    completionCriteria: 'Giải thích đúng quan hệ và làm đúng 2 câu tương đương.',
    estimatedMinutes: 7,
  },
  'Nhầm phạm vi không gian': {
    title: 'Hiệu chỉnh phạm vi không gian',
    diagnosis: 'Phạm vi lãnh thổ, vùng hoặc địa điểm có thể đã bị gán nhầm.',
    repairAction: 'Đối chiếu bản đồ/Atlat, khoanh phạm vi và đọc lại tên vùng trước khi trả lời.',
    completionCriteria: 'Xác định đúng phạm vi ở 2 câu mới liên tiếp.',
    estimatedMinutes: 6,
  },
  'Đọc sai bảng hoặc biểu đồ': {
    title: 'Vá kỹ năng đọc số liệu',
    diagnosis: 'Cách đọc trục, đơn vị, chú giải hoặc xu hướng có khả năng chưa chính xác.',
    repairAction: 'Đọc theo thứ tự: tên → đơn vị → mốc thời gian → xu hướng → đối chiếu phương án.',
    completionCriteria: 'Làm đúng 2 câu bảng/biểu đồ và nêu được căn cứ lựa chọn.',
    estimatedMinutes: 8,
  },
  'Sai kỹ năng tính toán': {
    title: 'Vá lỗi tính toán địa lí',
    diagnosis: 'Có thể sai công thức, đổi đơn vị hoặc thao tác làm tròn.',
    repairAction: 'Viết công thức, thay số kèm đơn vị và kiểm tra độ hợp lí trước khi chọn.',
    completionCriteria: 'Tính đúng 2 bài tương đương, không sai đơn vị.',
    estimatedMinutes: 8,
  },
  'Đọc sót từ khóa phủ định': {
    title: 'Khóa từ phủ định',
    diagnosis: 'Từ “không”, “ngoại trừ” hoặc yêu cầu phủ định có thể đã bị bỏ sót.',
    repairAction: 'Gạch chân từ khóa phủ định, nói lại yêu cầu bằng lời của mình rồi mới loại phương án.',
    completionCriteria: 'Làm đúng 3 câu có từ khóa phủ định liên tiếp.',
    estimatedMinutes: 4,
  },
  'Vận dụng chưa đúng': {
    title: 'Vá quy trình vận dụng',
    diagnosis: 'Kiến thức nền có thể đúng nhưng bước áp dụng vào tình huống chưa phù hợp.',
    repairAction: 'Tách câu thành dữ kiện → quy luật → điều kiện áp dụng → kết luận.',
    completionCriteria: 'Làm đúng 2 câu vận dụng mới và giải thích được từng bước.',
    estimatedMinutes: 9,
  },
  'Đọc vội hoặc chọn thiếu căn cứ': {
    title: 'Giảm tốc và kiểm tra căn cứ',
    diagnosis: 'Tốc độ hoặc mức chắc chắn chưa tương xứng với căn cứ lựa chọn.',
    repairAction: 'Dừng 5 giây, loại từng phương án và chỉ chọn khi nêu được một căn cứ rõ ràng.',
    completionCriteria: 'Làm đúng 3 câu với thời gian hợp lí, không đổi đáp án tùy tiện.',
    estimatedMinutes: 5,
  },
  'Nhầm khái niệm': {
    title: 'Phân biệt khái niệm gần nhau',
    diagnosis: 'Hai khái niệm có đặc điểm gần nhau có thể đang bị đồng nhất.',
    repairAction: 'Lập bảng 2 cột: dấu hiệu giống nhau và điểm khác biệt quyết định.',
    completionCriteria: 'Phân biệt đúng khái niệm ở 2 câu mới liên tiếp.',
    estimatedMinutes: 6,
  },
  'Nhầm nguyên nhân và hệ quả': {
    title: 'Sắp lại chuỗi nhân quả',
    diagnosis: 'Nguyên nhân, biểu hiện và hệ quả có dấu hiệu bị đảo vị trí.',
    repairAction: 'Sắp các ý theo thứ tự nguyên nhân → tác động → hệ quả và kiểm tra chiều quan hệ.',
    completionCriteria: 'Làm đúng 2 câu nhân quả và nêu đúng chiều tác động.',
    estimatedMinutes: 7,
  },
  'Câu hỏi có dấu hiệu lỗi': {
    title: 'Tạm giữ bằng chứng câu hỏi',
    diagnosis: 'Câu hỏi hoặc đáp án có dấu hiệu chưa đủ ổn định để dùng kết luận năng lực.',
    repairAction: 'Không trừ năng lực; chuyển câu vào hàng kiểm tra và dùng câu tương đương thay thế.',
    completionCriteria: 'Hoàn thành câu thay thế ổn định; giáo viên quyết định câu gốc.',
    estimatedMinutes: 3,
  },
};

export const getErrorRepairProfile = (tag: LearningErrorTag): ErrorRepairProfile => ERROR_REPAIR_PROFILES[tag];

const deriveReviewIntervalDays = (
  isCorrect: boolean,
  mastery: number,
  confidence: number,
  hintUsed: boolean,
  previousStability: number
): number => {
  if (!isCorrect) return 1;
  const confidenceFactor = clamp(confidence, 0.35, 0.96);
  const masteryFactor = clamp(mastery / 100, 0.1, 1);
  const base = Math.max(2, previousStability || 2);
  const interval = base * (1.15 + masteryFactor * 1.4 + confidenceFactor * 0.8) * (hintUsed ? 0.65 : 1);
  return Math.round(clamp(interval, 2, 45));
};

export const updateAdaptiveSkillRecord = (
  existing: StudentSkillRecord | undefined,
  learnerId: string,
  skillId: string,
  draft: LearningEvidenceDraft,
  now: string
): StudentSkillRecord => {
  const prior = clamp((existing?.masteryEstimate ?? 35) / 100, 0.05, 0.95);
  const guess = clamp(0.2 + (draft.hintUsed ? 0.12 : 0) + (draft.timingFlag === 'FAST' ? 0.08 : 0), 0.12, 0.48);
  const slip = clamp(0.08 + (draft.timingFlag === 'SLOW' ? 0.05 : 0) + (draft.confidence === 'LOW' ? 0.04 : 0), 0.05, 0.3);
  const rawPosterior = draft.isCorrect
    ? (prior * (1 - slip)) / ((prior * (1 - slip)) + ((1 - prior) * guess))
    : (prior * slip) / ((prior * slip) + ((1 - prior) * (1 - guess)));
  // Một lần trả lời không được làm hồ sơ năng lực dao động cực đoan. Bằng chứng
  // mới chỉ chiếm một phần trọng số, sau đó mới áp dụng xác suất học được.
  const evidenceWeight = clamp(0.22 + draft.inferenceConfidence * 0.22, 0.28, 0.45);
  const posterior = prior * (1 - evidenceWeight) + rawPosterior * evidenceWeight;
  const learningRate = clamp(0.08 + draft.inferenceConfidence * 0.12, 0.1, 0.2);
  const learnedPosterior = draft.isCorrect ? posterior + ((1 - posterior) * learningRate) : posterior;
  const masteryEstimate = Number((clamp(learnedPosterior, 0.02, 0.98) * 100).toFixed(1));
  const attempts = (existing?.attempts || 0) + 1;
  const correctCount = (existing?.correctCount || 0) + (draft.isCorrect ? 1 : 0);
  const accuracy = Number(((correctCount / attempts) * 100).toFixed(1));
  const consecutiveCorrect = draft.isCorrect ? (existing?.consecutiveCorrect || 0) + 1 : 0;
  const consecutiveWrong = draft.isCorrect ? 0 : (existing?.consecutiveWrong || 0) + 1;
  const stabilityDays = deriveReviewIntervalDays(
    draft.isCorrect,
    masteryEstimate,
    draft.inferenceConfidence,
    draft.hintUsed,
    existing?.stabilityDays || 2
  );
  const nextReviewAt = addDays(draft.occurredAt, stabilityDays);
  const retentionEstimate = Number(clamp(
    (masteryEstimate / 100) * (draft.isCorrect ? 0.96 : 0.72) * (draft.hintUsed ? 0.9 : 1),
    0.05,
    0.99
  ).toFixed(2));
  const errorTag = draft.errorTags[0];
  const explanation = draft.isCorrect
    ? `Cập nhật tăng vì trả lời đúng; độ chắc chắn bằng chứng ${Math.round(draft.inferenceConfidence * 100)}%; ôn lại sau ${stabilityDays} ngày.`
    : `Cập nhật giảm vì câu sai${errorTag ? `, dấu hiệu “${errorTag}”` : ''}; kiểm chứng lại sau ${stabilityDays} ngày.`;

  return {
    id: `${learnerId}::${skillId}`,
    learnerId,
    topicId: draft.topicId,
    skillId,
    attempts,
    correctCount,
    accuracy,
    masteryEstimate,
    evidenceConfidence: draft.inferenceConfidence,
    consecutiveCorrect,
    consecutiveWrong,
    stabilityDays,
    retentionEstimate,
    nextReviewAt,
    lastCorrectAt: draft.isCorrect ? draft.occurredAt : existing?.lastCorrectAt,
    lastErrorTag: draft.isCorrect ? existing?.lastErrorTag : errorTag,
    modelVersion: MODEL_VERSION,
    explanation,
    lastEventAt: draft.occurredAt,
    updatedAt: now,
  };
};

export const createRepairRecommendation = (
  learnerId: string,
  draft: LearningEvidenceDraft,
  now: string
): LearningRecommendationRecord | undefined => {
  if (draft.isCorrect || !draft.errorTags.length) return undefined;
  const errorTag = draft.questionStatus === 'STABLE' ? draft.errorTags[0] : 'Câu hỏi có dấu hiệu lỗi';
  const profile = getErrorRepairProfile(errorTag);
  const confidence = draft.questionStatus === 'STABLE'
    ? Number(clamp(draft.inferenceConfidence + (draft.errorTags.length === 1 ? 0.06 : 0), 0.35, 0.96).toFixed(2))
    : 0.9;
  const guidance = draft.repairGuidance;
  const choices = draft.contentSnapshot?.choices || {};
  const selectedAnswerKey = String(draft.finalAnswer || '').trim().toUpperCase();
  const correctAnswerKey = String(draft.correctAnswer || guidance?.correctAnswerKey || '').trim().toUpperCase();
  const selectedAnswerText = choices[selectedAnswerKey];
  const correctAnswerText = guidance?.correctAnswerText || choices[correctAnswerKey] || correctAnswerKey;
  const misconception = guidance?.optionFeedback?.[selectedAnswerKey]
    || `${profile.diagnosis} Đáp án đúng là ${correctAnswerKey}: “${correctAnswerText}”.`;
  const sourceLabel = guidance?.sourceLabel || draft.sourceEvidence?.source || '';
  const sourceExcerpt = guidance?.sourceExcerpt || draft.sourceEvidence?.text || guidance?.knowledgeAnchor || '';

  return {
    id: `recommendation-${draft.eventId}-repair`,
    learnerId,
    topicId: draft.topicId,
    sourceEventId: draft.eventId,
    sessionId: draft.sessionId,
    type: 'REPAIR',
    title: guidance?.title || profile.title,
    reason: `${misconception} Độ tin cậy nhận định ${Math.round(confidence * 100)}%.`,
    action: guidance?.repairAction || profile.repairAction,
    estimatedMinutes: profile.estimatedMinutes,
    offlineReady: true,
    completionCriteria: guidance?.verificationPrompt
      ? `Tự trả lời đúng câu kiểm chứng và nêu được căn cứ: ${guidance.verificationPrompt}`
      : profile.completionCriteria,
    priority: confidence >= 0.75 ? 'HIGH' : 'MEDIUM',
    confidence,
    targetSkillIds: draft.skillIds,
    errorTag,
    status: 'PENDING',
    createdAt: now,
    dueAt: addDays(now, 1),
    scientificDetail: guidance ? {
      guidanceVersion: guidance.version,
      questionId: draft.questionId,
      selectedAnswerKey,
      selectedAnswerText,
      correctAnswerKey,
      correctAnswerText,
      knowledgeAnchor: guidance.knowledgeAnchor,
      misconception,
      memoryCue: guidance.memoryCue,
      verificationPrompt: guidance.verificationPrompt,
      sourceLabel,
      sourceExcerpt,
    } : undefined,
  };
};

export const findEquivalentQuestionIndex = (
  questions: Question[],
  currentIndex: number,
  currentQuestion: Question,
  draft: LearningEvidenceDraft,
  answers: Record<string, string>
): number => {
  if (draft.isCorrect || currentIndex >= questions.length - 2) return -1;
  let bestIndex = -1;
  let bestScore = 0;
  for (let index = currentIndex + 1; index < questions.length; index += 1) {
    const candidate = questions[index];
    if (!candidate || answers[candidate.qid]) continue;
    let score = 0;
    const currentSkills = new Set(currentQuestion.skillIds || draft.skillIds);
    const candidateSkills = candidate.skillIds || [];
    if (candidateSkills.some(skill => currentSkills.has(skill))) score += 5;
    const currentErrors = new Set(currentQuestion.errorTags || draft.errorTags);
    if ((candidate.errorTags || []).some(tag => currentErrors.has(tag))) score += 3;
    if ((candidate.cognitiveLevel || candidate.cognitive_level) === draft.cognitiveLevel) score += 2;
    score += Math.max(0, 2 - Math.abs(Number(candidate.difficulty || 1) - draft.difficulty));
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return bestScore >= 5 ? bestIndex : -1;
};
