import React, { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Lock, User, AlertCircle, CheckCircle } from 'lucide-react'
import { FirstAccessService, PasswordValidationResult } from '../services/firstAccessService'
import { PasswordComplexityValidator } from './PasswordComplexityValidator'

interface FirstAccessModalProps {
  isOpen: boolean
  userEmail: string
  userName: string
  onComplete: (success: boolean) => void
  onCancel?: () => void
}

export const FirstAccessModal: React.FC<FirstAccessModalProps> = ({
  isOpen,
  userEmail,
  userName,
  onComplete,
  onCancel
}) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult>({
    isValid: false,
    errors: [],
    strength: 'weak',
    score: 0
  })
  const [step, setStep] = useState<'welcome' | 'password' | 'success'>('welcome')

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setShowConfirmPassword(false)
      setIsLoading(false)
      setError('')
      setStep('welcome')
    }
  }, [isOpen])

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    setError('')
  }

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value)
    setError('')
  }

  const handleValidationChange = (result: PasswordValidationResult) => {
    setPasswordValidation(result)
  }

  const validateForm = (): boolean => {
    if (!passwordValidation.isValid) {
      setError('A senha não atende aos requisitos de segurança')
      return false
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Obter ID do usuário pelo email
      const userData = await FirstAccessService.checkFirstAccessStatus(userEmail)
      
      if (!userData || !userData.userId) {
        throw new Error('Usuário não encontrado')
      }

      const result = await FirstAccessService.completeFirstAccess(userData.userId, password)
      
      if (result.success) {
        setStep('success')
        setTimeout(() => {
          onComplete(true)
        }, 2000)
      } else {
        setError(result.error || 'Erro ao completar primeiro acesso')
      }
    } catch (err) {
      console.error('Erro ao completar primeiro acesso:', err)
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNext = () => {
    if (step === 'welcome') {
      setStep('password')
    }
  }

  const handleBack = () => {
    if (step === 'password') {
      setStep('welcome')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Primeiro Acesso
              </h2>
              <p className="text-sm text-gray-500">
                Configure sua senha de acesso
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'welcome' && (
            <div className="space-y-6">
              {/* Welcome Message */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Bem-vindo, {userName}!
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Este é seu primeiro acesso ao sistema. Por segurança, você precisa 
                    definir uma nova senha antes de continuar.
                  </p>
                </div>
              </div>

              {/* User Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{userName}</p>
                    <p className="text-sm text-gray-500">{userEmail}</p>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-blue-900">
                      Importante para sua segurança:
                    </p>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Escolha uma senha forte e única</li>
                      <li>• Não compartilhe suas credenciais</li>
                      <li>• Mantenha seus dados sempre seguros</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={handleNext}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Continuar
              </button>
            </div>
          )}

          {step === 'password' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Back Button */}
              <button
                type="button"
                onClick={handleBack}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Voltar
              </button>

              {/* Password Fields */}
              <div className="space-y-4">
                {/* New Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                      placeholder="Digite sua nova senha"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                      placeholder="Confirme sua nova senha"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Confirmation Check */}
                {confirmPassword && (
                  <div className="flex items-center gap-2 text-sm">
                    {password === confirmPassword ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-700">As senhas coincidem</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-red-500" />
                        <span className="text-red-700">As senhas não coincidem</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Password Validator */}
              <PasswordComplexityValidator
                password={password}
                onValidationChange={handleValidationChange}
                showStrengthMeter={true}
              />

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !passwordValidation.isValid || password !== confirmPassword}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Configurando...' : 'Confirmar Senha'}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Senha Configurada!
                </h3>
                <p className="text-gray-600">
                  Sua senha foi definida com sucesso. Você será redirecionado automaticamente.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}