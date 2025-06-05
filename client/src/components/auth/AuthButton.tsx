import { useAuth } from '@/hooks/use-auth'
import { SimpleAuth } from './SimpleAuth'

interface AuthButtonProps {
  showUserButton?: boolean
}

export function AuthButton({ showUserButton = true }: AuthButtonProps) {
  const { isAuthenticated, isLoaded, username, signIn, signOut } = useAuth()

  if (!isLoaded) {
    return (
      <div className="text-sm text-slate-400">Loading...</div>
    )
  }

  return (
    <SimpleAuth
      isAuthenticated={isAuthenticated}
      username={username}
      onSignIn={signIn}
      onSignOut={signOut}
      showUserButton={showUserButton}
    />
  )
}