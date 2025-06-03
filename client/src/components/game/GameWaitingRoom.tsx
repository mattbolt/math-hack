import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Player } from "@shared/schema";
import { Copy, Play, Plus, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GameWaitingRoomProps {
  gameCode: string;
  players: Player[];
  isHost: boolean;
  onStartGame: () => void;
}

export function GameWaitingRoom({ gameCode, players, isHost, onStartGame }: GameWaitingRoomProps) {
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

  const getPlayerColor = (index: number) => {
    const colors = [
      "from-blue-500 to-blue-600",
      "from-emerald-500 to-emerald-600", 
      "from-orange-500 to-orange-600",
      "from-purple-500 to-purple-600",
      "from-pink-500 to-pink-600",
      "from-yellow-500 to-yellow-600",
      "from-red-500 to-red-600",
      "from-cyan-500 to-cyan-600"
    ];
    return colors[index % colors.length];
  };

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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {players.map((player, index) => (
          <Card key={player.id} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className={`w-12 h-12 bg-gradient-to-br ${getPlayerColor(index)} rounded-full flex items-center justify-center mx-auto mb-2`}>
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="font-semibold">
                {player.name}
                {player.isHost && " (Host)"}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {player.isReady ? "Ready" : "Joining..."}
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

      {isHost && (
        <div className="text-center">
          <Button
            onClick={onStartGame}
            disabled={players.length < 2}
            className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 transition-all transform hover:scale-105"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Game
          </Button>
        </div>
      )}
    </div>
  );
}
