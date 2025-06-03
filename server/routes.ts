import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertGameSessionSchema, insertPlayerSchema, type Question, type GameState, type PowerUpEffect } from "@shared/schema";
import { z } from "zod";

interface GameWebSocket extends WebSocket {
  playerId?: string;
  sessionId?: number;
  isAlive?: boolean;
}

class GameManager {
  private sessionTimers: Map<number, NodeJS.Timeout> = new Map();
  private questionTimers: Map<number, NodeJS.Timeout> = new Map();

  generateGameCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  generateQuestion(difficulty: number): Question {
    const operations = ['addition', 'subtraction', 'multiplication', 'division'] as const;
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let num1: number, num2: number, answer: number;
    
    const range = Math.min(difficulty * 20, 500);
    const baseRange = Math.max(10, difficulty * 5);
    
    switch (operation) {
      case 'addition':
        num1 = Math.floor(Math.random() * range) + baseRange;
        num2 = Math.floor(Math.random() * range) + baseRange;
        answer = num1 + num2;
        break;
      case 'subtraction':
        num1 = Math.floor(Math.random() * range) + baseRange + 50;
        num2 = Math.floor(Math.random() * (num1 - baseRange)) + baseRange;
        answer = num1 - num2;
        break;
      case 'multiplication':
        num1 = Math.floor(Math.random() * Math.min(difficulty * 10, 50)) + 2;
        num2 = Math.floor(Math.random() * Math.min(difficulty * 10, 50)) + 2;
        answer = num1 * num2;
        break;
      case 'division':
        answer = Math.floor(Math.random() * Math.min(difficulty * 20, 100)) + 1;
        num2 = Math.floor(Math.random() * Math.min(difficulty * 5, 20)) + 2;
        num1 = answer * num2;
        break;
    }

    const timeLimit = Math.max(10, 30 - difficulty * 2);

    return {
      id: Math.random().toString(36).substr(2, 9),
      text: `${num1} ${this.getOperationSymbol(operation)} ${num2} = ?`,
      answer,
      operation,
      difficulty,
      timeLimit
    };
  }

  private getOperationSymbol(operation: string): string {
    switch (operation) {
      case 'addition': return '+';
      case 'subtraction': return '-';
      case 'multiplication': return '×';
      case 'division': return '÷';
      default: return '+';
    }
  }

  adjustDifficulty(player: any): number {
    const totalAnswers = player.correctAnswers + player.wrongAnswers;
    if (totalAnswers === 0) return 1;

    const accuracy = player.correctAnswers / totalAnswers;
    let newDifficulty = player.difficultyLevel;

    // Increase difficulty if accuracy is high and consecutive correct answers
    if (accuracy > 0.8 && player.consecutiveCorrect >= 3) {
      newDifficulty = Math.min(10, player.difficultyLevel + 1);
    }
    // Decrease difficulty if accuracy is low
    else if (accuracy < 0.5 && player.consecutiveCorrect === 0) {
      newDifficulty = Math.max(1, player.difficultyLevel - 1);
    }

    return newDifficulty;
  }

  async startQuestion(sessionId: number, wss: WebSocketServer) {
    const session = await storage.getGameSession(sessionId);
    const players = await storage.getPlayersBySession(sessionId);
    
    if (!session || players.length === 0) return;

    // Generate question based on average difficulty
    const avgDifficulty = Math.round(
      players.reduce((sum, p) => sum + p.difficultyLevel, 0) / players.length
    );
    
    const question = this.generateQuestion(avgDifficulty);
    
    await storage.updateGameSession(sessionId, {
      currentQuestion: question,
      questionStartTime: new Date(),
      questionNumber: session.questionNumber + 1
    });

    this.broadcastToSession(sessionId, wss, {
      type: 'newQuestion',
      question,
      questionNumber: session.questionNumber + 1
    });

    // Set timer for question timeout
    if (this.questionTimers.has(sessionId)) {
      clearTimeout(this.questionTimers.get(sessionId)!);
    }

    const timer = setTimeout(() => {
      this.handleQuestionTimeout(sessionId, wss);
    }, question.timeLimit * 1000);

    this.questionTimers.set(sessionId, timer);
  }

  async handleQuestionTimeout(sessionId: number, wss: WebSocketServer) {
    // Move to next question or end game
    setTimeout(() => {
      this.startQuestion(sessionId, wss);
    }, 2000);
  }

