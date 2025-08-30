import { supabase } from '../supabase';
import type { ChatSession, KnowledgeBaseDocument, WidgetConfig } from '../types';

// Chat Session Operations
export async function createChatSession(data: {
  clientId: string;
  widgetId: string;
  userMessage: string;
  assistantResponse: string;
}): Promise<ChatSession> {
  const { data: session, error } = await supabase
    .from('chat_sessions')
    .insert({
      client_id: data.clientId,
      widget_id: data.widgetId,
      messages: [
        { role: 'user', content: data.userMessage },
        { role: 'assistant', content: data.assistantResponse }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create chat session: ${error.message}`);
  }

  return session;
}

export async function updateChatSession(sessionId: string, data: {
  userMessage: string;
  assistantResponse: string;
}): Promise<ChatSession> {
  // First get the current session
  const { data: currentSession, error: fetchError } = await supabase
    .from('chat_sessions')
    .select('messages')
    .eq('id', sessionId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch chat session: ${fetchError.message}`);
  }

  // Update with new messages
  const updatedMessages = [
    ...(currentSession.messages || []),
    { role: 'user', content: data.userMessage },
    { role: 'assistant', content: data.assistantResponse }
  ];

  const { data: session, error } = await supabase
    .from('chat_sessions')
    .update({
      messages: updatedMessages,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update chat session: ${error.message}`);
  }

  return session;
}

export async function getChatSessionsByClientId(clientId: string): Promise<ChatSession[]> {
  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch chat sessions: ${error.message}`);
  }

  return sessions || [];
}

// Knowledge Base Operations
export async function saveKnowledgeBaseDocument(data: {
  clientId: string;
  filename: string;
  content: string;
  chunks: Array<{ content: string; embedding: number[] }>;
}): Promise<KnowledgeBaseDocument> {
  const { data: document, error } = await supabase
    .from('knowledge_base')
    .insert({
      client_id: data.clientId,
      filename: data.filename,
      content: data.content,
      chunks: data.chunks,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save knowledge base document: ${error.message}`);
  }

  return document;
}

export async function deleteKnowledgeBaseDocument(documentId: string, clientId: string): Promise<void> {
  const { error } = await supabase
    .from('knowledge_base')
    .delete()
    .eq('id', documentId)
    .eq('client_id', clientId);

  if (error) {
    throw new Error(`Failed to delete knowledge base document: ${error.message}`);
  }
}

export async function getKnowledgeBaseDocuments(clientId: string): Promise<KnowledgeBaseDocument[]> {
  const { data: documents, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch knowledge base documents: ${error.message}`);
  }

  return documents || [];
}

export async function getKnowledgeBaseStats(clientId: string): Promise<{
  totalDocuments: number;
  totalChunks: number;
}> {
  const { data: documents, error } = await supabase
    .from('knowledge_base')
    .select('chunks')
    .eq('client_id', clientId);

  if (error) {
    throw new Error(`Failed to fetch knowledge base stats: ${error.message}`);
  }

  const totalDocuments = documents?.length || 0;
  const totalChunks = documents?.reduce((sum, doc) => sum + (doc.chunks?.length || 0), 0) || 0;

  return { totalDocuments, totalChunks };
}

// Widget Configuration Operations
export async function createWidgetConfig(data: {
  clientId: string;
  name: string;
  primaryColor: string;
  position: string;
  welcomeMessage: string;
}): Promise<WidgetConfig> {
  const { data: config, error } = await supabase
    .from('widget_configs')
    .insert({
      client_id: data.clientId,
      name: data.name,
      primary_color: data.primaryColor,
      position: data.position,
      welcome_message: data.welcomeMessage,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create widget config: ${error.message}`);
  }

  return config;
}

export async function updateWidgetConfig(configId: string, clientId: string, data: {
  name?: string;
  primaryColor?: string;
  position?: string;
  welcomeMessage?: string;
}): Promise<WidgetConfig> {
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.primaryColor !== undefined) updateData.primary_color = data.primaryColor;
  if (data.position !== undefined) updateData.position = data.position;
  if (data.welcomeMessage !== undefined) updateData.welcome_message = data.welcomeMessage;

  const { data: config, error } = await supabase
    .from('widget_configs')
    .update(updateData)
    .eq('id', configId)
    .eq('client_id', clientId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update widget config: ${error.message}`);
  }

  return config;
}

export async function deleteWidgetConfig(configId: string, clientId: string): Promise<void> {
  const { error } = await supabase
    .from('widget_configs')
    .delete()
    .eq('id', configId)
    .eq('client_id', clientId);

  if (error) {
    throw new Error(`Failed to delete widget config: ${error.message}`);
  }
}

export async function getWidgetConfigs(clientId: string): Promise<WidgetConfig[]> {
  const { data: configs, error } = await supabase
    .from('widget_configs')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch widget configs: ${error.message}`);
  }

  return configs || [];
}

export async function getWidgetConfigById(configId: string, clientId: string): Promise<WidgetConfig | null> {
  const { data: config, error } = await supabase
    .from('widget_configs')
    .select('*')
    .eq('id', configId)
    .eq('client_id', clientId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No rows found
    }
    throw new Error(`Failed to fetch widget config: ${error.message}`);
  }

  return config;
}

// User Operations
export async function getUserByEmail(email: string): Promise<any> {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No user found
    }
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  return user;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  clientId: string;
}): Promise<any> {
  const { data: user, error } = await supabase
    .from('users')
    .insert({
      email: data.email,
      password_hash: data.passwordHash,
      client_id: data.clientId,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return user;
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update user last login: ${error.message}`);
  }
}

// Generic helper for similarity search
export async function performSimilaritySearch(embedding: number[], clientId: string, threshold = 0.8, limit = 5) {
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    client_id: clientId,
    match_threshold: threshold,
    match_count: limit
  });

  if (error) {
    throw new Error(`Failed to perform similarity search: ${error.message}`);
  }

  return data || [];
}

// Helper function to save streaming chat session
export async function saveStreamChatSession(
  clientId: string,
  widgetId: string | undefined,
  sessionId: string | undefined,
  message: string,
  response: string
) {
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
  return currentSessionId;
}

// Helper function to update session with assistant response
export async function updateSessionWithResponse(sessionId: string, response: string) {
  const { data: existingSession } = await supabase
    .from('chat_sessions')
    .select('messages')
    .eq('id', sessionId)
    .single();

  if (existingSession) {
    const updatedMessages = [
      ...(existingSession.messages || []),
      { role: 'assistant', content: response, timestamp: new Date().toISOString() }
    ];

    await supabase
      .from('chat_sessions')
      .update({ 
        messages: updatedMessages,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  }
}