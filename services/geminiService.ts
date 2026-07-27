import { Question, Topic, StudentSnapshot, SearchResult } from "../types";
import { fetchJsonOnce } from "./runtimeDataService";
import { normalizeQuestionLearningMetadata } from "../utils/questionMetadata";
import { selectQuestionsForDelivery } from './questionIntelligenceService';

type GeminiAction = "generateQuiz" | "fetchTopicInsights" | "analyzeClassStrategy" | "loginCoach";

interface TopicResourceBlock {
  type: string;
  text: string;
  rows?: string[];
}

interface TopicResource {
  source_file?: string;
  key_points?: string[];
  blocks?: TopicResourceBlock[];
  full_text?: string;
  evidence_bank?: {
    source_cards?: Array<{
      id: string;
      type: string;
      text: string;
      source_file: string;
    }>;
  };
}

interface QuizEvidence {
  topics: Array<{
    topic_id: number;
    label: string;
    source_file: string;
    snippets: string[];
  }>;
}

interface TopicQuizBank {
  topic_id: number;
  status: string;
  accepted_count: number;
  questions: Question[];
}

const stripCodeFence = (raw: string): string => raw
  .trim()
  .replace(/^```(?:json)?/i, "")
  .replace(/```$/i, "")
  .trim();

const normalizeQuestion = (topic: Topic, q: any, index: number): Question => {
  const normalized: Question = {
    ...q,
    qid: q.qid || `HSG8-${topic.topic_id}-${index + 1}`,
    topic_id: String(topic.topic_id),
    type: ["MCQ", "TF", "FILL"].includes(q.type) ? q.type : "MCQ",
    skill_tag: ["C1", "C2", "C3", "C4"].includes(q.skill_tag) ? q.skill_tag : "C1",
    cognitive_level: ["NB", "TH", "VD", "VDC"].includes(q.cognitive_level)
      ? q.cognitive_level
      : (Number(q.difficulty || 1) <= 1 ? "NB" : Number(q.difficulty || 1) === 2 ? "TH" : Number(q.difficulty || 1) === 3 ? "VD" : "VDC"),
    difficulty: Number(q.difficulty || 1),
    choices: q.type === "MCQ" ? (q.choices || { A: "...", B: "...", C: "...", D: "..." }) : undefined,
    answer_key: q.answer_key ? String(q.answer_key).toUpperCase() : "A",
    explain: q.explain || "[CORE FACT]: Câu hỏi chưa có giải thích. [DEEP DIVE]: Cần đối chiếu học liệu. [PRO TIP]: Chỉ chấp nhận đáp án có căn cứ nguồn."
  };
  return normalizeQuestionLearningMetadata(topic, normalized);
};

const requestGemini = async <T>(action: GeminiAction, payload: Record<string, unknown>): Promise<T> => {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Không gọi được Gemini.");
  }

  return data as T;
};

const cleanSnippet = (text: string, maxLength = 180): string => text
  .replace(/\s+/g, " ")
  .replace(/^[*•\-\d\.\s]+/, "")
  .trim()
  .slice(0, maxLength)
  .trim();

const choicesWithAnswer = (correct: string, distractors: string[], index: number): { choices: Record<string, string>; answer: string } | null => {
  const letters = ["A", "B", "C", "D"];
  const correctSlot = index % 4;
  const pool = distractors
    .map(item => cleanSnippet(item, 130))
    .filter(item => item && item !== correct && item.length > 35)
    .slice(0, 3);
  if (pool.length < 3) return null;
  const values = [...pool];
  values.splice(correctSlot, 0, correct);
  return {
    answer: letters[correctSlot],
    choices: { A: values[0], B: values[1], C: values[2], D: values[3] }
  };
};

