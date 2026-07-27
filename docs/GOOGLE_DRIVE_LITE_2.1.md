# Dia8Dragon Google Drive Lite 2.1

## 1. Mục tiêu

Google Drive Lite là lớp **sao lưu, thống kê và nộp bài dự phòng** do chính giáo viên sở hữu. Nó không thay thế hoàn toàn Supabase Lite và không dùng để kiểm soát bản quyền ứng dụng.

Kiến trúc:

```text
Dia8Dragon trên trình duyệt
        ↓
Vercel Function /api/google-drive-bridge
        ↓
Google Apps Script của giáo viên
        ↓
Google Sheets + Google Form + Google Drive
```

Mỗi giáo viên có:

- Một thư mục Google Drive riêng.
- Một Google Sheets thống kê.
- Một Google Form nộp bài dự phòng.
- Tối đa 30 file sao lưu JSON nén.
- Một mã đồng bộ bí mật riêng.

## 2. Vai trò của từng thành phần

### Google Sheets

Các trang được tạo tự động:

- `HUONG_DAN`: mã đồng bộ và liên kết.
- `THONG_KE`: số lớp, học sinh, nhiệm vụ, bài nộp, phản hồi, điểm trung bình.
- `LOP_HOC`: danh mục lớp.
- `HOC_SINH`: danh mục học sinh.
- `NHIEM_VU`: danh mục nhiệm vụ.
- `BAI_LAM`: bài làm và điểm.
- `PHAN_HOI`: nhận xét và rubric.
- `NHAT_KY`: nhật ký sao lưu, khôi phục và lỗi.
- Trang phản hồi Google Form do Google tự tạo.

### Google Form

Dùng khi học sinh không thể nộp bài trực tiếp trong Dia8Dragon. Sau mỗi lần sao lưu, danh sách lớp và nhiệm vụ trong Form được cập nhật tự động.

Các trường:

- Mã lớp.
- Mã học sinh hoặc mã truy cập.
- Mã nhiệm vụ.
- Họ tên.
- Nội dung bài làm.
- Tự phản ánh.
- Ghi chú.

### Google Drive

Mỗi lần bấm **Sao lưu ngay**, Apps Script tạo một file:

```text
Dia8Dragon-Backup-YYYYMMDD-HHMMSS-XXXXXXXX.json.gz
```

Hệ thống giữ 30 bản gần nhất và đưa bản cũ hơn vào Thùng rác.

## 3. Cài đặt một lần cho mỗi giáo viên

### Bước 1 — Tạo Apps Script

1. Đăng nhập Tài khoản Google của giáo viên.
2. Mở `script.google.com`.
3. Chọn **New project**.
4. Đổi tên thành `Dia8Dragon Google Drive Lite`.
5. Xóa nội dung mặc định của `Code.gs`.
6. Copy toàn bộ nội dung file:

```text
google-drive-lite/Code.gs
```

7. Dán vào Apps Script và bấm Save.

### Bước 2 — Chạy trình cài đặt

1. Chọn hàm `setupDia8Dragon`.
2. Bấm Run.
3. Chấp nhận quyền tạo Google Drive, Sheets và Forms.
4. Chờ thông báo hoàn tất.
5. Mở Google Drive; sẽ có thư mục:

```text
Dia8Dragon - Du lieu day hoc
```

6. Mở bảng tính trong thư mục.
7. Trong trang `HUONG_DAN`, copy **Mã đồng bộ bí mật**.

### Bước 3 — Deploy Web App

1. Trong Apps Script chọn **Deploy → New deployment**.
2. Chọn loại **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Bấm **Deploy**.
6. Copy URL kết thúc bằng:

```text
/exec
```

Không dùng URL `/dev` cho vận hành thực tế.

### Bước 4 — Kết nối trong Dia8Dragon

1. Mở Dia8Dragon.
2. Chọn vai trò **Giáo viên**.
3. Mở tab **Đồng bộ**.
4. Tại Google Drive Lite nhập:
   - URL Apps Script `/exec`.
   - Mã đồng bộ bí mật.
5. Bấm **Kiểm tra**.
6. Khi kết nối thành công, bấm **Sao lưu ngay**.

## 4. Quy trình sử dụng

### Sao lưu

```text
Giáo viên cập nhật lớp/nhiệm vụ
→ mở Đồng bộ
→ Sao lưu ngay
→ Sheets được cập nhật
→ JSON nén được lưu vào Drive
→ Form nhận danh sách lớp/nhiệm vụ mới
```

### Nộp bài dự phòng bằng Form

```text
Giáo viên chia sẻ URL Google Form
→ học sinh chọn đúng lớp và nhiệm vụ
→ nhập mã học sinh
→ nộp bài
→ giáo viên mở Dia8Dragon
→ Đồng bộ
→ Nhập từ Form
```

Dia8Dragon đối chiếu:

