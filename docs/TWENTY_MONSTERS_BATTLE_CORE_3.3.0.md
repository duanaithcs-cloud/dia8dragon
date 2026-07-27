# Dia8Dragon 3.3.0 — Twenty Monsters Battle Core

## Nguyên tắc sư phạm

Yêu quái không có một thanh máu chung. Mỗi chuyên đề được bảo vệ bởi ba lớp bằng chứng khác nhau:

1. **Giáp Kiến thức** — xác nhận học sinh nhận biết và hiểu đúng kiến thức cốt lõi.
2. **Khiên Kỹ năng** — xác nhận học sinh xử lí được câu hỏi mới, dữ liệu, quan hệ hoặc bài toán của chuyên đề.
3. **Phong ấn Ghi nhớ** — chỉ hoàn tất bằng câu mới ở một phiên sau để kiểm chứng độ bền ghi nhớ.

Điểm số không thay thế hồ sơ năng lực. Mỗi câu vẫn đi qua Learning Evidence Engine và Question Intelligence.

## Bốn pha

- **Trinh sát:** 3 câu chẩn đoán. Đúng ít nhất 2 câu để phá Giáp Kiến thức.
- **Phá giáp:** 3 câu nhắm vào kỹ năng. Đúng ít nhất 2 câu để phá Khiên Kỹ năng.
- **Phản công:** 4 câu vận dụng mới. Đúng ít nhất 3 câu để đưa Phong ấn Ghi nhớ về trạng thái có thể kiểm chứng.
- **Phong ấn:** 3 câu mới sau tối thiểu 24 giờ. Đúng ít nhất 2 câu để phong ấn hoàn toàn.

Tiến độ là cộng dồn và không tăng ngược lớp phòng thủ đã phá. Tái đấu sau khi phong ấn chỉ củng cố, không làm mất chiến thắng cũ.

## Lưu trữ

Tiến độ được lưu trong IndexedDB:

- Database: `dia8dragon-learning-evidence`
- Store: `story_progress`
- ID: `monster-progress:<learnerId>:<topicId>`
- Model: `monster-battle-local-v1`

Dữ liệu được xuất/nhập cùng snapshot Learning Evidence hiện có.

## Hiệu năng

- Không thêm dependency npm.
- Không thêm ảnh raster cho yêu quái.
- Một màn hình chỉ render một SVG động lớn; danh sách 20 con dùng SVG tĩnh nhỏ.
- Không cache trước tài nguyên nặng.
- Tôn trọng `reduceMotion` và `prefers-reduced-motion`.

## An toàn học thuật

- Sử dụng ngân hàng 499 câu đã kiểm định.
- Câu `QUARANTINED` hoặc `REPLACED` không được giao.
- Câu sai vẫn sinh Thẻ vá lỗi dựa trên `repairGuidance` khoa học của từng câu.
- Pha chiến đấu không gọi AI sau mỗi câu; AI chỉ được dùng nếu người dùng đã đồng ý và không có đủ dữ liệu local.
