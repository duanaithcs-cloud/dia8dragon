# Data Stability 1.1

## Thành phần mới
- `utils/dataPersistence.ts`: lưu/đọc an toàn, snapshot, checksum, điểm khôi phục và phục hồi.
- `components/TransferHub.tsx`: giao diện sao lưu, nhập, xuất và quản lý tối đa 8 điểm lưu.
- `App.tsx`: lưu trễ 500 ms, sao lưu theo chu kỳ, cứu hộ trước phục hồi và hợp nhất dữ liệu theo catalog hiện hành.

## Kiểm thử đã thực hiện
- TypeScript `--noEmit`: đạt.
- Snapshot hợp lệ: đạt.
- Phát hiện snapshot bị chỉnh sửa: đạt.
- Tạo/đọc/xóa điểm khôi phục: đạt.
- Dữ liệu chính hỏng và phục hồi từ điểm gần nhất: đạt.

## Nguyên tắc
- Không ghi đè liên tục lên một backup duy nhất.
- Mọi thao tác phục hồi đều tạo bản cứu hộ trước.
- File xuất có checksum nhưng không phải chữ ký mật mã; mục tiêu là phát hiện hỏng/chỉnh sửa tình cờ.
