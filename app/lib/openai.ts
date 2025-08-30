import OpenAI from 'openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { Document } from '@langchain/core/documents';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { supabase } from './supabase';

const openai = new OpenAI({
  baseURL: 'https://ai.sumopod.com/v1',
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Initialize LangChain components for better RAG performance
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY || '',
  modelName: 'text-embedding-3-small',
  configuration: {
    baseURL: 'https://ai.sumopod.com/v1',
  },
});

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', ' ', ''],
});

// Initialize Supabase Vector Store for better similarity search
const createVectorStore = (clientId: string) => {
  return new SupabaseVectorStore(embeddings, {
    client: supabase,
    tableName: 'knowledge_base_chunks',
    queryName: 'search_knowledge_base_chunks',
    filter: { client_id: clientId },
  });
};

// Create LangChain retrieval chain for enhanced RAG
const createRetrievalChain = (clientId: string) => {
  try {
    const vectorStore = createVectorStore(clientId);
    const retriever = vectorStore.asRetriever({
      searchType: 'similarity',
      k: 5,
    });

    const prompt = ChatPromptTemplate.fromTemplate(`
Anda adalah asisten AI yang membantu menjawab pertanyaan berdasarkan konteks yang diberikan.
Gunakan informasi berikut untuk menjawab pertanyaan dengan akurat dan informatif.

Konteks:
{context}

Pertanyaan: {question}

Jawaban:`);

    const formatDocs = (docs: Document[]) => {
      try {
        if (!docs || !Array.isArray(docs) || docs.length === 0) {
          return 'Tidak ada konteks yang ditemukan.';
        }
        
        // Additional validation to ensure each doc is valid
        const validDocs = docs.filter(doc => 
          doc && 
          typeof doc === 'object' && 
          doc.pageContent && 
          typeof doc.pageContent === 'string'
        );
        
        if (validDocs.length === 0) {
          return 'Tidak ada konteks yang valid ditemukan.';
        }
        
        return validDocs.map(doc => {
          const filename = doc.metadata?.filename || 'dokumen';
          const content = doc.pageContent || '';
          return `Dari ${filename}:\n${content}`;
        }).join('\n\n');
      } catch (error) {
        console.error('Error in formatDocs:', error);
        return 'Terjadi kesalahan saat memformat dokumen.';
      }
    };

    // Create a safe retriever wrapper
    const safeRetriever = {
      pipe: (formatter: any) => {
        return {
          invoke: async (query: string) => {
            try {
              const docs = await retriever.invoke(query);
              return formatter(docs);
            } catch (error) {
              console.error('Error in retriever.invoke:', error);
              return 'Terjadi kesalahan saat mengambil dokumen dari knowledge base.';
            }
          }
        };
      }
    };

    return RunnableSequence.from([
      {
        context: safeRetriever.pipe(formatDocs),
        question: new RunnablePassthrough(),
      },
      prompt,
      new StringOutputParser(),
    ]);
  } catch (error) {
    console.error('Error creating retrieval chain:', error);
    // Return a fallback chain that doesn't use vector store
    const prompt = ChatPromptTemplate.fromTemplate(`
Anda adalah asisten AI yang membantu menjawab pertanyaan.

Konteks:
{context}

Pertanyaan: {question}

Jawaban: Maaf, saat ini knowledge base tidak tersedia. Saya tidak dapat memberikan informasi spesifik tentang pertanyaan Anda.`);
    
    return RunnableSequence.from([
      {
        context: () => 'Knowledge base tidak tersedia.',
        question: new RunnablePassthrough(),
      },
      prompt,
      new StringOutputParser(),
    ]);
  }
};

