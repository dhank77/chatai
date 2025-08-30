import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"

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
    try {
      // Create a temporary file path for the PDF
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Create a temporary file using Node.js fs (server-side only)
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${file.name}`);
      
      // Write the file to temporary location
      fs.writeFileSync(tempFilePath, uint8Array);
      
      try {
        // Use LangChain PDFLoader to extract text
        const loader = new PDFLoader(tempFilePath);
        const docs = await loader.load();
        
        // Combine all pages into a single text
        const extractedText = docs.map(doc => doc.pageContent).join('\n\n');
        
        // Clean up temporary file
        fs.unlinkSync(tempFilePath);
        
        return extractedText || `Content from ${file.name}`;
      } catch (pdfError) {
        // Clean up temporary file on error
        try {
          fs.unlinkSync(tempFilePath);
        } catch {}
        
        console.error('PDF extraction error:', pdfError);
        // Fallback to placeholder if PDF extraction fails
        return `Content from ${file.name} (PDF extraction failed)`;
      }
    } catch (error) {
      console.error('File processing error:', error);
      // Fallback to placeholder if file processing fails
      return `Content from ${file.name} (processing failed)`;
    }
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