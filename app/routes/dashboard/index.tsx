import { useLoaderData } from 'react-router';
import { supabase } from '../../lib/supabase';
import { getKnowledgeBaseStats } from '../../lib/openai';
import { formatDate } from '../../lib/utils';
import { 
  BookOpen, 
  MessageSquare, 
  Users, 
  TrendingUp,
  FileText,
  Database,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

export async function loader({ request }: { request: Request }) {
  const cookieHeader = request.headers.get('Cookie');
  const authToken = cookieHeader
    ?.split(';')
    .find(c => c.trim().startsWith('auth-token='))
    ?.split('=')[1];

  if (!authToken) {
    throw new Response('Unauthorized', { status: 401 });
  }

  // Get user info from token (simplified - in real app, decode JWT)
  // For now, we'll get client_id from a mock user
  const clientId = 'client_demo'; // This should come from JWT token

  // Get knowledge base stats
  const kbStats = await getKnowledgeBaseStats(clientId);

  // Get chat sessions count
  const { data: chatSessions, error: chatError } = await supabase
    .from('chat_sessions')
    .select('id, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get recent chat sessions for today
  const today = new Date().toISOString().split('T')[0];
  const { data: todaySessions } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('client_id', clientId)
    .gte('created_at', today);

  // Get widget config
  const { data: widgetConfig } = await supabase
    .from('widget_configs')
    .select('*')
    .eq('client_id', clientId)
    .single();

  return {
    clientId,
    stats: {
      totalDocuments: kbStats.totalDocuments,
      totalChunks: kbStats.totalChunks,
      totalChats: chatSessions?.length || 0,
      todayChats: todaySessions?.length || 0,
    },
    recentChats: chatSessions || [],
    widgetConfig,
  };
}

export function meta() {
  return [
    { title: 'Dashboard - ChatAI Platform' },
    { name: 'description', content: 'Dashboard overview ChatAI Platform' },
  ];
}

export default function Dashboard() {
  const { clientId, stats, recentChats, widgetConfig } = useLoaderData<typeof loader>();

  const statCards = [
    {
      name: 'Total Dokumen',
      value: stats.totalDocuments,
      icon: FileText,
      color: 'bg-blue-500',
      description: 'Dokumen di knowledge base'
    },
    {
      name: 'Total Chunks',
      value: stats.totalChunks,
      icon: Database,
      color: 'bg-green-500',
      description: 'Chunks untuk embedding'
    },
    {
      name: 'Chat Hari Ini',
      value: stats.todayChats,
      icon: MessageSquare,
      color: 'bg-yellow-500',
      description: 'Percakapan hari ini'
    },
    {
      name: 'Total Chat',
      value: stats.totalChats,
      icon: TrendingUp,
      color: 'bg-purple-500',
      description: 'Total percakapan'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Selamat datang di ChatAI Platform. Client ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{clientId}</code>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 ${stat.color} rounded-md flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                    <dd className="text-xs text-gray-400">
                      {stat.description}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Widget Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  {widgetConfig?.bot_name || 'Assistant'}
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  {widgetConfig?.welcome_message || 'Halo! Ada yang bisa saya bantu?'}
                </p>
                <div 
                  className="inline-block px-3 py-1 rounded-full text-xs text-white"
                  style={{ backgroundColor: widgetConfig?.theme_color || '#3B82F6' }}
                >
                  Theme Color
                </div>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-500">
                Embed code untuk website Anda:
              </p>
              <code className="block mt-2 p-2 bg-gray-100 rounded text-xs break-all">
                {`<script src="https://cdn.domainku.com/chatbot.js" data-client-id="${clientId}"></script>`}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Recent Chats */}
        <Card>
          <CardHeader>
            <CardTitle>Percakapan Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {recentChats.length > 0 ? (
              <div className="space-y-3">
                {recentChats.slice(0, 5).map((chat) => (
                  <div key={chat.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Chat Session
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(chat.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      #{chat.id.slice(-6)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h4 className="mt-2 text-sm font-medium text-gray-900">
                  Belum ada percakapan
                </h4>
                <p className="mt-1 text-sm text-gray-500">
                  Percakapan akan muncul di sini setelah widget digunakan.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a
              href="/dashboard/knowledge-base"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <BookOpen className="w-8 h-8 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">Upload Dokumen</h4>
              <p className="text-sm text-gray-500 mt-1">
                Tambah dokumen ke knowledge base
              </p>
            </a>
            
            <a
              href="/dashboard/widget-config"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <Settings className="w-8 h-8 text-green-600 mb-2" />
              <h4 className="font-medium text-gray-900">Konfigurasi Widget</h4>
              <p className="text-sm text-gray-500 mt-1">
                Sesuaikan tampilan chatbot
              </p>
            </a>
            
            <a
              href="/dashboard/analytics"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
              <h4 className="font-medium text-gray-900">Lihat Analytics</h4>
              <p className="text-sm text-gray-500 mt-1">
                Analisis performa chatbot
              </p>
            </a>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}