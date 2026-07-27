import {
  CognitiveLevel,
  LearningErrorTag,
  Question,
  QuestionLifecycleStatus,
  QuestionSourceEvidence,
  Topic,
} from '../types';

const includesAny = (value: string, terms: string[]): boolean => terms.some(term => value.includes(term));

export const deriveQuestionErrorTags = (question: Pick<Question, 'prompt' | 'explain' | 'assets' | 'skill_tag' | 'cognitive_level'>): LearningErrorTag[] => {
  const prompt = `${question.prompt || ''} ${question.explain || ''}`.toLocaleLowerCase('vi');
  const tags: LearningErrorTag[] = [];
  const add = (tag: LearningErrorTag) => {
    if (!tags.includes(tag)) tags.push(tag);
  };

  if (question.assets?.table || question.assets?.chart || question.assets?.map || includesAny(prompt, ['bảng số liệu', 'biểu đồ', 'atlat', 'lược đồ', 'bản đồ'])) {
    add('Đọc sai bảng hoặc biểu đồ');
  }
  if (includesAny(prompt, ['không đúng', 'không phải', 'ngoại trừ', 'không thể', 'sai là'])) {
    add('Đọc sót từ khóa phủ định');
  }
  if (includesAny(prompt, ['tính', 'bao nhiêu', 'tỉ lệ', 'tỉ trọng', 'mật độ', 'năng suất', '%', 'triệu người'])) {
    add('Sai kỹ năng tính toán');
  }
  if (includesAny(prompt, ['vùng nào', 'phân bố', 'tập trung', 'lãnh thổ', 'địa phương', 'khu vực'])) {
    add('Nhầm phạm vi không gian');
  }
  if (includesAny(prompt, ['nguyên nhân', 'hệ quả', 'kết quả', 'do đó', 'dẫn đến', 'tác động chủ yếu'])) {
    add('Nhầm nguyên nhân và hệ quả');
  }
  if (includesAny(prompt, ['khái niệm', 'được hiểu là', 'đặc trưng của', 'phân biệt'])) {
    add('Nhầm khái niệm');
  }

  if (!tags.length) {
    if (question.skill_tag === 'C1' || question.cognitive_level === 'NB') add('Nhớ sai dữ kiện');
    else if (question.skill_tag === 'C2' || question.cognitive_level === 'TH') add('Hiểu sai quan hệ');
    else if (question.skill_tag === 'C3' || question.skill_tag === 'C4' || ['VD', 'VDC'].includes(question.cognitive_level || '')) add('Vận dụng chưa đúng');
    else add('Đọc vội hoặc chọn thiếu căn cứ');
  }

  return tags.slice(0, 3);
};

export const deriveQuestionSkillIds = (
  topicId: number,
  skillTag: Question['skill_tag'],
  cognitiveLevel: CognitiveLevel,
  errorTags: LearningErrorTag[] = []
): string[] => {
  const skills = [
    `T${String(topicId).padStart(2, '0')}-${skillTag}`,
    `${cognitiveLevel}-GEOGRAPHY`,
  ];

  if (errorTags.includes('Đọc sai bảng hoặc biểu đồ')) skills.push('DATA-VISUAL-READING');
  if (errorTags.includes('Sai kỹ năng tính toán')) skills.push('GEOGRAPHY-CALCULATION');
  if (errorTags.includes('Nhầm phạm vi không gian')) skills.push('SPATIAL-REASONING');
  if (errorTags.includes('Đọc sót từ khóa phủ định')) skills.push('QUESTION-KEYWORD-CHECK');
  if (errorTags.includes('Hiểu sai quan hệ') || errorTags.includes('Nhầm nguyên nhân và hệ quả')) skills.push('CAUSE-EFFECT-REASONING');
  if (errorTags.includes('Nhầm khái niệm')) skills.push('CONCEPT-DISCRIMINATION');
  if (errorTags.includes('Câu hỏi có dấu hiệu lỗi')) skills.push('QUESTION-VALIDATION');

  return Array.from(new Set(skills));
};

export const buildDistractorReasons = (question: Pick<Question, 'type' | 'choices' | 'answer_key'>): Record<string, string> | undefined => {
  if (question.type !== 'MCQ' || !question.choices) return undefined;
  return Object.keys(question.choices).reduce<Record<string, string>>((reasons, key) => {
    reasons[key] = key === question.answer_key
      ? 'Phương án đúng theo căn cứ học liệu của câu hỏi.'
      : 'Phương án nhiễu: không khớp hoàn toàn dữ kiện, phạm vi hoặc quan hệ được nêu trong căn cứ.';
    return reasons;
  }, {});
};

export const resolveQuestionCognitiveLevel = (question: Partial<Question>): CognitiveLevel => {
  if (['NB', 'TH', 'VD', 'VDC'].includes(question.cognitiveLevel || '')) return question.cognitiveLevel as CognitiveLevel;
  if (['NB', 'TH', 'VD', 'VDC'].includes(question.cognitive_level || '')) return question.cognitive_level as CognitiveLevel;
  const difficulty = Number(question.difficulty || 1);
  return difficulty <= 1 ? 'NB' : difficulty === 2 ? 'TH' : difficulty === 3 ? 'VD' : 'VDC';
};

export const normalizeQuestionLearningMetadata = (topic: Topic, raw: Question): Question => {
  const topicId = Number(raw.topicId || raw.topic_id || topic.topic_id);
  const cognitiveLevel = resolveQuestionCognitiveLevel(raw);
  const errorTags = raw.errorTags?.length ? raw.errorTags : deriveQuestionErrorTags({ ...raw, cognitive_level: cognitiveLevel });
  const sourceEvidence: QuestionSourceEvidence = raw.sourceEvidence || {
    id: raw.evidence_id,
    text: raw.evidence_text,
    source: raw.source_file,
  };

  return {
    ...raw,
    topic_id: String(topicId),
    topicId,
    cognitive_level: cognitiveLevel,
    cognitiveLevel,
    skillIds: raw.skillIds?.length ? raw.skillIds : deriveQuestionSkillIds(topicId, raw.skill_tag, cognitiveLevel, errorTags),
    errorTags,
    distractorReasons: raw.distractorReasons || buildDistractorReasons(raw),
    sourceEvidence,
    contentVersion: raw.contentVersion || '1.0.0',
    status: (raw.status || 'STABLE') as QuestionLifecycleStatus,
  };
};
