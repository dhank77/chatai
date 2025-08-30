-- Migration to update embedding dimensions from OpenAI (1536) to Gemini (768)
-- Run this script in your Supabase SQL editor

-- Drop existing vector index
DROP INDEX IF EXISTS idx_knowledge_base_embedding;

-- Drop existing search function
DROP FUNCTION IF EXISTS search_knowledge_base(TEXT, vector(1536), FLOAT, INT);

-- Clear existing data (optional - remove this line if you want to keep existing data)
-- TRUNCATE TABLE knowledge_base;

-- Alter the embedding column to use 768 dimensions
ALTER TABLE knowledge_base ALTER COLUMN embedding TYPE vector(768);

-- Recreate vector similarity index for knowledge base
CREATE INDEX idx_knowledge_base_embedding ON knowledge_base 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Recreate function to search knowledge base using vector similarity
CREATE OR REPLACE FUNCTION search_knowledge_base(
  client_id TEXT,
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  content TEXT,
  filename VARCHAR(255),
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

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'knowledge_base' AND column_name = 'embedding';