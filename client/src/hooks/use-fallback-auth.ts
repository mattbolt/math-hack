import { useState, useEffect, createContext, useContext } from 'react'

interface FallbackAuthUser {
  id: string
  firstName: string
  username: string
}

interface FallbackAuthContext {
  isAuthenticated: boolean
  user: FallbackAuthUser | null
  isLoaded: boolean
  signIn: (username: string) => void
  signOut: () => void
}

const fallbackAuthContext = createContext<FallbackAuthContext | null>(null)

export function useFallbackAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<FallbackAuthUser | null>(null)
  const [isLoaded, setIsLoaded] = useState(true)

  useEffect(() => {
    // Check for stored auth state
    const storedUser = localStorage.getItem('fallback-auth-user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      setIsAuthenticated(true)
    }
  }, [])

  const signIn = (username: string) => {
    const userData: FallbackAuthUser = {
      id: `user_${Date.now()}`,
      firstName: username,
      username: username
    }
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem('fallback-auth-user', JSON.stringify(userData))
  }

  const signOut = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('fallback-auth-user')
  }

  return {
    isAuthenticated,
    user,
    isLoaded,
    userId: user?.id || null,
    username: user?.firstName || user?.username || 'Anonymous',
    signIn,
    signOut
  }
}