import { useState } from 'react';
import { type LoaderFunctionArgs, type ActionFunctionArgs, useLoaderData, useFetcher } from 'react-router';
import { requireAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { formatDate } from '~/lib/utils';
import {
  Upload,
  FileText,
  Trash2,
  Search,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface Document {
  filename: string;
  created_at: string;
  chunks: number;
}

interface LoaderData {
  documents: Document[];
  stats: {
    totalDocuments: number;
    totalChunks: number;
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = requireAuth(request);
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  try {
    // Get documents list
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('filename, created_at')
      .eq('client_id', user.client_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Gagal mengambil data knowledge base');
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

    // Get stats
    const stats = {
      totalDocuments: documents.length,
      totalChunks: data.length
    };

    return { documents, stats };
  } catch (error) {
    console.error('Knowledge base loader error:', error);
    return { documents: [], stats: { totalDocuments: 0, totalChunks: 0 } };
  }
}

export default function KnowledgeBase() {
  const { documents, stats } = useLoaderData<LoaderData>();
  const fetcher = useFetcher();
  const [searchTerm, setSearchTerm] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const filteredDocuments = documents.filter(doc =>
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('action', 'upload');
    formData.append('file', file);

    fetcher.submit(formData, {
      method: 'POST',
      action: '/api/knowledge-base',
      encType: 'multipart/form-data'
    });
  };

  const handleDeleteDocument = (filename: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus dokumen "${filename}"?`)) {
      return;
    }

    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('filename', filename);

    fetcher.submit(formData, {
      method: 'POST',
      action: '/api/knowledge-base/upload'
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const isUploading = fetcher.state === 'submitting' && fetcher.formData?.get('action') === 'upload';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Knowledge Base
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Kelola dokumen untuk melatih chatbot Anda
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Dokumen
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalDocuments}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Chunks
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalChunks}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Upload Dokumen
        </h2>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Mengupload dan memproses dokumen...
              </p>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Drag & drop file atau klik untuk upload
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Mendukung PDF, TXT, MD, CSV, JSON (max 10MB)
              </p>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.txt,.md,.csv,.json"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                Pilih File
              </label>
            </>
          )}
        </div>

        {/* Upload Status */}
        {fetcher.data && (
          <div className="mt-4">
            {fetcher.data.success ? (
              <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <p className="text-green-700 dark:text-green-400">
                  {fetcher.data.message}
                </p>
              </div>
            ) : (
              <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                <p className="text-red-700 dark:text-red-400">
                  {fetcher.data.error}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search and Documents List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Dokumen ({documents.length})
            </h2>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari dokumen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Documents List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredDocuments.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? 'Tidak ada dokumen yang ditemukan' : 'Belum ada dokumen'}
              </p>
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div key={doc.filename} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {doc.filename}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {doc.chunks} chunks • Diupload {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.filename)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Hapus dokumen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}