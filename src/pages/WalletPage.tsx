// src/firebase/userService.ts
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
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
  DocumentData,
} from 'firebase/firestore'
import { db } from './config'
import type {
  UserProfile,
  WalletData,
  Transaction,
  Notification,
  DepositRequest,
  WithdrawalRequest,
} from '../types'

// ============================================================
// USER SERVICES
// ============================================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (snap.exists()) return snap.data() as UserProfile
    return null
  } catch {
    return null
  }
}

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

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, 'name' | 'username' | 'avatar' | 'mobile'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): () => void {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? (snap.data() as UserProfile) : null)
  })
}

// ============================================================
// WALLET SERVICES
// ============================================================

export async function getWallet(uid: string): Promise<WalletData | null> {
  try {
    const snap = await getDoc(doc(db, 'wallets', uid))
    return snap.exists() ? (snap.data() as WalletData) : null
  } catch {
    return null
  }
}

export function subscribeToWallet(
  uid: string,
  callback: (wallet: WalletData | null) => void
): () => void {
  return onSnapshot(doc(db, 'wallets', uid), (snap) => {
    callback(snap.exists() ? (snap.data() as WalletData) : null)
  })
}

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
    if (!walletSnap.exists()) throw new Error('Wallet not found')

    transaction.update(walletRef, {
      balance: increment(amount),
      updatedAt: serverTimestamp(),
    })

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
      if (!walletSnap.exists()) throw new Error('Wallet not found')

      const currentBalance = walletSnap.data().balance || 0
      if (currentBalance < amount) throw new Error('Insufficient balance')

      transaction.update(walletRef, {
        balance: increment(-amount),
        updatedAt: serverTimestamp(),
      })

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

// ✅ Fixed: Returns Transaction[] directly
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
    const transactions = snap.docs.map((d) => ({
      ...d.data(),
      txId: d.id,
    } as Transaction))
    callback(transactions)
  })
}

// ✅ Fixed: Returns Transaction[] directly (not paginated object)
export async function getUserTransactions(
  uid: string,
  limitCount = 20
): Promise<Transaction[]> {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({
      ...d.data(),
      txId: d.id,
    } as Transaction))
  } catch {
    return []
  }
}

// ============================================================
// DEPOSIT SERVICES
// ============================================================

export async function createDepositRequest(
  uid: string,
  userName: string,
  amount: number,
  utr: string,
  upiId?: string
): Promise<{ success: boolean; requestId?: string; message?: string }> {
  try {
    if (amount < 100) return { success: false, message: 'Minimum deposit is ₹100' }
    if (amount > 100000) return { success: false, message: 'Maximum deposit is ₹1,00,000' }
    if (!utr || utr.trim().length < 10) return { success: false, message: 'Invalid UTR number' }

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
    return { success: false, message: error.message || 'Failed' }
  }
}

// ✅ Fixed: Added getUserDeposits export
export function subscribeToUserDeposits(
  uid: string,
  callback: (deposits: DepositRequest[]) => void
): () => void {
  const q = query(
    collection(db, 'deposits'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ ...d.data(), id: d.id } as DepositRequest))
    )
  })
}

// ✅ Added: getUserDeposits (async version)
export async function getUserDeposits(uid: string): Promise<DepositRequest[]> {
  try {
    const q = query(
      collection(db, 'deposits'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as DepositRequest))
  } catch {
    return []
  }
}

// ============================================================
// WITHDRAWAL SERVICES
// ============================================================

export async function createWithdrawalRequest(
  uid: string,
  userName: string,
  amount: number,
  upiId: string
): Promise<{ success: boolean; requestId?: string; message?: string }> {
  try {
    if (amount < 100) return { success: false, message: 'Minimum withdrawal is ₹100' }
    if (amount > 50000) return { success: false, message: 'Maximum withdrawal is ₹50,000' }
    if (!upiId || !upiId.includes('@')) return { success: false, message: 'Invalid UPI ID' }

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
    return { success: false, message: error.message || 'Failed' }
  }
}

