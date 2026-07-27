# Dia8Dragon 3.2.3 — Question Intelligence & Patch Center

## Mục tiêu

Bản 3.2.3 bảo vệ hồ sơ năng lực học sinh khỏi câu hỏi có dấu hiệu lỗi trước khi tiếp tục game hóa. Hệ thống không tự ý đổi đáp án; mọi cảnh báo chỉ là bằng chứng hỗ trợ và giáo viên giữ quyền quyết định cuối cùng.

## Tín hiệu kiểm định

1. Có nhiều phương án trùng hoặc có thể cùng hợp lý.
2. Khóa đáp án, lời giải và hồ sơ vá lỗi không khớp.
3. Đơn vị hoặc mốc năm không đồng nhất.
4. Phương án nhiễu hoặc tỉ lệ sai có dấu hiệu bất thường.
5. Người học có mức thành thạo cao cùng chọn một đáp án khác.
6. Tỉ lệ sai tăng đáng kể sau một phiên bản mới.
7. Có nhiều báo cáo chưa xử lý.
8. Căn cứ SGK thiếu hoặc mâu thuẫn với đáp án.

## Sáu trạng thái

- `STABLE`: Ổn định.
- `MONITOR`: Cần theo dõi.
- `SUSPECT`: Đáng nghi.
- `QUARANTINED`: Tạm cách ly.
- `PATCHED`: Đã sửa.
- `REPLACED`: Đã thay thế.

## Quy tắc cách ly

Câu `QUARANTINED` hoặc `REPLACED` không được đưa vào đề mới. Hệ thống tìm câu gần nhất theo kỹ năng, cấp độ nhận thức, `skill_tag`, độ khó và nhóm lỗi để thay thế. Nếu một câu bị cách ly trong khi phiên Quiz cũ vẫn đang mở, bằng chứng vẫn được lưu cho giáo viên nhưng không cập nhật năng lực, không tạo lỗi học sinh, không tạo thẻ vá lỗi và không tạo gợi ý thích ứng.

## Phiên bản hóa

Mỗi bản vá tạo một `QuestionVersionRecord` mới, có `parentVersionId`, tóm tắt thay đổi, người duyệt, thời gian và checksum. Bản cũ không bị ghi đè. Giáo viên có thể khôi phục một phiên bản trước hoặc quay lại bản gốc trong một thao tác.

## Dữ liệu cục bộ

IndexedDB `dia8dragon-learning-evidence` nâng từ schema 2 lên 3 và bổ sung:

- `question_intelligence`
- `question_reports`

Chín kho cũ được giữ nguyên. Xuất/nhập dữ liệu hiện bao gồm cả hai kho mới.

## Gói bản vá giáo viên

Nút **Xuất gói bản vá** tạo JSON gồm quyết định, báo cáo và các phiên bản do giáo viên duyệt. Gói này dùng để lưu trữ hoặc bàn giao trước khi tích hợp đồng bộ lớp/cloud ở các bước sau.
