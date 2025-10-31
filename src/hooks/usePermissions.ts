import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../lib/supabase'

export interface Permission {
  canAccessAdmin: boolean
  canManageUsers: boolean
  canManageCompanies: boolean
  canViewCompanies: boolean
  canAddCompanies: boolean
  canAccessModules: boolean
  canViewUserScreen: boolean
}

export const usePermissions = (): Permission => {
  const { user, hasPermission } = useAuth()

  if (!user) {
    return {
      canAccessAdmin: false,
      canManageUsers: false,
      canManageCompanies: false,
      canViewCompanies: false,
      canAddCompanies: false,
      canAccessModules: false,
      canViewUserScreen: false
    }
  }

  const rolePermissions: Record<UserRole, Permission> = {
    administrator: {
      canAccessAdmin: true,
      canManageUsers: true,
      canManageCompanies: true,
      canViewCompanies: true,
      canAddCompanies: true,
      canAccessModules: true,
      canViewUserScreen: true
    },
    it: {
      canAccessAdmin: true,
      canManageUsers: true,
      canManageCompanies: true,
      canViewCompanies: true,
      canAddCompanies: true,
      canAccessModules: true,
      canViewUserScreen: true
    },
    advogado_adm: {
      canAccessAdmin: true,
      canManageUsers: true,
      canManageCompanies: true,
      canViewCompanies: true,
      canAddCompanies: true,
      canAccessModules: true,
      canViewUserScreen: true
    },
    advogado: {
      canAccessAdmin: false,
      canManageUsers: false,
      canManageCompanies: false,
      canViewCompanies: true,
      canAddCompanies: false,
      canAccessModules: true,
      canViewUserScreen: false
    },
    contabil: {
      canAccessAdmin: false,
      canManageUsers: false,
      canManageCompanies: false,
      canViewCompanies: true,
      canAddCompanies: true,
      canAccessModules: true,
      canViewUserScreen: false
    },
    financeiro: {
      canAccessAdmin: false,
      canManageUsers: false,
      canManageCompanies: false,
      canViewCompanies: false,
      canAddCompanies: false,
      canAccessModules: true,
      canViewUserScreen: false
    }
  }

  return rolePermissions[user.role] || {
    canAccessAdmin: false,
    canManageUsers: false,
    canManageCompanies: false,
    canViewCompanies: false,
    canAddCompanies: false,
    canAccessModules: false,
    canViewUserScreen: false
  }
}

export default usePermissions