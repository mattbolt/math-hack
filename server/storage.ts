import { 
  users, 
  gameSessions, 
  players, 
  powerUps, 
  hackAttempts,
  type User, 
  type InsertUser,
  type GameSession,
  type InsertGameSession,
  type Player,
  type InsertPlayer,
  type PowerUp,
  type InsertPowerUp,
  type HackAttempt,
  type InsertHackAttempt,
  type Question
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Game session methods
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  getGameSession(id: number): Promise<GameSession | undefined>;
  getGameSessionByCode(code: string): Promise<GameSession | undefined>;
  updateGameSession(id: number, updates: Partial<GameSession>): Promise<GameSession | undefined>;
  deleteGameSession(id: number): Promise<boolean>;

  // Player methods
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayer(id: number): Promise<Player | undefined>;
  getPlayerBySessionAndPlayerId(sessionId: number, playerId: string): Promise<Player | undefined>;
  getPlayersBySession(sessionId: number): Promise<Player[]>;
  updatePlayer(id: number, updates: Partial<Player>): Promise<Player | undefined>;
  deletePlayer(id: number): Promise<boolean>;

  // Power-up methods
  createPowerUp(powerUp: InsertPowerUp): Promise<PowerUp>;
  getAllPowerUps(): Promise<PowerUp[]>;

  // Hack attempt methods
  createHackAttempt(hack: InsertHackAttempt): Promise<HackAttempt>;
  getActiveHackAttempt(sessionId: number, hackerId: string, targetId: string): Promise<HackAttempt | undefined>;
  updateHackAttempt(id: number, updates: Partial<HackAttempt>): Promise<HackAttempt | undefined>;
  getActiveHacksByTarget(sessionId: number, targetId: string): Promise<HackAttempt[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private gameSessions: Map<number, GameSession> = new Map();
  private players: Map<number, Player> = new Map();
  private powerUps: Map<number, PowerUp> = new Map();
  private hackAttempts: Map<number, HackAttempt> = new Map();
  private currentId = 1;

  constructor() {
    // Initialize default power-ups
    this.initializePowerUps();
  }

  private initializePowerUps() {
    const defaultPowerUps = [
      { name: "Slow Down", cost: 50, duration: 10, effect: "slow" },
      { name: "Freeze", cost: 75, duration: 5, effect: "freeze" },
      { name: "Scramble", cost: 100, duration: 8, effect: "scramble" },
      { name: "Shield", cost: 150, duration: 15, effect: "shield" },
    ];

    defaultPowerUps.forEach(powerUp => {
      const id = this.currentId++;
      this.powerUps.set(id, { ...powerUp, id });
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Game session methods
  async createGameSession(insertSession: InsertGameSession): Promise<GameSession> {
    const id = this.currentId++;
    const session: GameSession = {
      id,
      code: insertSession.code,
      hostId: insertSession.hostId,
      maxPlayers: insertSession.maxPlayers || 4,
      status: "waiting",
      currentQuestion: null,
      questionStartTime: null,
      questionNumber: 0,
      gameDuration: insertSession.gameDuration || 15,
      gameStartTime: null,
      createdAt: new Date(),
    };
    this.gameSessions.set(id, session);
    return session;
  }

  async getGameSession(id: number): Promise<GameSession | undefined> {
    return this.gameSessions.get(id);
  }

  async getGameSessionByCode(code: string): Promise<GameSession | undefined> {
    return Array.from(this.gameSessions.values()).find(session => session.code === code);
  }

  async updateGameSession(id: number, updates: Partial<GameSession>): Promise<GameSession | undefined> {
    const session = this.gameSessions.get(id);
    if (!session) return undefined;

    const updatedSession = { ...session, ...updates };
    this.gameSessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteGameSession(id: number): Promise<boolean> {
    return this.gameSessions.delete(id);
  }

  // Player methods
  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = this.currentId++;
    const player: Player = {
      id,
      sessionId: insertPlayer.sessionId,
      playerId: insertPlayer.playerId,
      name: insertPlayer.name,
      isHost: insertPlayer.isHost,
      credits: 0,
      score: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      difficultyLevel: 1,
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      isReady: false,
      isBeingHacked: false,
      hackedBy: null,
      hackProgress: 0,
      powerUpsActive: [],
      joinedAt: new Date(),
    };
    this.players.set(id, player);
    return player;
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getPlayerBySessionAndPlayerId(sessionId: number, playerId: string): Promise<Player | undefined> {
    return Array.from(this.players.values()).find(
      player => player.sessionId === sessionId && player.playerId === playerId
    );
  }

  async getPlayersBySession(sessionId: number): Promise<Player[]> {
    return Array.from(this.players.values()).filter(player => player.sessionId === sessionId);
  }

  async updatePlayer(id: number, updates: Partial<Player>): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;

    const updatedPlayer = { ...player, ...updates };
    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }

  async deletePlayer(id: number): Promise<boolean> {
    return this.players.delete(id);
  }

  // Power-up methods
  async createPowerUp(insertPowerUp: InsertPowerUp): Promise<PowerUp> {
    const id = this.currentId++;
    const powerUp: PowerUp = { 
      id,
      name: insertPowerUp.name,
      cost: insertPowerUp.cost,
      duration: insertPowerUp.duration,
      effect: insertPowerUp.effect
    };
    this.powerUps.set(id, powerUp);
    return powerUp;
  }

  async getAllPowerUps(): Promise<PowerUp[]> {
    return Array.from(this.powerUps.values());
  }

  // Hack attempt methods
  async createHackAttempt(insertHack: InsertHackAttempt): Promise<HackAttempt> {
    const id = this.currentId++;
    const hack: HackAttempt = {
      id,
      sessionId: insertHack.sessionId,
      hackerId: insertHack.hackerId,
      targetId: insertHack.targetId,
      questionsRequired: 5,
      questionsCompleted: 0,
      isActive: true,
      startedAt: new Date(),
      completedAt: null,
    };
    this.hackAttempts.set(id, hack);
    return hack;
  }

  async getActiveHackAttempt(sessionId: number, hackerId: string, targetId: string): Promise<HackAttempt | undefined> {
    return Array.from(this.hackAttempts.values()).find(
      hack => hack.sessionId === sessionId && 
              hack.hackerId === hackerId && 
              hack.targetId === targetId && 
              hack.isActive
    );
  }

  async updateHackAttempt(id: number, updates: Partial<HackAttempt>): Promise<HackAttempt | undefined> {
    const hack = this.hackAttempts.get(id);
    if (!hack) return undefined;

    const updatedHack = { ...hack, ...updates };
    this.hackAttempts.set(id, updatedHack);
    return updatedHack;
  }

  async getActiveHacksByTarget(sessionId: number, targetId: string): Promise<HackAttempt[]> {
    return Array.from(this.hackAttempts.values()).filter(
      hack => hack.sessionId === sessionId && hack.targetId === targetId && hack.isActive
    );
  }
}

export const storage = new MemStorage();
