import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Player } from "@shared/schema";
import { Trophy, Share, RotateCcw } from "lucide-react";

interface GameResultsProps {
  players: Player[];
  onPlayAgain: () => void;
}

export function GameResults({ players, onPlayAgain }: GameResultsProps) {
  const sortedPlayers = [...players].sort((a, b) => b.credits - a.credits);
  const highestScore = sortedPlayers.length > 0 ? sortedPlayers[0].credits : 0;

  const getRankColor = (player: any, rank: number) => {
    // All players with highest score get gold styling
    if (player.credits === highestScore && highestScore > 0) {
      return "from-yellow-400 to-yellow-600";
    }
    switch (rank) {
      case 2: return "from-slate-400 to-slate-600";
      case 3: return "from-amber-600 to-amber-800";
      default: return "from-slate-600 to-slate-700";
    }
  };

  const getRankIcon = (player: any, rank: number) => {
    // All players with highest score get trophy
    if (player.credits === highestScore && highestScore > 0) {
      return <Trophy className="w-6 h-6 text-yellow-100" />;
    }
    return <span className="text-lg font-bold">{rank}</span>;
  };

  const getCardBackground = (player: any, rank: number) => {
    // All players with highest score get gold background
    if (player.credits === highestScore && highestScore > 0) {
      return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
    }
    return 'bg-slate-700/50 border-slate-600';
  };

  const shareResults = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MathHack Game Results',
          text: `I just played MathHack! Check out the results:\n${sortedPlayers.map((p, i) => `${i + 1}. ${p.name}: ${p.credits} credits`).join('\n')}`,
          url: window.location.origin
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
  };

  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
          Game Complete!
        </h2>
        <p className="text-slate-400">Final scores and achievements</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8">
            <h3 className="text-xl font-semibold text-blue-500 mb-6 text-center flex items-center justify-center">
              <Trophy className="w-6 h-6 mr-2" />
              Final Leaderboard
            </h3>

            <div className="space-y-4">
              {sortedPlayers.map((player, index) => {
                const rank = index + 1;
                const accuracy = player.correctAnswers + player.wrongAnswers > 0
                  ? Math.round((player.correctAnswers / (player.correctAnswers + player.wrongAnswers)) * 100)
                  : 0;

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${getCardBackground(player, rank)}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${getRankColor(player, rank)} rounded-full flex items-center justify-center`}>
                        {getRankIcon(player, rank)}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-lg">{player.name}</div>
                        <div className="text-sm text-slate-400">
                          {player.correctAnswers} correct • {accuracy}% accuracy
                        </div>
                        <div className="text-xs text-slate-500">
                          Max Level: {player.maxDifficultyReached || 1} • Final Level: {player.difficultyLevel}
                        </div>
                        <div className="text-xs text-slate-500">
                          {player.questionsSkipped || 0} skipped • {player.hackAttempts || 0} attacks
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-500">{player.credits}</div>
                      <div className="text-xs text-slate-400">credits</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button
          onClick={onPlayAgain}
          className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 transition-all duration-300"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Play Again
        </Button>

        <Button
          onClick={shareResults}
          variant="outline"
          className="bg-slate-700 hover:bg-slate-600 border-slate-600"
        >
          <Share className="w-4 h-4 mr-2" />
          Share Results
        </Button>
      </div>
    </div>
  );
}
