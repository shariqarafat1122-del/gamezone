// src/firebase/userService.ts
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
  increment,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from './config'
import type { UserProfile, WalletData, Transaction, Notification } from '../types'

// ============================================================
// USER SERVICES
// ============================================================

/**
 * Get user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (snap.exists()) {
      return snap.data() as UserProfile
    }
    return null
  } catch (error) {
    console.error('getUserProfile error:', error)
    return null
  }
}

/**
 * Create new user profile + wallet
 */
export async function createUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  const batch = writeBatch(db)

  const profile: UserProfile = {
    uid,
    name: data.name || 'Player',
    username: `player_${uid.slice(0, 6)}`,
    email: data.email || '',
    mobile: data.mobile || '',
    avatar: data.avatar || '',
    role: 'user',
    status: 'active',
    walletBalance: 0,
    winningBalance: 0,
    depositBalance: 0,
    totalDeposit: 0,
    totalWithdraw: 0,
    totalBet: 0,
    totalWin: 0,
    totalGames: 0,
    referralCode: `GZ${uid.slice(0, 6).toUpperCase()}`,
    kycStatus: 'none',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...data,
  }

  const wallet: WalletData = {
    uid,
    balance: 0,
    winningBalance: 0,
    depositBalance: 0,
    bonusBalance: 0,
    lockedBalance: 0,
    updatedAt: serverTimestamp(),
  }

  batch.set(doc(db, 'users', uid), profile)
  batch.set(doc(db, 'wallets', uid), wallet)

  await batch.commit()
}

/**
 * Update user profile (safe fields only)
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, 'name' | 'username' | 'avatar' | 'mobile'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Subscribe to user profile realtime
 */
export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): () => void {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as UserProfile)
    } else {
      callback(null)
    }
  })
}

// ============================================================
// WALLET SERVICES
// ============================================================

/**
 * Get wallet balance
 */
export async function getWallet(uid: string): Promise<WalletData | null> {
  try {
    const snap = await getDoc(doc(db, 'wallets', uid))
    if (snap.exists()) {
      return snap.data() as WalletData
    }
    return null
  } catch (error) {
    console.error('getWallet error:', error)
    return null
  }
}

/**
 * Subscribe to wallet realtime
 */
export function subscribeToWallet(
  uid: string,
  callback: (wallet: WalletData | null) => void
): () => void {
  return onSnapshot(doc(db, 'wallets', uid), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as WalletData)
    } else {
      callback(null)
    }
  })
}

/**
 * Credit wallet balance (admin only via backend)
 */
export async function creditWallet(
  uid: string,
  amount: number,
  type: 'deposit' | 'win' | 'refund' | 'bonus',
  description: string,
  referenceId?: string
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const walletRef = doc(db, 'wallets', uid)
    const walletSnap = await transaction.get(walletRef)

    if (!walletSnap.exists()) {
      throw new Error('Wallet not found')
    }

    // Update wallet
    transaction.update(walletRef, {
      balance: increment(amount),
      updatedAt: serverTimestamp(),
    })

    // Create transaction record
    const txRef = doc(collection(db, 'transactions'))
    transaction.set(txRef, {
      txId: txRef.id,
      uid,
      type,
      amount,
      description,
      referenceId: referenceId || null,
      status: 'completed',
      createdAt: serverTimestamp(),
    })

    // Update user stats
    const userRef = doc(db, 'users', uid)
    if (type === 'deposit') {
      transaction.update(userRef, {
        totalDeposit: increment(amount),
        updatedAt: serverTimestamp(),
      })
    } else if (type === 'win') {
      transaction.update(userRef, {
        totalWin: increment(amount),
        updatedAt: serverTimestamp(),
      })
    }
  })
}

/**
 * Deduct wallet balance
 */
