import { type ActionFunctionArgs } from 'react-router';
import { requireAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { isValidFileType, isValidFileSize, extractTextFromFile, splitTextIntoChunks } from '~/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

interface KnowledgeBaseDocument {
  id: string;
  client_id: string;
  filename: string;
  file_size: number;
  file_type: string;
  content: string;
  chunk_count: number;
  upload_status: 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

interface KnowledgeBaseChunk {
  id: string;
  document_id: string;
  client_id: string;
  content: string;
  chunk_index: number;
  embedding: number[];
  created_at: string;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const user = requireAuth(request);
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;

    switch (action) {
      case 'upload': {
        const file = formData.get('file') as File;

        if (!file) {
          return Response.json(
            { error: 'File harus dipilih' },
            { status: 400 }
          );
        }

        // Validasi file
        if (!isValidFileType(file)) {
          return Response.json(
            { error: 'Tipe file tidak didukung. Gunakan PDF, TXT, DOC, atau DOCX.' },
            { status: 400 }
          );
        }

        if (!isValidFileSize(file)) {
          return Response.json(
            { error: 'Ukuran file terlalu besar. Maksimal 10MB.' },
            { status: 400 }
          );
        }

        // Generate document ID
        const documentId = uuidv4();

        // Extract text from file
        let extractedText: string;
        try {
          extractedText = await extractTextFromFile(file);
        } catch (error) {
          console.error('Text extraction error:', error);
          return Response.json(
            { error: 'Gagal mengekstrak teks dari file' },
            { status: 500 }
          );
        }

        if (!extractedText || extractedText.trim().length === 0) {
          return Response.json(
            { error: 'File tidak mengandung teks yang dapat dibaca' },
            { status: 400 }
          );
        }

        // Split text into chunks
        const chunks = splitTextIntoChunks(extractedText, 1000);

        if (chunks.length === 0) {
          return Response.json(
            { error: 'Gagal memproses teks dari file' },
            { status: 500 }
          );
        }

        // Save document to database
        const document: KnowledgeBaseDocument = {
          id: documentId,
          client_id: user.client_id,
          filename: file.name,
          file_size: file.size,
          file_type: file.type,
          content: extractedText,
          chunk_count: chunks.length,
          upload_status: 'processing',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: docError } = await supabase
          .from('knowledge_base')
          .insert(document);

        if (docError) {
          console.error('Document insert error:', docError);
          return Response.json(
            { error: 'Gagal menyimpan dokumen' },
            { status: 500 }
          );
        }

        // Process chunks and generate embeddings
        try {
          const chunkPromises = chunks.map(async (chunk, index) => {
            // Generate embedding using OpenAI
            const embeddingResponse = await openai.embeddings.create({
              model: 'text-embedding-3-small',
              input: chunk,
              encoding_format: 'float'
            });

            const embedding = embeddingResponse.data[0].embedding;

            const chunkData: KnowledgeBaseChunk = {
              id: uuidv4(),
              document_id: documentId,
              client_id: user.client_id,
              content: chunk,
              chunk_index: index,
              embedding,
              created_at: new Date().toISOString()
            };

            return chunkData;
          });

          const processedChunks = await Promise.all(chunkPromises);

          // Insert chunks to database
          const { error: chunksError } = await supabase
            .from('knowledge_base_chunks')
            .insert(processedChunks);

          if (chunksError) {
            console.error('Chunks insert error:', chunksError);
            throw new Error('Gagal menyimpan chunks');
          }

          // Update document status to completed
          await supabase
            .from('knowledge_base')
            .update({
              upload_status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', documentId);

          return Response.json({
            success: true,
            document: {
              id: documentId,
              filename: file.name,
              chunk_count: chunks.length,
              status: 'completed'
            }
          });
        } catch (error) {
          console.error('Embedding processing error:', error);

          // Update document status to failed
          await supabase
            .from('knowledge_base')
            .update({
              upload_status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', documentId);

          return Response.json(
            { error: 'Gagal memproses embeddings' },
            { status: 500 }
          );
        }
      }

      case 'delete': {
        const filename = formData.get('filename') as string;

        if (!filename) {
          return Response.json(
            { error: 'Filename harus diisi' },
            { status: 400 }
          );
        }

        // Get document ID by filename
        const { data: document, error: findError } = await supabase
          .from('knowledge_base')
          .select('id')
          .eq('filename', filename)
          .eq('client_id', user.client_id)
          .single();

        if (findError || !document) {
          console.error('Document find error:', findError);
          return Response.json(
            { error: 'Dokumen tidak ditemukan' },
            { status: 404 }
          );
        }

        const documentId = document.id;

        // Delete chunks first
        const { error: chunksError } = await supabase
          .from('knowledge_base_chunks')
          .delete()
          .eq('document_id', documentId)
          .eq('client_id', user.client_id);

        if (chunksError) {
          console.error('Chunks delete error:', chunksError);
          return Response.json(
            { error: 'Gagal menghapus chunks dokumen' },
            { status: 500 }
          );
        }

        // Delete document
        const { error: docError } = await supabase
          .from('knowledge_base')
          .delete()
          .eq('id', documentId)
          .eq('client_id', user.client_id);

        if (docError) {
          console.error('Document delete error:', docError);
          return Response.json(
            { error: 'Gagal menghapus dokumen' },
            { status: 500 }
          );
        }

        return Response.json({ success: true });
      }

      case 'list': {
        const { data: documents, error } = await supabase
          .from('knowledge_base')
          .select('id, filename, file_size, file_type, chunk_count, upload_status, created_at')
          .eq('client_id', user.client_id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Documents list error:', error);
          return Response.json(
            { error: 'Gagal mengambil daftar dokumen' },
            { status: 500 }
          );
        }

        return Response.json({ documents });
      }

      case 'search': {
        const query = formData.get('query') as string;
        const limit = parseInt(formData.get('limit') as string) || 5;

        if (!query) {
          return Response.json(
            { error: 'Query pencarian harus diisi' },
            { status: 400 }
          );
        }

        try {
          // Generate embedding for search query
          const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: query,
            encoding_format: 'float'
          });

          const queryEmbedding = embeddingResponse.data[0].embedding;

          // Search similar chunks using pgvector
          const { data: results, error } = await supabase
            .rpc('search_knowledge_base_chunks', {
              query_embedding: queryEmbedding,
              match_threshold: 0.7,
              match_count: limit,
              target_client_id: user.client_id
            });

          if (error) {
            console.error('Knowledge base search error:', error);
            return Response.json(
              { error: 'Gagal mencari di knowledge base' },
              { status: 500 }
            );
          }

          return Response.json({ results });
        } catch (error) {
          console.error('Search embedding error:', error);
          return Response.json(
            { error: 'Gagal memproses pencarian' },
            { status: 500 }
          );
        }
      }

      default:
        return Response.json(
          { error: 'Action tidak valid' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Knowledge base upload error:', error);
    return Response.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// Export default untuk compatibility
export default function KnowledgeBaseUploadAPI() {
  return null;
}