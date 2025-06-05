import { SignInButton, SignOutButton, UserButton } from '@clerk/clerk-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { LogIn, LogOut } from 'lucide-react'

interface AuthButtonProps {
  showUserButton?: boolean
}

export function AuthButton({ showUserButton = true }: AuthButtonProps) {
  const { isAuthenticated, isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <Button disabled size="sm" variant="outline">
        Loading...
      </Button>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        {showUserButton && <UserButton />}
        <SignOutButton>
          <Button size="sm" variant="outline" className="gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </SignOutButton>
      </div>
    )
  }

  return (
    <SignInButton mode="modal">
      <Button size="sm" className="gap-2">
        <LogIn className="w-4 h-4" />
        Sign In
      </Button>
    </SignInButton>
  )
}