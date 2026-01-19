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

    // Ensure đủ 4 lựa chọn
    if (!map.A) map.A = "...";
    if (!map.B) map.B = "...";
    if (!map.C) map.C = "...";
    if (!map.D) map.D = "...";

    return map as { A: string; B: string; C: string; D: string };
  }

  /** Normalize question from topic JSON -> app Question schema (tối đa tương thích) */
  private static normalizeFromTopicJson(raw: any): Question {
    const qid = String(raw?.qid ?? raw?.id ?? `Q-${Math.random().toString(36).slice(2, 8)}`);

    // JSON thầy đang có: { type:"mcq", level:"C1", stem:"...", choices:[{id,text}], answer_key:"B" }
    const rawType = String(raw?.type ?? "MCQ").toUpperCase();
    const level = String(raw?.level ?? raw?.skill_tag ?? "C1").toUpperCase();
    const answerKey = String(raw?.answer_key ?? raw?.answer ?? raw?.answerKey ?? "A").toUpperCase();

    // UI app thường dùng: type: 'MCQ' | 'TF' | 'FILL'
    // JSON thầy: "mcq" -> MCQ
    // Nếu sau này thầy thêm "tf"/"fill" vẫn chạy
    const type =
      rawType === "TF" || rawType === "TRUE_FALSE" || rawType === "TRUE/FALSE"
        ? "TF"
        : rawType === "FILL" || rawType === "FILL_BLANK" || rawType === "FILL-IN"
        ? "FILL"
        : "MCQ";

    // prompt trong app = stem/prompt
    const prompt = String(raw?.prompt ?? raw?.stem ?? "");

    const choicesObj =
      type === "MCQ"
        ? (this.toChoicesObject(raw?.choices) ??
           // trường hợp JSON đã là object {A,B,C,D}
           (raw?.choices && typeof raw.choices === "object" ? raw.choices : { A: "...", B: "...", C: "...", D: "..." }))
        : undefined;

    // explain: JSON tĩnh có thể không có -> set mặc định ngắn
    const explain =
      String(raw?.explain ?? "").trim() ||
      "[CORE FACT]: Câu hỏi lấy từ bộ đề tĩnh Topic #1. [DEEP DIVE]: Ôn đúng kiến thức SGK và phân tích đáp án. [PRO TIP]: Gạch từ khóa trong stem trước khi chọn đáp án.";

    // difficulty: nếu không có -> 1
    const difficulty = Number.isFinite(raw?.difficulty) ? Number(raw.difficulty) : 1;

    // skill_tag: app đang dùng skill_tag (thầy đã dùng trong code cũ)
    const skill_tag = ["C1", "C2", "C3", "C4"].includes(level) ? level : "C1";

    // Trả về theo schema Question của app (nhiều field thì TS vẫn nhận nếu type cho phép).
    // Nếu types/Question của thầy strict, vẫn đảm bảo các field phổ biến: qid,type,skill_tag,difficulty,prompt,answer_key,explain (+ choices khi MCQ)
    const normalized: any = {
      qid,
      type,
      skill_tag,
      difficulty,
      prompt,
      answer_key: answerKey,
      explain,
    };

    if (type === "MCQ") normalized.choices = choicesObj;

    return normalized as Question;
  }

  /** Load static Topic #1 JSON from Vercel public, and normalize for UI */
  private static async loadTopic1StaticQuiz(): Promise<Question[]> {
    const res = await fetch("/data/topics/1.json", { cache: "no-store" });

    if (!res.ok) {
      // Không được rớt sang Gemini trong mode test #1 -> báo lỗi rõ
      throw new Error(`Cannot load /data/topics/1.json (Topic #1): HTTP ${res.status}`);
    }

    const data = await res.json();
    const arr = Array.isArray(data?.questions) ? data.questions : [];

    if (!arr.length) {
      throw new Error("Topic #1 JSON loaded but has no questions[]");
    }

    return arr.map((q: any) => this.normalizeFromTopicJson(q));
  }

  // ===== [1] TẠO QUIZ =====
  static async generateQuiz(
    topic: Topic,
    count: 10 | 25,
    isArena: boolean = false
  ): Promise<Question[]> {
    // ✅ TEST MODE: Topic #1 MUST use static JSON ONLY (no fallback to Gemini)
    if (this.isTopic1(topic)) {
      const all = await this.loadTopic1StaticQuiz();
      // Nếu UI gọi count=10 hoặc 25 -> cắt đúng số lượng
      return all.slice(0, count);
    }

    // --- Other topics: Gemini normal ---
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemInstruction = `BẠN LÀ "BỘ NÃO KHẢO THÍ ĐỊA AI" - CHUYÊN GIA SỐ 1 VỀ ĐỊA LÍ 8 (BỘ KNTT).
NHIỆM VỤ: Soạn bộ đề luyện năng lực cao cấp cho chuyên đề: "${topic.full_text}".
${isArena ? "CHẾ ĐỘ: ARENA COMBAT (Yêu cầu các câu hỏi lắt léo, bẫy tư duy, đòi hỏi kỹ năng C3-C4 cao)." : ""}

YÊU CẦU KỸ THUẬT QUAN TRỌNG:
1. LOẠI CÂU HỎI: Phối hợp MCQ (A,B,C,D), TF (Nhận định Đúng/Sai), và FILL (Điền khuyết).
2. TF phải là NHẬN ĐỊNH PHỨC HỢP: [Hiện tượng] + [Nguyên nhân] + [Hệ quả/Đặc điểm chi tiết], có bẫy logic.
3. CHUẨN NĂNG LỰC: skill_tag ∈ {C1,C2,C3,C4}.
4. GIẢI THÍCH BẮT BUỘC theo cấu trúc [CORE FACT] [DEEP DIVE] [PRO TIP].
5. TRẢ VỀ JSON THUẦN TÚY. KHÔNG CÓ TEXT THỪA.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate ${count} specialized questions for topic: ${topic.keyword_label}.`,
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
                    type: { type: Type.STRING }, // MCQ / TF / FILL
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

      const parsed = JSON.parse(response.text || `{"questions":[]}`);
      const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];

      return questions.map((q: any) => {
        const qid = String(q?.qid ?? `Q-${Math.random().toString(36).slice(2, 8)}`);
        const type = String(q?.type ?? "MCQ").toUpperCase();
        const skill_tag = ["C1", "C2", "C3", "C4"].includes(String(q?.skill_tag).toUpperCase())
          ? String(q.skill_tag).toUpperCase()
          : "C1";
        const difficulty = Number.isFinite(q?.difficulty) ? Number(q.difficulty) : 1;
        const prompt = String(q?.prompt ?? "");
        const answer_key = String(q?.answer_key ?? "A").toUpperCase();
        const explain =
          String(q?.explain ?? "").trim() ||
          "[CORE FACT]: ... [DEEP DIVE]: ... [PRO TIP]: ...";

        const out: any = { qid, type, skill_tag, difficulty, prompt, answer_key, explain };
        if (type === "MCQ") {
          out.choices = q?.choices ?? { A: "...", B: "...", C: "...", D: "..." };
        }
        return out as Question;
      });
    } catch (error) {
      console.error("GeminiService.generateQuiz Error:", error);
      throw error;
    }
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
Hãy đưa ra 3 phương án can thiệp NANO-MATRIX chiến lược (ngắn gọn, hành động được).`;

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

    const prompt = `Tóm tắt kiến thức cốt lõi và các từ khóa quan trọng cho chuyên đề: "${topic.keyword_label}".
Dựa trên chương trình Địa lí 8 Kết nối tri thức. Ngắn gọn, súc tích.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
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
