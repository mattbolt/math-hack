import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  hostId: text("host_id").notNull(),
  status: text("status").notNull().default("waiting"), // waiting, active, finished
  maxPlayers: integer("max_players").notNull().default(4),
  currentQuestion: jsonb("current_question"),
  questionStartTime: timestamp("question_start_time"),
  questionNumber: integer("question_number").notNull().default(0),
  gameDuration: integer("game_duration").notNull().default(15), // Duration in minutes
  gameStartTime: timestamp("game_start_time"),
  gameLog: jsonb("game_log").default([]), // Array of game events
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => gameSessions.id),
  playerId: text("player_id").notNull(),
  name: text("name").notNull(),
  credits: integer("credits").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  wrongAnswers: integer("wrong_answers").notNull().default(0),
  difficultyLevel: integer("difficulty_level").notNull().default(1),
  maxDifficultyReached: integer("max_difficulty_reached").notNull().default(1),
  consecutiveCorrect: integer("consecutive_correct").notNull().default(0),
  consecutiveWrong: integer("consecutive_wrong").notNull().default(0),
  overallConsecutiveCorrect: integer("overall_consecutive_correct").notNull().default(0),
  isHost: boolean("is_host").notNull().default(false),
  isReady: boolean("is_ready").notNull().default(false),
  isBeingHacked: boolean("is_being_hacked").notNull().default(false),
  hackedBy: text("hacked_by"),
  hackProgress: integer("hack_progress").notNull().default(0),
  questionsSkipped: integer("questions_skipped").notNull().default(0),
  hackAttempts: integer("hack_attempts").notNull().default(0),
  powerUpsActive: jsonb("power_ups_active").default([]),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const powerUps = pgTable("power_ups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cost: integer("cost").notNull(),
  duration: integer("duration"), // in seconds, null for instant effects
  effect: text("effect").notNull(), // slow, freeze, scramble, shield
});

export const hackAttempts = pgTable("hack_attempts", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => gameSessions.id),
  hackerId: text("hacker_id").notNull(),
  targetId: text("target_id").notNull(),
  questionsRequired: integer("questions_required").notNull().default(5),
  questionsCompleted: integer("questions_completed").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).pick({
  code: true,
  hostId: true,
  maxPlayers: true,
  gameDuration: true,
}).required({ maxPlayers: true });

export const insertPlayerSchema = createInsertSchema(players).pick({
  sessionId: true,
  playerId: true,
  name: true,
  isHost: true,
}).required({ sessionId: true, isHost: true });

export const insertPowerUpSchema = createInsertSchema(powerUps).pick({
  name: true,
  cost: true,
  duration: true,
  effect: true,
});

export const insertHackAttemptSchema = createInsertSchema(hackAttempts).pick({
  sessionId: true,
  hackerId: true,
  targetId: true,
}).required({ sessionId: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type GameSession = typeof gameSessions.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type PowerUp = typeof powerUps.$inferSelect;
export type InsertPowerUp = z.infer<typeof insertPowerUpSchema>;
export type HackAttempt = typeof hackAttempts.$inferSelect;
export type InsertHackAttempt = z.infer<typeof insertHackAttemptSchema>;

// Game-specific types
export interface Question {
  id: string;
  text: string;
  answer: number;
  options: number[];
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division';
  difficulty: number;
  timeLimit: number;
}

export interface GameState {
  session: GameSession;
  players: Player[];
  currentQuestion?: Question;
  timeRemaining?: number;
}

export interface PowerUpEffect {
  type: 'slow' | 'freeze' | 'scramble' | 'shield';
  targetId: string;
  duration: number;
  startTime: number;
}

export interface GameLogEntry {
  id: string;
  timestamp: number;
  type: 'powerup' | 'credit_change' | 'hack_start' | 'hack_complete' | 'game_start' | 'player_join';
  playerId?: string;
  playerName?: string;
  targetId?: string;
  targetName?: string;
  details: string;
  creditChange?: number;
}
