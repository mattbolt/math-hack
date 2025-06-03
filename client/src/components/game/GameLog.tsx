import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GameLogEntry } from "@shared/schema";
import { Clock, Coins, Shield, Snowflake, Zap, Shuffle, Skull, User } from "lucide-react";

interface GameLogProps {
  gameLog: GameLogEntry[];
}

export function GameLog({ gameLog }: GameLogProps) {
  const getEventIcon = (type: string, details: string) => {
    switch (type) {
      case 'powerup':
        if (details.includes('Shield')) return <Shield className="w-4 h-4 text-blue-400" />;
        if (details.includes('Slow')) return <Snowflake className="w-4 h-4 text-blue-300" />;
        if (details.includes('Freeze')) return <Zap className="w-4 h-4 text-yellow-400" />;
        if (details.includes('Scramble')) return <Shuffle className="w-4 h-4 text-purple-400" />;
        return <Shield className="w-4 h-4 text-gray-400" />;
      case 'hack_start':
        return <Skull className="w-4 h-4 text-red-400" />;
      case 'hack_complete':
        return <Skull className="w-4 h-4 text-red-600" />;
      case 'credit_change':
        return <Coins className="w-4 h-4 text-yellow-500" />;
      case 'player_join':
        return <User className="w-4 h-4 text-green-400" />;
      case 'game_start':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'powerup':
        return 'text-purple-300';
      case 'hack_start':
      case 'hack_complete':
        return 'text-red-300';
      case 'credit_change':
        return 'text-yellow-300';
      case 'player_join':
        return 'text-green-300';
      case 'game_start':
        return 'text-blue-300';
      default:
        return 'text-gray-300';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Sort by timestamp (newest first)
  const sortedLog = [...gameLog].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Card className="bg-slate-800/50 border-slate-700 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <span>Game Log</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64 px-4">
          {sortedLog.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No events yet</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {sortedLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start space-x-3 p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getEventIcon(entry.type, entry.details)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${getEventColor(entry.type)}`}>
                      {entry.details}
                    </div>
                    {entry.creditChange && (
                      <div className={`text-xs flex items-center space-x-1 mt-1 ${
                        entry.creditChange > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        <Coins className="w-3 h-3" />
                        <span>{entry.creditChange > 0 ? '+' : ''}{entry.creditChange} credits</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-xs text-slate-500">
                    {formatTimestamp(entry.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}