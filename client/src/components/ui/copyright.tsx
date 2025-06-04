interface CopyrightProps {
  className?: string;
}

export function Copyright({ className = "" }: CopyrightProps) {
  return (
    <div className={`text-center text-xs text-slate-500 space-y-1 ${className}`}>
      <div>© {new Date().getFullYear()} Phixx Creative Pty Ltd. All rights reserved.</div>
      <div>
        Created by <a href="https://phixx.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Matt Bolt</a>
      </div>
    </div>
  );
}