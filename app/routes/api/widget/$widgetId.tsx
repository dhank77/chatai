import { type LoaderFunctionArgs } from 'react-router';
import { supabase } from '~/lib/supabase';
import { createSimpleJsonResponse as json } from '~/lib/helpers';

// Public endpoint untuk mengambil konfigurasi widget
// Tidak memerlukan autentikasi karena digunakan oleh widget di website publik
export async function loader({ params, request }: LoaderFunctionArgs) {
  try {
    const { widgetId } = params;
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId');

    if (!widgetId) {
      return json({ error: 'Widget ID is required' }, { status: 400 });
    }

    if (!clientId) {
      return json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Ambil konfigurasi widget yang aktif
    const { data: widget, error } = await supabase
      .from('widget_configs')
      .select('id, name, primary_color, position, welcome_message, system_prompt, is_active')
      .eq('id', widgetId)
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return json({ error: 'Widget not found or inactive' }, { status: 404 });
      }
      console.error('Widget config fetch error:', error);
      return json({ error: 'Failed to fetch widget configuration' }, { status: 500 });
    }

    // Return konfigurasi widget untuk digunakan oleh widget
    return json({
      success: true,
      config: {
        widgetId: widget.id,
        clientId,
        primaryColor: widget.primary_color,
        position: widget.position,
        welcomeMessage: widget.welcome_message,
        systemPrompt: widget.system_prompt,
        title: widget.name
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Widget config API error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle CORS preflight requests
export async function options() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}