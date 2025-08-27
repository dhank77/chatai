import { Form, Link, redirect, useActionData, useNavigation } from 'react-router';
import { registerUser } from '../../lib/auth';
import { isValidEmail, isValidPassword } from '../../lib/utils';

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Daftar Akun Baru
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Atau{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              login dengan akun yang sudah ada
            </Link>
          </p>
        </div>
        
        <Form className="mt-8 space-y-6" method="post">
          <div className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                Nama Perusahaan
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Nama Perusahaan"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Password (min. 8 karakter)"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Konfirmasi Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Konfirmasi Password"
              />
            </div>
          </div>

          {actionData?.error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{actionData.error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Memproses...' : 'Daftar'}
            </button>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Dengan mendaftar, Anda menyetujui syarat dan ketentuan penggunaan platform ini.
          </div>
        </Form>
      </div>
    </div>
  );
}