export async function deductWallet(
  uid: string,
  amount: number,
  type: 'withdrawal' | 'bet',
  description: string,
  referenceId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    await runTransaction(db, async (transaction) => {
      const walletRef = doc(db, 'wallets', uid)
      const walletSnap = await transaction.get(walletRef)

      if (!walletSnap.exists()) {
        throw new Error('Wallet not found')
      }

      const currentBalance = walletSnap.data().balance || 0
      if (currentBalance < amount) {
        throw new Error('Insufficient balance')
      }

      // Deduct
      transaction.update(walletRef, {
        balance: increment(-amount),
        updatedAt: serverTimestamp(),
      })

      // Transaction record
      const txRef = doc(collection(db, 'transactions'))
      transaction.set(txRef, {
        txId: txRef.id,
        uid,
        type,
        amount,
        description,
        referenceId: referenceId || null,
        status: 'completed',
        createdAt: serverTimestamp(),
      })

      // Update stats
      const userRef = doc(db, 'users', uid)
      if (type === 'withdrawal') {
        transaction.update(userRef, {
          totalWithdraw: increment(amount),
          updatedAt: serverTimestamp(),
        })
      } else if (type === 'bet') {
        transaction.update(userRef, {
          totalBet: increment(amount),
          updatedAt: serverTimestamp(),
        })
      }
    })

    return { success: true, message: 'Success' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed' }
  }
}

// ============================================================
// TRANSACTION SERVICES
// ============================================================

/**
 * Get user transactions with pagination
 */
export async function getUserTransactions(
  uid: string,
  limitCount = 20,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ transactions: Transaction[]; lastDoc: QueryDocumentSnapshot | null }> {
  try {
    let q = query(
      collection(db, 'transactions'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )

    if (lastDoc) {
      q = query(
        collection(db, 'transactions'),
        where('uid', '==', uid),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(limitCount)
      )
    }

    const snap = await getDocs(q)
    const transactions = snap.docs.map(
      (d) => ({ ...d.data(), txId: d.id } as Transaction)
    )
    const newLastDoc = snap.docs[snap.docs.length - 1] || null

    return { transactions, lastDoc: newLastDoc }
  } catch (error) {
    console.error('getUserTransactions error:', error)
    return { transactions: [], lastDoc: null }
  }
}

/**
 * Subscribe to recent transactions
 */
export function subscribeToTransactions(
  uid: string,
  limitCount: number,
  callback: (transactions: Transaction[]) => void
): () => void {
  const q = query(
    collection(db, 'transactions'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )

  return onSnapshot(q, (snap) => {
    const transactions = snap.docs.map(
      (d) => ({ ...d.data(), txId: d.id } as Transaction)
    )
    callback(transactions)
  })
}

// ============================================================
// DEPOSIT SERVICES
// ============================================================

/**
 * Create deposit request
 */
export async function createDepositRequest(
  uid: string,
  userName: string,
  amount: number,
  utr: string,
  upiId?: string
): Promise<{ success: boolean; requestId?: string; message?: string }> {
  try {
    if (amount < 100) {
      return { success: false, message: 'Minimum deposit is ₹100' }
    }
    if (amount > 100000) {
      return { success: false, message: 'Maximum deposit is ₹1,00,000' }
    }
    if (!utr || utr.trim().length < 10) {
      return { success: false, message: 'Invalid UTR number' }
    }

    const ref = doc(collection(db, 'deposits'))
    await setDoc(ref, {
      requestId: ref.id,
      uid,
      userName,
      amount,
      utr: utr.trim(),
      upiId: upiId || null,
      status: 'pending',
      createdAt: serverTimestamp(),
    })

    return { success: true, requestId: ref.id }
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to create request' }
  }
}

/**
 * Subscribe to user deposits
 */
export function subscribeToUserDeposits(
  uid: string,
  callback: (deposits: any[]) => void
): () => void {
  const q = query(
    collection(db, 'deposits'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  )

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id })))
  })
}

// ============================================================
// WITHDRAWAL SERVICES
// ============================================================

