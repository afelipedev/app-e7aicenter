import { supabase, supabaseAdmin } from '../lib/supabase';

// Tipos para diagnóstico
export interface DiagnosticIssue {
  type: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  suggestedAction: string;
}

export interface DiagnosticResult {
  email: string;
  issues: DiagnosticIssue[];
  canRepair: boolean;
  timestamp: string;
}

export interface SyncResult {
  success: boolean;
  actions: string[];
  errors?: string[];
  timestamp: string;
}

export interface RepairResult {
  success: boolean;
  actionsPerformed: string[];
  errors?: string[];
  timestamp: string;
}

// Eventos de auditoria
export enum AuthEventType {
  FIRST_ACCESS_STARTED = 'first_access_started',
  FIRST_ACCESS_ATTEMPTED = 'first_access_attempted',
  FIRST_ACCESS_COMPLETED = 'first_access_completed',
  FIRST_ACCESS_FAILED = 'first_access_failed',
  FIRST_ACCESS_REQUIRED = 'first_access_required',
  PASSWORD_RESET_ATTEMPTED = 'password_reset_attempted',
  PASSWORD_RESET_FAILED = 'password_reset_failed',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',
  USER_SYNC_PERFORMED = 'user_sync_performed',
  AUTH_DIAGNOSTIC_RUN = 'auth_diagnostic_run',
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT_ATTEMPTED = 'logout_attempted',
  LOGOUT_SUCCESS = 'logout_success',
  LOGOUT_FAILED = 'logout_failed',
  SYNC_REQUIRED = 'sync_required',
  SYNC_CHECK_COMPLETED = 'sync_check_completed'
}

export interface AuthLogEntry {
  id?: string;
  userId?: string;
  eventType: AuthEventType;
  eventData: {
    success?: boolean;
    errorMessage?: string;
    userEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp?: string;
    actionsPerformed?: string[];
    errors?: string[];
    additionalData?: Record<string, any>;
  };
  createdAt?: string;
}

