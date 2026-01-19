import { GoogleGenAI, Type } from "@google/genai";
import { Question, Topic, StudentSnapshot, SearchResult } from "../types";

/**
 * GeminiService: "Bộ não" trung tâm điều hành mọi tác vụ AI của ứng dụng.
 */
export class GeminiService {
  // ===== Helpers =====
  private static isTopic1(topic?: Topic) {
    return String((topic as any)?.id ?? "") === "1";
  }

  /**
   * Trả base URL dùng cho fetch trên SERVER.
   * - Client: dùng relative (/data/...)
   * - Server (Vercel): dùng https://${VERCEL_URL}
   */
  private static getBaseUrlForServer(): string {
    // Client
    if (typeof window !== "undefined") return "";

    // Server on Vercel
    const vercelUrl = process.env.VERCEL_URL; // ví dụ: dia8dragon.vercel.app
    if (vercelUrl) return `https://${vercelUrl}`;

    // Fallback local/dev
    return "http://localhost:3000";
  }

  /** Convert choices array [{id:"A", text:"..."}, ...] -> {A:"...",B:"...",C:"...",D:"..."} */
  private static toChoicesObject(
    choices: any
  ): { A: string; B: string; C: string; D: string } | undefined {
    if (!Array.isArray(choices)) return undefined;

    const map: any = {};
    for (const c of choices) {
      const k = String(c?.id ?? "").toUpperCase();
      if (["A", "B", "C", "D"].includes(k)) map[k] = String(c?.text ?? "");
    }

    if (!map.A) map.A = "...";
    if (!map.B) map.B = "...";
    if (!map.C) map.C = "...";
    if (!map.D) map.D = "...";

    return map as { A: string; B: string; C: string; D: string };
  }

  /** Convert {A,B,C,D} -> [{id:"A", text:"..."}, ...]  (nhiều UI cần dạng array) */
  private static toChoicesArray(choicesObj: any) {
    if (!choicesObj || typeof choicesObj !== "object") return undefined;
    return ["A", "B", "C", "D"].map((k) => ({ id: k, text: String(choicesObj[k] ?? "...") }));
  }

  /** Normalize question từ JSON tĩnh -> schema "an toàn" cho nhiều UI */
  private static normalizeFromTopicJson(raw: any): Question {
    const qid = String(raw?.qid ?? raw?.id ?? `Q-${Math.random().toString(36).slice(2, 8)}`);

    const rawType = String(raw?.type ?? "MCQ").toUpperCase();
    const level = String(raw?.level ?? raw?.skill_tag ?? "C1").toUpperCase();
    const answerKey = String(raw?.answer_key ?? raw?.answer ?? raw?.answerKey ?? "A").toUpperCase();

    const type =
      rawType === "TF" || rawType === "TRUE_FALSE" || rawType === "TRUE/FALSE"
        ? "TF"
        : rawType === "FILL" || rawType === "FILL_BLANK" || rawType === "FILL-IN"
        ? "FILL"
        : "MCQ";

    const stem = String(raw?.stem ?? raw?.prompt ?? "");
    const prompt = String(raw?.prompt ?? raw?.stem ?? "");

    const choicesObj =
      type === "MCQ"
        ? (this.toChoicesObject(raw?.choices) ??
           (raw?.choices && typeof raw.choices === "object" ? raw.choices : { A: "...", B: "...", C: "...", D: "..." }))
        : undefined;

    const explain =
      String(raw?.explain ?? "").trim() ||
      "[CORE FACT]: Câu hỏi lấy từ bộ đề tĩnh Topic #1. [DEEP DIVE]: Ôn đúng kiến thức SGK và phân tích đáp án. [PRO TIP]: Gạch từ khóa trong đề trước khi chọn.";

    const difficulty = Number.isFinite(raw?.difficulty) ? Number(raw.difficulty) : 1;
    const skill_tag = ["C1", "C2", "C3", "C4"].includes(level) ? level : "C1";

    // ✅ Trả ra object “kép” để UI kiểu nào cũng đọc được:
    const normalized: any = {
      qid,
      type,
      level: skill_tag,      // hỗ trợ UI dùng level
      skill_tag,             // hỗ trợ UI dùng skill_tag
      difficulty,

      stem,                  // hỗ trợ UI dùng stem
      prompt,                // hỗ trợ UI dùng prompt

      answer_key: answerKey, // hỗ trợ UI dùng answer_key
      answerKey,             // hỗ trợ UI dùng answerKey
      explain,
    };

    if (type === "MCQ") {
      normalized.choices = choicesObj;                  // dạng object A/B/C/D
      normalized.choicesArray = this.toChoicesArray(choicesObj); // dạng array [{id,text}]
    }

    return normalized as Question;
  }

  /** Load static Topic #1 JSON from Vercel public, and normalize for UI */
  private static async loadTopic1StaticQuiz(): Promise<Question[]> {
    const base = this.getBaseUrlForServer();
    const url = `${base}/data/topics/1.json`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Cannot load Topic #1 JSON: ${url} (HTTP ${res.status})`);
    }

    const data = await res.json();
    const arr = Array.isArray(data?.questions) ? data.questions : [];

