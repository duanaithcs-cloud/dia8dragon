import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const releaseDir = join(root, 'release');
const packageDir = join(releaseDir, 'dia8dragon-handoff');
const stagingRoot = join(releaseDir, '.handoff-staging');
const stagingPackageDir = join(stagingRoot, 'dia8dragon-handoff');
const zipPath = join(releaseDir, 'dia8dragon-handoff.zip');

const include = [
  'api',
  '.github',
  'components',
  'core',
  'docs',
  'google-drive-lite',
  'hooks',
  'packaging',
  'public',
  'scripts',
  'services',
  'supabase',
  'utils',
  'dist',
  'App.tsx',
  'data.ts',
  'index.html',
  'index.tsx',
  'metadata.json',
  'package.json',
  'package-lock.json',
  'README.md',
  'tsconfig.json',
  'types.ts',
  'vite.config.ts',
  'vercel.json',
  '.gitignore',
  '.env.example',
  'START_APP.bat',
  'STOP_APP.bat'
];

const run = (command, args) => {
  let executable = command;
  let finalArgs = args;

  if (command === 'npm' && process.env.npm_execpath) {
    executable = process.execPath;
    finalArgs = [process.env.npm_execpath, ...args];
  } else if (process.platform === 'win32' && command === 'powershell') {
    executable = 'powershell.exe';
  }

  const result = spawnSync(executable, finalArgs, { cwd: root, stdio: 'inherit' });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

run('npm', ['run', 'check:runtime-data']);
run('npm', ['run', 'build']);

mkdirSync(releaseDir, { recursive: true });

let activePackageDir = packageDir;
try {
  rmSync(packageDir, { recursive: true, force: true });
} catch (error) {
  console.warn(`Handoff folder is locked by Windows, using clean staging folder: ${stagingPackageDir}`);
  activePackageDir = stagingPackageDir;
}

rmSync(stagingRoot, { recursive: true, force: true });
mkdirSync(activePackageDir, { recursive: true });

for (const item of include) {
  const source = join(root, item);
  if (existsSync(source)) {
    cpSync(source, join(activePackageDir, item), { recursive: true });
  }
}

writeFileSync(
  join(activePackageDir, 'START_HERE.txt'),
  `DIA8DRAGON HANDOFF - PVT-THCSHH

HUONG DAN NHANH CHO GIAO VIEN / HOC SINH

1. Giai nen file zip ra mot thu muc rieng.
2. Bam dup START_APP.bat de mo app.
3. App se tu mo trinh duyet bang dia chi dang chay thuc te.
4. Neu cong 3000 ban, app tu chon cong tiep theo, vi du 3001.
5. Muon tat app: bam dup STOP_APP.bat hoac dong cua so server.

Developer run:
1. Install Node.js LTS.
2. Run npm install.
3. Run npm run check:runtime-data.
4. Run npm run dev.
5. Open http://127.0.0.1:3001/.

GitHub / Vercel:
1. Do not commit node_modules, dist, release, .env, .env.local or .vercel.
2. Vercel framework preset: Vite.
3. Build command: npm run build.
4. Output directory: dist.
5. Optional Gemini serverless endpoint uses GEMINI_API_KEY.

Gemini:
1. Without an API key, use each bubble's manual Gemini Pro prompt workflow.
2. With an API key, copy .env.example to .env.local and set GEMINI_API_KEY.

LUU Y

- Goi nay da co san ban dist, nguoi dung chi can bam START_APP.bat.
- Khung tinh nang duoc port tu Dia9Dragon.
- Noi dung hien tai chi dung hoc lieu Dia 8 C1-C4 da gui, khong tron du lieu ngoai.
- public/manifest.webmanifest va public/sw.js da san sang cho Vercel/PWA.
`,
  'utf8'
);

rmSync(zipPath, { force: true });
mkdirSync(releaseDir, { recursive: true });

if (process.platform === 'win32') {
  run('powershell', ['-NoProfile', '-Command', `Compress-Archive -LiteralPath "${activePackageDir}" -DestinationPath "${zipPath}" -Force`]);
} else {
  run('zip', ['-r', zipPath, activePackageDir]);
}

if (activePackageDir !== packageDir) {
  console.warn(`Zip was created from staging because this folder is locked: ${packageDir}`);
}

console.log(`Created ${zipPath}`);
