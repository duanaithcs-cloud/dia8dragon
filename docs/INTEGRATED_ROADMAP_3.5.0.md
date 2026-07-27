# Integrated Roadmap 3.5.0

## Bước 6 — Seven-Orb Journey
20 yêu quái được chia thành 7 chương. Mỗi chương có manh mối, Mảnh Tần Số, La Bàn, Boss 5 câu và một viên Ngọc. Boss yêu cầu đúng ít nhất 4/5. Tiến độ lưu trong `story_progress` và hoạt động offline.

## Bước 7 — Inventory & Learning Equipment
Catalog JSON gồm bốn nhóm: Phương tiện, Thiết bị, Trạm và Trang trí. Vật phẩm mở khóa bằng bằng chứng học tập; không hộp quà ngẫu nhiên, không mua bằng tiền thật, không tiết lộ đáp án. Thiết bị tự khóa trong kiểm tra chính thức.

## Bước 8 — Mobile Learning Base & Hybrid Sync
Mọi thao tác ghi local trước, đưa vào `sync_outbox`, chỉ xóa sau khi máy chủ xác nhận. Có bốn chính sách: Wi-Fi, mọi mạng, thủ công, tắt đồng bộ. Gói offline chỉ chứa dữ liệu học cốt lõi và không tải trước PDF/DOCX.

## Bước 9 — Teacher Intelligence Command
Giáo viên xem trạng thái phong ấn, nhóm lỗi, học sinh cần hỗ trợ, câu đáng nghi, kỹ năng sắp quên và hiệu quả nhiệm vụ vá lỗi. Giáo viên có thể bật/tắt game hóa, khóa thiết bị, bật chế độ kiểm tra, điều chỉnh trọng số và xuất gói học offline.

## Bước 10 — Visual Evolution
Yêu quái có tối đa ba trạng thái hình ảnh, dùng SVG sprite cục bộ. Có chất lượng thấp/cao, hiệu ứng ngắn, không video, không 3D, hỗ trợ giảm chuyển động và giới hạn animation đồng thời.
