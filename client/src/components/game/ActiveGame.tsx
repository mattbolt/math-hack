import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Player, Question } from "@shared/schema";
import { type GameStats } from "@/lib/gameTypes";
import { Clock, Coins, Shield, Snowflake, Zap, User, Skull } from "lucide-react";
import { PlayerSelectionModal } from "./PlayerSelectionModal";

interface ActiveGameProps {
  players: Player[];
  currentPlayer: Player;
  currentQuestion?: Question;
  timeRemaining: number;
  isBeingHacked: boolean;
  hackerName?: string;
  hackProgress: number;
  onSubmitAnswer: (answer: number) => void;
  onUsePowerUp: (powerUpType: string, targetId: string) => void;
  onStartHack: (targetId: string) => void;
  onSkipQuestion: () => void;
  showAnswerFeedback: {show: boolean, correct: boolean};
  pendingAnswer: boolean;
  hackModeActive: boolean;
  hackModeData: {attackerProgress: number, defenderProgress: number, isAttacker: boolean, opponentName: string} | null;
  slowCountdown: number;
}

export function ActiveGame({
  players,
  currentPlayer,
  currentQuestion,
  timeRemaining,
  isBeingHacked,
  hackerName,
  hackProgress,
  onSubmitAnswer,
  onUsePowerUp,
  onStartHack,
  onSkipQuestion,
  showAnswerFeedback,
  pendingAnswer,
  hackModeActive,
  hackModeData,
  slowCountdown
}: ActiveGameProps) {
  const [answer, setAnswer] = useState("");
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [selectedPowerUp, setSelectedPowerUp] = useState<string>("");
  const [slowDownActive, setSlowDownActive] = useState(false);
  const [previousQuestions, setPreviousQuestions] = useState<Array<{text: string, userAnswer: number, correct: boolean}>>([]);
  const [currentQuestionKey, setCurrentQuestionKey] = useState(0);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState<number | null>(null);

  // Track when new questions arrive to trigger animations
  useEffect(() => {
    if (currentQuestion?.id) {
      setCurrentQuestionKey(prev => prev + 1);
    }
  }, [currentQuestion?.id]);

  const handleSubmitAnswer = () => {
    const numAnswer = parseInt(answer);
    if (!isNaN(numAnswer) && currentQuestion) {
      // Store the submitted answer for transformation
      setLastSubmittedAnswer(numAnswer);
      
      // Add to previous questions when answer feedback shows
      setTimeout(() => {
        setPreviousQuestions(prev => [
          ...prev.slice(-1), // Keep only last previous question
          {
            text: currentQuestion.text,
            userAnswer: numAnswer,
            correct: numAnswer === currentQuestion.answer
          }
        ]);
      }, 500);
      
      onSubmitAnswer(numAnswer);
      setAnswer("");
      
      // Focus the input after submission
      setTimeout(() => {
        const inputElement = document.querySelector('input[type="number"]') as HTMLInputElement;
        if (inputElement) {
          inputElement.focus();
        }
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmitAnswer();
    }
  };

  const handlePowerUpClick = (powerUpType: string) => {
    if (currentPlayer.credits >= getPowerUpCost(powerUpType)) {
      setSelectedPowerUp(powerUpType);
      setShowPlayerSelection(true);
    }
  };

  const handlePlayerSelect = (targetId: string) => {
    onUsePowerUp(selectedPowerUp, targetId);
    setShowPlayerSelection(false);
    setSelectedPowerUp("");
  };

  const getPowerUpCost = (type: string): number => {
    switch (type) {
      case "slow": return 50;
      case "freeze": return 75;
      case "scramble": return 100;
      case "shield": return 150;
      case "hack": return 50;
      default: return 0;
    }
  };

  const getPlayerColor = (index: number) => {
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
    return colors[index % colors.length];
  };

  const otherPlayers = players.filter(p => p.playerId !== currentPlayer.playerId);

  const stats: GameStats = {
    correct: currentPlayer.correctAnswers,
    wrong: currentPlayer.wrongAnswers,
    accuracy: currentPlayer.correctAnswers + currentPlayer.wrongAnswers > 0 
      ? Math.round((currentPlayer.correctAnswers / (currentPlayer.correctAnswers + currentPlayer.wrongAnswers)) * 100)
      : 0,
    hacks: 0 // This would need to be tracked separately
  };

  return (
    <div className="space-y-6">
      {/* Players Status Bar */}
      <Card className="bg-slate-800/50 backdrop-blur border-slate-700">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {players.map((player, index) => (
              <div key={player.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 ${getPlayerColor(index)} rounded-full flex items-center justify-center relative`}>
                    <span className="text-xs font-bold text-white">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                    {player.isBeingHacked && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{player.name}</div>
                    <div className="text-xs text-slate-400">Score: {player.score}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Coins className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs font-semibold">{player.credits}</span>
                  </div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Question Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question Card with Animation */}
          <Card className="bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600">
            <CardContent className="p-8 text-center">
              <div className="space-y-6 relative overflow-hidden min-h-[300px]">
                
                {/* Previous Questions Stack */}
                {previousQuestions.map((prevQ, index) => (
                  <div 
                    key={`prev-${index}-${prevQ.text}`}
                    className={`absolute w-full transition-all duration-1000 ease-in-out ${
                      index === previousQuestions.length - 1 ? 'top-0 opacity-60 scale-75' : 'top-[-50px] opacity-30 scale-50'
                    }`}
                    style={{ zIndex: 10 - index }}
                  >
                    <div className={`text-2xl font-bold ${prevQ.correct ? 'text-green-400' : 'text-red-400'}`}>
                      {prevQ.text.replace('= ?', `= ${prevQ.userAnswer}`)}
                      <span className="ml-2 text-3xl">
                        {prevQ.correct ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Current Question with Answer Transformation */}
                <div 
                  key={`current-${currentQuestionKey}`}
                  className={`absolute w-full transition-all duration-500 ease-in-out mt-16 ${
                    showAnswerFeedback.show 
                      ? `opacity-60 scale-75 transform translate-y-[-100px] ${showAnswerFeedback.correct ? 'text-green-400' : 'text-red-400'}` 
                      : 'opacity-100 scale-100 transform translate-y-0 text-white'
                  }`} 
                  style={{ 
                    zIndex: 20,
                    animation: !showAnswerFeedback.show && currentQuestionKey > 0 ? 'slideUpFromBelow 0.5s ease-out forwards' : 'none'
                  }}
                >
                  <div className="text-4xl font-bold">
                    {showAnswerFeedback.show && currentQuestion && lastSubmittedAnswer !== null
                      ? (
                          <>
                            {currentQuestion.text.replace('= ?', `= ${lastSubmittedAnswer}`)}
                            <span className="ml-2 text-5xl">
                              {showAnswerFeedback.correct ? '✓' : '✗'}
                            </span>
                          </>
                        )
                      : (currentQuestion?.text || "Waiting for question...")
                    }
                  </div>
                </div>
                
                <div className="space-y-4 relative mt-20" style={{ zIndex: 30 }}>
                  <Input
                    type="number"
                    placeholder="Your answer..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={pendingAnswer}
                    className={`w-full px-6 py-4 bg-slate-700 border-2 border-slate-600 focus:border-blue-500 text-center text-2xl font-semibold ${
                      pendingAnswer ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                  
                  <div className="flex space-x-3">
                    <Button 
                      onClick={handleSubmitAnswer}
                      disabled={!answer.trim() || !currentQuestion || pendingAnswer}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 transition-colors transform hover:scale-105 disabled:opacity-50"
                    >
                      {pendingAnswer ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>
                            {slowCountdown > 0 ? `Slowed (${slowCountdown}s)` : 'Processing...'}
                          </span>
                        </div>
                      ) : 'Submit Answer'}
                    </Button>
                    <Button 
                      onClick={onSkipQuestion}
                      disabled={currentPlayer.credits < 5 || pendingAnswer}
                      variant="outline"
                      className="px-6 bg-slate-600 hover:bg-slate-500 border-slate-500"
                    >
                      Skip (-5 credits)
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hack Status Alert */}
          {isBeingHacked && (
            <Card className="bg-purple-600/20 border-2 border-purple-600 animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Skull className="w-6 h-6 text-purple-600" />
                    <div>
                      <div className="font-semibold text-purple-600">You're Being Hacked!</div>
                      <div className="text-sm text-slate-300">Answer quickly to defend yourself</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400">Hacker: {hackerName}</div>
                    <div className="text-xs text-purple-600">Progress: {hackProgress}/5</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Power-ups & Actions */}
        <div className="space-y-6">
          {/* Power-ups Panel */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center space-x-2">
                <Zap className="w-5 h-5 text-orange-500" />
                <span>Power-ups</span>
              </h3>
              
              <div className="space-y-3">
                <Button
                  onClick={() => handlePowerUpClick("slow")}
                  disabled={currentPlayer.credits < 50}
                  variant="outline"
                  className="w-full bg-slate-700 hover:bg-slate-600 border-slate-600 text-left justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <div>
                      <div className="font-medium">Slow Down</div>
                      <div className="text-xs text-slate-400">Reduce opponent speed</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Coins className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs font-semibold">50</span>
                  </div>
                </Button>
                
                <Button
                  onClick={() => handlePowerUpClick("freeze")}
                  disabled={currentPlayer.credits < 75}
                  variant="outline"
                  className="w-full bg-slate-700 hover:bg-slate-600 border-slate-600 text-left justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Snowflake className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="font-medium">Freeze</div>
                      <div className="text-xs text-slate-400">Pause their timer</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Coins className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs font-semibold">75</span>
                  </div>
                </Button>

                <Button
                  onClick={() => handlePowerUpClick("shield")}
                  disabled={currentPlayer.credits < 150}
                  variant="outline"
                  className="w-full bg-slate-700 hover:bg-slate-600 border-slate-600 text-left justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="font-medium">Shield</div>
                      <div className="text-xs text-slate-400">Block attacks</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Coins className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs font-semibold">150</span>
                  </div>
                </Button>

                <Button
                  onClick={() => handlePowerUpClick("hack")}
                  disabled={currentPlayer.credits < 50}
                  variant="outline"
                  className="w-full bg-purple-700 hover:bg-purple-600 border-purple-600 text-left justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Skull className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="font-medium">Hack Player</div>
                      <div className="text-xs text-slate-400">Steal their credits</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Coins className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs font-semibold">50</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Hack Mode Panel - Only show when hack mode is active */}
          {hackModeActive && hackModeData && (
            <Card className="bg-gradient-to-br from-red-600/20 to-purple-600/20 border-2 border-red-500 animate-pulse">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center space-x-2 text-red-400">
                  <Skull className="w-5 h-5" />
                  <span>HACK MODE ACTIVE</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="text-center text-sm text-slate-300">
                    {hackModeData.isAttacker 
                      ? `Hacking ${hackModeData.opponentName}` 
                      : `Defending against ${hackModeData.opponentName}`
                    }
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-red-400">Attacker Progress</span>
                        <span className="font-semibold">{hackModeData.attackerProgress}/5</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-red-600 to-red-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(hackModeData.attackerProgress / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-400">Defender Progress</span>
                        <span className="font-semibold">{hackModeData.defenderProgress}/5</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(hackModeData.defenderProgress / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-center text-slate-400">
                    {hackModeData.isAttacker 
                      ? "Get 5 correct answers to steal credits!" 
                      : "Get 5 correct answers to defend yourself!"
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3 text-sm">Your Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Correct Answers:</span>
                  <span className="font-semibold text-emerald-500">{stats.correct}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Wrong Answers:</span>
                  <span className="font-semibold text-red-500">{stats.wrong}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Accuracy:</span>
                  <span className="font-semibold">{stats.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Consecutive:</span>
                  <span className="font-semibold text-purple-600">{currentPlayer.consecutiveCorrect}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PlayerSelectionModal
        isOpen={showPlayerSelection}
        players={otherPlayers}
        onSelect={handlePlayerSelect}
        onCancel={() => setShowPlayerSelection(false)}
        title={selectedPowerUp === "hack" ? "Select Target to Hack" : "Select Target Player"}
      />
    </div>
  );
}
