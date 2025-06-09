import {Button} from '@/components/ui/button';
import {ArrowLeft} from 'lucide-react';
import {useLocation} from 'wouter';

import type {ReactElement} from 'react';


export const Terms = (): ReactElement => {
  const [, setLocation] = useLocation();

  return <>
    <div>
      <Button className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 mb-8" variant="ghost" onClick={() => setLocation('/')}>
        <ArrowLeft className="w-4 h-4"/>
        <span>Back to Game</span>
      </Button>
    </div>
    <div>
      <h1 className="text-4xl font-bold">Terms of Service</h1>
      <p className="mb-8 text-slate-400"><strong>Last updated:</strong> 7th June 2025</p>

      <p>By using Math Hack, you agree to these Terms of Service. If you don’t agree, do not use the game.</p>

      <h2 className="font-bold mt-8 text-slate-400 text-xl">Use of the Game</h2>
      <p>Math Hack is for educational and personal entertainment purposes only. You may not reverse engineer, copy, or misuse the platform.</p>

      <h2 className="font-bold mt-4 text-slate-400 text-xl">User Accounts</h2>
      <p>You can create an account using email or by signing in with Third-party social platforms via our authentication system (Clerk). You are responsible for keeping your login credentials or linked accounts secure. Offensive names or content are not allowed.</p>

      <h2 className="font-bold mt-4 text-slate-400 text-xl">Payment and Subscriptions</h2>
      <p>Some features may require a paid subscription. All payments are handled securely. Subscriptions renew automatically unless canceled.</p>

      <h2 className="font-bold mt-4 text-slate-400 text-xl">Content Ownership</h2>
      <p>All game content, visuals, and code are owned by Phixx Creative Pty Ltd. You may not reuse or redistribute content without permission.</p>

      <h2 className="font-bold mt-4 text-slate-400 text-xl">Disclaimer</h2>
      <p>The game is provided “as-is”. We make no guarantees about accuracy, uptime, or that gameplay will be error-free.</p>

      <h2 className="font-bold mt-4 text-slate-400 text-xl">Changes to Terms</h2>
      <p>We may update these terms at any time. Continued use of the game means you accept the new terms.</p>

      <h2 className="font-bold mt-4 text-slate-400 text-xl">Contact</h2>
      <p>For questions, reach out to: <a href="mailto:support@math-hack.com">support@math-hack.com</a></p>
    </div>
  </>;
}