# Dia8Dragon

Ung dung hoc Dia li 8 local-first, duoc nang cap theo khung Dia9Dragon va dung hoc lieu C1-C4 da nap vao 33 bong bong chuyen de.

## Chay local

Yeu cau Node.js 20 tro len.

```bash
npm install
npm run dev
```

Mac dinh Vite chay o:

```text
http://127.0.0.1:3001/
```

## Kiem tra truoc khi day GitHub/Vercel

```bash
npm run check:quality
```

Lenh nay se kiem tra du lieu runtime va build production. Rieng kiem tra du lieu:

```bash
npm run check:runtime-data
```

`check:runtime-data` xac nhan:

- Co 33 file hoc lieu topic.
- Co 33 file quiz topic.
- Ngan hang cau hoi accepted duoc tao tu C1-C4.
- Du cac dang `MCQ`, `TF`, `FILL`, co cau ghep noi `MATCHING`.
- Khong lan cau hoi on tap vao file kien thuc trong tam.

## Deploy Vercel

Repo da co `vercel.json`, Vercel se tu nhan cau hinh chinh:

- Framework preset: `Vite`.
- Install command: `npm ci --no-audit --no-fund --prefer-online`.
- Build command: `npm run build`.
- Output directory: `dist`.

Neu dung Gemini noi bo qua `/api/gemini`, dat bien moi truong trong Vercel Project Settings:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` neu muon doi model.

Bien tuy chon cho giao vien/cloud:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DIA8_TEACHER_SYNC_KEY`
- `DIA8_WORKSPACE_ID`
- `DIA8_ALLOWED_ORIGIN`

Khong commit `.env`, `.env.local` hoac thu muc `.vercel`.

## GitHub quality gate

Repo da co GitHub Actions tai:

```text
.github/workflows/quality-gate.yml
```

Workflow nay chay `npm ci` va `npm run check:quality` khi push len `main` hoac tao pull request.

## Dong goi gui hoc sinh/giao vien

```bash
npm run package:handoff
```

Zip duoc tao tai:

```text
release/dia8dragon-handoff.zip
```

Goi handoff co san `dist`, `START_APP.bat` va `STOP_APP.bat`, dung duoc khi giai nen tren Windows.
