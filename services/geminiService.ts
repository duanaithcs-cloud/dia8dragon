import { GoogleGenAI, Type } from "@google/genai";
import { Question, Topic, StudentSnapshot, SearchResult } from "../types";

/**
 * GeminiService: "Bộ não" trung tâm điều hành mọi tác vụ AI của ứng dụng.
 * - Topic #1: ưu tiên lấy câu hỏi từ /data/topics/1.json (static, không gọi API)
 * - Các topic khác: gọi Gemini theo schema JSON chuẩn cho UI
 */
export class GeminiService {
  // =========================
  // Helpers
  // =========================

  private static safeString(v: any, fallback = ""): string {
    if (v === null || v === undefined) return fallback;
    return String(v);
  }

  private static normalizeSkillTag(v: any): "C1" | "C2" | "C3" | "C4" {
    const s = this.safeString(v, "C1").toUpperCase();
    return (["C1", "C2", "C3", "C4"].includes(s) ? s : "C1") as any;
  }

  private static normalizeAnswerKey(v: any): string {
    const s = this.safeString(v, "A").trim().toUpperCase();
    // chặn ký tự rác, chỉ cho A/B/C/D hoặc TRUE/FALSE
    if (["A", "B", "C", "D", "TRUE", "FALSE"].includes(s)) return s;
    return "A";
  }

  /**
   * Convert choices array [{id:'A', text:'...'}] -> {A:'...',B:'...',C:'...',D:'...'}
   */
  private static choicesArrayToObject(arr: any): { A: string; B: string; C: string; D: string } {
    const base = { A: "...", B: "...", C: "...", D: "..." };
    if (!Array.isArray(arr)) return base;

    for (const item of arr) {
      const id = this.safeString(item?.id, "").toUpperCase();
      const text = this.safeString(item?.text, "...");
      if (id === "A") base.A = text;
      if (id === "B") base.B = text;
      if (id === "C") base.C = text;
      if (id === "D") base.D = text;
    }
    return base;
  }

  /**
   * Chuẩn hoá 1 câu hỏi từ JSON static (topic #1) sang format Question dùng trong UI.
   * Hỗ trợ:
   * - prompt/stem
   * - choices dạng object hoặc dạng array
   * - TF / MCQ / FILL
   */
  private static normalizeStaticQuestion(q: any, index: number): Question {
    const typeRaw = this.safeString(q?.type, "MCQ").toUpperCase();

    // App thường dùng 'MCQ' / 'TF' / 'FILL'
    const type =
      typeRaw === "TF" || typeRaw === "TRUE_FALSE" ? "TF"
      : typeRaw === "FILL" || typeRaw === "FILL_BLANK" ? "FILL"
      : "MCQ";

    const prompt = this.safeString(q?.prompt ?? q?.stem, "").trim();

    // normalize choices:
    // - nếu q.choices là object {A,B,C,D} thì giữ
    // - nếu q.choices là array [{id,text}] thì convert
    // - nếu không có choices mà type=MCQ thì fallback
    let choices: any = undefined;
    if (type === "MCQ") {
      if (q?.choices && !Array.isArray(q.choices) && typeof q.choices === "object") {
        choices = {
          A: this.safeString(q.choices.A, "..."),
          B: this.safeString(q.choices.B, "..."),
          C: this.safeString(q.choices.C, "..."),
          D: this.safeString(q.choices.D, "..."),
        };
      } else {
        choices = this.choicesArrayToObject(q?.choices);
      }
    }

    // qid
    const qid = this.safeString(q?.qid, `t01_q${String(index + 1).padStart(3, "0")}`);

    // skill_tag: có thể JSON cũ dùng 'level' thay vì skill_tag
    const skill_tag = this.normalizeSkillTag(q?.skill_tag ?? q?.level ?? "C1");

    // difficulty: nếu không có thì mặc định 1
    const difficulty = Number.isFinite(Number(q?.difficulty)) ? Number(q.difficulty) : 1;

    const answer_key = this.normalizeAnswerKey(q?.answer_key ?? q?.answer ?? "A");

    const explain =
      this.safeString(
        q?.explain,
        "[CORE FACT]: Kiến thức nền tảng. [DEEP DIVE]: Đối chiếu SGK/Atlat và phân tích các vế. [PRO TIP]: Gạch chân từ khóa, loại trừ phương án nhiễu."
      );

    // Trả đúng shape tối thiểu UI cần
    return {
      ...q,
      qid,
      type,
      skill_tag,
      difficulty,
      prompt,
      choices,
      answer_key,
      explain,
    } as Question;
  }

