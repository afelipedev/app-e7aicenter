import { supabase, User, UserRole, UserStatus } from '../lib/supabase'

export interface CreateUserData {
  email: string
  name: string
  role: UserRole
  status?: UserStatus
  password: string
}

export interface UpdateUserData {
  name?: string
  role?: UserRole
  status?: UserStatus
}

export class UserService {
  static async getUsers(): Promise<{ data: User[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async getUserById(id: string): Promise<{ data: User | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async createUser(userData: CreateUserData): Promise<{ data: User | null; error: any }> {
    try {
      // First, create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name
          }
        }
      })

      if (authError || !authData.user) {
        return { data: null, error: authError }
      }

      // Then create the user profile
      const { data, error } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          status: userData.status || 'ativo'
        })
        .select()
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async updateUser(id: string, userData: UpdateUserData): Promise<{ data: User | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async deleteUser(id: string): Promise<{ error: any }> {
    try {
      // First delete from users table
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (userError) {
        return { error: userError }
      }

      // Then delete from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(id)

      return { error: authError }
    } catch (error) {
      return { error }
    }
  }

  static async searchUsers(query: string): Promise<{ data: User[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async getUsersByRole(role: UserRole): Promise<{ data: User[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async getUsersByStatus(status: UserStatus): Promise<{ data: User[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }
}