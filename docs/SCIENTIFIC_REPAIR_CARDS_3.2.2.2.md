# Scientific Geography Repair Cards 3.2.2.2

## Mục tiêu

Thay thẻ vá lỗi mẫu chung bằng hướng dẫn riêng cho từng câu hỏi. Thẻ phải bám đúng câu hỏi, phương án học sinh đã chọn, đáp án được duyệt, kiến thức cốt lõi và nguồn SGK đã gắn với câu.

## Dữ liệu được rà soát

- 499 câu trắc nghiệm, 499 mã câu duy nhất.
- 499 đáp án hợp lệ và đồng bộ với phương án đúng.
- 499 `CORE FACT`/`evidence_text` và nhãn nguồn SGK.
- Phản hồi riêng cho mọi phương án A, B, C, D.
- Nhóm lỗi được phân loại lại theo dạng câu thay vì dùng nhãn máy móc quá rộng.

## Cấu trúc mới trên từng câu

`repairGuidance` gồm:

- `questionKind`: dạng câu khoa học.
- `knowledgeAnchor`: kiến thức địa lí phải chốt.
- `correctAnswerKey` và `correctAnswerText`.
- `optionFeedback`: lí do riêng cho từng phương án.
- `repairAction`: quy trình sửa lỗi theo dạng câu.
- `memoryCue`: câu ghi nhớ ngắn.
- `verificationPrompt`: yêu cầu tự trả lời lại.
- `sourceLabel` và `sourceExcerpt`: căn cứ học liệu SGK.

## Trải nghiệm học sinh

Sau câu sai, thẻ hiển thị theo thứ tự:

1. Phương án học sinh đã chọn.
2. Đáp án đúng.
3. Vì sao phương án đã chọn chưa đúng.
4. Kiến thức địa lí cần chốt.
5. Cách vá lỗi.
6. Câu tự kiểm chứng.
7. Căn cứ SGK có thể mở rộng.

## Nguyên tắc an toàn nội dung

- Không tự thay đổi 499 đáp án đã được chấp nhận.
- Không tạo kiến thức mới ngoài `CORE FACT`, `evidence_text` và nguồn đã gắn với câu.
- Giữ `contentVersion: 1.0.0` vì nội dung câu và đáp án không đổi; phiên bản hướng dẫn được quản lí riêng bằng `scientific-repair-v1`.
- Khi câu hỏi bị đánh dấu không ổn định, cơ chế cách ly của 3.2.2 vẫn được ưu tiên.

## Báo cáo máy đọc

Xem `docs/SCIENTIFIC_REPAIR_AUDIT_499_3.2.2.2.json` để kiểm tra từng `qid`, đáp án, dạng câu, nhóm lỗi, nguồn và checksum.
