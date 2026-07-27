# Kiểm kê Bước 1 — Dia8Dragon 3.2.0

## Kết luận

Bản 3.1.2 có nền tảng chức năng tốt và đã lazy-load phần lớn màn hình, nhưng dữ liệu học tập bị đóng gói lặp trong JavaScript và Service Worker precache toàn bộ DOCX. Bản 3.2.0 xử lý các điểm nghẽn có rủi ro thấp trước khi phát triển Learning Evidence Engine.

## Phân loại mã nguồn

### Đang sử dụng

- `App.tsx`, `components/*`, `services/*`, `utils/*`, `api/*`.
- 20 gói học liệu trong `public/data/topics`.
- Ngân hàng 499 câu accepted trong `public/data/quiz-bank.json`.
- Quiz, Arena, Bài giao, Tài liệu, Teacher Dashboard và các script QA đang nằm trong quality gate.
- Toàn bộ ảnh infographic, ảnh học liệu và 5 hình nền hiện đều có tham chiếu trong mã hoặc catalog.

### Đã tách trách nhiệm

- Khởi tạo và migration state: `core/createInitialAppState.ts`.
- Mặc định giao diện và chuẩn hóa theme: `core/appDefaults.ts`.
- Ghép tiến độ cũ vào catalog mới: `core/topicState.ts`.
- Tính điểm và xếp hạng Quiz: `core/quizScoring.ts`.
- Lưu localStorage/sao lưu định kỳ: `hooks/useAppPersistence.ts`.
- Đồng bộ preference ra document root: `hooks/useDocumentPreferences.ts`.
- Cache JSON trong bộ nhớ phiên: `services/runtimeDataService.ts`.

### Đã chuyển sang lazy-load theo nhu cầu

- Nội dung dài của từng chuyên đề: `/data/topics/topic-XX.json`.
- Quiz accepted: `/data/quiz/topics/topic-XX.json`.
- PDF và DOCX: tải khi người dùng mở; không còn nằm trong precache.
- Hình ảnh chuyên đề/game: cache khi được yêu cầu, có giới hạn số mục.

### Đã lỗi thời hoặc trùng lặp và đã loại bỏ

- `data.ts` không còn nhúng lại 864.103 ký tự học liệu và các quiz mẫu.
- Điều kiện phục hồi `offline_quiz` trong `App.tsx` đã bỏ, tránh vòng cập nhật catalog liên tục khi dữ liệu quiz chuyển ra file runtime.
- Service Worker không còn danh sách 10 DOCX trong app shell.
- Một selector `.primary-navigation-short{display:none}` trùng hoàn toàn đã được bỏ.
- Mã câu trùng `HSG8-T10-TN035` được sửa thành `HSG8-T10-TN035B`; đủ 499 câu và 499 mã duy nhất.

### Chưa xóa vì chưa đủ bằng chứng an toàn

- Không xóa asset học liệu hoặc ảnh game vì đều có tham chiếu trực tiếp hoặc qua catalog JSON.
- Không loại các QA script cũ: chúng vẫn kiểm tra các hồi quy chức năng riêng và đều đang được gọi qua npm scripts.
- Không xóa PDF SGK 52 MB khỏi repository vì Tài liệu vẫn sử dụng; thay vào đó PDF không được precache và không được giữ nếu vượt ngân sách cache.

## Số liệu trước và sau

| Chỉ số | 3.1.2 | 3.2.0 | Thay đổi |
|---|---:|---:|---:|
| `data.ts` raw | 1,236,638 B | 24,852 B | -98.0% |
| `data.ts` gzip độc lập | 284,175 B | 7,974 B | -97.2% |
| `App.tsx` | 44,271 B / 750 dòng | 38,181 B / 600 dòng | -13.8% dung lượng |
| Gói quiz runtime | 1 file 499 câu | 20 file, trung bình 60,198 B | tải theo chuyên đề |
| DOCX precache | 10 file | 0 file | tải theo yêu cầu |
| Cache PWA | 1 cache không giới hạn | 4 cache có quota | shell/quiz/docs/images |
| CSS `!important` | 908 | 908 | giữ nguyên để không phá override mobile |

## Đánh giá quality gate

- Không đổi key hoặc schema `AppState`/localStorage.
- 499/499 câu accepted được bảo toàn; mã câu duy nhất.
- Quiz, mobile navigation, adaptive UI, essay contrast, workspace contrast và Arena đều vượt quality gate hiện có.
- CSS parse, JSON parse, HTML parse và cú pháp TypeScript đều đạt.
- Production build chưa chạy trong sandbox do npm registry trả HTTP 503 khi tải `yallist-3.1.1.tgz`; đây là lỗi hạ tầng phụ thuộc, không phải lỗi source. Vercel/GitHub Actions cần chạy lại `npm ci && npm run build`.
