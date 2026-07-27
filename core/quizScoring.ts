import { Question, RankLevel } from '../types';

export const normalizeAnswer = (value: string | undefined): string => {
  if (!value) return '';
  const normalized = value.toUpperCase().trim();
  if (['TRUE', 'T', 'ĐÚNG', '1'].includes(normalized)) return 'TRUE';
  if (['FALSE', 'F', 'SAI', '0'].includes(normalized)) return 'FALSE';
  return normalized;
};

export const getRankFromPoints = (points: number): RankLevel => {
  if (points < 500) return RankLevel.DONG;
  if (points < 1500) return RankLevel.BAC;
  if (points < 3000) return RankLevel.VANG;
  if (points < 5000) return RankLevel.BACH_KIM;
  if (points < 8000) return RankLevel.KIM_CUONG;
  if (points < 12000) return RankLevel.CAO_THU;
  return RankLevel.THACH_DAU;
};

export interface QuizScoreResult {
  correctCount: number;
  scoreTotal: number;
  accuracy: number;
  competencyDelta: { C1: number; C2: number; C3: number; C4: number };
}

export const scoreQuizAnswers = (questions: Question[], answers: Record<string, string>): QuizScoreResult => {
  let correctCount = 0;
  let scoreTotal = 0;
  const competencyDelta = { C1: 0, C2: 0, C3: 0, C4: 0 };
  const evaluatedQuestions = questions.filter(question => question.status !== 'QUARANTINED');
  evaluatedQuestions.forEach(question => {
    const correct = normalizeAnswer(answers[question.qid]) === normalizeAnswer(question.answer_key);
    if (!correct) return;
    correctCount += 1;
    scoreTotal += 10 * (question.difficulty || 1);
    if (question.skill_tag in competencyDelta) competencyDelta[question.skill_tag as keyof typeof competencyDelta] += 1;
  });
  return {
    correctCount,
    scoreTotal,
    competencyDelta,
    accuracy: evaluatedQuestions.length ? (correctCount / evaluatedQuestions.length) * 100 : 0
  };
};
