import { useState } from 'react';
import { type LoaderFunctionArgs, useLoaderData, useFetcher } from 'react-router';
import { requireAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { formatDate } from '~/lib/utils';
import {
  Settings,
  MessageSquare,
  Code,
  Eye,
  Plus,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  AlertCircle,
  Monitor,
  Smartphone
} from 'lucide-react';

interface WidgetConfig {
  id: string;
  name: string;
  primary_color: string;
  position: string;
  welcome_message: string;
  system_prompt: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LoaderData {
  widgets: WidgetConfig[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = requireAuth(request);
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  try {
    const { data: widgets, error } = await supabase
      .from('widget_configs')
      .select('*')
      .eq('client_id', user.client_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Gagal mengambil konfigurasi widget');
    }

    return { widgets: widgets || [] };
  } catch (error) {
    console.error('Widget config loader error:', error);
    return { widgets: [] };
  }
}

export default function WidgetConfig() {
  const { widgets } = useLoaderData<LoaderData>();
  const fetcher = useFetcher();
  const [showForm, setShowForm] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const [previewWidget, setPreviewWidget] = useState<WidgetConfig | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    primaryColor: '#3B82F6',
    position: 'bottom-right',
    welcomeMessage: 'Halo! Ada yang bisa saya bantu?',
    systemPrompt: 'Anda adalah asisten AI yang membantu menjawab pertanyaan.',
    isActive: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      primaryColor: '#3B82F6',
      position: 'bottom-right',
      welcomeMessage: 'Halo! Ada yang bisa saya bantu?',
      systemPrompt: 'Anda adalah asisten AI yang membantu menjawab pertanyaan.',
      isActive: true
    });
    setEditingWidget(null);
    setShowForm(false);
  };

  const handleEdit = (widget: WidgetConfig) => {
    setFormData({
      name: widget.name,
      primaryColor: widget.primary_color,
      position: widget.position,
      welcomeMessage: widget.welcome_message,
      systemPrompt: widget.system_prompt,
      isActive: widget.is_active
    });
    setEditingWidget(widget);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = new FormData();
    submitData.append('action', editingWidget ? 'update' : 'create');
    if (editingWidget) {
      submitData.append('widgetId', editingWidget.id);
    }
    submitData.append('name', formData.name);
    submitData.append('primaryColor', formData.primaryColor);
    submitData.append('position', formData.position);
    submitData.append('welcomeMessage', formData.welcomeMessage);
    submitData.append('systemPrompt', formData.systemPrompt);
    submitData.append('isActive', formData.isActive.toString());

    fetcher.submit(submitData, {
      method: 'POST',
      action: '/api/widget-config'
    });

    resetForm();
  };

  const handleDelete = (widget: WidgetConfig) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus widget "${widget.name}"?`)) {
      return;
    }

    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('widgetId', widget.id);

    fetcher.submit(formData, {
      method: 'POST',
      action: '/api/widget-config'
    });
  };

  const generateEmbedScript = (widget: WidgetConfig) => {
    return `<!-- Chatbot Widget Script -->
<script>
  window.chatbotConfig = {
    widgetId: '${widget.id}',
    clientId: 'your_client_id',
    primaryColor: '${widget.primary_color}',
    position: '${widget.position}',
    welcomeMessage: '${widget.welcome_message}'
  };
</script>
<script src="${import.meta.env.WIDGET_SCRIPT_URL || 'http://localhost:5176/chatbot.js'}"></script>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    });
  };

  const positionOptions = [
    { value: 'bottom-right', label: 'Kanan Bawah' },
    { value: 'bottom-left', label: 'Kiri Bawah' },
    { value: 'top-right', label: 'Kanan Atas' },
    { value: 'top-left', label: 'Kiri Atas' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Konfigurasi Widget
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Kelola tampilan dan perilaku chatbot widget
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Buat Widget Baru
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {editingWidget ? 'Edit Widget' : 'Buat Widget Baru'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nama Widget
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Warna Utama
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Posisi Widget
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {positionOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pesan Selamat Datang
                  </label>
                  <textarea
                    value={formData.welcomeMessage}
                    onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    System Prompt
                  </label>
                  <textarea
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Instruksi untuk AI tentang bagaimana berperilaku..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Widget Aktif
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingWidget ? 'Update' : 'Buat'} Widget
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Preview Widget: {previewWidget.name}
                </h2>
                <button
                  onClick={() => setPreviewWidget(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Desktop Preview */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <Monitor className="h-5 w-5 mr-2" />
                    Desktop Preview
                  </h3>
                  <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg p-4 h-96">
                    <div className="absolute inset-4 bg-white dark:bg-gray-800 rounded border">
                      {/* Simulated chat widget */}
                      <div 
                        className={`absolute w-16 h-16 rounded-full shadow-lg flex items-center justify-center cursor-pointer ${
                          previewWidget.position.includes('right') ? 'right-4' : 'left-4'
                        } ${
                          previewWidget.position.includes('bottom') ? 'bottom-4' : 'top-4'
                        }`}
                        style={{ backgroundColor: previewWidget.primary_color }}
                      >
                        <MessageSquare className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Preview */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <Smartphone className="h-5 w-5 mr-2" />
                    Mobile Preview
                  </h3>
                  <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg p-4 h-96 max-w-xs mx-auto">
                    <div className="absolute inset-4 bg-white dark:bg-gray-800 rounded border">
                      {/* Simulated mobile chat widget */}
                      <div 
                        className={`absolute w-12 h-12 rounded-full shadow-lg flex items-center justify-center cursor-pointer ${
                          previewWidget.position.includes('right') ? 'right-2' : 'left-2'
                        } ${
                          previewWidget.position.includes('bottom') ? 'bottom-2' : 'top-2'
                        }`}
                        style={{ backgroundColor: previewWidget.primary_color }}
                      >
                        <MessageSquare className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Embed Code */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <Code className="h-5 w-5 mr-2" />
                  Embed Code
                </h3>
                <div className="relative">
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{generateEmbedScript(previewWidget)}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(generateEmbedScript(previewWidget))}
                    className="absolute top-2 right-2 p-2 bg-gray-800 text-white rounded hover:bg-gray-700"
                    title="Copy to clipboard"
                  >
                    {copiedScript ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {fetcher.data && (
        <div className="mb-4">
          {fetcher.data.success ? (
            <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <p className="text-green-700 dark:text-green-400">
                Widget berhasil {editingWidget ? 'diupdate' : 'dibuat'}!
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

      {/* Widgets List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Widget Anda ({widgets.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {widgets.length === 0 ? (
            <div className="p-8 text-center">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Belum ada widget. Buat widget pertama Anda!
              </p>
            </div>
          ) : (
            widgets.map((widget) => (
              <div key={widget.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: widget.primary_color }}
                    >
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {widget.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Posisi: {positionOptions.find(p => p.value === widget.position)?.label} • 
                        Status: {widget.is_active ? 'Aktif' : 'Nonaktif'} • 
                        Dibuat: {formatDate(widget.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPreviewWidget(widget)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                      title="Preview widget"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(widget)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                      title="Edit widget"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(widget)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title="Hapus widget"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}