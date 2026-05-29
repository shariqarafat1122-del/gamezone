// src/types/index.ts

export type UserRole = 'user' | 'admin' | 'moderator'
export type UserStatus = 'active' | 'banned' | 'suspended'

export interface UserProfile {
  uid: string
  name: string
  username: string
  email: string
  mobile: string
  avatar: string
  role: UserRole
  status: UserStatus
  walletBalance: number
  winningBalance: number
  depositBalance: number
  totalDeposit: number
  totalWithdraw: number
  totalBet: number
  totalWin: number
  totalGames: number
  referralCode: string
  referredBy?: string
  kycStatus: 'pending' | 'verified' | 'rejected' | 'none'
  createdAt: any
  updatedAt: any
}

export interface WalletData {
  uid: string
  balance: number
  winningBalance: number
  depositBalance: number
  bonusBalance: number
  lockedBalance: number
  updatedAt: any
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'bet'
  | 'win'
  | 'refund'
  | 'bonus'
  | 'transfer'

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

export interface Transaction {
  txId: string
  uid: string
  type: TransactionType
  amount: number
  description: string
  status: TransactionStatus
  gameId?: string
  roomId?: string
  tableId?: string
  referenceId?: string
  createdAt: any
}

export type DepositStatus = 'pending' | 'approved' | 'rejected'

export interface DepositRequest {
  id: string
  requestId: string
  uid: string
  userName: string
  amount: number
  utr: string
  upiId?: string
  screenshot?: string
  status: DepositStatus
  adminNote?: string
  processedBy?: string
  processedAt?: any
  createdAt: any
}

export type WithdrawalStatus = 'pending' | 'processing' | 'approved' | 'rejected'

export interface WithdrawalRequest {
  id: string
  requestId: string
  uid: string
  userName: string
  amount: number
  upiId: string
  status: WithdrawalStatus
  adminNote?: string
  processedBy?: string
  processedAt?: any
  createdAt: any
}

// ✅ Fixed: Added all notification types including 'maintenance'
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
  | 'maintenance'
  | 'system'

export interface Notification {
  notifId: string   // ✅ Fixed: use notifId not id
  uid: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  data?: Record<string, any>
  createdAt: any
  readAt?: any
}

export interface GameStats {
  totalGames: number
  totalBet: number
  totalWin: number
  totalProfit: number
  winRate: number
  biggestWin: number
  currentStreak: number
}
