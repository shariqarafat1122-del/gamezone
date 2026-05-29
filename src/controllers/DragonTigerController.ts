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
import { DragonTigerRound, DragonTigerBet, DragonTigerOption, Card, CardRank, CardSuit } from '../types';
import { creditWallet, createNotification } from '../firebase/userService';

const ROUND_DURATION = 25000;
const BET_LOCK_TIME = 15000;

const SUITS: CardSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: CardRank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const CARD_VALUES: Record<CardRank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export class DragonTigerController {
  private static instance: DragonTigerController;

  static getInstance(): DragonTigerController {
    if (!DragonTigerController.instance) {
      DragonTigerController.instance = new DragonTigerController();
    }
    return DragonTigerController.instance;
  }

  private drawCard(): Card {
    return {
      rank: RANKS[Math.floor(Math.random() * RANKS.length)],
      suit: SUITS[Math.floor(Math.random() * SUITS.length)],
    };
  }

  async createRound(roundNumber: number): Promise<string> {
    const roundRef = doc(collection(db, 'dragon_tiger_rounds'));
    const round: Omit<DragonTigerRound, 'roundId'> = {
      roundNumber,
      phase: 'betting',
      totalBets: 0,
      totalAmount: 0,
      status: 'active',
      createdAt: serverTimestamp() as unknown as Date,
    };
    await setDoc(roundRef, { roundId: roundRef.id, ...round });

    setTimeout(() => this.lockBets(roundRef.id), BET_LOCK_TIME);
    setTimeout(() => this.dealCards(roundRef.id), ROUND_DURATION - 5000);
    setTimeout(() => this.settleRound(roundRef.id), ROUND_DURATION);

    return roundRef.id;
  }

  async lockBets(roundId: string): Promise<void> {
    await updateDoc(doc(db, 'dragon_tiger_rounds', roundId), { phase: 'locked' });
  }

  async dealCards(roundId: string): Promise<void> {
    const dragonCard = this.drawCard();
    const tigerCard = this.drawCard();
    const dragonValue = CARD_VALUES[dragonCard.rank];
    const tigerValue = CARD_VALUES[tigerCard.rank];

    let result: DragonTigerOption;
    if (dragonValue > tigerValue) result = 'dragon';
    else if (tigerValue > dragonValue) result = 'tiger';
    else result = 'tie';

    await updateDoc(doc(db, 'dragon_tiger_rounds', roundId), {
      phase: 'result',
      dragonCard,
      tigerCard,
      result,
    });
  }

  async placeBet(roundId: string, uid: string, userName: string, option: DragonTigerOption, amount: number): Promise<string> {
    const roundSnap = await getDoc(doc(db, 'dragon_tiger_rounds', roundId));
    if (!roundSnap.exists()) throw new Error('Round not found');
    const round = roundSnap.data() as DragonTigerRound;
    if (round.phase !== 'betting') throw new Error('Betting is locked');

    const betRef = doc(collection(db, 'dragon_tiger_bets'));
    const bet: Omit<DragonTigerBet, 'betId'> = {
      roundId,
      uid,
      userName,
      option,
      amount,
      createdAt: serverTimestamp() as unknown as Date,
    };
    await setDoc(betRef, { betId: betRef.id, ...bet });
    await updateDoc(doc(db, 'dragon_tiger_rounds', roundId), {
      totalBets: (round.totalBets || 0) + 1,
      totalAmount: (round.totalAmount || 0) + amount,
    });
    return betRef.id;
  }

  async settleRound(roundId: string): Promise<void> {
    const roundSnap = await getDoc(doc(db, 'dragon_tiger_rounds', roundId));
    if (!roundSnap.exists()) return;
    const round = roundSnap.data() as DragonTigerRound;
    if (!round.result) return;

    const betsQ = query(collection(db, 'dragon_tiger_bets'), where('roundId', '==', roundId));
    const betsSnap = await getDocs(betsQ);

    const batch = writeBatch(db);
    for (const betDoc of betsSnap.docs) {
      const bet = betDoc.data() as DragonTigerBet;
      const isWin = bet.option === round.result;
      const multiplier = bet.option === 'tie' ? 8 : 1.9;
      const winAmount = isWin ? bet.amount * multiplier : 0;
      batch.update(betDoc.ref, { isWin, winAmount });
      if (isWin) {
        await creditWallet(bet.uid, winAmount, 'win', `Dragon Tiger Win - Round #${round.roundNumber}`, roundId);
        await createNotification(bet.uid, 'win_credited', '🐉 You Won!', `₹${winAmount.toFixed(2)} credited for Dragon Tiger Round #${round.roundNumber}`);
      }
    }

    batch.update(doc(db, 'dragon_tiger_rounds', roundId), { phase: 'completed', status: 'completed' });
    await batch.commit();

    setTimeout(() => this.createRound(round.roundNumber + 1), 3000);
  }

  subscribeToActiveRound(callback: (round: DragonTigerRound | null) => void): Unsubscribe {
    const q = query(collection(db, 'dragon_tiger_rounds'), where('status', '==', 'active'), orderBy('roundNumber', 'desc'), limit(1));
    return onSnapshot(q, (snap) => {
      if (snap.empty) { callback(null); return; }
      callback({ ...snap.docs[0].data(), roundId: snap.docs[0].id } as DragonTigerRound);
    });
  }

  async getRoundHistory(limitCount = 10): Promise<DragonTigerRound[]> {
    const q = query(collection(db, 'dragon_tiger_rounds'), where('status', '==', 'completed'), orderBy('roundNumber', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), roundId: d.id } as DragonTigerRound));
  }

  async initializeGame(): Promise<void> {
    const q = query(collection(db, 'dragon_tiger_rounds'), where('status', '==', 'active'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      const histQ = query(collection(db, 'dragon_tiger_rounds'), orderBy('roundNumber', 'desc'), limit(1));
      const histSnap = await getDocs(histQ);
      const lastRound = histSnap.empty ? 0 : (histSnap.docs[0].data().roundNumber as number);
      await this.createRound(lastRound + 1);
    }
  }
}

export const dragonTigerController = DragonTigerController.getInstance();
