// src/types/poker.types.ts

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
}

export type HandRank =
  | 'Royal Flush'
  | 'Straight Flush'
  | 'Four of a Kind'
  | 'Full House'
  | 'Flush'
  | 'Straight'
  | 'Three of a Kind'
  | 'Two Pair'
  | 'One Pair'
  | 'High Card';

export interface HandResult {
  rank: HandRank;
  rankValue: number;
  cards: Card[];
  description: string;
}

export type PlayerStatus =
  | 'waiting'
  | 'active'
  | 'folded'
  | 'all-in'
  | 'sitting-out'
  | 'disconnected';

export type BettingAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface PokerPlayer {
  uid: string;
  name: string;
  avatar: string;
  seatIndex: number;
  chipStack: number;
  holeCards: Card[];
  currentBet: number;
  totalBetInRound: number;
  status: PlayerStatus;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  lastAction?: BettingAction;
  handResult?: HandResult;
  isWinner?: boolean;
  winAmount?: number;
  joinedAt: Date;
}

export type TableCategory =
  | 'micro'
  | 'low'
  | 'medium'
  | 'high'
  | 'vip';

export interface TableConfig {
  category: TableCategory;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  minPlayers: number;
  maxPlayers: number;
  label: string;
  color: string;
}

export type GamePhase =
  | 'waiting'
  | 'pre-flop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'finished';

export interface PokerTable {
  tableId: string;
  category: TableCategory;
  config: TableConfig;
  players: PokerPlayer[];
  communityCards: Card[];
  deck: Card[];
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  phase: GamePhase;
  activePlayerIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  winners: PokerWinner[];
  matchId?: string;
  roundNumber: number;
  actionTimer: number;
  isActive: boolean;
  isFull: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SidePot {
  amount: number;
  eligiblePlayers: string[];
}

export interface PokerWinner {
  uid: string;
  name: string;
  amount: number;
  handRank: HandRank;
  handDescription: string;
  cards: Card[];
}

export interface PokerMatch {
  matchId: string;
  tableId: string;
  category: TableCategory;
  players: MatchPlayer[];
  communityCards: Card[];
  pot: number;
  winners: PokerWinner[];
  phase: GamePhase;
  roundNumber: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface MatchPlayer {
  uid: string;
  name: string;
  holeCards: Card[];
  finalStack: number;
  profit: number;
  handResult?: HandResult;
  isWinner: boolean;
}

export type PokerAction =
  | { type: 'JOIN_TABLE'; payload: { uid: string; buyIn: number; seatIndex: number } }
  | { type: 'LEAVE_TABLE'; payload: { uid: string } }
  | { type: 'PLAYER_ACTION'; payload: { uid: string; action: BettingAction; amount?: number } }
  | { type: 'DEAL_CARDS' }
  | { type: 'NEXT_PHASE' }
  | { type: 'SHOWDOWN' }
  | { type: 'NEW_ROUND' };