  broadcastToSession(sessionId: number, wss: WebSocketServer, message: any) {
    console.log(`Broadcasting to session ${sessionId}:`, message.type);
    let clientCount = 0;
    wss.clients.forEach((client: GameWebSocket) => {
      if (client.sessionId === sessionId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
        clientCount++;
      }
    });
    console.log(`Sent to ${clientCount} clients in session ${sessionId}`);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const gameManager = new GameManager();
  
  // Create game session
  app.post("/api/game/create", async (req, res) => {
    try {
      const { hostId, maxPlayers = 4, hostName } = req.body;
      
      if (!hostId || !hostName) {
        return res.status(400).json({ message: "Host ID and name are required" });
      }

      const code = gameManager.generateGameCode();
      const session = await storage.createGameSession({
        code,
        hostId,
        maxPlayers
      });

      // Create the host player
      const hostPlayer = await storage.createPlayer({
        sessionId: session.id,
        playerId: hostId,
        name: hostName,
        isHost: true
      });

      res.json({ session, player: hostPlayer });
    } catch (error) {
      res.status(500).json({ message: "Failed to create game session" });
    }
  });

  // Join game session
  app.post("/api/game/join", async (req, res) => {
    try {
      const { code, playerId, name } = req.body;
      
      if (!code || !playerId || !name) {
        return res.status(400).json({ message: "Code, player ID, and name are required" });
      }

      const session = await storage.getGameSessionByCode(code.toUpperCase());
      if (!session) {
        return res.status(404).json({ message: "Game session not found" });
      }

      if (session.status !== "waiting") {
        return res.status(400).json({ message: "Game has already started" });
      }

      const existingPlayers = await storage.getPlayersBySession(session.id);
      if (existingPlayers.length >= session.maxPlayers) {
        return res.status(400).json({ message: "Game session is full" });
      }

      const existingPlayer = await storage.getPlayerBySessionAndPlayerId(session.id, playerId);
      if (existingPlayer) {
        return res.status(400).json({ message: "Player already in session" });
      }

      const player = await storage.createPlayer({
        sessionId: session.id,
        playerId,
        name,
        isHost: false
      });

      res.json({ session, player });
    } catch (error) {
      res.status(500).json({ message: "Failed to join game session" });
    }
  });

  // Get game state
  app.get("/api/game/:sessionId/state", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const session = await storage.getGameSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Game session not found" });
      }

      const players = await storage.getPlayersBySession(sessionId);
      
      const gameState: GameState = {
        session,
        players,
        currentQuestion: session.currentQuestion as Question | undefined
      };

      res.json(gameState);
    } catch (error) {
      res.status(500).json({ message: "Failed to get game state" });
    }
  });

  // Get power-ups
  app.get("/api/powerups", async (req, res) => {
    try {
      const powerUps = await storage.getAllPowerUps();
      res.json(powerUps);
    } catch (error) {
      res.status(500).json({ message: "Failed to get power-ups" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: GameWebSocket) => {
    console.log('New WebSocket connection established');
    ws.isAlive = true;
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'joinSession':
            console.log(`Player ${message.playerId} joining session ${message.sessionId}`);
            ws.sessionId = message.sessionId;
            ws.playerId = message.playerId;
            
            // Send current game state to the joining player
            const gameState = await storage.getGameSession(message.sessionId);
            const players = await storage.getPlayersBySession(message.sessionId);
            
            console.log(`Session ${message.sessionId} has ${players.length} players:`, players.map(p => p.name));
            
            ws.send(JSON.stringify({
              type: 'gameState',
              session: gameState,
              players
            }));
            
            // Broadcast updated player list to ALL players in the session
            setTimeout(async () => {
              const updatedPlayers = await storage.getPlayersBySession(message.sessionId);
              console.log(`Broadcasting player update for session ${message.sessionId} with ${updatedPlayers.length} players`);
              gameManager.broadcastToSession(message.sessionId, wss, {
                type: 'playerUpdate',
                players: updatedPlayers
              });
            }, 100);
            break;

          case 'startGame':
            if (ws.sessionId) {
              const session = await storage.updateGameSession(ws.sessionId, { status: 'active' });
              gameManager.broadcastToSession(ws.sessionId, wss, {
                type: 'gameStarted',
                session
              });
              
              // Start first question
              setTimeout(() => {
                gameManager.startQuestion(ws.sessionId!, wss);
              }, 1000);
            }
            break;

          case 'submitAnswer':
            if (ws.sessionId && ws.playerId) {
              const player = await storage.getPlayerBySessionAndPlayerId(ws.sessionId, ws.playerId);
              const session = await storage.getGameSession(ws.sessionId);
              
              if (player && session && session.currentQuestion) {
                const question = session.currentQuestion as Question;
                const isCorrect = message.answer === question.answer;
                
                let updates: any = {
                  [isCorrect ? 'correctAnswers' : 'wrongAnswers']: isCorrect ? player.correctAnswers + 1 : player.wrongAnswers + 1,
                  consecutiveCorrect: isCorrect ? player.consecutiveCorrect + 1 : 0
                };

                if (isCorrect) {
                  const creditReward = 10 + (player.difficultyLevel * 5);
                  updates.credits = player.credits + creditReward;
                  updates.score = player.score + (creditReward * player.difficultyLevel);
                  
                  // Adjust difficulty
                  updates.difficultyLevel = gameManager.adjustDifficulty({
                    ...player,
                    correctAnswers: player.correctAnswers + 1
                  });

                  // Check hack progress
                  const activeHacks = await storage.getActiveHacksByTarget(ws.sessionId, ws.playerId);
                  for (const hack of activeHacks) {
                    if (hack.hackerId !== ws.playerId) {
                      const hackProgress = hack.questionsCompleted + 1;
                      await storage.updateHackAttempt(hack.id, {
                        questionsCompleted: hackProgress
                      });

                      if (hackProgress >= hack.questionsRequired) {
                        // Hack successful - steal credits
                        const hacker = await storage.getPlayerBySessionAndPlayerId(ws.sessionId, hack.hackerId);
                        if (hacker) {
                          const stolenCredits = Math.floor(player.credits * (0.1 + Math.random() * 0.3));
                          await storage.updatePlayer(hacker.id, {
                            credits: hacker.credits + stolenCredits
                          });
                          updates.credits = Math.max(0, updates.credits - stolenCredits);
                          
                          // End hack
                          await storage.updateHackAttempt(hack.id, {
                            isActive: false,
                            completedAt: new Date()
                          });
                          
                          updates.isBeingHacked = false;
                          updates.hackedBy = null;
                          updates.hackProgress = 0;

                          gameManager.broadcastToSession(ws.sessionId, wss, {
                            type: 'hackCompleted',
                            hackerId: hack.hackerId,
                            targetId: ws.playerId,
                            stolenCredits
                          });
                        }
                      }
                    }
                  }
                }

                await storage.updatePlayer(player.id, updates);
                
                // Broadcast answer result
                gameManager.broadcastToSession(ws.sessionId, wss, {
                  type: 'answerSubmitted',
                  playerId: ws.playerId,
                  isCorrect,
                  player: { ...player, ...updates }
                });
              }
            }
            break;

          case 'usePowerUp':
            if (ws.sessionId && ws.playerId) {
              const player = await storage.getPlayerBySessionAndPlayerId(ws.sessionId, ws.playerId);
              const powerUp = await storage.getAllPowerUps().then(powerUps => 
                powerUps.find(p => p.effect === message.powerUpType)
              );
              
              if (player && powerUp && player.credits >= powerUp.cost) {
                await storage.updatePlayer(player.id, {
                  credits: player.credits - powerUp.cost
                });

                // Apply power-up effect
                gameManager.broadcastToSession(ws.sessionId, wss, {
                  type: 'powerUpUsed',
                  userId: ws.playerId,
                  targetId: message.targetId,
                  effect: message.powerUpType,
                  duration: powerUp.duration
                });
              }
            }
            break;

          case 'startHack':
            if (ws.sessionId && ws.playerId) {
              const player = await storage.getPlayerBySessionAndPlayerId(ws.sessionId, ws.playerId);
              const hackCost = 50;
              
              if (player && player.credits >= hackCost) {
                await storage.updatePlayer(player.id, {
                  credits: player.credits - hackCost
                });

                const hack = await storage.createHackAttempt({
                  sessionId: ws.sessionId,
                  hackerId: ws.playerId,
                  targetId: message.targetId
                });

                // Mark target as being hacked
                const target = await storage.getPlayerBySessionAndPlayerId(ws.sessionId, message.targetId);
                if (target) {
                  await storage.updatePlayer(target.id, {
                    isBeingHacked: true,
                    hackedBy: ws.playerId,
                    hackProgress: 0
                  });
                }

                gameManager.broadcastToSession(ws.sessionId, wss, {
                  type: 'hackStarted',
                  hackerId: ws.playerId,
                  targetId: message.targetId
                });
              }
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Handle player disconnection
    });
  });

  // Heartbeat
  const interval = setInterval(() => {
    wss.clients.forEach((ws: GameWebSocket) => {
      if (ws.isAlive === false) return ws.terminate();
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return httpServer;
}
