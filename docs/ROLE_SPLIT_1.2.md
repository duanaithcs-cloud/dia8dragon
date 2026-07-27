# Dia8Dragon Local 1.2 — Tách luồng giáo viên và học sinh

## Thay đổi chính
- Màn hình chọn không gian sử dụng khi mở lần đầu.
- Không gian học sinh chỉ hiển thị Học tập, Thi đấu, hạng và tiến trình cá nhân.
- Không gian giáo viên mở trực tiếp Bảng giáo viên và công cụ dữ liệu.
- Có nút Đổi vai trò; chuyển vai trò không xóa dữ liệu.
- Trạng thái vai trò được lưu trong hồ sơ và tương thích dữ liệu 1.1.
- Giao diện nêu rõ vai trò giáo viên trong bản local không phải lớp xác thực bảo mật.

## Kiến trúc
Bản source có component React `RoleSelectionDialog` và ràng buộc render theo vai trò. Bản chạy sử dụng thêm lớp tương thích `dist/role-flow.js` vì môi trường đóng gói không có Rollup Linux; lớp này cập nhật cùng cấu trúc AppState và điều chỉnh điều hướng của bundle 1.1.
