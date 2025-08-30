// Authentication helper functions
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase';
import { createErrorResponse } from './response';

export interface AuthUser {
  client_id: string;
  email: string;
  created_at?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

/**
 * Extract auth token from request headers
 */
export function extractAuthToken(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  return cookieHeader
    ?.split(';')
    .find(c => c.trim().startsWith('auth-token='))
    ?.split('=')[1] || null;
}

/**
 * Verify JWT token and get user info
 */
export async function verifyAuthToken(token: string): Promise<AuthUser | null> {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not found in environment variables');
      return null;
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    return {
      client_id: decoded.client_id,
      email: decoded.email
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Require authentication for a request
 */
export async function requireAuthentication(request: Request): Promise<AuthUser | Response> {
  const token = extractAuthToken(request);
  
  if (!token) {
    return createErrorResponse('Unauthorized - No token provided', 401);
  }

  const user = await verifyAuthToken(token);
  if (!user) {
    return createErrorResponse('Unauthorized - Invalid token', 401);
  }

  return user;
}

/**
 * Generate JWT token for user
 */
export function generateAuthToken(user: AuthUser): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not found in environment variables');
  }

  return jwt.sign(
    {
      client_id: user.client_id,
      email: user.email
    },
    jwtSecret,
    { expiresIn: '7d' }
  );
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate unique client ID
 */
export function generateClientId(): string {
  return uuidv4();
}

/**
 * Login user with email and password
 */
export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  try {
    // Find user in database
    const { data: user, error: userError } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return {
        success: false,
        error: 'Email atau password salah'
      };
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Email atau password salah'
      };
    }

    // Update last login
    await supabase
      .from('clients')
      .update({ updated_at: new Date().toISOString() })
      .eq('client_id', user.client_id);

    // Generate token
    const authUser: AuthUser = {
      client_id: user.client_id,
      email: user.email,
      created_at: user.created_at
    };

    const token = generateAuthToken(authUser);

    return {
      success: true,
      user: authUser,
      token
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Terjadi kesalahan server'
    };
  }
}

/**
 * Register new user
 */
export async function registerUser(email: string, password: string, companyName?: string): Promise<AuthResult> {
  try {
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('clients')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return {
        success: false,
        error: 'Email sudah terdaftar'
      };
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const clientId = generateClientId();

    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from('clients')
      .insert({
        client_id: clientId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        company_name: companyName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('User registration error:', insertError);
      return {
        success: false,
        error: 'Gagal membuat akun. Silakan coba lagi.'
      };
    }

    // Generate token
    const authUser: AuthUser = {
      client_id: newUser.client_id,
      email: newUser.email,
      created_at: newUser.created_at
    };

    const token = generateAuthToken(authUser);

    return {
      success: true,
      user: authUser,
      token
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: 'Terjadi kesalahan server'
    };
  }
}