import { supabase, supabaseAdmin } from '../lib/supabase'
import { UserSyncService, AuthEventType } from './userSyncService'

export interface FirstAccessStatus {
  needsFirstAccess: boolean
  userId?: string
  email?: string
  lastLoginAt?: string
  firstAccessAt?: string
}

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
  score: number
}

export interface FirstAccessCompletionResult {
  success: boolean
  error?: string
  userId?: string
}

export class FirstAccessService {
  /**
   * Verifica se o usuário precisa completar o primeiro acesso
   */
  static async checkFirstAccessStatus(userEmail: string): Promise<FirstAccessStatus> {
    try {
      console.log('FirstAccessService.checkFirstAccessStatus: Verificando status para:', userEmail)
      
      // Buscar o usuário por email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, first_access_completed, first_access_at, last_access')
        .eq('email', userEmail)
        .eq('status', 'ativo')
        .single()
      
      if (userError || !userData) {
        console.log('FirstAccessService.checkFirstAccessStatus: Usuário não encontrado ou inativo')
        return {
          needsFirstAccess: false,
          userId: undefined,
          email: userEmail,
          lastLoginAt: undefined,
          firstAccessAt: undefined
        }
      }
      
      console.log('FirstAccessService.checkFirstAccessStatus: Dados do usuário:', {
        id: userData.id,
        email: userData.email,
        first_access_completed: userData.first_access_completed,
        first_access_at: userData.first_access_at
      })
      
      // Verificar se precisa de primeiro acesso baseado diretamente no campo da tabela
      const needsFirstAccess = !userData.first_access_completed
      
      console.log('FirstAccessService.checkFirstAccessStatus: Resultado final:', {
        needsFirstAccess,
        userId: userData.id
      })
      
      return {
        needsFirstAccess,
        userId: userData.id,
        email: userEmail,
        lastLoginAt: userData.last_access,
        firstAccessAt: userData.first_access_at
      }
    } catch (error) {
      console.error('FirstAccessService.checkFirstAccessStatus: Erro inesperado:', error)
      throw error
    }
  }

  /**
   * Valida a complexidade da senha em tempo real
   */
  static validatePasswordComplexity(password: string): PasswordValidationResult {
    const errors: string[] = []
    let score = 0
    
    // Verificações de complexidade
    if (password.length < 8) {
      errors.push('A senha deve ter pelo menos 8 caracteres')
    } else {
      score += 1
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra minúscula')
    } else {
      score += 1
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra maiúscula')
    } else {
      score += 1
    }
    
    if (!/\d/.test(password)) {
      errors.push('A senha deve conter pelo menos um número')
    } else {
      score += 1
    }
    
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('A senha deve conter pelo menos um caractere especial')
    } else {
      score += 1
    }
    
    // Verificações adicionais para pontuação
    if (password.length >= 12) {
      score += 1
    }
    
    if (/(.)\1{2,}/.test(password)) {
      errors.push('A senha não deve conter caracteres repetidos consecutivos')
      score -= 1
    }
    
    // Determinar força da senha
    let strength: 'weak' | 'medium' | 'strong'
    if (score <= 2) {
      strength = 'weak'
    } else if (score <= 4) {
      strength = 'medium'
    } else {
      strength = 'strong'
    }
    
