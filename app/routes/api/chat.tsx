import { supabase } from '~/lib/supabase';
import { generateChatResponse, generateStreamChatResponse, searchKnowledgeBase } from '~/lib/openai';
import { createJsonResponse as json } from '~/lib/helpers';
import { saveStreamChatSession, updateSessionWithResponse } from '~/lib/helpers';
import type { ActionFunctionArgs } from 'react-router';

export async function options() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json();
    const { message, sessionId, clientId, widgetId, stream = true } = body;

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
    
    // Check if streaming is requested
    if (stream) {
      // Generate streaming chat response
      const streamResponse = await generateStreamChatResponse(
        clientId,
        message,
        [] // conversation history - could be enhanced to include previous messages
      );
      
      if (!streamResponse.success) {
        return json({ error: streamResponse.error || 'Gagal generate stream response' }, { status: 500 });
      }
      
      // For streaming, we need to collect the response and save it
      // Create a readable stream that also saves the data
      const reader = streamResponse.stream!.getReader();
      let fullResponse = '';
      let savedSessionId = sessionId;
      
      const saveableStream = new ReadableStream({
        async start(controller) {
          try {
            // Send session info first if it's a new session
            if (!savedSessionId) {
              // Pre-create session to get sessionId
              const { data: newSession, error: sessionError } = await supabase
                .from('chat_sessions')
                .insert({
                  client_id: clientId,
                  widget_id: widgetId,
                  messages: [
                    { role: 'user', content: message, timestamp: new Date().toISOString() }
                  ],
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();
              
              if (sessionError) {
                console.error('Error creating session:', sessionError);
                controller.error(new Error('Failed to create session'));
                return;
              }
              
              if (newSession) {
                savedSessionId = newSession.id;
                // Send sessionId as first chunk
                const sessionInfo = `SESSION_ID:${savedSessionId}\n`;
                controller.enqueue(new TextEncoder().encode(sessionInfo));
              }
            }
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                // Save the complete response to database
                if (savedSessionId && fullResponse.trim()) {
                  try {
                    await updateSessionWithResponse(savedSessionId, fullResponse);
                  } catch (error) {
                    console.error('Error saving response to database:', error);
                  }
                }
                controller.close();
                break;
              }
              
              const chunk = new TextDecoder().decode(value);
              fullResponse += chunk;
              controller.enqueue(value);
            }
          } catch (error) {
            console.error('Error in stream processing:', error);
            controller.error(error);
          }
        }
      });
      
      // Return streaming response
      return new Response(saveableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    // Generate regular chat response using RAG
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
    try {
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
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (sessionError) {
          console.error('Error creating session:', sessionError);
          throw new Error(`Failed to create session: ${sessionError.message}`);
        } else {
          currentSessionId = newSession.id;
        }
      } else {
        // Update existing session
        const { data: existingSession, error: fetchError } = await supabase
          .from('chat_sessions')
          .select('messages')
          .eq('id', currentSessionId)
          .single();

        if (fetchError) {
          console.error('Error fetching session:', fetchError);
          throw new Error(`Failed to fetch session: ${fetchError.message}`);
        }

        if (existingSession) {
          const updatedMessages = [
            ...(existingSession.messages || []),
            { role: 'user', content: message, timestamp: new Date().toISOString() },
            { role: 'assistant', content: response, timestamp: new Date().toISOString() }
          ];

          const { error: updateError } = await supabase
            .from('chat_sessions')
            .update({ 
              messages: updatedMessages,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentSessionId);

          if (updateError) {
            console.error('Error updating session:', updateError);
            throw new Error(`Failed to update session: ${updateError.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Error saving chat session:', error);
      // Continue with response even if saving fails
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

export async function loader({ request }: ActionFunctionArgs) {
  // Handle CORS for GET requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

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