-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- Nullable for OAuth users
  company_name VARCHAR(255) NOT NULL,
  client_id VARCHAR(50) UNIQUE NOT NULL,
  oauth_provider VARCHAR(50), -- 'google', 'github', etc.
  oauth_id VARCHAR(255), -- OAuth provider user ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create widget_configs table
CREATE TABLE IF NOT EXISTS widget_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id VARCHAR(50) NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'Default Widget',
  primary_color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  position VARCHAR(20) NOT NULL DEFAULT 'bottom-right',
  welcome_message TEXT DEFAULT 'Halo! Ada yang bisa saya bantu?',
  system_prompt TEXT DEFAULT 'Anda adalah asisten AI yang membantu menjawab pertanyaan.',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create knowledge_base table with vector embeddings
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id VARCHAR(50) NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id VARCHAR(50) NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
  widget_id UUID REFERENCES widget_configs(id) ON DELETE SET NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_client_id ON clients(client_id);
CREATE INDEX IF NOT EXISTS idx_widget_configs_client_id ON widget_configs(client_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_client_id ON knowledge_base(client_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_filename ON knowledge_base(filename);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_client_id ON chat_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_widget_id ON chat_sessions(widget_id);

-- Create vector similarity index for knowledge base
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function to search knowledge base using vector similarity
CREATE OR REPLACE FUNCTION search_knowledge_base(
  client_id TEXT,
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  content TEXT,
  filename TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.content,
    kb.filename,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE 
    kb.client_id = search_knowledge_base.client_id
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_clients_updated_at 
  BEFORE UPDATE ON clients 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widget_configs_updated_at 
  BEFORE UPDATE ON widget_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at 
  BEFORE UPDATE ON knowledge_base 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at 
  BEFORE UPDATE ON chat_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
-- You can run this after setting up the tables
/*
INSERT INTO clients (email, password_hash, company_name, client_id) VALUES 
('demo@example.com', '$2b$10$example_hash', 'Demo Company', 'client_demo123');

INSERT INTO widget_configs (client_id, name, primary_color, position, welcome_message) VALUES 
('client_demo123', 'Demo Widget', '#3B82F6', 'bottom-right', 'Halo! Selamat datang di demo chatbot kami!');
*/

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;