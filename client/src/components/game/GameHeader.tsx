import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserButton, useAuth, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Calculator, Coins, LogOut, Clock, User, UserPlus } from "lucide-react";

interface GameHeaderProps {
  gameCode?: string;
  playerCredits: number;
  gameTimeRemaining?: number;
  onLeaveGame: () => void;
  isGameActive?: boolean;
}

export function GameHeader({ gameCode, playerCredits, gameTimeRemaining, onLeaveGame, isGameActive = false }: GameHeaderProps) {
  const { isSignedIn } = useAuth();
  
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">
                MathHack
              </h1>
            </div>
            {gameCode && (
              <div className="hidden sm:block">
                <span className="text-sm text-slate-400">Session:</span>
                <span className="ml-1 px-2 py-1 bg-slate-700 rounded text-sm font-mono">
                  {gameCode}
                </span>
              </div>
            )}
            {gameTimeRemaining !== undefined && gameTimeRemaining > 0 && (
              <div className="hidden sm:block">
                <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span className={`font-semibold ${gameTimeRemaining <= 60 ? 'text-red-500' : 'text-white'}`}>
                    {formatTime(gameTimeRemaining)}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {isGameActive && (
              <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1 rounded-full">
                <Coins className="w-4 h-4 text-yellow-500" />
                <span className="font-semibold">{playerCredits}</span>
              </div>
            )}
            {isSignedIn ? (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                    userButtonPopoverCard: "bg-slate-800 border-slate-700",
                    userButtonPopoverActions: "text-white",
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
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up
                  </Button>
                </SignUpButton>
              </div>
            )}
            {isGameActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLeaveGame}
                className="text-slate-400 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
