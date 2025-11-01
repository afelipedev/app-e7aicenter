import React, { useState, useEffect } from 'react'
import { FirstAccessService, FirstAccessStatus } from '../services/firstAccessService'
import { FirstAccessModal } from './FirstAccessModal'
import { useAuth } from '../contexts/AuthContext'

interface FirstAccessGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const FirstAccessGuard: React.FC<FirstAccessGuardProps> = ({
  children,
  fallback
}) => {
  const { user, logout } = useAuth()
  const [isChecking, setIsChecking] = useState(true)
  const [needsFirstAccess, setNeedsFirstAccess] = useState(false)
  const [firstAccessStatus, setFirstAccessStatus] = useState<FirstAccessStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkFirstAccessStatus()
  }, [user])

  const checkFirstAccessStatus = async () => {
    if (!user?.email) {
      setIsChecking(false)
      return
    }

    try {
      setIsChecking(true)
      setError(null)

      console.log('FirstAccessGuard: Verificando status de primeiro acesso para:', user.email)
      
      const status = await FirstAccessService.checkFirstAccessStatus(user.email)
      
      console.log('FirstAccessGuard: Status obtido:', status)
      
      setFirstAccessStatus(status)
      setNeedsFirstAccess(status.needsFirstAccess)
      
    } catch (err) {
      console.error('FirstAccessGuard: Erro ao verificar status:', err)
      setError('Erro ao verificar status de primeiro acesso')
    } finally {
      setIsChecking(false)
    }
  }

  const handleFirstAccessComplete = async (success: boolean) => {
    if (success) {
      console.log('FirstAccessGuard: Primeiro acesso completado com sucesso')
      setNeedsFirstAccess(false)
      setFirstAccessStatus(prev => prev ? { ...prev, needsFirstAccess: false } : null)
      
      // Recarregar a página para atualizar o estado da aplicação
      window.location.reload()
    } else {
      console.error('FirstAccessGuard: Falha ao completar primeiro acesso')
      setError('Falha ao completar primeiro acesso')
    }
  }

  const handleFirstAccessCancel = () => {
    // Por segurança, fazer logout se o usuário cancelar o primeiro acesso
    console.log('FirstAccessGuard: Primeiro acesso cancelado, fazendo logout')
    logout()
  }

  // Loading state
  if (isChecking) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">Verificando configurações de acesso...</p>
          </div>
        </div>
      )
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Erro de Configuração
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <button
                onClick={checkFirstAccessStatus}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Tentar Novamente
              </button>
              <button
                onClick={logout}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // First access required
  if (needsFirstAccess && firstAccessStatus && user) {
    return (
      <>
        {/* Render children in background (blurred) */}
        <div className="filter blur-sm pointer-events-none">
          {children}
        </div>
        
        {/* First Access Modal */}
        <FirstAccessModal
          isOpen={true}
          userEmail={user.email || ''}
          userName={user.name || user.email || 'Usuário'}
          onComplete={handleFirstAccessComplete}
          onCancel={handleFirstAccessCancel}
        />
      </>
    )
  }

  // Normal flow - first access completed or not required
  return <>{children}</>
}

// Hook para usar o FirstAccessGuard em componentes
export const useFirstAccessGuard = () => {
  const { user } = useAuth()
  const [status, setStatus] = useState<FirstAccessStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkStatus = async () => {
    if (!user?.email) return null

    setIsLoading(true)
    try {
      const result = await FirstAccessService.checkFirstAccessStatus(user.email)
      setStatus(result)
      return result
    } catch (error) {
      console.error('useFirstAccessGuard: Erro ao verificar status:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const requireFirstAccess = async () => {
    if (!user?.email || !status?.userId) return false

    try {
      const success = await FirstAccessService.requireFirstAccess(status.userId)
      if (success) {
        await checkStatus() // Recarregar status
      }
      return success
    } catch (error) {
      console.error('useFirstAccessGuard: Erro ao requerer primeiro acesso:', error)
      return false
    }
  }

  return {
    status,
    isLoading,
    checkStatus,
    requireFirstAccess,
    needsFirstAccess: status?.needsFirstAccess || false
  }
}