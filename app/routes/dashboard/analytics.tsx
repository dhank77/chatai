import { type LoaderFunctionArgs, useLoaderData } from 'react-router';
import { requireAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { formatDate } from '~/lib/utils';
import {
  BarChart3,
  MessageSquare,
  Users,
  TrendingUp,
  Calendar,
  Clock,
  Activity,
  Download
} from 'lucide-react';

interface ChatStats {
  total_sessions: number;
  total_messages: number;
  avg_messages_per_session: number;
  active_sessions_today: number;
}

interface DailyStats {
  date: string;
  sessions: number;
  messages: number;
}

interface PopularQuestions {
  question: string;
  count: number;
}

interface LoaderData {
  chatStats: ChatStats;
  dailyStats: DailyStats[];
  popularQuestions: PopularQuestions[];
  responseTimeStats: {
    avg_response_time: number;
    fast_responses: number;
    slow_responses: number;
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = requireAuth(request);
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  try {
    // Get chat statistics
    const { data: chatStatsData } = await supabase
      .from('chat_sessions')
      .select('id, messages, created_at')
      .eq('client_id', user.client_id);

    const totalSessions = chatStatsData?.length || 0;
    const totalMessages = chatStatsData?.reduce((sum, session) => {
      const messages = Array.isArray(session.messages) ? session.messages : [];
      return sum + messages.length;
    }, 0) || 0;
    const avgMessagesPerSession = totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0;
    
    // Sessions today
    const today = new Date().toISOString().split('T')[0];
    const activeSessionsToday = chatStatsData?.filter(session => 
      session.created_at.startsWith(today)
    ).length || 0;

    const chatStats: ChatStats = {
      total_sessions: totalSessions,
      total_messages: totalMessages,
      avg_messages_per_session: avgMessagesPerSession,
      active_sessions_today: activeSessionsToday
    };

    // Get daily stats for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyStats: DailyStats[] = last7Days.map(date => {
      const sessionsOnDate = chatStatsData?.filter(session => 
        session.created_at.startsWith(date)
      ) || [];
      
      return {
        date,
        sessions: sessionsOnDate.length,
        messages: sessionsOnDate.reduce((sum, session) => {
          const messages = Array.isArray(session.messages) ? session.messages : [];
          return sum + messages.length;
        }, 0)
      };
    });

    // Mock popular questions (in real app, you'd analyze actual chat messages)
    const popularQuestions: PopularQuestions[] = [
      { question: 'Bagaimana cara menggunakan produk ini?', count: 45 },
      { question: 'Apa saja fitur yang tersedia?', count: 32 },
      { question: 'Berapa harga produk ini?', count: 28 },
      { question: 'Bagaimana cara menghubungi support?', count: 21 },
      { question: 'Apakah ada trial gratis?', count: 18 }
    ];

    // Mock response time stats
    const responseTimeStats = {
      avg_response_time: 1.2, // seconds
      fast_responses: 85, // percentage
      slow_responses: 15 // percentage
    };

    return {
      chatStats,
      dailyStats,
      popularQuestions,
      responseTimeStats
    };
  } catch (error) {
    console.error('Analytics loader error:', error);
    return {
      chatStats: {
        total_sessions: 0,
        total_messages: 0,
        avg_messages_per_session: 0,
        active_sessions_today: 0
      },
      dailyStats: [],
      popularQuestions: [],
      responseTimeStats: {
        avg_response_time: 0,
        fast_responses: 0,
        slow_responses: 0
      }
    };
  }
}

export default function Analytics() {
  const { chatStats, dailyStats, popularQuestions, responseTimeStats } = useLoaderData<LoaderData>();

  const exportData = () => {
    const data = {
      chatStats,
      dailyStats,
      popularQuestions,
      responseTimeStats,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const maxSessions = Math.max(...dailyStats.map(d => d.sessions), 1);
  const maxMessages = Math.max(...dailyStats.map(d => d.messages), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analisis performa dan penggunaan chatbot
          </p>
        </div>
        <button
          onClick={exportData}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Sesi Chat
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {chatStats.total_sessions.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Pesan
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {chatStats.total_messages.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Rata-rata Pesan/Sesi
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {chatStats.avg_messages_per_session}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Sesi Hari Ini
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {chatStats.active_sessions_today}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Aktivitas 7 Hari Terakhir
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dailyStats.map((day, index) => (
                <div key={day.date} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatDate(day.date)}
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {day.sessions} sesi, {day.messages} pesan
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(day.sessions / maxSessions) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(day.messages / maxMessages) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
                <span className="text-gray-600 dark:text-gray-400">Sesi</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                <span className="text-gray-600 dark:text-gray-400">Pesan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Response Time Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Waktu Respons
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {responseTimeStats.avg_response_time}s
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Rata-rata waktu respons
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Respons Cepat (&lt;2s)</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {responseTimeStats.fast_responses}%
                  </span>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${responseTimeStats.fast_responses}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Respons Lambat (&gt;2s)</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {responseTimeStats.slow_responses}%
                  </span>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${responseTimeStats.slow_responses}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Questions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Pertanyaan Populer
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {popularQuestions.map((question, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-gray-900 dark:text-white">
                    {question.question}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {question.count} kali
                  </span>
                  <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(question.count / popularQuestions[0].count) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time-based Analytics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Analisis Waktu
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                09:00 - 17:00
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Jam tersibuk
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                Senin - Jumat
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Hari tersibuk
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                75%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tingkat kepuasan
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}