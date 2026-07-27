# Biên bản chuyển hệ thống thị giác Dia8 sang Dia8Dragon 2.8

## Nguồn đối chiếu

- Repository: `duanaithcs-cloud/dia8olympiad`
- Commit: `4e4b2aa54315f93c0139e7dd0a2b226a11aa7c6c`
- Các file nguồn được đọc trực tiếp:
  - `types.ts`
  - `App.tsx`
  - `data.ts`
  - `components/BubbleCanvas.tsx`
  - `components/CanvasOptionsDialog.tsx`
  - `index.html`

## Giá trị chuyển nguyên bản

| Thành phần | Dia8 nguồn | Dia8Dragon 2.8 |
|---|---|---|
| Theme mặc định | ZALO | D8_ZALO |
| Zalo | `#0d33f2` | `#0d33f2` |
| Neon | `topic.color` | `topic.color` |
| Bảng màu nhóm | `#00f5ff`, `#6366f1`, `#00d1ff`, `#00ff88`, `#3357ff` | preset `D8_GROUPS` |
| Aurora | `#00ffcc` | `#00ffcc` |
| Sunset | `#ff4d4d` | `#ff4d4d` |
| Dark | `#333333` | `#333333` |
| Glow mặc định | 55 | 55 |
| Saturation mặc định | 65 | 65 |
| Breath mặc định | 5 | 5 |
| Drift mặc định | 20 | 20 |
| Repulsion mặc định | 80 | 80 |
| Cỡ chữ mặc định | 13 px | 13 px |
| Nhịp thở | 3 giây, ease-in-out | 3 giây, ease-in-out |

## Neon và lõi bong bóng

Dia8 dùng ba lớp shadow:

- `0 0 15px -2px`
- `0 0 40px -8px`
- `inset 0 0 12px`

Lõi dùng hai radial gradient: phản quang trắng ở 30%/30%, sau đó màu theme chuyển về đen 0.9. Các giá trị này được đặt trong lớp `.bubble-visual-dia8` để không làm thay đổi các preset Dia8.

## Phần giữ lại từ Dia8

- Icon SVG local theo chuyên đề.
- Vương miện sao SVG.
- Full-width Topic Workspace.
- Reading Cockpit.
- Tài liệu HSG DOCX.
- Google Drive Lite.
- UI Mobile/Desktop và ngày/đêm.

Không sử dụng lại Material Symbols cho icon bên trong bong bóng, nhằm tránh lỗi hiện chữ `map`, `bar_chart`, `sailing` khi font mạng không tải được.

Dia8 nguyên bản không dùng lớp halo độc lập, shimmer hoặc ripple. Bản 2.8 tự tắt ba lớp này khi chọn preset Dia8 để giữ đúng diện mạo nguồn; các preset Dia8 vẫn giữ đầy đủ hiệu ứng riêng.
