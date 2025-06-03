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
  activeEffects: {[key: string]: number};
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
  slowCountdown,
  activeEffects
}: ActiveGameProps) {
  const [answer, setAnswer] = useState("");
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [selectedPowerUp, setSelectedPowerUp] = useState<string>("");
  const [slowDownActive, setSlowDownActive] = useState(false);
  const [questionStack, setQuestionStack] = useState<Array<{id: string, text: string, userAnswer?: number, correct?: boolean, state: string}>>([]);
  const [animationKey, setAnimationKey] = useState(0);

  // Handle new questions and manage stack
  useEffect(() => {
    if (currentQuestion?.id) {
      setQuestionStack(prev => {
        // Find if this question already exists
        const existingIndex = prev.findIndex(q => q.id === currentQuestion.id);
        
        if (existingIndex === -1) {
          // New question - mark old ones as previous and add new current
          const newStack = prev.map(q => ({ 
            ...q, 
            state: 'previous'
          }));
          newStack.push({
            id: currentQuestion.id,
            text: currentQuestion.text,
            state: 'current'
          });
          
          // Keep only last 2 items (current + 1 previous)
          return newStack.slice(-2);
        }
        
        return prev;
      });
      setAnimationKey(prev => prev + 1);
    }
  }, [currentQuestion?.id]);

  // Refocus input when it becomes enabled again
  useEffect(() => {
    if (!pendingAnswer) {
      setTimeout(() => {
        const inputElement = document.querySelector('input[type="number"]') as HTMLInputElement;
        if (inputElement) {
          inputElement.focus();
        }
      }, 100);
    }
  }, [pendingAnswer]);

  const handleSubmitAnswer = () => {
    // Check if player is frozen
    const now = Date.now();
    const isFrozen = activeEffects.freeze && activeEffects.freeze > now;
    
    if (isFrozen) return; // Prevent submission when frozen
    
    const numAnswer = parseInt(answer);
    if (!isNaN(numAnswer) && currentQuestion) {
      // Update current question in stack to "answered" state
      setQuestionStack(prev => prev.map(q => 
        q.id === currentQuestion.id 
          ? { ...q, userAnswer: numAnswer, correct: numAnswer === currentQuestion.answer, state: 'answered' }
          : q
      ));
      
      onSubmitAnswer(numAnswer);
      setAnswer("");
      
      // Focus the input after submission and when it's re-enabled
      setTimeout(() => {
        const inputElement = document.querySelector('input[type="number"]') as HTMLInputElement;
        if (inputElement && !inputElement.disabled) {
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
      if (powerUpType === 'shield') {
        // Shield applies to self, no player selection needed
        onUsePowerUp(powerUpType, currentPlayer.playerId);
      } else {
        setSelectedPowerUp(powerUpType);
        setShowPlayerSelection(true);
      }
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

  const calculateQuestionsUntilNext = (player: Player): number => {
    // At max difficulty (9), no progression possible
    if (player.difficultyLevel >= 9) return 0;
    
    // Need 5 consecutive correct to advance
    const needed = 5 - player.consecutiveCorrect;
    return Math.max(0, needed);
  };

  const stats: GameStats = {
    correct: currentPlayer.correctAnswers,
    wrong: currentPlayer.wrongAnswers,
    accuracy: currentPlayer.correctAnswers + currentPlayer.wrongAnswers > 0 
      ? Math.round((currentPlayer.correctAnswers / (currentPlayer.correctAnswers + currentPlayer.wrongAnswers)) * 100)
      : 0,
    hacks: 0, // This would need to be tracked separately
    difficulty: currentPlayer.difficultyLevel,
    questionsUntilNextDifficulty: calculateQuestionsUntilNext(currentPlayer)
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
              <div className="space-y-6">
                
                {/* Question Display Area */}
                <div className="relative min-h-[120px] flex flex-col justify-center mt-[50px]">
                  
                  {/* Question Stack */}
                  {questionStack.map((question, index) => {
                    const isNewest = index === questionStack.length - 1;
                    
                    let position = 'top-0';
                    let opacity = 'opacity-100';
                    let scale = 'scale-100';
                    let color = 'text-white';
                    
                    if (question.state === 'answered') {
                      position = 'top-[-40px]';
                      opacity = 'opacity-60';
                      scale = 'scale-75';
                      color = question.correct ? 'text-green-400' : 'text-red-400';
                    } else if (question.state === 'previous') {
                      position = 'top-[-40px]';
                      opacity = 'opacity-30';
                      scale = 'scale-75';
                      color = question.correct ? 'text-green-400' : 'text-red-400';
                    }
                    
                    return (
                      <div 
                        key={`question-${question.id}-${animationKey}`}
                        className={`absolute w-full transition-all duration-500 ease-in-out ${position} ${opacity} ${scale} ${color}`}
                        style={{ 
                          zIndex: isNewest ? 30 : 20,
                          animation: question.state === 'current' && animationKey > 0 ? 'slideUpFromBelow 0.5s ease-out forwards' : 'none'
                        }}
                      >
                        <div className="text-3xl font-bold">
                          {question.state === 'current' && !showAnswerFeedback.show
                            ? question.text
                            : question.userAnswer !== undefined
                            ? (
                                <>
                                  {question.text.replace('= ?', `= ${question.userAnswer}`)}
                                  <span className="ml-2 text-4xl">
                                    {question.correct ? '✓' : '✗'}
                                  </span>
                                </>
                              )
                            : question.text
                          }
                        </div>
                      </div>
                    );
                  })}
                  
                </div>
                
                {/* Input Area */}
                <div className="space-y-4">
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
                      disabled={!answer.trim() || !currentQuestion || pendingAnswer || Boolean(activeEffects.freeze && activeEffects.freeze > Date.now())}
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
                <div className="flex justify-between">
                  <span className="text-slate-400">Difficulty:</span>
                  <span className="font-semibold text-blue-500">{stats.difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Next Level:</span>
                  <span className="font-semibold text-orange-500">
                    {stats.questionsUntilNextDifficulty === 0 ? 'Max' : `${stats.questionsUntilNextDifficulty} more`}
                  </span>
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
        activeEffects={activeEffects}
      />
    </div>
  );
}
