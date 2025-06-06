import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Game</span>
          </Button>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Terms of Service
            </CardTitle>
            <p className="text-center text-slate-600">
              Effective Date: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using Math Challenge Arena, you accept and agree to be bound by the terms and provision of this agreement.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              Math Challenge Arena is an online multiplayer educational game that allows users to compete in real-time math challenges. 
              The service includes game hosting, joining games, user authentication, and score tracking.
            </p>

            <h2>3. User Accounts</h2>
            <p>
              To host games, you must create an account through our authentication provider, Clerk. You are responsible for:
            </p>
            <ul>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
            </ul>

            <h2>4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the service for any unlawful purpose or in violation of any laws</li>
              <li>Attempt to gain unauthorized access to the service or other users' accounts</li>
              <li>Interfere with or disrupt the service or servers connected to the service</li>
              <li>Use automated scripts, bots, or other means to manipulate gameplay</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Submit false, misleading, or inappropriate content</li>
            </ul>

            <h2>5. Game Rules and Conduct</h2>
            <p>
              Players must follow fair play principles. Any attempt to cheat, exploit game mechanics, or engage in unsportsmanlike 
              conduct may result in account suspension or termination.
            </p>

            <h2>6. Privacy</h2>
            <p>
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, 
              to understand our practices.
            </p>

            <h2>7. Intellectual Property</h2>
            <p>
              The service and its original content, features, and functionality are and will remain the exclusive property of 
              Phixx Creative Pty Ltd and its licensors. The service is protected by copyright, trademark, and other laws.
            </p>

            <h2>8. Disclaimers</h2>
            <p>
              The service is provided on an "as is" and "as available" basis. We make no representations or warranties of any kind, 
              express or implied, as to the operation of the service or the information, content, or materials included therein.
            </p>

            <h2>9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by applicable law, Phixx Creative Pty Ltd shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages, or any loss of profits or revenues.
            </p>

            <h2>10. Termination</h2>
            <p>
              We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, 
              under our sole discretion, for any reason whatsoever, including but not limited to a breach of the terms.
            </p>

            <h2>11. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these terms at any time. If a revision is material, 
              we will provide at least 30 days notice prior to any new terms taking effect.
            </p>

            <h2>12. Governing Law</h2>
            <p>
              These terms shall be interpreted and governed by the laws of Australia, without regard to its conflict of law provisions.
            </p>

            <h2>13. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p>
              <strong>Phixx Creative Pty Ltd</strong><br />
              Email: legal@phixx.com<br />
              Website: <a href="https://phixx.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">phixx.com</a>
            </p>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-sm text-slate-500">
          © {new Date().getFullYear()} Phixx Creative Pty Ltd. All rights reserved.
        </div>
      </div>
    </div>
  );
}