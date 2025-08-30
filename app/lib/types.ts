// Database Types
export interface ChatSession {
  id: string;
  client_id: string;
  widget_id: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseDocument {
  id: string;
  client_id: string;
  filename: string;
  content: string;
  chunks: Array<{
    content: string;
    embedding: number[];
  }>;
  created_at: string;
}

export interface WidgetConfig {
  id: string;
  client_id: string;
  name: string;
  primary_color: string;
  position: string;
  welcome_message: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  client_id: string;
  created_at: string;
  last_login: string;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface WidgetConfigFormData {
  name: string;
  primaryColor: string;
  position: string;
  welcomeMessage: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ChatResponse {
  response: string;
  sessionId?: string;
}

export interface KnowledgeBaseStats {
  totalDocuments: number;
  totalChunks: number;
}

// File Upload Types
export interface FileUploadData {
  file: File;
  filename: string;
  content: string;
  chunks: Array<{
    content: string;
    embedding: number[];
  }>;
}

// Authentication Types
export interface AuthUser {
  id: string;
  email: string;
  clientId: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  clientId: string;
  iat?: number;
  exp?: number;
}