import { useState, useEffect, useCallback, useRef } from 'react';
import { PayrollProcessing, ProcessingLog } from '../../shared/types/payroll';
import { PayrollService } from '@/services/payrollService';
import { toast } from 'sonner';

interface UseProcessingUpdatesOptions {
  /** ID do processamento para monitorar */
  processingId?: string;
  /** Se deve monitorar todos os processamentos ativos */
  monitorAll?: boolean;
  /** Intervalo de atualização em ms (padrão: 5000) */
  refreshInterval?: number;
  /** Se deve mostrar notificações toast */
  showNotifications?: boolean;
}

interface UseProcessingUpdatesReturn {
  /** Processamento atual (quando monitorando um específico) */
  processing: PayrollProcessing | null;
  /** Lista de processamentos ativos (quando monitorando todos) */
  activeProcessings: PayrollProcessing[];
  /** Logs do processamento atual */
  logs: ProcessingLog[];
  /** Se está carregando */
  loading: boolean;
  /** Erro, se houver */
  error: string | null;
  /** Função para recarregar dados */
  refresh: () => Promise<void>;
  /** Função para cancelar processamento */
  cancelProcessing: (id: string) => Promise<void>;
  /** Função para reprocessar lote */
  reprocessBatch: (id: string) => Promise<void>;
}

/**
 * Hook para monitorar atualizações de processamento em tempo real
 */
