// Script to create a test widget configuration in the database
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestWidget() {
  try {
    // Create a test widget configuration
    const testWidget = {
      id: '550e8400-e29b-41d4-a716-446655440000', // Use the same ID as in test-widget.html
      client_id: 'client_test_001', // Use the same client_id as in test-widget.html
      name: 'Test Widget',
      primary_color: '#3B82F6',
      position: 'bottom-right',
      welcome_message: 'Halo! Ada yang bisa saya bantu?',
      system_prompt: 'Anda adalah asisten AI yang membantu menjawab pertanyaan.',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('widget_configs')
      .insert(testWidget)
      .select()
      .single();

    if (error) {
      console.error('Error creating test widget:', error);
      return;
    }

    console.log('Test widget created successfully:', data);
    
    // Also create a test user if needed
    const testUser = {
      id: uuidv4(),
      email: 'test@example.com',
      password_hash: '$2a$12$dummy.hash.for.testing', // Dummy hash
      company_name: 'Test Company',
      client_id: 'client_test_001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert(testUser, { onConflict: 'client_id' })
      .select()
      .single();

    if (userError) {
      console.error('Error creating test user:', userError);
    } else {
      console.log('Test user created/updated successfully:', userData);
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

createTestWidget();