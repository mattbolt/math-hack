import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copyright } from "@/components/ui/copyright";
import { Player, Question, GameLogEntry } from "@shared/schema";
import { type GameStats } from "@/lib/gameTypes";
import { Clock, Coins, Shield, Snowflake, Zap, User, Skull, Dumbbell } from "lucide-react";
import { PlayerSelectionModal } from "./PlayerSelectionModal";
import { GameLog } from "./GameLog";
import { motion, AnimatePresence } from "framer-motion";

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
  gameLog?: GameLogEntry[];
  activeEffects?: {[effect: string]: number};
  globalPlayerEffects?: {[playerId: string]: {[effect: string]: number}};
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
  gameLog = [],
  activeEffects = {},
  globalPlayerEffects = {}
}: ActiveGameProps) {
  const [answer, setAnswer] = useState("");
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [selectedPowerUp, setSelectedPowerUp] = useState<string>("");
  const [slowDownActive, setSlowDownActive] = useState(false);
  const [questionStack, setQuestionStack] = useState<Array<{id: string, text: string, userAnswer?: number, correct?: boolean, state: 'current' | 'answered' | 'previous'}>>([]);
  const [animationKey, setAnimationKey] = useState(0);
  const [slowedButton, setSlowedButton] = useState<number | null>(null);

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
            state: 'previous' as const
          }));
          newStack.push({
            id: currentQuestion.id,
            text: currentQuestion.text,
            state: 'current' as const
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

  const handleOptionSelect = (option: number) => {
    // Check if player is frozen - disable all interactions
    const isFrozen = Object.keys(activeEffects).some(effect =>
      effect === 'freeze' && activeEffects[effect] > Date.now()
    );

    // Check if player is slowed
    const isSlowed = Object.keys(activeEffects).some(effect =>
      effect === 'slow' && activeEffects[effect] > Date.now()
    );

    if (!pendingAnswer && currentQuestion && !isFrozen) {
      setAnswer(option.toString());

      if (isSlowed) {
        // Show visual loading effect on the clicked button
        setSlowedButton(option);

        // Delay before submitting answer when slowed
        setTimeout(() => {
          // Update current question in stack to "answered" state
          setQuestionStack(prev => prev.map(q =>
            q.id === currentQuestion.id
              ? { ...q, userAnswer: option, correct: option === currentQuestion.answer, state: 'answered' as const }
              : q
          ));

          // Submit the answer after delay
          onSubmitAnswer(option);
          setAnswer("");
          setSlowedButton(null);
        }, 2000);
      } else {
        // Normal speed - immediate submission
        // Update current question in stack to "answered" state
        setQuestionStack(prev => prev.map(q =>
          q.id === currentQuestion.id
            ? { ...q, userAnswer: option, correct: option === currentQuestion.answer, state: 'answered' as const }
            : q
        ));

        // Automatically submit the answer
        onSubmitAnswer(option);
        setAnswer("");
      }
    }
  };

  const handleSubmitAnswer = () => {
    const numAnswer = parseInt(answer);
    if (!isNaN(numAnswer) && currentQuestion) {
      // Update current question in stack to "answered" state
      setQuestionStack(prev => prev.map(q =>
        q.id === currentQuestion.id
          ? { ...q, userAnswer: numAnswer, correct: numAnswer === currentQuestion.answer, state: 'answered' as const }
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
      if (powerUpType === "shield") {
        // Shield applies to self, no target selection needed
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

  // Build active effects data for player selection modal from client activeEffects state
  const getActiveEffectsForModal = () => {
    const effects: {[playerId: string]: {[effect: string]: number}} = {};

    // Add current player's active effects
    Object.keys(activeEffects).forEach(effect => {
      if (activeEffects[effect] > Date.now()) {
        if (!effects[currentPlayer.playerId]) {
          effects[currentPlayer.playerId] = {};
        }
        effects[currentPlayer.playerId][effect] = activeEffects[effect];
      }
    });

    return effects;
  };

  const calculateQuestionsUntilNext = (player: Player): number => {
    // At max difficulty (9), no progression possible
    if (player.difficultyLevel >= 9) return 0;

    // Need 5 consecutive correct to advance
    const needed = 5 - player.consecutiveCorrect;
    return Math.max(0, needed);
  };

  // Sort players by credits in descending order for animated leaderboard
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.credits - a.credits);
  }, [players]);

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
            <AnimatePresence>
              {sortedPlayers.map((player, index) => (
                <motion.div
                  key={player.playerId}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    duration: 0.3,
                    layout: { duration: 0.4, ease: "easeInOut" }
                  }}
                  className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${getPlayerColor(player.colorIndex)} rounded-full flex items-center justify-center relative`}>
                      <span className="text-xs font-bold text-white">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                      {player.isBeingHacked && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{player.name}</div>
                      <div className="text-xs text-slate-400">Credits: {player.credits}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <motion.div
                      className="flex items-center space-x-1"
                      animate={{ scale: player.credits > 0 ? [1, 1.1, 1] : 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Coins className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs font-semibold">{player.credits}</span>
                    </motion.div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Question Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question Card with Animation */}
          <Card className={`bg-gradient-to-br border-slate-600 transition-colors duration-500 ${
            Object.keys(activeEffects).some(effect => effect === 'shield' && activeEffects[effect] > Date.now())
              ? 'from-emerald-800/70 to-green-800/70 border-emerald-500 shadow-emerald-500/30 shadow-lg'
              : Object.keys(activeEffects).some(effect => effect === 'freeze' && activeEffects[effect] > Date.now())
              ? 'from-cyan-800/70 to-blue-800/70 border-cyan-500 shadow-cyan-500/30 shadow-lg'
              : Object.keys(activeEffects).some(effect => effect === 'slow' && activeEffects[effect] > Date.now())
              ? 'from-orange-800/70 to-amber-800/70 border-orange-500 shadow-orange-500/30 shadow-lg'
              : 'from-slate-800 to-slate-700'
          }`}>
            <CardContent className="p-8 text-center">
              <div className="space-y-6">

                {/* Question Display Area */}
                <div className="relative min-h-[60px] flex flex-col justify-center mt-[50px]">

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

                {/* Multiple Choice Options */}
                <div className="space-y-4">
                  {currentQuestion?.options && (
                    <div className="grid grid-cols-2 gap-3">
                      {currentQuestion.options.map((option, index) => {
                        const isFrozen = Object.keys(activeEffects).some(effect =>
                          effect === 'freeze' && activeEffects[effect] > Date.now()
                        );
                        const isButtonSlowed = slowedButton === option;
                        const isAnyButtonSlowed = slowedButton !== null;

                        return (
                          <Button
                            key={option}
                            onClick={() => handleOptionSelect(option)}
                            disabled={pendingAnswer || isFrozen || isAnyButtonSlowed}
                            className={`p-6 text-2xl font-bold transition-all transform hover:scale-105 relative ${
                              answer === option.toString() || isButtonSlowed
                                ? 'bg-blue-500 hover:bg-blue-600 border-2 border-blue-400' 
                                : 'bg-slate-600 hover:bg-slate-500 border-2 border-slate-500'
                            } ${(pendingAnswer || isFrozen || isAnyButtonSlowed) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isButtonSlowed ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                            ) : (
                              option
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-center">
                    <Button
                      onClick={onSkipQuestion}
                      disabled={currentPlayer.credits < 5 || pendingAnswer || Object.keys(activeEffects).some(effect => effect === 'freeze' && activeEffects[effect] > Date.now())}
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

          {/* Power-ups Panel */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center space-x-2">
                <Dumbbell className="w-5 h-5 text-yellow-500" />
                <span>Power-ups</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handlePowerUpClick("slow")}
                  disabled={currentPlayer.credits < 50}
                  variant="outline"
                  className="bg-slate-700 hover:bg-slate-600 border-slate-600 text-left justify-between p-4 h-auto"
                >
                  <div className="flex flex-col items-start space-y-1">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-orange-500" />
                      <div className="font-medium">Slow Down</div>
                    </div>
                    <div className="text-xs text-slate-400">Reduce opponent speed</div>
                    <div className="flex items-center space-x-1">
                      <Coins className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs font-semibold">50</span>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => handlePowerUpClick("freeze")}
                  disabled={currentPlayer.credits < 100}
                  variant="outline"
                  className="bg-slate-700 hover:bg-slate-600 border-slate-600 text-left justify-between p-4 h-auto"
                >
                  <div className="flex flex-col items-start space-y-1">
                    <div className="flex items-center space-x-2">
                      <Snowflake className="w-4 h-4 text-cyan-400" />
                      <div className="font-medium">Freeze</div>
                    </div>
                    <div className="text-xs text-slate-400">Pause their timer</div>
                    <div className="flex items-center space-x-1">
                      <Coins className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs font-semibold">100</span>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => handlePowerUpClick("shield")}
                  disabled={currentPlayer.credits < 150}
                  variant="outline"
                  className="bg-slate-700 hover:bg-slate-600 border-slate-600 text-left justify-between p-4 h-auto"
                >
                  <div className="flex flex-col items-start space-y-1">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      <div className="font-medium">Shield</div>
                    </div>
                    <div className="text-xs text-slate-400">Block attacks</div>
                    <div className="flex items-center space-x-1">
                      <Coins className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs font-semibold">150</span>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => handlePowerUpClick("hack")}
                  disabled={currentPlayer.credits < 250}
                  variant="outline"
                  className="bg-purple-700 hover:bg-purple-600 border-purple-600 text-left justify-between p-4 h-auto"
                >
                  <div className="flex flex-col items-start space-y-1">
                    <div className="flex items-center space-x-2">
                      <Skull className="w-4 h-4 text-purple-400" />
                      <div className="font-medium">Hack Player</div>
                    </div>
                    <div className="text-xs text-slate-400">Steal their credits</div>
                    <div className="flex items-center space-x-1">
                      <Coins className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs font-semibold">250</span>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Stats & Game Log */}
        <div className="space-y-6">

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

          {/* Game Log */}
          <GameLog gameLog={gameLog} />
        </div>
      </div>

      <PlayerSelectionModal
        isOpen={showPlayerSelection}
        players={otherPlayers}
        onSelect={handlePlayerSelect}
        onCancel={() => setShowPlayerSelection(false)}
        title={selectedPowerUp === "hack" ? "Select Target to Hack" : "Select Target Player"}
        activeEffects={globalPlayerEffects}
      />

      <Copyright className="mt-4" />
    </div>
  );
}
