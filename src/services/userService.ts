import { supabase, User, UserRole, UserStatus } from '../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { UserSyncService, AuthEventType } from './userSyncService'

// Cliente admin para operações que requerem service_role
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export interface CreateUserData {
  email: string
  name: string
  role: UserRole
  status?: UserStatus
  password: string
}

export interface UpdateUserData {
  name?: string
  role?: UserRole
  status?: UserStatus
  password?: string // Adicionar campo de senha
}

// Interfaces para paginação
export interface PaginationParams {
  page: number
  limit: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  roleFilter?: UserRole
  statusFilter?: UserStatus
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export class UserService {
  static async getUsers(): Promise<User[]> {
    console.log('UserService.getUsers: Iniciando busca de usuários...')
    
    try {
      // Verificar se o usuário está autenticado
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('UserService.getUsers: Erro ao verificar sessão:', sessionError)
        throw new Error('Erro de autenticação')
      }
      
      if (!session) {
        console.error('UserService.getUsers: Usuário não autenticado')
        throw new Error('Usuário não autenticado')
      }

      console.log('UserService.getUsers: Usuário autenticado, fazendo query...')
      console.log('UserService.getUsers: Session user ID:', session.user?.id)
      
      // Implementar timeout de 15 segundos para a query
      console.log('UserService.getUsers: Iniciando query no Supabase...')
      const startTime = Date.now()
      
      const queryPromise = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .then(result => {
          const endTime = Date.now()
          console.log(`UserService.getUsers: Query completada em ${endTime - startTime}ms`)
          console.log('UserService.getUsers: Resultado da query:', { 
            data: result.data?.length || 0, 
            error: result.error 
          })
          return result
        })

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.log('UserService.getUsers: Timeout atingido após 15 segundos')
          reject(new Error('Timeout na busca de usuários - 15 segundos'))
        }, 15000)
      })

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      if (error) {
        console.error('UserService.getUsers: Erro na query:', error)
        throw new Error(`Erro ao buscar usuários: ${error.message}`)
      }

      console.log('UserService.getUsers: Query concluída com sucesso. Usuários encontrados:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('UserService.getUsers: Erro inesperado:', error)
      throw error
    }
  }

  static async getUserById(id: string): Promise<{ data: User | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .limit(1)

      if (error) {
        return { data: null, error }
      }

      if (!data || data.length === 0) {
        return { data: null, error: { message: 'Usuário não encontrado', code: 'USER_NOT_FOUND' } }
      }

      return { data: data[0], error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async getUsersPaginated(params: PaginationParams): Promise<PaginatedResponse<User>> {
    console.log('UserService.getUsersPaginated: Iniciando busca paginada de usuários...')
    console.log('UserService.getUsersPaginated: Parâmetros:', params)
    
    try {
      // Verificar se o usuário está autenticado
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('UserService.getUsersPaginated: Erro ao verificar sessão:', sessionError)
        throw new Error('Erro de autenticação')
      }
      
      if (!session) {
        console.error('UserService.getUsersPaginated: Usuário não autenticado')
        throw new Error('Usuário não autenticado')
      }

      // Construir query base
      let query = supabase.from('users').select('*', { count: 'exact' })

      // Aplicar filtros de busca
      if (params.search && params.search.trim()) {
        const searchTerm = params.search.trim()
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%`)
      }

      // Aplicar filtro de role
      if (params.roleFilter) {
        query = query.eq('role', params.roleFilter)
      }

      // Aplicar filtro de status
      if (params.statusFilter) {
        query = query.eq('status', params.statusFilter)
      }

      // Aplicar ordenação
      const sortBy = params.sortBy || 'created_at'
      const sortOrder = params.sortOrder || 'desc'
      const ascending = sortOrder === 'asc'
      query = query.order(sortBy, { ascending })

      // Aplicar paginação
      const offset = (params.page - 1) * params.limit
      query = query.range(offset, offset + params.limit - 1)

      console.log('UserService.getUsersPaginated: Executando query...')
      const startTime = Date.now()

      // Implementar timeout de 15 segundos
      const queryPromise = query.then(result => {
        const endTime = Date.now()
        console.log(`UserService.getUsersPaginated: Query completada em ${endTime - startTime}ms`)
        console.log('UserService.getUsersPaginated: Resultado da query:', { 
          data: result.data?.length || 0, 
          count: result.count,
          error: result.error 
        })
        return result
      })

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.log('UserService.getUsersPaginated: Timeout atingido após 15 segundos')
          reject(new Error('Timeout na busca de usuários - 15 segundos'))
        }, 15000)
      })

      const { data, error, count } = await Promise.race([queryPromise, timeoutPromise]) as any

      if (error) {
        console.error('UserService.getUsersPaginated: Erro na query:', error)
        throw new Error(`Erro ao buscar usuários: ${error.message}`)
      }

      const total = count || 0
      const totalPages = Math.ceil(total / params.limit)
      const hasNext = params.page < totalPages
      const hasPrev = params.page > 1

      const response: PaginatedResponse<User> = {
        data: data || [],
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages,
          hasNext,
          hasPrev
        }
      }

      console.log('UserService.getUsersPaginated: Resposta paginada:', {
        dataLength: response.data.length,
        pagination: response.pagination
      })

      return response
    } catch (error) {
      console.error('UserService.getUsersPaginated: Erro inesperado:', error)
      throw error
    }
  }

  static async createUser(userData: CreateUserData): Promise<{ data: User | null; error: any }> {
    console.log('🚀 UserService.createUser: INICIANDO criação de usuário')
    console.log('📧 Email:', userData.email)
    console.log('👤 Nome:', userData.name)
    console.log('🔑 Role:', userData.role)
    
    try {
      // ETAPA 1: Verificar se email já existe (SEM usar .single())
      console.log('🔍 ETAPA 1: Verificando se email já existe...')
      const { data: existingUsers, error: checkError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('email', userData.email)
        .limit(1)

      console.log('📊 Resultado da verificação:', { 
        encontrados: existingUsers?.length || 0, 
        erro: checkError?.message 
      })

      if (checkError) {
        console.error('❌ ERRO na verificação de email:', checkError)
        return { data: null, error: checkError }
      }

      if (existingUsers && existingUsers.length > 0) {
        console.log('⚠️ Email já existe:', userData.email)
        return { 
          data: null, 
          error: { 
            message: 'Email já está registrado',
            code: 'EMAIL_ALREADY_EXISTS'
          } 
        }
      }

      console.log('✅ Email disponível, prosseguindo...')

      // ETAPA 2: Criar usuário de autenticação com confirmação automática
      console.log('🔐 ETAPA 2: Criando usuário de autenticação...')
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Confirmar email automaticamente
        user_metadata: {
          name: userData.name
        }
      })

      console.log('🔐 Resultado da criação de auth:', { 
        sucesso: !authError && !!authData.user,
        userId: authData.user?.id,
        emailConfirmed: authData.user?.email_confirmed_at,
        erro: authError?.message 
      })

      if (authError || !authData.user) {
        console.error('❌ ERRO na criação do usuário de auth:', authError)
        return { data: null, error: authError }
      }

      console.log('✅ Usuário de auth criado com sucesso e email confirmado automaticamente')

      // ETAPA 3: Criar perfil do usuário
      console.log('👤 ETAPA 3: Criando perfil do usuário...')
      const profileData = {
        auth_user_id: authData.user.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        status: userData.status || 'ativo',
        first_access_completed: false // Novos usuários devem passar pelo primeiro acesso
      }

      console.log('📝 Dados do perfil:', profileData)

      // Inserir SEM usar .single() primeiro, depois buscar o registro criado
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('users')
        .insert(profileData)
        .select()

      console.log('💾 Resultado da inserção:', { 
        sucesso: !insertError && !!insertData,
        registros: insertData?.length || 0,
        erro: insertError?.message 
      })

      if (insertError) {
        console.error('❌ ERRO na inserção do perfil:', insertError)
        return { data: null, error: insertError }
      }

      if (!insertData || insertData.length === 0) {
        console.error('❌ ERRO: Nenhum registro foi inserido')
        return { 
          data: null, 
          error: { 
            message: 'Falha ao criar perfil do usuário',
            code: 'INSERT_FAILED'
          } 
        }
      }

      const createdUser = insertData[0]
      console.log('✅ Usuário criado com sucesso:', { 
        id: createdUser.id, 
        email: createdUser.email,
        name: createdUser.name 
      })

      return { data: createdUser, error: null }
    } catch (error) {
      console.error('💥 ERRO INESPERADO na criação de usuário:', error)
      return { data: null, error }
    }
  }

  static async updateUser(id: string, userData: UpdateUserData): Promise<{ data: User | null; error: any }> {
    const startTime = Date.now()
    console.log('UserService.updateUser: ========== INÍCIO DA ATUALIZAÇÃO ==========')
    console.log('UserService.updateUser: Timestamp:', new Date().toISOString())
    console.log('UserService.updateUser: ID do usuário:', id)
    console.log('UserService.updateUser: Dados para atualizar:', {
      ...userData,
      password: userData.password ? '[SENHA OCULTA - COMPRIMENTO: ' + userData.password.length + ']' : undefined
    })
    console.log('UserService.updateUser: Incluindo atualização de senha:', !!userData.password)
    
    try {
      // Verificar se o usuário está autenticado
      console.log('UserService.updateUser: [ETAPA 1] Verificando autenticação...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('UserService.updateUser: [ETAPA 1] ERRO - Falha na verificação de sessão:', sessionError)
        await UserSyncService.logAuthEvent(undefined, AuthEventType.PASSWORD_RESET_FAILED, {
          success: false,
          errorMessage: `Falha na verificação de sessão: ${sessionError.message}`,
          userId: id
        })
        return { data: null, error: sessionError }
      }
      
      if (!session) {
        console.error('UserService.updateUser: [ETAPA 1] ERRO - Usuário não autenticado')
        await UserSyncService.logAuthEvent(undefined, AuthEventType.PASSWORD_RESET_FAILED, {
          success: false,
          errorMessage: 'Usuário não autenticado',
          userId: id
        })
        return { data: null, error: new Error('Usuário não autenticado') }
      }

      console.log('UserService.updateUser: [ETAPA 1] ✅ Usuário autenticado com sucesso')
      console.log('UserService.updateUser: [ETAPA 1] Session user ID:', session.user?.id)
      
      // Primeiro, verificar se o usuário existe e obter o auth_user_id
      console.log('UserService.updateUser: [ETAPA 2] Verificando existência do usuário...')
      const { data: existingUserArray, error: checkError } = await supabase
        .from('users')
        .select('id, name, email, role, status, auth_user_id')
        .eq('id', id)
        .limit(1)

      console.log('UserService.updateUser: [ETAPA 2] Resultado da verificação:', { 
        found: existingUserArray && existingUserArray.length > 0, 
        error: checkError?.message 
      })

      if (checkError) {
        console.error('UserService.updateUser: [ETAPA 2] ERRO - Falha ao verificar usuário:', checkError)
        await UserSyncService.logAuthEvent(undefined, AuthEventType.PASSWORD_RESET_FAILED, {
          success: false,
          errorMessage: `Falha ao verificar usuário: ${checkError.message}`,
          userId: id
        })
        return { data: null, error: checkError }
      }

      if (!existingUserArray || existingUserArray.length === 0) {
        console.error('UserService.updateUser: [ETAPA 2] ERRO - Usuário não encontrado')
        await UserSyncService.logAuthEvent(undefined, AuthEventType.PASSWORD_RESET_FAILED, {
          success: false,
          errorMessage: 'Usuário não encontrado',
          userId: id
        })
        return { data: null, error: new Error('Usuário não encontrado') }
      }

      const existingUser = existingUserArray[0]
      console.log('UserService.updateUser: [ETAPA 2] Usuário encontrado:', { 
        hasAuthId: !!existingUser?.auth_user_id,
        email: existingUser.email
      })

      // NOVA ETAPA: Diagnóstico automático se auth_user_id estiver ausente ou se for reset de senha
      if (!existingUser.auth_user_id || userData.password) {
        console.log('UserService.updateUser: [ETAPA 2.5] Executando diagnóstico automático...')
        
        try {
          const diagnostic = await UserSyncService.diagnoseAuthIssues(existingUser.email)
          console.log('UserService.updateUser: [ETAPA 2.5] Resultado do diagnóstico:', diagnostic)
          
          // Se há problemas que podem ser reparados, tentar sincronização
          if (diagnostic.canRepair && diagnostic.issues.length > 0) {
            console.log('UserService.updateUser: [ETAPA 2.5] Tentando reparo automático...')
            const syncResult = await UserSyncService.syncUserData(existingUser.email, true)
            
            if (syncResult.success) {
              console.log('UserService.updateUser: [ETAPA 2.5] ✅ Sincronização bem-sucedida')
              
              // Recarregar dados do usuário após sincronização
              const { data: updatedUserArray, error: reloadError } = await supabase
                .from('users')
                .select('id, name, email, role, status, auth_user_id')
                .eq('id', id)
                .limit(1)
              
              if (!reloadError && updatedUserArray && updatedUserArray.length > 0) {
                Object.assign(existingUser, updatedUserArray[0])
                console.log('UserService.updateUser: [ETAPA 2.5] Dados do usuário recarregados após sincronização')
              }
            } else {
              console.warn('UserService.updateUser: [ETAPA 2.5] Sincronização falhou:', syncResult.errors)
            }
          }
        } catch (diagnosticError) {
          console.warn('UserService.updateUser: [ETAPA 2.5] Erro no diagnóstico (continuando):', diagnosticError)
        }
      }

      console.log('UserService.updateUser: [ETAPA 2] ✅ Usuário encontrado com sucesso')

      // Se uma nova senha foi fornecida, atualizar via Supabase Auth Admin API
      if (userData.password) {
        console.log('UserService.updateUser: [ETAPA 3] Iniciando atualização de senha...')
        console.log('UserService.updateUser: [ETAPA 3] Auth User ID:', existingUser.auth_user_id)
        
        // Registrar tentativa de reset de senha
        await UserSyncService.logAuthEvent(existingUser.id, AuthEventType.PASSWORD_RESET_ATTEMPTED, {
          userEmail: existingUser.email,
          hasAuthUserId: !!existingUser.auth_user_id,
          timestamp: new Date().toISOString()
        })
        
        if (!existingUser.auth_user_id) {
          console.error('UserService.updateUser: [ETAPA 3] ERRO - auth_user_id não encontrado após diagnóstico')
          await UserSyncService.logAuthEvent(existingUser.id, AuthEventType.PASSWORD_RESET_FAILED, {
            success: false,
            errorMessage: 'ID de autenticação não encontrado para o usuário',
            userEmail: existingUser.email
          })
          return { data: null, error: new Error('ID de autenticação não encontrado para o usuário') }
        }

        try {
          console.log('UserService.updateUser: [ETAPA 3] Chamando Supabase Auth Admin API...')
          const authUpdateStart = Date.now()
          
          const { data: authUpdateData, error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.auth_user_id,
            { password: userData.password }
          )

          const authUpdateDuration = Date.now() - authUpdateStart
          console.log('UserService.updateUser: [ETAPA 3] Auth API respondeu em:', authUpdateDuration + 'ms')
          console.log('UserService.updateUser: [ETAPA 3] Resultado da atualização de senha:', {
            success: !authUpdateError,
            error: authUpdateError?.message,
            userUpdated: !!authUpdateData?.user
          })

          if (authUpdateError) {
            console.error('UserService.updateUser: [ETAPA 3] ERRO - Falha na atualização de senha:', authUpdateError)
            await UserSyncService.logAuthEvent(existingUser.id, AuthEventType.PASSWORD_RESET_FAILED, {
              success: false,
              errorMessage: `Erro ao atualizar senha: ${authUpdateError.message}`,
              userEmail: existingUser.email
            })
            return { data: null, error: new Error(`Erro ao atualizar senha: ${authUpdateError.message}`) }
          }

          console.log('UserService.updateUser: [ETAPA 3] ✅ Senha atualizada com sucesso via Auth Admin API')
          
          // Registrar sucesso no reset de senha
          await UserSyncService.logAuthEvent(existingUser.id, AuthEventType.PASSWORD_RESET_SUCCESS, {
            success: true,
            userEmail: existingUser.email,
            timestamp: new Date().toISOString()
          })
          
        } catch (authError) {
          console.error('UserService.updateUser: [ETAPA 3] ERRO - Exceção inesperada:', authError)
          await UserSyncService.logAuthEvent(existingUser.id, AuthEventType.PASSWORD_RESET_FAILED, {
            success: false,
            errorMessage: 'Erro inesperado ao atualizar senha',
            userEmail: existingUser.email
          })
          return { data: null, error: new Error('Erro inesperado ao atualizar senha') }
        }
      } else {
        console.log('UserService.updateUser: [ETAPA 3] PULADA - Nenhuma senha fornecida para atualização')
      }

      console.log('UserService.updateUser: [ETAPA 4] Atualizando dados do perfil...')
      
      // Preparar dados para atualização (excluir password dos dados do perfil)
      const { password, ...profileUpdateData } = userData
      const updateData = {
        ...profileUpdateData,
        updated_at: new Date().toISOString()
      }
      
      console.log('UserService.updateUser: [ETAPA 4] Dados finais para update do perfil:', updateData)
      
      const profileUpdateStart = Date.now()
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()

      const profileUpdateDuration = Date.now() - profileUpdateStart
      console.log('UserService.updateUser: [ETAPA 4] Profile update respondeu em:', profileUpdateDuration + 'ms')
      console.log('UserService.updateUser: [ETAPA 4] Resultado da query de perfil:', { 
        success: !error, 
        error: error?.message,
        dataReturned: !!data 
      })
      
      if (error) {
        console.error('UserService.updateUser: [ETAPA 4] ERRO - Falha na atualização do perfil:', error)
        return { data: null, error }
      }

      if (!data || data.length === 0) {
        console.error('UserService.updateUser: [ETAPA 4] ERRO - Nenhum registro foi atualizado')
        return { data: null, error: new Error('Falha na atualização do usuário') }
      }

      const updatedUser = data[0]
      console.log('UserService.updateUser: [ETAPA 4] ✅ Usuário atualizado com sucesso')
      
      const totalDuration = Date.now() - startTime
      console.log('UserService.updateUser: ========== CONCLUSÃO DA ATUALIZAÇÃO ==========')
      console.log('UserService.updateUser: Tempo total:', totalDuration + 'ms')
      console.log('UserService.updateUser: Status final: SUCESSO')
      console.log('UserService.updateUser: Timestamp final:', new Date().toISOString())

      return { data: updatedUser, error: null }
    } catch (error) {
      const totalDuration = Date.now() - startTime
      console.error('UserService.updateUser: ========== ERRO INESPERADO ==========')
      console.error('UserService.updateUser: Tempo até erro:', totalDuration + 'ms')
      console.error('UserService.updateUser: Erro inesperado:', error)
      console.error('UserService.updateUser: Stack trace:', error instanceof Error ? error.stack : 'N/A')
      return { data: null, error }
    }
  }

  static async deleteUser(id: string): Promise<{ error: any }> {
    try {
      // First delete from users table
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (userError) {
        return { error: userError }
      }

      // Then delete from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(id)

      return { error: authError }
    } catch (error) {
      return { error }
    }
  }

  static async searchUsers(query: string): Promise<{ data: User[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async getUsersByRole(role: UserRole): Promise<{ data: User[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async getUsersByStatus(status: UserStatus): Promise<{ data: User[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }
}