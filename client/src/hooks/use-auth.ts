import { useUser } from '@clerk/clerk-react'

export function useAuth() {
  const { isSignedIn, user, isLoaded } = useUser()
  
  return {
    isAuthenticated: isSignedIn,
    user,
    isLoaded,
    userId: user?.id || null,
    username: user?.firstName || user?.username || 'Anonymous'
  }
}