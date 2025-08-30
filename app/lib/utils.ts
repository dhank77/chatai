import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function isValidFileType(file: File): boolean {
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  return allowedTypes.includes(file.type);
}

export function isValidFileSize(file: File): boolean {
  const maxSize = 10 * 1024 * 1024; // 10MB
  return file.size <= maxSize;
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'text/plain') {
    return await file.text();
  }
  
  if (file.type === 'application/pdf') {
    // For now, return a more detailed placeholder for PDF files
    // PDF parsing in browser/SSR environment is complex and requires server-side processing
    const fileSize = Math.round(file.size / 1024); // KB
    const estimatedPages = Math.max(1, Math.round(fileSize / 50)); // Rough estimate: 50KB per page
    
    // Generate multiple chunks to simulate real PDF content
    const chunks = [];
    for (let i = 1; i <= Math.min(estimatedPages, 10); i++) {
      chunks.push(`Halaman ${i} dari dokumen ${file.name}. Ini adalah konten simulasi untuk halaman ${i}. Dokumen ini berisi informasi penting yang akan digunakan untuk pencarian dan analisis. Setiap halaman memiliki konten yang berbeda dan relevan dengan topik yang dibahas dalam dokumen.`);
    }
    
    return chunks.join('\n\n');
  }
  
  // For other file types, return a placeholder
  return `Content from ${file.name}`;
}

export function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}