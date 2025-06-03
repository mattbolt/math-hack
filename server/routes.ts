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
  public hackModes: Map<string, {sessionId: number, hackerId: string, targetId: string, attackerProgress: number, defenderProgress: number}> = new Map();
  public powerUpEffects: Map<string, {playerId: string, effect: string, endTime: number}> = new Map();

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

    await storage.updateGameSession(sessionId, {
      questionNumber: session.questionNumber + 1
    });

    // Generate individual questions for each player
    for (const player of players) {
      const question = this.generateQuestion(player.difficultyLevel);
      
      // Send individual question to each player
      wss.clients.forEach((client: GameWebSocket) => {
        if (client.playerId === player.playerId && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'newQuestion',
            question,
            questionNumber: session.questionNumber + 1
          }));
        }
      });
    }
  }

  async handleQuestionTimeout(sessionId: number, wss: WebSocketServer) {
    // Move to next question or end game
    setTimeout(() => {
      this.startQuestion(sessionId, wss);
    }, 2000);
  }

  broadcastToSession(sessionId: number, wss: WebSocketServer, message: any) {
    wss.clients.forEach((client: GameWebSocket) => {
      if (client.sessionId === sessionId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
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

      // Note: WebSocket broadcast will happen when the player connects via WebSocket

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
  const wss = new WebSocketServer({ server: httpServer, path: '/game-ws' });

  wss.on('connection', (ws: GameWebSocket) => {
    ws.isAlive = true;
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'joinSession':
            ws.sessionId = message.sessionId;
            ws.playerId = message.playerId;
            
            // Send current game state
            const gameState = await storage.getGameSession(message.sessionId);
            const players = await storage.getPlayersBySession(message.sessionId);
            
            ws.send(JSON.stringify({
              type: 'gameState',
              session: gameState,
              players
            }));
            
            // Broadcast player joined
            gameManager.broadcastToSession(message.sessionId, wss, {
              type: 'playerJoined',
              players
            });
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
              
              if (player && session) {
                const isCorrect = message.answer === message.correctAnswer;
                
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

                  // Check hack progress for new sophisticated system
                  for (const [key, hackData] of Array.from(gameManager.hackModes.entries())) {
                    if (hackData.hackerId === ws.playerId || hackData.targetId === ws.playerId) {
                      if (hackData.hackerId === ws.playerId) {
                        hackData.attackerProgress++;
                      } else {
                        hackData.defenderProgress++;
                      }
                      
                      gameManager.broadcastToSession(ws.sessionId, wss, {
                        type: 'hackProgress',
                        attackerProgress: hackData.attackerProgress,
                        defenderProgress: hackData.defenderProgress
                      });
                      
                      if (hackData.attackerProgress >= 5) {
                        const targetPlayer = await storage.getPlayerBySessionAndPlayerId(ws.sessionId, hackData.targetId);
                        if (targetPlayer) {
                          const stolenCredits = Math.floor(targetPlayer.credits * (0.2 + Math.random() * 0.3));
                          if (hackData.hackerId === ws.playerId) {
                            updates.credits = player.credits + stolenCredits;
                          }
                          await storage.updatePlayer(targetPlayer.id, {
                            credits: Math.max(0, targetPlayer.credits - stolenCredits)
                          });
                          
                          gameManager.broadcastToSession(ws.sessionId, wss, {
                            type: 'hackCompleted',
                            hackerId: hackData.hackerId,
                            targetId: hackData.targetId,
                            success: true,
                            creditsStolen: stolenCredits
                          });
                        }
                        gameManager.hackModes.delete(key);
                      } else if (hackData.defenderProgress >= 5) {
                        gameManager.broadcastToSession(ws.sessionId, wss, {
                          type: 'hackCompleted',
                          hackerId: hackData.hackerId,
                          targetId: hackData.targetId,
                          success: false,
                          creditsStolen: 0
                        });
                        gameManager.hackModes.delete(key);
                      }
                      break;
                    }
                  }
                }

                const updatedPlayer = await storage.updatePlayer(player.id, updates);
                
                // Generate new question for this player immediately
                const newQuestion = gameManager.generateQuestion(updates.difficultyLevel || player.difficultyLevel);
                
                // Send new question to this player
                ws.send(JSON.stringify({
                  type: 'newQuestion',
                  question: newQuestion
                }));
                
                // Broadcast answer result to all players in session
                gameManager.broadcastToSession(ws.sessionId, wss, {
                  type: 'answerSubmitted',
                  playerId: ws.playerId,
                  isCorrect,
                  player: updatedPlayer
                });
              }
            }
            break;

          case 'usePowerUp':
            if (ws.sessionId && ws.playerId) {
              const player = await storage.getPlayerBySessionAndPlayerId(ws.sessionId, ws.playerId);
              const powerUpCosts = {
                slow: 50,
                freeze: 75,
                scramble: 100,
                shield: 150,
                hack: 50
              };
              
              const cost = powerUpCosts[message.powerUpType as keyof typeof powerUpCosts];
              
              if (player && player.credits >= cost) {
                if (message.powerUpType === 'hack') {
                  // Check if either player is already in a hack
                  const existingHack = Array.from(gameManager.hackModes.values()).find(hack => 
                    hack.hackerId === ws.playerId || hack.targetId === ws.playerId ||
                    hack.hackerId === message.targetId || hack.targetId === message.targetId
                  );
                  
                  if (!existingHack) {
                    // Start hack mode
                    const hackId = `${ws.playerId}-${message.targetId}-${Date.now()}`;
                    gameManager.hackModes.set(hackId, {
                      sessionId: ws.sessionId,
                      hackerId: ws.playerId,
                      targetId: message.targetId,
                      attackerProgress: 0,
                      defenderProgress: 0
                    });
                    
                    const targetPlayer = await storage.getPlayerBySessionAndPlayerId(ws.sessionId, message.targetId);
                    
                    gameManager.broadcastToSession(ws.sessionId, wss, {
                      type: 'hackStarted',
                      hackerId: ws.playerId,
                      targetId: message.targetId,
                      hackerName: player.name,
                      targetName: targetPlayer?.name
                    });
                  }
                } else if (message.powerUpType === 'shield') {
                  // Shield clears all effects and prevents new ones
                  const effectKey = `${ws.playerId}-shield`;
                  gameManager.powerUpEffects.set(effectKey, {
                    playerId: ws.playerId,
                    effect: 'shield',
                    endTime: Date.now() + 10000 // 10 seconds
                  });
                  
                  // Clear all existing effects on this player
                  const effectsToDelete: string[] = [];
                  for (const [key, effect] of Array.from(gameManager.powerUpEffects.entries())) {
                    if (effect.playerId === ws.playerId && effect.effect !== 'shield') {
                      effectsToDelete.push(key);
                    }
                  }
                  effectsToDelete.forEach(key => gameManager.powerUpEffects.delete(key));
                } else {
                  // Check if target has shield protection
                  const shieldEffect = Array.from(gameManager.powerUpEffects.values()).find(effect => 
                    effect.playerId === message.targetId && effect.effect === 'shield' && effect.endTime > Date.now()
                  );
                  
                  if (!shieldEffect) {
                    const duration = message.powerUpType === 'slow' ? 10 : 
                                   message.powerUpType === 'freeze' ? 8 : 
                                   message.powerUpType === 'scramble' ? 12 : 5;
                    
                    const effectKey = `${message.targetId}-${message.powerUpType}`;
                    gameManager.powerUpEffects.set(effectKey, {
                      playerId: message.targetId,
                      effect: message.powerUpType,
                      endTime: Date.now() + (duration * 1000)
                    });
                    
                    gameManager.broadcastToSession(ws.sessionId, wss, {
                      type: 'powerUpUsed',
                      effect: message.powerUpType,
                      targetId: message.targetId,
                      duration
                    });
                  }
                }
                
                await storage.updatePlayer(player.id, {
                  credits: player.credits - cost
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
