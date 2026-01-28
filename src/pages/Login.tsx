import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'

import loginBackground from '../../assets/logo_e7_tela login.jpg'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { signIn, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, navigate])

  // Verificar se há mensagem de erro do ProtectedRoute
  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error)
    }
  }, [location.state])

  // Validação de email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validação de senha
  const isValidPassword = (password: string): boolean => {
    return password.length >= 6
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validações de entrada
    if (!email.trim()) {
      setError('Por favor, digite seu email')
      return
    }

    if (!isValidEmail(email.trim())) {
      setError('Por favor, digite um email válido')
      return
    }

    if (!password) {
      setError('Por favor, digite sua senha')
      return
    }

    if (!isValidPassword(password)) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const { error: signInError } = await signIn(email.trim(), password)
      
      if (signInError) {
        // Tratamento específico de erros
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos')
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Por favor, confirme seu email antes de fazer login')
        } else if (signInError.message.includes('Too many requests')) {
          setError('Muitas tentativas de login. Tente novamente em alguns minutos.')
        } else if (signInError.message.includes('Operação expirou')) {
          setError('A operação demorou muito para responder. Verifique sua conexão e tente novamente.')
        } else if (signInError.message.includes('Network')) {
          setError('Erro de conexão. Verifique sua internet e tente novamente.')
        } else {
          setError('Erro ao fazer login. Tente novamente.')
          console.error('Erro de login:', signInError)
        }
      } else {
        // Login bem-sucedido - o redirecionamento será feito pelo useEffect
        console.log('Login realizado com sucesso')
      }
    } catch (err) {
      console.error('Erro inesperado no login:', err)
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Limpar erro quando o usuário começar a digitar
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (error) setError('')
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (error) setError('')
  }

  // Se ainda está carregando a autenticação inicial, mostrar loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-white">
        <div className="w-full md:w-1/2 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Verificando autenticação...</p>
          </div>
        </div>
        <div className="w-full md:w-1/2 min-h-[300px] md:min-h-screen relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${loginBackground})`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right center',
              backgroundSize: 'cover'
            }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-white via-white/70 to-transparent"
            aria-hidden="true"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Modal de Login - 50% à esquerda */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-4 md:px-8 py-8 md:py-0 bg-white">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <img 
                src="/logo-e7-login-modal.png" 
                alt="Logo E7" 
                className="w-12 h-12 object-contain rounded-lg"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Bem-vindo de volta
            </CardTitle>
            <CardDescription className="text-center">
              Faça login em sua conta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={handleEmailChange}
                  disabled={loading}
                  required
                  autoComplete="email"
                  className={`border-[rgba(184,184,184,1)] focus:border-[rgba(184,184,184,1)] focus-visible:ring-black ${error && !isValidEmail(email) && email ? 'border-red-500 focus:border-red-500' : ''}`}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={handlePasswordChange}
                    disabled={loading}
                    required
                    autoComplete="current-password"
                    className={`border-[rgba(184,184,184,1)] focus:border-[rgba(184,184,184,1)] focus-visible:ring-black ${error && !isValidPassword(password) && password ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-black text-white hover:bg-black/90 border border-black"
                disabled={loading || !email.trim() || !password}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>Esqueceu sua senha? Entre em contato com o administrador.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Imagem do Logo - 50% à direita */}
      <div className="w-full md:w-1/2 min-h-[300px] md:min-h-screen relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${loginBackground})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right center',
            backgroundSize: 'cover'
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-white via-white/70 to-transparent"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

export default Login