import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Math Challenge Arena</h3>
            <p className="text-slate-400 text-sm">
              Compete in real-time math battles with players worldwide. Test your skills and climb the leaderboard!
            </p>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/privacy-policy"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-of-service"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Company</h3>
            <div className="text-slate-400 text-sm space-y-2">
              <p>
                Created by{" "}
                <a
                  href="https://phixx.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Matt Bolt
                </a>
              </p>
              <p>© {new Date().getFullYear()} Phixx Creative Pty Ltd</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-700">
          <p className="text-center text-slate-500 text-xs">
            All rights reserved. Made with passion for educational gaming.
          </p>
        </div>
      </div>
    </footer>
  );
}