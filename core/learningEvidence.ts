import {
  LearningEvidenceDraft,
  LearningErrorTag,
  Question,
  QuizSession,
  ResponseTimingFlag,
  StudentConfidence,
} from '../types';
import {
  deriveQuestionErrorTags,
  deriveQuestionSkillIds,
  resolveQuestionCognitiveLevel,
} from '../utils/questionMetadata';

const normalizeAnswer = (value: string): string => {
  const normalized = value.toUpperCase().trim();
  if (['TRUE', 'T', 'ĐÚNG', '1'].includes(normalized)) return 'TRUE';
  if (['FALSE', 'F', 'SAI', '0'].includes(normalized)) return 'FALSE';
  return normalized;
};

const createId = (prefix: string): string => {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
};

export const createLearningSessionId = (): string => createId('learn-session');

export const classifyResponseTiming = (question: Question, responseTimeMs: number): ResponseTimingFlag => {
  const difficulty = Math.max(1, Number(question.difficulty || 1));
  const fastThreshold = question.type === 'FILL' ? 1800 + difficulty * 450 : 900 + difficulty * 350;
  const slowThreshold = question.type === 'FILL' ? 120_000 : 75_000 + difficulty * 8_000;
  if (responseTimeMs < fastThreshold) return 'FAST';
  if (responseTimeMs > slowThreshold) return 'SLOW';
  return 'EXPECTED';
};

const calculateInferenceConfidence = (
  isCorrect: boolean,
  question: Question,
  timingFlag: ResponseTimingFlag,
  confidence: StudentConfidence,
  hintUsed: boolean,
  errorTags: LearningErrorTag[]
): number => {
  let score = isCorrect ? 0.72 : 0.52;
  if (question.sourceEvidence?.text || question.evidence_text) score += 0.08;
  if (question.skillIds?.length) score += 0.06;
  if (errorTags.length) score += 0.08;
  if (timingFlag === 'EXPECTED') score += 0.08;
  if (timingFlag === 'FAST') score -= 0.12;
  if (confidence === 'HIGH') score += 0.04;
  if (confidence === 'LOW') score -= 0.03;
  if (hintUsed) score -= 0.03;
  return Number(Math.min(0.96, Math.max(0.35, score)).toFixed(2));
};

export interface CreateLearningEvidenceInput {
  session: QuizSession;
  question: Question;
  answer: string;
  firstAnswer?: string;
  responseTimeMs: number;
  confidence: StudentConfidence;
  hintUsed: boolean;
}

export const createLearningEvidenceDraft = ({
  session,
  question,
  answer,
  firstAnswer = answer,
  responseTimeMs,
  confidence,
  hintUsed,
}: CreateLearningEvidenceInput): LearningEvidenceDraft => {
  const cognitiveLevel = resolveQuestionCognitiveLevel(question);
  const topicId = Number(question.topicId || question.topic_id || session.topic_id);
  const normalizedAnswer = normalizeAnswer(answer);
  const normalizedKey = normalizeAnswer(question.answer_key);
  const isCorrect = normalizedAnswer === normalizedKey;
  const timingFlag = classifyResponseTiming(question, responseTimeMs);
  const candidateErrorTags = question.errorTags?.length
    ? question.errorTags
    : deriveQuestionErrorTags({ ...question, cognitive_level: cognitiveLevel });
  const errorTags = isCorrect ? [] : candidateErrorTags.slice(0, 3);
  const skillIds = question.skillIds?.length
    ? question.skillIds
    : deriveQuestionSkillIds(topicId, question.skill_tag, cognitiveLevel, candidateErrorTags);

  return {
    eventId: createId('learning-event'),
    sessionId: session.session_id || createLearningSessionId(),
    occurredAt: new Date().toISOString(),
    topicId,
    questionId: question.qid,
    questionVersion: question.contentVersion || '1.0.0',
    questionStatus: question.status || 'STABLE',
    assessmentImpact: question.status === 'QUARANTINED' ? 'EXCLUDED_QUESTION_REVIEW' : 'COUNTED',
    skillIds,
    cognitiveLevel,
    difficulty: Number(question.difficulty || 1),
    firstAnswer,
    finalAnswer: answer,
    correctAnswer: question.answer_key,
    isCorrect,
    hintUsed,
    responseTimeMs: Math.max(0, Math.round(responseTimeMs)),
    timingFlag,
    confidence,
    networkState: typeof navigator !== 'undefined' && navigator.onLine ? 'ONLINE' : 'OFFLINE',
    practiceMode: session.practice_mode || (session.type === 'ARENA_COMBAT' ? 'arena' : 'manual'),
    errorTags,
    inferenceConfidence: calculateInferenceConfidence(isCorrect, question, timingFlag, confidence, hintUsed, candidateErrorTags),
    sourceEvidence: question.sourceEvidence || {
      id: question.evidence_id,
      text: question.evidence_text,
      source: question.source_file,
    },
    repairGuidance: question.repairGuidance,
    questionIntelligence: question.questionIntelligence,
    contentSnapshot: {
      prompt: question.prompt,
      answerKey: question.answer_key,
      choices: question.choices,
    },
  };
};
