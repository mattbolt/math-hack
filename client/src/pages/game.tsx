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
  
  const { toast } = useToast();

  const currentPlayer = players.find(p => p.playerId === playerId);

  // WebSocket setup
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await wsManager.connect();
        
        wsManager.on('gameState', (message: any) => {
          if (message.session) setGameSession(message.session);
          if (message.players) setPlayers(message.players);
        });

        wsManager.on('playerJoined', (message: any) => {
          if (message.players) setPlayers(message.players);
        });

        wsManager.on('playerUpdate', (message: any) => {
          if (message.players) setPlayers(message.players);
        });

        wsManager.on('gameStarted', (message: any) => {
          setGamePhase('active');
          if (message.session) setGameSession(message.session);
        });

        wsManager.on('newQuestion', (message: any) => {
          setCurrentQuestion(message.question);
          setTimeRemaining(message.question.timeLimit);
        });

        wsManager.on('answerSubmitted', (message: any) => {
          const updatedPlayers = players.map(p => 
            p.playerId === message.playerId ? message.player : p
          );
          setPlayers(updatedPlayers);
        });

        wsManager.on('hackStarted', (message: any) => {
          if (message.targetId === playerId) {
            setIsBeingHacked(true);
            const hacker = players.find(p => p.playerId === message.hackerId);
            setHackerName(hacker?.name || "Unknown");
            setHackProgress(0);
          }
        });

        wsManager.on('hackCompleted', (message: any) => {
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
        });

        wsManager.on('powerUpUsed', (message: any) => {
          if (message.targetId === playerId) {
            toast({
              title: "Power-up Used Against You!",
              description: `You've been affected by a ${message.effect} power-up!`,
              variant: "destructive",
            });
          }
        });

      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to game server.",
          variant: "destructive",
        });
      }
    };

    connectWebSocket();

    return () => {
      wsManager.disconnect();
    };
  }, [playerId, players, toast]);

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
      
      // Ensure WebSocket is connected before joining session
      setTimeout(() => {
        wsManager.send({
          type: 'joinSession',
          sessionId: data.session.id,
          playerId
        });
      }, 500);
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
      
      // Ensure WebSocket is connected before joining session
      setTimeout(() => {
        wsManager.send({
          type: 'joinSession',
          sessionId: data.session.id,
          playerId
        });
      }, 500);
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
    if (gameSession) {
      wsManager.send({
        type: 'submitAnswer',
        sessionId: gameSession.id,
        playerId,
        answer
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