/**
 * Create withdrawal request
 */
export async function createWithdrawalRequest(
  uid: string,
  userName: string,
  amount: number,
  upiId: string
): Promise<{ success: boolean; requestId?: string; message?: string }> {
  try {
    if (amount < 100) {
      return { success: false, message: 'Minimum withdrawal is ₹100' }
    }
    if (amount > 50000) {
      return { success: false, message: 'Maximum withdrawal is ₹50,000' }
    }
    if (!upiId || !upiId.includes('@')) {
      return { success: false, message: 'Invalid UPI ID' }
    }

    // Check wallet balance
    const wallet = await getWallet(uid)
    if (!wallet || wallet.balance < amount) {
      return { success: false, message: 'Insufficient balance' }
    }

    const ref = doc(collection(db, 'withdrawals'))
    await setDoc(ref, {
      requestId: ref.id,
      uid,
      userName,
      amount,
      upiId: upiId.trim(),
      status: 'pending',
      createdAt: serverTimestamp(),
    })

    return { success: true, requestId: ref.id }
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to create request' }
  }
}

/**
 * Subscribe to user withdrawals
 */
export function subscribeToUserWithdrawals(
  uid: string,
  callback: (withdrawals: any[]) => void
): () => void {
  const q = query(
    collection(db, 'withdrawals'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  )

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id })))
  })
}

// ============================================================
// NOTIFICATION SERVICES
// ============================================================

/**
 * Create notification for user
 */
export async function createNotification(
  uid: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  const ref = doc(collection(db, 'notifications'))
  await setDoc(ref, {
    notifId: ref.id,
    uid,
    type,
    title,
    message,
    data: data || null,
    isRead: false,
    createdAt: serverTimestamp(),
  })
}

/**
 * Subscribe to user notifications
 */
export function subscribeToNotifications(
  uid: string,
  callback: (notifications: Notification[]) => void
): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50)
  )

  return onSnapshot(q, (snap) => {
    const notifications = snap.docs.map(
      (d) => ({ ...d.data(), notifId: d.id } as Notification)
    )
    callback(notifications)
  })
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notifId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notifId), {
    isRead: true,
    readAt: serverTimestamp(),
  })
}

/**
 * Mark all notifications as read for user
 */
export async function markAllNotificationsRead(uid: string): Promise<void> {
  const q = query(
    collection(db, 'notifications'),
    where('uid', '==', uid),
    where('isRead', '==', false)
  )

  const snap = await getDocs(q)
  if (snap.empty) return

  const batch = writeBatch(db)
  snap.docs.forEach((d) => {
    batch.update(d.ref, { isRead: true, readAt: serverTimestamp() })
  })
  await batch.commit()
}

// ============================================================
// ADMIN SERVICES
// ============================================================

/**
 * Get all users (admin only)
 */
export async function getAllUsers(
  limitCount = 50,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ users: UserProfile[]; lastDoc: QueryDocumentSnapshot | null }> {
  try {
    let q = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )

    if (lastDoc) {
      q = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(limitCount)
      )
    }

    const snap = await getDocs(q)
    const users = snap.docs.map((d) => d.data() as UserProfile)
    const newLastDoc = snap.docs[snap.docs.length - 1] || null

    return { users, lastDoc: newLastDoc }
  } catch (error) {
    console.error('getAllUsers error:', error)
    return { users: [], lastDoc: null }
  }
}

/**
 * Search users by name or email
 */
export async function searchUsers(searchTerm: string): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'))
    const term = searchTerm.toLowerCase()
    return snap.docs
      .map((d) => d.data() as UserProfile)
      .filter(
        (u) =>
          u.name?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.username?.toLowerCase().includes(term) ||
          u.mobile?.includes(term)
      )
      .slice(0, 20)
  } catch (error) {
    console.error('searchUsers error:', error)
    return []
  }
}

/**
 * Ban or unban user (admin only)
 */
