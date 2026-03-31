import { create } from 'zustand'
import { api } from '@/lib/api'

export interface AuthUser {
  readonly id: string
  readonly username: string
  readonly email: string
}

interface AuthState {
  readonly user: AuthUser | null
  readonly token: string | null
  readonly isLoading: boolean
  readonly error: string | null
  readonly signInAsGuest: () => Promise<void>
  readonly logout: () => void
  readonly loadFromStorage: () => void
  readonly clearError: () => void
}

function persistSession(user: AuthUser, token: string): void {
  localStorage.setItem('wpc_token', token)
  localStorage.setItem('wpc_user', JSON.stringify(user))
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  signInAsGuest: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/auth/guest')
      const payload = response.data?.data
      if (!payload?.user || !payload?.tokens?.accessToken) {
        throw new Error('Invalid guest session response')
      }
      const { user, tokens } = payload
      const token = tokens.accessToken
      persistSession(user, token)
      set({ user, token, isLoading: false })
    } catch (error: unknown) {
      const message = extractErrorMessage(error, 'Could not start guest session')
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  logout: () => {
    localStorage.removeItem('wpc_token')
    localStorage.removeItem('wpc_user')
    set({ user: null, token: null })
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('wpc_token')
    const userJson = localStorage.getItem('wpc_user')
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as AuthUser
        set({ user, token })
      } catch {
        localStorage.removeItem('wpc_token')
        localStorage.removeItem('wpc_user')
      }
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))

function extractErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object'
  ) {
    const data = error.response.data as Record<string, unknown>
    if (typeof data.error === 'string') return data.error
    if (typeof data.message === 'string') return data.message
  }
  return fallback
}

useAuthStore.getState().loadFromStorage()
