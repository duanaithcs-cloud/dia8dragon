import {
  Question,
  QuestionIntelligenceRecord,
  QuestionVersionRecord,
  Topic,
} from '../types';
import { fetchJsonOnce } from './runtimeDataService';
import { loadQuestionRuntimePolicy } from './learningEvidenceDb';

interface TopicQuizBank {
  schema: string;
  topic_id: number;
  accepted_count: number;
  questions: Question[];
}

export interface QuestionBankSnapshot {
  questions: Question[];
  byId: Record<string, Question>;
  runtimeRecords: Record<string, QuestionIntelligenceRecord>;
  runtimeVersions: Record<string, QuestionVersionRecord>;
}

const applyVersion = (question: Question, version: QuestionVersionRecord | undefined): Question => {
  if (!version) return question;
  return {
    ...question,
    prompt: version.prompt,
    answer_key: version.answerKey,
    choices: version.choices || question.choices,
    explain: version.explanation || question.explain,
    repairGuidance: version.repairGuidance || question.repairGuidance,
    sourceEvidence: version.sourceEvidence || question.sourceEvidence,
    evidence_text: version.sourceEvidence?.text || question.evidence_text,
    source_file: version.sourceEvidence?.source || question.source_file,
    contentVersion: version.contentVersion,
    status: version.status,
  };
};

export const applyQuestionRuntimePolicy = (
  question: Question,
  policy: Awaited<ReturnType<typeof loadQuestionRuntimePolicy>>,
): Question => {
  const record = policy.records[question.qid];
  const version = record?.activeVersionId ? policy.versions[record.activeVersionId] : undefined;
  const patched = applyVersion(question, version);
  return {
    ...patched,
    status: record?.status || patched.status || 'STABLE',
  };
};

const overlap = (left: string[] = [], right: string[] = []): number => left.filter(item => right.includes(item)).length;

const equivalenceScore = (source: Question, candidate: Question): number => {
  let score = 0;
  score += overlap(source.skillIds, candidate.skillIds) * 12;
  if ((source.cognitiveLevel || source.cognitive_level) === (candidate.cognitiveLevel || candidate.cognitive_level)) score += 10;
  if (source.skill_tag === candidate.skill_tag) score += 8;
  score += Math.max(0, 8 - Math.abs(Number(source.difficulty || 1) - Number(candidate.difficulty || 1)) * 3);
  score += overlap(source.errorTags, candidate.errorTags) * 4;
  return score;
};

export const selectQuestionsForDelivery = async (questions: Question[], count: number): Promise<Question[]> => {
  const policy = await loadQuestionRuntimePolicy();
  const resolved = questions.map(question => applyQuestionRuntimePolicy(question, policy));
  const isEligible = (question: Question) => !['QUARANTINED', 'REPLACED'].includes(question.status || 'STABLE');
  const selected: Question[] = [];
  const used = new Set<string>();

  for (const source of resolved.slice(0, count)) {
    if (isEligible(source) && !used.has(source.qid)) {
      selected.push(source);
      used.add(source.qid);
      continue;
    }
    const replacement = resolved
      .filter(candidate => isEligible(candidate) && !used.has(candidate.qid) && candidate.qid !== source.qid)
      .sort((a, b) => equivalenceScore(source, b) - equivalenceScore(source, a))[0];
    if (replacement) {
      selected.push(replacement);
      used.add(replacement.qid);
    }
  }

  for (const candidate of resolved) {
    if (selected.length >= count) break;
    if (isEligible(candidate) && !used.has(candidate.qid)) {
      selected.push(candidate);
      used.add(candidate.qid);
    }
  }
  return selected.slice(0, count);
};

export const loadQuestionBankSnapshot = async (topics: Topic[]): Promise<QuestionBankSnapshot> => {
  const banks = await Promise.all(topics.map(async topic => {
    try {
      return await fetchJsonOnce<TopicQuizBank>(`/data/quiz/topics/topic-${String(topic.topic_id).padStart(2, '0')}.json`);
    } catch {
      return null;
    }
  }));
  const questions = banks.flatMap(bank => bank?.questions || []);
  const policy = await loadQuestionRuntimePolicy();
  const resolved = questions.map(question => applyQuestionRuntimePolicy(question, policy));
  return {
    questions: resolved,
    byId: Object.fromEntries(resolved.map(question => [question.qid, question])),
    runtimeRecords: policy.records,
    runtimeVersions: policy.versions,
  };
};

export const QuestionIntelligenceService = {
  applyQuestionRuntimePolicy,
  selectQuestionsForDelivery,
  loadQuestionBankSnapshot,
};