export async function setUserStatus(
  uid: string,
  status: 'active' | 'banned' | 'suspended'
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    status,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Change user role (admin only)
 */
export async function setUserRole(
  uid: string,
  role: 'user' | 'admin' | 'moderator'
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    role,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Reset user wallet (admin only)
 */
export async function resetUserWallet(uid: string): Promise<void> {
  const batch = writeBatch(db)

  batch.update(doc(db, 'wallets', uid), {
    balance: 0,
    winningBalance: 0,
    depositBalance: 0,
    bonusBalance: 0,
    updatedAt: serverTimestamp(),
  })

  batch.update(doc(db, 'users', uid), {
    walletBalance: 0,
    winningBalance: 0,
    depositBalance: 0,
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
}

/**
 * Approve deposit request (admin only)
 */
export async function approveDeposit(
  depositId: string,
  adminUid: string
): Promise<{ success: boolean; message: string }> {
  try {
    await runTransaction(db, async (transaction) => {
      const depRef = doc(db, 'deposits', depositId)
      const depSnap = await transaction.get(depRef)

      if (!depSnap.exists()) throw new Error('Deposit not found')

      const deposit = depSnap.data()
      if (deposit.status !== 'pending') {
        throw new Error('Deposit already processed')
      }

      const walletRef = doc(db, 'wallets', deposit.uid)
      const walletSnap = await transaction.get(walletRef)

      if (!walletSnap.exists()) throw new Error('Wallet not found')

      // Credit wallet
      transaction.update(walletRef, {
        balance: increment(deposit.amount),
        updatedAt: serverTimestamp(),
      })

      // Update deposit status
      transaction.update(depRef, {
        status: 'approved',
        processedBy: adminUid,
        processedAt: serverTimestamp(),
      })

      // Update user stats
      const userRef = doc(db, 'users', deposit.uid)
      transaction.update(userRef, {
        totalDeposit: increment(deposit.amount),
        updatedAt: serverTimestamp(),
      })

      // Create transaction record
      const txRef = doc(collection(db, 'transactions'))
      transaction.set(txRef, {
        txId: txRef.id,
        uid: deposit.uid,
        type: 'deposit',
        amount: deposit.amount,
        description: `Deposit approved - UTR: ${deposit.utr}`,
        referenceId: depositId,
        status: 'completed',
        createdAt: serverTimestamp(),
      })

      // Create notification
      const notifRef = doc(collection(db, 'notifications'))
      transaction.set(notifRef, {
        notifId: notifRef.id,
        uid: deposit.uid,
        type: 'deposit_approved',
        title: '✅ Deposit Approved!',
        message: `Your deposit of ₹${deposit.amount.toLocaleString()} has been approved and credited to your wallet.`,
        isRead: false,
        createdAt: serverTimestamp(),
      })
    })

    return { success: true, message: 'Deposit approved successfully' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to approve' }
  }
}

/**
 * Reject deposit request (admin only)
 */
export async function rejectDeposit(
  depositId: string,
  adminUid: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    await runTransaction(db, async (transaction) => {
      const depRef = doc(db, 'deposits', depositId)
      const depSnap = await transaction.get(depRef)

      if (!depSnap.exists()) throw new Error('Deposit not found')

      const deposit = depSnap.data()
      if (deposit.status !== 'pending') {
        throw new Error('Already processed')
      }

      // Update status
      transaction.update(depRef, {
        status: 'rejected',
        adminNote: reason || 'Rejected by admin',
        processedBy: adminUid,
        processedAt: serverTimestamp(),
      })

      // Notify user
      const notifRef = doc(collection(db, 'notifications'))
      transaction.set(notifRef, {
        notifId: notifRef.id,
        uid: deposit.uid,
        type: 'deposit_rejected',
        title: '❌ Deposit Rejected',
        message: `Your deposit of ₹${deposit.amount.toLocaleString()} was rejected. ${reason || 'Please contact support.'}`,
        isRead: false,
        createdAt: serverTimestamp(),
      })
    })

    return { success: true, message: 'Deposit rejected' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to reject' }
  }
}

/**
 * Approve withdrawal (admin only)
 */
export async function approveWithdrawal(
  withdrawalId: string,
  adminUid: string
): Promise<{ success: boolean; message: string }> {
  try {
    await runTransaction(db, async (transaction) => {
      const wRef = doc(db, 'withdrawals', withdrawalId)
      const wSnap = await transaction.get(wRef)

      if (!wSnap.exists()) throw new Error('Withdrawal not found')

      const withdrawal = wSnap.data()
      if (withdrawal.status !== 'pending') {
        throw new Error('Already processed')
      }

      const walletRef = doc(db, 'wallets', withdrawal.uid)
      const walletSnap = await transaction.get(walletRef)

      if (!walletSnap.exists()) throw new Error('Wallet not found')

      const currentBalance = walletSnap.data().balance || 0
      if (currentBalance < withdrawal.amount) {
        throw new Error('Insufficient balance')
      }

      // Deduct wallet
      transaction.update(walletRef, {
        balance: increment(-withdrawal.amount),
        updatedAt: serverTimestamp(),
      })

      // Update withdrawal
      transaction.update(wRef, {
        status: 'approved',
        processedBy: adminUid,
        processedAt: serverTimestamp(),
      })

      // Update user stats
      const userRef = doc(db, 'users', withdrawal.uid)
      transaction.update(userRef, {
        totalWithdraw: increment(withdrawal.amount),
        updatedAt: serverTimestamp(),
      })

      // Transaction record
      const txRef = doc(collection(db, 'transactions'))
      transaction.set(txRef, {
        txId: txRef.id,
        uid: withdrawal.uid,
        type: 'withdrawal',
        amount: withdrawal.amount,
        description: `Withdrawal approved to ${withdrawal.upiId}`,
        referenceId: withdrawalId,
        status: 'completed',
        createdAt: serverTimestamp(),
      })

      // Notification
      const notifRef = doc(collection(db, 'notifications'))
      transaction.set(notifRef, {
        notifId: notifRef.id,
        uid: withdrawal.uid,
        type: 'withdrawal_approved',
        title: '💸 Withdrawal Approved!',
        message: `Your withdrawal of ₹${withdrawal.amount.toLocaleString()} has been processed to ${withdrawal.upiId}.`,
        isRead: false,
        createdAt: serverTimestamp(),
      })
    })

    return { success: true, message: 'Withdrawal approved' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed' }
  }
}

/**
 * Reject withdrawal (admin only)
 */
export async function rejectWithdrawal(
  withdrawalId: string,
  adminUid: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    await runTransaction(db, async (transaction) => {
      const wRef = doc(db, 'withdrawals', withdrawalId)
      const wSnap = await transaction.get(wRef)

      if (!wSnap.exists()) throw new Error('Not found')

      const withdrawal = wSnap.data()
      if (withdrawal.status !== 'pending') {
        throw new Error('Already processed')
      }

      transaction.update(wRef, {
        status: 'rejected',
        adminNote: reason || 'Rejected by admin',
        processedBy: adminUid,
        processedAt: serverTimestamp(),
      })

      // Notification
      const notifRef = doc(collection(db, 'notifications'))
      transaction.set(notifRef, {
        notifId: notifRef.id,
        uid: withdrawal.uid,
        type: 'withdrawal_rejected',
        title: '🚫 Withdrawal Rejected',
        message: `Your withdrawal of ₹${withdrawal.amount.toLocaleString()} was rejected. ${reason || 'Contact support.'}`,
        isRead: false,
        createdAt: serverTimestamp(),
      })
    })

    return { success: true, message: 'Withdrawal rejected' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed' }
  }
}

/**
 * Get pending deposits (admin)
 */
export function subscribeToPendingDeposits(
  callback: (deposits: any[]) => void
): () => void {
  const q = query(
    collection(db, 'deposits'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id })))
  })
}

/**
 * Get pending withdrawals (admin)
 */
export function subscribeToPendingWithdrawals(
  callback: (withdrawals: any[]) => void
): () => void {
  const q = query(
    collection(db, 'withdrawals'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id })))
  })
}

