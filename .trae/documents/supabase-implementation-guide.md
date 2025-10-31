# Guia de Implementação - Backend Supabase E7AI Center App

## 1. Configuração Inicial do Supabase

### 1.1 Instalação das Dependências

```bash
npm install @supabase/supabase-js
npm install @supabase/auth-ui-react @supabase/auth-ui-shared
```

### 1.2 Configuração do Cliente Supabase

**Arquivo: `src/lib/supabase.ts`**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos TypeScript para o banco de dados
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_user_id: string
          name: string
          email: string
          role: 'administrador' | 'ti' | 'advogado_adm' | 'advogado' | 'contabil' | 'financeiro'
          company_id: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          name: string
          email: string
          role: 'administrador' | 'ti' | 'advogado_adm' | 'advogado' | 'contabil' | 'financeiro'
          company_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          name?: string
          email?: string
          role?: 'administrador' | 'ti' | 'advogado_adm' | 'advogado' | 'contabil' | 'financeiro'
          company_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          cnpj: string
          status: 'ativo' | 'inativo'
          payslips_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          cnpj: string
          status?: 'ativo' | 'inativo'
          payslips_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          cnpj?: string
          status?: 'ativo' | 'inativo'
          payslips_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      payslips: {
        Row: {
          id: string
          company_id: string
          employee_name: string
          amount: number
          period: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          employee_name: string
          amount: number
          period: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          employee_name?: string
          amount?: number
          period?: string
          created_at?: string
        }
      }
    }
  }
}
```

### 1.3 Variáveis de Ambiente

**Arquivo: `.env.local`**
```env
VITE_SUPABASE_URL=https://huswezdozhadkegnptsa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1c3dlemRvemhhZGtlZ25wdHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODA0OTIsImV4cCI6MjA3NzA1NjQ5Mn0.zXnmBnHrEXj63kygqaJ14XtMeFh4D8CeWm4KBFEuH1w
```

## 2. Sistema de Autenticação

### 2.1 Context de Autenticação

**Arquivo: `src/contexts/AuthContext.tsx`**
```typescript
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Database } from '@/lib/supabase'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  hasPermission: (requiredRoles: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .single()

      if (error) {
        console.error('Erro ao buscar perfil do usuário:', error)
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const hasPermission = (requiredRoles: string[]): boolean => {
    if (!profile) return false
    return requiredRoles.includes(profile.role)
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signOut,
    hasPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

### 2.2 Componente de Login

**Arquivo: `src/pages/Login.tsx`**
```typescript
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signIn(email, password)

    if (error) {
      setError('Credenciais inválidas. Verifique seu email e senha.')
    } else {
      navigate('/')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">E7AI Center</CardTitle>
          <CardDescription className="text-center">
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
```

## 3. Proteção de Rotas

### 3.1 Componente de Rota Protegida

**Arquivo: `src/components/ProtectedRoute.tsx`**
```typescript
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = [] 
}) => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRoles.length > 0 && profile) {
    const hasPermission = requiredRoles.includes(profile.role)
    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
            <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}

export default ProtectedRoute
```

### 3.2 Hook de Permissões

**Arquivo: `src/hooks/usePermissions.ts`**
```typescript
import { useAuth } from '@/contexts/AuthContext'

export const usePermissions = () => {
  const { profile } = useAuth()

  const permissions = {
    // Permissões administrativas
    canManageUsers: profile?.role && ['administrador', 'ti', 'advogado_adm'].includes(profile.role),
    canManageCompanies: profile?.role && ['administrador', 'ti', 'advogado_adm'].includes(profile.role),
    canViewCompanies: profile?.role && ['administrador', 'ti', 'advogado_adm', 'contabil'].includes(profile.role),
    canCreateCompanies: profile?.role && ['administrador', 'ti', 'advogado_adm', 'contabil'].includes(profile.role),
    
    // Permissões de módulos
    canAccessAssistants: !!profile,
    canAccessDocuments: !!profile,
    canAccessIntegrations: !!profile,
    canAccessDashboard: !!profile,
    
    // Permissões específicas por role
    isAdmin: profile?.role === 'administrador',
    isIT: profile?.role === 'ti',
    isAdvogadoADM: profile?.role === 'advogado_adm',
    isAdvogado: profile?.role === 'advogado',
    isContabil: profile?.role === 'contabil',
    isFinanceiro: profile?.role === 'financeiro',
    
    // Grupos de permissões
    hasFullAccess: profile?.role && ['administrador', 'ti', 'advogado_adm'].includes(profile.role),
    hasLimitedAccess: profile?.role && ['advogado', 'contabil', 'financeiro'].includes(profile.role),
  }

  return permissions
}
```

## 4. Atualização do App Principal

### 4.1 App.tsx Atualizado

**Arquivo: `src/App.tsx`**
```typescript
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ChatGeneral from "./pages/assistants/ChatGeneral";
import TaxLaw from "./pages/assistants/TaxLaw";
import CivilLaw from "./pages/assistants/CivilLaw";
import Financial from "./pages/assistants/Financial";
import Accounting from "./pages/assistants/Accounting";
import Payroll from "./pages/documents/Payroll";
import Cases from "./pages/documents/Cases";
import Reports from "./pages/documents/Reports";
import PowerBI from "./pages/integrations/PowerBI";
import Trello from "./pages/integrations/Trello";
import CalendarIntegration from "./pages/integrations/CalendarIntegration";
import Users from "./pages/admin/Users";
import Companies from "./pages/admin/Companies";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/assistants/chat" element={<ChatGeneral />} />
              <Route path="/assistants/tax" element={<TaxLaw />} />
              <Route path="/assistants/civil" element={<CivilLaw />} />
              <Route path="/assistants/financial" element={<Financial />} />
              <Route path="/assistants/accounting" element={<Accounting />} />
              <Route path="/documents/payroll" element={<Payroll />} />
              <Route path="/documents/cases" element={<Cases />} />
              <Route path="/documents/reports" element={<Reports />} />
              <Route path="/integrations/powerbi" element={<PowerBI />} />
              <Route path="/integrations/trello" element={<Trello />} />
              <Route path="/integrations/calendar" element={<CalendarIntegration />} />
              <Route path="/admin/users" element={
                <ProtectedRoute requiredRoles={['administrador', 'ti', 'advogado_adm']}>
                  <Users />
                </ProtectedRoute>
              } />
              <Route path="/admin/companies" element={
                <ProtectedRoute requiredRoles={['administrador', 'ti', 'advogado_adm', 'contabil']}>
                  <Companies />
                </ProtectedRoute>
              } />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
```

## 5. Serviços de Dados

### 5.1 Serviço de Usuários

**Arquivo: `src/services/userService.ts`**
```typescript
import { supabase, Database } from '@/lib/supabase'

type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']

export const userService = {
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getUserById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createUser(user: UserInsert) {
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateUser(id: string, updates: UserUpdate) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteUser(id: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
```

### 5.2 Serviço de Empresas

**Arquivo: `src/services/companyService.ts`**
```typescript
import { supabase, Database } from '@/lib/supabase'

type Company = Database['public']['Tables']['companies']['Row']
type CompanyInsert = Database['public']['Tables']['companies']['Insert']
type CompanyUpdate = Database['public']['Tables']['companies']['Update']

export const companyService = {
  async getCompanies() {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getCompanyById(id: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createCompany(company: CompanyInsert) {
    const { data, error } = await supabase
      .from('companies')
      .insert(company)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateCompany(id: string, updates: CompanyUpdate) {
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteCompany(id: string) {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
```

## 6. Configuração do Header com Logout

### 6.1 Componente Header Atualizado

**Arquivo: `src/components/layout/Header.tsx`**
```typescript
import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const Header: React.FC = () => {
  const { profile, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleLabel = (role: string) => {
    const roleLabels = {
      'administrador': 'Administrador',
      'ti': 'TI',
      'advogado_adm': 'Advogado ADM',
      'advogado': 'Advogado',
      'contabil': 'Contábil',
      'financeiro': 'Financeiro'
    }
    return roleLabels[role as keyof typeof roleLabels] || role
  }

  return (
    <header className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">E7AI Center</h1>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-600 text-white">
                  {profile ? getInitials(profile.name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {profile?.name}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {profile?.email}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {profile ? getRoleLabel(profile.role) : ''}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default Header
```

## 7. Checklist de Implementação

### 7.1 Configuração do Supabase
- [ ] Criar projeto no Supabase
- [ ] Configurar variáveis de ambiente
- [ ] Executar scripts SQL para criar tabelas
- [ ] Configurar políticas RLS
- [ ] Inserir dados iniciais

### 7.2 Frontend
- [ ] Instalar dependências do Supabase
- [ ] Criar cliente Supabase
- [ ] Implementar AuthContext
- [ ] Criar página de Login
- [ ] Implementar ProtectedRoute
- [ ] Atualizar App.tsx com rotas protegidas
- [ ] Criar serviços de dados
- [ ] Atualizar Header com logout

### 7.3 Testes
- [ ] Testar login/logout
- [ ] Testar proteção de rotas
- [ ] Testar permissões por role
- [ ] Testar CRUD de usuários
- [ ] Testar CRUD de empresas
- [ ] Verificar políticas RLS

### 7.4 Deploy
- [ ] Configurar variáveis de ambiente em produção
- [ ] Testar em ambiente de produção
- [ ] Documentar processo de deploy