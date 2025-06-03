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
import { type GameSession, type Player, type Question } from "@shared/schema";
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
  const [activeEffects, setActiveEffects] = useState<string[]>([]);
  
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
          if (message.session) setGameSession(message.session);
        };

        const handleNewQuestion = (message: any) => {
          setCurrentQuestion(message.question);
          setTimeRemaining(message.question.timeLimit);
        };

        const handleAnswerSubmitted = (message: any) => {
          setPlayers(prevPlayers => 
            prevPlayers.map(p => 
              p.playerId === message.playerId ? message.player : p
            )
          );
        };

        const handleHackStarted = (message: any) => {
          if (message.targetId === playerId) {
            setIsBeingHacked(true);
            setPlayers(prevPlayers => {
              const hacker = prevPlayers.find(p => p.playerId === message.hackerId);
              setHackerName(hacker?.name || "Unknown");
              return prevPlayers;
            });
            setHackProgress(0);
          }
        };

        const handleHackCompleted = (message: any) => {
          if (message.targetId === playerId) {
            setIsBeingHacked(false);
            setHackerName("");
            setHackProgress(0);
            toast({
              title: "Hack Successful!",
              description: `${message.stolenCredits} credits were stolen from you!`,
              variant: "destructive",
            });
          }
        };

        const handlePowerUpUsed = (message: any) => {
          if (message.targetId === playerId) {
            // Add visual effect
            setActiveEffects(prev => [...prev, message.effect]);
            
            // Remove effect after duration
            setTimeout(() => {
              setActiveEffects(prev => prev.filter(effect => effect !== message.effect));
            }, (message.duration || 5) * 1000);

            toast({
              title: `${message.effect.charAt(0).toUpperCase() + message.effect.slice(1)} Effect Applied!`,
              description: `You've been affected for ${message.duration || 5} seconds!`,
              variant: "destructive",
            });
          } else {
            // Show who used the power-up
            const targetPlayer = players.find(p => p.playerId === message.targetId);
            toast({
              title: "Power-up Used!",
              description: `${message.effect.charAt(0).toUpperCase() + message.effect.slice(1)} used on ${targetPlayer?.name || 'Unknown'}!`,
            });
          }
        };

        wsManager.on('gameState', handleGameState);
        wsManager.on('playerJoined', handlePlayerJoined);
        wsManager.on('gameStarted', handleGameStarted);
        wsManager.on('newQuestion', handleNewQuestion);
        wsManager.on('answerSubmitted', handleAnswerSubmitted);
        wsManager.on('hackStarted', handleHackStarted);
        wsManager.on('hackCompleted', handleHackCompleted);
        wsManager.on('powerUpUsed', handlePowerUpUsed);

        return () => {
          wsManager.off('gameState', handleGameState);
          wsManager.off('playerJoined', handlePlayerJoined);
          wsManager.off('gameStarted', handleGameStarted);
          wsManager.off('newQuestion', handleNewQuestion);
          wsManager.off('answerSubmitted', handleAnswerSubmitted);
          wsManager.off('hackStarted', handleHackStarted);
          wsManager.off('hackCompleted', handleHackCompleted);
          wsManager.off('powerUpUsed', handlePowerUpUsed);
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

  const createGameMutation = useMutation({
    mutationFn: async ({ hostName, maxPlayers }: { hostName: string; maxPlayers: number }) => {
      const response = await apiRequest('POST', '/api/game/create', {
        hostId: playerId,
        hostName,
        maxPlayers
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

  const handleHostGame = (hostName: string, maxPlayers: number) => {
    createGameMutation.mutate({ hostName, maxPlayers });
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

  const handleSubmitAnswer = (answer: number) => {
    if (gameSession && currentQuestion) {
      wsManager.send({
        type: 'submitAnswer',
        sessionId: gameSession.id,
        playerId,
        answer,
        correctAnswer: currentQuestion.answer
      });
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
    // Implement skip logic (deduct credits)
    if (currentPlayer && currentPlayer.credits >= 5) {
      // This would be handled by the server
      toast({
        title: "Question Skipped",
        description: "5 credits deducted for skipping.",
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
        onLeaveGame={handleLeaveGame}
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
            onStartGame={handleStartGame}
          />
        )}

        {gamePhase === 'active' && currentPlayer && (
          <div className={`${activeEffects.includes('freeze') ? 'animate-pulse' : ''} ${activeEffects.includes('slow') ? 'transition-all duration-1000' : ''} ${activeEffects.includes('scramble') ? 'animate-bounce' : ''}`}>
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
            />
            
            {/* Active Effects Indicator */}
            {activeEffects.length > 0 && (
              <div className="fixed top-20 right-4 space-y-2 z-50">
                {activeEffects.map((effect, index) => (
                  <div key={index} className={`px-3 py-2 rounded-lg border-2 animate-pulse ${
                    effect === 'slow' ? 'bg-orange-500/20 border-orange-500 text-orange-500' :
                    effect === 'freeze' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500' :
                    effect === 'scramble' ? 'bg-purple-500/20 border-purple-500 text-purple-500' :
                    'bg-green-500/20 border-green-500 text-green-500'
                  }`}>
                    <div className="text-sm font-semibold">
                      {effect.charAt(0).toUpperCase() + effect.slice(1)} Active
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {gamePhase === 'results' && (
          <GameResults
            players={players}
            onPlayAgain={handlePlayAgain}
            onBackToHome={handleBackToHome}
          />
        )}
      </main>
    </div>
  );
}