    return {
      isValid: errors.length === 0 && score >= 4,
      errors,
      strength,
      score: Math.max(0, score)
    }
  }

  /**
   * Completa o primeiro acesso do usuário
   */
  static async completeFirstAccess(
    userId: string, 
    newPassword: string
  ): Promise<FirstAccessCompletionResult> {
    try {
      console.log('FirstAccessService.completeFirstAccess: Iniciando para usuário:', userId)
      
      // Validar senha
      const passwordValidation = this.validatePasswordComplexity(newPassword)
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: `Senha inválida: ${passwordValidation.errors.join(', ')}`
        }
      }
      
      // Obter dados do usuário
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, auth_user_id, first_access_completed')
        .eq('id', userId)
        .single()
      
      if (userError || !userData) {
        console.error('FirstAccessService.completeFirstAccess: Usuário não encontrado:', userError)
        return {
          success: false,
          error: 'Usuário não encontrado'
        }
      }
      
      // Verificar se já completou o primeiro acesso
      if (userData.first_access_completed) {
        console.log('FirstAccessService.completeFirstAccess: Primeiro acesso já foi completado')
        return {
          success: true,
          userId: userData.id
        }
      }
      
      // Registrar tentativa de primeiro acesso
      await UserSyncService.logAuthEvent(userData.id, AuthEventType.FIRST_ACCESS_ATTEMPTED, {
        userEmail: userData.email,
        timestamp: new Date().toISOString()
      })
      
      // Atualizar senha no Supabase Auth se auth_user_id existir
      if (userData.auth_user_id) {
        console.log('FirstAccessService.completeFirstAccess: Atualizando senha no Auth...')
        
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          userData.auth_user_id,
          { password: newPassword }
        )
        
        if (authError) {
          console.error('FirstAccessService.completeFirstAccess: Erro ao atualizar senha:', authError)
          await UserSyncService.logAuthEvent(userData.id, AuthEventType.FIRST_ACCESS_FAILED, {
            userEmail: userData.email,
            errorMessage: `Erro ao atualizar senha: ${authError.message}`
          })
          return {
            success: false,
            error: `Erro ao atualizar senha: ${authError.message}`
          }
        }
      }
      
      // Marcar primeiro acesso como completado usando função do banco
      const { data: completionData, error: completionError } = await supabase.rpc('complete_first_access', {
        user_id: userId
      })
      
      if (completionError) {
        console.error('FirstAccessService.completeFirstAccess: Erro ao marcar como completado:', completionError)
        await UserSyncService.logAuthEvent(userData.id, AuthEventType.FIRST_ACCESS_FAILED, {
          userEmail: userData.email,
          errorMessage: `Erro ao marcar primeiro acesso: ${completionError.message}`
        })
        return {
          success: false,
          error: `Erro ao completar primeiro acesso: ${completionError.message}`
        }
      }
      
      console.log('FirstAccessService.completeFirstAccess: Primeiro acesso completado com sucesso')
      
      // Registrar sucesso
      await UserSyncService.logAuthEvent(userData.id, AuthEventType.FIRST_ACCESS_COMPLETED, {
        userEmail: userData.email,
        timestamp: new Date().toISOString(),
        success: true
      })
      
      return {
        success: true,
        userId: userData.id
      }
      
    } catch (error) {
      console.error('FirstAccessService.completeFirstAccess: Erro inesperado:', error)
      return {
        success: false,
        error: 'Erro inesperado ao completar primeiro acesso'
      }
    }
  }

  /**
   * Lista usuários que precisam completar o primeiro acesso
   */
  static async getUsersRequiringFirstAccess(): Promise<unknown[]> {
    try {
      const { data, error } = await supabase.rpc('get_users_requiring_first_access')
      
      if (error) {
        console.error('FirstAccessService.getUsersRequiringFirstAccess: Erro:', error)
        throw error
      }
      
      return data || []
    } catch (error) {
      console.error('FirstAccessService.getUsersRequiringFirstAccess: Erro inesperado:', error)
      throw error
    }
  }

  /**
   * Força a marcação de primeiro acesso como necessário para um usuário
   */
  static async requireFirstAccess(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          first_access_completed: false,
          first_access_at: null
        })
        .eq('id', userId)
      
      if (error) {
        console.error('FirstAccessService.requireFirstAccess: Erro:', error)
        return false
      }
      
      // Registrar evento
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single()
      
      if (userData) {
        await UserSyncService.logAuthEvent(userId, AuthEventType.FIRST_ACCESS_REQUIRED, {
          userEmail: userData.email,
          timestamp: new Date().toISOString()
        })
      }
      
      return true
    } catch (error) {
      console.error('FirstAccessService.requireFirstAccess: Erro inesperado:', error)
      return false
    }
  }

  /**
   * Gera uma senha temporária para novos usuários
   */
  static generateTemporaryPassword(): string {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    
    // Garantir pelo menos um de cada tipo
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
    password += '0123456789'[Math.floor(Math.random() * 10)]
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]
    
    // Preencher o resto
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)]
    }
    
    // Embaralhar
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }
}