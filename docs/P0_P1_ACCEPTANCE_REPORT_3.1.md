# Báo cáo nghiệm thu nội bộ P0/P1 — Dia8Dragon 3.1

Ngày kiểm tra: 25/07/2026

## Phạm vi

### P0

- Bàn phím, focus-visible, focus trap và phục hồi focus.
- Chữ chức năng dễ đọc, mục tiêu chạm tối thiểu 44 px.
- Giảm chuyển động theo người dùng và hệ điều hành.
- Đồng ý xử lý AI, xuất/khôi phục/xóa dữ liệu cục bộ.
- Quality gate trên GitHub Actions.

### P1

- Điều hướng 5 điểm đến.
- Trung tâm Luyện tập thích ứng.
- Phân loại nhóm lỗi và đề xuất sau Quiz.
- Hồ sơ lỗi cá nhân.
- Chẩn đoán can thiệp trên Teacher Dashboard.

## Kết quả

- `npm run check:p0-p1`: 21/21 tiêu chí đạt.
- TypeScript/TSX syntax: 38/38 tệp đạt.
- Type-check nội bộ bằng TypeScript 5.8.3 và khai báo môi trường tối thiểu: đạt.
- CSS PostCSS parse: `mobile.css` và `app-local.css` đạt.
- Các kiểm tra hồi quy đã đạt: Mobile Quiz, Adaptive UI, Workspace Contrast, Essay Contrast, Arena UX, Full-width Workspace, Dia8 Visual, Customization, Original Neon, Assignment UX, Document Library, Learning Library, Quiz Explanations.
- Ngân hàng Quiz: 499 câu, 499 lời giải riêng, đủ căn cứ.
- Tài liệu: 10 DOCX HSG/75 trang và 1 PDF SGK/245 trang còn nguyên vẹn.

## Build production

`npm run build` chưa chạy được trong container đóng gói vì `node_modules` không tồn tại và `npm ci --offline` thiếu gói `yallist-3.1.1`. Lỗi trực tiếp là `vite: not found`, không phải lỗi cú pháp ứng dụng.

Workflow `.github/workflows/quality-gate.yml` đã được thêm để Vercel/GitHub chạy cài đặt sạch và build trong môi trường có registry.

## Giới hạn

Đây là nghiệm thu kỹ thuật nội bộ, không phải chứng nhận của Apple, Apple Education, Trường Đại học Sư phạm Hà Nội hoặc tổ chức bên ngoài.