// ✅ Fixed: Added getUserWithdrawals export
export function subscribeToUserWithdrawals(
  uid: string,
  callback: (withdrawals: WithdrawalRequest[]) => void
): () => void {
  const q = query(
    collection(db, 'withdrawals'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ ...d.data(), id: d.id } as WithdrawalRequest))
    )
  })
}

// ✅ Added: getUserWithdrawals (async version)
export async function getUserWithdrawals(uid: string): Promise<WithdrawalRequest[]> {
  try {
    const q = query(
      collection(db, 'withdrawals'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    } as WithdrawalRequest))
  } catch {
    return []
  }
}

// ============================================================
// NOTIFICATION SERVICES
// ============================================================

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
    callback(
      snap.docs.map((d) => ({
        ...d.data(),
        notifId: d.id,
      } as Notification))
    )
  })
}

export async function markNotificationRead(notifId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notifId), {
    isRead: true,
    readAt: serverTimestamp(),
  })
}

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

export async function getAllUsers(limitCount = 50): Promise<UserProfile[]> {
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => d.data() as UserProfile)
  } catch {
    return []
  }
}

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
  } catch {
    return []
  }
}

export async function setUserStatus(
  uid: string,
  status: 'active' | 'banned' | 'suspended'
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    status,
    updatedAt: serverTimestamp(),
  })
}

export async function setUserRole(
  uid: string,
  role: 'user' | 'admin' | 'moderator'
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    role,
    updatedAt: serverTimestamp(),
  })
}

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
      if (deposit.status !== 'pending') throw new Error('Already processed')

      const walletRef = doc(db, 'wallets', deposit.uid)
      const walletSnap = await transaction.get(walletRef)
      if (!walletSnap.exists()) throw new Error('Wallet not found')

      transaction.update(walletRef, {
        balance: increment(deposit.amount),
        updatedAt: serverTimestamp(),
      })
      transaction.update(depRef, {
        status: 'approved',
        processedBy: adminUid,
        processedAt: serverTimestamp(),
      })
      transaction.update(doc(db, 'users', deposit.uid), {
        totalDeposit: increment(deposit.amount),
        updatedAt: serverTimestamp(),
      })

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

      const notifRef = doc(collection(db, 'notifications'))
      transaction.set(notifRef, {
        notifId: notifRef.id,
        uid: deposit.uid,
        type: 'deposit_approved',
        title: '✅ Deposit Approved!',
        message: `Your deposit of ₹${deposit.amount.toLocaleString()} has been credited.`,
        isRead: false,
        createdAt: serverTimestamp(),
      })
    })
    return { success: true, message: 'Approved successfully' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed' }
  }
}

export async function rejectDeposit(
  depositId: string,
  adminUid: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    await runTransaction(db, async (transaction) => {
      const depRef = doc(db, 'deposits', depositId)
      const depSnap = await transaction.get(depRef)
      if (!depSnap.exists()) throw new Error('Not found')

      const deposit = depSnap.data()
      if (deposit.status !== 'pending') throw new Error('Already processed')

      transaction.update(depRef, {
        status: 'rejected',
        adminNote: reason || 'Rejected',
        processedBy: adminUid,
        processedAt: serverTimestamp(),
      })

      const notifRef = doc(collection(db, 'notifications'))
      transaction.set(notifRef, {
        notifId: notifRef.id,
        uid: deposit.uid,
        type: 'deposit_rejected',
        title: '❌ Deposit Rejected',
        message: `Your deposit of ₹${deposit.amount.toLocaleString()} was rejected. ${reason || ''}`,
        isRead: false,
        createdAt: serverTimestamp(),
      })
    })
    return { success: true, message: 'Rejected' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed' }
  }
}

