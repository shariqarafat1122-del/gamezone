// src/types/ludo.types.ts

export type LudoColor = 'red' | 'blue' | 'green' | 'yellow';

export type PieceStatus = 'home' | 'active' | 'finished' | 'eliminated';

export interface LudoPiece {
  id: string;           // e.g. "red_0", "blue_1"
  color: LudoColor;
  pieceIndex: number;   // 0-3
  position: number;     // -1 = home, 0-55 = board path, 56 = finished
  status: PieceStatus;
  isProtected: boolean; // on safe square
  stepsMoved: number;
}

export interface LudoPlayer {
  uid: string;
  name: string;
  avatar: string;
  color: LudoColor;
  pieces: LudoPiece[];
  score: number;
  eliminationCount: number;
  finishedPieces: number;
  isReady: boolean;
  isConnected: boolean;
  lastSeen: Date;
}

export type RoomStatus =
  | 'waiting'      // waiting for opponent
  | 'matched'      // both players joined
  | 'playing'      // game in progress
  | 'finished'     // game ended
  | 'abandoned';   // player left

export type GameStatus =
  | 'countdown'    // 3 second start countdown
  | 'rolling'      // dice rolling phase
  | 'moving'       // player moving piece
  | 'waiting_turn' // waiting for other player

export interface LudoRoom {
  roomId: string;
  betAmount: number;
  status: RoomStatus;
  players: LudoPlayer[];
  currentTurn: string;      // uid of current player
  diceValue: number;        // 1-6
  diceRolled: boolean;
  gameStatus: GameStatus;
  turnStartTime: number;    // timestamp
  turnTimeLimit: number;    // 15 seconds per turn
  gameStartTime: number;    // timestamp
  gameDuration: number;     // 180 seconds (3 min)
  gameEndTime: number;      // timestamp
  winner: LudoWinner | null;
  movablePieces: string[];  // piece ids that can move
  lastMoveTime: number;
  roundNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LudoWinner {
  uid: string;
  name: string;
  color: LudoColor;
  score: number;
  prize: number;
}

export interface LudoMove {
  uid: string;
  pieceId: string;
  fromPosition: number;
  toPosition: number;
  diceValue: number;
  eliminatedPiece?: string;
  timestamp: number;
}

export interface TableOption {
  betAmount: number;
  label: string;
  prize: number;
  color: string;
  gradient: string;
  icon: string;
  minPlayers: number;
  maxPlayers: number;
}

// Board path constants
export const BOARD_SIZE = 15;
export const TOTAL_SQUARES = 56;
export const HOME_ENTRY: Record<LudoColor, number> = {
  red: 0,
  blue: 14,
  green: 28,
  yellow: 42,
};
export const SAFE_SQUARES = [0, 8, 13, 14, 21, 26, 27, 34, 39, 40, 47, 52];

// Color player positions on board path
export const COLOR_START_OFFSET: Record<LudoColor, number> = {
  red: 0,
  blue: 14,
  green: 28,
  yellow: 42,
};

// Home column entry point (to finish)
export const HOME_COLUMN_ENTRY: Record<LudoColor, number> = {
  red: 51,
  blue: 9,
  green: 23,
  yellow: 37,
};

export const TABLE_OPTIONS: TableOption[] = [
  {
    betAmount: 10,
    label: '₹10 Table',
    prize: 18,
    color: '#10B981',
    gradient: 'from-emerald-600 to-green-700',
    icon: '🟢',
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    betAmount: 20,
    label: '₹20 Table',
    prize: 36,
    color: '#3B82F6',
    gradient: 'from-blue-600 to-blue-700',
    icon: '🔵',
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    betAmount: 50,
    label: '₹50 Table',
    prize: 90,
    color: '#8B5CF6',
    gradient: 'from-violet-600 to-purple-700',
    icon: '🟣',
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    betAmount: 100,
    label: '₹100 Table',
    prize: 180,
    color: '#F59E0B',
    gradient: 'from-amber-500 to-yellow-600',
    icon: '🟡',
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    betAmount: 500,
    label: '₹500 Table',
    prize: 900,
    color: '#EF4444',
    gradient: 'from-red-600 to-rose-700',
    icon: '🔴',
    minPlayers: 2,
    maxPlayers: 2,
  },
];
