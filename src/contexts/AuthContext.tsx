import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js'
import { supabase, User, UserRole, validateSupabaseConfig } from '../lib/supabase'
import { FirstAccessService, FirstAccessStatus } from '../services/firstAccessService'
import { UserSyncService, AuthEventType } from '../services/userSyncService'

// Permission mapping based on roles
const rolePermissions: Record<UserRole, string[]> = {
  administrator: ['admin', 'users', 'companies', 'modules', 'all'],
  it: ['admin', 'users', 'companies', 'modules', 'all'],
  advogado_adm: ['admin', 'users', 'companies', 'modules', 'all'],
  advogado: ['modules', 'companies'],
  contabil: ['modules', 'companies', 'view_companies', 'add_companies'],
  financeiro: ['modules']
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  authReady: boolean
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

const AUTH_TIMEOUT = 30000
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutos

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operação expirou. Tente novamente.')), timeoutMs)
    )
  ])
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // ===== STATE =====
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [firstAccessStatus, setFirstAccessStatus] = useState<FirstAccessStatus | null>(null)

  // ===== REFS para controle de fluxo (evitar race conditions) =====
  const mountedRef = useRef(true)
  const initCompletedRef = useRef(false)
  const fetchingProfileForRef = useRef<string | null>(null)
  const currentUserRef = useRef<User | null>(null)
  const currentSessionRef = useRef<Session | null>(null)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Manter refs sincronizadas com state
  useEffect(() => {
    currentUserRef.current = user
  }, [user])

  useEffect(() => {
    currentSessionRef.current = session
  }, [session])

  // ===== CALLBACKS ESTÁVEIS =====

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false
    const userPermissions = rolePermissions[user.role] || []
    return userPermissions.includes(permission) || userPermissions.includes('all')
  }, [user])

  // Função para buscar perfil do usuário (com proteção contra chamadas duplicadas)
  const fetchUserProfile = useCallback(async (authUser: SupabaseUser): Promise<User | null> => {
    // Evitar chamadas duplicadas para o mesmo usuário
    if (fetchingProfileForRef.current === authUser.id) {
      console.log('[Auth] fetchUserProfile já em execução para este usuário, ignorando')
      return currentUserRef.current
    }

    // Se já temos o perfil deste usuário carregado, retornar
    if (currentUserRef.current?.auth_user_id === authUser.id) {
      console.log('[Auth] Perfil já carregado para este usuário')
      return currentUserRef.current
    }

    fetchingProfileForRef.current = authUser.id
    console.log('[Auth] fetchUserProfile iniciado para:', authUser.id)

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle()

      if (error) {
        console.error('[Auth] Erro ao buscar perfil:', error)

        if (error.code === 'PGRST116' || error.message?.includes('row-level security')) {
          // Usuário não existe, tentar criar
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
            .maybeSingle()

          if (createError) {
            console.error('[Auth] Erro ao criar usuário:', createError)
            return null
          }

          if (newUser) {
            console.log('[Auth] Novo usuário criado:', newUser.email)
            return newUser
          }
        }
        return null
      }

      if (!data) {
        console.log('[Auth] Usuário não encontrado na tabela public.users')
        return null
      }

      // Verificar se usuário está ativo
      if (data.status !== 'ativo') {
        console.log('[Auth] Usuário inativo, fazendo logout')
        await supabase.auth.signOut()
        return null
      }

      console.log('[Auth] Perfil carregado:', data.email)
      return data
    } catch (err) {
      console.error('[Auth] Erro inesperado em fetchUserProfile:', err)
      return null
    } finally {
      fetchingProfileForRef.current = null
    }
  }, [])

  // Função para processar sessão (unifica lógica de init e onAuthStateChange)
  const processSession = useCallback(async (newSession: Session | null, source: string) => {
    if (!mountedRef.current) return

    console.log(`[Auth] processSession chamado de: ${source}`, { hasSession: !!newSession })

    if (newSession?.user) {
      // Verificar se é a mesma sessão (evita reprocessamento)
      const isSameSession = currentSessionRef.current?.access_token === newSession.access_token
      const isSameUser = currentUserRef.current?.auth_user_id === newSession.user.id

      if (isSameSession && isSameUser && currentUserRef.current) {
        console.log('[Auth] Mesma sessão e usuário, ignorando')
        return
      }

      // Atualizar sessão
      setSession(newSession)

      // Buscar perfil se necessário
      if (!isSameUser || !currentUserRef.current) {
        const profile = await fetchUserProfile(newSession.user)
        if (mountedRef.current && profile) {
          setUser(profile)

          // Verificar primeiro acesso
          try {
            const faStatus = await FirstAccessService.checkFirstAccessStatus(profile.email)
            if (mountedRef.current) {
              setFirstAccessStatus(faStatus)
            }
          } catch (e) {
            console.warn('[Auth] Erro ao verificar primeiro acesso:', e)
          }
        }
      }
    } else {
      // Sem sessão - limpar estado
      setSession(null)
      setUser(null)
      setFirstAccessStatus(null)
    }
  }, [fetchUserProfile])

  // ===== INACTIVITY TIMER =====

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    if (!currentSessionRef.current) return

    inactivityTimerRef.current = setTimeout(async () => {
      console.log('[Auth] Timeout de inatividade - fazendo logout')
      if (mountedRef.current) {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setFirstAccessStatus(null)
      }
    }, SESSION_TIMEOUT_MS)
  }, [])

  // ===== AUTH METHODS =====

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    try {
      setLoading(true)

      if (!email || !password) {
        await UserSyncService.logAuthEvent(undefined, AuthEventType.LOGIN_FAILED, {
          userEmail: email,
          errorMessage: 'Email e senha são obrigatórios',
          additionalData: { timestamp: new Date().toISOString() }
        })
        return { error: new Error('Email e senha são obrigatórios') as AuthError }
      }

      const normalizedEmail = email.trim().toLowerCase()

      await UserSyncService.logAuthEvent(undefined, AuthEventType.LOGIN_ATTEMPT, {
        userEmail: normalizedEmail,
        additionalData: { timestamp: new Date().toISOString() }
      })

      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: normalizedEmail, password }),
        AUTH_TIMEOUT
      )

      if (error) {
        console.error('[Auth] Erro no login:', error.message)
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

      // Verificar status do usuário
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('status')
          .eq('auth_user_id', data.user.id)
          .maybeSingle()

        if (!userError && userData?.status !== 'ativo') {
          console.log('[Auth] Usuário inativo tentou fazer login')
          await supabase.auth.signOut()
          return { error: new Error('Sua conta está inativa. Entre em contato com o administrador.') as AuthError }
        }

        // Atualizar last_access
        if (!userError && userData) {
          await supabase
            .from('users')
            .update({ last_access: new Date().toISOString() })
            .eq('auth_user_id', data.user.id)
        }
      } catch (statusError) {
        console.warn('[Auth] Erro ao verificar status (continuando):', statusError)
      }

      await UserSyncService.logAuthEvent(undefined, AuthEventType.LOGIN_SUCCESS, {
        userEmail: normalizedEmail,
        additionalData: { timestamp: new Date().toISOString() }
      })

      // onAuthStateChange vai processar a sessão
      return { error: null }
    } catch (error) {
      console.error('[Auth] Erro inesperado no signIn:', error)
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

      const currentUserEmail = currentUserRef.current?.email

      console.log('[Auth] Iniciando logout...')

      if (currentUserEmail) {
        try {
          await UserSyncService.logAuthEvent(currentUserRef.current?.id, AuthEventType.LOGOUT_ATTEMPTED, {
            userEmail: currentUserEmail,
            additionalData: { timestamp: new Date().toISOString() }
          })
        } catch (e) {
          console.warn('[Auth] Erro ao registrar tentativa de logout:', e)
        }
      }

      // Tentar logout no servidor
      try {
        const { error } = await withTimeout(supabase.auth.signOut(), AUTH_TIMEOUT)
        if (error && !error.message?.includes('session_not_found')) {
          console.warn('[Auth] Erro no logout do servidor:', error.message)
        }
      } catch (e) {
        console.warn('[Auth] Erro ao fazer logout no servidor:', e)
      }

      // Sempre limpar estado local
      setUser(null)
      setSession(null)
      setFirstAccessStatus(null)

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }

      if (currentUserEmail) {
        try {
          await UserSyncService.logAuthEvent(undefined, AuthEventType.LOGOUT_SUCCESS, {
            userEmail: currentUserEmail,
            additionalData: { timestamp: new Date().toISOString() }
          })
        } catch (e) {
          console.warn('[Auth] Erro ao registrar logout:', e)
        }
      }

      console.log('[Auth] Logout concluído')
      return { error: null }
    } catch (error) {
      console.error('[Auth] Erro no signOut:', error)
      // Sempre limpar estado mesmo com erro
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
  }, [])

  const logout = async (): Promise<void> => {
    await signOut()
  }

  const refreshSession = async (): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('[Auth] Erro ao renovar sessão:', error)
        return
      }
      if (data.session) {
        await processSession(data.session, 'refreshSession')
      }
    } catch (error) {
      console.error('[Auth] Erro inesperado ao renovar sessão:', error)
    }
  }

  const checkFirstAccessStatus = async (): Promise<FirstAccessStatus | null> => {
    try {
      if (!user?.email) {
        console.warn('[Auth] Usuário não autenticado para verificar primeiro acesso')
        return null
      }
      const status = await FirstAccessService.checkFirstAccessStatus(user.email)
      setFirstAccessStatus(status)
      return status
    } catch (error) {
      console.error('[Auth] Erro ao verificar status de primeiro acesso:', error)
      return null
    }
  }

  const completeFirstAccess = async (newPassword: string): Promise<boolean> => {
    try {
      if (!user?.email) {
        console.error('[Auth] Usuário não autenticado para completar primeiro acesso')
        return false
      }

      const result = await FirstAccessService.completeFirstAccess(user.email, newPassword)

      if (result.success) {
        setFirstAccessStatus({
          needsFirstAccess: false,
          firstAccessAt: new Date().toISOString()
        })
        console.log('[Auth] Primeiro acesso completado')
        return true
      } else {
        console.error('[Auth] Falha ao completar primeiro acesso:', result.error)
        return false
      }
    } catch (error) {
      console.error('[Auth] Erro ao completar primeiro acesso:', error)
      return false
    }
  }

  // ===== INITIALIZATION EFFECT =====
  useEffect(() => {
    mountedRef.current = true

    // Validar configuração
    if (!validateSupabaseConfig()) {
      console.error('[Auth] Configuração do Supabase inválida')
      setAuthReady(true)
      return
    }

    let activityListeners: (() => void)[] = []

    const setupActivityListeners = () => {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
      events.forEach(event => {
        const handler = () => resetInactivityTimer()
        window.addEventListener(event, handler, { passive: true })
        activityListeners.push(() => window.removeEventListener(event, handler))
      })
    }

    const initializeAuth = async () => {
      if (initCompletedRef.current) {
        console.log('[Auth] Init já completado, ignorando')
        return
      }

      console.log('[Auth] Inicializando autenticação...')

      try {
        // IMPORTANTE: Primeiro configurar o listener ANTES de chamar getSession
        // Isso segue o padrão oficial do Supabase para evitar race conditions
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!mountedRef.current) return

          console.log('[Auth] onAuthStateChange:', event)

          // Ignorar eventos durante a inicialização (getSession vai processar)
          if (!initCompletedRef.current && event === 'INITIAL_SESSION') {
            console.log('[Auth] Evento INITIAL_SESSION ignorado (init vai processar)')
            return
          }

          // Ignorar TOKEN_REFRESHED se a sessão não mudou
          if (event === 'TOKEN_REFRESHED') {
            if (currentSessionRef.current?.access_token === newSession?.access_token) {
              console.log('[Auth] TOKEN_REFRESHED ignorado - mesmo token')
              return
            }
          }

          // Processar mudança de sessão
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // Só processar SIGNED_IN se vier de um login real (não da restauração)
            if (event === 'SIGNED_IN' && initCompletedRef.current) {
              await processSession(newSession, 'onAuthStateChange:SIGNED_IN')
              resetInactivityTimer()
              setupActivityListeners()
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
            setSession(null)
            setFirstAccessStatus(null)
            if (inactivityTimerRef.current) {
              clearTimeout(inactivityTimerRef.current)
            }
            activityListeners.forEach(cleanup => cleanup())
            activityListeners = []
          }
        })

        // Agora buscar sessão existente
        const { data: { session: existingSession }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('[Auth] Erro ao obter sessão inicial:', error)
        } else if (existingSession) {
          console.log('[Auth] Sessão existente encontrada')
          await processSession(existingSession, 'getSession')
          resetInactivityTimer()
          setupActivityListeners()
        } else {
          console.log('[Auth] Nenhuma sessão existente')
        }

        // Marcar inicialização como completa
        initCompletedRef.current = true
        if (mountedRef.current) {
          setAuthReady(true)
        }

        console.log('[Auth] Inicialização completa')

        // Retornar cleanup
        return () => {
          subscription.unsubscribe()
        }
      } catch (err) {
        console.error('[Auth] Erro na inicialização:', err)
        initCompletedRef.current = true
        if (mountedRef.current) {
          setAuthReady(true)
        }
      }
    }

    let cleanupSubscription: (() => void) | undefined

    initializeAuth().then(cleanup => {
      cleanupSubscription = cleanup
    })

    return () => {
      mountedRef.current = false
      cleanupSubscription?.()
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
      activityListeners.forEach(cleanup => cleanup())
    }
  }, [processSession, resetInactivityTimer])

  // ===== CONTEXT VALUE =====
  const value: AuthContextType = {
    user,
    session,
    loading,
    authReady,
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