/**
 * Send broadcast notification to all users (admin)
 */
export async function sendBroadcastNotification(
  title: string,
  message: string,
  adminUid: string
): Promise<void> {
  const usersSnap = await getDocs(
    query(collection(db, 'users'), where('status', '==', 'active'))
  )

  const batch = writeBatch(db)

  usersSnap.docs.forEach((userDoc) => {
    const notifRef = doc(collection(db, 'notifications'))
    batch.set(notifRef, {
      notifId: notifRef.id,
      uid: userDoc.id,
      type: 'admin_announcement',
      title,
      message,
      isRead: false,
      sentBy: adminUid,
      createdAt: serverTimestamp(),
    })
  })

  await batch.commit()
}

/**
 * Get platform stats (admin dashboard)
 */
export async function getPlatformStats(): Promise<{
  totalUsers: number
  totalDeposits: number
  totalWithdrawals: number
  pendingDeposits: number
  pendingWithdrawals: number
  totalRevenue: number
}> {
  try {
    const [
      usersSnap,
      depositsSnap,
      withdrawalsSnap,
      pendingDepSnap,
      pendingWithSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(
        query(
          collection(db, 'deposits'),
          where('status', '==', 'approved')
        )
      ),
      getDocs(
        query(
          collection(db, 'withdrawals'),
          where('status', '==', 'approved')
        )
      ),
      getDocs(
        query(
          collection(db, 'deposits'),
          where('status', '==', 'pending')
        )
      ),
      getDocs(
        query(
          collection(db, 'withdrawals'),
          where('status', '==', 'pending')
        )
      ),
    ])

    let totalDeposits = 0
    depositsSnap.docs.forEach((d) => {
      totalDeposits += d.data().amount || 0
    })

    let totalWithdrawals = 0
    withdrawalsSnap.docs.forEach((d) => {
      totalWithdrawals += d.data().amount || 0
    })

    return {
      totalUsers: usersSnap.size,
      totalDeposits,
      totalWithdrawals,
      pendingDeposits: pendingDepSnap.size,
      pendingWithdrawals: pendingWithSnap.size,
      totalRevenue: totalDeposits - totalWithdrawals,
    }
  } catch (error) {
    console.error('getPlatformStats error:', error)
    return {
      totalUsers: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      pendingDeposits: 0,
      pendingWithdrawals: 0,
      totalRevenue: 0,
    }
  }
}

// ============================================================
// GAME HISTORY SERVICES
// ============================================================

/**
 * Save game result to history
 */
export async function saveGameHistory(
  uid: string,
  gameType: string,
  result: {
    betAmount: number
    winAmount: number
    isWin: boolean
    gameId: string
    details?: Record<string, any>
  }
): Promise<void> {
  const batch = writeBatch(db)

  const histRef = doc(collection(db, 'game_history'))
  batch.set(histRef, {
    historyId: histRef.id,
    uid,
    gameType,
    ...result,
    profit: result.winAmount - result.betAmount,
    createdAt: serverTimestamp(),
  })

  const userRef = doc(db, 'users', uid)
  batch.update(userRef, {
    totalGames: increment(1),
    totalBet: increment(result.betAmount),
    totalWin: result.isWin ? increment(result.winAmount) : increment(0),
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
}

/**
 * Get user game history
 */
export function subscribeToGameHistory(
  uid: string,
  limitCount: number,
  callback: (history: any[]) => void
): () => void {
  const q = query(
    collection(db, 'game_history'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id })))
  })
}
