import { useState, useEffect } from 'react'

interface SimpleAuthUser {
  id: string
  username: string
}

export function useSimpleAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<SimpleAuthUser | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check for stored auth state
    const storedUser = localStorage.getItem('simple-auth-user')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setIsAuthenticated(true)
      } catch (error) {
        localStorage.removeItem('simple-auth-user')
      }
    }
    setIsLoaded(true)
  }, [])

  const signIn = (username: string) => {
    const userData: SimpleAuthUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: username.trim()
    }
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem('simple-auth-user', JSON.stringify(userData))
  }

  const signOut = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('simple-auth-user')
  }

  return {
    isAuthenticated,
    user,
    isLoaded,
    userId: user?.id || null,
    username: user?.username || 'Anonymous',
    signIn,
    signOut
  }
}