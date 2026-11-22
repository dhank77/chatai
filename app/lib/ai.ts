import OpenAI from 'openai';

/**
 * Central AI client — SuperVibeCode (OpenAI-compatible gateway).
 * Docs: https://app.supervibecode.ai.id
 *
 * Env:
 *   SUPERVIBECODE_API_KEY   (required, server-side only)
 *   SUPERVIBECODE_BASE_URL  (default https://app.supervibecode.ai.id/v1)
 *   AI_CHAT_MODEL           (default gpt-4o-mini)
 *   AI_EMBEDDING_MODEL      (default text-embedding-3-small — 1536 dims, matches the pgvector schema)
 */
export const AI_BASE_URL =
  process.env.SUPERVIBECODE_BASE_URL || 'https://app.supervibecode.ai.id/v1';

const AI_API_KEY =
  process.env.SUPERVIBECODE_API_KEY || process.env.OPENAI_API_KEY || '';

export const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || 'gpt-4o-mini';
export const AI_EMBEDDING_MODEL = process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small';

if (!AI_API_KEY) {
  console.warn('[ai] SUPERVIBECODE_API_KEY belum di-set — semua panggilan AI akan gagal (401).');
}

export const ai = new OpenAI({
  baseURL: AI_BASE_URL,
  apiKey: AI_API_KEY || 'missing-key',
  timeout: 60_000,
  maxRetries: 2,
});

export async function createEmbedding(text: string): Promise<number[]> {
  const [embedding] = await createEmbeddings([text]);
  return embedding;
}

/** Embeds many texts, batching requests to keep payloads small. */
export async function createEmbeddings(texts: string[], batchSize = 64): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) => t.replace(/\s+/g, ' ').trim() || ' ');
    const res = await ai.embeddings.create({
      model: AI_EMBEDDING_MODEL,
      input: batch,
      encoding_format: 'float',
    });
    const sorted = [...res.data].sort((a, b) => a.index - b.index);
    out.push(...sorted.map((d) => d.embedding as number[]));
  }
  return out;
}

/** Maps SuperVibeCode error codes to a user-facing Indonesian message. */
export function describeAIError(error: unknown): string {
  const status = (error as { status?: number })?.status;
  switch (status) {
    case 400:
      return 'Request ke AI tidak valid.';
    case 401:
      return 'API key SuperVibeCode tidak ada, salah, atau sudah dicabut.';
    case 402:
      return 'Saldo SuperVibeCode habis atau batas kredit API key tercapai.';
    case 403:
      return `API key tidak diizinkan memakai model ini (${AI_CHAT_MODEL}).`;
    case 404:
      return 'Model AI tidak ditemukan. Periksa AI_CHAT_MODEL / AI_EMBEDDING_MODEL.';
    case 429:
      return 'Terlalu banyak permintaan. Coba lagi sebentar.';
    case 502:
      return 'Provider AI sedang bermasalah. Coba lagi nanti.';
  }
  if (error instanceof Error && /fetch|network|ECONN|timed out/i.test(error.message)) {
    return 'Gagal terhubung ke server AI.';
  }
  return 'Terjadi kesalahan pada layanan AI.';
}
