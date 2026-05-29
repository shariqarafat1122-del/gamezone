import {
  doc,
  collection,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { OddEvenRound, OddEvenBet, OddEvenOption } from '../types';
import { creditWallet, createNotification } from '../firebase/userService';

const ROUND_DURATION = 25000;
const BET_LOCK_TIME = 15000;

export class OddEvenController {
  private static instance: OddEvenController;

  static getInstance(): OddEvenController {
    if (!OddEvenController.instance) {
      OddEvenController.instance = new OddEvenController();
    }
    return OddEvenController.instance;
  }

  async createRound(roundNumber: number): Promise<string> {
    const roundRef = doc(collection(db, 'odd_even_rounds'));
    const round: Omit<OddEvenRound, 'roundId'> = {
      roundNumber,
      phase: 'betting',
      totalBets: 0,
      totalAmount: 0,
      status: 'active',
      createdAt: serverTimestamp() as unknown as Date,
    };
    await setDoc(roundRef, { roundId: roundRef.id, ...round });

    setTimeout(() => this.lockBets(roundRef.id), BET_LOCK_TIME);
    setTimeout(() => this.settleRound(roundRef.id), ROUND_DURATION);

    return roundRef.id;
  }

  async lockBets(roundId: string): Promise<void> {
    await updateDoc(doc(db, 'odd_even_rounds', roundId), { phase: 'locked' });
  }

  async placeBet(roundId: string, uid: string, userName: string, option: OddEvenOption, amount: number): Promise<string> {
    const roundSnap = await getDoc(doc(db, 'odd_even_rounds', roundId));
    if (!roundSnap.exists()) throw new Error('Round not found');
    const round = roundSnap.data() as OddEvenRound;
    if (round.phase !== 'betting') throw new Error('Betting is locked');

    const betRef = doc(collection(db, 'odd_even_bets'));
    const bet: Omit<OddEvenBet, 'betId'> = {
      roundId,
      uid,
      userName,
      option,
      amount,
      createdAt: serverTimestamp() as unknown as Date,
    };
    await setDoc(betRef, { betId: betRef.id, ...bet });
    await updateDoc(doc(db, 'odd_even_rounds', roundId), {
      totalBets: (round.totalBets || 0) + 1,
      totalAmount: (round.totalAmount || 0) + amount,
    });
    return betRef.id;
  }

  async settleRound(roundId: string): Promise<void> {
    const roundSnap = await getDoc(doc(db, 'odd_even_rounds', roundId));
    if (!roundSnap.exists()) return;
    const round = roundSnap.data() as OddEvenRound;

    const resultNumber = Math.floor(Math.random() * 100) + 1;
    const result: OddEvenOption = resultNumber % 2 === 0 ? 'even' : 'odd';

    await updateDoc(doc(db, 'odd_even_rounds', roundId), {
      phase: 'result',
      result,
      resultNumber,
    });

    const betsQ = query(collection(db, 'odd_even_bets'), where('roundId', '==', roundId));
    const betsSnap = await getDocs(betsQ);

    const batch = writeBatch(db);
    for (const betDoc of betsSnap.docs) {
      const bet = betDoc.data() as OddEvenBet;
      const isWin = bet.option === result;
      const winAmount = isWin ? bet.amount * 1.9 : 0;
      batch.update(betDoc.ref, { isWin, winAmount });
      if (isWin) {
        await creditWallet(bet.uid, winAmount, 'win', `Odd-Even Win - Round #${round.roundNumber}`, roundId);
        await createNotification(bet.uid, 'win_credited', '🎲 You Won!', `₹${winAmount.toFixed(2)} credited for Odd-Even Round #${round.roundNumber}`);
      }
    }

    batch.update(doc(db, 'odd_even_rounds', roundId), { phase: 'completed', status: 'completed' });
    await batch.commit();

    setTimeout(() => this.createRound(round.roundNumber + 1), 3000);
  }

  subscribeToActiveRound(callback: (round: OddEvenRound | null) => void): Unsubscribe {
    const q = query(collection(db, 'odd_even_rounds'), where('status', '==', 'active'), orderBy('roundNumber', 'desc'), limit(1));
    return onSnapshot(q, (snap) => {
      if (snap.empty) { callback(null); return; }
      callback({ ...snap.docs[0].data(), roundId: snap.docs[0].id } as OddEvenRound);
    });
  }

  async getRoundHistory(limitCount = 10): Promise<OddEvenRound[]> {
    const q = query(collection(db, 'odd_even_rounds'), where('status', '==', 'completed'), orderBy('roundNumber', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), roundId: d.id } as OddEvenRound));
  }

  async initializeGame(): Promise<void> {
    const q = query(collection(db, 'odd_even_rounds'), where('status', '==', 'active'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      const histQ = query(collection(db, 'odd_even_rounds'), orderBy('roundNumber', 'desc'), limit(1));
      const histSnap = await getDocs(histQ);
      const lastRound = histSnap.empty ? 0 : (histSnap.docs[0].data().roundNumber as number);
      await this.createRound(lastRound + 1);
    }
  }
}

export const oddEvenController = OddEvenController.getInstance();
