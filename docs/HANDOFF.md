# Dia8Dragon Handoff

## Chạy Local

```bash
npm install
npm run dev
```

Mở `http://127.0.0.1:3001/`.

## Dùng Gemini Pro Không Cần API Key

1. Mở một bong bóng chuyên đề.
2. Chọn `Prompt AI`.
3. Copy prompt sang `https://gemini.google.com/app`.
4. Dán JSON Gemini trả về vào app.
5. Bấm nạp đề và luyện.

## Dùng Gemini Tự Động

Tạo `.env.local` từ `.env.example`:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-pro
```

Sau đó chạy lại `npm run dev`.

## Đóng Gói Chuyển Giao

```bash
npm run package:handoff
```

File zip nằm ở `release/dia8dragon-handoff.zip`.