  /**
   * Load JSON topic #1 từ public (Vercel) và chuẩn hoá về Question[]
   */
  private static async loadTopic1FromPublic(): Promise<Question[]> {
    // IMPORTANT: trên Vercel + Vite/Next, đường dẫn public là "/data/..."
    const url = "/data/topics/1.json";

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Cannot load ${url}: ${res.status}`);
    }

    const data = await res.json();
    const rawQuestions = Array.isArray(data?.questions) ? data.questions : [];

    const normalized = rawQuestions.map((q: any, i: number) => this.normalizeStaticQuestion(q, i));

    // Nếu file rỗng -> trả fallback 1 câu để UI không sập
    if (normalized.length === 0) {
      return [
        {
          qid: "t01_empty",
          type: "MCQ",
          skill_tag: "C1",
          difficulty: 1,
          prompt: "#1 Dữ liệu rỗng: chưa có câu hỏi trong /data/topics/1.json",
          choices: { A: "...", B: "...", C: "...", D: "..." },
          answer_key: "A",
          explain: "[CORE FACT]: File JSON chưa có dữ liệu. [DEEP DIVE]: Kiểm tra key 'questions'. [PRO TIP]: Mở /data/topics/1.json trên web để xác nhận.",
        } as Question,
      ];
    }

    return normalized;
  }

  // =========================
  // [1] TẠO QUIZ
  // =========================

  static async generateQuiz(topic: Topic, count: 10 | 25, isArena: boolean = false): Promise<Question[]> {
    // ✅ Topic #1: LUÔN lấy từ JSON public, KHÔNG gọi API
    if (String(topic?.id) === "1") {
      try {
        // Load đúng 25 câu từ file (không phụ thuộc count)
        return await this.loadTopic1FromPublic();
      } catch (err) {
        console.error("GeminiService.generateQuiz Topic#1 Load Error:", err);
        // fallback để UI không bị "Dữ liệu lỗi"
        return [
          {
            qid: "t01_error",
            type: "MCQ",
            skill_tag: "C1",
            difficulty: 1,
            prompt: "#1 Dữ liệu lỗi: Không tải được /data/topics/1.json",
            choices: { A: "...", B: "...", C: "...", D: "..." },
            answer_key: "A",
            explain:
              "[CORE FACT]: App không đọc được file JSON tĩnh. [DEEP DIVE]: Kiểm tra đường dẫn /public/data/topics/1.json, commit lên GitHub và Vercel redeploy. [PRO TIP]: Mở trực tiếp link /data/topics/1.json xem có JSON không.",
          } as Question,
        ];
      }
    }

    // Các topic khác: gọi Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `BẠN LÀ "BỘ NÃO KHẢO THÍ ĐỊA AI" - CHUYÊN GIA SỐ 1 VỀ ĐỊA LÍ 8 (BỘ KNTT).
NHIỆM VỤ: Soạn bộ đề luyện năng lực cao cấp cho chuyên đề: "${topic.full_text}".
${isArena ? 'CHẾ ĐỘ: ARENA COMBAT (Yêu cầu các câu hỏi lắt léo, bẫy tư duy, đòi hỏi kỹ năng C3-C4 cao).' : ''}

YÊU CẦU KỸ THUẬT QUAN TRỌNG:
1) LOẠI CÂU HỎI: Phối hợp MCQ (A,B,C,D), TF (Đúng/Sai), và FILL (Điền khuyết).
2) TF PHỨC HỢP: [Hiện tượng] + [Nguyên nhân] + [Hệ quả/chi tiết], có bẫy logic.
3) SKILL TAG: C1–C4.
4) GIẢI THÍCH BẮT BUỘC theo: [CORE FACT] / [DEEP DIVE] / [PRO TIP].
5) TRẢ VỀ JSON THUẦN TÚY. KHÔNG TEXT THỪA.`;

    try {
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
                    type: { type: Type.STRING }, // MCQ | TF | FILL
                    skill_tag: { type: Type.STRING }, // C1..C4
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

      const text = response.text || '{"questions":[]}';
      const data = JSON.parse(text);

      const questions = Array.isArray(data?.questions) ? data.questions : [];

      return questions.map((q: any, i: number) => {
        const typeRaw = this.safeString(q?.type, "MCQ").toUpperCase();
        const type = typeRaw === "TF" ? "TF" : typeRaw === "FILL" ? "FILL" : "MCQ";

        const out: Question = {
          ...q,
          qid: this.safeString(q?.qid, `Q-${Math.random().toString(36).slice(2, 7)}`),
          type,
          skill_tag: this.normalizeSkillTag(q?.skill_tag),
          difficulty: Number.isFinite(Number(q?.difficulty)) ? Number(q.difficulty) : 1,
          prompt: this.safeString(q?.prompt, "").trim(),
          choices:
            type === "MCQ"
              ? {
                  A: this.safeString(q?.choices?.A, "..."),
                  B: this.safeString(q?.choices?.B, "..."),
                  C: this.safeString(q?.choices?.C, "..."),
                  D: this.safeString(q?.choices?.D, "..."),
                }
              : undefined,
          answer_key: this.normalizeAnswerKey(q?.answer_key),
          explain: this.safeString(
            q?.explain,
            "[CORE FACT]: Dữ liệu hệ thống. [DEEP DIVE]: Phân tích logic. [PRO TIP]: Gạch chân từ khóa."
          ),
        };

        // guard: nếu MCQ mà choices rỗng -> fill "..."
        if (out.type === "MCQ" && !out.choices) {
          (out as any).choices = { A: "...", B: "...", C: "...", D: "..." };
        }

        // guard: prompt rỗng -> ghi rõ
        if (!out.prompt) {
          out.prompt = `Câu ${i + 1}: (Thiếu nội dung prompt)`;
        }

        return out;
      });
    } catch (error) {
      console.error("GeminiService.generateQuiz Error:", error);
      throw error;
    }
  }

  // =========================
  // [2] PHÂN TÍCH CHIẾN LƯỢC
  // =========================

  static async analyzeClassStrategy(students: StudentSnapshot[]): Promise<string> {
    if (!students || students.length === 0) return "Không có dữ liệu học sinh để phân tích.";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "Lỗi AI: Missing GEMINI_API_KEY.";

    const ai = new GoogleGenAI({ apiKey });

    const avgMastery = Math.round(students.reduce((a, s) => a + (s.avgMastery || 0), 0) / students.length);
    const criticalCount = students.filter((s) => s.status === "CRITICAL").length;

    const prompt = `Bạn là Hội đồng Chiến lược Giáo dục Địa AI.
Phân tích dữ liệu Matrix 33 chuyên đề của ${students.length} học sinh.
Mastery trung bình lớp: ${avgMastery}%.
Số HS nguy cấp (<40%): ${criticalCount}.
Hãy đưa ra 3 phương án can thiệp NANO-MATRIX chiến lược.`;

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

  // =========================
  // [3] TRA CỨU INSIGHT
  // =========================

  static async fetchTopicInsights(topic: Topic): Promise<SearchResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { summary: "Lỗi AI: Missing GEMINI_API_KEY.", sources: [] };

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Tóm tắt kiến thức cốt lõi và các từ khóa quan trọng cho chuyên đề: "${topic.keyword_label}".
Dựa trên chương trình Địa lí 8 Kết nối tri thức. Ngắn gọn, súc tích.`;

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
