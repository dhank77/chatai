import OpenAI from 'openai';
import { supabase } from './supabase';
import { splitTextIntoChunks } from './utils';

const openai = new OpenAI({
  baseURL: 'https://ai.sumopod.com/v1',
  apiKey: process.env.OPENAI_API_KEY || '',
});

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

// Generate embedding for text
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return {
      success: true,
      embedding: response.data[0].embedding,
    };
  } catch (error) {
    console.error('Error generating embedding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Store document in knowledge base with embeddings
export async function storeDocument(
  clientId: string,
  filename: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, create document embedding for the full content
    const documentEmbeddingResult = await generateEmbedding(content.substring(0, 1000));
    
    if (!documentEmbeddingResult.success || !documentEmbeddingResult.embedding) {
      throw new Error('Failed to generate document embedding');
    }
    
    // Store main document in knowledge_base
    const { data: documentData, error: documentError } = await supabase
      .from('knowledge_base')
      .insert({
        client_id: clientId,
        filename: filename,
        content: content,
        embedding: documentEmbeddingResult.embedding,
      })
      .select('id')
      .single();
    
    if (documentError) {
      throw documentError;
    }
    
    // Split content into chunks
    const chunks = splitTextIntoChunks(content, 1000);
    
    // Generate embeddings for each chunk
    const embeddingPromises = chunks.map(async (chunk, index) => {
      const embeddingResult = await generateEmbedding(chunk);
      
      if (!embeddingResult.success || !embeddingResult.embedding) {
        throw new Error(`Failed to generate embedding for chunk ${index}`);
      }
      
      return {
        document_id: documentData.id,
        client_id: clientId,
        content: chunk,
        chunk_index: index,
        embedding: embeddingResult.embedding,
      };
    });
    
    const chunksWithEmbeddings = await Promise.all(embeddingPromises);
    
    // Store chunks in knowledge_base_chunks
    const { error: chunksError } = await supabase
      .from('knowledge_base_chunks')
      .insert(chunksWithEmbeddings);
    
    if (chunksError) {
      throw chunksError;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error storing document:', error);
    return {
      success: false,
      error: 'Gagal menyimpan dokumen',
    };
  }
}

// Search similar content in knowledge base
export async function searchKnowledgeBase(
  clientId: string,
  query: string,
  limit: number = 5
): Promise<SearchResult[]> {
  try {
    // Generate embedding for query
    const queryEmbeddingResult = await generateEmbedding(query);
    
    if (!queryEmbeddingResult.success || !queryEmbeddingResult.embedding) {
      return [];
    }
    
    // Search using pgvector similarity
    const { data, error } = await supabase.rpc('search_knowledge_base_chunks', {
      client_id: clientId,
      query_embedding: queryEmbeddingResult.embedding,
      match_threshold: 0.7,
      match_count: limit,
    });
    
    if (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in searchKnowledgeBase:', error);
    return [];
  }
}

// Generate chat response using RAG
export async function generateChatResponse(
  clientId: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<ChatResponse> {
  try {
    // Search relevant content from knowledge base
    const searchResults = await searchKnowledgeBase(clientId, userMessage, 3);
    
    // Build context from search results
    const context = searchResults
      .map(result => result.content)
      .join('\n\n');
    
    // Build system prompt
    const systemPrompt = `Anda adalah asisten AI yang membantu menjawab pertanyaan berdasarkan knowledge base perusahaan.

Konteks dari knowledge base:
${context}

Instruksi:
- Jawab pertanyaan berdasarkan konteks yang diberikan
- Jika informasi tidak tersedia dalam konteks, katakan bahwa Anda tidak memiliki informasi tersebut
- Berikan jawaban yang helpful dan akurat
- Gunakan bahasa Indonesia yang sopan dan profesional`;
    
    // Build messages array
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];
    
    // Generate response
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });
    
    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      return {
        success: false,
        error: 'Tidak ada response dari AI',
      };
    }
    
    return {
      success: true,
      response,
    };
  } catch (error) {
    console.error('Error generating chat response:', error);
    return {
      success: false,
      error: 'Gagal generate response',
    };
  }
}

export async function generateStreamChatResponse(
  clientId: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<StreamChatResponse> {
  try {
    // Search relevant content from knowledge base
    const searchResults = await searchKnowledgeBase(clientId, userMessage, 3);
    
    // Build context from search results
    const context = searchResults
      .map(result => result.content)
      .join('\n\n');
    
    // Build system prompt
    const systemPrompt = `Anda adalah asisten AI yang membantu menjawab pertanyaan berdasarkan knowledge base perusahaan.

Konteks dari knowledge base:
${context}

Instruksi:
- Jawab pertanyaan berdasarkan konteks yang diberikan
- Jika informasi tidak tersedia dalam konteks, katakan bahwa Anda tidak memiliki informasi tersebut
- Berikan jawaban yang helpful dan akurat
- Gunakan bahasa Indonesia yang sopan dan profesional`;
    
    // Build conversation history for Gemini
    let conversationText = systemPrompt + '\n\n';
    
    // Add conversation history
    conversationHistory.forEach(msg => {
      conversationText += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
    
    // Add current user message
    conversationText += `User: ${userMessage}\nAssistant:`;
    
    // Generate streaming response using OpenAI
    const openaiStream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 1000
    });
    
    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of openaiStream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return {
      success: true,
      stream,
    };
  } catch (error) {
    console.error('Error generating stream chat response with Gemini:', error);
    return {
      success: false,
      error: 'Gagal generate stream response dengan Gemini',
    };
  }
}

// Delete documents from knowledge base
export async function deleteDocument(
  clientId: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('client_id', clientId)
      .eq('filename', filename);
    
    if (error) {
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    return {
      success: false,
      error: 'Gagal menghapus dokumen',
    };
  }
}

// Get knowledge base stats
export async function getKnowledgeBaseStats(clientId: string) {
  try {
    // Get documents count
    const { data: documentsData, error: documentsError } = await supabase
      .from('knowledge_base')
      .select('id')
      .eq('client_id', clientId);
    
    if (documentsError) {
      throw documentsError;
    }
    
    // Get chunks count
    const { data: chunksData, error: chunksError } = await supabase
      .from('knowledge_base_chunks')
      .select('id')
      .eq('client_id', clientId);
    
    if (chunksError) {
      throw chunksError;
    }
    
    return {
      totalDocuments: documentsData?.length || 0,
      totalChunks: chunksData?.length || 0,
    };
  } catch (error) {
    console.error('Error getting knowledge base stats:', error);
    return {
      totalDocuments: 0,
      totalChunks: 0,
    };
  }
}