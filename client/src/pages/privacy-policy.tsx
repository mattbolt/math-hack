import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
              Privacy Policy
            </CardTitle>
            <p className="text-center text-slate-600">
              Effective Date: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <h2>1. Information We Collect</h2>
            <p>
              Math Challenge Arena collects the following information:
            </p>
            <ul>
              <li><strong>Account Information:</strong> When you create an account through Clerk, we collect your email address, name, and authentication data.</li>
              <li><strong>Game Data:</strong> We collect game session data including scores, answers, and gameplay statistics.</li>
              <li><strong>Usage Information:</strong> We collect information about how you use our service, including game sessions and interactions.</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul>
              <li>Provide and maintain the Math Challenge Arena game service</li>
              <li>Authenticate users and manage game sessions</li>
              <li>Track game progress and maintain leaderboards</li>
              <li>Improve our service and user experience</li>
              <li>Communicate with you about your account and the service</li>
            </ul>

            <h2>3. Information Sharing and Disclosure</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties except:
            </p>
            <ul>
              <li>To Clerk for authentication services</li>
              <li>When required by law or to protect our rights</li>
              <li>In connection with a merger, acquisition, or sale of assets</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information against unauthorized access, 
              alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>

            <h2>5. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide our services and fulfill the purposes 
              outlined in this privacy policy, unless a longer retention period is required by law.
            </p>

            <h2>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Object to processing of your information</li>
            </ul>

            <h2>7. Children's Privacy</h2>
            <p>
              Our service is not intended for children under 13. We do not knowingly collect personal information from 
              children under 13. If we become aware that we have collected such information, we will take steps to delete it.
            </p>

            <h2>8. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new 
              privacy policy on this page and updating the effective date.
            </p>

            <h2>9. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy, please contact us at:
            </p>
            <p>
              <strong>Phixx Creative Pty Ltd</strong><br />
              Email: privacy@phixx.com<br />
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