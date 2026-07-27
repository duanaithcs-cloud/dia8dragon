import { GoogleGenAI, Type } from "@google/genai";

const DEFAULT_MODEL = "gemini-2.5-pro";

const quizSchema = {
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
  },
  required: ["questions"]
};

const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY on the server.");
  }
  process.env.GEMINI_API_KEY = apiKey;
  process.env.GOOGLE_API_KEY = apiKey;
  return new GoogleGenAI({ apiKey });
};

const getModel = () => process.env.GEMINI_MODEL || DEFAULT_MODEL;

const cleanQuestion = (q, topic) => ({
  ...q,
  qid: q.qid || `T${topic.topic_id}-${Math.random().toString(36).slice(2, 7)}`,
  topic_id: String(topic.topic_id),
  type: ["MCQ", "TF", "FILL"].includes(q.type) ? q.type : "MCQ",
  skill_tag: ["C1", "C2", "C3", "C4"].includes(q.skill_tag) ? q.skill_tag : "C1",
  difficulty: Number(q.difficulty || 1),
  choices: q.type === "MCQ" ? (q.choices || { A: "...", B: "...", C: "...", D: "..." }) : undefined,
  answer_key: q.answer_key ? String(q.answer_key).toUpperCase() : "A",
  explain: q.explain || "[CORE FACT]: Câu hỏi chưa có lời giải đã kiểm định. [DEEP DIVE]: Cần đối chiếu đáp án và từng phương án nhiễu với nguồn học tập. [PRO TIP]: Không sử dụng câu này trong kiểm tra chính thức trước khi giáo viên duyệt."
});

async function generateQuiz(body) {
  const { topic, count = 10, isArena = false } = body;
  if (!topic?.topic_id || !topic?.full_text) {
    throw new Error("Missing topic data.");
  }

  const systemInstruction = `Bạn là "Bộ não khảo thí Địa lí AI" cho đội tuyển học sinh giỏi Địa lí 8.
Nhiệm vụ: soạn bộ câu hỏi trắc nghiệm cho chuyên đề "${topic.full_text}".
${isArena ? "Chế độ Arena: tăng độ phân hóa, có bẫy tư duy, ưu tiên C3-C4." : ""}

Yêu cầu:
1. Tạo đúng ${count} câu, phối hợp MCQ, TF và FILL.
2. TF phải là nhận định phức hợp có hiện tượng, nguyên nhân và hệ quả/đặc điểm; có thể cài bẫy logic nhưng không mơ hồ.
3. Gắn skill_tag C1, C2, C3 hoặc C4.
4. Mỗi explain bắt buộc theo cấu trúc [CORE FACT], [DEEP DIVE], [PRO TIP].
5. [CORE FACT] nêu kiến thức cốt lõi riêng của câu, không dùng câu mẫu chung.
6. [DEEP DIVE] giải thích rõ đáp án đúng và lần lượt chỉ ra điểm sai/lệch của từng phương án nhiễu.
7. [PRO TIP] phải gắn với dạng tư duy của chính câu hỏi: số liệu, bản đồ, nguyên nhân, giải pháp, phủ định hoặc biểu đồ.
8. Chỉ sử dụng dữ kiện có trong nội dung chuyên đề; không tự thêm số liệu hoặc khẳng định ngoài nguồn.
9. Nội dung bám chương trình Địa lí 8 Việt Nam, phù hợp luyện HSG nhưng không vượt quá kiến thức phổ thông.
10. Trả về JSON thuần, không thêm văn bản ngoài JSON.`;

  const response = await getAi().models.generateContent({
    model: getModel(),
    contents: `Tạo ${count} câu hỏi cho bong bóng chuyên đề #${topic.topic_id}: ${topic.keyword_label}. Nội dung đầy đủ: ${topic.full_text}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: quizSchema
    }
  });

  const data = JSON.parse(response.text || "{\"questions\":[]}");
  return { questions: (data.questions || []).slice(0, count).map((q) => cleanQuestion(q, topic)) };
}

async function fetchTopicInsights(body) {
  const { topic } = body;
  if (!topic?.keyword_label) {
    throw new Error("Missing topic data.");
  }

  const response = await getAi().models.generateContent({
    model: getModel(),
    contents: `Tóm tắt kiến thức cốt lõi, lỗi học sinh hay mắc và 3 từ khóa vàng cho chuyên đề Địa lí 8: "${topic.keyword_label}" - ${topic.full_text}`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = chunks
    .filter((chunk) => chunk.web)
    .map((chunk) => ({ title: chunk.web.title, uri: chunk.web.uri }))
    .slice(0, 3);

  return { summary: response.text || "Không có tóm tắt.", sources };
}

async function analyzeClassStrategy(body) {
  const { students = [] } = body;
  if (!Array.isArray(students) || students.length === 0) {
    return { text: "Không có dữ liệu học sinh để phân tích." };
  }

  const avgMastery = Math.round(students.reduce((sum, s) => sum + (s.avgMastery || 0), 0) / students.length);
  const criticalCount = students.filter((s) => s.status === "CRITICAL").length;

  const response = await getAi().models.generateContent({
    model: getModel(),
    contents: `Bạn là cố vấn đội tuyển HSG Địa lí 8. Phân tích dữ liệu ${students.length} học sinh, mastery trung bình ${avgMastery}%, số HS nguy cấp ${criticalCount}. Đưa ra 3 phương án can thiệp ngắn gọn, thực dụng.`
  });

  return { text: response.text || "Không có phân tích." };
}

async function loginCoach(body) {
  const { fullName, className, topics = [] } = body;
  if (!fullName || !className) {
    throw new Error("Missing identity data.");
  }

  const weakTopics = topics
    .slice()
    .sort((a, b) => (a.mastery_percent || 0) - (b.mastery_percent || 0))
    .slice(0, 5)
    .map((t) => `#${t.topic_id} ${t.keyword_label}`)
    .join(", ");

  const response = await getAi().models.generateContent({
    model: getModel(),
    contents: `Viết lời chào ngắn cho học sinh ${fullName}, lớp ${className}, khi đăng nhập app luyện HSG Địa lí 8. Gợi ý lộ trình 3 bước dựa vào các bong bóng yếu: ${weakTopics}. Giọng động viên, rõ việc, dưới 120 chữ.`
  });

  return { text: response.text || `Chào ${fullName}. Hãy bắt đầu bằng một bong bóng còn yếu, luyện 10 câu, xem giải thích rồi quay lại luyện 25 câu.` };
}

const handlers = {
  generateQuiz,
  fetchTopicInsights,
  analyzeClassStrategy,
  loginCoach
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const action = body?.action;
    if (!handlers[action]) {
      return res.status(400).json({ error: "Unknown Gemini action." });
    }

    const result = await handlers[action](body);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Gemini API error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Gemini request failed." });
  }
}


