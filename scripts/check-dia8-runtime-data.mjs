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
const mojibakeTopicFiles = [];
const badEssayFiles = [];
const missingImageFiles = [];
const missingOldTopicImages = [];
const questionTypes = new Set();
let matchingCount = 0;
let essayItemCount = 0;
let topicImageCount = 0;

for (let id = 1; id <= 33; id += 1) {
  const suffix = String(id).padStart(2, '0');
  const topic = readJson(`public/data/topics/topic-${suffix}.json`);
  const quiz = readJson(`public/data/quiz/topics/topic-${suffix}.json`);
  const knowledgeText = [
    topic.label || '',
    topic.source_scope || '',
    ...(topic.blocks || []).map(block => `${block.title || ''}\n${block.text || ''}`),
    ...(topic.key_points || []),
    ...(topic.focus_points || []),
    topic.full_text || '',
    topic.summary || ''
  ].join('\n');
  const topicText = JSON.stringify(topic);
  if (!topic.blocks?.length || /Câu\s+\d+|Đáp án|Dạng\s+\d+/i.test(knowledgeText)) badTopicFiles.push(`topic-${suffix}.json`);
  if (/á»|Ä.|Æ.|Tá»|Pháº|CÃ¢u|Ä/.test(topicText)) mojibakeTopicFiles.push(`topic-${suffix}.json`);
  for (const essay of topic.essay_items || []) {
    essayItemCount += 1;
    if (!essay.question || typeof essay.source_no !== 'number' || !essay.source_section?.includes('Dạng tự luận')) {
      badEssayFiles.push(`topic-${suffix}.json:${essay.id || 'unknown'}`);
    }
  }
  for (const image of topic.images || []) {
    topicImageCount += 1;
    const imagePath = image.url?.startsWith('/') ? image.url.slice(1) : image.url;
    if (!imagePath || !fs.existsSync(path.join(root, 'public', imagePath)) || image.width < 100 || image.height < 100) {
      missingImageFiles.push(`topic-${suffix}.json:${image.url || 'missing-url'}`);
    }
  }
  const expectedOldImage = `/hsg8-infographics/topic-original/${suffix}.jpg`;
  if (topic.images?.[0]?.url !== expectedOldImage) {
    missingOldTopicImages.push(`topic-${suffix}.json`);
  }
  if (!quiz.questions?.length) emptyQuizFiles.push(`topic-${suffix}.json`);
  for (const question of quiz.questions || []) {
    questionTypes.add(question.type);
    if (question.subtype === 'MATCHING') matchingCount += 1;
  }
}

assert(badTopicFiles.length === 0, `Topic resource files contain review-question leakage: ${badTopicFiles.join(', ')}`);
assert(mojibakeTopicFiles.length === 0, `Topic resource files contain mojibake: ${mojibakeTopicFiles.join(', ')}`);
assert(badEssayFiles.length === 0, `Essay references are malformed: ${badEssayFiles.join(', ')}`);
assert(essayItemCount >= 40, `Expected at least 40 topic-linked essay references, got ${essayItemCount}.`);
assert(topicImageCount >= 33, `Expected every topic to expose at least one restored/reference image, got ${topicImageCount}.`);
assert(missingImageFiles.length === 0, `Topic image files are missing or too small: ${missingImageFiles.join(', ')}`);
assert(missingOldTopicImages.length === 0, `Missing restored old-app topic image as the first image: ${missingOldTopicImages.join(', ')}`);
assert(emptyQuizFiles.length === 0, `Quiz topic files are empty: ${emptyQuizFiles.join(', ')}`);
for (const type of ['MCQ', 'TF', 'FILL']) assert(questionTypes.has(type), `Missing question type ${type}.`);
assert(matchingCount >= 8, `Expected at least 8 matching questions, got ${matchingCount}.`);

console.log(JSON.stringify({
  ok: true,
  topics: 33,
  acceptedQuestions: quizBank.questions.length,
  questionTypes: Array.from(questionTypes).sort(),
  matchingCount,
  essayItemCount,
  topicImageCount
}, null, 2));
