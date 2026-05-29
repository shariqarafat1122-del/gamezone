// ============================================================
// CORE USER TYPES
// ============================================================

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'banned' | 'suspended';

export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  email: string;
  mobile: string;
  avatar: string;
  role: UserRole;
  status: UserStatus;
  walletBalance: number;
  winningBalance: number;
  depositBalance: number;
  totalDeposit: number;
  totalWithdraw: number;
  totalBet: number;
  totalWin: number;
  totalGames: number;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

// ============================================================
// WALLET & TRANSACTION TYPES
// ============================================================

export type TransactionType = 'deposit' | 'withdrawal' | 'bet' | 'win' | 'refund' | 'bonus';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface Transaction {
  id: string;
  uid: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  status: TransactionStatus;
  referenceId?: string;
  createdAt: Date | string;
}

export type DepositStatus = 'pending' | 'approved' | 'rejected';

export interface DepositRequest {
  requestId: string;
  uid: string;
  userName: string;
  amount: number;
  utr: string;
  upiId?: string;
  status: DepositStatus;
  adminNote?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export interface WithdrawalRequest {
  requestId: string;
  uid: string;
  userName: string;
  amount: number;
  upiId: string;
  status: WithdrawalStatus;
  adminNote?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

// ============================================================
// NOTIFICATION TYPES
// ============================================================

export type NotificationType =
  | 'deposit_approved'
  | 'deposit_rejected'
  | 'withdrawal_approved'
  | 'withdrawal_rejected'
  | 'match_started'
  | 'match_completed'
  | 'win_credited'
  | 'admin_announcement'
  | 'bonus_credited'
  | 'maintenance';

export interface Notification {
  id: string;
  uid: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: Date | string;
}

// ============================================================
// GAME TYPES
// ============================================================

export type GameType = 'ludo' | 'color_prediction' | 'poker' | 'odd_even' | 'dragon_tiger' | 'andar_bahar';
export type GameStatus = 'waiting' | 'active' | 'completed' | 'cancelled';
export type RoomStatus = 'open' | 'full' | 'playing' | 'completed';

export interface GameRoom {
  roomId: string;
  gameType: GameType;
  betAmount: number;
  maxPlayers: number;
  currentPlayers: number;
  players: RoomPlayer[];
  status: RoomStatus;
  createdAt: Date | string;
  startedAt?: Date | string;
  completedAt?: Date | string;
}

export interface RoomPlayer {
  uid: string;
  name: string;
  avatar: string;
  status: 'joined' | 'ready' | 'playing' | 'left';
  joinedAt: Date | string;
}

// ============================================================
// LUDO GAME TYPES
// ============================================================

export interface LudoRoom {
  roomId: string;
  betAmount: number;
  maxPlayers: number;
  players: LudoPlayer[];
  status: RoomStatus;
  currentTurn: string;
  diceValue: number;
  board: LudoBoard;
  winnerId?: string;
  prize: number;
  createdAt: Date | string;
  startedAt?: Date | string;
}

export interface LudoPlayer {
  uid: string;
  name: string;
  avatar: string;
  color: 'red' | 'blue' | 'green' | 'yellow';
  pieces: number[];
  isWinner: boolean;
}

export interface LudoBoard {
  pieces: Record<string, number[]>;
}

// ============================================================
// COLOR PREDICTION TYPES
// ============================================================

export type ColorOption = 'red' | 'green' | 'violet';
export type RoundPhase = 'betting' | 'locked' | 'result' | 'completed';

export interface ColorRound {
  roundId: string;
  roundNumber: number;
  phase: RoundPhase;
  startTime: Date | string;
  lockTime: Date | string;
  resultTime: Date | string;
  result?: ColorOption;
  totalBets: number;
  totalAmount: number;
  status: 'active' | 'completed';
}

export interface ColorBet {
  betId: string;
  roundId: string;
  uid: string;
  userName: string;
  color: ColorOption;
  amount: number;
  multiplier: number;
  winAmount?: number;
  isWin?: boolean;
  createdAt: Date | string;
}

// ============================================================
// POKER TYPES
// ============================================================

export type PokerPhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'completed';
export type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type CardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: CardRank;
  suit: CardSuit;
}

export interface PokerTable {
  tableId: string;
  name: string;
  minBet: number;
  maxBet: number;
  maxPlayers: number;
  players: PokerPlayer[];
  phase: PokerPhase;
  communityCards: Card[];
  pot: number;
  currentBet: number;
  currentTurn: string;
  dealerIndex: number;
  status: 'open' | 'full' | 'playing';
  createdAt: Date | string;
}

export interface PokerPlayer {
  uid: string;
  name: string;
  avatar: string;
  seatIndex: number;
  chips: number;
  holeCards: Card[];
  currentBet: number;
  totalBet: number;
  isFolded: boolean;
  isAllIn: boolean;
  isDealer: boolean;
  isTurn: boolean;
  action?: 'check' | 'call' | 'raise' | 'fold' | 'all-in';
}

// ============================================================
// ODD EVEN TYPES
// ============================================================

export type OddEvenOption = 'odd' | 'even';

export interface OddEvenRound {
  roundId: string;
  roundNumber: number;
  phase: RoundPhase;
  result?: OddEvenOption;
  resultNumber?: number;
  totalBets: number;
  totalAmount: number;
  status: 'active' | 'completed';
  createdAt: Date | string;
}

export interface OddEvenBet {
  betId: string;
  roundId: string;
  uid: string;
  userName: string;
  option: OddEvenOption;
  amount: number;
  winAmount?: number;
  isWin?: boolean;
  createdAt: Date | string;
}

// ============================================================
// DRAGON TIGER TYPES
// ============================================================

export type DragonTigerOption = 'dragon' | 'tiger' | 'tie';

export interface DragonTigerRound {
  roundId: string;
  roundNumber: number;
  phase: RoundPhase;
  dragonCard?: Card;
  tigerCard?: Card;
  result?: DragonTigerOption;
  totalBets: number;
  totalAmount: number;
  status: 'active' | 'completed';
  createdAt: Date | string;
}

export interface DragonTigerBet {
  betId: string;
  roundId: string;
  uid: string;
  userName: string;
  option: DragonTigerOption;
  amount: number;
  winAmount?: number;
  isWin?: boolean;
  createdAt: Date | string;
}

// ============================================================
// ANDAR BAHAR TYPES
// ============================================================

export type AndarBaharOption = 'andar' | 'bahar';

export interface AndarBaharRound {
  roundId: string;
  roundNumber: number;
  phase: RoundPhase;
  centerCard?: Card;
  andarCards: Card[];
  baharCards: Card[];
  result?: AndarBaharOption;
  totalBets: number;
  totalAmount: number;
  status: 'active' | 'completed';
  createdAt: Date | string;
}

export interface AndarBaharBet {
  betId: string;
  roundId: string;
  uid: string;
  userName: string;
  option: AndarBaharOption;
  amount: number;
  winAmount?: number;
  isWin?: boolean;
  createdAt: Date | string;
}

// ============================================================
// ADMIN TYPES
// ============================================================

export interface AdminStats {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalRevenue: number;
  activePlayers: number;
  activeTables: number;
  totalBets: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
}

export interface AdminLog {
  logId: string;
  adminId: string;
  adminName: string;
  action: string;
  targetId?: string;
  details: string;
  createdAt: Date | string;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'maintenance' | 'offer';
  isActive: boolean;
  createdAt: Date | string;
}

export interface AppSettings {
  siteName: string;
  upiId: string;
  upiQrUrl: string;
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  maintenanceMode: boolean;
  referralBonus: number;
}

// ============================================================
// UI TYPES
// ============================================================

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

export interface NavItem {
  path: string;
  label: string;
  icon: string;
}
