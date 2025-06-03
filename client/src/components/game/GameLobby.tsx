import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Users } from "lucide-react";

interface GameLobbyProps {
  onHostGame: (playerName: string, maxPlayers: number) => void;
  onJoinGame: (playerName: string, gameCode: string) => void;
}

export function GameLobby({ onHostGame, onJoinGame }: GameLobbyProps) {
  const [hostName, setHostName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("4");

  const handleHostGame = () => {
    if (hostName.trim()) {
      onHostGame(hostName.trim(), parseInt(maxPlayers));
    }
  };

  const handleJoinGame = () => {
    if (joinName.trim() && gameCode.trim()) {
      onJoinGame(joinName.trim(), gameCode.trim().toUpperCase());
    }
  };

  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <h2 className="text-4xl font-bold">Ready to MathHack?</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Join other players in this real-time math competition. Answer questions, earn credits, and hack your opponents!
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Host Game Card */}
        <Card className="bg-slate-800/50 backdrop-blur border-slate-700 hover:border-blue-500/50 transition-all group">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Crown className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold">Host Game</h3>
                <p className="text-slate-400 text-sm mt-2">Create a new game session</p>
              </div>
              
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Your name"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="bg-slate-700 border-slate-600 focus:border-blue-500"
                />
                <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">Max 4 players</SelectItem>
                    <SelectItem value="6">Max 6 players</SelectItem>
                    <SelectItem value="8">Max 8 players</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleHostGame}
                disabled={!hostName.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 transition-colors transform hover:scale-105"
              >
                Create Game
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Join Game Card */}
        <Card className="bg-slate-800/50 backdrop-blur border-slate-700 hover:border-emerald-500/50 transition-all group">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-semibold">Join Game</h3>
                <p className="text-slate-400 text-sm mt-2">Enter a game session code</p>
              </div>
              
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Your name"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  className="bg-slate-700 border-slate-600 focus:border-emerald-500"
                />
                <Input
                  type="text"
                  placeholder="Game Code (e.g. ABC123)"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  className="bg-slate-700 border-slate-600 focus:border-emerald-500 font-mono text-center text-lg tracking-wider"
                  maxLength={6}
                />
              </div>
              
              <Button 
                onClick={handleJoinGame}
                disabled={!joinName.trim() || !gameCode.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 transition-colors transform hover:scale-105"
              >
                Join Game
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
