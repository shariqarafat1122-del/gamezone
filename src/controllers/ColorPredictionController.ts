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
import { ColorRound, ColorBet, ColorOption } from '../types';
import { creditWallet, createNotification } from '../firebase/userService';

const ROUND_DURATION = 25000; // 25 seconds
const BET_LOCK_TIME = 15000;  // 15 seconds
const RESULT_PHASE = 10000;   // 10 seconds

export class ColorPredictionController {
  private static instance: ColorPredictionController;

  static getInstance(): ColorPredictionController {
    if (!ColorPredictionController.instance) {
      ColorPredictionController.instance = new ColorPredictionController();
    }
    return ColorPredictionController.instance;
  }

  // Create a new round
  async createRound(roundNumber: number): Promise<string> {
    const roundRef = doc(collection(db, 'color_rounds'));
    const now = new Date();
    const lockTime = new Date(now.getTime() + BET_LOCK_TIME);
    const resultTime = new Date(now.getTime() + ROUND_DURATION);

    const round: Omit<ColorRound, 'roundId'> = {
      roundNumber,
      phase: 'betting',
      startTime: serverTimestamp() as unknown as Date,
      lockTime: lockTime.toISOString(),
      resultTime: resultTime.toISOString(),
      totalBets: 0,
      totalAmount: 0,
      status: 'active',
    };

    await setDoc(roundRef, { roundId: roundRef.id, ...round });

    // Schedule lock and result phases
    setTimeout(() => this.lockBets(roundRef.id), BET_LOCK_TIME);
    setTimeout(() => this.generateResult(roundRef.id), ROUND_DURATION - RESULT_PHASE);
    setTimeout(() => this.settleRound(roundRef.id), ROUND_DURATION);

    return roundRef.id;
  }

  // Lock bets phase
  async lockBets(roundId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'color_rounds', roundId), { phase: 'locked' });
    } catch (err) {
      console.error('Error locking bets:', err);
    }
  }

  // Generate result
  async generateResult(roundId: string): Promise<ColorOption> {
    const colors: ColorOption[] = ['red', 'green', 'violet'];
    const weights = [45, 45, 10]; // Weighted random
    const total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let result: ColorOption = 'red';
    for (let i = 0; i < colors.length; i++) {
      if (rand < weights[i]) { result = colors[i]; break; }
      rand -= weights[i];
    }
    await updateDoc(doc(db, 'color_rounds', roundId), { phase: 'result', result });
    return result;
  }

  // Place a bet
  async placeBet(roundId: string, uid: string, userName: string, color: ColorOption, amount: number): Promise<string> {
    const roundSnap = await getDoc(doc(db, 'color_rounds', roundId));
    if (!roundSnap.exists()) throw new Error('Round not found');
    const round = roundSnap.data() as ColorRound;
    if (round.phase !== 'betting') throw new Error('Betting is locked');

    const multipliers: Record<ColorOption, number> = { red: 2, green: 2, violet: 9 };
    const betRef = doc(collection(db, 'color_bets'));
    const bet: Omit<ColorBet, 'betId'> = {
      roundId,
      uid,
      userName,
      color,
      amount,
      multiplier: multipliers[color],
      createdAt: serverTimestamp() as unknown as Date,
    };
    await setDoc(betRef, { betId: betRef.id, ...bet });
    await updateDoc(doc(db, 'color_rounds', roundId), {
      totalBets: (round.totalBets || 0) + 1,
      totalAmount: (round.totalAmount || 0) + amount,
    });
    return betRef.id;
  }

  // Settle round - distribute winnings
  async settleRound(roundId: string): Promise<void> {
    const roundSnap = await getDoc(doc(db, 'color_rounds', roundId));
    if (!roundSnap.exists()) return;
    const round = roundSnap.data() as ColorRound;
    if (!round.result) return;

    const betsQ = query(collection(db, 'color_bets'), where('roundId', '==', roundId));
    const betsSnap = await getDocs(betsQ);

    const batch = writeBatch(db);
    for (const betDoc of betsSnap.docs) {
      const bet = betDoc.data() as ColorBet;
      const isWin = bet.color === round.result;
      const winAmount = isWin ? bet.amount * bet.multiplier : 0;
      batch.update(betDoc.ref, { isWin, winAmount });
      if (isWin) {
        await creditWallet(bet.uid, winAmount, 'win', `Color Prediction Win - Round #${round.roundNumber}`, roundId);
        await createNotification(bet.uid, 'win_credited', '🎉 You Won!', `₹${winAmount} credited for Color Prediction Round #${round.roundNumber}`);
      }
    }

    batch.update(doc(db, 'color_rounds', roundId), { phase: 'completed', status: 'completed' });
    await batch.commit();

    // Start next round
    setTimeout(() => this.createRound(round.roundNumber + 1), 3000);
  }

  // Subscribe to active round
  subscribeToActiveRound(callback: (round: ColorRound | null) => void): Unsubscribe {
    const q = query(collection(db, 'color_rounds'), where('status', '==', 'active'), orderBy('roundNumber', 'desc'), limit(1));
    return onSnapshot(q, (snap) => {
      if (snap.empty) { callback(null); return; }
      callback({ ...snap.docs[0].data(), roundId: snap.docs[0].id } as ColorRound);
    });
  }

  // Get round history
  async getRoundHistory(limitCount = 10): Promise<ColorRound[]> {
    const q = query(collection(db, 'color_rounds'), where('status', '==', 'completed'), orderBy('roundNumber', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), roundId: d.id } as ColorRound));
  }

  // Get user bets for a round
  async getUserBetsForRound(roundId: string, uid: string): Promise<ColorBet[]> {
    const q = query(collection(db, 'color_bets'), where('roundId', '==', roundId), where('uid', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), betId: d.id } as ColorBet));
  }

  // Initialize game (start first round if none active)
  async initializeGame(): Promise<void> {
    const q = query(collection(db, 'color_rounds'), where('status', '==', 'active'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      const histQ = query(collection(db, 'color_rounds'), orderBy('roundNumber', 'desc'), limit(1));
      const histSnap = await getDocs(histQ);
      const lastRound = histSnap.empty ? 0 : (histSnap.docs[0].data().roundNumber as number);
      await this.createRound(lastRound + 1);
    }
  }
}

export const colorPredictionController = ColorPredictionController.getInstance();
