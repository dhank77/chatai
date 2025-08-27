import { type ActionFunctionArgs } from 'react-router';
import { supabase } from '~/lib/supabase';
import { requireAuth } from '~/lib/auth';
import { storeDocument, deleteDocument, getKnowledgeBaseStats } from '~/lib/openai';
import { extractTextFromFile, isValidFileType, isValidFileSize } from '~/lib/utils';

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
    // Authenticate user
    const user = requireAuth(request);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const action = formData.get('action') as string;

    if (action === 'upload') {
      const file = formData.get('file') as File;
      
      if (!file) {
        return json({ error: 'File harus diisi' }, { status: 400 });
      }

      // Validate file type and size
      if (!isValidFileType(file)) {
        return json({ 
          error: 'Tipe file tidak didukung. Gunakan PDF, TXT, DOC, atau DOCX' 
        }, { status: 400 });
      }

      if (!isValidFileSize(file)) {
        return json({ 
          error: 'Ukuran file terlalu besar. Maksimal 10MB' 
        }, { status: 400 });
      }

      try {
        // Extract text from file
        const text = await extractTextFromFile(file);
        
        if (!text || text.trim().length === 0) {
          return json({ 
            error: 'Tidak dapat mengekstrak teks dari file' 
          }, { status: 400 });
        }

        // Store document with embeddings
        const result = await storeDocument(user.client_id, file.name, text);
        
        if (!result.success) {
          return json({ 
            error: result.error || 'Gagal menyimpan dokumen' 
          }, { status: 500 });
        }

        return json({ 
          success: true, 
          message: 'Dokumen berhasil diupload dan diproses',
          filename: file.name,
          textLength: text.length
        });
      } catch (error) {
        console.error('Error processing file:', error);
        return json({ 
          error: 'Gagal memproses file' 
        }, { status: 500 });
      }
    }

    if (action === 'delete') {
      const filename = formData.get('filename') as string;
      
      if (!filename) {
        return json({ error: 'Filename harus diisi' }, { status: 400 });
      }

      const result = await deleteDocument(user.client_id, filename);
      
      if (!result.success) {
        return json({ 
          error: result.error || 'Gagal menghapus dokumen' 
        }, { status: 500 });
      }

      return json({ 
        success: true, 
        message: 'Dokumen berhasil dihapus' 
      });
    }

    return json({ error: 'Action tidak valid' }, { status: 400 });
  } catch (error) {
    console.error('Knowledge base API error:', error);
    return json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// GET method untuk mendapatkan knowledge base data
export async function loader({ request }: ActionFunctionArgs) {
  try {
    // Authenticate user
    const user = requireAuth(request);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'stats') {
      // Get knowledge base statistics
      const stats = await getKnowledgeBaseStats(user.client_id);
      return json({ success: true, stats });
    }

    if (action === 'list') {
      // Get list of documents
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('filename, created_at')
        .eq('client_id', user.client_id)
        .order('created_at', { ascending: false });

      if (error) {
        return json({ error: 'Gagal mengambil daftar dokumen' }, { status: 500 });
      }

      // Group by original filename (remove chunk suffix)
      const documentsMap = new Map();
      data.forEach(item => {
        const originalFilename = item.filename.split('_chunk_')[0];
        if (!documentsMap.has(originalFilename)) {
          documentsMap.set(originalFilename, {
            filename: originalFilename,
            created_at: item.created_at,
            chunks: 0
          });
        }
        documentsMap.get(originalFilename).chunks++;
      });

      const documents = Array.from(documentsMap.values());
      return json({ success: true, documents });
    }

    // Default: return basic info
    return json({ 
      success: true, 
      message: 'Knowledge Base API endpoint' 
    });
  } catch (error) {
    console.error('Get knowledge base error:', error);
    return json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}