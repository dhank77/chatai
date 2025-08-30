import { type ActionFunctionArgs } from 'react-router';
import { loginUser, registerUser } from '~/lib/auth';
import { createSimpleJsonResponse as json } from '~/lib/helpers';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get('action') as string;

  if (action === 'login') {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return json({ error: 'Email dan password harus diisi' }, { status: 400 });
    }

    try {
      const result = await loginUser(email, password);
      if (result.success) {
        return json({ 
          success: true, 
          token: result.token,
          user: result.user 
        });
      } else {
        return json({ error: result.error }, { status: 401 });
      }
    } catch (error) {
      return json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
  }

  if (action === 'register') {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!name || !email || !password || !confirmPassword) {
      return json({ error: 'Semua field harus diisi' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return json({ error: 'Password tidak cocok' }, { status: 400 });
    }

    try {
      const result = await registerUser(name, email, password);
      if (result.success) {
        return json({ 
          success: true, 
          token: result.token,
          user: result.user 
        });
      } else {
        return json({ error: result.error }, { status: 400 });
      }
    } catch (error) {
      return json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
  }

  return json({ error: 'Action tidak valid' }, { status: 400 });
}

// GET method untuk health check
export async function loader() {
  return json({ status: 'API Auth endpoint is working' });
}