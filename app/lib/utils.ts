import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility untuk menggabungkan class names
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format tanggal
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password (minimal 8 karakter, ada huruf dan angka)
export function isValidPassword(password: string): boolean {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
}

// Generate random color
export function generateRandomColor(): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // emerald
    '#8B5CF6', // violet
    '#F59E0B', // amber
    '#EF4444', // red
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#F97316', // orange
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Extract text from different file types
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  
  if (fileType === 'text/plain') {
    return await file.text();
  }
  
  if (fileType === 'application/pdf') {
    // For PDF files, we'll need to use pdf-parse on the server side
    // This is just a placeholder for the client side
    throw new Error('PDF processing harus dilakukan di server side');
  }
  
  if (fileType.startsWith('text/')) {
    return await file.text();
  }
  
  throw new Error('Tipe file tidak didukung');
}

// Validate file type
export function isValidFileType(file: File): boolean {
  const allowedTypes = [
    'text/plain',
    'application/pdf',
    'text/markdown',
    'text/csv',
    'application/json'
  ];
  
  return allowedTypes.includes(file.type);
}

// Validate file size (max 10MB)
export function isValidFileSize(file: File): boolean {
  const maxSize = 10 * 1024 * 1024; // 10MB
  return file.size <= maxSize;
}

// Generate session ID
export function generateSessionId(): string {
  return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Calculate cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Split text into chunks for embedding
export function splitTextIntoChunks(text: string, maxChunkSize: number = 1000): string[] {
  const sentences = text.split(/[.!?]+/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;
    
    if (currentChunk.length + trimmedSentence.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
    }
    
    currentChunk += trimmedSentence + '. ';
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}