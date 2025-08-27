import { type ActionFunctionArgs } from 'react-router';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '~/lib/supabase';
import { isValidEmail, isValidPassword } from '~/lib/utils';

interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Validasi input
    if (!email || !password || !confirmPassword) {
      return Response.json(
        { error: 'Semua field harus diisi' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        { error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    if (!isValidPassword(password)) {
      return Response.json(
        { error: 'Password harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, dan angka' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return Response.json(
        { error: 'Konfirmasi password tidak cocok' },
        { status: 400 }
      );
    }

    // Cek apakah email sudah terdaftar
    const { data: existingUser, error: checkError } = await supabase
      .from('clients')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return Response.json(
        { error: 'Email sudah terdaftar' },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate client ID
    const clientId = uuidv4();

    // Simpan user baru ke database
    const { data: newUser, error: insertError } = await supabase
      .from('clients')
      .insert({
        client_id: clientId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return Response.json(
        { error: 'Gagal membuat akun. Silakan coba lagi.' },
        { status: 500 }
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
        client_id: newUser.client_id,
        email: newUser.email
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Return response dengan cookie
    const response = Response.json(
      {
        success: true,
        user: {
          client_id: newUser.client_id,
          email: newUser.email,
          created_at: newUser.created_at
        }
      },
      { status: 201 }
    );

    // Set HTTP-only cookie
    response.headers.set(
      'Set-Cookie',
      `auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`
    );

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return Response.json(
      { error: `Terjadi kesalahan server ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

// Export default untuk compatibility
export default function RegisterAPI() {
  return null;
}