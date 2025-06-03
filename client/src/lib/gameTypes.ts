export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface GameStats {
  correct: number;
  wrong: number;
  accuracy: number;
  hacks: number;
  difficulty: number;
}

export interface PowerUpType {
  id: string;
  name: string;
  cost: number;
  effect: 'slow' | 'freeze' | 'scramble' | 'shield';
  duration?: number;
}

export interface ActiveEffect {
  type: string;
  targetId: string;
  duration: number;
  startTime: number;
}

export type GamePhase = 'lobby' | 'waiting' | 'active' | 'results';