export class GeminiService {
  static buildManualQuizPrompt(topic: Topic, count: 10 | 25, isArena: boolean = false): string {
    return `Bạn là chuyên gia ra đề HSG Địa lí 8.

Hãy tạo đúng ${count} câu hỏi cho bong bóng chuyên đề:
- Mã chuyên đề: ${topic.topic_id}
- Nhãn: ${topic.keyword_label}
- Nội dung: ${topic.full_text}
- Cấp độ gốc: ${topic.tag_level}
- Phạm vi học liệu: Trọng tâm/Tự luận của chuyên đề trong Dia8Dragon
- Trích đoạn học liệu HSG8: ${topic.source_excerpt || topic.full_text}
${isArena ? "- Chế độ: Arena, ưu tiên câu hỏi C3-C4 nhưng vẫn phải có căn cứ nguồn." : ""}

Yêu cầu bắt buộc:
1. Mọi câu hỏi phải căn cứ vào kênh chữ/file nguồn ở trên, không tự thêm dữ kiện ngoài nguồn.
2. Mỗi câu phải có explain chứa đúng trích đoạn căn cứ hoặc mô tả rõ vị trí căn cứ trong học liệu.
3. Câu MCQ có choices A, B, C, D và answer_key là A/B/C/D; phương án nhiễu không được làm sai kiến thức khoa học.
4. Câu TF chỉ dùng khi có thể chứng minh trực tiếp bằng trích đoạn nguồn.
5. Mỗi câu có skill_tag thuộc C1, C2, C3, C4 và difficulty từ 1 đến 5.
6. Mỗi explain phải có đủ 3 nhãn: [CORE FACT], [DEEP DIVE], [PRO TIP].
7. [CORE FACT] phải nêu đúng kiến thức địa lí cốt lõi của riêng câu hỏi, không viết kiểu chung chung như "đáp án A đúng".
8. [DEEP DIVE] phải giải thích vì sao đáp án đúng và chỉ rõ vì sao từng phương án nhiễu A/B/C/D không phù hợp.
9. [PRO TIP] phải là mẹo xử lí riêng theo dạng câu: số liệu, bản đồ, nguyên nhân, giải pháp, phủ định hoặc lựa chọn biểu đồ; không dùng mẹo giống nhau cho mọi câu.
10. Không thêm số liệu hay kết luận ngoài học liệu đã cung cấp.

Chỉ trả về JSON thuần theo cấu trúc:
{
  "questions": [
    {
      "qid": "T${topic.topic_id}-Q1",
      "topic_id": "${topic.topic_id}",
      "type": "MCQ",
      "skill_tag": "C2",
      "difficulty": 3,
      "prompt": "Nội dung câu hỏi",
      "choices": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "answer_key": "A",
      "explain": "[CORE FACT]: ... [DEEP DIVE]: ... [PRO TIP]: ..."
    }
  ]
}`;
  }

