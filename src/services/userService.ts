import { supabase, User, UserRole, UserStatus } from '../lib/supabase'
import { createClient } from '@supabase/supabase-js'

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
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async createUser(userData: CreateUserData): Promise<{ data: User | null; error: any }> {
    try {
      // First, create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name
          }
        }
      })

      if (authError || !authData.user) {
        return { data: null, error: authError }
      }

      // Then create the user profile
      const { data, error } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          status: userData.status || 'ativo'
        })
        .select()
        .single()

      return { data, error }
    } catch (error) {
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
        return { data: null, error: sessionError }
      }
      
      if (!session) {
        console.error('UserService.updateUser: [ETAPA 1] ERRO - Usuário não autenticado')
        return { data: null, error: new Error('Usuário não autenticado') }
      }

      console.log('UserService.updateUser: [ETAPA 1] ✅ Usuário autenticado com sucesso')
      console.log('UserService.updateUser: [ETAPA 1] Session user ID:', session.user?.id)
      
      // Primeiro, verificar se o usuário existe e obter o auth_user_id
      console.log('UserService.updateUser: [ETAPA 2] Verificando existência do usuário...')
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, name, email, role, status, auth_user_id')
        .eq('id', id)
        .single()

      console.log('UserService.updateUser: [ETAPA 2] Resultado da verificação:', { 
        found: !!existingUser, 
        hasAuthId: !!existingUser?.auth_user_id,
        error: checkError?.message 
      })

      if (checkError) {
        console.error('UserService.updateUser: [ETAPA 2] ERRO - Falha ao verificar usuário:', checkError)
        if (checkError.code === 'PGRST116') {
          return { data: null, error: new Error('Usuário não encontrado') }
        }
        return { data: null, error: checkError }
      }

      if (!existingUser) {
        console.error('UserService.updateUser: [ETAPA 2] ERRO - Usuário não encontrado com ID:', id)
        return { data: null, error: new Error('Usuário não encontrado') }
      }

      console.log('UserService.updateUser: [ETAPA 2] ✅ Usuário encontrado com sucesso')

      // Se uma nova senha foi fornecida, atualizar via Supabase Auth Admin API
      if (userData.password) {
        console.log('UserService.updateUser: [ETAPA 3] Iniciando atualização de senha...')
        console.log('UserService.updateUser: [ETAPA 3] Auth User ID:', existingUser.auth_user_id)
        
        if (!existingUser.auth_user_id) {
          console.error('UserService.updateUser: [ETAPA 3] ERRO - auth_user_id não encontrado')
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
            return { data: null, error: new Error(`Erro ao atualizar senha: ${authUpdateError.message}`) }
          }

          console.log('UserService.updateUser: [ETAPA 3] ✅ Senha atualizada com sucesso via Auth Admin API')
        } catch (authError) {
          console.error('UserService.updateUser: [ETAPA 3] ERRO - Exceção inesperada:', authError)
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
        .single()

      const profileUpdateDuration = Date.now() - profileUpdateStart
      console.log('UserService.updateUser: [ETAPA 4] Profile update respondeu em:', profileUpdateDuration + 'ms')
      console.log('UserService.updateUser: [ETAPA 4] Resultado da query de perfil:', { 
        success: !error, 
        error: error?.message,
        dataReturned: !!data 
      })
      
      if (error) {
        console.error('UserService.updateUser: [ETAPA 4] ERRO - Falha na atualização do perfil:', error)
        if (error.code === 'PGRST116') {
          return { data: null, error: new Error('Nenhuma linha foi atualizada. Verifique se o usuário existe e você tem permissão para atualizá-lo.') }
        }
      } else {
        console.log('UserService.updateUser: [ETAPA 4] ✅ Perfil atualizado com sucesso')
        if (userData.password) {
          console.log('UserService.updateUser: [ETAPA 4] ✅ Senha também foi atualizada com sucesso')
        }
      }

      const totalDuration = Date.now() - startTime
      console.log('UserService.updateUser: ========== CONCLUSÃO DA ATUALIZAÇÃO ==========')
      console.log('UserService.updateUser: Tempo total:', totalDuration + 'ms')
      console.log('UserService.updateUser: Status final:', error ? 'ERRO' : 'SUCESSO')
      console.log('UserService.updateUser: Timestamp final:', new Date().toISOString())

      return { data, error }
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