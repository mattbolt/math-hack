import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertGameSessionSchema, insertPlayerSchema, type Question, type GameState, type PowerUpEffect, type GameLogEntry } from "@shared/schema";
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

  async logGameEvent(sessionId: number, entry: Omit<GameLogEntry, 'id' | 'timestamp'>, wss?: WebSocketServer) {
    const session = await storage.getGameSession(sessionId);
    if (!session) return;

    const gameLog = Array.isArray(session.gameLog) ? session.gameLog : [];
    const logEntry: GameLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...entry
    };

    gameLog.push(logEntry);
    await storage.updateGameSession(sessionId, { gameLog });
    
    // Broadcast updated game log to all clients
    if (wss) {
      this.broadcastToSession(sessionId, wss, {
        type: 'gameLogUpdated',
        gameLog: gameLog.slice(-50) // Send last 50 entries to avoid overwhelming clients
      });
    }
  }

  generateGameCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  generateQuestion(difficulty: number): Question {
    let operations: string[];
    let num1: number = 0, num2: number = 0, answer: number = 0;
    
    // Define available operations based on difficulty
    switch (difficulty) {
      case 1:
        operations = ['addition'];
        break;
      case 2:
        operations = ['addition', 'subtraction'];
        break;
      case 3:
        operations = ['addition', 'subtraction'];
        break;
      case 4:
        operations = ['addition', 'subtraction', 'multiplication'];
        break;
      case 5:
        operations = ['addition', 'subtraction', 'multiplication', 'division'];
        break;
      default:
        operations = ['addition', 'subtraction', 'multiplication', 'division'];
    }
    
    const operation = operations[Math.floor(Math.random() * operations.length)] as any;
    
    switch (operation) {
      case 'addition':
        if (difficulty <= 2) {
          // Single digit both sides (1-9)
          num1 = Math.floor(Math.random() * 9) + 1;
          num2 = Math.floor(Math.random() * 9) + 1;
        } else if (difficulty === 3) {
          // Left side can be 2 digits (10-99), right single (1-9)
          num1 = Math.floor(Math.random() * 90) + 10;
          num2 = Math.floor(Math.random() * 9) + 1;
        } else if (difficulty <= 5) {
          // Left 2 digits, right single
          num1 = Math.floor(Math.random() * 90) + 10;
          num2 = Math.floor(Math.random() * 9) + 1;
        } else if (difficulty <= 7) {
          // Both can be double digit (10-99)
          num1 = Math.floor(Math.random() * 90) + 10;
          num2 = Math.floor(Math.random() * 90) + 10;
        } else if (difficulty === 8) {
          // Double digit both sides
          num1 = Math.floor(Math.random() * 90) + 10;
          num2 = Math.floor(Math.random() * 90) + 10;
        } else {
          // Triple digit left (100-999), double right
          num1 = Math.floor(Math.random() * 900) + 100;
          num2 = Math.floor(Math.random() * 90) + 10;
        }
        answer = num1 + num2;
        break;
        
      case 'subtraction':
        if (difficulty <= 2) {
          // Single digit both sides
          num1 = Math.floor(Math.random() * 9) + 1;
          num2 = Math.floor(Math.random() * num1) + 1;
        } else if (difficulty === 3) {
          // Left 2 digits, right single
          num1 = Math.floor(Math.random() * 90) + 10;
          num2 = Math.floor(Math.random() * 9) + 1;
        } else if (difficulty <= 5) {
          // Left 2 digits, right single
          num1 = Math.floor(Math.random() * 90) + 10;
          num2 = Math.floor(Math.random() * 9) + 1;
        } else if (difficulty <= 7) {
          // Both double digit
          num1 = Math.floor(Math.random() * 90) + 10;
          num2 = Math.floor(Math.random() * Math.min(num1 - 10, 90)) + 10;
        } else if (difficulty === 8) {
          // Double digit both sides
          num1 = Math.floor(Math.random() * 90) + 10;
          num2 = Math.floor(Math.random() * Math.min(num1 - 10, 90)) + 10;
        } else {
          // Triple digit left, double right
          num1 = Math.floor(Math.random() * 900) + 100;
          num2 = Math.floor(Math.random() * 90) + 10;
        }
        answer = num1 - num2;
        break;
        
      case 'multiplication':
        if (difficulty <= 6) {
          // Single digit both sides
          num1 = Math.floor(Math.random() * 9) + 1;
          num2 = Math.floor(Math.random() * 9) + 1;
        } else if (difficulty === 7) {
          // Left double digit, right single
          num1 = Math.floor(Math.random() * 90) + 10;
          num2 = Math.floor(Math.random() * 9) + 1;
        } else {
          // Both double digit
          num1 = Math.floor(Math.random() * 90) + 10;
          num2 = Math.floor(Math.random() * 90) + 10;
        }
        answer = num1 * num2;
        break;
        
      case 'division':
        if (difficulty <= 7) {
          // Right side single digit
          num2 = Math.floor(Math.random() * 9) + 1;
          answer = Math.floor(Math.random() * 20) + 1;
        } else {
          // Right side double digit
          num2 = Math.floor(Math.random() * 90) + 10;
          answer = Math.floor(Math.random() * 50) + 1;
        }
        num1 = answer * num2;
        break;
    }

    const timeLimit = Math.max(15, 35 - difficulty * 2);

    // Generate 3 incorrect options
    const options = new Set<number>();
    options.add(answer); // Add correct answer
    
    while (options.size < 4) {
      let wrongAnswer;
      if (operation === 'division') {
        // For division, generate reasonable whole number wrong answers
        wrongAnswer = Math.max(1, Math.floor(answer + Math.random() * 10 - 5));
      } else {
        // For other operations, generate whole number wrong answers within a reasonable range
        const range = Math.max(5, Math.floor(Math.abs(answer * 0.5)));
        wrongAnswer = Math.max(0, Math.floor(answer + Math.random() * range * 2 - range));
      }
      
      if (wrongAnswer !== answer && Number.isInteger(wrongAnswer)) {
        options.add(wrongAnswer);
      }
    }
    
    // Convert to array and shuffle
    const shuffledOptions = Array.from(options).sort(() => Math.random() - 0.5);

    return {
      id: Math.random().toString(36).substr(2, 9),
      text: `${num1} ${this.getOperationSymbol(operation)} ${num2} = ?`,
      answer,
      options: shuffledOptions,
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
    let newDifficulty = player.difficultyLevel;

    // Increase difficulty if player gets 5 consecutive correct answers at current level
    if (player.consecutiveCorrect >= 5) {
      newDifficulty = Math.min(9, player.difficultyLevel + 1);
    }
    // Decrease difficulty if player gets 3 consecutive wrong answers or skips
    else if (player.consecutiveWrong >= 3) {
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

  async endGame(sessionId: number, wss: WebSocketServer) {
    // Update session status to finished
    await storage.updateGameSession(sessionId, { status: 'finished' });
    
    // Get final player rankings
    const players = await storage.getPlayersBySession(sessionId);
    const sortedPlayers = players.sort((a, b) => b.credits - a.credits);
    
    // Clear timers
    const sessionTimer = this.sessionTimers.get(sessionId);
    if (sessionTimer) {
      clearTimeout(sessionTimer);
      this.sessionTimers.delete(sessionId);
    }
    
    const questionTimer = this.questionTimers.get(sessionId);
    if (questionTimer) {
      clearTimeout(questionTimer);
      this.questionTimers.delete(sessionId);
    }
    
    // Broadcast game end
    this.broadcastToSession(sessionId, wss, {
      type: 'gameEnded',
      players: sortedPlayers,
      reason: 'timeUp'
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const gameManager = new GameManager();
  
  // Create game session
  app.post("/api/game/create", async (req, res) => {
    try {
      const { hostId, maxPlayers = 4, hostName, gameDuration = 15 } = req.body;
      
      if (!hostId || !hostName) {
        return res.status(400).json({ message: "Host ID and name are required" });
      }

      const code = gameManager.generateGameCode();
      const session = await storage.createGameSession({
        code,
        hostId,
        maxPlayers,
        gameDuration
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
              const session = await storage.updateGameSession(ws.sessionId, { 
                status: 'active',
                gameStartTime: new Date()
              });
              gameManager.broadcastToSession(ws.sessionId, wss, {
                type: 'gameStarted',
                session
              });
              
              // Start first question
              setTimeout(() => {
                gameManager.startQuestion(ws.sessionId!, wss);
              }, 1000);
              
              // Set overall game timer
              const gameTimer = setTimeout(async () => {
                await gameManager.endGame(ws.sessionId!, wss);
              }, (session?.gameDuration || 15) * 60 * 1000);
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
                  consecutiveCorrect: isCorrect ? player.consecutiveCorrect + 1 : 0,
                  consecutiveWrong: isCorrect ? 0 : player.consecutiveWrong + 1,
                  overallConsecutiveCorrect: isCorrect ? player.overallConsecutiveCorrect + 1 : 0
                };

                if (isCorrect) {
                  const creditReward = 10 + (player.difficultyLevel * 5);
                  updates.credits = player.credits + creditReward;
                  
                  // Log credit reward
                  await gameManager.logGameEvent(ws.sessionId, {
                    type: 'credit_change',
                    playerId: ws.playerId,
                    playerName: player.name,
                    details: `${player.name} earned ${creditReward} credits for correct answer`,
                    creditChange: creditReward
                  }, wss);
                  
                  // Adjust difficulty and reset current level consecutive count if difficulty changes
                  const newDifficulty = gameManager.adjustDifficulty({
                    ...player,
                    consecutiveCorrect: updates.consecutiveCorrect,
                    consecutiveWrong: updates.consecutiveWrong
                  });
                  
                  updates.difficultyLevel = newDifficulty;
                  
                  // Reset current level consecutive count if difficulty increased
                  if (newDifficulty > player.difficultyLevel) {
                    updates.consecutiveCorrect = 0;
                  }

                  // Check hack progress only for correct answers
                  for (const [key, hackData] of Array.from(gameManager.hackModes.entries())) {
                    if (hackData.sessionId === ws.sessionId && (hackData.hackerId === ws.playerId || hackData.targetId === ws.playerId)) {
                      
                      if (hackData.hackerId === ws.playerId) {
                        hackData.attackerProgress++;
                      } else {
                        hackData.defenderProgress++;
                      }
                      
                      gameManager.broadcastToSession(ws.sessionId, wss, {
                        type: 'hackProgress',
                        hackerId: hackData.hackerId,
                        targetId: hackData.targetId,
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
                          const updatedTargetPlayer = await storage.updatePlayer(targetPlayer.id, {
                            credits: Math.max(0, targetPlayer.credits - stolenCredits)
                          });
                          
                          // Log successful hack
                          await gameManager.logGameEvent(ws.sessionId, {
                            type: 'hack_complete',
                            playerId: hackData.hackerId,
                            playerName: player.name,
                            targetId: hackData.targetId,
                            targetName: targetPlayer?.name,
                            details: `${player.name} successfully hacked ${targetPlayer?.name} for ${stolenCredits} credits`,
                            creditChange: stolenCredits
                          }, wss);
                          
                          gameManager.broadcastToSession(ws.sessionId, wss, {
                            type: 'hackCompleted',
                            hackerId: hackData.hackerId,
                            targetId: hackData.targetId,
                            success: true,
                            creditsStolen: stolenCredits
                          });
                          
                          // Broadcast updated target player credits
                          gameManager.broadcastToSession(ws.sessionId, wss, {
                            type: 'playerUpdated',
                            player: updatedTargetPlayer
                          });
                        }
                        gameManager.hackModes.delete(key);
                      } else if (hackData.defenderProgress >= 5) {
                        const targetPlayer = await storage.getPlayerBySessionAndPlayerId(ws.sessionId, hackData.targetId);
                        const hackerPlayer = await storage.getPlayerBySessionAndPlayerId(ws.sessionId, hackData.hackerId);
                        
                        // Log failed hack
                        await gameManager.logGameEvent(ws.sessionId, {
                          type: 'hack_complete',
                          playerId: hackData.targetId,
                          playerName: targetPlayer?.name,
                          targetId: hackData.hackerId,
                          targetName: hackerPlayer?.name,
                          details: `${targetPlayer?.name} successfully defended against ${hackerPlayer?.name}'s hack`,
                          creditChange: 0
                        }, wss);
                        
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
                } else {
                  // Handle incorrect answers - also adjust difficulty
                  const newDifficulty = gameManager.adjustDifficulty({
                    ...player,
                    consecutiveCorrect: updates.consecutiveCorrect,
                    consecutiveWrong: updates.consecutiveWrong
                  });
                  
                  updates.difficultyLevel = newDifficulty;
                  
                  // Reset consecutive counts if difficulty decreased
                  if (newDifficulty < player.difficultyLevel) {
                    updates.consecutiveWrong = 0;
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
                freeze: 100,
                scramble: 100,
                shield: 150,
                hack: 250
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
                    
                    console.log('Hack mode started:', {
                      hackId,
                      hackerId: ws.playerId,
                      targetId: message.targetId,
                      sessionId: ws.sessionId
                    });

                    // Log hack attempt
                    await gameManager.logGameEvent(ws.sessionId, {
                      type: 'hack_start',
                      playerId: ws.playerId,
                      playerName: player.name,
                      targetId: message.targetId,
                      targetName: targetPlayer?.name,
                      details: `${player.name} started hacking ${targetPlayer?.name}`,
                      creditChange: -cost
                    }, wss);

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

                  // Log shield usage
                  await gameManager.logGameEvent(ws.sessionId, {
                    type: 'powerup',
                    playerId: ws.playerId,
                    playerName: player.name,
                    details: `${player.name} used Shield (self-protection)`,
                    creditChange: -cost
                  }, wss);
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
                    
                    // Log power-up usage
                    const targetPlayer = await storage.getPlayerBySessionAndPlayerId(ws.sessionId, message.targetId);
                    await gameManager.logGameEvent(ws.sessionId, {
                      type: 'powerup',
                      playerId: ws.playerId,
                      playerName: player.name,
                      targetId: message.targetId,
                      targetName: targetPlayer?.name,
                      details: `${player.name} used ${message.powerUpType.charAt(0).toUpperCase() + message.powerUpType.slice(1)} on ${targetPlayer?.name}`,
                      creditChange: -cost
                    }, wss);

                    gameManager.broadcastToSession(ws.sessionId, wss, {
                      type: 'powerUpUsed',
                      effect: message.powerUpType,
                      targetId: message.targetId,
                      duration
                    });
                  }
                }
                
                const updatedPlayer = await storage.updatePlayer(player.id, {
                  credits: player.credits - cost,
                  hackAttempts: (player.hackAttempts || 0) + 1
                });
                
                // Broadcast updated player data to all clients
                gameManager.broadcastToSession(ws.sessionId, wss, {
                  type: 'playerUpdated',
                  player: updatedPlayer
                });
              }
            }
            break;

          case 'skipQuestion':
            if (ws.sessionId && ws.playerId) {
              const player = await storage.getPlayerBySessionAndPlayerId(ws.sessionId, ws.playerId);
              
              if (player && player.credits >= 5) {
                // Deduct credits and treat as wrong answer for difficulty scaling
                const updates: any = {
                  credits: player.credits - 5,
                  consecutiveCorrect: 0,
                  consecutiveWrong: player.consecutiveWrong + 1,
                  overallConsecutiveCorrect: 0,
                  questionsSkipped: (player.questionsSkipped || 0) + 1
                };

                const newDifficulty = gameManager.adjustDifficulty({
                  ...player,
                  consecutiveWrong: updates.consecutiveWrong,
                  consecutiveCorrect: 0
                });
                
                updates.difficultyLevel = newDifficulty;
                
                // Reset consecutive counts if difficulty decreased
                if (newDifficulty < player.difficultyLevel) {
                  updates.consecutiveWrong = 0;
                }

                // Log credit deduction for skip
                await gameManager.logGameEvent(ws.sessionId, {
                  type: 'credit_change',
                  playerId: ws.playerId,
                  playerName: player.name,
                  details: `${player.name} skipped question (-5 credits)`,
                  creditChange: -5
                }, wss);

                const updatedPlayer = await storage.updatePlayer(player.id, updates);
                
                // Generate new question for this player immediately
                const newQuestion = gameManager.generateQuestion(updates.difficultyLevel || player.difficultyLevel);
                
                // Send new question to this player
                ws.send(JSON.stringify({
                  type: 'newQuestion',
                  question: newQuestion
                }));
                
                // Broadcast skip result to all players in session
                gameManager.broadcastToSession(ws.sessionId, wss, {
                  type: 'questionSkipped',
                  playerId: ws.playerId,
                  player: updatedPlayer
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
