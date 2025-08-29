import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';
import { splitTextIntoChunks } from './utils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

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

export interface SearchResult {
  content: string;
  filename: string;
  similarity: number;
}

// Generate embedding for text
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    
    return {
      success: true,
      embedding: result.embedding.values,
    };
  } catch (error) {
    console.error('Error generating embedding with Gemini:', error);
    return {
      success: false,
      error: 'Gagal generate embedding dengan Gemini',
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
    // Split content into chunks
    const chunks = splitTextIntoChunks(content, 1000);
    
    // Generate embeddings for each chunk
    const embeddingPromises = chunks.map(async (chunk, index) => {
      const embeddingResult = await generateEmbedding(chunk);
      
      if (!embeddingResult.success || !embeddingResult.embedding) {
        throw new Error(`Failed to generate embedding for chunk ${index}`);
      }
      
      return {
        client_id: clientId,
        filename: `${filename}_chunk_${index}`,
        content: chunk,
        embedding: embeddingResult.embedding,
      };
    });
    
    const documentsWithEmbeddings = await Promise.all(embeddingPromises);
    
    // Store in database
    const { error } = await supabase
      .from('knowledge_base')
      .insert(documentsWithEmbeddings);
    
    if (error) {
      throw error;
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
    const { data, error } = await supabase.rpc('search_knowledge_base', {
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
    
    // Build conversation history for Gemini
    let conversationText = systemPrompt + '\n\n';
    
    // Add conversation history
    conversationHistory.forEach(msg => {
      conversationText += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
    
    // Add current user message
    conversationText += `User: ${userMessage}\nAssistant:`;
    
    // Generate response using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(conversationText);
    
    const response = result.response.text();
    
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
    console.error('Error generating chat response with Gemini:', error);
    return {
      success: false,
      error: 'Gagal generate response dengan Gemini',
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
      .like('filename', `${filename}%`);
    
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
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('filename')
      .eq('client_id', clientId);
    
    if (error) {
      throw error;
    }
    
    // Count unique documents
    const uniqueFiles = new Set(
      data.map(item => item.filename.split('_chunk_')[0])
    );
    
    return {
      totalDocuments: uniqueFiles.size,
      totalChunks: data.length,
    };
  } catch (error) {
    console.error('Error getting knowledge base stats:', error);
    return {
      totalDocuments: 0,
      totalChunks: 0,
    };
  }
}