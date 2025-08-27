import { Form, Link, redirect, useActionData, useNavigation } from 'react-router';
import { loginUser } from '../../lib/auth';
import { isValidEmail } from '../../lib/utils';

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Login ke Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Atau{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              daftar akun baru
            </Link>
          </p>
        </div>
        
        <Form className="mt-8 space-y-6" method="post">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
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
              {isSubmitting ? 'Memproses...' : 'Login'}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}