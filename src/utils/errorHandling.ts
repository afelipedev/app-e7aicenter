import { useToast } from "@/hooks/use-toast";

export interface ErrorDetails {
  code?: string;
  message: string;
  details?: any;
  timestamp: Date;
  context?: string;
}

export class PayrollError extends Error {
  public code?: string;
  public details?: any;
  public context?: string;
  public timestamp: Date;

  constructor(message: string, code?: string, details?: any, context?: string) {
    super(message);
    this.name = 'PayrollError';
    this.code = code;
    this.details = details;
    this.context = context;
    this.timestamp = new Date();
  }
}

export class NetworkError extends PayrollError {
  constructor(message: string = 'Erro de conexão', details?: any) {
    super(message, 'NETWORK_ERROR', details, 'network');
  }
}

export class ValidationError extends PayrollError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details, 'validation');
  }
}

export class ProcessingError extends PayrollError {
  constructor(message: string, details?: any) {
    super(message, 'PROCESSING_ERROR', details, 'processing');
  }
}

export class AuthenticationError extends PayrollError {
  constructor(message: string = 'Erro de autenticação') {
    super(message, 'AUTH_ERROR', null, 'authentication');
  }
}

export class PermissionError extends PayrollError {
  constructor(message: string = 'Permissão negada') {
    super(message, 'PERMISSION_ERROR', null, 'permission');
  }
}

/**
 * Enhanced error handler with context-aware error messages and logging
 */
