import { GoogleGenAI, Type } from "@google/genai";
import { Question, Topic, StudentSnapshot, SearchResult } from "../types";

/**
 * GeminiService: "Bộ não" trung tâm điều hành mọi tác vụ AI của ứng dụng.
 */
export class GeminiService {
  // ===== Helpers =====
  private static normalizeSkillTag(input: any): "C1" | "C2" | "C3" | "C4" {
    const v = String(input ?? "").toUpperCase().trim();
    if (v === "C1" || v === "C2" || v === "C3" || v === "C4") return v;
    return "C1";
  }

  private static safeJsonParse(text?: string): any {
    try {
      return JSON.parse(text || "{}");
    } catch {
      return {};
    }
  }

  /**
   * Convert Topic #1 static JSON (stem + choices[{id,text}]) -> app Question schema (prompt + choices{A,B,C,D})
   * Hỗ trợ luôn trường hợp JSON đã đúng schema app.
   */
  private static convertStaticQuestions(rawQuestions: any[]): Question[] {
    if (!Array.isArray(rawQuestions)) return [];

    return rawQuestions.map((q: any, idx: number) => {
      // Nếu đã là schema app (prompt + choices object)
      const hasPrompt = typeof q?.prompt === "string";
      const hasChoicesObject =
        q?.choices &&
        typeof q.choices === "object" &&
        !Array.isArray(q.choices) &&
        ("A" in q.choices || "B" in q.choices || "C" in q.choices || "D" in q.choices);

      if (hasPrompt) {
        // chuẩn hóa nhẹ
        const out: any = { ...q };
        out.qid = out.qid || q.qid || `T1-${idx + 1}`;
        out.type = out.type || "MCQ";
        out.skill_tag = this.normalizeSkillTag(out.skill_tag || out.level || out.skillTag);
        out.difficulty = typeof out.difficulty === "number" ? out.difficulty : 1;
        if (out.type === "MCQ" && !hasChoicesObject) {
          // cố map nếu choices dạng array
          if (Array.isArray(out.choices)) {
            const map: any = {};
            for (const c of out.choices) {
              if (c?.id && c?.text) map[String(c.id).toUpperCase()] = String(c.text);
            }
            out.choices = { A: map.A || "...", B: map.B || "...", C: map.C || "...", D: map.D || "..." };
          } else {
            out.choices = { A: "...", B: "...", C: "...", D: "..." };
          }
        }
        out.answer_key = (out.answer_key || "A").toString().toUpperCase();
        out.explain =
          out.explain ||
          "[CORE FACT]: Dữ liệu tĩnh Topic #1. [DEEP DIVE]: Câu hỏi lấy từ kho đề GitHub. [PRO TIP]: Luyện theo C1→C4.";
        return out as Question;
      }

      // Schema JSON đang là (stem, choices: [{id,text}], answer_key, level)
      const stem = q?.stem ?? q?.question ?? q?.text ?? "";
      const choicesArr = Array.isArray(q?.choices) ? q.choices : [];
      const choiceMap: Record<string, string> = {};
      for (const c of choicesArr) {
        if (!c) continue;
        const id = String(c.id ?? "").toUpperCase().trim();
        const text = String(c.text ?? "");
        if (id) choiceMap[id] = text;
      }

      const typeRaw = String(q?.type ?? "MCQ").toUpperCase();
      const isTF = typeRaw === "TF" || typeRaw === "TRUEFALSE" || typeRaw === "DUNGSAI";
      const isFill = typeRaw === "FILL" || typeRaw === "FILLIN" || typeRaw === "DIENKHUYET";

      // App thường dùng: MCQ / TF / FILL
      const outType = isTF ? "TF" : isFill ? "FILL" : "MCQ";

      const out: any = {
        qid: q?.qid || `T1-${idx + 1}`,
        type: outType,
        skill_tag: this.normalizeSkillTag(q?.level || q?.skill_tag),
        difficulty: typeof q?.difficulty === "number" ? q.difficulty : 1,
        prompt: String(stem),
        answer_key: (q?.answer_key || "A").toString().toUpperCase(),
        explain:
          q?.explain ||
          "[CORE FACT]: Dữ liệu tĩnh Topic #1. [DEEP DIVE]: Câu hỏi lấy từ kho đề GitHub. [PRO TIP]: Chú ý bẫy khái niệm.",
      };

      if (outType === "MCQ") {
        out.choices = {
          A: choiceMap.A || "...",
          B: choiceMap.B || "...",
          C: choiceMap.C || "...",
          D: choiceMap.D || "...",
        };
      } else {
        // TF/FILL thường không cần choices object kiểu A-D (tùy UI). Nếu UI cần, có thể thêm.
        // Giữ undefined để tránh UI hiểu nhầm.
        out.choices = undefined;
      }

      return out as Question;
    });
  }

