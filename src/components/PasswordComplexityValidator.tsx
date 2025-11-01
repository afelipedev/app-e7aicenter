import React from 'react'
import { Check, X, AlertCircle } from 'lucide-react'
import { FirstAccessService, PasswordValidationResult } from '../services/firstAccessService'

interface PasswordComplexityValidatorProps {
  password: string
  onValidationChange?: (result: PasswordValidationResult) => void
  showStrengthMeter?: boolean
  className?: string
}

export const PasswordComplexityValidator: React.FC<PasswordComplexityValidatorProps> = ({
  password,
  onValidationChange,
  showStrengthMeter = true,
  className = ''
}) => {
  const [validation, setValidation] = React.useState<PasswordValidationResult>({
    isValid: false,
    errors: [],
    strength: 'weak',
    score: 0
  })

  React.useEffect(() => {
    const result = FirstAccessService.validatePasswordComplexity(password)
    setValidation(result)
    if (onValidationChange) {
      onValidationChange(result)
    }
  }, [password])

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'strong':
        return 'bg-green-500'
      default:
        return 'bg-gray-300'
    }
  }

  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'weak':
        return 'Fraca'
      case 'medium':
        return 'Média'
      case 'strong':
        return 'Forte'
      default:
        return 'Muito fraca'
    }
  }

  const requirements = [
    {
      text: 'Pelo menos 8 caracteres',
      met: password.length >= 8
    },
    {
      text: 'Uma letra minúscula',
      met: /[a-z]/.test(password)
    },
    {
      text: 'Uma letra maiúscula',
      met: /[A-Z]/.test(password)
    },
    {
      text: 'Um número',
      met: /\d/.test(password)
    },
    {
      text: 'Um caractere especial',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }
  ]

  if (!password) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Medidor de força da senha */}
      {showStrengthMeter && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Força da senha
            </span>
            <span className={`text-sm font-medium ${
              validation.strength === 'weak' ? 'text-red-600' :
              validation.strength === 'medium' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {getStrengthText(validation.strength)}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(validation.strength)}`}
              style={{ width: `${(validation.score / 6) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Lista de requisitos */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Requisitos da senha
        </h4>
        
        <div className="space-y-1">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              {req.met ? (
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
              <span className={req.met ? 'text-green-700' : 'text-red-700'}>
                {req.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Verificações adicionais */}
      {password.length > 0 && (
        <div className="space-y-1">
          {password.length >= 12 && (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <Check className="w-4 h-4 text-green-500" />
              <span>Comprimento recomendado (12+ caracteres)</span>
            </div>
          )}
          
          {/(.)\1{2,}/.test(password) && (
            <div className="flex items-center gap-2 text-sm text-red-700">
              <X className="w-4 h-4 text-red-500" />
              <span>Evite caracteres repetidos consecutivos</span>
            </div>
          )}
        </div>
      )}

      {/* Resumo de validação */}
      {validation.errors.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-800">
                Problemas encontrados:
              </p>
              <ul className="text-sm text-red-700 space-y-0.5">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de sucesso */}
      {validation.isValid && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <p className="text-sm font-medium text-green-800">
              Senha atende a todos os requisitos de segurança!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}