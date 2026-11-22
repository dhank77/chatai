import { createClient } from '@supabase/supabase-js';

// VITE_* vars are exposed to the browser bundle; plain SUPABASE_* vars work on the server only.
const serverEnv = typeof process !== 'undefined' ? process.env : ({} as Record<string, string | undefined>);
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || serverEnv.SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || serverEnv.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum di-set.');
}

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