// src/firebase/userService.ts
import { doc, runTransaction, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'  // ← adjust './config' to match your firebase init file

/**
 * Debits amount from walletBalance and logs a transaction.
 * Throws if balance is insufficient.
 */
export async function debitWallet(
  uid: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string
): Promise<void> {
  const userRef = doc(db, 'users', uid)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists()) throw new Error('User not found')
    const data = snap.data()
    const balance: number = data.walletBalance ?? 0
    if (balance < amount) throw new Error('Insufficient balance')
    tx.update(userRef, {
      walletBalance: balance - amount,
      totalBet: (data.totalBet ?? 0) + amount,
      updatedAt: serverTimestamp(),
    })
  })

  await addDoc(collection(db, 'transactions'), {
    uid,
    type,
    amount,
    description,
    referenceId: referenceId ?? null,
    status: 'completed',
    createdAt: serverTimestamp(),
  })
}

/**
 * Credits amount to walletBalance and logs a transaction.
 */
export async function creditWallet(
  uid: string,
  amount: number,
  type: string,
  description: string,
  referenceId?: string
): Promise<void> {
  const userRef = doc(db, 'users', uid)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists()) throw new Error('User not found')
    const data = snap.data()
    tx.update(userRef, {
      walletBalance: (data.walletBalance ?? 0) + amount,
      totalWin: (data.totalWin ?? 0) + amount,
      updatedAt: serverTimestamp(),
    })
  })

  await addDoc(collection(db, 'transactions'), {
    uid,
    type,
    amount,
    description,
    referenceId: referenceId ?? null,
    status: 'completed',
    createdAt: serverTimestamp(),
  })
}
