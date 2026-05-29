import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { UserProfile, Transaction, DepositRequest, WithdrawalRequest, Notification } from '../types';

// ============================================================
// USER PROFILE SERVICES
// ============================================================

export const createUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  const defaultProfile: Omit<UserProfile, 'uid'> = {
    name: data.name || 'Player',
    username: data.username || `player_${uid.slice(0, 6)}`,
    email: data.email || '',
    mobile: data.mobile || '',
    avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
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
    createdAt: serverTimestamp() as unknown as Date,
  };
  await setDoc(userRef, { uid, ...defaultProfile, ...data }, { merge: true });
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return { ...snap.data(), uid: snap.id } as UserProfile;
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { ...data, updatedAt: serverTimestamp() });
};

export const subscribeToUserProfile = (uid: string, callback: (user: UserProfile | null) => void): Unsubscribe => {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(userRef, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ ...snap.data(), uid: snap.id } as UserProfile);
  });
};

export const getAllUsers = async (limitCount = 50): Promise<UserProfile[]> => {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), uid: d.id } as UserProfile));
};

export const searchUsers = async (searchTerm: string): Promise<UserProfile[]> => {
  const q = query(
    collection(db, 'users'),
    where('username', '>=', searchTerm),
    where('username', '<=', searchTerm + '\uf8ff'),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), uid: d.id } as UserProfile));
};

// ============================================================
// WALLET SERVICES
// ============================================================

export const creditWallet = async (
  uid: string,
  amount: number,
  type: 'deposit' | 'win' | 'bonus' | 'refund',
  description: string,
  referenceId?: string
): Promise<void> => {
  const batch = writeBatch(db);
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('User not found');

  const userData = userSnap.data() as UserProfile;
  const balanceBefore = userData.walletBalance;
  const balanceAfter = balanceBefore + amount;

  batch.update(userRef, {
    walletBalance: balanceAfter,
    ...(type === 'deposit' && { depositBalance: (userData.depositBalance || 0) + amount, totalDeposit: (userData.totalDeposit || 0) + amount }),
    ...(type === 'win' && { winningBalance: (userData.winningBalance || 0) + amount, totalWin: (userData.totalWin || 0) + amount }),
    updatedAt: serverTimestamp(),
  });

  const txRef = doc(collection(db, 'transactions'));
  const tx: Omit<Transaction, 'id'> = {
    uid,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    description,
    status: 'completed',
    referenceId,
    createdAt: serverTimestamp() as unknown as Date,
  };
  batch.set(txRef, tx);
  await batch.commit();
};

export const debitWallet = async (
  uid: string,
  amount: number,
  type: 'withdrawal' | 'bet',
  description: string,
  referenceId?: string
): Promise<void> => {
  const batch = writeBatch(db);
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('User not found');

  const userData = userSnap.data() as UserProfile;
  if (userData.walletBalance < amount) throw new Error('Insufficient balance');

  const balanceBefore = userData.walletBalance;
  const balanceAfter = balanceBefore - amount;

  batch.update(userRef, {
    walletBalance: balanceAfter,
    ...(type === 'withdrawal' && { totalWithdraw: (userData.totalWithdraw || 0) + amount }),
    ...(type === 'bet' && { totalBet: (userData.totalBet || 0) + amount }),
    updatedAt: serverTimestamp(),
  });

  const txRef = doc(collection(db, 'transactions'));
  const tx: Omit<Transaction, 'id'> = {
    uid,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    description,
    status: 'completed',
    referenceId,
    createdAt: serverTimestamp() as unknown as Date,
  };
  batch.set(txRef, tx);
  await batch.commit();
};

// ============================================================
// DEPOSIT SERVICES
// ============================================================

export const createDepositRequest = async (uid: string, userName: string, amount: number, utr: string): Promise<string> => {
  const reqRef = doc(collection(db, 'deposits'));
  const req: Omit<DepositRequest, 'requestId'> = {
    uid,
    userName,
    amount,
    utr,
    status: 'pending',
    createdAt: serverTimestamp() as unknown as Date,
  };
  await setDoc(reqRef, { requestId: reqRef.id, ...req });
  return reqRef.id;
};

export const getUserDeposits = async (uid: string): Promise<DepositRequest[]> => {
  const q = query(collection(db, 'deposits'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), requestId: d.id } as DepositRequest));
};

export const getPendingDeposits = async (): Promise<DepositRequest[]> => {
  const q = query(collection(db, 'deposits'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), requestId: d.id } as DepositRequest));
};

