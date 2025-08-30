import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';

// For local development, we'll use the local Supabase instance
const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

async function createTestWidgetConfig() {
  try {
    // Generate new IDs
    const widgetId = uuidv4();
    const clientId = 'test_client_001';
    
    console.log('Creating widget config with:');
    console.log('Widget ID:', widgetId);
    console.log('Client ID:', clientId);
    
    // Create widget configuration
    const { data: widgetData, error: widgetError } = await supabase
      .from('widget_configs')
      .insert({
        id: widgetId,
        client_id: clientId,
        name: 'Test Widget',
        system_prompt: 'You are a helpful AI assistant.',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (widgetError) {
      console.error('Error creating widget config:', widgetError);
      return;
    }
    
    console.log('Widget config created successfully:', widgetData);
    
    // Update test-widget.html with the new IDs
    
    const testWidgetPath = path.join(__dirname, 'public', 'test-widget.html');
    let htmlContent = fs.readFileSync(testWidgetPath, 'utf8');
    
    // Replace placeholders
    htmlContent = htmlContent.replace('REPLACE_WITH_REAL_WIDGET_ID', widgetId);
    htmlContent = htmlContent.replace('REPLACE_WITH_REAL_CLIENT_ID', clientId);
    
    fs.writeFileSync(testWidgetPath, htmlContent);
    
    console.log('\ntest-widget.html updated successfully!');
    console.log('New Widget ID:', widgetId);
    console.log('New Client ID:', clientId);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestWidgetConfig();