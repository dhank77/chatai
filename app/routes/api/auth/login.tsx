import { type ActionFunctionArgs } from 'react-router';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '~/lib/supabase';
import { isValidEmail } from '~/lib/utils';

interface LoginRequest {
  email: string;
  password: string;
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Validasi input
    if (!email || !password) {
      return Response.json(
        { error: 'Email dan password harus diisi' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        { error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    // Cari user di database
    const { data: user, error: userError } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return Response.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return Response.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET tidak ditemukan di environment variables');
      return Response.json(
        { error: 'Konfigurasi server tidak valid' },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        client_id: user.client_id,
        email: user.email
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Update last login
    await supabase
      .from('clients')
      .update({ updated_at: new Date().toISOString() })
      .eq('client_id', user.client_id);

    // Set cookie dan return response
    const response = Response.json(
      {
        success: true,
        user: {
          client_id: user.client_id,
          email: user.email,
          created_at: user.created_at
        }
      },
      { status: 200 }
    );

    // Set HTTP-only cookie
    response.headers.set(
      'Set-Cookie',
      `auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`
    );

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// Export default untuk compatibility
export default function LoginAPI() {
  return null;
}