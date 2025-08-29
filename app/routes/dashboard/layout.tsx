import { Outlet, Link, useLocation, redirect } from 'react-router';
import { getUserFromToken } from '../../lib/auth';
import { 
  LayoutDashboard, 
  BookOpen, 
  Settings, 
  BarChart3, 
  Palette,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';

export async function loader({ request }: { request: Request }) {
  const cookieHeader = request.headers.get('Cookie');
  const authToken = cookieHeader
    ?.split(';')
    .find(c => c.trim().startsWith('auth-token='))
    ?.split('=')[1];

  if (!authToken) {
    return redirect('/login');
  }

  const user = await getUserFromToken(authToken);
  if (!user) {
    return redirect('/login');
  }

  return { user };
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Knowledge Base',
    href: '/dashboard/knowledge-base',
    icon: BookOpen,
  },
  {
    name: 'Widget Config',
    href: '/dashboard/widget-config',
    icon: Palette,
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export default function DashboardLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    // Clear auth cookie
    document.cookie = 'auth-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <Button
              variant="ghost"
              size="icon"
              className="ml-1 h-10 w-10 rounded-full text-white hover:bg-white/20"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <h1 className="text-xl font-bold text-gray-900">ChatAI Platform</h1>
            </div>
            <nav className="mt-5 space-y-1 px-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                      isActive
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="mr-4 h-6 w-6" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-gray-600 hover:text-gray-900"
            >
              <LogOut className="mr-4 h-6 w-6" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <h1 className="text-xl font-bold text-gray-900">ChatAI Platform</h1>
            </div>
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="mr-3 h-6 w-6" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-gray-600 hover:text-gray-900"
            >
              <LogOut className="mr-3 h-6 w-6" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white pl-1 pt-1 sm:pl-3 sm:pt-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-0.5 -mt-0.5 h-12 w-12 text-gray-500 hover:text-gray-900"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}