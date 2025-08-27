import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

export interface User {
  id: string;
  email: string;
  company_name: string;
  client_id: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      client_id: user.client_id,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Generate unique client ID
export function generateClientId(): string {
  return 'client_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Register new user
export async function registerUser(
  email: string,
  password: string,
  companyName: string
): Promise<AuthResult> {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('clients')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return {
        success: false,
        error: 'Email sudah terdaftar'
      };
    }

    // Hash password and generate client ID
    const hashedPassword = await hashPassword(password);
    const clientId = generateClientId();

    // Insert new user
    const { data: newUser, error } = await supabase
      .from('clients')
      .insert({
        email,
        password_hash: hashedPassword,
        company_name: companyName,
        client_id: clientId,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: 'Gagal membuat akun'
      };
    }

    const user: User = {
      id: newUser.id,
      email: newUser.email,
      company_name: newUser.company_name,
      client_id: newUser.client_id,
    };

    const token = generateToken(user);

    // Create default widget config
    await supabase.from('widget_configs').insert({
      client_id: clientId,
      theme_color: '#3B82F6',
      bot_name: 'Assistant',
      bot_avatar: '',
      position: 'bottom-right',
      welcome_message: 'Halo! Ada yang bisa saya bantu?',
    });

    return {
      success: true,
      user,
      token
    };
  } catch (error) {
    return {
      success: false,
      error: 'Terjadi kesalahan server'
    };
  }
}

// Login user
export async function loginUser(email: string, password: string): Promise<AuthResult> {
  try {
    // Get user from database
    const { data: userData, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !userData) {
      return {
        success: false,
        error: 'Email atau password salah'
      };
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, userData.password_hash);
    if (!isValidPassword) {
      return {
        success: false,
        error: 'Email atau password salah'
      };
    }

    const user: User = {
      id: userData.id,
      email: userData.email,
      company_name: userData.company_name,
      client_id: userData.client_id,
    };

    const token = generateToken(user);

    return {
      success: true,
      user,
      token
    };
  } catch (error) {
    return {
      success: false,
      error: 'Terjadi kesalahan server'
    };
  }
}

// Get user from token
export async function getUserFromToken(token: string): Promise<User | null> {
  try {
    const decoded = verifyToken(token);
    if (!decoded) return null;

    const { data: userData, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !userData) return null;

    return {
      id: userData.id,
      email: userData.email,
      company_name: userData.company_name,
      client_id: userData.client_id,
    };
  } catch (error) {
    return null;
  }
}

// Middleware untuk proteksi route
export function requireAuth(request: Request): User | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return null;
  }

  return {
    id: decoded.id,
    email: decoded.email,
    company_name: decoded.company_name || '',
    client_id: decoded.client_id,
  };
}