import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LogIn, LogOut, User } from 'lucide-react'

interface SimpleAuthProps {
  isAuthenticated: boolean
  username: string | null
  onSignIn: (username: string) => void
  onSignOut: () => void
  showUserButton?: boolean
}

export function SimpleAuth({ isAuthenticated, username, onSignIn, onSignOut, showUserButton = true }: SimpleAuthProps) {
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')

  const handleSignIn = () => {
    if (usernameInput.trim()) {
      onSignIn(usernameInput.trim())
      setUsernameInput('')
      setIsSignInOpen(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSignIn()
    }
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        {showUserButton && (
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full">
            <User className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-white">{username}</span>
          </div>
        )}
        <Button size="sm" variant="outline" onClick={onSignOut} className="gap-2">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button size="sm" onClick={() => setIsSignInOpen(true)} className="gap-2">
        <LogIn className="w-4 h-4" />
        Sign In
      </Button>

      <Dialog open={isSignInOpen} onOpenChange={setIsSignInOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sign In to Host Games</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsSignInOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSignIn}
                disabled={!usernameInput.trim()}
                className="flex-1"
              >
                Sign In
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}