import { type ActionFunctionArgs } from 'react-router';
import { supabase } from '~/lib/supabase';
import { requireAuth } from '~/lib/auth';

// Helper function to create JSON responses
function json(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Authenticate user
    const user = requireAuth(request);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const action = formData.get('action') as string;

    if (action === 'create' || action === 'update') {
      const widgetId = formData.get('widgetId') as string;
      const name = formData.get('name') as string;
      const primaryColor = formData.get('primaryColor') as string;
      const position = formData.get('position') as string;
      const welcomeMessage = formData.get('welcomeMessage') as string;
      const systemPrompt = formData.get('systemPrompt') as string;
      const isActive = formData.get('isActive') === 'true';

      if (!name || !primaryColor || !position) {
        return json({ error: 'Name, primary color, dan position harus diisi' }, { status: 400 });
      }

      const widgetData = {
        client_id: user.client_id,
        name,
        primary_color: primaryColor,
        position,
        welcome_message: welcomeMessage || 'Halo! Ada yang bisa saya bantu?',
        system_prompt: systemPrompt || 'Anda adalah asisten AI yang membantu menjawab pertanyaan.',
        is_active: isActive,
        updated_at: new Date().toISOString()
      };

      if (action === 'create') {
        const { data, error } = await supabase
          .from('widget_configs')
          .insert(widgetData)
          .select()
          .single();

        if (error) {
          return json({ error: 'Gagal membuat widget config' }, { status: 500 });
        }

        return json({ success: true, widget: data });
      } else {
        // Update
        if (!widgetId) {
          return json({ error: 'Widget ID harus diisi untuk update' }, { status: 400 });
        }

        const { data, error } = await supabase
          .from('widget_configs')
          .update(widgetData)
          .eq('id', widgetId)
          .eq('client_id', user.client_id)
          .select()
          .single();

        if (error) {
          return json({ error: 'Gagal update widget config' }, { status: 500 });
        }

        return json({ success: true, widget: data });
      }
    }

    if (action === 'delete') {
      const widgetId = formData.get('widgetId') as string;

      if (!widgetId) {
        return json({ error: 'Widget ID harus diisi' }, { status: 400 });
      }

      const { error } = await supabase
        .from('widget_configs')
        .delete()
        .eq('id', widgetId)
        .eq('client_id', user.client_id);

      if (error) {
        return json({ error: 'Gagal menghapus widget config' }, { status: 500 });
      }

      return json({ success: true });
    }

    return json({ error: 'Action tidak valid' }, { status: 400 });
  } catch (error) {
    console.error('Widget config API error:', error);
    return json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// GET method untuk mendapatkan widget configurations
export async function loader({ request }: ActionFunctionArgs) {
  try {
    // Authenticate user
    const user = requireAuth(request);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const widgetId = url.searchParams.get('widgetId');

    if (widgetId) {
      // Get specific widget
      const { data, error } = await supabase
        .from('widget_configs')
        .select('*')
        .eq('id', widgetId)
        .eq('client_id', user.client_id)
        .single();

      if (error) {
        return json({ error: 'Widget tidak ditemukan' }, { status: 404 });
      }

      return json({ success: true, widget: data });
    } else {
      // Get all widgets for user
      const { data, error } = await supabase
        .from('widget_configs')
        .select('*')
        .eq('client_id', user.client_id)
        .order('created_at', { ascending: false });

      if (error) {
        return json({ error: 'Gagal mengambil widget configs' }, { status: 500 });
      }

      return json({ success: true, widgets: data });
    }
  } catch (error) {
    console.error('Get widget config error:', error);
    return json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}