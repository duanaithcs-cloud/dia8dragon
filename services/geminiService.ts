
import { GoogleGenAI, Type } from "@google/genai";
import { Question, Topic } from "../types";

/**
 * GeminiService: Lớp dịch vụ xử lý toàn bộ logic liên quan đến Google Gemini AI.
 * Được thiết kế để chạy mượt mà trên môi trường Vercel bằng cách sử dụng biến môi trường.
 */
export class GeminiService {
  /**
   * Khởi tạo và gọi model để tạo bộ đề trắc nghiệm chuyên sâu.
   */
  static async generateQuiz(topic: Topic, count: 10 | 25, isArena: boolean = false): Promise<Question[]> {
    // Luôn tạo instance mới trước khi gọi để đảm bảo lấy API_KEY mới nhất từ môi trường
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `BẠN LÀ "APPLE SENIOR EDUCATION ENGINEER". 
    NHIỆM VỤ: Soạn bộ đề trắc nghiệm địa lý lớp 8 (Việt Nam) đẳng cấp thế giới.
    CHUYÊN ĐỀ: "${topic.full_text}".
    ${isArena ? 'CHẾ ĐỘ: ARENA 1v1 (Đấu trường danh vọng). Yêu cầu độ khó cao hơn.' : ''}
    YÊU CẦU KỸ THUẬT:
    1. Phải có đủ 3 loại: MCQ (Trắc nghiệm), TF (Đúng/Sai), FILL (Điền khuyết).
    2. Phân bổ Skill Tag (C1-C4) và Độ khó (1-5) chính xác.
    3. Đáp án MCQ: A, B, C hoặc D.
    4. Đáp án TF: "TRUE" hoặc "FALSE".
    5. Đáp án FILL: Từ khóa ngắn gọn (Ví dụ: "HIMALAYA", "BIỂN ĐÔNG").
    6. "explain" phải mang tính sư phạm cao.
    7. TRẢ VỀ JSON THUẦN TÚY.`;

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
                                type: { type: Type.STRING, description: "MCQ, TF, or FILL" },
                                skill_tag: { type: Type.STRING, description: "C1, C2, C3, or C4" },
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

      const rawText = response.text || "{\"questions\": []}";
      const data = JSON.parse(rawText);
      
      // Audit logic: Đảm bảo dữ liệu trả về App luôn đúng cấu trúc
      const auditedQuestions: Question[] = (data.questions || []).map((q: any) => ({
        ...q,
        qid: q.qid || `Q-${Math.random().toString(36).substr(2, 5)}`,
        type: q.type || 'MCQ',
        skill_tag: (['C1','C2','C3','C4'].includes(q.skill_tag) ? q.skill_tag : 'C1'),
        difficulty: q.difficulty || 1,
        choices: q.type === 'MCQ' ? (q.choices || { A: "...", B: "...", C: "...", D: "..." }) : undefined,
        answer_key: q.answer_key ? q.answer_key.toString().toUpperCase() : "A",
        explain: q.explain || "Đáp án đã được hệ thống phê duyệt."
      }));

      if (auditedQuestions.length === 0) {
        throw new Error("Dữ liệu câu hỏi trống từ AI.");
      }

      return auditedQuestions;
    } catch (error) {
      console.error("GeminiService Error:", error);
      throw error;
    }
  }
}
