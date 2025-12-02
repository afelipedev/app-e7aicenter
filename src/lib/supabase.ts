import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Validação mais robusta das variáveis de ambiente
if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL is missing from environment variables')
  throw new Error('Missing Supabase URL - check your .env file')
}

if (!supabaseAnonKey) {
  console.error('VITE_SUPABASE_ANON_KEY is missing from environment variables')
  throw new Error('Missing Supabase Anonymous Key - check your .env file')
}

console.log('Supabase configuration loaded:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  hasServiceKey: !!supabaseServiceRoleKey
})

// Configuração segura do cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Usar PKCE para maior segurança
    storage: window.localStorage,
    storageKey: 'e7ai-auth-token',
  },
  global: {
    headers: {
      'X-Client-Info': 'e7ai-center-app',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Cliente admin para operações privilegiadas (apenas para backend)
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'e7ai-center-admin',
        },
      },
    })
  : null

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_user_id: string
          email: string
          name: string
          role: 'administrator' | 'it' | 'advogado_adm' | 'advogado' | 'contabil' | 'financeiro'
          status: 'ativo' | 'inativo'
          created_at: string
          updated_at: string
          last_access: string | null
        }
        Insert: {
          id?: string
          auth_user_id: string
          email: string
          name: string
          role: 'administrator' | 'it' | 'advogado_adm' | 'advogado' | 'contabil' | 'financeiro'
          status?: 'ativo' | 'inativo'
          created_at?: string
          updated_at?: string
          last_access?: string | null
        }
        Update: {
          id?: string
          auth_user_id?: string
          email?: string
          name?: string
          role?: 'administrator' | 'it' | 'advogado_adm' | 'advogado' | 'contabil' | 'financeiro'
          status?: 'ativo' | 'inativo'
          created_at?: string
          updated_at?: string
          last_access?: string | null
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          cnpj: string
          payslips_count: number
          status: 'ativo' | 'inativo'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          cnpj: string
          payslips_count?: number
          status?: 'ativo' | 'inativo'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          cnpj?: string
          payslips_count?: number
          status?: 'ativo' | 'inativo'
          created_at?: string
          updated_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          user_id: string
          assistant_type: 'chat-general' | 'tax-law' | 'civil-law' | 'financial' | 'accounting'
          title: string
          llm_model: 'gpt-4' | 'gpt-4-turbo' | 'gemini-2.5-flash' | 'claude-sonnet-4.5'
          is_favorite: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          assistant_type: 'chat-general' | 'tax-law' | 'civil-law' | 'financial' | 'accounting'
          title: string
          llm_model?: 'gpt-4' | 'gpt-4-turbo' | 'gemini-2.5-flash' | 'claude-sonnet-4.5'
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          assistant_type?: 'chat-general' | 'tax-law' | 'civil-law' | 'financial' | 'accounting'
          title?: string
          llm_model?: 'gpt-4' | 'gpt-4-turbo' | 'gemini-2.5-flash' | 'claude-sonnet-4.5'
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          chat_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: Record<string, any>
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'administrator' | 'it' | 'advogado_adm' | 'advogado' | 'contabil' | 'financeiro'
      user_status: 'ativo' | 'inativo'
    }
  }
}

// Tipos exportados
export type UserRole = Database['public']['Tables']['users']['Row']['role']
export type UserStatus = Database['public']['Tables']['users']['Row']['status']
export type User = Database['public']['Tables']['users']['Row']
export type Company = Database['public']['Tables']['companies']['Row']

// Função para validar se o cliente está configurado corretamente
export const validateSupabaseConfig = (): boolean => {
  try {
    return !!(supabaseUrl && supabaseAnonKey && supabase)
  } catch (error) {
    console.error('Erro na configuração do Supabase:', error)
    return false
  }
}