# Learning Evidence Engine 3.2.1

## Luồng ghi bằng chứng

`QuizView` đo thời gian và thu mức tự tin → `createLearningEvidenceDraft` chuẩn hóa bằng chứng → `App` gắn learner ID → `recordLearningEvidence` ghi một giao dịch IndexedDB → `sync_outbox` giữ bản ghi chờ đồng bộ.

## Bản ghi Learning Event

Các trường cốt lõi:

- `eventId`, `sessionId`, `learnerId`, `occurredAt`
- `topicId`, `questionId`, `questionVersion`, `questionStatus`
- `skillIds`, `cognitiveLevel`, `difficulty`
- `firstAnswer`, `finalAnswer`, `correctAnswer`, `isCorrect`
- `hintUsed`, `responseTimeMs`, `timingFlag`
- `confidence`, `inferenceConfidence`, `networkState`
- `errorTags`, `sourceEvidence`, `contentSnapshot`

## Chính sách local-first

- Ghi dữ liệu trên máy trước.
- Tạo mục `sync_outbox` cùng giao dịch với Learning Event.
- Không xóa bản ghi local khi chưa có xác nhận đồng bộ.
- Không gọi AI cho mỗi câu trả lời.
- Việc ước lượng kỹ năng là mô hình nhẹ, giải thích được và chạy offline.

## An toàn dữ liệu

- Tất cả object store dùng `keyPath: id`.
- Các store cốt lõi có index theo learner, topic, question, status và thời gian.
- Phiên bản câu hỏi được chụp theo `questionId@contentVersion`.
- Sao lưu/khôi phục hỗ trợ toàn bộ 9 store.
- Xóa dữ liệu xóa cả database mới.

## Giới hạn có chủ đích

3.2.1 chỉ xây nền tảng bằng chứng. Thuật toán vá lỗi thích ứng đầy đủ, ôn cách quãng và tối đa ba nhiệm vụ sau phiên thuộc Bước 3 — 3.2.2.
