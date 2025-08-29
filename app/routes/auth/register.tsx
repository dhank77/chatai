import { Form, Link, redirect, useActionData, useNavigation } from 'react-router';
import { useState } from 'react';
import { registerUser } from '../../lib/auth';
import { isValidEmail, isValidPassword } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Eye, EyeOff } from 'lucide-react';

export function meta() {
  return [
    { title: 'Register - ChatAI Platform' },
    { name: 'description', content: 'Daftar akun baru ChatAI Platform' },
  ];
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const companyName = formData.get('companyName') as string;

  // Validasi input
  if (!email || !password || !confirmPassword || !companyName) {
    return {
      error: 'Semua field harus diisi',
    };
  }

  if (!isValidEmail(email)) {
    return {
      error: 'Format email tidak valid',
    };
  }

  if (!isValidPassword(password)) {
    return {
      error: 'Password minimal 8 karakter dengan kombinasi huruf dan angka',
    };
  }

  if (password !== confirmPassword) {
    return {
      error: 'Konfirmasi password tidak cocok',
    };
  }

  if (companyName.length < 2) {
    return {
      error: 'Nama perusahaan minimal 2 karakter',
    };
  }

  // Register user
  const result = await registerUser(email, password, companyName);

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

export default function Register() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Daftar Akun Baru
          </CardTitle>
          <CardDescription className="text-center">
            Atau{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              login dengan akun yang sudah ada
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form className="space-y-4" method="post">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nama Perusahaan</Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                required
                placeholder="Masukkan nama perusahaan"
              />
            </div>
            
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
                  autoComplete="new-password"
                  required
                  placeholder="Password (min. 8 karakter)"
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
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Konfirmasi password Anda"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
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
              {isSubmitting ? 'Memproses...' : 'Daftar'}
            </Button>
            
            <div className="text-xs text-muted-foreground text-center">
              Dengan mendaftar, Anda menyetujui syarat dan ketentuan penggunaan platform ini.
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}