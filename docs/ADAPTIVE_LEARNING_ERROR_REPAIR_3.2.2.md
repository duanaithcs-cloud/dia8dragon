# Adaptive Learning & Error Repair 3.2.2

## Chu trình local-first

```text
Câu trả lời
→ Learning Event
→ Chẩn đoán nhóm lỗi
→ Cập nhật xác suất thành thạo kỹ năng
→ Thẻ vá lỗi
→ Ưu tiên câu tương đương
→ Lên lịch kiểm chứng
→ Tối đa ba nhiệm vụ cuối phiên
```

## Mô hình kỹ năng

Mỗi kỹ năng lưu:

- `masteryEstimate`: mức thành thạo 0–100.
- `retentionEstimate`: khả năng còn nhớ 0–1.
- `stabilityDays`: khoảng cách ôn dự kiến.
- `nextReviewAt`: thời điểm kiểm chứng tiếp theo.
- `consecutiveCorrect` và `consecutiveWrong`.
- `evidenceConfidence` và `explanation`.
- `modelVersion: adaptive-local-v1`.

Mô hình dùng cập nhật xác suất có trọng số. Posterior mới được trộn với mức trước đó để một lần đúng hoặc sai không làm hồ sơ dao động cực đoan. Thuật toán có thể giải thích, chạy offline và không cần GPU.

## Thẻ vá lỗi

Thẻ vá lỗi có:

- Nhóm lỗi và độ tin cậy.
- Cách vá cụ thể.
- Thời gian ước tính.
- Có làm offline được không.
- Điều kiện hoàn thành.
- Kỹ năng đích và lịch kiểm chứng.

## Ba nhiệm vụ sau phiên

Ứng dụng chọn tối đa một nhiệm vụ cho mỗi loại:

1. `REPAIR`: vá lỗi nổi bật vừa phát hiện.
2. `STRENGTHEN`: củng cố kỹ năng có mastery thấp nhất.
3. `VERIFY`: kiểm chứng kiến thức đến hạn hoặc sắp quên.

## Tương thích dữ liệu

Database giữ tên `dia8dragon-learning-evidence`, nâng version từ 1 lên 2 để bổ sung index. Chín object store cũ được giữ nguyên, vì vậy dữ liệu 3.2.1 được nâng cấp tại chỗ.
