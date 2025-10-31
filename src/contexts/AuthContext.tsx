import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js'
import { supabase, User, UserRole, validateSupabaseConfig } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  hasPermission: (permission: string) => boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

// Timeout para operações de autenticação (30 segundos)
const AUTH_TIMEOUT = 30000

// Função para criar timeout em promises
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operação expirou. Tente novamente.')), timeoutMs)
    )
  ])
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Validar configuração do Supabase na inicialização
  useEffect(() => {
    if (!validateSupabaseConfig()) {
      console.error('Configuração do Supabase inválida')
      setLoading(false)
    }
  }, [])

  // Permission mapping based on roles
  const rolePermissions: Record<UserRole, string[]> = {
    administrator: ['admin', 'users', 'companies', 'modules', 'all'],
    it: ['admin', 'users', 'companies', 'modules', 'all'],
    advogado_adm: ['admin', 'users', 'companies', 'modules', 'all'],
    advogado: ['modules', 'companies'],
    contabil: ['modules', 'companies', 'view_companies', 'add_companies'],
    financeiro: ['modules']
  }

  const hasPermission = useCallback((permission: string): boolean => {
    console.log('hasPermission chamado:', { permission, user: user?.role, userPermissions: user ? rolePermissions[user.role] : null });
    if (!user) return false
    const userPermissions = rolePermissions[user.role] || []
    const hasAccess = userPermissions.includes(permission) || userPermissions.includes('all')
    console.log('hasPermission resultado:', hasAccess);
    return hasAccess
  }, [user, rolePermissions])

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    try {
      setLoading(true)
      
      // Validar entrada
      if (!email || !password) {
        return { error: new Error('Email e senha são obrigatórios') as AuthError }
      }

      // Fazer login com timeout
      const authPromise = supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      })

      const { data, error } = await withTimeout(authPromise, AUTH_TIMEOUT)

      if (error) {
        console.error('Erro no login:', error.message)
        return { error }
      }

      if (!data.user || !data.session) {
        return { error: new Error('Falha na autenticação') as AuthError }
      }

      // Verificar status do usuário na tabela public.users
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('status')
          .eq('auth_user_id', data.user.id)
          .single()

        if (userError) {
          console.error('Erro ao verificar status do usuário:', userError)
          // NÃO fazer logout automático - pode ser erro de RLS temporário
          console.warn('Continuando login apesar do erro de verificação de status')
          // return { error: new Error('Erro ao verificar permissões do usuário') as AuthError }
        } else {
          // Verificar se o usuário está ativo (apenas se conseguiu buscar os dados)
          if (userData.status !== 'ativo') {
            console.log('Usuário com status inativo tentou fazer login')
            // Fazer logout imediatamente apenas se confirmado que está inativo
            await supabase.auth.signOut()
            return { error: new Error('Sua conta está inativa. Entre em contato com o administrador.') as AuthError }
          }

          // Atualizar last_access apenas se o usuário estiver ativo
          await supabase
            .from('users')
            .update({ last_access: new Date().toISOString() })
            .eq('auth_user_id', data.user.id)
        }

      } catch (statusError) {
        console.error('Erro ao verificar status:', statusError)
        // NÃO fazer logout automático - pode ser erro temporário
        console.warn('Continuando login apesar do erro de verificação de status')
        // return { error: new Error('Erro ao verificar permissões do usuário') as AuthError }
      }

      return { error: null }
    } catch (error) {
      console.error('Erro inesperado no signIn:', error)
      return { 
        error: error instanceof Error 
          ? error as AuthError 
          : new Error('Erro inesperado na autenticação') as AuthError 
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async (): Promise<{ error: AuthError | null }> => {
    try {
      setLoading(true)
      
      // Fazer logout com timeout
      const logoutPromise = supabase.auth.signOut()
      const { error } = await withTimeout(logoutPromise, AUTH_TIMEOUT)
      
      if (error) {
        console.error('Erro no logout:', error.message)
        return { error }
      }

      // Limpar estado local
      setUser(null)
      setSession(null)
      
      return { error: null }
    } catch (error) {
      console.error('Erro inesperado no signOut:', error)
      return { 
        error: error instanceof Error 
          ? error as AuthError 
          : new Error('Erro inesperado no logout') as AuthError 
      }
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async (): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('Erro ao renovar sessão:', error)
        return
      }
      
      if (data.session) {
        setSession(data.session)
        if (data.user) {
          await fetchUserProfile(data.user)
        }
      }
    } catch (error) {
      console.error('Erro inesperado ao renovar sessão:', error)
    }
  }

  const fetchUserProfile = useCallback(async (authUser: SupabaseUser) => {
    console.log('fetchUserProfile iniciado para:', authUser.id)
    
    try {
      console.log('Fazendo query para buscar usuário...')
      
      // Implementar timeout para evitar carregamento infinito - aumentado para 30 segundos
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single()

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout - 30 segundos')), 30000)
      })

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      console.log('Query concluída:', { data, error })

      if (error) {
        // Se o usuário não existe na tabela public.users, criar um novo
        if (error.code === 'PGRST116') { // No rows returned
          console.log('Usuário não encontrado, criando perfil na tabela public.users')
          
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              auth_user_id: authUser.id,
              email: authUser.email || '',
              name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
              role: authUser.user_metadata?.role || 'advogado',
              status: 'ativo'
            })
            .select()
            .single()
          
          console.log('Resultado da criação:', { newUser, createError })
          
          if (createError) {
            console.error('Erro ao criar usuário na tabela public.users:', createError)
            // NÃO fazer logout automático - apenas log do erro
            setLoading(false)
            return
          }
          
          console.log('Usuário criado com sucesso:', newUser)
          setUser(newUser)
          setLoading(false)
          return
        }
        
        console.error('Erro ao buscar perfil do usuário:', error)
        // NÃO fazer logout automático em caso de erro de RLS - apenas log
        console.warn('Continuando sem fazer logout automático devido a erro de RLS')
        setLoading(false)
        return
      }

      if (!data) {
        console.error('Nenhum usuário encontrado na tabela public.users para auth_user_id:', authUser.id)
        // NÃO fazer logout automático - apenas log do erro
        setLoading(false)
        return
      }

      // Verificar se o usuário está ativo
      if (data.status !== 'ativo') {
        console.log('Usuário com status inativo detectado, fazendo logout')
        // APENAS neste caso fazer logout (usuário inativo)
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setLoading(false)
        return
      }

      console.log('Usuário encontrado e ativo:', data)
      setUser(data)
      setLoading(false)
    } catch (err) {
      console.error('Erro inesperado ao buscar perfil do usuário:', err)
      // NÃO fazer logout automático em caso de erro inesperado
      console.warn('Continuando sem fazer logout automático devido a erro inesperado')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Erro ao obter sessão inicial:', error)
          if (mounted) {
            setLoading(false)
          }
          return
        }

        if (mounted) {
          setSession(session)
          if (session?.user) {
            await fetchUserProfile(session.user)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Erro na inicialização da autenticação:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('Auth state changed:', event)
      
      setSession(session)
      
      if (session?.user) {
        await fetchUserProfile(session.user)
      } else {
        setUser(null)
      }
      
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signOut,
    hasPermission,
    refreshSession
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}