export async function approveWithdrawal(
  withdrawalId: string,
  adminUid: string
): Promise<{ success: boolean; message: string }> {
  try {
    await runTransaction(db, async (transaction) => {
      const wRef = doc(db, 'withdrawals', withdrawalId)
      const wSnap = await transaction.get(wRef)
      if (!wSnap.exists()) throw new Error('Not found')

      const w = wSnap.data()
      if (w.status !== 'pending') throw new Error('Already processed')

      const walletRef = doc(db, 'wallets', w.uid)
      const walletSnap = await transaction.get(walletRef)
      if (!walletSnap.exists()) throw new Error('Wallet not found')

      const balance = walletSnap.data().balance || 0
      if (balance < w.amount) throw new Error('Insufficient balance')

      transaction.update(walletRef, {
        balance: increment(-w.amount),
        updatedAt: serverTimestamp(),
      })
      transaction.update(wRef, {
        status: 'approved',
        processedBy: adminUid,
        processedAt: serverTimestamp(),
      })
      transaction.update(doc(db, 'users', w.uid), {
        totalWithdraw: increment(w.amount),
        updatedAt: serverTimestamp(),
      })

      const txRef = doc(collection(db, 'transactions'))
      transaction.set(txRef, {
        txId: txRef.id,
        uid: w.uid,
        type: 'withdrawal',
        amount: w.amount,
        description: `Withdrawal to ${w.upiId}`,
        referenceId: withdrawalId,
        status: 'completed',
        createdAt: serverTimestamp(),
      })

      const notifRef = doc(collection(db, 'notifications'))
      transaction.set(notifRef, {
        notifId: notifRef.id,
        uid: w.uid,
        type: 'withdrawal_approved',
        title: '💸 Withdrawal Approved!',
        message: `₹${w.amount.toLocaleString()} sent to ${w.upiId}`,
        isRead: false,
        createdAt: serverTimestamp(),
      })
    })
    return { success: true, message: 'Approved' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed' }
  }
}

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

      const w = wSnap.data()
      if (w.status !== 'pending') throw new Error('Already processed')

      transaction.update(wRef, {
        status: 'rejected',
        adminNote: reason || 'Rejected',
        processedBy: adminUid,
        processedAt: serverTimestamp(),
      })

      const notifRef = doc(collection(db, 'notifications'))
      transaction.set(notifRef, {
        notifId: notifRef.id,
        uid: w.uid,
        type: 'withdrawal_rejected',
        title: '🚫 Withdrawal Rejected',
        message: `₹${w.amount.toLocaleString()} withdrawal rejected. ${reason || ''}`,
        isRead: false,
        createdAt: serverTimestamp(),
      })
    })
    return { success: true, message: 'Rejected' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed' }
  }
}

export function subscribeToPendingDeposits(
  callback: (deposits: DepositRequest[]) => void
): () => void {
  const q = query(
    collection(db, 'deposits'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as DepositRequest)))
  })
}

export function subscribeToPendingWithdrawals(
  callback: (withdrawals: WithdrawalRequest[]) => void
): () => void {
  const q = query(
    collection(db, 'withdrawals'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ ...d.data(), id: d.id } as WithdrawalRequest))
    )
  })
}

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

export async function getPlatformStats(): Promise<{
  totalUsers: number
  totalDeposits: number
  totalWithdrawals: number
  pendingDeposits: number
  pendingWithdrawals: number
  totalRevenue: number
}> {
  try {
    const [usersSnap, approvedDeps, approvedWiths, pendingDeps, pendingWiths] =
      await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'deposits'), where('status', '==', 'approved'))),
        getDocs(query(collection(db, 'withdrawals'), where('status', '==', 'approved'))),
        getDocs(query(collection(db, 'deposits'), where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'withdrawals'), where('status', '==', 'pending'))),
      ])

    let totalDeposits = 0
    approvedDeps.docs.forEach((d) => { totalDeposits += d.data().amount || 0 })

    let totalWithdrawals = 0
    approvedWiths.docs.forEach((d) => { totalWithdrawals += d.data().amount || 0 })

    return {
      totalUsers: usersSnap.size,
      totalDeposits,
      totalWithdrawals,
      pendingDeposits: pendingDeps.size,
      pendingWithdrawals: pendingWiths.size,
      totalRevenue: totalDeposits - totalWithdrawals,
    }
  } catch {
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
