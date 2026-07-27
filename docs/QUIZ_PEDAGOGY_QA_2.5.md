# Báo cáo QA lời giải Quiz 2.5

## 1. Phát hiện trước nâng cấp

Ngân hàng có 499 câu accepted nhưng chỉ có 4 nội dung giải thích khác nhau. Sự khác nhau duy nhất là chữ cái đáp án A, B, C hoặc D. Các lời giải cũ không giải thích kiến thức, không phân tích phương án nhiễu và không cung cấp căn cứ học tập.

## 2. Chuẩn lời giải mới

### Cốt lõi

Nêu một dữ kiện, quy luật, mối quan hệ nhân quả hoặc kết luận địa lí trực tiếp quyết định đáp án. Không dùng câu “đáp án X là phương án được in đậm”.

### Phân tích

- Giải thích vì sao đáp án đúng phù hợp với dữ kiện câu hỏi.
- Chỉ ra nguyên nhân các phương án còn lại sai, lệch phạm vi, đọc sai số liệu, đảo chiều quan hệ nhân quả hoặc tuyệt đối hóa.
- Với câu phủ định, xác nhận ba phương án phù hợp và chỉ rõ ngoại lệ.

### Mẹo

Mẹo được tạo theo loại câu: dữ kiện số, bảng số liệu, phân bố, nguyên nhân chủ yếu, giải pháp, câu phủ định, biểu đồ hoặc suy luận điều kiện - hoạt động - kết quả.

## 3. Kết quả kiểm tra tự động

| Chỉ tiêu | Trước | Sau |
|---|---:|---:|
| Câu accepted | 499 | 499 |
| Lời giải khác nhau | 4 | 499 |
| Câu dùng mẫu chung cũ | 499 | 0 |
| Câu thiếu Cốt lõi/Phân tích/Mẹo | 0 | 0 |
| Câu thiếu căn cứ | 499 | 0 |
| Câu có bài/trang SGK | 0 | 499 |
| Đường dẫn nguồn `D:\...` hiển thị | Có | 0 |

## 4. Bản đồ nguồn

- Chủ đề 1: Bài 1, tr. 117-119.
- Chủ đề 2: Bài 2, tr. 120-122.
- Chủ đề 3: Bài 3, tr. 123-126.
- Chủ đề 5: Bài 5, tr. 129-135.
- Chủ đề 6: Bài 6, tr. 136-140.
- Chủ đề 7: Bài 8, tr. 142-150.
- Chủ đề 8: Bài 10, tr. 152-156.
- Chủ đề 10: Bài 12, tr. 158-165.
- Chủ đề 11: Bài 13, tr. 166-175.
- Chủ đề 12: Bài 14, tr. 176-184.
- Chủ đề 13: Bài 16, tr. 186-194.
- Chủ đề 14: Bài 17, tr. 195-203.
- Chủ đề 15: Bài 19, tr. 205-212.
- Chủ đề 17: Bài 21, tr. 214-220.
- Chủ đề 18: Chủ đề chung 1, tr. 221-224.
- Chủ đề 19: Chủ đề chung 2, tr. 225-229.

## 5. Trạng thái nghiệm thu

**Đạt yêu cầu kỹ thuật và biên tập vòng 1.**

Chưa được xem là thẩm định chuyên môn độc lập. Những câu có số liệu năm 2024, phép tính, cụm “chủ yếu/quan trọng nhất” và mức VDC cần được giáo viên kiểm tra mẫu trước khi sử dụng làm điểm chính thức.
