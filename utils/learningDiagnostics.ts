import { LearningErrorTag, LearningRecommendation, Question, Topic } from '../types';
import { deriveQuestionErrorTags } from './questionMetadata';

const normalizeAnswer = (value: string | undefined): string => {
  const normalized = (value || '').toUpperCase().trim();
  if (['TRUE', 'T', 'ĐÚNG', '1'].includes(normalized)) return 'TRUE';
  if (['FALSE', 'F', 'SAI', '0'].includes(normalized)) return 'FALSE';
  return normalized;
};

export const classifyLearningError = (question: Question): LearningErrorTag => deriveQuestionErrorTags(question)[0] || 'Đọc vội hoặc chọn thiếu căn cứ';

export const collectLearningErrors = (
  questions: Question[],
  answers: Record<string, string>
): LearningErrorTag[] => questions
  .filter(question => question.status !== 'QUARANTINED')
  .filter(question => normalizeAnswer(answers[question.qid]) !== normalizeAnswer(question.answer_key))
  .map(classifyLearningError);

export const countLearningErrors = (tags: string[]): Array<{ tag: string; count: number }> => {
  const counts = new Map<string, number>();
  tags.forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1));
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'vi'));
};

const weakestCompetency = (topic: Topic): keyof Topic['competency_scores'] => {
  const pairs = Object.entries(topic.competency_scores || {}) as Array<[keyof Topic['competency_scores'], number]>;
  return pairs.sort((a, b) => a[1] - b[1])[0]?.[0] || 'C1';
};

const actionFromTag = (tag?: string): string => {
  if (tag === 'Đọc sai bảng hoặc biểu đồ') return 'Mở lại Trọng tâm có bảng/biểu đồ, sau đó làm 10 câu Tư liệu.';
  if (tag === 'Sai kỹ năng tính toán') return 'Ôn công thức, kiểm tra đơn vị rồi làm 10 câu Nhớ trước khi làm 25 câu.';
  if (tag === 'Đọc sót từ khóa phủ định') return 'Gạch chân “không/ngoại trừ” và làm 10 câu với tốc độ chậm.';
  if (tag === 'Nhầm phạm vi không gian') return 'Đối chiếu bản đồ, tên vùng và phạm vi lãnh thổ trước khi luyện lại.';
  if (tag === 'Hiểu sai quan hệ' || tag === 'Nhầm nguyên nhân và hệ quả') return 'Đọc lại chuỗi nguyên nhân → biểu hiện → hệ quả trong Trọng tâm và Tự luận.';
  if (tag === 'Nhầm khái niệm') return 'Lập bảng so sánh hai khái niệm gần nhau và tìm dấu hiệu phân biệt quyết định.';
  if (tag === 'Câu hỏi có dấu hiệu lỗi') return 'Tạm bỏ qua câu gốc, làm câu tương đương và chuyển câu cần kiểm tra cho giáo viên.';
  if (tag === 'Vận dụng chưa đúng') return 'Làm lại câu vận dụng theo từng bước: dữ kiện → quy luật → kết luận.';
  if (tag === 'Nhớ sai dữ kiện') return 'Ôn các số liệu và từ khóa cốt lõi, sau đó làm bộ 10 câu Nhớ.';
  return 'Đọc chậm câu hỏi, loại từng phương án và chỉ chọn khi có căn cứ.';
};

export const buildLearningRecommendations = (topics: Topic[], limit = 3): LearningRecommendation[] => {
  return topics
    .map(topic => {
      const topError = countLearningErrors(topic.error_tags || [])[0]?.tag as LearningErrorTag | undefined;
      const weak = weakestCompetency(topic);
      const priorityScore = (100 - Math.min(100, topic.mastery_percent || 0)) + (topic.error_tags?.length || 0) * 7 + (topic.attempts_count === 0 ? 16 : 0);
      const priority: LearningRecommendation['priority'] = priorityScore >= 80 ? 'HIGH' : priorityScore >= 45 ? 'MEDIUM' : 'LOW';
      const reason = topError
        ? `Lỗi nổi bật: ${topError}; mức nắm vững ${Math.round(topic.mastery_percent || 0)}%.`
        : topic.attempts_count === 0
          ? 'Chuyên đề chưa có lượt luyện; cần một bài chẩn đoán ngắn.'
          : `Năng lực ${weak} đang thấp nhất; mức nắm vững ${Math.round(topic.mastery_percent || 0)}%.`;
      return {
        topicId: topic.topic_id,
        title: topic.keyword_label,
        reason,
        action: actionFromTag(topError),
        priority,
        errorTag: topError,
        score: priorityScore,
      };
    })
    .sort((a, b) => b.score - a.score || a.topicId - b.topicId)
    .slice(0, Math.max(1, limit))
    .map(({ score: _score, ...recommendation }) => recommendation);
};

export const buildQuizRecommendations = (
  topic: Topic,
  questions: Question[],
  answers: Record<string, string>,
  limit = 3
): LearningRecommendation[] => {
  const errors = countLearningErrors(collectLearningErrors(questions, answers));
  if (!errors.length) {
    return [{
      topicId: topic.topic_id,
      title: 'Duy trì độ chắc chắn',
      reason: 'Phiên này không ghi nhận câu sai.',
      action: 'Chuyển sang bộ 25 câu hoặc Thi đấu để kiểm tra độ bền kiến thức.',
      priority: 'LOW',
    }];
  }

  return errors.slice(0, limit).map((item, index) => ({
    topicId: topic.topic_id,
    title: item.tag,
    reason: `${item.count} câu sai có dấu hiệu thuộc nhóm lỗi này.`,
    action: actionFromTag(item.tag),
    priority: index === 0 ? 'HIGH' : 'MEDIUM',
    errorTag: item.tag as LearningErrorTag,
  }));
};