  /**
   * [1] TẠO QUIZ: Soạn bộ đề trắc nghiệm chuyên sâu.
   */
  static async generateQuiz(topic: Topic, count: 10 | 25, isArena: boolean = false): Promise<Question[]> {
    // ✅ HARD LOCK: Topic #1 luôn dùng JSON tĩnh (không gọi Gemini)
    if (String(topic?.id) === "1") {
      const url = `/data/topics/1.json`;
      const res = await fetch(url, { cache: "no-store" });

      if (!res.ok) {
        // Không fallback sang Gemini để khỏi “lẫn nguồn”
        throw new Error(`Cannot load ${url}: ${res.status}`);
      }

      const data = await res.json();
      const questions = this.convertStaticQuestions(data?.questions ?? []);
      // cắt đúng số lượng yêu cầu (10 hoặc 25) cho đồng bộ UI
      return questions.slice(0, count);
    }

    // ===== Gemini path (topic khác #1) =====
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY in environment variables.");

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `BẠN LÀ "BỘ NÃO KHẢO THÍ ĐỊA AI" - CHUYÊN GIA SỐ 1 VỀ ĐỊA LÍ 8 (BỘ KNTT).
NHIỆM VỤ: Soạn bộ đề luyện năng lực cao cấp cho chuyên đề: "${topic.full_text}".
${isArena ? 'CHẾ ĐỘ: ARENA COMBAT (Yêu cầu các câu hỏi lắt léo, bẫy tư duy, đòi hỏi kỹ năng C3-C4 cao).' : ''}

YÊU CẦU KỸ THUẬT QUAN TRỌNG:
1. LOẠI CÂU HỎI: Phối hợp MCQ (A,B,C,D), TF (Nhận định Đúng/Sai), và FILL (Điền khuyết).
2. CHI TIẾT DẠNG NHẬN ĐỊNH ĐÚNG/SAI (TF):
   - KHÔNG soạn câu đơn giản. Phải soạn dạng NHẬN ĐỊNH PHỨC HỢP: [Hiện tượng] + [Nguyên nhân] + [Hệ quả/Đặc điểm chi tiết].
   - Cài bẫy logic: hiện tượng đúng nhưng nguyên nhân sai, hoặc nhầm đặc điểm giữa vùng/miền.
3. CHUẨN NĂNG LỰC: Skill Tag từ C1 đến C4.
4. GIẢI THÍCH CHUYÊN SÂU (BẮT BUỘC): "explain" theo cấu trúc:
   - [CORE FACT]
   - [DEEP DIVE]
   - [PRO TIP]
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

      const data = this.safeJsonParse(response.text);
      const arr = Array.isArray(data?.questions) ? data.questions : [];

      return arr.map((q: any, i: number) => {
        const qid = q?.qid || `Q-${Math.random().toString(36).slice(2, 7)}`;
        const type = (q?.type || "MCQ").toString().toUpperCase();
        const skill_tag = this.normalizeSkillTag(q?.skill_tag);
        const difficulty = typeof q?.difficulty === "number" ? q.difficulty : 1;

        const out: any = {
          ...q,
          qid,
          type,
          skill_tag,
          difficulty,
          prompt: String(q?.prompt || ""),
          answer_key: (q?.answer_key || "A").toString().toUpperCase(),
          explain:
            q?.explain ||
            "[CORE FACT]: Dữ liệu hệ thống. [DEEP DIVE]: Phân tích theo từng vế. [PRO TIP]: Ghi nhớ từ khóa vàng.",
        };

        if (type === "MCQ") {
          out.choices = q?.choices || { A: "...", B: "...", C: "...", D: "..." };
        } else {
          out.choices = undefined;
        }

        return out as Question;
      });
    } catch (error) {
      console.error("GeminiService.generateQuiz Error:", error);
      throw error;
    }
  }

  /**
   * [2] PHÂN TÍCH CHIẾN LƯỢC: Quét ma trận CCTV lớp.
   */
  static async analyzeClassStrategy(students: StudentSnapshot[]): Promise<string> {
    if (students.length === 0) return "Không có dữ liệu học sinh để phân tích.";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "Thiếu GEMINI_API_KEY nên không thể phân tích chiến lược.";

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

  /**
   * [3] TRA CỨU INSIGHT: Grounding kiến thức.
   */
  static async fetchTopicInsights(topic: Topic): Promise<SearchResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { summary: "Thiếu GEMINI_API_KEY nên không thể tra cứu.", sources: [] };

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
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .filter((c: any) => c.web)
        .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

      return { summary, sources: sources.slice(0, 3) };
    } catch (error) {
      console.error("GeminiService.fetchTopicInsights Error:", error);
      return { summary: "Lỗi kết nối tra cứu.", sources: [] };
    }
  }
}
