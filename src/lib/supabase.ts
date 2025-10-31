import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

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