import {Button} from '@/components/ui/button';
import {ArrowLeft} from 'lucide-react';
import {useLocation} from 'wouter';

import type {ReactElement} from 'react';


export const PrivacyPolicy = (): ReactElement => {
  const [, setLocation] = useLocation();

  return <>
    <div>
      <Button className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 mb-8" variant="ghost" onClick={() => setLocation('/')}>
        <ArrowLeft className="w-4 h-4"/>
        <span>Back to Game</span>
      </Button>
    </div>
    <div>
      <h1 className="text-4xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-slate-400"><strong>Last updated:</strong> 7th June 2025</p>

      <p>Math Hack ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our educational game and website.</p>

      <h2 className="font-bold mt-8 text-slate-400 text-xl">Information We Collect</h2>
      <ul className="list-disc ml-6">
        <li><strong>Account Information:</strong> email address, and password (via Clerk) if you create an account.</li>
        <li><strong>Authentication Data:</strong> When you sign in using Third-party social platforms, or email, we collect basic profile info via Clerk (Name and email address).</li>
        <li><strong>Usage Data:</strong> like game progress, scores, and actions during gameplay.</li>
        <li><strong>Device Data:</strong> including browser type, IP address, and device information.</li>
        <li><strong>Optional Info:</strong> Teachers may optionally provide class or student nicknames. No personal student info is required.</li>
      </ul>

      <h2 className="font-bold mt-4 text-slate-400 text-xl">How We Use Your Information</h2>
      <ul className="list-disc ml-6">
        <li>Provide and improve gameplay</li>
        <li>Track scores and achievements</li>
        <li>Respond to support requests</li>
        <li>Authenticate and identify users through Clerk and third-party providers</li>
        <li>Communicate updates or important service info</li>
      </ul>
      <p>We do not sell or share your personal information with third parties for marketing.</p>

      <h2 className="font-bold mt-4 text-slate-400 text-xl">Data Storage and Security</h2>
      <p>Your data is stored securely using industry-standard encryption and access controls. We do our best to protect your information but cannot guarantee absolute security.</p>

      <h2 className="font-bold mt-4 text-slate-400 text-xl">Children’s Privacy</h2>
      <p>We do not knowingly collect personal information from children under 13. All gameplay data is anonymized unless a parent, school, or guardian explicitly registers an account. We do not require children to sign in via third-party providers.</p>

      <h2 className="font-bold mt-4 text-slate-400 text-xl">Your Rights</h2>
      <p>You can request to view, edit, or delete your account data at any time by contacting us.</p>

      <h2 className="font-bold mt-4 text-slate-400 text-xl">Contact Us</h2>
      <p>If you have questions about your data, email us at: <a href="mailto:support@mathhackgame.com">support@mathhackgame.com</a></p>
    </div>
  </>;
}