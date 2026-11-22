import { lookup } from 'node:dns/promises';
import { supabase } from './supabase';
import { ai, AI_BASE_URL, AI_CHAT_MODEL, AI_EMBEDDING_MODEL, describeAIError } from './ai';

export interface SetupCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  /** How to fix it, shown only when the check fails. */
  hint?: string;
}

export interface SetupReport {
  ok: boolean;
  checkedAt: string;
  checks: SetupCheck[];
}

const TABLES = ['clients', 'widget_configs', 'knowledge_base', 'knowledge_base_chunks', 'chat_sessions'];
const CACHE_MS = 5 * 60 * 1000;
let cached: { at: number; report: SetupReport } | null = null;

const isSet = (v?: string) => !!v && !/^(your_|sk-\.\.\.$)/.test(v.trim());

/** "HTTP 404 · app.supervibecode.ai.id → 1.2.3.4" — shows where the server actually connects. */
async function aiDiagnostics(error: unknown): Promise<string> {
  const host = new URL(AI_BASE_URL).hostname;
  const status = (error as { status?: number })?.status;
  let ip = '?';
  try {
    ip = (await lookup(host)).address;
  } catch {
    ip = 'DNS gagal';
  }
  // Provider's own message (never contains the key), trimmed for display
  const raw = error instanceof Error ? error.message.replace(/sk-[A-Za-z0-9_-]+/g, 'sk-***').slice(0, 160) : '';
  return `${describeAIError(error)} (${status ? `HTTP ${status}` : 'tanpa respons'} · ${AI_BASE_URL} → ${ip})${raw ? ` — ${raw}` : ''}`;
}

async function checkAI(): Promise<SetupCheck[]> {
  if (!isSet(process.env.SUPERVIBECODE_API_KEY) && !isSet(process.env.OPENAI_API_KEY)) {
    return [{
      id: 'ai-key',
      label: 'API key SuperVibeCode',
      ok: false,
      detail: 'SUPERVIBECODE_API_KEY belum diisi.',
      hint: 'Buat key di https://app.supervibecode.ai.id/keys lalu isi SUPERVIBECODE_API_KEY di file .env.',
    }];
  }

  const checks: SetupCheck[] = [{ id: 'ai-key', label: 'API key SuperVibeCode', ok: true, detail: 'Terisi.' }];

  try {
    const res = await ai.embeddings.create({ model: AI_EMBEDDING_MODEL, input: 'cek' });
    const dims = res.data[0]?.embedding.length ?? 0;
    checks.push({
      id: 'ai-embedding',
      label: `Embedding (${AI_EMBEDDING_MODEL})`,
      ok: dims === 1536,
      detail: dims === 1536 ? 'Berfungsi, 1536 dimensi.' : `Dimensi ${dims}, database butuh 1536.`,
      hint: dims === 1536 ? undefined : 'Gunakan AI_EMBEDDING_MODEL=text-embedding-3-small.',
    });
  } catch (error) {
    checks.push({
      id: 'ai-embedding',
      label: `Embedding (${AI_EMBEDDING_MODEL})`,
      ok: false,
      detail: await aiDiagnostics(error),
      hint: `Periksa key, saldo, dan izin model di ${AI_BASE_URL.replace(/\/v1$/, '')}. Jika HTTP 404 padahal model ada, server ini kemungkinan me-resolve ${new URL(AI_BASE_URL).hostname} ke IP yang salah (cek Zone Editor cPanel).`,
    });
  }

  try {
    await ai.chat.completions.create({
      model: AI_CHAT_MODEL,
      messages: [{ role: 'user', content: 'Balas: ok' }],
      max_tokens: 5,
    });
    checks.push({ id: 'ai-chat', label: `Model chat (${AI_CHAT_MODEL})`, ok: true, detail: 'Berfungsi.' });
  } catch (error) {
    checks.push({
      id: 'ai-chat',
      label: `Model chat (${AI_CHAT_MODEL})`,
      ok: false,
      detail: await aiDiagnostics(error),
      hint: 'Periksa AI_CHAT_MODEL (daftar model: https://app.supervibecode.ai.id/models) dan izin model pada API key.',
    });
  }

  return checks;
}

async function checkDatabase(): Promise<SetupCheck[]> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!isSet(url) || !isSet(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return [{
      id: 'db-env',
      label: 'Konfigurasi Supabase',
      ok: false,
      detail: 'SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi.',
      hint: 'Ambil dari Supabase → Project Settings → API, lalu isi di file .env.',
    }];
  }

  const checks: SetupCheck[] = [{ id: 'db-env', label: 'Konfigurasi Supabase', ok: true, detail: 'Terisi.' }];

  const tableResults = await Promise.all(
    TABLES.map(async (t) => {
      const { error } = await supabase.from(t).select('*', { count: 'exact', head: true });
      return { t, error: error?.message || (error ? 'error' : '') };
    })
  );
  const failed = tableResults.filter((r) => r.error);
  checks.push({
    id: 'db-tables',
    label: 'Tabel database',
    ok: failed.length === 0,
    detail: failed.length === 0
      ? `${TABLES.length} tabel bisa diakses.`
      : `Bermasalah: ${failed.map((f) => `${f.t} (${f.error})`).join(', ')}`,
    hint: 'Jalankan seluruh isi supabase-schema.sql di Supabase → SQL Editor.',
  });

  const { error: rpcError } = await supabase.rpc('search_knowledge_base_chunks', {
    target_client_id: '__setup_check__',
    query_embedding: new Array(1536).fill(0.01),
    match_threshold: 0.3,
    match_count: 1,
  });
  checks.push({
    id: 'db-search',
    label: 'Fungsi pencarian knowledge base',
    ok: !rpcError,
    detail: rpcError ? rpcError.message : 'Berfungsi.',
    hint: 'Jalankan ulang supabase-schema.sql (aman dijalankan berkali-kali).',
  });

  return checks;
}

function checkSecrets(): SetupCheck[] {
  const secret = process.env.JWT_SECRET || '';
  const ok = secret.length >= 32 && !/^your_|your-secret/.test(secret);
  return [{
    id: 'jwt',
    label: 'JWT_SECRET',
    ok,
    detail: ok ? 'Terisi dan cukup panjang.' : 'Kosong, masih contoh, atau kurang dari 32 karakter.',
    hint: 'Isi JWT_SECRET dengan teks acak panjang (mis. hasil: openssl rand -hex 32).',
  }];
}

export async function runSetupChecks(force = false): Promise<SetupReport> {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) return cached.report;

  const [ai, db] = await Promise.all([checkAI(), checkDatabase()]);
  const checks = [...checkSecrets(), ...db, ...ai].map((c) => (c.ok ? { ...c, hint: undefined } : c));
  const report: SetupReport = { ok: checks.every((c) => c.ok), checkedAt: new Date().toISOString(), checks };
  // Only cache a fully green report, so a fix shows up immediately on reload
  cached = report.ok ? { at: Date.now(), report } : null;
  return report;
}
