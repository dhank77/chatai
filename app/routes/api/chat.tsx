import { supabase } from '~/lib/supabase';
import {
  generateChatResponse,
  generateStreamChatResponse,
  searchKnowledgeBase,
  type ChatHistoryMessage,
} from '~/lib/openai';
import { createJsonResponse as json } from '~/lib/helpers';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_MESSAGE_LENGTH = 4000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type StoredMessage = ChatHistoryMessage & { timestamp: string };

function stamp(role: StoredMessage['role'], content: string): StoredMessage {
  return { role, content, timestamp: new Date().toISOString() };
}

async function loadSession(sessionId: string | undefined, clientId: string) {
  if (!sessionId || !UUID_RE.test(sessionId)) return null;
  const { data } = await supabase
    .from('chat_sessions')
    .select('id, messages')
    .eq('id', sessionId)
    .eq('client_id', clientId)
    .maybeSingle();
  return data as { id: string; messages: StoredMessage[] | null } | null;
}

/** Appends messages to an existing session, or creates a new one. Returns the session id. */
async function appendToSession(
  session: { id: string; messages: StoredMessage[] | null } | null,
  clientId: string,
  widgetId: string,
  newMessages: StoredMessage[]
): Promise<{ id: string | null; messages: StoredMessage[] }> {
  const messages = [...(session?.messages || []), ...newMessages];

  if (session) {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ messages, updated_at: new Date().toISOString() })
      .eq('id', session.id);
    if (error) console.error('Error updating chat session:', error);
    return { id: session.id, messages };
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ client_id: clientId, widget_id: widgetId, messages })
    .select('id')
    .single();
  if (error) console.error('Error creating chat session:', error);
  return { id: data?.id ?? null, messages };
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return json({ error: 'Body request tidak valid' }, { status: 400 });
    }

    const { sessionId, clientId, widgetId, stream = true } = body as Record<string, any>;
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message || !clientId) {
      return json({ error: 'Message dan clientId harus diisi' }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return json({ error: `Pesan terlalu panjang (maks ${MAX_MESSAGE_LENGTH} karakter)` }, { status: 400 });
    }

    // Widget configuration: by id if given, otherwise the client's first active widget
    let widgetQuery = supabase
      .from('widget_configs')
      .select('id, system_prompt, is_active')
      .eq('client_id', clientId);
    widgetQuery = widgetId && UUID_RE.test(widgetId)
      ? widgetQuery.eq('id', widgetId)
      : widgetQuery.eq('is_active', true).order('created_at', { ascending: true }).limit(1);

    const { data: widgetConfig, error: widgetError } = await widgetQuery.maybeSingle();

    if (widgetError || !widgetConfig) {
      return json({ error: 'Widget configuration tidak ditemukan' }, { status: 404 });
    }
    if (widgetConfig.is_active === false) {
      return json({ error: 'Widget sedang tidak aktif' }, { status: 403 });
    }

    const session = await loadSession(sessionId, clientId);
    const history: ChatHistoryMessage[] = (session?.messages || []).map(({ role, content }) => ({
      role,
      content,
    }));
    const chatOptions = { history, systemPrompt: widgetConfig.system_prompt };

    if (stream) {
      const streamResponse = await generateStreamChatResponse(clientId, message, chatOptions);
      if (!streamResponse.success || !streamResponse.stream) {
        return json({ error: streamResponse.error || 'Gagal generate response' }, { status: 502 });
      }

      // Save the user message right away so it is not lost if the stream fails.
      const saved = await appendToSession(session, clientId, widgetConfig.id, [stamp('user', message)]);
      const reader = streamResponse.stream.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();

      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          let fullResponse = '';
          if (saved.id && saved.id !== session?.id) {
            controller.enqueue(encoder.encode(`SESSION_ID:${saved.id}\n`));
          }
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              fullResponse += decoder.decode(value, { stream: true });
              controller.enqueue(value);
            }
          } catch (error) {
            console.error('Error in stream processing:', error);
            const note = '\n\n_(Maaf, respons terputus. Silakan coba lagi.)_';
            fullResponse += note;
            controller.enqueue(encoder.encode(note));
          }

          if (saved.id && fullResponse.trim()) {
            await appendToSession(
              { id: saved.id, messages: saved.messages },
              clientId,
              widgetConfig.id,
              [stamp('assistant', fullResponse)]
            );
          }
          controller.close();
        },
        cancel() {
          reader.cancel().catch(() => {});
        },
      });

      return new Response(body, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // Non-streaming
    const relevantDocs = await searchKnowledgeBase(clientId, message, 4);
    const chatResponse = await generateChatResponse(clientId, message, chatOptions, relevantDocs);

    if (!chatResponse.success || !chatResponse.response) {
      return json({ error: chatResponse.error || 'Gagal generate response' }, { status: 502 });
    }

    const saved = await appendToSession(session, clientId, widgetConfig.id, [
      stamp('user', message),
      stamp('assistant', chatResponse.response),
    ]);

    return json({
      success: true,
      response: chatResponse.response,
      sessionId: saved.id,
      relevantDocs: relevantDocs.map((doc) => ({
        filename: doc.filename,
        content: doc.content.length > 200 ? doc.content.substring(0, 200) + '...' : doc.content,
        similarity: doc.similarity,
      })),
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const clientId = url.searchParams.get('clientId');

    if (!sessionId || !clientId) {
      return json({ error: 'SessionId dan clientId harus diisi' }, { status: 400 });
    }

    const session = await loadSession(sessionId, clientId);
    if (!session) {
      return json({ error: 'Session tidak ditemukan' }, { status: 404 });
    }

    return json({ success: true, session });
  } catch (error) {
    console.error('Get chat history error:', error);
    return json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
