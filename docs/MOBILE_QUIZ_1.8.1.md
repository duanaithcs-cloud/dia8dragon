# Dia8Dragon Mobile 1.8.1 – Quiz Mobile Fix

## Lỗi đã xử lý

- Quiz bị ảnh hưởng bởi CSS của thanh điều hướng mobile toàn ứng dụng.
- Vùng nội dung không dùng hết chiều cao khả dụng và tạo khoảng trống ở cuối.
- Nút chuyển câu nằm bên trong thẻ giải thích nên có thể ra ngoài vùng nhìn thấy ở màn hình dọc.

## Thay đổi

- Tách Quiz thành lớp toàn màn hình có `z-index` riêng.
- Khôi phục header Quiz về đầu màn hình thay vì bị CSS chung đưa xuống đáy.
- Vùng câu hỏi và giải thích cuộn độc lập bằng `100dvh` và `min-height: 0`.
- Thu gọn cỡ chữ, khoảng cách và thẻ đáp án trên màn hình nhỏ.
- Thêm thanh hành động cố định ở đáy cho “Câu tiếp theo” và “Lưu kết quả”.
- Chừa `safe-area-inset-bottom` cho iPhone và thanh điều hướng Android.
- Tự cuộn đến phần giải thích sau khi chấm câu.
- Tăng cache PWA lên `dia8-mobile-1.8.1` để bản triển khai mới thay CSS cũ.

## Kiểm tra hồi quy

Chạy:

```bash
npm run check:mobile-quiz
```
