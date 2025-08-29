import { Form, Link, redirect, useActionData, useNavigation } from 'react-router';
import { useState } from 'react';
import { loginUser } from '../../lib/auth';
import { isValidEmail } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Eye, EyeOff } from 'lucide-react';

export function meta() {
  return [
    { title: 'Login - ChatAI Platform' },
    { name: 'description', content: 'Login ke dashboard ChatAI Platform' },
  ];
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Validasi input
  if (!email || !password) {
    return {
      error: 'Email dan password harus diisi',
    };
  }

  if (!isValidEmail(email)) {
    return {
      error: 'Format email tidak valid',
    };
  }

  // Login user
  const result = await loginUser(email, password);

  if (!result.success) {
    return {
      error: result.error,
    };
  }

  // Set cookie dan redirect ke dashboard
  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    `auth-token=${result.token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`
  );

  return redirect('/dashboard', { headers });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Login ke Dashboard
          </CardTitle>
          <CardDescription className="text-center">
            Atau{' '}
            <Link
              to="/register"
              className="font-medium text-primary hover:underline"
            >
              daftar akun baru
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form className="space-y-4" method="post">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Masukkan email Anda"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Masukkan password Anda"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {actionData?.error && (
              <div className="rounded-md bg-destructive/15 p-3">
                <div className="text-sm text-destructive">{actionData.error}</div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Memproses...' : 'Login'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-muted-foreground">Atau</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/auth/callback`
                    }
                  });
                  
                  if (error) {
                    console.error('Google OAuth error:', error);
                    alert('Terjadi kesalahan saat login dengan Google');
                  }
                } catch (error) {
                  console.error('Google OAuth error:', error);
                  alert('Terjadi kesalahan saat login dengan Google');
                }
              }}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Login dengan Google
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}