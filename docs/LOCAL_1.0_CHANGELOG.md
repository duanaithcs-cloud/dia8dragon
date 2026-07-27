# Dia8Dragon Local 1.0 Final

## Hoàn thành

- Đóng gói giao diện Tailwind thành CSS tĩnh local; không còn phụ thuộc Tailwind CDN.
- Loại bỏ phụ thuộc Google Fonts và Material Symbols trực tuyến; dùng font hệ thống và biểu tượng dự phòng local.
- Đưa ảnh nền, Riolu, Lucario và Mega Lucario vào gói ứng dụng.
- Thay avatar DiceBear trực tuyến bằng tài nguyên local.
- Sửa lỗi mã hóa tiếng Việt trong API Gemini.
- Đọc/ghi localStorage an toàn, có bản sao lưu trạng thái gần nhất và phục hồi khi JSON hỏng.
- Sửa kiểu dữ liệu quiz readonly để tương thích dữ liệu nguồn.
- Bổ sung giảm chuyển động theo cài đặt trợ năng của hệ điều hành.
- Kiểm tra server local và các tài nguyên HTML, CSS, JS, JSON, PNG, WebP.
- Kiểm tra cú pháp toàn bộ JavaScript phát hành.

## Phạm vi offline

Các chức năng học tập, ngân hàng câu hỏi, chuyên đề, hình ảnh, tiến trình và báo cáo local hoạt động không cần Internet. Chức năng gọi Gemini hoặc mở trang Gemini là tính năng tùy chọn và cần mạng.

## Cách chạy

1. Giải nén toàn bộ thư mục.
2. Nhấp đúp `START_APP.bat`.
3. Trình duyệt tự mở ứng dụng.
4. Dùng `STOP_APP.bat` để dừng server local.

## Lưu ý

Không chạy trực tiếp `dist/index.html` bằng giao thức file. Luôn sử dụng `START_APP.bat` để trình duyệt đọc đúng dữ liệu JSON và tài nguyên.
