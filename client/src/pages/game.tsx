import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { wsManager } from "@/lib/websocket";
import { GameHeader } from "@/components/game/GameHeader";
import { GameLobby } from "@/components/game/GameLobby";
import { GameWaitingRoom } from "@/components/game/GameWaitingRoom";
import { ActiveGame } from "@/components/game/ActiveGame";
import { GameResults } from "@/components/game/GameResults";
import { type GamePhase } from "@/lib/gameTypes";
import { type GameSession, type Player, type Question, type GameLogEntry } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { nanoid } from "nanoid";

export default function Game() {
  const [gamePhase, setGamePhase] = useState<GamePhase>("lobby");
  const [playerId] = useState(() => nanoid());
  const [playerName, setPlayerName] = useState("");
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | undefined>();
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [isBeingHacked, setIsBeingHacked] = useState(false);
  const [hackerName, setHackerName] = useState("");
  const [hackProgress, setHackProgress] = useState(0);
  const [activeEffects, setActiveEffects] = useState<{[key: string]: number}>({});
  const [globalPlayerEffects, setGlobalPlayerEffects] = useState<{[playerId: string]: {[effect: string]: number}}>({});
  const [showAnswerFeedback, setShowAnswerFeedback] = useState<{show: boolean, correct: boolean}>({show: false, correct: false});
  const [hackModeActive, setHackModeActive] = useState(false);
  const [hackModeData, setHackModeData] = useState<{attackerProgress: number, defenderProgress: number, isAttacker: boolean, opponentName: string} | null>(null);
  const [pendingAnswer, setPendingAnswer] = useState(false);
  const [slowCountdown, setSlowCountdown] = useState(0);
  const [gameTimeRemaining, setGameTimeRemaining] = useState<number>(0);
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);

  // Update effect timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      // Clean up current player's active effects
      setActiveEffects(prev => {
        const filtered = Object.fromEntries(
          Object.entries(prev).filter(([_, endTime]) => endTime > now)
        );
        return filtered;
      });

      // Clean up global player effects
      setGlobalPlayerEffects(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(playerId => {
          const playerEffects = Object.fromEntries(
            Object.entries(updated[playerId]).filter(([_, endTime]) => endTime > now)
          );
          if (Object.keys(playerEffects).length === 0) {
            delete updated[playerId];
          } else {
            updated[playerId] = playerEffects;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);
  
  const { toast } = useToast();

  const currentPlayer = players.find(p => p.playerId === playerId);

  // WebSocket setup
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await wsManager.connect();
        
        const handleGameState = (message: any) => {
          if (message.session) setGameSession(message.session);
          if (message.players) {
            setPlayers(message.players);
            console.log('Game state updated:', message.players);
          }
        };

        const handlePlayerJoined = (message: any) => {
          if (message.players) {
            setPlayers(message.players);
            console.log('Players updated:', message.players);
          }
        };

        const handleGameStarted = (message: any) => {
          setGamePhase('active');
          if (message.session) {
            setGameSession(message.session);
            // Calculate initial game time remaining
            if (message.session.gameStartTime && message.session.gameDuration) {
              const startTime = new Date(message.session.gameStartTime).getTime();
              const duration = message.session.gameDuration * 60 * 1000; // Convert to milliseconds
              const elapsed = Date.now() - startTime;
              const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
              setGameTimeRemaining(remaining);
            }
          }
        };

        const handleNewQuestion = (message: any) => {
          setCurrentQuestion(message.question);
          setTimeRemaining(message.question.timeLimit);
        };

        const handleAnswerSubmitted = (message: any) => {
          // Show feedback for the player who submitted the answer
          if (message.playerId === playerId) {
            setShowAnswerFeedback({ show: true, correct: message.isCorrect });
            setPendingAnswer(false);
            
            // Hide feedback after short duration
            setTimeout(() => {
              setShowAnswerFeedback({ show: false, correct: false });
            }, 1000);
          }
          
          setPlayers(prevPlayers => 
            prevPlayers.map(p => 
              p.playerId === message.playerId ? message.player : p
            )
          );
        };

        const handleHackStarted = (message: any) => {
          if (message.targetId === playerId || message.hackerId === playerId) {
            setHackModeActive(true);
            setHackModeData({
              attackerProgress: 0,
              defenderProgress: 0,
              isAttacker: message.hackerId === playerId,
              opponentName: message.hackerId === playerId ? message.targetName : message.hackerName
            });
            
            toast({
              title: message.hackerId === playerId ? "Hack Mode Activated!" : "You're Being Hacked!",
              description: message.hackerId === playerId 
                ? `You're hacking ${message.targetName}!` 
                : `${message.hackerName} is attempting to hack you!`,
              variant: message.hackerId === playerId ? "default" : "destructive",
            });
          }
        };

        const handleHackProgress = (message: any) => {
          if (message.hackerId === playerId || message.targetId === playerId) {
            setHackModeData(prev => prev ? {
              ...prev,
              attackerProgress: message.attackerProgress,
              defenderProgress: message.defenderProgress
            } : null);
          }
        };

        const handleHackCompleted = (message: any) => {
          if (message.hackerId === playerId || message.targetId === playerId) {
            toast({
              title: "Hack Complete!",
              description: message.success 
                ? (message.hackerId === playerId ? `You stole ${message.creditsStolen} credits!` : `You lost ${message.creditsStolen} credits!`)
                : (message.hackerId === playerId ? "Hack failed! Target defended successfully." : "You successfully defended the hack!"),
              variant: message.success === (message.hackerId === playerId) ? "default" : "destructive",
            });

            setTimeout(() => {
              setHackModeActive(false);
              setHackModeData(null);
              setIsBeingHacked(false);
              setHackerName("");
              setHackProgress(0);
            }, 5000);
          }
        };

        const handlePowerUpUsed = (message: any) => {
          // Update global player effects for all players
          setGlobalPlayerEffects(prev => {
            const updated = { ...prev };
            
            if (message.effect === 'shield') {
              // Shield removes all existing effects for the target player
              updated[message.targetId] = { shield: Date.now() + (message.duration * 1000) };
            } else {
              // Check if target has shield protection
              const hasShield = updated[message.targetId] && 
                               updated[message.targetId]['shield'] && 
                               updated[message.targetId]['shield'] > Date.now();
              
              if (!hasShield) {
                if (!updated[message.targetId]) {
                  updated[message.targetId] = {};
                }
                updated[message.targetId][message.effect] = Date.now() + (message.duration * 1000);
              }
            }
            
            return updated;
          });

          // Handle current player's local effects
          if (message.targetId === playerId) {
            if (message.effect === 'shield') {
              // Shield removes all active effects and prevents new ones
              setActiveEffects({ shield: Date.now() + (message.duration * 1000) });
            } else {
              // Other effects - if shield is active, ignore them
              setActiveEffects(prev => {
                if (prev.shield && prev.shield > Date.now()) {
                  return prev; // Shield blocks new effects
                }
                return { 
                  ...prev, 
                  [message.effect]: Date.now() + (message.duration * 1000) 
                };
              });
            }

            toast({
              title: `${message.effect.charAt(0).toUpperCase() + message.effect.slice(1)} Effect Applied!`,
              description: `You've been affected for ${message.duration || 5} seconds!`,
              variant: "destructive",
            });
          } else {
            const targetPlayer = players.find(p => p.playerId === message.targetId);
            toast({
              title: "Power-up Used!",
              description: `${message.effect.charAt(0).toUpperCase() + message.effect.slice(1)} used on ${targetPlayer?.name || 'Unknown'}!`,
            });
          }
        };

        const handleQuestionSkipped = (message: any) => {
          // Update the player who skipped
          setPlayers(prevPlayers => 
            prevPlayers.map(p => 
              p.playerId === message.playerId ? message.player : p
            )
          );

          // Show feedback for the player who skipped
          if (message.playerId === playerId) {
            toast({
              title: "Question Skipped",
              description: "5 credits deducted. Difficulty may decrease.",
              variant: "destructive",
            });
          }
        };

        const handleGameLogUpdated = (message: any) => {
          setGameLog(message.gameLog || []);
        };

        const handlePlayerUpdated = (message: any) => {
          setPlayers(prevPlayers => 
            prevPlayers.map(p => 
              p.playerId === message.player.playerId ? message.player : p
            )
          );
        };

        const handleGameEnded = (message: any) => {
          setGamePhase('results');
          setPlayers(message.players || []);
          
          toast({
            title: "Game Over!",
            description: message.reason === 'timeUp' ? "Time's up! Check the final scores." : "Game has ended.",
            variant: "default",
          });
        };

        wsManager.on('gameState', handleGameState);
        wsManager.on('playerJoined', handlePlayerJoined);
        wsManager.on('gameStarted', handleGameStarted);
        wsManager.on('newQuestion', handleNewQuestion);
        wsManager.on('answerSubmitted', handleAnswerSubmitted);
        wsManager.on('hackStarted', handleHackStarted);
        wsManager.on('hackProgress', handleHackProgress);
        wsManager.on('hackCompleted', handleHackCompleted);
        wsManager.on('powerUpUsed', handlePowerUpUsed);
        wsManager.on('questionSkipped', handleQuestionSkipped);
        wsManager.on('gameLogUpdated', handleGameLogUpdated);
        wsManager.on('playerUpdated', handlePlayerUpdated);
        wsManager.on('gameEnded', handleGameEnded);

        return () => {
          wsManager.off('gameState', handleGameState);
          wsManager.off('playerJoined', handlePlayerJoined);
          wsManager.off('gameStarted', handleGameStarted);
          wsManager.off('newQuestion', handleNewQuestion);
          wsManager.off('answerSubmitted', handleAnswerSubmitted);
          wsManager.off('hackStarted', handleHackStarted);
          wsManager.off('hackProgress', handleHackProgress);
          wsManager.off('hackCompleted', handleHackCompleted);
          wsManager.off('powerUpUsed', handlePowerUpUsed);
          wsManager.off('questionSkipped', handleQuestionSkipped);
          wsManager.off('gameLogUpdated', handleGameLogUpdated);
          wsManager.off('playerUpdated', handlePlayerUpdated);
          wsManager.off('gameEnded', handleGameEnded);
        };

      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to game server.",
          variant: "destructive",
        });
      }
    };

    const cleanup = connectWebSocket();

    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
      wsManager.disconnect();
    };
  }, [playerId, toast]);

  // Timer countdown
  useEffect(() => {
    if (gamePhase === 'active' && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [gamePhase, timeRemaining]);

  // Game timer countdown
  useEffect(() => {
    if (gamePhase === 'active' && gameTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setGameTimeRemaining(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [gamePhase, gameTimeRemaining]);

  const createGameMutation = useMutation({
    mutationFn: async ({ hostName, maxPlayers, gameDuration }: { hostName: string; maxPlayers: number; gameDuration: number }) => {
      const response = await apiRequest('POST', '/api/game/create', {
        hostId: playerId,
        hostName,
        maxPlayers,
        gameDuration
      });
      return response.json();
    },
    onSuccess: (data: { session: GameSession; player: Player }) => {
      setGameSession(data.session);
      setPlayerName(data.player.name);
      setPlayers([data.player]);
      setGamePhase('waiting');
      
      // Join the session via WebSocket
      wsManager.send({
        type: 'joinSession',
        sessionId: data.session.id,
        playerId
      });
    },
    onError: () => {
      toast({
        title: "Failed to create game",
        description: "Could not create a new game session.",
        variant: "destructive",
      });
    }
  });

  const joinGameMutation = useMutation({
    mutationFn: async ({ playerName, gameCode }: { playerName: string; gameCode: string }) => {
      const response = await apiRequest('POST', '/api/game/join', {
        code: gameCode,
        playerId,
        name: playerName
      });
      return response.json();
    },
    onSuccess: (data: { session: GameSession; player: Player }) => {
      setGameSession(data.session);
      setPlayerName(playerName);
      setGamePhase('waiting');
      
      // Join the session via WebSocket
      wsManager.send({
        type: 'joinSession',
        sessionId: data.session.id,
        playerId
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join game",
        description: error.message || "Could not join the game session.",
        variant: "destructive",
      });
    }
  });

  const handleHostGame = (hostName: string, maxPlayers: number, gameDuration: number) => {
    createGameMutation.mutate({ hostName, maxPlayers, gameDuration });
  };

  const handleJoinGame = (joinName: string, gameCode: string) => {
    joinGameMutation.mutate({ playerName: joinName, gameCode });
  };

  const handleStartGame = () => {
    if (gameSession) {
      wsManager.send({
        type: 'startGame',
        sessionId: gameSession.id
      });
    }
  };

  const handleToggleReady = () => {
    if (gameSession && playerId) {
      wsManager.send({
        type: 'toggleReady',
        sessionId: gameSession.id,
        playerId: playerId
      });
    }
  };

  const handleSubmitAnswer = (answer: number) => {
    if (gameSession && currentQuestion && !pendingAnswer) {
      // Check if freeze effect is active
      if (activeEffects.freeze && activeEffects.freeze > Date.now()) {
        toast({
          title: "Frozen!",
          description: "You cannot submit answers while frozen!",
          variant: "destructive",
        });
        return;
      }

      setPendingAnswer(true);
      
      // Check if slow effect is active
      const delay = (activeEffects.slow && activeEffects.slow > Date.now()) ? 2000 : 0;
      
      if (delay > 0) {
        setSlowCountdown(2);
        const countdownInterval = setInterval(() => {
          setSlowCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        toast({
          title: "Slowed Down!",
          description: "Your answer is being processed slowly due to a power-up effect...",
          variant: "destructive",
        });
      }

      setTimeout(() => {
        wsManager.send({
          type: 'submitAnswer',
          sessionId: gameSession.id,
          playerId,
          answer,
          correctAnswer: currentQuestion.answer
        });
      }, delay);
    }
  };

  const handleUsePowerUp = (powerUpType: string, targetId: string) => {
    if (gameSession) {
      wsManager.send({
        type: 'usePowerUp',
        sessionId: gameSession.id,
        playerId,
        powerUpType,
        targetId
      });
    }
  };

  const handleStartHack = (targetId: string) => {
    if (gameSession) {
      wsManager.send({
        type: 'startHack',
        sessionId: gameSession.id,
        playerId,
        targetId
      });
    }
  };

  const handleSkipQuestion = () => {
    if (gameSession && currentPlayer && currentPlayer.credits >= 5) {
      wsManager.send({
        type: 'skipQuestion',
        sessionId: gameSession.id,
        playerId
      });
    }
  };

  const handleLeaveGame = () => {
    setGamePhase('lobby');
    setGameSession(null);
    setPlayers([]);
    setCurrentQuestion(undefined);
    setIsBeingHacked(false);
    wsManager.disconnect();
  };

  const handlePlayAgain = () => {
    handleLeaveGame();
  };

  const handleBackToHome = () => {
    handleLeaveGame();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <GameHeader
        gameCode={gameSession?.code}
        playerCredits={currentPlayer?.credits || 0}
        gameTimeRemaining={gamePhase === 'active' ? gameTimeRemaining : undefined}
        onLeaveGame={handleLeaveGame}
        isGameActive={gamePhase === 'active'}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {gamePhase === 'lobby' && (
          <GameLobby
            onHostGame={handleHostGame}
            onJoinGame={handleJoinGame}
          />
        )}

        {gamePhase === 'waiting' && gameSession && (
          <GameWaitingRoom
            gameCode={gameSession.code}
            players={players}
            isHost={currentPlayer?.isHost || false}
            currentPlayerId={playerId || ''}
            onStartGame={handleStartGame}
            onToggleReady={handleToggleReady}
          />
        )}

        {gamePhase === 'active' && currentPlayer && (
          <div className={`${activeEffects.freeze && activeEffects.freeze > Date.now() ? 'animate-pulse' : ''} ${activeEffects.slow && activeEffects.slow > Date.now() ? 'transition-all duration-1000' : ''} ${activeEffects.scramble && activeEffects.scramble > Date.now() ? 'animate-bounce' : ''}`}>
            <ActiveGame
              players={players}
              currentPlayer={currentPlayer}
              currentQuestion={currentQuestion}
              timeRemaining={timeRemaining}
              isBeingHacked={isBeingHacked}
              hackerName={hackerName}
              hackProgress={hackProgress}
              onSubmitAnswer={handleSubmitAnswer}
              onUsePowerUp={handleUsePowerUp}
              onStartHack={handleStartHack}
              onSkipQuestion={handleSkipQuestion}
              showAnswerFeedback={showAnswerFeedback}
              pendingAnswer={pendingAnswer}
              hackModeActive={hackModeActive}
              hackModeData={hackModeData}
              slowCountdown={slowCountdown}
              gameLog={gameLog}
              activeEffects={activeEffects}
              globalPlayerEffects={globalPlayerEffects}
            />
            
            {/* Active Effects Indicator */}
            {Object.keys(activeEffects).filter(effect => activeEffects[effect] > Date.now()).length > 0 && (
              <div className="fixed top-20 right-4 space-y-2 z-50">
                {Object.entries(activeEffects)
                  .filter(([effect, endTime]) => endTime > Date.now())
                  .map(([effect, endTime]) => {
                    const timeLeft = Math.ceil((endTime - Date.now()) / 1000);
                    return (
                      <div key={effect} className={`px-3 py-2 rounded-lg border-2 animate-pulse ${
                        effect === 'slow' ? 'bg-orange-500/20 border-orange-500 text-orange-500' :
                        effect === 'freeze' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500' :
                        effect === 'scramble' ? 'bg-purple-500/20 border-purple-500 text-purple-500' :
                        'bg-green-500/20 border-green-500 text-green-500'
                      }`}>
                        <div className="text-sm font-semibold">
                          {effect.charAt(0).toUpperCase() + effect.slice(1)} Active
                        </div>
                        <div className="text-xs opacity-75">
                          {timeLeft}s remaining
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {gamePhase === 'results' && (
          <GameResults
            players={players}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </main>
    </div>
  );
}
