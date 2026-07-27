# Dia8Dragon Mobile 1.9 – Reading Cockpit UI

Bản 1.9 tập trung vào khả năng đọc sâu, thao tác nhanh và độ ổn định khi xoay điện thoại. Thiết kế tham chiếu ba nhóm nguyên tắc: nền tảng sách số (đọc lâu ít mỏi mắt), bảng điều khiển giao dịch (phản hồi và vùng bấm rõ), và giao diện điều khiển mật độ cao (ưu tiên thông tin theo trạng thái). Đây là định hướng thiết kế nội bộ, không phải sản phẩm hay chứng nhận của các thương hiệu bên ngoài.

## Thay đổi chính

- Ba chế độ đọc: Gọn, Học và Nghiên cứu.
- Điều chỉnh cỡ chữ, giãn dòng, căn trái/căn đều và tương phản.
- Chiều dài dòng đọc được giới hạn để giảm quét mắt.
- Text box có phân cấp thị giác, padding thích ứng và không tạo vùng trống vô ích.
- Drawer chuyên đề dùng toàn màn hình trên mobile; header và dock thao tác nằm trong safe-area.
- Màn hình ngang chuyển dock thao tác thành thanh dọc bên phải, tận dụng chiều rộng.
- Quiz ở màn hình ngang dùng bố cục hai vùng: câu hỏi/đáp án và giải thích.
- Quick Reader hiển thị nội dung theo cụm từ, hỗ trợ 160–720 từ/phút.
- Quick Reader ở màn hình ngang được nén header, stage, controls và footer để không bị cắt.
- Vùng bấm tối thiểu 44 px, có focus-visible và phản hồi nhấn rõ.
- Biểu tượng local, không phụ thuộc font icon Internet.

## Dữ liệu tùy chỉnh

Các lựa chọn đọc nằm trong `user_profile.preferences` và được bảo vệ bởi hệ thống Data Safe:

- `readingMode`
- `readingFontScale`
- `readingLineHeight`
- `readingAlign`
- `readingContrast`
- `quickReadWpm`

## Kiểm thử

- Kiểm tra cú pháp TypeScript/TSX toàn bộ source.
- Kiểm tra type bằng cấu hình QA với shim cho dependency không có trong môi trường đóng gói.
- Kiểm tra cú pháp JavaScript cho runtime mobile, service worker và API Gemini.
- Kiểm tra cân bằng cấu trúc CSS.
- Kiểm tra hồi quy Quiz mobile và cache PWA.
- Kiểm tra bố cục mô phỏng ở khung dọc và ngang.

## Cập nhật Vercel

Copy patch vào repository, commit lên nhánh `main` và push. Vercel sẽ tự build. Cache service worker đã tăng lên `dia8-mobile-1.9.0`; nếu điện thoại còn bản cũ, đóng tab/PWA rồi mở lại hoặc xóa dữ liệu trang một lần.
