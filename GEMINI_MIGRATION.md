# Migration Guide: OpenAI to Gemini Embedding

This guide explains how to migrate from OpenAI embedding to Google Gemini embedding.

## Changes Made

### 1. Code Changes
- Updated `/app/lib/openai.ts` to use Google Gemini for both embedding and chat
- **Embedding**: Changed from `text-embedding-3-small` (1536 dimensions) to `text-embedding-004` (768 dimensions)
- **Chat**: Changed from `gpt-3.5-turbo` to `gemini-1.5-flash`
- Added `@google/generative-ai` package dependency

### 2. Environment Variables
Add to your `.env` file:
```
GOOGLE_API_KEY=your_google_gemini_api_key
```

Get your API key from: https://aistudio.google.com/app/apikey

### 3. Database Migration

**IMPORTANT**: The embedding dimensions changed from 1536 (OpenAI) to 768 (Gemini).

#### Option A: Fresh Start (Recommended)
If you don't have important data in knowledge_base:

1. Go to your Supabase SQL Editor
2. Run this command:
```sql
TRUNCATE TABLE knowledge_base;
ALTER TABLE knowledge_base ALTER COLUMN embedding TYPE vector(768);
```

#### Option B: Full Migration
If you want to keep existing data, you'll need to:

1. Export existing documents
2. Run the migration script: `migration-gemini-embedding.sql`
3. Re-upload documents to generate new embeddings

#### Migration Script
Run `migration-gemini-embedding.sql` in your Supabase SQL Editor:

```sql
-- This will update the database schema to support Gemini embeddings
-- See migration-gemini-embedding.sql for full script
```

## Benefits of Gemini Integration

### Embedding Benefits:
1. **Cost Effective**: Lower cost per token compared to OpenAI
2. **Performance**: Uses Matryoshka Representation Learning (MRL)
3. **Smaller Dimensions**: 768 vs 1536 (faster processing)

### Chat Benefits:
1. **Unified Platform**: Single API for both embedding and chat
2. **Better Context**: Gemini 1.5 Flash has excellent context understanding
3. **Cost Efficiency**: More affordable than GPT-3.5-turbo
4. **Performance**: Fast response times with good quality

## Testing

1. Start the development server: `npm run dev`
2. Navigate to Knowledge Base section
3. Upload a test document
4. Verify embedding generation works without errors

## Troubleshooting

### Error: "expected 1536 dimensions, not 768"
- You need to run the database migration
- The database still expects OpenAI dimensions

### Error: "API key not found"
- Make sure `GOOGLE_API_KEY` is set in your `.env` file
- Verify the API key is valid

### Error: "Model not found"
- Ensure you're using the correct model names:
  - Embedding: `text-embedding-004`
  - Chat: `gemini-1.5-flash`
- Check if the models are available in your region

## Rollback

To rollback to OpenAI:

1. Revert code changes in `openai.ts`
2. Update database schema back to `vector(1536)`
3. Remove `@google/generative-ai` dependency
4. Ensure `OPENAI_API_KEY` is set