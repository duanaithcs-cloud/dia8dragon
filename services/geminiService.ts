
import { GoogleGenAI, Type } from "@google/genai";
import { Question, Topic, StudentSnapshot, SearchResult } from "../types";

/**
 * GeminiService: "Bộ não" trung tâm điều hành mọi tác vụ AI của ứng dụng.
 * Thiết kế tối ưu cho Vercel: Stateless, sử dụng biến môi trường, xử lý lỗi tập trung.
 */
export class GeminiService {
  /**
   * [1] TẠO QUIZ: Soạn bộ đề trắc nghiệm theo chuẩn năng lực Apple Education.
   */
  static async generateQuiz(topic: Topic, count: 10 | 25, isArena: boolean = false): Promise<Question[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `BẠN LÀ "APPLE SENIOR EDUCATION ENGINEER". 
    NHIỆM VỤ: Soạn bộ đề trắc nghiệm địa lý lớp 8 (Việt Nam) đẳng cấp thế giới.
    CHUYÊN ĐỀ: "${topic.full_text}".
    ${isArena ? 'CHẾ ĐỘ: ARENA 1v1 (Đấu trường danh vọng). Yêu cầu độ khó cao hơn.' : ''}
    YÊU CẦU KỸ THUẬT:
    1. Phải có đủ 3 loại: MCQ (Trắc nghiệm), TF (Đúng/Sai), FILL (Điền khuyết).
    2. Phân bổ Skill Tag (C1-C4) và Độ khó (1-5) chính xác.
    3. TRẢ VỀ JSON THUẦN TÚY.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate ${count} specialized questions for topic: ${topic.short_label}.`,
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
        explain: q.explain || "Đáp án đã được hệ thống phê duyệt."
      }));
    } catch (error) {
      console.error("GeminiService.generateQuiz Error:", error);
      throw error;
    }
  }

  /**
   * [2] PHÂN TÍCH CHIẾN LƯỢC: Quét ma trận CCTV lớp và đưa ra giải pháp sư phạm.
   */
  static async analyzeClassStrategy(students: StudentSnapshot[]): Promise<string> {
    if (students.length === 0) return "Không có dữ liệu học sinh để phân tích.";
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const avgMastery = Math.round(students.reduce((a, s) => a + s.avgMastery, 0) / students.length);
    const criticalCount = students.filter(s => s.status === 'CRITICAL').length;

    const prompt = `Bạn là Hội đồng Chiến lược Giáo dục của Apple và Tokyo Univ. 
    Phân tích dữ liệu Matrix 33 chuyên đề của ${students.length} học sinh. 
    Mastery trung bình lớp: ${avgMastery}%.
    Số HS nguy cấp (<40%): ${criticalCount}.
    Hãy đưa ra 3 phương án can thiệp NANO-MATRIX (ngắn gọn, tập trung vào kỹ năng C1-C4).`;

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
   * [3] TRA CỨU INSIGHT: Sử dụng Google Search Grounding để tóm tắt kiến thức chuyên đề.
   */
  static async fetchTopicInsights(topic: Topic): Promise<SearchResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Tóm tắt kiến thức cốt lõi và các từ khóa quan trọng cho chuyên đề: "${topic.full_text}". 
    Yêu cầu: Ngắn gọn, súc tích, chuẩn kiến thức SGK Địa lí 8 Kết nối tri thức. 
    Liệt kê thêm 3 nguồn tham khảo uy tín (URL).`;

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
      return { 
        summary: "Không thể kết nối với hệ thống tra cứu Grounding. Vui lòng kiểm tra lại kết nối.", 
        sources: [] 
      };
    }
  }
}
