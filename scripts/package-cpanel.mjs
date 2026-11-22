#!/usr/bin/env node
/**
 * Builds a ready-to-upload cPanel package:  release/chatai-cpanel.tar.gz
 *
 * tar.gz instead of zip: cPanel's ClamAV (Sanesecurity Foxhole "JS_Zip" rules) rejects any
 * .zip that contains .js files as a false positive. File Manager extracts .tar.gz the same way.
 *
 *   npm run package:cpanel                 # without your .env (fill it on the server)
 *   npm run package:cpanel -- --with-env   # includes your local .env (keep the archive private!)
 *
 * The archive has no node_modules on purpose: cPanel's Node.js selector installs them itself
 * via the "Run NPM Install" button and refuses apps that ship their own node_modules folder.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RELEASE = path.join(ROOT, 'release');
const STAGE = path.join(RELEASE, 'chatai');
const ARCHIVE = path.join(RELEASE, 'chatai-cpanel.tar.gz');
const withEnv = process.argv.includes('--with-env');

const run = (cmd, cwd = ROOT) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
};
const copy = (rel, dest = rel) => {
  const from = path.join(ROOT, rel);
  if (!fs.existsSync(from)) throw new Error(`File tidak ditemukan: ${rel}`);
  fs.cpSync(from, path.join(STAGE, dest), { recursive: true });
};

console.log('▶ 1/4 Build widget (public/chatbot.js)');
run('npm run build:widget');

console.log('\n▶ 2/4 Build aplikasi');
fs.rmSync(path.join(ROOT, 'build'), { recursive: true, force: true });
run('npm run build');

console.log('\n▶ 3/4 Menyiapkan folder release/chatai');
fs.rmSync(RELEASE, { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });

for (const f of ['build', 'server.mjs', 'app.cjs', 'app.mjs', 'supabase-schema.sql', '.env.example', 'INSTALL-CPANEL.md']) copy(f);

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const prodPkg = {
  name: pkg.name,
  private: true,
  type: pkg.type,
  engines: pkg.engines,
  scripts: { start: 'node server.mjs' },
  dependencies: pkg.dependencies,
};
fs.writeFileSync(path.join(STAGE, 'package.json'), JSON.stringify(prodPkg, null, 2) + '\n');

// Lockfile pinned to the exact versions tested locally, pruned to production deps
fs.copyFileSync(path.join(ROOT, 'package-lock.json'), path.join(STAGE, 'package-lock.json'));
run('npm install --package-lock-only --ignore-scripts --no-audit --no-fund', STAGE);

if (withEnv) {
  if (!fs.existsSync(path.join(ROOT, '.env'))) throw new Error('--with-env dipakai, tapi file .env tidak ada.');
  copy('.env');
  console.log('  ⚠ .env ikut dikemas — JANGAN bagikan arsip ini ke orang lain.');
}

console.log('\n▶ 4/4 Membuat arsip .tar.gz');
fs.rmSync(ARCHIVE, { force: true });
// COPYFILE_DISABLE stops macOS tar from adding ._* AppleDouble files
execSync(`tar --exclude=".DS_Store" -czf "${ARCHIVE}" -C "${STAGE}" .`, {
  stdio: 'inherit',
  env: { ...process.env, COPYFILE_DISABLE: '1' },
});

const sizeMb = (fs.statSync(ARCHIVE).size / 1024 / 1024).toFixed(1);
console.log(`
✅ Selesai: release/chatai-cpanel.tar.gz (${sizeMb} MB)

Langkah berikutnya ada di INSTALL-CPANEL.md:
  1. Upload & extract chatai-cpanel.tar.gz di cPanel (mis. ke folder chatai)
  2. ${withEnv ? '.env sudah ikut di dalam arsip' : 'Salin .env.example → .env lalu isi nilainya'}
  3. Setup Node.js App → startup file: app.cjs → Run NPM Install → Restart
  4. Buka https://domain-kamu/setup untuk cek semuanya hijau
`);
