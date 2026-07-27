# Quyền riêng tư và dữ liệu học sinh — Dia8Dragon 3.1

## Nguyên tắc

Dia8Dragon ưu tiên lưu cục bộ. Hồ sơ, tiến độ, lịch sử Quiz, bản nháp Bài giao và tài liệu riêng được lưu trên thiết bị cho đến khi người dùng chủ động xuất, đồng bộ hoặc xóa.

## Xử lý bằng AI

- Quyền **Cho phép xử lý bằng AI** mặc định tắt.
- Khi tắt, Quiz dùng ngân hàng câu hỏi cục bộ và phần gợi ý dùng dữ liệu đã có trong ứng dụng.
- Chỉ khi người dùng bật quyền này, một số yêu cầu tạo nội dung mới mới có thể được gửi tới Gemini API đã cấu hình.
- Không nên nhập dữ liệu nhạy cảm, mật khẩu, số điện thoại hoặc thông tin sức khỏe vào nội dung gửi AI.

## Quyền của người dùng

Trong **Cá nhân → Quyền kiểm soát dữ liệu**, người dùng có thể:

1. Xuất gói sao lưu JSON.
2. Khôi phục từ gói sao lưu hợp lệ.
3. Tắt xử lý bằng AI.
4. Xóa dữ liệu cục bộ bằng xác nhận hai bước.

## Đồng bộ lớp học

Dữ liệu lớp chỉ được gửi khi giáo viên hoặc học sinh chủ động dùng tính năng đồng bộ đã cấu hình. Mã dịch vụ, khóa Supabase và khóa đồng bộ giáo viên không được đưa vào repository công khai.

## Phạm vi hiện tại

Bản 3.1 cung cấp cơ chế kiểm soát phía người dùng và quy trình kỹ thuật local-first. Đây chưa phải chứng nhận tuân thủ pháp lý độc lập. Đơn vị triển khai phải ban hành chính sách lưu giữ, phân quyền và xử lý yêu cầu xóa dữ liệu phù hợp với môi trường trường học thực tế.