- Mã lớp.
- Mã nhiệm vụ.
- Mã học sinh/mã truy cập hoặc họ tên chính xác.

Phản hồi không khớp sẽ không tự gắn vào học sinh và được báo cho giáo viên kiểm tra.

### Khôi phục

1. Mở tab **Đồng bộ**.
2. Bấm **Khôi phục**.
3. Xác nhận thời điểm bản sao lưu.
4. Dữ liệu giáo viên trên thiết bị được thay bằng bản gần nhất trên Drive.

Nên xuất thêm Excel/CSV trước khi khôi phục nếu dữ liệu hiện tại chưa được sao lưu.

## 5. Bảo mật

- Mã đồng bộ chỉ dành cho giáo viên.
- Không gửi mã đồng bộ cho học sinh.
- Không chụp công khai trang `HUONG_DAN`.
- Bật xác minh hai bước cho Tài khoản Google.
- Dùng Tài khoản Google riêng cho công việc dạy học nếu có thể.
- Không lưu ngày sinh đầy đủ, địa chỉ, số điện thoại hoặc dữ liệu nhạy cảm khi không cần thiết.
- Vercel proxy chỉ cho phép URL Apps Script chính thức và giới hạn gói dữ liệu 5 MB.
- Apps Script băm mã đồng bộ bằng SHA-256; không lưu mã gốc trong Script Properties.
- Dữ liệu bắt đầu bằng ký tự công thức được vô hiệu hóa trước khi ghi vào Sheets để giảm nguy cơ Formula Injection.
- `LockService` được dùng để ngăn hai lần sao lưu đồng thời ghi chồng nhau.

## 6. Dung lượng và giới hạn thiết kế

- Tài khoản Google cá nhân thường có tối đa 15 GB dùng chung cho Drive, Gmail và Photos; đây không phải 5 GB riêng cho Dia8Dragon.
- Google Sheets và Google Form chủ yếu dùng cho bảng dữ liệu; các file backup `.json.gz` mới là phần lưu trữ tăng theo thời gian.
- Không nên mô tả là “lưu vĩnh viễn”: dữ liệu phụ thuộc vào việc giáo viên duy trì quyền truy cập tài khoản, không vượt hạn mức và tuân thủ chính sách Google.
- Mỗi bản sao lưu tối đa khoảng 4,5 MB JSON trước khi nén.
- Giữ 30 bản gần nhất.
- Phù hợp dữ liệu văn bản, điểm và nhận xét.
- Không dùng để lưu video hoặc số lượng lớn tệp ảnh.
- Apps Script có hạn mức theo ngày và hạn mức có thể thay đổi.
- Google Drive Lite không cung cấp giao dịch cơ sở dữ liệu, realtime hoặc phân quyền phức tạp như Supabase.
- Google Form là kênh dự phòng, không phải giao diện nộp bài chính.

## 7. Mô hình thương mại

Khuyến nghị ba lớp:

```text
Bản quyền và giới hạn 3 thiết bị
→ máy chủ cấp phép trung tâm

Đồng bộ hoạt động, bài nộp và phản hồi
→ Supabase Lite/Pro

Sao lưu, thống kê và quyền sở hữu dữ liệu của giáo viên
→ Google Drive Lite riêng từng giáo viên
```

Khi chuyển giao cho giáo viên:

- Giáo viên tự sở hữu Drive và Form.
- Nhà phát triển không cần trả chi phí lưu trữ backup cho từng giáo viên.
- Khi giáo viên ngừng sử dụng dịch vụ cloud của Dia8Dragon, họ vẫn giữ được file Sheets và các bản backup trong tài khoản Google của mình.
- Việc cấp phép ứng dụng vẫn phải do máy chủ Dia8Dragon quản lý; Google Drive không được dùng làm hệ thống khóa bản quyền.

## 8. Xử lý lỗi

### Kiểm tra báo URL không hợp lệ

Dùng đúng URL triển khai `/exec`, không dùng URL trang chỉnh sửa Apps Script hoặc `/dev`.

### Sai mã đồng bộ

Mở bảng tính → `HUONG_DAN` để kiểm tra. Khi cần đổi mã, chạy:

```javascript
rotateSyncKey()
```

Sau đó nhập mã mới vào Dia8Dragon.

### Form chưa có lớp hoặc nhiệm vụ

Bấm **Sao lưu ngay** trong Dia8Dragon. Apps Script sẽ cập nhật danh sách lựa chọn trong Form.

### Bài Form không khớp học sinh

Kiểm tra:

- Mã lớp.
- Mã học sinh hoặc mã truy cập.
- Mã nhiệm vụ.
- Họ tên có trùng với danh sách lớp hay không.

### Backup quá lớn

- Kết thúc và lưu trữ năm học cũ.
- Xuất Excel/CSV.
- Xóa bài nháp hoặc nội dung không cần thiết.
- Không nhúng ảnh/video dưới dạng base64 trong bài làm.
