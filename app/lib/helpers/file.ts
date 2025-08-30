import OpenAI from 'openai';
import type { FileUploadData } from '../types';

// Initialize OpenAI client
const openai = new OpenAI({
  baseURL: 'https://ai.sumopod.com/v1',
  apiKey: process.env.OPENAI_API_KEY || '',
});

// File validation constants
export const ALLOWED_FILE_TYPES = [
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// File validation functions
export function validateFileType(file: File): boolean {
  return ALLOWED_FILE_TYPES.includes(file.type);
}

export function validateFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

export function validateFile(file: File): { isValid: boolean; error?: string } {
  if (!validateFileType(file)) {
    return {
      isValid: false,
      error: 'File type not supported. Please upload TXT, PDF, DOC, or DOCX files.'
    };
  }

  if (!validateFileSize(file)) {
    return {
      isValid: false,
      error: 'File size too large. Maximum size is 10MB.'
    };
  }

  return { isValid: true };
}

// Text extraction functions
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;

  if (fileType === 'text/plain') {
    return await extractTextFromTxt(file);
  } else if (fileType === 'application/pdf') {
    return await extractTextFromPdf(file);
  } else if (
    fileType === 'application/msword' ||
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return await extractTextFromDoc(file);
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

async function extractTextFromTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = () => reject(new Error('Failed to read text file'));
    reader.readAsText(file);
  });
}

async function extractTextFromPdf(file: File): Promise<string> {
  // For PDF extraction, you would typically use a library like pdf-parse
  // For now, we'll throw an error indicating it needs implementation
  throw new Error('PDF text extraction not implemented. Please use a PDF parsing library.');
}

async function extractTextFromDoc(file: File): Promise<string> {
  // For DOC/DOCX extraction, you would typically use a library like mammoth
  // For now, we'll throw an error indicating it needs implementation
  throw new Error('DOC/DOCX text extraction not implemented. Please use a document parsing library.');
}

// Text chunking functions
export function createTextChunks(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    
    // If we're not at the end of the text, try to break at a sentence or word boundary
    if (end < text.length) {
      // Look for sentence boundary (. ! ?)
      const sentenceEnd = text.lastIndexOf('.', end);
      const exclamationEnd = text.lastIndexOf('!', end);
      const questionEnd = text.lastIndexOf('?', end);
      
      const sentenceBoundary = Math.max(sentenceEnd, exclamationEnd, questionEnd);
      
      if (sentenceBoundary > start + chunkSize * 0.5) {
        end = sentenceBoundary + 1;
      } else {
        // Look for word boundary
        const wordBoundary = text.lastIndexOf(' ', end);
        if (wordBoundary > start + chunkSize * 0.5) {
          end = wordBoundary;
        }
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start < 0) start = 0;
  }

  return chunks;
}

// Embedding generation
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map(text => generateEmbedding(text));
    const batchEmbeddings = await Promise.all(batchPromises);
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

// Complete file processing pipeline
export async function processFileForKnowledgeBase(file: File): Promise<{
  content: string;
  chunks: Array<{ content: string; embedding: number[] }>;
}> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Extract text
  const content = await extractTextFromFile(file);
  if (!content.trim()) {
    throw new Error('No text content found in file');
  }

  // Create chunks
  const textChunks = createTextChunks(content);
  if (textChunks.length === 0) {
    throw new Error('Failed to create text chunks');
  }

  // Generate embeddings
  const embeddings = await generateEmbeddings(textChunks);

  // Combine chunks with embeddings
  const chunks = textChunks.map((chunk, index) => ({
    content: chunk,
    embedding: embeddings[index]
  }));

  return {
    content,
    chunks
  };
}

// File size formatting utility
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// File extension utilities
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isTextFile(filename: string): boolean {
  const textExtensions = ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts'];
  const extension = getFileExtension(filename);
  return textExtensions.includes(extension);
}

export function isPdfFile(filename: string): boolean {
  return getFileExtension(filename) === 'pdf';
}

export function isDocFile(filename: string): boolean {
  const docExtensions = ['doc', 'docx'];
  const extension = getFileExtension(filename);
  return docExtensions.includes(extension);
}