export class UserSyncService {
  /**
   * Diagnostica problemas de autenticação para um usuário específico
   */
  static async diagnoseAuthIssues(email: string): Promise<DiagnosticResult> {
    try {
      console.log(`[UserSyncService] Iniciando diagnóstico para: ${email}`);
      
      // Registrar evento de diagnóstico
      await this.logAuthEvent(undefined, AuthEventType.AUTH_DIAGNOSTIC_RUN, {
        userEmail: email,
        timestamp: new Date().toISOString()
      });

      // Chamar função de diagnóstico do banco
      const { data: diagnosticData, error: diagnosticError } = await supabase
        .rpc('diagnose_user_auth_issues', { user_email: email });

      if (diagnosticError) {
        console.error('[UserSyncService] Erro no diagnóstico:', diagnosticError);
        throw new Error(`Erro no diagnóstico: ${diagnosticError.message}`);
      }

      // Verificar se usuário existe em auth.users via admin API
      let authUserExists = false;
      let authUserData = null;
      
      try {
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (!authError && authUsers?.users) {
          authUserData = authUsers.users.find(user => user.email === email);
          authUserExists = !!authUserData;
        }
      } catch (authCheckError) {
        console.warn('[UserSyncService] Não foi possível verificar auth.users:', authCheckError);
      }

      // Processar resultados do diagnóstico
      const issues: DiagnosticIssue[] = [];
      
      if (diagnosticData && Array.isArray(diagnosticData)) {
        diagnosticData.forEach((issue: any) => {
          issues.push({
            type: issue.issue_type,
            description: issue.description,
            severity: issue.severity as DiagnosticIssue['severity'],
            suggestedAction: issue.suggested_action
          });
        });
      }

      // Adicionar verificação de auth.users se não existir
      if (!authUserExists && !issues.some(i => i.type === 'missing_auth_user')) {
        issues.push({
          type: 'missing_auth_user',
          description: 'Usuário não encontrado em auth.users',
          severity: 'high',
          suggestedAction: 'Recriar usuário em auth.users'
        });
      }

      const canRepair = issues.length > 0 && 
        !issues.some(i => i.severity === 'critical') &&
        issues.some(i => ['missing_auth_user_id', 'missing_auth_user'].includes(i.type));

      const result: DiagnosticResult = {
        email,
        issues,
        canRepair,
        timestamp: new Date().toISOString()
      };

      console.log(`[UserSyncService] Diagnóstico concluído:`, result);
      return result;

    } catch (error) {
      console.error('[UserSyncService] Erro no diagnóstico:', error);
      throw new Error(`Falha no diagnóstico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Sincroniza dados entre auth.users e public.users
   */
  static async syncUserData(email: string, forceRepair: boolean = false): Promise<SyncResult> {
    try {
      console.log(`[UserSyncService] Iniciando sincronização para: ${email}`);
      
      const actions: string[] = [];
      const errors: string[] = [];

      // Primeiro, buscar usuário em public.users
      const { data: publicUser, error: publicUserError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .limit(1);

      if (publicUserError) {
        throw new Error(`Erro ao buscar usuário: ${publicUserError.message}`);
      }

      if (!publicUser || publicUser.length === 0) {
        errors.push('Usuário não encontrado em public.users');
        return {
          success: false,
          actions,
          errors,
          timestamp: new Date().toISOString()
        };
      }

      const user = publicUser[0];
      actions.push('Usuário encontrado em public.users');

      // Verificar se auth_user_id existe e é válido
      if (!user.auth_user_id) {
        actions.push('auth_user_id está nulo - tentando sincronizar');

        // Buscar usuário em auth.users
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (authError) {
          errors.push(`Erro ao acessar auth.users: ${authError.message}`);
        } else {
          const authUser = authUsers.users?.find(u => u.email === email);
          
          if (authUser) {
            // Atualizar auth_user_id em public.users
            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update({ auth_user_id: authUser.id })
              .eq('id', user.id);

            if (updateError) {
              errors.push(`Erro ao atualizar auth_user_id: ${updateError.message}`);
            } else {
              actions.push('auth_user_id atualizado com sucesso');
            }
          } else {
            // Usuário não existe em auth.users - recriar se forceRepair for true
            if (forceRepair) {
              try {
                const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                  email: email,
                  password: this.generateTemporaryPassword(),
                  email_confirm: true,
                  user_metadata: {
                    name: user.name,
                    created_via_sync: true
                  }
                });

                if (createError) {
                  errors.push(`Erro ao recriar usuário em auth.users: ${createError.message}`);
                } else if (newAuthUser.user) {
                  // Atualizar auth_user_id
                  const { error: updateError } = await supabaseAdmin
                    .from('users')
                    .update({ auth_user_id: newAuthUser.user.id })
                    .eq('id', user.id);

                  if (updateError) {
                    errors.push(`Erro ao atualizar auth_user_id após recriação: ${updateError.message}`);
                  } else {
                    actions.push('Usuário recriado em auth.users e auth_user_id atualizado');
                  }
                }
              } catch (createError) {
                errors.push(`Falha ao recriar usuário: ${createError}`);
              }
            } else {
              actions.push('Usuário não existe em auth.users - use forceRepair=true para recriar');
            }
          }
        }
      } else {
        // Verificar se auth_user_id é válido
        try {
          const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(user.auth_user_id);
          
          if (authUserError || !authUser.user) {
            actions.push('auth_user_id inválido detectado');
            
            if (forceRepair) {
              // Tentar encontrar usuário por email e corrigir
              const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
              
              if (!listError && authUsers.users) {
                const correctAuthUser = authUsers.users.find(u => u.email === email);
                
                if (correctAuthUser) {
                  const { error: updateError } = await supabaseAdmin
                    .from('users')
                    .update({ auth_user_id: correctAuthUser.id })
                    .eq('id', user.id);

                  if (updateError) {
                    errors.push(`Erro ao corrigir auth_user_id: ${updateError.message}`);
                  } else {
                    actions.push('auth_user_id corrigido com sucesso');
                  }
                } else {
                  errors.push('Usuário não encontrado em auth.users para correção');
                }
              }
            }
          } else {
            actions.push('auth_user_id válido confirmado');
          }
        } catch (verifyError) {
          errors.push(`Erro ao verificar auth_user_id: ${verifyError}`);
        }
      }

      // Registrar evento de sincronização
      await this.logAuthEvent(user.id, AuthEventType.USER_SYNC_PERFORMED, {
        success: errors.length === 0,
        userEmail: email,
        actionsPerformed: actions,
        errors: errors.length > 0 ? errors : undefined
      });

      const result: SyncResult = {
        success: errors.length === 0,
        actions,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      };

      console.log(`[UserSyncService] Sincronização concluída:`, result);
      return result;

    } catch (error) {
      console.error('[UserSyncService] Erro na sincronização:', error);
      throw new Error(`Falha na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Repara inconsistências de dados do usuário
   */
  static async repairUserData(email: string): Promise<RepairResult> {
    try {
      console.log(`[UserSyncService] Iniciando reparo para: ${email}`);
      
      // Primeiro diagnosticar
      const diagnostic = await this.diagnoseAuthIssues(email);
      
      if (!diagnostic.canRepair) {
        return {
          success: false,
          actionsPerformed: [],
          errors: ['Usuário não pode ser reparado automaticamente'],
          timestamp: new Date().toISOString()
        };
      }

      // Executar sincronização com reparo forçado
      const syncResult = await this.syncUserData(email, true);
      
      return {
        success: syncResult.success,
        actionsPerformed: syncResult.actions,
        errors: syncResult.errors,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[UserSyncService] Erro no reparo:', error);
      throw new Error(`Falha no reparo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Registra eventos de auditoria
   */
  static async logAuthEvent(
    userId: string | undefined,
    eventType: AuthEventType,
    eventData: AuthLogEntry['eventData'],
    ipAddress?: string,
    userAgent?: string
  ): Promise<string | null> {
    try {
      // Timeout para evitar que o log trave o processo principal
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Log timeout - 5 segundos')), 5000);
      });

      const logPromise = supabase
        .rpc('log_auth_event', {
          p_user_id: userId || null,
          p_event_type: eventType,
          p_event_data: eventData,
          p_ip_address: ipAddress || null,
          p_user_agent: userAgent || null
        });

      const { data, error } = await Promise.race([logPromise, timeoutPromise]);

      if (error) {
        // Log detalhado do erro mas não interrompe o fluxo principal
        console.warn('[UserSyncService] Erro ao registrar log (não crítico):', {
          error: error.message,
          code: error.code,
          eventType,
          userId: userId ? userId.substring(0, 8) + '...' : 'null'
        });
        
        // Se for erro PGRST202, tentar fallback direto na tabela
        if (error.code === 'PGRST202') {
          console.warn('[UserSyncService] Tentando fallback direto na tabela audit_logs...');
          return await this.logAuthEventFallback(userId, eventType, eventData, ipAddress, userAgent);
        }
        
        return null;
      }

      return data;
    } catch (error: any) {
      // Log do erro mas NUNCA interrompe o fluxo principal
      console.warn('[UserSyncService] Falha ao registrar log (não crítico):', {
        message: error.message,
        eventType,
        userId: userId ? userId.substring(0, 8) + '...' : 'null'
      });
      
      // Tentar fallback se disponível
      if (error.message?.includes('timeout') || error.message?.includes('PGRST202')) {
        console.warn('[UserSyncService] Tentando fallback devido ao erro...');
        return await this.logAuthEventFallback(userId, eventType, eventData, ipAddress, userAgent);
      }
      
      return null;
    }
  }

  /**
   * Fallback para registrar log diretamente na tabela quando a função RPC falha
   */
  private static async logAuthEventFallback(
    userId: string | undefined,
    eventType: AuthEventType,
    eventData: AuthLogEntry['eventData'],
    ipAddress?: string,
    userAgent?: string
  ): Promise<string | null> {
    try {
      // Validação crítica: garantir que eventType nunca seja null/undefined
      if (!eventType) {
        console.error('[UserSyncService] ERRO CRÍTICO: eventType é null/undefined no fallback');
        return null;
      }

      // Log detalhado para debug
      console.info('[UserSyncService] Executando fallback com:', {
        userId: userId ? userId.substring(0, 8) + '...' : 'null',
        eventType,
        hasEventData: !!eventData,
        ipAddress: ipAddress || 'null',
        userAgent: userAgent ? userAgent.substring(0, 50) + '...' : 'null'
      });

      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId || null,
          event_type: eventType, // Garantido que não é null pela validação acima
          event_data: eventData || {},
          ip_address: ipAddress || null, // Supabase client handles inet conversion automatically
          user_agent: userAgent || null,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.warn('[UserSyncService] Fallback também falhou:', {
          error: error.message,
          code: error.code,
          details: error.details,
          eventType,
          userId: userId ? userId.substring(0, 8) + '...' : 'null'
        });
        return null;
      }

      console.info('[UserSyncService] Log registrado via fallback com sucesso:', data.id);
      return data.id;
    } catch (error: any) {
      console.warn('[UserSyncService] Fallback falhou completamente:', {
        message: error.message,
        eventType,
        userId: userId ? userId.substring(0, 8) + '...' : 'null'
      });
      return null;
    }
  }

  /**
   * Busca logs de auditoria para um usuário
   */
  static async getAuditLogs(
    userId: string,
    eventTypes?: AuthEventType[],
    limit: number = 50
  ): Promise<AuthLogEntry[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (eventTypes && eventTypes.length > 0) {
        query = query.in('event_type', eventTypes);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[UserSyncService] Erro ao buscar logs:', error);
        return [];
      }

      return (data || []).map(log => ({
        id: log.id,
        userId: log.user_id,
        eventType: log.event_type as AuthEventType,
        eventData: log.event_data || {},
        createdAt: log.created_at
      }));

    } catch (error) {
      console.error('[UserSyncService] Falha ao buscar logs:', error);
      return [];
    }
  }

  /**
   * Gera senha temporária para usuários recriados
   */
  private static generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Verifica se um usuário precisa de sincronização
   */
  static async needsSync(email: string): Promise<boolean> {
    try {
      const diagnostic = await this.diagnoseAuthIssues(email);
      return diagnostic.issues.some(issue => 
        ['missing_auth_user_id', 'missing_auth_user'].includes(issue.type)
      );
    } catch (error) {
      console.error('[UserSyncService] Erro ao verificar necessidade de sync:', error);
      return false;
    }
  }
}