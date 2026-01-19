import { GoogleGenAI, Type } from "@google/genai";
import { Question, Topic, StudentSnapshot, SearchResult } from "../types";

/**
 * GeminiService: "Bộ não" trung tâm điều hành mọi tác vụ AI của ứng dụng.
 */
export class GeminiService {
  /**
   * [1] TẠO QUIZ: Soạn bộ đề trắc nghiệm chuyên sâu.
   */
  static async generateQuiz(topic: Topic, count: 10 | 25, isArena: boolean = false): Promise<Question[]> {  

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const systemInstruction = `BẠN LÀ "BỘ NÃO KHẢO THÍ ĐỊA AI" - CHUYÊN GIA SỐ 1 VỀ ĐỊA LÍ 8 (BỘ KNTT). 
    NHIỆM VỤ: Soạn bộ đề luyện năng lực cao cấp cho chuyên đề: "${topic.full_text}".
    ${isArena ? 'CHẾ ĐỘ: ARENA COMBAT (Yêu cầu các câu hỏi lắt léo, bẫy tư duy, đòi hỏi kỹ năng C3-C4 cao).' : ''}
    
    YÊU CẦU KỸ THUẬT QUAN TRỌNG:
    1. LOẠI CÂU HỎI: Phối hợp MCQ (A,B,C,D), TF (Nhận định Đúng/Sai), và FILL (Điền khuyết).
    2. CHI TIẾT DẠNG NHẬN ĐỊNH ĐÚNG/SAI (TF): 
       - KHÔNG soạn câu đơn giản. Phải soạn dạng NHẬN ĐỊNH PHỨC HỢP bao gồm: [Hiện tượng] + [Nguyên nhân] + [Hệ quả/Đặc điểm chi tiết].
       - Cài cắm bẫy logic tinh vi: Có thể hiện tượng đúng nhưng nguyên nhân sai, hoặc nhầm lẫn đặc điểm giữa các vùng/miền.
       - Ví dụ: "Địa hình vùng núi Đông Bắc có hướng vòng cung là do tác động của khối nền cổ vòm sông Chảy, tạo điều kiện cho gió mùa Đông Bắc xâm nhập sâu vào nội địa." (Học sinh phải xác định tính đúng/sai của cả 3 vế).
    3. CHUẨN NĂNG LỰC: Phân bổ Skill Tag từ C1 (Nhận biết) đến C4 (Vận dụng cao).
    4. GIẢI THÍCH CHUYÊN SÂU (BẮT BUỘC): Phần "explain" viết theo cấu trúc:
       - [CORE FACT]: Chốt kiến thức then chốt.
       - [DEEP DIVE]: Bóc tách từng vế của nhận định (Vế 1, Vế 2, Vế 3) để chứng minh tính đúng/sai. Phân tích bẫy logic.
       - [PRO TIP]: Mẹo nhớ hoặc từ khóa "vàng" để không sai lại.
    5. TRẢ VỀ JSON THUẦN TÚY. KHÔNG CÓ TEXT THỪA.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate ${count} specialized questions for topic: ${topic.keyword_label}. Focus on complex TF (Identification) questions with logical traps.`,
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
                                        D: { type: Type.STRING } 
                                    } 
                                },
                                answer_key: { type: Type.STRING },
                                explain: { type: Type.STRING }
                            },
                            required: ["qid", "type", "skill_tag", "difficulty", "prompt", "answer_key", "explain"]
                        }
                    }
                }
            }
        }
      });

      const data = JSON.parse(response.text || "{\"questions\": []}");
      return (data.questions || []).map((q: any) => ({
        ...q,
        qid: q.qid || `Q-${Math.random().toString(36).substr(2, 5)}`,
        type: q.type || 'MCQ',
        skill_tag: (['C1','C2','C3','C4'].includes(q.skill_tag) ? q.skill_tag : 'C1'),
        difficulty: q.difficulty || 1,
        choices: q.type === 'MCQ' ? (q.choices || { A: "...", B: "...", C: "...", D: "..." }) : undefined,
        answer_key: q.answer_key ? q.answer_key.toString().toUpperCase() : "A",
        explain: q.explain || "[CORE FACT]: Dữ liệu hệ thống. [DEEP DIVE]: Câu hỏi này kiểm tra kiến thức nền tảng qua nhận định phức hợp. [PRO TIP]: Luôn bóc tách từng vế của phát biểu."
      }));
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
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const avgMastery = Math.round(students.reduce((a, s) => a + s.avgMastery, 0) / students.length);
    const criticalCount = students.filter(s => s.status === 'CRITICAL').length;

    const prompt = `Bạn là Hội đồng Chiến lược Giáo dục Địa AI. 
    Phân tích dữ liệu Matrix 33 chuyên đề của ${students.length} học sinh. 
    Mastery trung bình lớp: ${avgMastery}%.
    Số HS nguy cấp (<40%): ${criticalCount}.
    Hãy đưa ra 3 phương án can thiệp NANO-MATRIX chiến lược.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
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
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `Tóm tắt kiến thức cốt lõi và các từ khóa quan trọng cho chuyên đề: "${topic.keyword_label}". 
    Dựa trên chương trình Địa lí 8 Kết nối tri thức. Ngắn gọn, súc tích.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
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
