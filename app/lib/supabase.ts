import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          company_name: string;
          client_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          company_name: string;
          client_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          company_name?: string;
          client_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      knowledge_base: {
        Row: {
          id: string;
          client_id: string;
          filename: string;
          content: string;
          embedding: number[];
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          filename: string;
          content: string;
          embedding: number[];
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          filename?: string;
          content?: string;
          embedding?: number[];
          created_at?: string;
        };
      };
      widget_configs: {
        Row: {
          id: string;
          client_id: string;
          theme_color: string;
          bot_name: string;
          bot_avatar: string;
          position: string;
          welcome_message: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          theme_color?: string;
          bot_name?: string;
          bot_avatar?: string;
          position?: string;
          welcome_message?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          theme_color?: string;
          bot_name?: string;
          bot_avatar?: string;
          position?: string;
          welcome_message?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_sessions: {
        Row: {
          id: string;
          client_id: string;
          session_id: string;
          user_message: string;
          bot_response: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          session_id: string;
          user_message: string;
          bot_response: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          session_id?: string;
          user_message?: string;
          bot_response?: string;
          created_at?: string;
        };
      };
    };
  };
};