import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js'
import { supabase, User, UserRole, validateSupabaseConfig } from '../lib/supabase'
import { FirstAccessService, FirstAccessStatus } from '../services/firstAccessService'
import { UserSyncService, AuthEventType } from '../services/userSyncService'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  firstAccessStatus: FirstAccessStatus | null
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  refreshSession: () => Promise<void>
  checkFirstAccessStatus: () => Promise<FirstAccessStatus | null>
  completeFirstAccess: (newPassword: string) => Promise<boolean>
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
  const [firstAccessStatus, setFirstAccessStatus] = useState<FirstAccessStatus | null>(null)
  
  // Refs para acessar valores atuais sem causar re-renders
  const sessionRef = useRef<Session | null>(null)
  const userRef = useRef<User | null>(null)
  const signOutRef = useRef<(() => Promise<{ error: AuthError | null }>) | null>(null)
  const fetchUserProfileRef = useRef<((authUser: SupabaseUser) => Promise<void>) | null>(null)
  
  // Atualizar refs quando estado mudar
  useEffect(() => {
    sessionRef.current = session
  }, [session])
  
  useEffect(() => {
    userRef.current = user
  }, [user])

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
        await UserSyncService.logAuthEvent(undefined, AuthEventType.LOGIN_FAILED, {
          userEmail: email,
          errorMessage: 'Email e senha são obrigatórios',
          additionalData: { timestamp: new Date().toISOString() }
        })
        return { error: new Error('Email e senha são obrigatórios') as AuthError }
      }

      const normalizedEmail = email.trim().toLowerCase()

      // Registrar tentativa de login
      await UserSyncService.logAuthEvent(undefined, AuthEventType.LOGIN_ATTEMPT, {
        userEmail: normalizedEmail,
        additionalData: { timestamp: new Date().toISOString() }
      })

      // Fazer login com timeout
      const authPromise = supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      })

      const { data, error } = await withTimeout(authPromise, AUTH_TIMEOUT)

      if (error) {
        console.error('Erro no login:', error.message)
        await UserSyncService.logAuthEvent(undefined, AuthEventType.LOGIN_FAILED, {
          userEmail: normalizedEmail,
          errorMessage: error.message,
          additionalData: { timestamp: new Date().toISOString() }
        })
        return { error }
      }

      if (!data.user || !data.session) {
        await UserSyncService.logAuthEvent(undefined, AuthEventType.LOGIN_FAILED, {
          userEmail: normalizedEmail,
          errorMessage: 'Falha na autenticação - dados ausentes',
          additionalData: { timestamp: new Date().toISOString() }
        })
        return { error: new Error('Falha na autenticação') as AuthError }
      }

      // Verificar status do usuário na tabela public.users
      try {
        const { data: userDataArray, error: userError } = await supabase
          .from('users')
          .select('status')
          .eq('auth_user_id', data.user.id)
          .limit(1)

        if (userError) {
          console.error('Erro ao verificar status do usuário:', userError)
          // NÃO fazer logout automático - pode ser erro de RLS temporário
          console.warn('Continuando login apesar do erro de verificação de status')
          // return { error: new Error('Erro ao verificar permissões do usuário') as AuthError }
        } else if (userDataArray && userDataArray.length > 0) {
          // Verificar se o usuário está ativo (apenas se conseguiu buscar os dados)
          const userData = userDataArray[0]
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

      // Registrar sucesso do login
      await UserSyncService.logAuthEvent(undefined, AuthEventType.LOGIN_SUCCESS, {
        userEmail: normalizedEmail,
        additionalData: { timestamp: new Date().toISOString() }
      })

      // Verificar status de primeiro acesso após login bem-sucedido
      try {
        const firstAccessResult = await FirstAccessService.checkFirstAccessStatus(normalizedEmail)
        setFirstAccessStatus(firstAccessResult)
        console.log('Status de primeiro acesso verificado:', firstAccessResult)
      } catch (firstAccessError) {
        console.warn('Erro ao verificar primeiro acesso (não crítico):', firstAccessError)
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

  const signOut = useCallback(async (): Promise<{ error: AuthError | null }> => {
    try {
      setLoading(true)
      
      const currentUserEmail = user?.email
      const currentSession = session
      
      console.log('🔐 Iniciando processo de logout...', { 
        hasUser: !!user, 
        hasSession: !!currentSession,
        userEmail: currentUserEmail 
      })
      
      // Registrar tentativa de logout
      if (currentUserEmail) {
        try {
          await UserSyncService.logAuthEvent(user?.id, AuthEventType.LOGOUT_ATTEMPTED, {
            userEmail: currentUserEmail,
            additionalData: { timestamp: new Date().toISOString() }
          })
        } catch (logError) {
          console.warn('Falha ao registrar tentativa de logout (não crítico):', logError)
        }
      }
      
      // Verificar se há uma sessão válida antes de tentar logout no servidor
      let shouldAttemptServerLogout = false
      
      if (currentSession) {
        try {
          // Verificar se a sessão ainda é válida
          const { data: { session: validSession }, error: sessionError } = await supabase.auth.getSession()
          
          if (!sessionError && validSession) {
            console.log('✅ Sessão válida encontrada, tentando logout no servidor')
            shouldAttemptServerLogout = true
          } else {
            console.log('⚠️ Sessão local existe mas não é válida no servidor:', sessionError?.message || 'Sessão expirada')
          }
        } catch (sessionCheckError) {
          console.warn('Erro ao verificar sessão (continuando com logout local):', sessionCheckError)
        }
      } else {
        console.log('ℹ️ Nenhuma sessão local encontrada, fazendo apenas limpeza local')
      }
      
      let serverLogoutError: AuthError | null = null
      
      // Tentar logout no servidor apenas se a sessão for válida
      if (shouldAttemptServerLogout) {
        try {
          console.log('🌐 Tentando logout no servidor Supabase...')
          const logoutPromise = supabase.auth.signOut()
          const { error } = await withTimeout(logoutPromise, AUTH_TIMEOUT)
          
          if (error) {
            console.warn('⚠️ Erro no logout do servidor:', error.message, error.code)
            
            // Verificar se é erro de sessão não encontrada (comum e não crítico)
            if (error.message?.includes('session_not_found') || 
                error.message?.includes('Session from session_id claim in JWT does not exist') ||
                error.message?.includes('Auth session missing')) {
              console.log('ℹ️ Sessão já expirada no servidor - continuando com limpeza local')
            } else {
              // Outros erros podem ser mais críticos
              serverLogoutError = error
            }
          } else {
            console.log('✅ Logout no servidor realizado com sucesso')
          }
        } catch (logoutError) {
          console.warn('⚠️ Erro inesperado no logout do servidor:', logoutError)
          // Não impedir a limpeza local mesmo com erro no servidor
        }
      }
      
      // SEMPRE limpar estado local, independente do resultado do logout no servidor
      console.log('🧹 Limpando estado local...')
      setUser(null)
      setSession(null)
      setFirstAccessStatus(null)
      
      // Registrar sucesso do logout (limpeza local sempre é bem-sucedida)
      if (currentUserEmail) {
        try {
          await UserSyncService.logAuthEvent(user?.id, AuthEventType.LOGOUT_SUCCESS, {
            userEmail: currentUserEmail,
            additionalData: { 
              timestamp: new Date().toISOString(),
              serverLogoutAttempted: shouldAttemptServerLogout,
              serverLogoutSuccess: !serverLogoutError
            }
          })
        } catch (logError) {
          console.warn('Falha ao registrar log de logout bem-sucedido (não crítico):', logError)
        }
      }
      
      console.log('✅ Processo de logout concluído')
      
      // Retornar erro apenas se for crítico (não incluir session_not_found)
      return { error: serverLogoutError }
      
    } catch (error) {
      console.error('❌ Erro inesperado no signOut:', error)
      
      // SEMPRE limpar estado local mesmo em caso de erro
      console.log('🧹 Limpando estado local devido a erro...')
      setUser(null)
      setSession(null)
      setFirstAccessStatus(null)
      
      return { 
        error: error instanceof Error 
          ? error as AuthError 
          : new Error('Erro inesperado no logout') as AuthError 
      }
    } finally {
      setLoading(false)
    }
  }, [user, session])

  // Método de logout simplificado para uso interno
  const logout = async (): Promise<void> => {
    try {
      await signOut()
    } catch (error) {
      console.error('Erro no logout interno:', error)
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

  const checkFirstAccessStatus = async (): Promise<FirstAccessStatus | null> => {
    try {
      if (!user?.email) {
        console.warn('Usuário não autenticado para verificar primeiro acesso')
        return null
      }

      const status = await FirstAccessService.checkFirstAccessStatus(user.email)
      setFirstAccessStatus(status)
      return status
    } catch (error) {
      console.error('Erro ao verificar status de primeiro acesso:', error)
      return null
    }
  }

  const completeFirstAccess = async (newPassword: string): Promise<boolean> => {
    try {
      if (!user?.email) {
        console.error('Usuário não autenticado para completar primeiro acesso')
        return false
      }

      const result = await FirstAccessService.completeFirstAccess(user.email, newPassword)
      
      if (result.success) {
        // Atualizar status local
        setFirstAccessStatus({
          needsFirstAccess: false,
          firstAccessAt: new Date().toISOString()
        })
        
        console.log('Primeiro acesso completado com sucesso')
        return true
      } else {
        console.error('Falha ao completar primeiro acesso:', result.error)
        return false
      }
    } catch (error) {
      console.error('Erro ao completar primeiro acesso:', error)
      return false
    }
  }

  const fetchUserProfile = useCallback(async (authUser: SupabaseUser) => {
    console.log('fetchUserProfile iniciado para:', authUser.id)
    
    try {
      console.log('Fazendo query para buscar usuário...')
      
      // Query simplificada sem timeout artificial - Supabase gerencia timeout internamente
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle() // Retorna objeto único ou null, não array

      console.log('Query concluída:', { data, error })

      if (error) {
        console.error('Erro ao buscar perfil do usuário:', error)
        // Se for erro de RLS ou não encontrado, tentar criar usuário
        if (error.code === 'PGRST116' || error.message?.includes('row-level security')) {
          console.log('Usuário não encontrado ou bloqueado por RLS, tentando criar perfil...')
          // Continuar para criar usuário abaixo
        } else {
          // NÃO fazer logout automático em caso de erro de RLS - apenas log
          console.warn('Continuando sem fazer logout automático devido a erro:', error.message)
          setLoading(false)
          return
        }
      }

      // Verificar se encontrou usuário (data é objeto único com maybeSingle, não array)
      if (!data) {
        console.log('Usuário não encontrado, criando perfil na tabela public.users')
        
        const { data: newUserData, error: createError } = await supabase
          .from('users')
          .insert({
            auth_user_id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
            role: authUser.user_metadata?.role || 'advogado',
            status: 'ativo'
          })
          .select()
          .maybeSingle() // Usar maybeSingle aqui também
      
        console.log('Resultado da criação:', { newUserData, createError })
        
        if (createError) {
          console.error('Erro ao criar usuário na tabela public.users:', createError)
          // NÃO fazer logout automático - apenas log do erro
          setLoading(false)
          return
        }
        
        if (newUserData) {
          console.log('Usuário criado com sucesso:', newUserData)
          setUser(newUserData)
        }
        setLoading(false)
        return
      }

      // Usuário encontrado - data já é o objeto, não precisa de [0]
      const userData = data

      // Verificar se o usuário está ativo
      if (userData.status !== 'ativo') {
        console.log('Usuário com status inativo detectado, fazendo logout')
        // APENAS neste caso fazer logout (usuário inativo)
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setLoading(false)
        return
      }

      console.log('Usuário encontrado e ativo:', userData)
      setUser(userData)
      
      // Verificar status de primeiro acesso para usuário ativo
      try {
        if (userData.email) {
          const firstAccessResult = await FirstAccessService.checkFirstAccessStatus(userData.email)
          setFirstAccessStatus(firstAccessResult)
          console.log('Status de primeiro acesso verificado para usuário ativo:', firstAccessResult)
        }
      } catch (firstAccessError) {
        console.warn('Erro ao verificar primeiro acesso (não crítico):', firstAccessError)
      }
      
      setLoading(false)
    } catch (err) {
      console.error('Erro inesperado ao buscar perfil do usuário:', err)
      // NÃO fazer logout automático em caso de erro inesperado
      console.warn('Continuando sem fazer logout automático devido a erro inesperado')
      setLoading(false)
    }
  }, [])

  // Atualizar refs das funções quando mudarem
  useEffect(() => {
    signOutRef.current = signOut
  }, [signOut])
  
  useEffect(() => {
    fetchUserProfileRef.current = fetchUserProfile
  }, [fetchUserProfile])

  useEffect(() => {
    let mounted = true
    let inactivityTimer: NodeJS.Timeout | null = null
    let listenersAdded = false
    
    // Configuração de timeout de sessão (30 minutos de inatividade)
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutos

    const resetInactivityTimer = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer)
      }
      
      if (!sessionRef.current) return
      
      inactivityTimer = setTimeout(async () => {
        console.log('⏰ Timeout de sessão detectado por inatividade')
        if (mounted && signOutRef.current) {
          await signOutRef.current()
        }
      }, SESSION_TIMEOUT_MS)
    }

    // Event listeners para detectar atividade do usuário
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    const handleActivity = () => {
      resetInactivityTimer()
    }

    const addActivityListeners = () => {
      if (listenersAdded) return
      listenersAdded = true
      activityEvents.forEach(event => {
        window.addEventListener(event, handleActivity, { passive: true })
      })
    }

    const removeActivityListeners = () => {
      if (!listenersAdded) return
      listenersAdded = false
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }

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
            if (fetchUserProfileRef.current) {
              await fetchUserProfileRef.current(session.user)
            }
            resetInactivityTimer()
            addActivityListeners()
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
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return

      console.log('Auth state changed:', event)
      
      // Evitar atualizar se a sessão não mudou realmente
      const currentSession = sessionRef.current
      if (currentSession?.access_token === newSession?.access_token && event !== 'SIGNED_OUT' && event !== 'SIGNED_IN') {
        console.log('Sessão não mudou, ignorando atualização')
        return
      }
      
      setSession(newSession)
      
      if (newSession?.user) {
        if (fetchUserProfileRef.current) {
          await fetchUserProfileRef.current(newSession.user)
        }
        resetInactivityTimer()
        addActivityListeners()
      } else {
        setUser(null)
        setFirstAccessStatus(null)
        
        // Limpar timers e listeners quando usuário faz logout
        if (inactivityTimer) {
          clearTimeout(inactivityTimer)
          inactivityTimer = null
        }
        
        removeActivityListeners()
        
        // Redirecionar para login se não estiver já lá
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
      
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      
      if (inactivityTimer) {
        clearTimeout(inactivityTimer)
      }
      
      removeActivityListeners()
    }
  }, []) // Sem dependências para evitar loops

  const value: AuthContextType = {
    user,
    session,
    loading,
    firstAccessStatus,
    signIn,
    signOut,
    logout,
    hasPermission,
    refreshSession,
    checkFirstAccessStatus,
    completeFirstAccess
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}