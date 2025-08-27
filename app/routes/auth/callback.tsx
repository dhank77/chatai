import { redirect } from 'react-router';
import { supabase } from '../../lib/supabase';
import { createOrGetOAuthUser } from '../../lib/auth';

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    return redirect('/login?error=oauth_failed');
  }

  if (!code) {
    return redirect('/login?error=no_code');
  }

  try {
    // Exchange code for session
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return redirect('/login?error=session_failed');
    }

    const { user, session } = data;
    
    if (!user || !user.email) {
      return redirect('/login?error=no_user_data');
    }

    // Create or get OAuth user
    const companyName = user.user_metadata?.full_name || user.email.split('@')[0] + ' Company';
    const authResult = await createOrGetOAuthUser(
      user.email,
      'google',
      user.id,
      companyName
    );

    if (!authResult.success) {
      console.error('OAuth user creation failed:', authResult.error);
      return redirect('/login?error=user_creation_failed');
    }

    // Redirect to dashboard with our JWT token
    const response = redirect('/dashboard');
    
    // Set our JWT token as cookie
    if (authResult.token) {
      response.headers.set('Set-Cookie', `auth-token=${authResult.token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
    }
    
    return response;
  } catch (error) {
    console.error('Callback error:', error);
    return redirect('/login?error=callback_failed');
  }
}

export default function AuthCallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Memproses login...</p>
      </div>
    </div>
  );
}