# Deploy GitHub / Vercel - Dia8Dragon

## Repo readiness

- Commit source files, `public/`, `api/`, `components/`, `core/`, `hooks/`, `services/`, `utils/`, `docs/`, `scripts/`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `index.tsx`, `App.tsx`, `data.ts`.
- Do not commit `node_modules/`, `dist/`, `release/`, `.env`, `.env.local`, `.vercel/`, or local audit screenshots.
- Keep `public/manifest.webmanifest` and `public/sw.js`; these provide the same PWA/offline layer as Dia9Dragon.

## Local gate before push

```bash
npm install
npm run check:quality
```

## Vercel settings

- Framework preset: Vite
- Install command: `npm ci --no-audit --no-fund --prefer-online`
- Build command: `npm run build`
- Output directory: `dist`

## Environment variables

Required only when using Gemini/server-side AI:

```text
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-pro
```

Optional classroom/cloud variables:

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DIA8_TEACHER_SYNC_KEY=
DIA8_WORKSPACE_ID=dia8dragon-primary
DIA8_ALLOWED_ORIGIN=https://dia8dragon.vercel.app
```

## After deployment

Open these paths in the production deployment:

```text
/
/manifest.webmanifest
/sw.js
/data/topics/manifest.json
/data/quiz/topics/manifest.json
/documents/learning-library/catalog.json
```