export class ErrorHandler {
  private static logError(error: Error | PayrollError, context?: string) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
      ...(error instanceof PayrollError && {
        code: error.code,
        details: error.details,
        errorContext: error.context
      })
    };

    console.error('PayrollSystem Error:', errorInfo);

    // In production, you might want to send this to a logging service
    // logToService(errorInfo);
  }

  /**
   * Handle errors with appropriate user feedback and logging
   */
  static handle(error: unknown, context?: string, showToast: boolean = true, toastFn?: any): ErrorDetails {
    let errorDetails: ErrorDetails;

    if (error instanceof PayrollError) {
      errorDetails = {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp,
        context: error.context || context
      };
    } else if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('fetch')) {
        errorDetails = {
          code: 'NETWORK_ERROR',
          message: 'Erro de conexão. Verifique sua internet e tente novamente.',
          timestamp: new Date(),
          context
        };
      } else if (error.message.includes('permission')) {
        errorDetails = {
          code: 'PERMISSION_ERROR',
          message: 'Você não tem permissão para realizar esta ação.',
          timestamp: new Date(),
          context
        };
      } else if (error.message.includes('timeout')) {
        errorDetails = {
          code: 'TIMEOUT_ERROR',
          message: 'A operação demorou muito para responder. Tente novamente.',
          timestamp: new Date(),
          context
        };
      } else {
        errorDetails = {
          message: error.message || 'Erro desconhecido',
          timestamp: new Date(),
          context
        };
      }
    } else {
      errorDetails = {
        message: 'Erro desconhecido',
        timestamp: new Date(),
        context
      };
    }

    this.logError(error instanceof Error ? error : new Error(String(error)), context);

    if (showToast) {
      this.showErrorToast(errorDetails, toastFn);
    }

    return errorDetails;
  }

  /**
   * Show appropriate toast message based on error type
   */
  private static showErrorToast(errorDetails: ErrorDetails, toastFn?: any) {
    if (!toastFn) return;
    
    const { code, message, context } = errorDetails;

    let title = 'Erro';
    let description = message;

    switch (code) {
      case 'NETWORK_ERROR':
        title = 'Erro de Conexão';
        break;
      case 'VALIDATION_ERROR':
        title = 'Erro de Validação';
        break;
      case 'PROCESSING_ERROR':
        title = 'Erro de Processamento';
        break;
      case 'AUTH_ERROR':
        title = 'Erro de Autenticação';
        break;
      case 'PERMISSION_ERROR':
        title = 'Permissão Negada';
        break;
      case 'TIMEOUT_ERROR':
        title = 'Timeout';
        break;
    }

    // Add context to title if available
    if (context) {
      const contextMap: Record<string, string> = {
        upload: 'Upload',
        processing: 'Processamento',
        download: 'Download',
        validation: 'Validação',
        authentication: 'Autenticação',
        network: 'Conexão'
      };
      
      const contextLabel = contextMap[context] || context;
      title = `Erro - ${contextLabel}`;
    }

    toastFn({
      title,
      description,
      variant: 'destructive',
    });
  }

  /**
   * Handle async operations with error handling
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    context?: string,
    showToast: boolean = true
  ): Promise<{ data?: T; error?: ErrorDetails }> {
    try {
      const data = await operation();
      return { data };
    } catch (error) {
      const errorDetails = this.handle(error, context, showToast);
      return { error: errorDetails };
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    context?: string
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`Retry attempt ${attempt}/${maxRetries} for ${context || 'operation'}`);
      }
    }

    throw lastError;
  }

  /**
   * Validate file before upload
   */
  static validateFile(file: File, maxSize: number = 10 * 1024 * 1024): void {
    if (!file) {
      throw new ValidationError('Nenhum arquivo selecionado');
    }

    if (file.size > maxSize) {
      throw new ValidationError(
        `Arquivo muito grande. Tamanho máximo: ${Math.round(maxSize / 1024 / 1024)}MB`,
        { fileSize: file.size, maxSize }
      );
    }

    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new ValidationError(
        'Tipo de arquivo não suportado. Apenas arquivos PDF são aceitos.',
        { fileType: file.type, allowedTypes }
      );
    }
  }

  /**
   * Validate batch upload
   */
  static validateBatchUpload(files: File[], maxFiles: number = 50): void {
    if (!files || files.length === 0) {
      throw new ValidationError('Nenhum arquivo selecionado para upload');
    }

    if (files.length > maxFiles) {
      throw new ValidationError(
        `Muitos arquivos selecionados. Máximo: ${maxFiles} arquivos`,
        { fileCount: files.length, maxFiles }
      );
    }

    files.forEach((file, index) => {
      try {
        ErrorHandler.validateFile(file);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(
            `Arquivo ${index + 1} (${file.name}): ${error.message}`,
            { fileIndex: index, fileName: file.name, originalError: error }
          );
        }
        throw error;
      }
    });
  }

  /**
   * Create user-friendly error messages for common scenarios
   */
  static getContextualErrorMessage(error: unknown, context: string): string {
    const baseMessage = error instanceof Error ? error.message : String(error);

    const contextMessages: Record<string, Record<string, string>> = {
      upload: {
        'network': 'Falha no upload. Verifique sua conexão e tente novamente.',
        'timeout': 'Upload demorou muito. Tente com arquivos menores.',
        'permission': 'Sem permissão para fazer upload. Contate o administrador.',
        'validation': 'Arquivo inválido para upload.',
        'default': 'Erro durante o upload. Tente novamente.'
      },
      processing: {
        'network': 'Falha na comunicação com o servidor de processamento.',
        'timeout': 'Processamento demorou muito. Tente novamente mais tarde.',
        'validation': 'Dados inválidos para processamento.',
        'default': 'Erro durante o processamento. Tente novamente.'
      },
      download: {
        'network': 'Falha no download. Verifique sua conexão.',
        'permission': 'Sem permissão para baixar este arquivo.',
        'default': 'Erro durante o download. Tente novamente.'
      }
    };

    const contextMap = contextMessages[context];
    if (!contextMap) return baseMessage;

    // Try to match error type
    for (const [errorType, message] of Object.entries(contextMap)) {
      if (errorType !== 'default' && baseMessage.toLowerCase().includes(errorType)) {
        return message;
      }
    }

    return contextMap.default || baseMessage;
  }
}

/**
 * Hook for handling errors in React components
 */
export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = (error: unknown, context?: string, showToast: boolean = true) => {
    return ErrorHandler.handle(error, context, showToast, toast);
  };

  const handleAsync = async <T>(
    operation: () => Promise<T>,
    context?: string,
    showToast: boolean = true
  ) => {
    return ErrorHandler.handleAsync(operation, context, showToast);
  };

  const retry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    context?: string
  ) => {
    return ErrorHandler.retry(operation, maxRetries, baseDelay, context);
  };

  return {
    handleError,
    handleAsync,
    retry,
    validateFile: ErrorHandler.validateFile,
    validateBatchUpload: ErrorHandler.validateBatchUpload
  };
};