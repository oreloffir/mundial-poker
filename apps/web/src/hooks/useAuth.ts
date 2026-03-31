import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const isLoading = useAuthStore((s) => s.isLoading)
  const error = useAuthStore((s) => s.error)
  const signInAsGuest = useAuthStore((s) => s.signInAsGuest)
  const logout = useAuthStore((s) => s.logout)
  const clearError = useAuthStore((s) => s.clearError)

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated: !!user,
    signInAsGuest,
    logout,
    clearError,
  }
}