// Enhanced RAG function using LangChain retrieval chain
export async function enhancedRAGSearch(
  clientId: string,
  query: string
): Promise<{ context: string; sources: string[] }> {
  try {
    const vectorStore = createVectorStore(clientId);
    const retriever = vectorStore.asRetriever({
      searchType: 'similarity',
      k: 5,
    });

    const docs = await retriever.getRelevantDocuments(query);
    
    if (!docs || !Array.isArray(docs) || docs.length === 0) {
      return { context: '', sources: [] };
    }
    
    const context = docs.map(doc => doc.pageContent).join('\n\n');
    const sources = [...new Set(docs.map(doc => doc.metadata.filename || 'unknown'))];

    return { context, sources };
  } catch (error) {
    console.error('Error in enhanced RAG search:', error);
    return { context: '', sources: [] };
  }
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

// Generate embedding for text
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    // Use LangChain's OpenAIEmbeddings for better performance
    const embedding = await embeddings.embedQuery(text);
    
    return {
      success: true,
      embedding,
    };
  } catch (error) {
    console.error('Error generating embedding with LangChain:', error);
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
  let documentData: any = null;
  
  try {
    // First, create document embedding for the full content
    const documentEmbeddingResult = await generateEmbedding(content.substring(0, 1000));
    
    if (!documentEmbeddingResult.success || !documentEmbeddingResult.embedding) {
      throw new Error('Failed to generate document embedding');
    }
    
    // Store main document in knowledge_base
    const { data, error: documentError } = await supabase
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
    
    documentData = data;
    
    // Split content into chunks using LangChain's text splitter for better chunking
    const documents = await textSplitter.createDocuments(
      [content], 
      [{ filename, clientId, document_id: documentData.id }]
    );
    
    // Use LangChain Vector Store to add documents with better indexing
    const vectorStore = createVectorStore(clientId);
    
    // Add documents to vector store with enhanced metadata
    const documentsWithMetadata = documents.map((doc, index) => 
      new Document({
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          chunk_index: index,
          document_id: documentData.id,
        }
      })
    );
    
    await vectorStore.addDocuments(documentsWithMetadata);
    
    return { success: true };
  } catch (error) {
    console.error('Error storing document with LangChain:', error);
    
    // Fallback to original implementation if LangChain fails and we have documentData
    if (documentData) {
      try {
        const documents = await textSplitter.createDocuments([content], [{ filename, clientId }]);
        const chunks = documents.map(doc => doc.pageContent);
        
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
        
        const { error: chunksError } = await supabase
          .from('knowledge_base_chunks')
          .insert(chunksWithEmbeddings);
        
        if (chunksError) {
          throw chunksError;
        }
        
        return { success: true };
      } catch (fallbackError) {
        console.error('Error in fallback storeDocument:', fallbackError);
      }
    }
    
    return {
      success: false,
      error: 'Gagal menyimpan dokumen',
    };
  }
}

// Search similar content in knowledge base using LangChain Vector Store
export async function searchKnowledgeBase(
  clientId: string,
  query: string,
  limit: number = 5
): Promise<SearchResult[]> {
  try {
    // Create vector store instance for this client
    const vectorStore = createVectorStore(clientId);
    
    // Perform similarity search with LangChain
    const results = await vectorStore.similaritySearchWithScore(query, limit);
    
    if (!results || !Array.isArray(results) || results.length === 0) {
      return [];
    }
    
    // Transform results to match existing interface
    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      filename: doc.metadata.filename || 'unknown',
      similarity: 1 - score, // Convert distance to similarity
    }));
  } catch (error) {
    console.error('Error in LangChain searchKnowledgeBase:', error);
    
    // Fallback to original implementation if LangChain fails
    try {
      const queryEmbeddingResult = await generateEmbedding(query);
      
      if (!queryEmbeddingResult.success || !queryEmbeddingResult.embedding) {
        return [];
      }
      
      const { data, error } = await supabase.rpc('search_knowledge_base_chunks', {
        query_embedding: queryEmbeddingResult.embedding,
        match_count: limit,
        filter: { client_id: clientId },
      });

      if (error) {
        console.error('Error in fallback search:', error);
        return [];
      }

      // Transform data to match SearchResult interface
      return (data || []).map((item: any) => ({
        content: item.content,
        filename: item.metadata?.filename || 'unknown',
        similarity: 1 - (item.distance || 0), // Convert distance to similarity
      }));
    } catch (fallbackError) {
       console.error('Error in fallback searchKnowledgeBase:', fallbackError);
       return [];
     }
   }
 }