    if (!arr.length) {
      throw new Error(`Topic #1 JSON loaded but has no questions[] at ${url}`);
    }

    return arr.map((q: any) => this.normalizeFromTopicJson(q));
  }

  // ===== [1] TẠO QUIZ =====
  static async generateQuiz(
    topic: Topic,
    count: 10 | 25,
    isArena: boolean = false
  ): Promise<Question[]> {
    // ✅ TEST MODE: Topic #1 MUST use static JSON ONLY (no fallback)
    if (this.isTopic1(topic)) {
      const all = await this.loadTopic1StaticQuiz();
      return all.slice(0, count);
    }

    // --- Other topics: Gemini normal ---
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemInstruction = `BẠN LÀ "BỘ NÃO KHẢO THÍ ĐỊA AI" - CHUYÊN GIA SỐ 1 VỀ ĐỊA LÍ 8 (BỘ KNTT).
NHIỆM VỤ: Soạn bộ đề luyện năng lực cao cấp cho chuyên đề: "${topic.full_text}".
${isArena ? "CHẾ ĐỘ: ARENA COMBAT (Yêu cầu các câu hỏi lắt léo, bẫy tư duy, đòi hỏi kỹ năng C3-C4 cao)." : ""}
YÊU CẦU: trả về JSON thuần túy, không có text thừa.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} questions for topic: ${topic.keyword_label}.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  qid: { type: Type.STRING },
                  type: { type: Type.STRING },
                  skill_tag: { type: Type.STRING },
                  difficulty: { type: Type.NUMBER },
                  prompt: { type: Type.STRING },
                  choices: {
                    type: Type.OBJECT,
                    properties: {
                      A: { type: Type.STRING },
                      B: { type: Type.STRING },
                      C: { type: Type.STRING },
                      D: { type: Type.STRING },
                    },
                  },
                  answer_key: { type: Type.STRING },
                  explain: { type: Type.STRING },
                },
                required: ["qid", "type", "skill_tag", "difficulty", "prompt", "answer_key", "explain"],
              },
            },
          },
          required: ["questions"],
        },
      },
    });

    const parsed = JSON.parse(response.text || `{"questions":[]}`);
    const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];

    return questions.map((q: any) => {
      const out: any = {
        qid: String(q?.qid ?? `Q-${Math.random().toString(36).slice(2, 8)}`),
        type: String(q?.type ?? "MCQ").toUpperCase(),
        skill_tag: ["C1", "C2", "C3", "C4"].includes(String(q?.skill_tag).toUpperCase())
          ? String(q.skill_tag).toUpperCase()
          : "C1",
        level: ["C1", "C2", "C3", "C4"].includes(String(q?.skill_tag).toUpperCase())
          ? String(q.skill_tag).toUpperCase()
          : "C1",
        difficulty: Number.isFinite(q?.difficulty) ? Number(q.difficulty) : 1,
        prompt: String(q?.prompt ?? ""),
        stem: String(q?.prompt ?? ""),
        answer_key: String(q?.answer_key ?? "A").toUpperCase(),
        answerKey: String(q?.answer_key ?? "A").toUpperCase(),
        explain: String(q?.explain ?? "").trim() || "[CORE FACT]: ... [DEEP DIVE]: ... [PRO TIP]: ...",
      };

      if (out.type === "MCQ") {
        out.choices = q?.choices ?? { A: "...", B: "...", C: "...", D: "..." };
        out.choicesArray = GeminiService.toChoicesArray(out.choices);
      }
      return out as Question;
    });
  }

  // ===== [2] PHÂN TÍCH CHIẾN LƯỢC =====
  static async analyzeClassStrategy(students: StudentSnapshot[]): Promise<string> {
    if (!students?.length) return "Không có dữ liệu học sinh để phân tích.";

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const avgMastery = Math.round(students.reduce((a, s) => a + (s.avgMastery ?? 0), 0) / students.length);
    const criticalCount = students.filter((s) => s.status === "CRITICAL").length;

    const prompt = `Bạn là Hội đồng Chiến lược Giáo dục Địa AI.
Phân tích dữ liệu Matrix 33 chuyên đề của ${students.length} học sinh.
Mastery trung bình lớp: ${avgMastery}%.
Số HS nguy cấp (<40%): ${criticalCount}.
Hãy đưa ra 3 phương án can thiệp chiến lược.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
      });
      return response.text || "Phân tích thất bại.";
    } catch (error) {
      console.error("GeminiService.analyzeClassStrategy Error:", error);
      return "Lỗi AI: " + (error as Error).message;
    }
  }

  // ===== [3] TRA CỨU INSIGHT =====
  static async fetchTopicInsights(topic: Topic): Promise<SearchResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Tóm tắt kiến thức cốt lõi và từ khóa quan trọng cho chuyên đề: "${topic.keyword_label}" (Địa lí 8 KNTT).`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });

      const summary = response.text || "Không tìm thấy thông tin tóm tắt.";
      const chunks = (response as any)?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .filter((c: any) => c?.web?.uri)
        .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

      return { summary, sources: sources.slice(0, 3) };
    } catch (error) {
      console.error("GeminiService.fetchTopicInsights Error:", error);
      return { summary: "Lỗi kết nối tra cứu.", sources: [] };
    }
  }
}
