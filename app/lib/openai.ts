import type OpenAI from 'openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { supabase } from './supabase';
import {
  ai,
  AI_CHAT_MODEL,
  createEmbedding,
  createEmbeddings,
  describeAIError,
} from './ai';

// Minimum cosine similarity for a chunk to count as relevant.
// text-embedding-3-small scores rarely exceed ~0.6, so 0.7 (old value) filtered out almost everything.
const MATCH_THRESHOLD = Number(process.env.AI_MATCH_THRESHOLD ?? 0.3);
const MAX_HISTORY_MESSAGES = 10;

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', ' ', ''],
});

export type ChatHistoryMessage = { role: 'user' | 'assistant'; content: string };

export interface ChatOptions {
  history?: ChatHistoryMessage[];
  /** Custom instructions from the widget configuration. */
  systemPrompt?: string | null;
}

export interface EmbeddingResult {
  success: boolean;
  embedding?: number[];
  error?: string;
}

export interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
}

export interface StreamChatResponse {
  success: boolean;
  stream?: ReadableStream<Uint8Array>;
  error?: string;
}

export interface SearchResult {
  content: string;
  filename: string;
  similarity: number;
}

// ---------------------------------------------------------------------------
// Embeddings & knowledge base
// ---------------------------------------------------------------------------

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    return { success: true, embedding: await createEmbedding(text) };
  } catch (error) {
    console.error('Error generating embedding:', error);
    return { success: false, error: describeAIError(error) };
  }
}

export async function storeDocument(
  clientId: string,
  filename: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const docs = await textSplitter.createDocuments([content]);
    const chunks = docs.map((d) => d.pageContent).filter((c) => c.trim().length > 0);
    if (chunks.length === 0) {
      return { success: false, error: 'Dokumen tidak mengandung teks yang dapat diproses' };
    }

    // Embed everything before touching the DB so a failed AI call leaves no half-saved doc.
    const [docEmbedding, ...chunkEmbeddings] = await createEmbeddings([
      content.substring(0, 1000),
      ...chunks,
    ]);

    const { data: document, error: documentError } = await supabase
      .from('knowledge_base')
      .insert({ client_id: clientId, filename, content, embedding: docEmbedding })
      .select('id')
      .single();

    if (documentError || !document) throw documentError ?? new Error('Insert dokumen gagal');

    const { error: chunksError } = await supabase.from('knowledge_base_chunks').insert(
      chunks.map((chunk, index) => ({
        document_id: document.id,
        client_id: clientId,
        content: chunk,
        chunk_index: index,
        embedding: chunkEmbeddings[index],
      }))
    );

    if (chunksError) {
      await supabase.from('knowledge_base').delete().eq('id', document.id);
      throw chunksError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error storing document:', error);
    const isAIError = typeof (error as { status?: number })?.status === 'number';
    return {
      success: false,
      error: isAIError ? describeAIError(error) : 'Gagal menyimpan dokumen',
    };
  }
}

export async function searchKnowledgeBase(
  clientId: string,
  query: string,
  limit: number = 5
): Promise<SearchResult[]> {
  try {
    const queryEmbedding = await createEmbedding(query);

    // Signature defined in supabase-schema.sql
    const { data, error } = await supabase.rpc('search_knowledge_base_chunks', {
      target_client_id: clientId,
      query_embedding: queryEmbedding,
      match_threshold: MATCH_THRESHOLD,
      match_count: limit,
    });

    if (!error) {
      return (data || []).map((item: any) => ({
        content: item.content,
        filename: item.filename || 'dokumen',
        similarity: item.similarity ?? 0,
      }));
    }

    // Fallback for databases created with the LangChain-style function signature.
    console.warn('search_knowledge_base_chunks (schema signature) failed, trying LangChain signature:', error.message);
    const fallback = await supabase.rpc('search_knowledge_base_chunks', {
      query_embedding: queryEmbedding,
      match_count: limit,
      filter: { client_id: clientId },
    });
    if (fallback.error) {
      console.error('Knowledge base search failed:', fallback.error);
      return [];
    }
    return (fallback.data || []).map((item: any) => ({
      content: item.content,
      filename: item.metadata?.filename || item.filename || 'dokumen',
      similarity: item.similarity ?? 0,
    }));
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return [];
  }
}

