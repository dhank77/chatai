// Export all helper functions and types
export * from './response';
export * from './auth';
export * from './validation';
export * from './database';

export {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  validateFile,
  validateFileType,
  validateFileSize,
  extractTextFromFile,
  createTextChunks,
  generateEmbedding,
  generateEmbeddings,
  processFileForKnowledgeBase,
  formatFileSize,
  getFileExtension,
  isTextFile,
  isPdfFile,
  isDocFile
} from './file';

export type {
  ChatSession,
  KnowledgeBaseDocument,
  WidgetConfig,
  User,
  LoginFormData,
  RegisterFormData,
  WidgetConfigFormData,
  ApiResponse,
  ChatResponse,
  KnowledgeBaseStats,
  FileUploadData,
  JWTPayload
} from '../types';