import { useState } from 'react';
import { type LoaderFunctionArgs, type ActionFunctionArgs, useLoaderData, useFetcher } from 'react-router';
import { requireAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { formatDate } from '~/lib/utils';
import { createSimpleJsonResponse as json } from '~/lib/helpers';
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
  clientId: string;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const user = requireAuth(request);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const action = formData.get('action') as string;

    if (action === 'create' || action === 'update') {
      const widgetId = formData.get('widgetId') as string;
      const name = formData.get('name') as string;
      const primaryColor = formData.get('primaryColor') as string;
      const position = formData.get('position') as string;
      const welcomeMessage = formData.get('welcomeMessage') as string;
      const systemPrompt = formData.get('systemPrompt') as string;
      const isActive = formData.get('isActive') === 'true';

      if (!name || !primaryColor || !position) {
        return json({ error: 'Name, primary color, dan position harus diisi' }, { status: 400 });
      }

      const widgetData = {
        client_id: user.client_id,
        name,
        primary_color: primaryColor,
        position,
        welcome_message: welcomeMessage || 'Halo! Ada yang bisa saya bantu?',
        system_prompt: systemPrompt || 'Anda adalah asisten AI yang membantu menjawab pertanyaan.',
        is_active: isActive,
        updated_at: new Date().toISOString()
      };

      if (action === 'create') {
        const { data, error } = await supabase
          .from('widget_configs')
          .insert(widgetData)
          .select()
          .single();

        if (error) {
          return json({ error: 'Gagal membuat widget config' }, { status: 500 });
        }

        return json({ success: true, widget: data });
      } else {
        // Update
        if (!widgetId) {
          return json({ error: 'Widget ID harus diisi untuk update' }, { status: 400 });
        }

        const { data, error } = await supabase
          .from('widget_configs')
          .update(widgetData)
          .eq('id', widgetId)
          .eq('client_id', user.client_id)
          .select()
          .single();

        if (error) {
          return json({ error: 'Gagal update widget config' }, { status: 500 });
        }

        return json({ success: true, widget: data });
      }
    }

    if (action === 'delete') {
      const widgetId = formData.get('widgetId') as string;

      if (!widgetId) {
        return json({ error: 'Widget ID harus diisi' }, { status: 400 });
      }

      const { error } = await supabase
        .from('widget_configs')
        .delete()
        .eq('id', widgetId)
        .eq('client_id', user.client_id);

      if (error) {
        return json({ error: 'Gagal menghapus widget config' }, { status: 500 });
      }

      return json({ success: true });
    }

    return json({ error: 'Action tidak valid' }, { status: 400 });
  } catch (error) {
    console.error('Widget config action error:', error);
    return json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
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

    return { widgets: widgets || [], clientId: user.client_id };
  } catch (error) {
    console.error('Widget config loader error:', error);
    return { widgets: [], clientId: user.client_id };
  }
}

export default function WidgetConfig() {
  const { widgets, clientId } = useLoaderData<LoaderData>();
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
      method: 'POST'
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
      method: 'POST'
    });
  };

  const generateEmbedScript = (widget: WidgetConfig) => {
    return `<!-- Chatbot Widget Script -->
<script>
  window.chatbotConfig = {
    widgetId: '${widget.id}',
    clientId: '${clientId}',
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex flex-1 min-h-0">
              {/* Form Section */}
              <div className="w-1/2 flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingWidget ? 'Edit Widget' : 'Buat Widget Baru'}
                  </h2>
                </div>
                
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                  </div>
                  
                  {/* Form Actions - Fixed at bottom */}
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
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
                  </div>
                </form>
              </div>
              
              {/* Preview Section */}
              <div className="w-1/2 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Preview Chat Widget
                  </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                
                {/* Chat Preview Container */}
                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg h-96 overflow-hidden">
                  {/* Chat Header */}
                  <div 
                    className="p-4 text-white flex items-center justify-between"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-medium">{formData.name || 'Chat Widget'}</h4>
                        <p className="text-xs opacity-90">Online</p>
                      </div>
                    </div>
                    <button className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1">
                      ✕
                    </button>
                  </div>
                  
                  {/* Chat Messages */}
                  <div className="p-4 space-y-3 h-64 overflow-y-auto">
                    {/* Welcome Message */}
                    <div className="flex items-start space-x-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: formData.primaryColor }}
                      >
                        <MessageSquare className="h-3 w-3 text-white" />
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 max-w-xs">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {formData.welcomeMessage || 'Halo! Ada yang bisa saya bantu?'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Sample User Message */}
                    <div className="flex items-start space-x-2 justify-end">
                      <div 
                        className="rounded-lg p-3 max-w-xs text-white"
                        style={{ backgroundColor: formData.primaryColor }}
                      >
                        <p className="text-sm">
                          Halo, saya butuh bantuan
                        </p>
                      </div>
                      <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs">U</span>
                      </div>
                    </div>
                    
                    {/* Sample Bot Response */}
                    <div className="flex items-start space-x-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: formData.primaryColor }}
                      >
                        <MessageSquare className="h-3 w-3 text-white" />
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 max-w-xs">
                        <p className="text-sm text-gray-900 dark:text-white">
                          Tentu! Saya siap membantu Anda. Apa yang bisa saya bantu hari ini?
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chat Input */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Ketik pesan..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled
                      />
                      <button 
                        className="p-2 rounded-lg text-white"
                        style={{ backgroundColor: formData.primaryColor }}
                        disabled
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Widget Position Preview */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Posisi Widget: {positionOptions.find(p => p.value === formData.position)?.label}
                  </h4>
                  <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg h-32 border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <div 
                      className={`absolute w-12 h-12 rounded-full shadow-lg flex items-center justify-center cursor-pointer ${
                        formData.position.includes('right') ? 'right-2' : 'left-2'
                      } ${
                        formData.position.includes('bottom') ? 'bottom-2' : 'top-2'
                      }`}
                      style={{ backgroundColor: formData.primaryColor }}
                    >
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Website Preview</span>
                    </div>
                  </div>
                </div>
                </div>
              </div>
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