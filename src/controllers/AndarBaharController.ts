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
import { AndarBaharRound, AndarBaharBet, AndarBaharOption, Card, CardRank, CardSuit } from '../types';
import { creditWallet, createNotification } from '../firebase/userService';

const ROUND_DURATION = 25000;
const BET_LOCK_TIME = 15000;

const SUITS: CardSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: CardRank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export class AndarBaharController {
  private static instance: AndarBaharController;

  static getInstance(): AndarBaharController {
    if (!AndarBaharController.instance) {
      AndarBaharController.instance = new AndarBaharController();
    }
    return AndarBaharController.instance;
  }

  private drawCard(): Card {
    return {
      rank: RANKS[Math.floor(Math.random() * RANKS.length)],
      suit: SUITS[Math.floor(Math.random() * SUITS.length)],
    };
  }

  async createRound(roundNumber: number): Promise<string> {
    const roundRef = doc(collection(db, 'andar_bahar_rounds'));
    const round: Omit<AndarBaharRound, 'roundId'> = {
      roundNumber,
      phase: 'betting',
      andarCards: [],
      baharCards: [],
      totalBets: 0,
      totalAmount: 0,
      status: 'active',
      createdAt: serverTimestamp() as unknown as Date,
    };
    await setDoc(roundRef, { roundId: roundRef.id, ...round });

    setTimeout(() => this.lockBets(roundRef.id), BET_LOCK_TIME);
    setTimeout(() => this.dealCenterCard(roundRef.id), BET_LOCK_TIME + 1000);
    setTimeout(() => this.settleRound(roundRef.id), ROUND_DURATION);

    return roundRef.id;
  }

  async lockBets(roundId: string): Promise<void> {
    await updateDoc(doc(db, 'andar_bahar_rounds', roundId), { phase: 'locked' });
  }

  async dealCenterCard(roundId: string): Promise<void> {
    const centerCard = this.drawCard();
    const andarCards: Card[] = [];
    const baharCards: Card[] = [];
    let found = false;
    let isAndar = true;

    while (!found) {
      const card = this.drawCard();
      if (isAndar) andarCards.push(card);
      else baharCards.push(card);
      if (card.rank === centerCard.rank) { found = true; }
      isAndar = !isAndar;
      if (andarCards.length + baharCards.length > 52) break;
    }

    const result: AndarBaharOption = found
      ? (andarCards[andarCards.length - 1]?.rank === centerCard.rank ? 'andar' : 'bahar')
      : 'bahar';

    await updateDoc(doc(db, 'andar_bahar_rounds', roundId), {
      phase: 'result',
      centerCard,
      andarCards,
      baharCards,
      result,
    });
  }

  async placeBet(roundId: string, uid: string, userName: string, option: AndarBaharOption, amount: number): Promise<string> {
    const roundSnap = await getDoc(doc(db, 'andar_bahar_rounds', roundId));
    if (!roundSnap.exists()) throw new Error('Round not found');
    const round = roundSnap.data() as AndarBaharRound;
    if (round.phase !== 'betting') throw new Error('Betting is locked');

    const betRef = doc(collection(db, 'andar_bahar_bets'));
    const bet: Omit<AndarBaharBet, 'betId'> = {
      roundId,
      uid,
      userName,
      option,
      amount,
      createdAt: serverTimestamp() as unknown as Date,
    };
    await setDoc(betRef, { betId: betRef.id, ...bet });
    await updateDoc(doc(db, 'andar_bahar_rounds', roundId), {
      totalBets: (round.totalBets || 0) + 1,
      totalAmount: (round.totalAmount || 0) + amount,
    });
    return betRef.id;
  }

  async settleRound(roundId: string): Promise<void> {
    const roundSnap = await getDoc(doc(db, 'andar_bahar_rounds', roundId));
    if (!roundSnap.exists()) return;
    const round = roundSnap.data() as AndarBaharRound;
    if (!round.result) return;

    const betsQ = query(collection(db, 'andar_bahar_bets'), where('roundId', '==', roundId));
    const betsSnap = await getDocs(betsQ);

    const batch = writeBatch(db);
    for (const betDoc of betsSnap.docs) {
      const bet = betDoc.data() as AndarBaharBet;
      const isWin = bet.option === round.result;
      const winAmount = isWin ? bet.amount * 1.9 : 0;
      batch.update(betDoc.ref, { isWin, winAmount });
      if (isWin) {
        await creditWallet(bet.uid, winAmount, 'win', `Andar Bahar Win - Round #${round.roundNumber}`, roundId);
        await createNotification(bet.uid, 'win_credited', '🎴 You Won!', `₹${winAmount.toFixed(2)} credited for Andar Bahar Round #${round.roundNumber}`);
      }
    }

    batch.update(doc(db, 'andar_bahar_rounds', roundId), { phase: 'completed', status: 'completed' });
    await batch.commit();

    setTimeout(() => this.createRound(round.roundNumber + 1), 3000);
  }

  subscribeToActiveRound(callback: (round: AndarBaharRound | null) => void): Unsubscribe {
    const q = query(collection(db, 'andar_bahar_rounds'), where('status', '==', 'active'), orderBy('roundNumber', 'desc'), limit(1));
    return onSnapshot(q, (snap) => {
      if (snap.empty) { callback(null); return; }
      callback({ ...snap.docs[0].data(), roundId: snap.docs[0].id } as AndarBaharRound);
    });
  }

  async initializeGame(): Promise<void> {
    const q = query(collection(db, 'andar_bahar_rounds'), where('status', '==', 'active'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      const histQ = query(collection(db, 'andar_bahar_rounds'), orderBy('roundNumber', 'desc'), limit(1));
      const histSnap = await getDocs(histQ);
      const lastRound = histSnap.empty ? 0 : (histSnap.docs[0].data().roundNumber as number);
      await this.createRound(lastRound + 1);
    }
  }
}

export const andarBaharController = AndarBaharController.getInstance();
