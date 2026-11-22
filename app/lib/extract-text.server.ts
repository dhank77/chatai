// Server-only text extraction for knowledge-base uploads. Works fully in memory (no temp files).
// pdf-parse is imported from its lib entry: the package index runs a debug self-test that
// tries to read a test PDF when loaded as ESM.
// @ts-expect-error - no type declarations for the lib entry
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

export class UnsupportedFileError extends Error {}

const ext = (name: string) => name.toLowerCase().split('.').pop() || '';

export const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md', 'csv', 'json'];

export function isSupportedFile(file: File): boolean {
  return SUPPORTED_EXTENSIONS.includes(ext(file.name));
}

/** Returns the document text, or throws with a user-facing Indonesian message. */
export async function extractTextFromFile(file: File): Promise<string> {
  const type = ext(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  let text = '';

  switch (type) {
    case 'pdf': {
      try {
        const result = await pdfParse(buffer);
        text = result.text || '';
      } catch (error) {
        console.error('PDF extraction error:', error);
        throw new UnsupportedFileError('PDF tidak bisa dibaca (rusak atau terkunci password).');
      }
      if (!text.trim()) {
        throw new UnsupportedFileError('PDF tidak berisi teks (kemungkinan hasil scan/gambar). Gunakan PDF yang teksnya bisa diseleksi.');
      }
      break;
    }
    case 'docx': {
      try {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || '';
      } catch (error) {
        console.error('DOCX extraction error:', error);
        throw new UnsupportedFileError('File DOCX tidak bisa dibaca.');
      }
      break;
    }
    case 'txt':
    case 'md':
    case 'csv':
    case 'json':
      text = buffer.toString('utf8');
      break;
    default:
      throw new UnsupportedFileError('Tipe file tidak didukung. Gunakan PDF, DOCX, TXT, MD, CSV, atau JSON.');
  }

  // Normalise whitespace but keep paragraph breaks for the splitter
  return text.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
