import { useState } from 'react';
import { type LoaderFunctionArgs, useLoaderData, useFetcher } from 'react-router';
import { requireAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import {
  Settings as SettingsIcon,
  User,
  Key,
  Bell,
  Shield,
  Palette,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  client_id: string;
  created_at: string;
}

interface LoaderData {
  user: UserProfile;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = requireAuth(request);
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  try {
    const { data: userData, error } = await supabase
      .from('clients')
      .select('*')
      .eq('client_id', user.client_id)
      .single();

    if (error) {
      throw new Error('Gagal mengambil data pengguna');
    }

    return { user: userData };
  } catch (error) {
    console.error('Settings loader error:', error);
    throw new Response('Internal Server Error', { status: 500 });
  }
}

export default function Settings() {
  const { user } = useLoaderData<LoaderData>();
  const fetcher = useFetcher();
  const [activeTab, setActiveTab] = useState('profile');
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [profileData, setProfileData] = useState({
    email: user.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    chatNotifications: true,
    weeklyReports: false,
    securityAlerts: true
  });

  const [apiSettings, setApiSettings] = useState({
    openaiApiKey: '',
    supabaseUrl: '',
    supabaseKey: ''
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('action', 'updateProfile');
    formData.append('email', profileData.email);
    if (profileData.newPassword) {
      formData.append('currentPassword', profileData.currentPassword);
      formData.append('newPassword', profileData.newPassword);
    }

    fetcher.submit(formData, {
      method: 'POST',
      action: '/api/settings'
    });
  };

  const handleNotificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('action', 'updateNotifications');
    formData.append('settings', JSON.stringify(notificationSettings));

    fetcher.submit(formData, {
      method: 'POST',
      action: '/api/settings'
    });
  };

  const handleApiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('action', 'updateApiSettings');
    formData.append('openaiApiKey', apiSettings.openaiApiKey);
    formData.append('supabaseUrl', apiSettings.supabaseUrl);
    formData.append('supabaseKey', apiSettings.supabaseKey);

    fetcher.submit(formData, {
      method: 'POST',
      action: '/api/settings'
    });
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'notifications', label: 'Notifikasi', icon: Bell },
    { id: 'api', label: 'API Settings', icon: Key },
    { id: 'security', label: 'Keamanan', icon: Shield }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pengaturan
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola akun dan preferensi Anda
        </p>
      </div>

      {/* Status Message */}
      {fetcher.data && (
        <div className="mb-4">
          {fetcher.data.success ? (
            <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <p className="text-green-700 dark:text-green-400">
                Pengaturan berhasil disimpan!
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Informasi Profil
                </h2>
                
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={user.client_id}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                    />
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      Ubah Password
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Password Saat Ini
                        </label>
                        <input
                          type="password"
                          value={profileData.currentPassword}
                          onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Password Baru
                        </label>
                        <input
                          type="password"
                          value={profileData.newPassword}
                          onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Konfirmasi Password Baru
                        </label>
                        <input
                          type="password"
                          value={profileData.confirmPassword}
                          onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Simpan Perubahan
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Pengaturan Notifikasi
                </h2>
                
                <form onSubmit={handleNotificationSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Notifikasi Email
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Terima notifikasi melalui email
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Notifikasi Chat
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Notifikasi untuk pesan chat baru
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.chatNotifications}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, chatNotifications: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Laporan Mingguan
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Terima ringkasan aktivitas mingguan
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.weeklyReports}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, weeklyReports: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Alert Keamanan
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Notifikasi untuk aktivitas keamanan
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.securityAlerts}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, securityAlerts: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Simpan Pengaturan
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* API Settings Tab */}
            {activeTab === 'api' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Pengaturan API
                </h2>
                
                <form onSubmit={handleApiSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      OpenAI API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiSettings.openaiApiKey}
                        onChange={(e) => setApiSettings({ ...apiSettings, openaiApiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Supabase URL
                    </label>
                    <input
                      type="url"
                      value={apiSettings.supabaseUrl}
                      onChange={(e) => setApiSettings({ ...apiSettings, supabaseUrl: e.target.value })}
                      placeholder="https://your-project.supabase.co"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Supabase Anon Key
                    </label>
                    <input
                      type="password"
                      value={apiSettings.supabaseKey}
                      onChange={(e) => setApiSettings({ ...apiSettings, supabaseKey: e.target.value })}
                      placeholder="eyJ..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Penting!
                        </h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          API keys akan disimpan dengan enkripsi. Pastikan untuk menggunakan environment variables di production.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Simpan API Settings
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Keamanan
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                          Akun Aman
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          Akun Anda menggunakan enkripsi dan autentikasi yang aman.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      Informasi Keamanan
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Akun dibuat</span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {new Date(user.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Login terakhir</span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          Hari ini
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Status keamanan</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          Aman
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      Tindakan Keamanan
                    </h3>
                    <div className="space-y-3">
                      <button className="w-full text-left p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              Logout dari semua perangkat
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Keluar dari semua sesi aktif
                            </p>
                          </div>
                          <Shield className="h-4 w-4 text-gray-400" />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}