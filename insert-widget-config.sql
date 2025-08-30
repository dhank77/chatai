-- Insert widget configuration that matches test-widget.html
INSERT INTO widget_configs (
    id,
    client_id,
    name,
    system_prompt,
    is_active,
    created_at,
    updated_at
) VALUES (
    '425549a7-ab15-4056-b240-99f3f7194226',
    'test_client_001',
    'Test Widget Configuration',
    'You are a helpful AI assistant. Please provide clear and concise answers to user questions.',
    true,
    NOW(),
    NOW()
);

-- Also insert a test client if it doesn't exist
INSERT INTO clients (
    email,
    company_name,
    client_id,
    created_at,
    updated_at
) VALUES (
    'test@example.com',
    'Test Company',
    'test_client_001',
    NOW(),
    NOW()
) ON CONFLICT (client_id) DO NOTHING;