// Generate chat response using LangChain RAG
export async function generateChatResponse(
  clientId: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<ChatResponse> {
  try {
    // Get context using simple search without LangChain
    let context = 'Tidak ada konteks yang tersedia.';
    try {
      const searchResults = await searchKnowledgeBase(clientId, userMessage, 3);
      if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
        context = searchResults.map(result => {
          if (result && result.filename && result.content) {
            return `Dari ${result.filename}:\n${result.content}`;
          }
          return '';
        }).filter(Boolean).join('\n\n');
        
        if (!context.trim()) {
          context = 'Tidak ada konteks yang relevan ditemukan dalam knowledge base.';
        }
      } else {
        context = 'Tidak ada konteks yang relevan ditemukan dalam knowledge base.';
      }
    } catch (searchError) {
      console.error('Error in knowledge base search:', searchError);
      context = 'Terjadi kesalahan saat mencari di knowledge base.';
    }
    
    // Build enhanced system prompt with conversation history
    let systemPrompt = `Anda adalah asisten AI yang membantu menjawab pertanyaan berdasarkan knowledge base yang terdaftar.

Konteks dari knowledge base:
${context}

Instruksi:
- Jawab pertanyaan berdasarkan konteks yang diberikan
- Jika informasi tidak tersedia dalam konteks, katakan bahwa Anda tidak memiliki informasi tersebut
- Berikan jawaban yang helpful dan akurat
- Gunakan bahasa Indonesia yang sopan dan profesional
- Sebutkan sumber dokumen jika relevan`;
    
    // Add conversation history to system prompt if available
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      systemPrompt += `\n\nRiwayat percakapan sebelumnya:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`;
    }
    
    // Build messages array
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];
    
    // Generate response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
    // Get context using simple search without LangChain
    let context = 'Tidak ada konteks yang tersedia.';
    try {
      const searchResults = await searchKnowledgeBase(clientId, userMessage, 3);
      if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
        context = searchResults.map(result => {
          if (result && result.filename && result.content) {
            return `Dari ${result.filename}:\n${result.content}`;
          }
          return '';
        }).filter(Boolean).join('\n\n');
        
        if (!context.trim()) {
          context = 'Tidak ada konteks yang relevan ditemukan dalam knowledge base.';
        }
      } else {
        context = 'Tidak ada konteks yang relevan ditemukan dalam knowledge base.';
      }
    } catch (searchError) {
      console.error('Error in knowledge base search:', searchError);
      context = 'Terjadi kesalahan saat mencari di knowledge base.';
    }
    
    // Build enhanced system prompt with conversation history
    let systemPrompt = `Anda adalah asisten AI yang membantu menjawab pertanyaan berdasarkan knowledge base perusahaan.

Konteks dari knowledge base:
${context}

Instruksi:
- Jawab pertanyaan berdasarkan konteks yang diberikan
- Jika informasi tidak tersedia dalam konteks, katakan bahwa Anda tidak memiliki informasi tersebut
- Berikan jawaban yang helpful dan akurat
- Gunakan bahasa Indonesia yang sopan dan profesional
- Sebutkan sumber dokumen jika relevan`;
    
    // Add conversation history to system prompt if available
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      systemPrompt += `\n\nRiwayat percakapan sebelumnya:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`;
    }
    
    // Generate streaming response using OpenAI
    const openaiStream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
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
    console.error('Error generating stream chat response with OpenAI:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Gagal generate stream response dengan OpenAI';
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'API key OpenAI tidak valid atau tidak ditemukan';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Gagal terhubung ke server OpenAI';
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = 'Quota API OpenAI telah habis';
      } else {
        errorMessage = `Error OpenAI: ${error.message}`;
      }
    }
    
    return {
      success: false,
      error: errorMessage,
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