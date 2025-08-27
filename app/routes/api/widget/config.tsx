import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { requireAuth } from '~/lib/auth';
import { supabase } from '~/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface WidgetConfig {
  id?: string;
  client_id: string;
  name: string;
  primary_color: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  welcome_message: string;
  system_prompt: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// GET - Ambil semua widget config untuk client
export async function loader({ request }: LoaderFunctionArgs) {
  const user = requireAuth(request);
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  try {
    const { data: widgets, error } = await supabase
      .from('widget_configs')
      .select('*')
      .eq('client_id', user.client_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Gagal mengambil konfigurasi widget');
    }

    return Response.json({ widgets });
  } catch (error) {
    console.error('Widget config loader error:', error);
    return Response.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST/PUT/DELETE - Kelola widget config
export async function action({ request }: ActionFunctionArgs) {
  const user = requireAuth(request);
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;

    switch (action) {
      case 'create': {
        const name = formData.get('name') as string;
        const primaryColor = formData.get('primaryColor') as string;
        const position = formData.get('position') as WidgetConfig['position'];
        const welcomeMessage = formData.get('welcomeMessage') as string;
        const systemPrompt = formData.get('systemPrompt') as string;

        // Validasi input
        if (!name || !primaryColor || !position || !welcomeMessage || !systemPrompt) {
          return Response.json(
            { error: 'Semua field harus diisi' },
            { status: 400 }
          );
        }

        // Validasi warna hex
        const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexColorRegex.test(primaryColor)) {
          return Response.json(
            { error: 'Format warna tidak valid' },
            { status: 400 }
          );
        }

        // Validasi posisi
        const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
        if (!validPositions.includes(position)) {
          return Response.json(
            { error: 'Posisi widget tidak valid' },
            { status: 400 }
          );
        }

        const newWidget: WidgetConfig = {
          id: uuidv4(),
          client_id: user.client_id,
          name,
          primary_color: primaryColor,
          position,
          welcome_message: welcomeMessage,
          system_prompt: systemPrompt,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: widget, error } = await supabase
          .from('widget_configs')
          .insert(newWidget)
          .select()
          .single();

        if (error) {
          console.error('Widget create error:', error);
          return Response.json(
            { error: 'Gagal membuat widget' },
            { status: 500 }
          );
        }

        return Response.json({ success: true, widget });
      }

      case 'update': {
        const widgetId = formData.get('widgetId') as string;
        const name = formData.get('name') as string;
        const primaryColor = formData.get('primaryColor') as string;
        const position = formData.get('position') as WidgetConfig['position'];
        const welcomeMessage = formData.get('welcomeMessage') as string;
        const systemPrompt = formData.get('systemPrompt') as string;
        const isActive = formData.get('isActive') === 'true';

        if (!widgetId) {
          return Response.json(
            { error: 'Widget ID harus diisi' },
            { status: 400 }
          );
        }

        // Validasi input
        if (!name || !primaryColor || !position || !welcomeMessage || !systemPrompt) {
          return Response.json(
            { error: 'Semua field harus diisi' },
            { status: 400 }
          );
        }

        // Validasi warna hex
        const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexColorRegex.test(primaryColor)) {
          return Response.json(
            { error: 'Format warna tidak valid' },
            { status: 400 }
          );
        }

        // Validasi posisi
        const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
        if (!validPositions.includes(position)) {
          return Response.json(
            { error: 'Posisi widget tidak valid' },
            { status: 400 }
          );
        }

        const { data: widget, error } = await supabase
          .from('widget_configs')
          .update({
            name,
            primary_color: primaryColor,
            position,
            welcome_message: welcomeMessage,
            system_prompt: systemPrompt,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', widgetId)
          .eq('client_id', user.client_id)
          .select()
          .single();

        if (error) {
          console.error('Widget update error:', error);
          return Response.json(
            { error: 'Gagal memperbarui widget' },
            { status: 500 }
          );
        }

        return Response.json({ success: true, widget });
      }

      case 'delete': {
        const widgetId = formData.get('widgetId') as string;

        if (!widgetId) {
          return Response.json(
            { error: 'Widget ID harus diisi' },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from('widget_configs')
          .delete()
          .eq('id', widgetId)
          .eq('client_id', user.client_id);

        if (error) {
          console.error('Widget delete error:', error);
          return Response.json(
            { error: 'Gagal menghapus widget' },
            { status: 500 }
          );
        }

        return Response.json({ success: true });
      }

      case 'toggle': {
        const widgetId = formData.get('widgetId') as string;
        const isActive = formData.get('isActive') === 'true';

        if (!widgetId) {
          return Response.json(
            { error: 'Widget ID harus diisi' },
            { status: 400 }
          );
        }

        const { data: widget, error } = await supabase
          .from('widget_configs')
          .update({
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', widgetId)
          .eq('client_id', user.client_id)
          .select()
          .single();

        if (error) {
          console.error('Widget toggle error:', error);
          return Response.json(
            { error: 'Gagal mengubah status widget' },
            { status: 500 }
          );
        }

        return Response.json({ success: true, widget });
      }

      default:
        return Response.json(
          { error: 'Action tidak valid' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Widget config action error:', error);
    return Response.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// Export default untuk compatibility
export default function WidgetConfigAPI() {
  return null;
}