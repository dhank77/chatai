import { type ActionFunctionArgs } from 'react-router';
import { generateChatResponse, searchKnowledgeBase } from '~/lib/openai';
import { supabase } from '~/lib/supabase';
import { requireAuth } from '~/lib/auth';

// Helper function to create JSON responses
function json(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const sessionId = formData.get('sessionId') as string;
    const clientId = formData.get('clientId') as string;
    const widgetId = formData.get('widgetId') as string;

    if (!message || !clientId) {
      return json({ error: 'Message dan clientId harus diisi' }, { status: 400 });
    }

    // Get widget configuration
    const { data: widgetConfig, error: widgetError } = await supabase
      .from('widget_configs')
      .select('*')
      .eq('client_id', clientId)
      .eq('id', widgetId || '')
      .single();

    if (widgetError || !widgetConfig) {
      return json({ error: 'Widget configuration tidak ditemukan' }, { status: 404 });
    }

    // Search knowledge base for relevant context
    const relevantDocs = await searchKnowledgeBase(clientId, message, 3);
    
    // Generate chat response using RAG
    const chatResponse = await generateChatResponse(
      clientId,
      message,
      [] // conversation history - could be enhanced to include previous messages
    );
    
    if (!chatResponse.success) {
      return json({ error: chatResponse.error || 'Gagal generate response' }, { status: 500 });
    }
    
    const response = chatResponse.response!;

    // Save chat session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          client_id: clientId,
          widget_id: widgetId,
          messages: [
            { role: 'user', content: message, timestamp: new Date().toISOString() },
            { role: 'assistant', content: response, timestamp: new Date().toISOString() }
          ]
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
      } else {
        currentSessionId = newSession.id;
      }
    } else {
      // Update existing session
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('messages')
        .eq('id', currentSessionId)
        .single();

      if (existingSession) {
        const updatedMessages = [
          ...(existingSession.messages || []),
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: response, timestamp: new Date().toISOString() }
        ];

        await supabase
          .from('chat_sessions')
          .update({ 
            messages: updatedMessages,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSessionId);
      }
    }

    return json({
      success: true,
      response,
      sessionId: currentSessionId,
      relevantDocs: relevantDocs.map(doc => ({
        filename: doc.filename,
        content: doc.content.substring(0, 200) + '...',
        similarity: doc.similarity
      }))
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// GET method untuk mendapatkan chat history
export async function loader({ request }: ActionFunctionArgs) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const clientId = url.searchParams.get('clientId');

    if (!sessionId || !clientId) {
      return json({ error: 'SessionId dan clientId harus diisi' }, { status: 400 });
    }

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('client_id', clientId)
      .single();

    if (error) {
      return json({ error: 'Session tidak ditemukan' }, { status: 404 });
    }

    return json({ success: true, session });
  } catch (error) {
    console.error('Get chat history error:', error);
    return json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}