export function useProcessingUpdates(options: UseProcessingUpdatesOptions = {}): UseProcessingUpdatesReturn {
  const {
    processingId,
    monitorAll = false,
    refreshInterval = 5000,
    showNotifications = true
  } = options;

  const [processing, setProcessing] = useState<PayrollProcessing | null>(null);
  const [activeProcessings, setActiveProcessings] = useState<PayrollProcessing[]>([]);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs para controlar subscriptions e intervals
  const processingSubscriptionRef = useRef<(() => void) | null>(null);
  const logsSubscriptionRef = useRef<(() => void) | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationRef = useRef<{ [key: string]: string }>({});

  /**
   * Carrega dados iniciais
   */
  const loadData = useCallback(async () => {
    try {
      setError(null);

      if (processingId) {
        // Carregar processamento específico
        const [processingData, logsData] = await Promise.all([
          PayrollService.getProcessingDetails(processingId),
          PayrollService.getProcessingLogs(processingId)
        ]);

        setProcessing(processingData);
        setLogs(logsData);
      }

      if (monitorAll) {
        // Carregar todos os processamentos ativos
        const activeData = await PayrollService.getCurrentProcessings();
        setActiveProcessings(activeData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMessage);
      console.error('Erro ao carregar dados de processamento:', err);
    } finally {
      setLoading(false);
    }
  }, [processingId, monitorAll]);

  /**
   * Configura subscriptions do Supabase
   */
  const setupSubscriptions = useCallback(() => {
    // Limpar subscriptions existentes
    if (processingSubscriptionRef.current) {
      processingSubscriptionRef.current();
      processingSubscriptionRef.current = null;
    }
    if (logsSubscriptionRef.current) {
      logsSubscriptionRef.current();
      logsSubscriptionRef.current = null;
    }

    if (processingId) {
      // Subscription para atualizações do processamento
      processingSubscriptionRef.current = PayrollService.subscribeToProcessingUpdates(
        processingId,
        (updatedProcessing) => {
          setProcessing(prev => {
            // Verificar se houve mudança significativa para notificação
            if (prev && showNotifications) {
              const prevStatus = prev.status;
              const newStatus = updatedProcessing.status;
              const prevProgress = prev.progress || 0;
              const newProgress = updatedProcessing.progress || 0;

              // Notificar mudanças de status
              if (prevStatus !== newStatus) {
                const notificationKey = `${processingId}_status_${newStatus}`;
                if (lastNotificationRef.current[notificationKey] !== newStatus) {
                  lastNotificationRef.current[notificationKey] = newStatus;

                  switch (newStatus) {
                    case 'completed':
                      toast.success('Processamento concluído com sucesso!');
                      break;
                    case 'error':
                      toast.error(`Erro no processamento: ${updatedProcessing.error_message || 'Erro desconhecido'}`);
                      break;

                  }
                }
              }

              // Notificar progresso significativo (a cada 25%)
              const progressThreshold = 25;
              const prevThreshold = Math.floor(prevProgress / progressThreshold);
              const newThreshold = Math.floor(newProgress / progressThreshold);

              if (newThreshold > prevThreshold && newStatus === 'processing') {
                toast.info(`Processamento ${newProgress}% concluído`);
              }
            }

            return updatedProcessing;
          });
        }
      );

      // Subscription para novos logs
      logsSubscriptionRef.current = PayrollService.subscribeToProcessingLogs(
        processingId,
        (newLog) => {
          setLogs(prev => [...prev, newLog]);

          // Notificar logs de erro
          if (newLog.level === 'error' && showNotifications) {
            toast.error(`Erro: ${newLog.message}`);
          }
        }
      );
    }
  }, [processingId, showNotifications]);

  /**
   * Configura polling para processamentos ativos
   */
  const setupPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (monitorAll) {
      intervalRef.current = setInterval(async () => {
        try {
          const activeData = await PayrollService.getCurrentProcessings();
          setActiveProcessings(prev => {
            // Verificar novos processamentos para notificação
            if (showNotifications && prev.length > 0) {
              const newProcessings = activeData.filter(
                current => !prev.some(p => p.id === current.id)
              );

              newProcessings.forEach(processing => {
                toast.info(`Novo processamento iniciado: Empresa ${processing.company_id}`);
              });
            }

            return activeData;
          });
        } catch (err) {
          console.error('Erro no polling de processamentos ativos:', err);
        }
      }, refreshInterval);
    }
  }, [monitorAll, refreshInterval, showNotifications]);

  /**
   * Função para recarregar dados manualmente
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    await loadData();
  }, [loadData]);

  /**
   * Função para cancelar processamento
   */
  const cancelProcessing = useCallback(async (id: string) => {
    try {
      await PayrollService.cancelProcessing(id);
      toast.success('Processamento cancelado com sucesso');
      await refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao cancelar processamento';
      toast.error(errorMessage);
      throw err;
    }
  }, [refresh]);

  /**
   * Função para reprocessar lote
   */
  const reprocessBatch = useCallback(async (id: string) => {
    try {
      await PayrollService.reprocessBatch(id);
      toast.success('Reprocessamento iniciado com sucesso');
      await refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao reprocessar lote';
      toast.error(errorMessage);
      throw err;
    }
  }, [refresh]);

  // Effect para carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setError(null);

        if (processingId) {
          // Carregar processamento específico
          const [processingData, logsData] = await Promise.all([
            PayrollService.getProcessingDetails(processingId),
            PayrollService.getProcessingLogs(processingId)
          ]);

          setProcessing(processingData);
          setLogs(logsData);
        }

        if (monitorAll) {
          // Carregar todos os processamentos ativos
          const activeData = await PayrollService.getCurrentProcessings();
          setActiveProcessings(activeData);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
        setError(errorMessage);
        console.error('Erro ao carregar dados de processamento:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [processingId, monitorAll]);

  // Effect para configurar subscriptions
  useEffect(() => {
    // Limpar subscriptions existentes
    if (processingSubscriptionRef.current) {
      processingSubscriptionRef.current();
      processingSubscriptionRef.current = null;
    }
    if (logsSubscriptionRef.current) {
      logsSubscriptionRef.current();
      logsSubscriptionRef.current = null;
    }

    if (processingId) {
      // Subscription para atualizações do processamento
      processingSubscriptionRef.current = PayrollService.subscribeToProcessingUpdates(
        processingId,
        (updatedProcessing) => {
          setProcessing(prev => {
            // Verificar se houve mudança significativa para notificação
            if (prev && showNotifications) {
              const prevStatus = prev.status;
              const newStatus = updatedProcessing.status;
              const prevProgress = prev.progress || 0;
              const newProgress = updatedProcessing.progress || 0;

              // Notificar mudanças de status
              if (prevStatus !== newStatus) {
                const notificationKey = `${processingId}_status_${newStatus}`;
                if (lastNotificationRef.current[notificationKey] !== newStatus) {
                  lastNotificationRef.current[notificationKey] = newStatus;

                  switch (newStatus) {
                    case 'completed':
                      toast.success('Processamento concluído com sucesso!');
                      break;
                    case 'error':
                      toast.error(`Erro no processamento: ${updatedProcessing.error_message || 'Erro desconhecido'}`);
                      break;
                  }
                }
              }

              // Notificar progresso significativo (a cada 25%)
              const progressThreshold = 25;
              const prevThreshold = Math.floor(prevProgress / progressThreshold);
              const newThreshold = Math.floor(newProgress / progressThreshold);

              if (newThreshold > prevThreshold && newStatus === 'processing') {
                toast.info(`Processamento ${newProgress}% concluído`);
              }
            }

            return updatedProcessing;
          });
        }
      );

      // Subscription para novos logs
      logsSubscriptionRef.current = PayrollService.subscribeToProcessingLogs(
        processingId,
        (newLog) => {
          setLogs(prev => [...prev, newLog]);

          // Notificar logs de erro
          if (newLog.level === 'error' && showNotifications) {
            toast.error(`Erro: ${newLog.message}`);
          }
        }
      );
    }

    return () => {
      if (processingSubscriptionRef.current) {
        processingSubscriptionRef.current();
      }
      if (logsSubscriptionRef.current) {
        logsSubscriptionRef.current();
      }
    };
  }, [processingId, showNotifications]);

  // Effect para configurar polling
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (monitorAll) {
      intervalRef.current = setInterval(async () => {
        try {
          const activeData = await PayrollService.getCurrentProcessings();
          
          setActiveProcessings(prev => {
            // Verificar novos processamentos para notificação
            if (showNotifications && prev.length > 0) {
              const newProcessings = activeData.filter(
                current => !prev.some(p => p.id === current.id)
              );

              newProcessings.forEach(processing => {
                toast.info(`Novo processamento iniciado: Empresa ${processing.company_id}`);
              });
            }

            // Verificar se todos os processamentos estão finalizados
            const hasActiveProcessings = activeData.some(p => 
              p.status === 'processing' || p.status === 'pending'
            );

            // Se não há processamentos ativos, parar o polling
            if (!hasActiveProcessings) {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                console.log('Polling parado: nenhum processamento ativo encontrado');
              }
            }

            return activeData;
          });
        } catch (err) {
          console.error('Erro no polling de processamentos ativos:', err);
          // Em caso de erro, reduzir a frequência do polling
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = setInterval(async () => {
              try {
                const activeData = await PayrollService.getCurrentProcessings();
                setActiveProcessings(activeData);
              } catch (retryErr) {
                console.error('Erro persistente no polling:', retryErr);
              }
            }, refreshInterval * 3); // Triplicar o intervalo em caso de erro
          }
        }
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [monitorAll, refreshInterval, showNotifications]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (processingSubscriptionRef.current) {
        processingSubscriptionRef.current();
      }
      if (logsSubscriptionRef.current) {
        logsSubscriptionRef.current();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    processing,
    activeProcessings,
    logs,
    loading,
    error,
    refresh,
    cancelProcessing,
    reprocessBatch
  };
}

/**
 * Hook simplificado para monitorar um processamento específico
 */
export function useProcessingDetails(processingId: string) {
  return useProcessingUpdates({
    processingId,
    monitorAll: false,
    showNotifications: true
  });
}

/**
 * Hook simplificado para monitorar todos os processamentos ativos
 */
export function useActiveProcessings() {
  return useProcessingUpdates({
    monitorAll: true,
    showNotifications: true,
    refreshInterval: 3000 // Mais frequente para processamentos ativos
  });
}