import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const topicManifest = readJson('public/data/topics/manifest.json');
const quizManifest = readJson('public/data/quiz/topics/manifest.json');
const quizBank = readJson('public/data/quiz-bank.json');
const evidence = readJson('public/data/quiz-evidence.json');
const library = readJson('public/documents/learning-library/catalog.json');

assert(topicManifest.topics?.length === 33, `Expected 33 topic resources, got ${topicManifest.topics?.length || 0}.`);
assert(quizManifest.topics?.length === 33, `Expected 33 quiz topic files, got ${quizManifest.topics?.length || 0}.`);
assert(Array.isArray(quizBank.questions) && quizBank.questions.length >= 180, `Expected at least 180 accepted questions, got ${quizBank.questions?.length || 0}.`);
assert(evidence.accepted_count === quizBank.questions.length, 'quiz-evidence accepted_count does not match quiz-bank.');
assert((library.items || library.documents || []).length >= 4, 'Learning library must expose the uploaded C1-C4 documents.');

const badTopicFiles = [];
const emptyQuizFiles = [];
const questionTypes = new Set();
let matchingCount = 0;

for (let id = 1; id <= 33; id += 1) {
  const suffix = String(id).padStart(2, '0');
  const topic = readJson(`public/data/topics/topic-${suffix}.json`);
  const quiz = readJson(`public/data/quiz/topics/topic-${suffix}.json`);
  const topicText = JSON.stringify(topic);
  if (!topic.blocks?.length || /Câu\s+\d+|Đáp án|Dạng\s+\d+/i.test(topicText)) badTopicFiles.push(`topic-${suffix}.json`);
  if (!quiz.questions?.length) emptyQuizFiles.push(`topic-${suffix}.json`);
  for (const question of quiz.questions || []) {
    questionTypes.add(question.type);
    if (question.subtype === 'MATCHING') matchingCount += 1;
  }
}

assert(badTopicFiles.length === 0, `Topic resource files contain review-question leakage: ${badTopicFiles.join(', ')}`);
assert(emptyQuizFiles.length === 0, `Quiz topic files are empty: ${emptyQuizFiles.join(', ')}`);
for (const type of ['MCQ', 'TF', 'FILL']) assert(questionTypes.has(type), `Missing question type ${type}.`);
assert(matchingCount >= 8, `Expected at least 8 matching questions, got ${matchingCount}.`);

console.log(JSON.stringify({
  ok: true,
  topics: 33,
  acceptedQuestions: quizBank.questions.length,
  questionTypes: Array.from(questionTypes).sort(),
  matchingCount
}, null, 2));