/** Kept for backwards compatibility. */
export async function enhancedRAGSearch(
  clientId: string,
  query: string
): Promise<{ context: string; sources: string[] }> {
  const results = await searchKnowledgeBase(clientId, query, 5);
  return {
    context: results.map((r) => r.content).join('\n\n'),
    sources: [...new Set(results.map((r) => r.filename))],
  };
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

function formatContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'Tidak ada konteks yang relevan ditemukan dalam knowledge base.';
  }
  return results.map((r) => `[Sumber: ${r.filename}]\n${r.content}`).join('\n\n---\n\n');
}

async function buildMessages(
  clientId: string,
  userMessage: string,
  options: ChatOptions,
  preloadedResults?: SearchResult[]
): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
  const results = preloadedResults ?? (await searchKnowledgeBase(clientId, userMessage, 4));

  const persona = options.systemPrompt?.trim() || 'Anda adalah asisten AI yang ramah dan membantu.';
  const systemPrompt = `${persona}

Gunakan konteks dari knowledge base berikut untuk menjawab pertanyaan pengguna.

<konteks>
${formatContext(results)}
</konteks>

Instruksi:
- Jawab berdasarkan konteks di atas. Jika informasinya tidak ada di konteks, katakan dengan jujur bahwa Anda tidak memiliki informasi tersebut.
- Jangan mengarang fakta, harga, atau kebijakan yang tidak tercantum.
- Jawab ringkas, jelas, dan sopan. Gunakan bahasa yang sama dengan pengguna (default bahasa Indonesia).
- Sebutkan nama dokumen sumber bila relevan.`;

  const history = (options.history || [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content }));

  return [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];
}

export async function generateChatResponse(
  clientId: string,
  userMessage: string,
  options: ChatOptions = {},
  preloadedResults?: SearchResult[]
): Promise<ChatResponse> {
  try {
    const messages = await buildMessages(clientId, userMessage, options, preloadedResults);
    const completion = await ai.chat.completions.create({
      model: AI_CHAT_MODEL,
      messages,
      max_tokens: 1000,
      temperature: 0.4,
    });

    const response = completion.choices[0]?.message?.content?.trim();
    if (!response) return { success: false, error: 'Tidak ada response dari AI' };
    return { success: true, response };
  } catch (error) {
    console.error('Error generating chat response:', error);
    return { success: false, error: describeAIError(error) };
  }
}

export async function generateStreamChatResponse(
  clientId: string,
  userMessage: string,
  options: ChatOptions = {}
): Promise<StreamChatResponse> {
  try {
    const messages = await buildMessages(clientId, userMessage, options);
    const aiStream = await ai.chat.completions.create({
      model: AI_CHAT_MODEL,
      messages,
      stream: true,
      max_tokens: 1000,
      temperature: 0.4,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of aiStream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) controller.enqueue(encoder.encode(content));
          }
          controller.close();
        } catch (error) {
          console.error('Error while streaming AI response:', error);
          controller.error(error);
        }
      },
      cancel() {
        aiStream.controller.abort();
      },
    });

    return { success: true, stream };
  } catch (error) {
    console.error('Error generating stream chat response:', error);
    return { success: false, error: describeAIError(error) };
  }
}

// ---------------------------------------------------------------------------
// Management
// ---------------------------------------------------------------------------

export async function deleteDocument(
  clientId: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // knowledge_base_chunks rows cascade via document_id FK
    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('client_id', clientId)
      .eq('filename', filename);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { success: false, error: 'Gagal menghapus dokumen' };
  }
}

export async function getKnowledgeBaseStats(clientId: string) {
  try {
    const [{ data: documentsData, error: documentsError }, { count, error: chunksError }] =
      await Promise.all([
        supabase.from('knowledge_base').select('filename').eq('client_id', clientId),
        supabase
          .from('knowledge_base_chunks')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId),
      ]);

    if (documentsError) throw documentsError;
    if (chunksError) throw chunksError;

    const uniqueDocuments = new Set(
      (documentsData || []).map((doc) => doc.filename.split('_chunk_')[0])
    );

    return { totalDocuments: uniqueDocuments.size, totalChunks: count || 0 };
  } catch (error) {
    console.error('Error getting knowledge base stats:', error);
    return { totalDocuments: 0, totalChunks: 0 };
  }
}
