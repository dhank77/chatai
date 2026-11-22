/**
 * Production server (cPanel / Passenger / VPS).
 * - Loads .env from this folder (real environment variables win)
 * - Serves static assets from build/client and everything else via React Router
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).replace(/^export\s+/, '').trim();
    let value = line.slice(eq + 1).trim();
    if (/^(['"]).*\1$/.test(value)) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, ''); // strip inline comments
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// NODE_ENV comes only from the real environment (cPanel sets it from "Application mode");
// a leftover NODE_ENV=development in .env must not switch production into dev mode.
const realNodeEnv = process.env.NODE_ENV;
loadEnvFile(path.join(ROOT, '.env'));
process.env.NODE_ENV = realNodeEnv || 'production';

const { default: express } = await import('express');
const { default: compression } = await import('compression');
const { createRequestHandler } = await import('@react-router/express');

const buildPath = path.join(ROOT, 'build/server/index.js');
if (!fs.existsSync(buildPath)) {
  console.error(`[server] Build tidak ditemukan di ${buildPath}. Jalankan "npm run build" dulu.`);
  process.exit(1);
}
const build = await import(buildPath);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(compression());

// Fingerprinted assets can be cached forever
app.use('/assets', express.static(path.join(ROOT, 'build/client/assets'), { immutable: true, maxAge: '1y' }));
// Other public files (chatbot.js, favicon...) — short cache, CORS for the embeddable widget
app.use(
  express.static(path.join(ROOT, 'build/client'), {
    maxAge: '1h',
    setHeaders(res, filePath) {
      if (filePath.endsWith('chatbot.js')) res.setHeader('Access-Control-Allow-Origin', '*');
    },
  })
);

app.all('*', createRequestHandler({ build, mode: process.env.NODE_ENV }));

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`[server] ChatAI berjalan di port ${port} (${process.env.NODE_ENV})`);
});
