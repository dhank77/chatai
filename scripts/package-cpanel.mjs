#!/usr/bin/env node
/**
 * Builds a ready-to-upload cPanel package:  release/chatai-cpanel.zip
 *
 *   npm run package:cpanel                 # without your .env (fill it on the server)
 *   npm run package:cpanel -- --with-env   # includes your local .env (keep the zip private!)
 *
 * The zip has no node_modules on purpose: cPanel's Node.js selector installs them itself
 * via the "Run NPM Install" button and refuses apps that ship their own node_modules folder.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RELEASE = path.join(ROOT, 'release');
const STAGE = path.join(RELEASE, 'chatai');
const ZIP = path.join(RELEASE, 'chatai-cpanel.zip');
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

for (const f of ['build', 'server.mjs', 'app.cjs', 'supabase-schema.sql', '.env.example', 'INSTALL-CPANEL.md']) copy(f);

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
  console.log('  ⚠ .env ikut dikemas — JANGAN bagikan zip ini ke orang lain.');
}

console.log('\n▶ 4/4 Membuat zip');
fs.rmSync(ZIP, { force: true });
run(`zip -qr "${ZIP}" . -x "*.DS_Store"`, STAGE);

const sizeMb = (fs.statSync(ZIP).size / 1024 / 1024).toFixed(1);
console.log(`
✅ Selesai: release/chatai-cpanel.zip (${sizeMb} MB)

Langkah berikutnya ada di INSTALL-CPANEL.md:
  1. Upload & extract zip di cPanel (mis. ke folder chatai)
  2. ${withEnv ? '.env sudah ikut di dalam zip' : 'Salin .env.example → .env lalu isi nilainya'}
  3. Setup Node.js App → startup file: app.cjs → Run NPM Install → Restart
  4. Buka https://domain-kamu/setup untuk cek semuanya hijau
`);