  static parseManualQuizJson(topic: Topic, raw: string): Question[] {
    const cleaned = stripCodeFence(raw);
    const parsed = JSON.parse(cleaned);
    const source = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(source) || source.length === 0) {
      throw new Error("JSON không có mảng questions.");
    }
    return source.map((q, index) => normalizeQuestion(topic, q, index));
  }

  static generateLocalQuiz(topic: Topic, count: 10 | 25): Question[] {
    const evidence = cleanSnippet(topic.source_excerpt || topic.full_text, 220);
    const source = [normalizeQuestion(topic, {
      type: "TF",
      skill_tag: "C1",
      difficulty: 1,
      prompt: `Nhận định sau có căn cứ trong học liệu chuyên đề "${topic.keyword_label}": ${evidence}`,
      answer_key: "TRUE",
      explain: `[CORE FACT]: ${evidence}. [DEEP DIVE]: Câu hỏi chỉ dùng trích đoạn có trong học liệu nguồn. [PRO TIP]: Luôn đối chiếu lại kênh chữ trước khi chọn đáp án.`
    }, 0)];

    return Array.from({ length: count }, (_, index) => ({
      ...source[index % source.length],
      qid: `${source[index % source.length].qid}-${index + 1}`
    }));
  }

  static async fetchTopicResource(topic: Topic): Promise<TopicResource | null> {
    try {
      return await fetchJsonOnce<TopicResource>(`/data/topics/topic-${String(topic.topic_id).padStart(2, "0")}.json`);
    } catch {
      return null;
    }
  }

  static async fetchQuizEvidence(): Promise<QuizEvidence | null> {
    try {
      return await fetchJsonOnce<QuizEvidence>("/data/quiz-evidence.json");
    } catch {
      return null;
    }
  }

  static async fetchTopicQuizBank(topicId: number): Promise<TopicQuizBank | null> {
    return await fetchJsonOnce<TopicQuizBank>(`/data/quiz/topics/topic-${String(topicId).padStart(2, "0")}.json`);
  }

  static async buildAcceptedQuiz(topic: Topic, bank: TopicQuizBank, count: 10 | 25): Promise<Question[]> {
    if (Number(bank.topic_id) !== Number(topic.topic_id)) return [];
    const normalized = (bank.questions || []).map((question, index) => normalizeQuestion(topic, question, index));
    return selectQuestionsForDelivery(normalized, count);
  }

  static buildResourceQuiz(topic: Topic, resource: TopicResource, count: 10 | 25, evidence?: QuizEvidence | null, practiceMode: 'quick' | 'hsg' | 'visual' | 'arena' = 'quick'): Question[] {
    const candidates = [
      ...((resource.evidence_bank?.source_cards || []).map(card => card.text || "")),
      ...(resource.key_points || []),
      ...((resource.blocks || []).map(block => block.text || ""))
    ]
      .map(text => cleanSnippet(text, 220))
      .filter(text => text.length >= 45);

    const unique = Array.from(new Set(candidates)).slice(0, Math.max(30, count * 2));
    if (!unique.length) return [];
    const baseCards = resource.evidence_bank?.source_cards || unique.map((text, index) => ({
      id: `E${topic.topic_id}-${index + 1}`,
      type: "concept",
      text,
      source_file: "Học liệu Dia8Dragon"
    }));
    const evidenceCards = practiceMode === 'visual'
      ? [...baseCards.filter(card => card.type === 'data'), ...baseCards]
      : practiceMode === 'hsg' || practiceMode === 'arena'
        ? [...baseCards.filter(card => card.type === 'argument'), ...baseCards]
        : baseCards;

    const crossTopicDistractors = (evidence?.topics || [])
      .filter(item => item.topic_id !== topic.topic_id)
      .flatMap(item => item.snippets || [])
      .map(item => cleanSnippet(item, 130))
      .filter(item => item.length > 35);

    const questions: Question[] = [];
    unique.forEach((fact, index) => {
      if (questions.length >= count) return;
      const evidenceCard = evidenceCards.find(card => cleanSnippet(card.text, 220) === fact) || evidenceCards[index % evidenceCards.length];
      const evidenceText = cleanSnippet(evidenceCard.text || fact, 240);
      const difficulty = Math.min(5, 1 + (index % 5));
      const skill = (["C1", "C2", "C3", "C4"] as const)[index % 4];

      if (index % 2 === 0 && crossTopicDistractors.length >= 3) {
        const choicePack = choicesWithAnswer(evidenceText, crossTopicDistractors.slice(index * 3).concat(crossTopicDistractors), index);
        if (!choicePack) return;
        const { choices, answer } = choicePack;
        questions.push(normalizeQuestion(topic, {
          qid: `HSG8-R${topic.topic_id}-${index + 1}`,
          type: "MCQ",
          skill_tag: skill,
          difficulty,
          prompt: practiceMode === 'visual'
            ? `Căn cứ dữ liệu/bảng số liệu trong học liệu "${topic.keyword_label}", trích dẫn nào đúng?`
            : practiceMode === 'hsg' || practiceMode === 'arena'
              ? `Căn cứ học liệu chuyên đề "${topic.keyword_label}", luận điểm nào dùng được cho bài HSG?`
              : `Trích dẫn nào xuất hiện trong học liệu chuyên đề "${topic.keyword_label}"?`,
          choices,
          answer_key: answer,
          explain: `[CORE FACT]: ${evidenceText}. [DEEP DIVE]: Câu hỏi căn cứ trực tiếp vào kênh chữ của chuyên đề ${topic.keyword_label}. [PRO TIP]: Chỉ chọn phương án khớp đúng học liệu của chuyên đề đang mở.`,
          evidence_id: evidenceCard.id,
          evidence_text: evidenceText,
          source_file: evidenceCard.source_file
        }, index));
        return;
      }

      questions.push(normalizeQuestion(topic, {
        qid: `HSG8-R${topic.topic_id}-${index + 1}`,
        type: "TF",
        skill_tag: skill,
        difficulty,
        prompt: practiceMode === 'visual'
          ? `Nhận định dữ liệu/ảnh/bảng sau có căn cứ trong học liệu "${topic.keyword_label}": ${evidenceText}`
          : practiceMode === 'hsg' || practiceMode === 'arena'
            ? `Luận điểm HSG sau có căn cứ trong học liệu chuyên đề "${topic.keyword_label}": ${evidenceText}`
            : `Nhận định sau có căn cứ trong học liệu chuyên đề "${topic.keyword_label}": ${evidenceText}`,
        answer_key: "TRUE",
        explain: `[CORE FACT]: ${evidenceText}. [DEEP DIVE]: Đây là trích đoạn từ kênh chữ học liệu, không phải câu tự suy diễn. [PRO TIP]: Tìm lại cụm từ khóa trong tab Kênh chữ để tự kiểm chứng.`,
        evidence_id: evidenceCard.id,
        evidence_text: evidenceText,
        source_file: evidenceCard.source_file
      }, index));
    });

    return questions;
  }

  static async generateQuiz(topic: Topic, count: 10 | 25, isArena: boolean = false, practiceMode: 'quick' | 'hsg' | 'visual' | 'arena' = isArena ? 'arena' : count === 25 ? 'hsg' : 'quick', allowAiProcessing: boolean = false): Promise<Question[]> {
    const quizBank = await this.fetchTopicQuizBank(topic.topic_id);
    if (quizBank?.questions?.length) {
      return await this.buildAcceptedQuiz(topic, quizBank, count);
    }

    const resource = await this.fetchTopicResource(topic);
    if (resource) {
      const evidence = await this.fetchQuizEvidence();
      const resourceQuiz = this.buildResourceQuiz(topic, resource, count, evidence, practiceMode);
      if (resourceQuiz.length) return await selectQuestionsForDelivery(resourceQuiz, count);
    }

    if (!allowAiProcessing) return await selectQuestionsForDelivery(this.generateLocalQuiz(topic, count), count);

    try {
      const data = await requestGemini<{ questions: Question[] }>("generateQuiz", { topic, count, isArena });
      const generated = data.questions?.length ? data.questions.map((question, index) => normalizeQuestion(topic, question, index)) : this.generateLocalQuiz(topic, count);
      return await selectQuestionsForDelivery(generated, count);
    } catch (error) {
      console.warn("Gemini unavailable, using source excerpt quiz:", error);
      return await selectQuestionsForDelivery(this.generateLocalQuiz(topic, count), count);
    }
  }

  static async analyzeClassStrategy(students: StudentSnapshot[]): Promise<string> {
    if (students.length === 0) return "Không có dữ liệu học sinh để phân tích.";

    try {
      const data = await requestGemini<{ text: string }>("analyzeClassStrategy", { students });
      return data.text || "Không có phân tích.";
    } catch (error) {
      console.error("GeminiService.analyzeClassStrategy Error:", error);
      return "Lỗi AI: " + (error as Error).message;
    }
  }

  static async fetchTopicInsights(topic: Topic): Promise<SearchResult> {
    try {
      return await requestGemini<SearchResult>("fetchTopicInsights", { topic });
    } catch (error) {
      console.error("GeminiService.fetchTopicInsights Error:", error);
      return {
        summary: `${topic.source_excerpt || topic.full_text}`,
        sources: []
      };
    }
  }

  static async generateLoginCoach(fullName: string, className: string, topics: Topic[]): Promise<string> {
    try {
      const data = await requestGemini<{ text: string }>("loginCoach", { fullName, className, topics });
      return data.text || `Chào ${fullName}. Hãy chọn một bong bóng chuyên đề Địa lí 8 để bắt đầu luyện tập.`;
    } catch (error) {
      console.error("GeminiService.generateLoginCoach Error:", error);
      return `Chào ${fullName}. App sẽ dùng học liệu nguồn HSG8 cục bộ để tạo câu hỏi có căn cứ.`;
    }
  }
}
