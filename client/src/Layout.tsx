import {Button} from '@/components/ui/button.tsx';
import {SignInButton, useAuth, UserButton} from '@clerk/clerk-react';
import {User} from 'lucide-react';
import {Link} from 'wouter';

import type {ReactElement, ReactNode} from 'react';


type LayoutProps = {
  children: ReactNode;
}

export const Layout = ({children}: LayoutProps): ReactElement => {
  const {isSignedIn, isLoaded: authLoaded} = useAuth();

  return <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
    <header className="bg-slate-900/90 backdrop-blur-sm border rounded border-slate-700 m-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 py-6">
        <Link to="/"><img src="/logo.svg" height="30" width="209" aria-description="Math Hack logo" alt="Math Hack logo"/></Link>
        {!authLoaded ? (
          <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
        ) : (<>
          {isSignedIn ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                  userButtonPopoverCard: 'bg-slate-800 border-slate-700',
                  userButtonPopoverActions: 'text-white'
                }
              }}
            />
          ) : (
            <div className="flex items-center space-x-2">
              <SignInButton mode="modal">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <User className="w-4 h-4 mr-2"/>
                  Sign In
                </Button>
              </SignInButton>
            </div>
          )}
        </>)}
      </div>
    </header>
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {children}
    </main>
    <footer className="bg-slate-900/90 backdrop-blur-sm border rounded border-slate-700 m-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center text-slate-500 text-xs gap-4">
          <p className="text-center text-slate-500 text-xs">&copy; {new Date().getFullYear()} Phixx Creative Pty Ltd. All rights reserved. Created by <a href="https://phixx.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Matt Bolt</a>
          </p>
          <ul className="flex flex-col md:flex-row gap-4 items-center text-center">
            <li><Link to="/privacy-policy" className="text-slate-400 hover:text-white transition-colors text-sm">Privacy Policy</Link></li>
            <li><Link to="/terms-of-service" className="text-slate-400 hover:text-white transition-colors text-sm">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  </div>;
};