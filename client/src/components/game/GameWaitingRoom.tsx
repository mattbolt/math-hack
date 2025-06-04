import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copyright } from "@/components/ui/copyright";
import { Player } from "@shared/schema";
import { Copy, Play, Plus, User, CheckCircle, Clock, Zap, Shield, Snowflake, Skull, Target, Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GameWaitingRoomProps {
  gameCode: string;
  players: Player[];
  isHost: boolean;
  currentPlayerId: string;
  onStartGame: () => void;
  onToggleReady: () => void;
}

export function GameWaitingRoom({ gameCode, players, isHost, currentPlayerId, onStartGame, onToggleReady }: GameWaitingRoomProps) {
  const { toast } = useToast();

  const copyGameCode = async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      toast({
        title: "Code copied!",
        description: "Game code has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy game code to clipboard.",
        variant: "destructive",
      });
    }
  };

  const getPlayerColor = (colorIndex: number) => {
    const colors = [
      "bg-blue-500",
      "bg-emerald-500", 
      "bg-orange-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-cyan-500"
    ];
    return colors[colorIndex % colors.length];
  };

  const currentPlayer = players.find(p => p.playerId === currentPlayerId);
  const nonHostPlayers = players.filter(p => !p.isHost);
  const allNonHostPlayersReady = players.length >= 2 && nonHostPlayers.every(p => p.isReady);
  const readyPlayersCount = nonHostPlayers.filter(p => p.isReady).length + 1; // +1 for host who is always ready
  const totalPlayersCount = players.length;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Waiting for Players...</h2>
        <div className="flex items-center justify-center space-x-2">
          <span className="text-slate-400">Share this code:</span>
          <div className="flex items-center space-x-2 bg-slate-800 px-4 py-2 rounded-lg">
            <span className="font-mono text-2xl font-bold text-blue-500">{gameCode}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyGameCode}
              className="text-slate-400 hover:text-white"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="text-sm text-slate-400">
          {readyPlayersCount} of {totalPlayersCount} players ready
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {players.map((player, index) => (
          <Card key={player.id} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className={`w-12 h-12 ${getPlayerColor(player.colorIndex)} rounded-full flex items-center justify-center mx-auto mb-2`}>
                <span className="text-sm font-bold text-white">
                  {player.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="font-semibold">
                {player.name}
                {player.isHost && " (Host)"}
              </div>
              <div className="flex items-center justify-center mt-2">
                {player.isHost || player.isReady ? (
                  <div className="flex items-center space-x-1 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Ready</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Not Ready</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, index) => (
          <Card key={`empty-${index}`} className="bg-slate-800/30 border-slate-600 border-dashed opacity-50">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Plus className="w-6 h-6 text-slate-400" />
              </div>
              <div className="text-slate-400 text-sm">Waiting...</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center space-y-4">
        {/* Ready Toggle for Non-Host Players Only */}
        {currentPlayer && currentPlayerId && !currentPlayer.isHost && (
          <Button
            onClick={onToggleReady}
            variant={currentPlayer.isReady ? "default" : "outline"}
            className={currentPlayer.isReady 
              ? "bg-emerald-600 hover:bg-emerald-700" 
              : "border-emerald-600 text-emerald-400 hover:bg-emerald-600 hover:text-white"
            }
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {currentPlayer.isReady ? "Ready!" : "Mark as Ready"}
          </Button>
        )}

        {/* Start Game Button for Host */}
        {isHost && (
          <div>
            <Button
              onClick={onStartGame}
              disabled={!allNonHostPlayersReady}
              className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Game
            </Button>
            {!allNonHostPlayersReady && (
              <p className="text-xs text-slate-400 mt-2">
                {players.length < 2 ? "Need at least 2 players" : "All players must be ready"}
              </p>
            )}
          </div>
        )}
      </div>

      {/* How to Play Instructions */}
      <Card className="bg-slate-800/50 border-slate-700 max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-xl">How to Play MathHack</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Target className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-400">Objective</h3>
                  <p className="text-sm text-slate-300">Answer math questions to earn credits. Player with the most credits wins!</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-emerald-400">Questions</h3>
                  <p className="text-sm text-slate-300">Questions get harder as you answer correctly. Each correct answer earns more credits at higher difficulties.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Skull className="w-5 h-5 text-purple-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-purple-400">Hacking</h3>
                  <p className="text-sm text-slate-300">Use credits to hack other players and steal their credits. Answer 5 questions correctly to succeed!</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Dumbbell className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-400">Power-ups</h3>
                  <p className="text-sm text-slate-300">Spend credits to use special abilities that affect other players or protect yourself.</p>
                </div>
              </div>

              <div className="space-y-3 ml-8">
                <div className="flex items-start space-x-2">
                  <Zap className="w-4 h-4 text-orange-400 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-orange-400">Slow (50 credits)</span>
                    <p className="text-xs text-slate-300">Delays opponent's answer submission by 2 seconds</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Snowflake className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-blue-400">Freeze (100 credits)</span>
                    <p className="text-xs text-slate-300">Prevents opponent from submitting answers temporarily</p>
                  </div>
                </div>
                

                
                <div className="flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-emerald-400 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-emerald-400">Shield (150 credits)</span>
                    <p className="text-xs text-slate-300">Protects you from all power-up effects for 20 seconds</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Copyright className="mt-8" />
    </div>
  );
}