export const approveDeposit = async (requestId: string, adminId: string): Promise<void> => {
  const reqRef = doc(db, 'deposits', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error('Request not found');
  const reqData = reqSnap.data() as DepositRequest;

  await updateDoc(reqRef, { status: 'approved', updatedAt: serverTimestamp() });
  await creditWallet(reqData.uid, reqData.amount, 'deposit', `Deposit approved - UTR: ${reqData.utr}`, requestId);
  await createNotification(reqData.uid, 'deposit_approved', 'Deposit Approved! 🎉', `₹${reqData.amount} has been credited to your wallet.`);
  await logAdminAction(adminId, 'APPROVE_DEPOSIT', requestId, `Approved deposit of ₹${reqData.amount} for user ${reqData.uid}`);
};

export const rejectDeposit = async (requestId: string, adminId: string, reason: string): Promise<void> => {
  const reqRef = doc(db, 'deposits', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error('Request not found');
  const reqData = reqSnap.data() as DepositRequest;

  await updateDoc(reqRef, { status: 'rejected', adminNote: reason, updatedAt: serverTimestamp() });
  await createNotification(reqData.uid, 'deposit_rejected', 'Deposit Rejected', `Your deposit of ₹${reqData.amount} was rejected. Reason: ${reason}`);
  await logAdminAction(adminId, 'REJECT_DEPOSIT', requestId, `Rejected deposit of ₹${reqData.amount}`);
};

// ============================================================
// WITHDRAWAL SERVICES
// ============================================================

export const createWithdrawalRequest = async (uid: string, userName: string, amount: number, upiId: string): Promise<string> => {
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) throw new Error('User not found');
  const userData = userSnap.data() as UserProfile;
  if (userData.walletBalance < amount) throw new Error('Insufficient balance');

  const reqRef = doc(collection(db, 'withdrawals'));
  const req: Omit<WithdrawalRequest, 'requestId'> = {
    uid,
    userName,
    amount,
    upiId,
    status: 'pending',
    createdAt: serverTimestamp() as unknown as Date,
  };
  await setDoc(reqRef, { requestId: reqRef.id, ...req });
  await updateDoc(doc(db, 'users', uid), { walletBalance: userData.walletBalance - amount, updatedAt: serverTimestamp() });
  return reqRef.id;
};

export const getUserWithdrawals = async (uid: string): Promise<WithdrawalRequest[]> => {
  const q = query(collection(db, 'withdrawals'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), requestId: d.id } as WithdrawalRequest));
};

export const getPendingWithdrawals = async (): Promise<WithdrawalRequest[]> => {
  const q = query(collection(db, 'withdrawals'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), requestId: d.id } as WithdrawalRequest));
};

export const approveWithdrawal = async (requestId: string, adminId: string): Promise<void> => {
  const reqRef = doc(db, 'withdrawals', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error('Request not found');
  const reqData = reqSnap.data() as WithdrawalRequest;

  await updateDoc(reqRef, { status: 'approved', updatedAt: serverTimestamp() });
  const txRef = doc(collection(db, 'transactions'));
  await setDoc(txRef, {
    uid: reqData.uid,
    type: 'withdrawal',
    amount: reqData.amount,
    description: `Withdrawal to UPI: ${reqData.upiId}`,
    status: 'completed',
    referenceId: requestId,
    createdAt: serverTimestamp(),
  });
  await createNotification(reqData.uid, 'withdrawal_approved', 'Withdrawal Approved! 💸', `₹${reqData.amount} has been transferred to ${reqData.upiId}`);
  await logAdminAction(adminId, 'APPROVE_WITHDRAWAL', requestId, `Approved withdrawal of ₹${reqData.amount}`);
};

export const rejectWithdrawal = async (requestId: string, adminId: string, reason: string): Promise<void> => {
  const reqRef = doc(db, 'withdrawals', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error('Request not found');
  const reqData = reqSnap.data() as WithdrawalRequest;

  await updateDoc(reqRef, { status: 'rejected', adminNote: reason, updatedAt: serverTimestamp() });
  // Refund wallet
  const userRef = doc(db, 'users', reqData.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data() as UserProfile;
    await updateDoc(userRef, { walletBalance: userData.walletBalance + reqData.amount });
  }
  await createNotification(reqData.uid, 'withdrawal_rejected', 'Withdrawal Rejected', `Your withdrawal of ₹${reqData.amount} was rejected. Amount refunded. Reason: ${reason}`);
  await logAdminAction(adminId, 'REJECT_WITHDRAWAL', requestId, `Rejected withdrawal of ₹${reqData.amount}`);
};

// ============================================================
// TRANSACTION SERVICES
// ============================================================

export const getUserTransactions = async (uid: string, limitCount = 20): Promise<Transaction[]> => {
  const q = query(collection(db, 'transactions'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Transaction));
};

// ============================================================
// NOTIFICATION SERVICES
// ============================================================

export const createNotification = async (uid: string, type: Notification['type'], title: string, message: string, data?: Record<string, unknown>): Promise<void> => {
  const notifRef = doc(collection(db, 'notifications'));
  await setDoc(notifRef, {
    id: notifRef.id,
    uid,
    type,
    title,
    message,
    isRead: false,
    data: data || {},
    createdAt: serverTimestamp(),
  });
};

export const getUserNotifications = async (uid: string): Promise<Notification[]> => {
  const q = query(collection(db, 'notifications'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(30));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Notification));
};

export const subscribeToNotifications = (uid: string, callback: (notifs: Notification[]) => void): Unsubscribe => {
  const q = query(collection(db, 'notifications'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(30));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as Notification)));
  });
};

export const markNotificationRead = async (notifId: string): Promise<void> => {
  await updateDoc(doc(db, 'notifications', notifId), { isRead: true });
};

export const markAllNotificationsRead = async (uid: string): Promise<void> => {
  const q = query(collection(db, 'notifications'), where('uid', '==', uid), where('isRead', '==', false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { isRead: true }));
  await batch.commit();
};

// ============================================================
// ADMIN LOG SERVICES
// ============================================================

export const logAdminAction = async (adminId: string, action: string, targetId: string, details: string): Promise<void> => {
  const logRef = doc(collection(db, 'admin_logs'));
  await setDoc(logRef, {
    logId: logRef.id,
    adminId,
    action,
    targetId,
    details,
    createdAt: serverTimestamp(),
  });
};

// ============================================================
// APP SETTINGS
// ============================================================

export const getAppSettings = async () => {
  const snap = await getDoc(doc(db, 'settings', 'app'));
  if (!snap.exists()) return null;
  return snap.data();
};

export const broadcastNotification = async (title: string, message: string, type: string): Promise<void> => {
  const announcementRef = doc(collection(db, 'admin_announcements'));
  await setDoc(announcementRef, {
    id: announcementRef.id,
    title,
    message,
    type,
    isActive: true,
    createdAt: serverTimestamp(),
  });
};
