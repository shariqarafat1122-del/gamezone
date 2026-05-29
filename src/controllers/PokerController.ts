// src/controllers/PokerController.ts

import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type {
  Card,
  Suit,
  Rank,
  PokerTable,
  PokerPlayer,
  TableConfig,
  TableCategory,
  GamePhase,
  BettingAction,
  HandResult,
  HandRank,
  PokerWinner,
  SidePot,
} from '../types/poker.types';

// ============================================================
// TABLE CONFIGURATIONS
// ============================================================

export const TABLE_CONFIGS: Record<TableCategory, TableConfig> = {
  micro: {
    category: 'micro',
    smallBlind: 5,
    bigBlind: 10,
    minBuyIn: 100,
    maxBuyIn: 1000,
    minPlayers: 2,
    maxPlayers: 4,
    label: '₹10 - ₹100',
    color: '#10B981',
  },
  low: {
    category: 'low',
    smallBlind: 25,
    bigBlind: 50,
    minBuyIn: 300,
    maxBuyIn: 3000,
    minPlayers: 2,
    maxPlayers: 4,
    label: '₹50 - ₹300',
    color: '#3B82F6',
  },
  medium: {
    category: 'medium',
    smallBlind: 50,
    bigBlind: 100,
    minBuyIn: 500,
    maxBuyIn: 5000,
    minPlayers: 2,
    maxPlayers: 4,
    label: '₹100 - ₹500',
    color: '#8B5CF6',
  },
  high: {
    category: 'high',
    smallBlind: 100,
    bigBlind: 200,
    minBuyIn: 600,
    maxBuyIn: 6000,
    minPlayers: 2,
    maxPlayers: 4,
    label: '₹200 - ₹600',
    color: '#F59E0B',
  },
  vip: {
    category: 'vip',
    smallBlind: 250,
    bigBlind: 500,
    minBuyIn: 1000,
    maxBuyIn: 10000,
    minPlayers: 2,
    maxPlayers: 4,
    label: '₹500 - ₹1000',
    color: '#EF4444',
  },
};

// ============================================================
// DECK UTILITIES
// ============================================================

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: RANK_VALUES[rank] });
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================
// HAND EVALUATION ENGINE
// ============================================================

export class HandEvaluator {
  static evaluate(holeCards: Card[], communityCards: Card[]): HandResult {
    const allCards = [...holeCards, ...communityCards];
    const combinations = this.getCombinations(allCards, 5);
    
    let bestHand: HandResult | null = null;
    
    for (const combo of combinations) {
      const result = this.evaluateHand(combo);
      if (!bestHand || result.rankValue > bestHand.rankValue) {
        bestHand = result;
      }
    }
    
    return bestHand!;
  }

  private static getCombinations(cards: Card[], k: number): Card[][] {
    if (k === 0) return [[]];
    if (cards.length === 0) return [];
    const [first, ...rest] = cards;
    const withFirst = this.getCombinations(rest, k - 1).map(combo => [first, ...combo]);
    const withoutFirst = this.getCombinations(rest, k);
    return [...withFirst, ...withoutFirst];
  }

  private static evaluateHand(cards: Card[]): HandResult {
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    
    const isFlush = this.checkFlush(sorted);
    const isStraight = this.checkStraight(sorted);
    const groups = this.getGroups(sorted);

    // Royal Flush
    if (isFlush && isStraight && sorted[0].value === 14 && sorted[4].value === 10) {
      return {
        rank: 'Royal Flush',
        rankValue: 900000 + sorted[0].value,
        cards: sorted,
        description: 'Royal Flush',
      };
    }

    // Straight Flush
    if (isFlush && isStraight) {
      return {
        rank: 'Straight Flush',
        rankValue: 800000 + sorted[0].value,
        cards: sorted,
        description: `Straight Flush, ${sorted[0].rank} high`,
      };
    }

    // Four of a Kind
    if (groups[0] === 4) {
      const quadRank = this.getGroupRank(sorted, 4);
      return {
        rank: 'Four of a Kind',
        rankValue: 700000 + quadRank * 100,
        cards: sorted,
        description: `Four of a Kind, ${sorted.find(c => c.value === quadRank)?.rank}s`,
      };
    }

    // Full House
    if (groups[0] === 3 && groups[1] === 2) {
      const tripRank = this.getGroupRank(sorted, 3);
      return {
        rank: 'Full House',
        rankValue: 600000 + tripRank * 100,
        cards: sorted,
        description: `Full House, ${sorted.find(c => c.value === tripRank)?.rank}s full`,
      };
    }

    // Flush
    if (isFlush) {
      return {
        rank: 'Flush',
        rankValue: 500000 + sorted[0].value * 10000 + sorted[1].value * 100,
        cards: sorted,
        description: `Flush, ${sorted[0].rank} high`,
      };
    }

    // Straight
    if (isStraight) {
      return {
        rank: 'Straight',
        rankValue: 400000 + sorted[0].value,
        cards: sorted,
        description: `Straight, ${sorted[0].rank} high`,
      };
    }

    // Three of a Kind
    if (groups[0] === 3) {
      const tripRank = this.getGroupRank(sorted, 3);
      return {
        rank: 'Three of a Kind',
        rankValue: 300000 + tripRank * 100,
        cards: sorted,
        description: `Three of a Kind, ${sorted.find(c => c.value === tripRank)?.rank}s`,
      };
    }

    // Two Pair
    if (groups[0] === 2 && groups[1] === 2) {
      const pairs = this.getPairRanks(sorted);
      return {
        rank: 'Two Pair',
        rankValue: 200000 + pairs[0] * 1000 + pairs[1] * 10,
        cards: sorted,
        description: `Two Pair, ${sorted.find(c => c.value === pairs[0])?.rank}s and ${sorted.find(c => c.value === pairs[1])?.rank}s`,
      };
    }

    // One Pair
    if (groups[0] === 2) {
      const pairRank = this.getGroupRank(sorted, 2);
      return {
        rank: 'One Pair',
        rankValue: 100000 + pairRank * 1000,
        cards: sorted,
        description: `One Pair, ${sorted.find(c => c.value === pairRank)?.rank}s`,
      };
    }

    // High Card
    return {
      rank: 'High Card',
      rankValue: sorted[0].value * 1000 + sorted[1].value * 100,
      cards: sorted,
      description: `High Card, ${sorted[0].rank}`,
    };
  }

  private static checkFlush(cards: Card[]): boolean {
    return cards.every(c => c.suit === cards[0].suit);
  }

  private static checkStraight(cards: Card[]): boolean {
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    
    // Check normal straight
    let isStraight = true;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].value - sorted[i + 1].value !== 1) {
        isStraight = false;
        break;
      }
    }
    if (isStraight) return true;

    // Check Ace-low straight (A-2-3-4-5)
    const values = sorted.map(c => c.value);
    const aceLow = [14, 5, 4, 3, 2];
    return JSON.stringify(values) === JSON.stringify(aceLow);
  }

  private static getGroups(cards: Card[]): number[] {
    const counts: Record<number, number> = {};
    for (const card of cards) {
      counts[card.value] = (counts[card.value] || 0) + 1;
    }
    return Object.values(counts).sort((a, b) => b - a);
  }

  private static getGroupRank(cards: Card[], size: number): number {
    const counts: Record<number, number> = {};
    for (const card of cards) {
      counts[card.value] = (counts[card.value] || 0) + 1;
    }
    for (const [rank, count] of Object.entries(counts)) {
      if (count === size) return Number(rank);
    }
    return 0;
  }

  private static getPairRanks(cards: Card[]): number[] {
    const counts: Record<number, number> = {};
    for (const card of cards) {
      counts[card.value] = (counts[card.value] || 0) + 1;
    }
    return Object.entries(counts)
      .filter(([, count]) => count === 2)
      .map(([rank]) => Number(rank))
      .sort((a, b) => b - a);
  }
}

// ============================================================
// POKER CONTROLLER CLASS
// ============================================================

export class PokerController {
  private static ACTION_TIMEOUT = 30000; // 30 seconds per action
  private static timers: Map<string, NodeJS.Timeout> = new Map();

  // ----------------------------------------------------------
  // CREATE TABLE
  // ----------------------------------------------------------
  static async createTable(category: TableCategory): Promise<string> {
    const config = TABLE_CONFIGS[category];
    const tableRef = doc(collection(db, 'poker_tables'));
    
    const tableData: Omit<PokerTable, 'tableId'> = {
      category,
      config,
      players: [],
      communityCards: [],
      deck: [],
      pot: 0,
      sidePots: [],
      currentBet: 0,
      phase: 'waiting',
      activePlayerIndex: -1,
      dealerIndex: -1,
      smallBlindIndex: -1,
      bigBlindIndex: -1,
      winners: [],
      roundNumber: 0,
      actionTimer: 30,
      isActive: true,
      isFull: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(tableRef, {
      ...tableData,
      tableId: tableRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return tableRef.id;
  }

  // ----------------------------------------------------------
  // FIND OR CREATE TABLE
  // ----------------------------------------------------------
  static async findAvailableTable(category: TableCategory): Promise<string> {
    const config = TABLE_CONFIGS[category];
    
    const q = query(
      collection(db, 'poker_tables'),
      where('category', '==', category),
      where('isActive', '==', true),
      where('isFull', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }

    return this.createTable(category);
  }

  // ----------------------------------------------------------
  // JOIN TABLE
  // ----------------------------------------------------------
  static async joinTable(
    tableId: string,
    uid: string,
    name: string,
    avatar: string,
    buyIn: number
  ): Promise<{ success: boolean; message: string; seatIndex?: number }> {
    try {
      return await runTransaction(db, async (transaction) => {
        const tableRef = doc(db, 'poker_tables', tableId);
        const tableSnap = await transaction.get(tableRef);

        if (!tableSnap.exists()) {
          return { success: false, message: 'Table not found' };
        }

        const table = tableSnap.data() as PokerTable;

        if (table.isFull) {
          return { success: false, message: 'Table is full' };
        }

        // Check if player already seated
        const existingPlayer = table.players.find(p => p.uid === uid);
        if (existingPlayer) {
          return { success: false, message: 'Already seated at this table' };
        }

        // Validate buy-in
        if (buyIn < table.config.minBuyIn || buyIn > table.config.maxBuyIn) {
          return {
            success: false,
            message: `Buy-in must be between ₹${table.config.minBuyIn} and ₹${table.config.maxBuyIn}`,
          };
        }

        // Check wallet balance
        const walletRef = doc(db, 'wallets', uid);
        const walletSnap = await transaction.get(walletRef);

        if (!walletSnap.exists() || walletSnap.data().balance < buyIn) {
          return { success: false, message: 'Insufficient balance' };
        }

        // Find empty seat
        const occupiedSeats = table.players.map(p => p.seatIndex);
        let seatIndex = -1;
        for (let i = 0; i < table.config.maxPlayers; i++) {
          if (!occupiedSeats.includes(i)) {
            seatIndex = i;
            break;
          }
        }

        if (seatIndex === -1) {
          return { success: false, message: 'No available seats' };
        }

        // Deduct wallet
        transaction.update(walletRef, {
          balance: walletSnap.data().balance - buyIn,
          updatedAt: serverTimestamp(),
        });

        // Create player object
        const newPlayer: PokerPlayer = {
          uid,
          name,
          avatar,
          seatIndex,
          chipStack: buyIn,
          holeCards: [],
          currentBet: 0,
          totalBetInRound: 0,
          status: 'waiting',
          isDealer: false,
          isSmallBlind: false,
          isBigBlind: false,
          joinedAt: new Date(),
        };

        const updatedPlayers = [...table.players, newPlayer];
        const isFull = updatedPlayers.length >= table.config.maxPlayers;

        transaction.update(tableRef, {
          players: updatedPlayers,
          isFull,
          updatedAt: serverTimestamp(),
        });

        // Create transaction record
        const txRef = doc(collection(db, 'transactions'));
        transaction.set(txRef, {
          txId: txRef.id,
          uid,
          type: 'bet',
          amount: buyIn,
          description: `Poker buy-in at ${table.config.label} table`,
          tableId,
          status: 'completed',
          createdAt: serverTimestamp(),
        });

        return { success: true, message: 'Joined table successfully', seatIndex };
      });
    } catch (error) {
      console.error('Join table error:', error);
      return { success: false, message: 'Failed to join table' };
    }
  }

  // ----------------------------------------------------------
  // LEAVE TABLE
  // ----------------------------------------------------------
  static async leaveTable(tableId: string, uid: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const tableRef = doc(db, 'poker_tables', tableId);
      const tableSnap = await transaction.get(tableRef);

      if (!tableSnap.exists()) return;

      const table = tableSnap.data() as PokerTable;
      const player = table.players.find(p => p.uid === uid);

      if (!player) return;

      // Return chips to wallet if not in active game
      if (table.phase === 'waiting' && player.chipStack > 0) {
        const walletRef = doc(db, 'wallets', uid);
        const walletSnap = await transaction.get(walletRef);

        if (walletSnap.exists()) {
          transaction.update(walletRef, {
            balance: walletSnap.data().balance + player.chipStack,
            updatedAt: serverTimestamp(),
          });
        }
      } else if (table.phase !== 'waiting') {
        // Mark as folded if in active game
        const updatedPlayers = table.players.map(p =>
          p.uid === uid ? { ...p, status: 'folded' as const } : p
        );
        transaction.update(tableRef, {
          players: updatedPlayers,
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const updatedPlayers = table.players.filter(p => p.uid !== uid);
      transaction.update(tableRef, {
        players: updatedPlayers,
        isFull: false,
        updatedAt: serverTimestamp(),
      });
    });
  }

  // ----------------------------------------------------------
  // START GAME (when enough players)
  // ----------------------------------------------------------
  static async startRound(tableId: string): Promise<void> {
    const tableRef = doc(db, 'poker_tables', tableId);
    const tableSnap = await getDoc(tableRef);

    if (!tableSnap.exists()) return;

    const table = tableSnap.data() as PokerTable;
    const activePlayers = table.players.filter(
      p => p.status !== 'sitting-out' && p.chipStack >= table.config.bigBlind
    );

    if (activePlayers.length < 2) return;

    // Create fresh deck
    const deck = createDeck();

    // Determine dealer position
    const newDealerIndex = table.roundNumber === 0
      ? 0
      : (table.dealerIndex + 1) % activePlayers.length;

    const smallBlindIndex = (newDealerIndex + 1) % activePlayers.length;
    const bigBlindIndex = (newDealerIndex + 2) % activePlayers.length;

    // Reset players
    const resetPlayers = table.players.map(p => ({
      ...p,
      holeCards: [],
      currentBet: 0,
      totalBetInRound: 0,
      status: 'active' as const,
      lastAction: undefined,
      handResult: undefined,
      isWinner: false,
      winAmount: 0,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
    }));

    // Assign roles
    const activeSeatIndices = activePlayers.map(p => p.seatIndex);
    
    resetPlayers.forEach((p, i) => {
      if (p.seatIndex === activeSeatIndices[newDealerIndex]) p.isDealer = true;
      if (p.seatIndex === activeSeatIndices[smallBlindIndex]) p.isSmallBlind = true;
      if (p.seatIndex === activeSeatIndices[bigBlindIndex]) p.isBigBlind = true;
    });

    // Post blinds
    const smallBlind = table.config.smallBlind;
    const bigBlind = table.config.bigBlind;

    resetPlayers.forEach(p => {
      if (p.isSmallBlind) {
        const sbAmount = Math.min(smallBlind, p.chipStack);
        p.chipStack -= sbAmount;
        p.currentBet = sbAmount;
        p.totalBetInRound = sbAmount;
      }
      if (p.isBigBlind) {
        const bbAmount = Math.min(bigBlind, p.chipStack);
        p.chipStack -= bbAmount;
        p.currentBet = bbAmount;
        p.totalBetInRound = bbAmount;
      }
    });

    const pot = smallBlind + bigBlind;

    // Deal hole cards (2 per player)
    let deckIndex = 0;
    const updatedDeck = [...deck];

    resetPlayers.forEach(p => {
      if (p.status === 'active') {
        p.holeCards = [updatedDeck[deckIndex++], updatedDeck[deckIndex++]];
      }
    });

    const remainingDeck = updatedDeck.slice(deckIndex);

    // First action is player after big blind
    const firstActionIndex = (bigBlindIndex + 1) % activePlayers.length;

    await updateDoc(tableRef, {
      players: resetPlayers,
      deck: remainingDeck,
      communityCards: [],
      pot,
      sidePots: [],
      currentBet: bigBlind,
      phase: 'pre-flop',
      activePlayerIndex: firstActionIndex,
      dealerIndex: newDealerIndex,
      smallBlindIndex,
      bigBlindIndex,
      winners: [],
      roundNumber: table.roundNumber + 1,
      actionTimer: 30,
      updatedAt: serverTimestamp(),
    });

    // Start action timer
    this.startActionTimer(tableId);
  }

  // ----------------------------------------------------------
  // PLAYER ACTION
  // ----------------------------------------------------------
  static async playerAction(
    tableId: string,
    uid: string,
    action: BettingAction,
    raiseAmount?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      return await runTransaction(db, async (transaction) => {
        const tableRef = doc(db, 'poker_tables', tableId);
        const tableSnap = await transaction.get(tableRef);

        if (!tableSnap.exists()) {
          return { success: false, message: 'Table not found' };
        }

        const table = tableSnap.data() as PokerTable;
        const activePlayers = table.players.filter(
          p => p.status === 'active' || p.status === 'all-in'
        );

        const currentPlayerSeat = activePlayers[table.activePlayerIndex]?.seatIndex;
        const player = table.players.find(p => p.seatIndex === currentPlayerSeat);

        if (!player || player.uid !== uid) {
          return { success: false, message: 'Not your turn' };
        }

        let updatedPlayers = [...table.players];
        let pot = table.pot;
        let currentBet = table.currentBet;
        const playerIndex = updatedPlayers.findIndex(p => p.uid === uid);

        switch (action) {
          case 'fold':
            updatedPlayers[playerIndex].status = 'folded';
            updatedPlayers[playerIndex].lastAction = 'fold';
            break;

          case 'check':
            if (table.currentBet > updatedPlayers[playerIndex].currentBet) {
              return { success: false, message: 'Cannot check, must call or raise' };
            }
            updatedPlayers[playerIndex].lastAction = 'check';
            break;

          case 'call': {
            const callAmount = Math.min(
              currentBet - updatedPlayers[playerIndex].currentBet,
              updatedPlayers[playerIndex].chipStack
            );
            updatedPlayers[playerIndex].chipStack -= callAmount;
            updatedPlayers[playerIndex].currentBet += callAmount;
            updatedPlayers[playerIndex].totalBetInRound += callAmount;
            updatedPlayers[playerIndex].lastAction = 'call';
            pot += callAmount;

            if (updatedPlayers[playerIndex].chipStack === 0) {
              updatedPlayers[playerIndex].status = 'all-in';
            }
            break;
          }

          case 'raise': {
            if (!raiseAmount || raiseAmount <= currentBet) {
              return { success: false, message: 'Raise amount must be greater than current bet' };
            }
            const raiseTotal = raiseAmount - updatedPlayers[playerIndex].currentBet;
            if (raiseTotal > updatedPlayers[playerIndex].chipStack) {
              return { success: false, message: 'Insufficient chips' };
            }
            updatedPlayers[playerIndex].chipStack -= raiseTotal;
            updatedPlayers[playerIndex].currentBet = raiseAmount;
            updatedPlayers[playerIndex].totalBetInRound += raiseTotal;
            updatedPlayers[playerIndex].lastAction = 'raise';
            currentBet = raiseAmount;
            pot += raiseTotal;
            break;
          }

          case 'all-in': {
            const allInAmount = updatedPlayers[playerIndex].chipStack;
            pot += allInAmount;
            updatedPlayers[playerIndex].currentBet += allInAmount;
            updatedPlayers[playerIndex].totalBetInRound += allInAmount;
            updatedPlayers[playerIndex].chipStack = 0;
            updatedPlayers[playerIndex].status = 'all-in';
            updatedPlayers[playerIndex].lastAction = 'all-in';
            if (updatedPlayers[playerIndex].currentBet > currentBet) {
              currentBet = updatedPlayers[playerIndex].currentBet;
            }
            break;
          }
        }

        // Check if round of betting is complete
        const stillActive = updatedPlayers.filter(p => p.status === 'active');
        const bettingComplete = this.isBettingComplete(updatedPlayers, currentBet);

        let nextPhase = table.phase;
        let nextDeck = table.deck;
        let communityCards = table.communityCards;
        let nextActiveIndex = table.activePlayerIndex;

        if (bettingComplete || stillActive.length <= 1) {
          // Move to next phase
          const result = await this.advancePhase(
            table.phase,
            updatedPlayers,
            table.deck,
            communityCards,
            pot
          );

          nextPhase = result.phase;
          nextDeck = result.deck;
          communityCards = result.communityCards;
          pot = result.pot;
          updatedPlayers = result.players;

          if (result.winners && result.winners.length > 0) {
            // Game over - update wallets
            for (const winner of result.winners) {
              const walletRef = doc(db, 'wallets', winner.uid);
              const walletSnap = await transaction.get(walletRef);
              if (walletSnap.exists()) {
                transaction.update(walletRef, {
                  balance: walletSnap.data().balance + winner.amount,
                  updatedAt: serverTimestamp(),
                });
              }
            }

            transaction.update(tableRef, {
              players: updatedPlayers,
              communityCards,
              deck: nextDeck,
              pot: 0,
              currentBet: 0,
              phase: 'finished',
              winners: result.winners,
              updatedAt: serverTimestamp(),
            });

            return { success: true, message: 'Action processed' };
          }

          // Reset bets for new street
          updatedPlayers = updatedPlayers.map(p => ({
            ...p,
            currentBet: 0,
          }));
          currentBet = 0;

          // First player after dealer acts first in post-flop
          const smallBlindSeat = updatedPlayers.find(p => p.isSmallBlind)?.seatIndex;
          nextActiveIndex = updatedPlayers.findIndex(
            p => p.seatIndex === smallBlindSeat && p.status === 'active'
          );
          if (nextActiveIndex === -1) nextActiveIndex = 0;
        } else {
          // Find next active player
          let next = (table.activePlayerIndex + 1) % activePlayers.length;
          while (updatedPlayers.find(p => p.seatIndex === activePlayers[next].seatIndex)?.status !== 'active') {
            next = (next + 1) % activePlayers.length;
          }
          nextActiveIndex = next;
        }

        transaction.update(tableRef, {
          players: updatedPlayers,
          communityCards,
          deck: nextDeck,
          pot,
          currentBet,
          phase: nextPhase,
          activePlayerIndex: nextActiveIndex,
          updatedAt: serverTimestamp(),
        });

        return { success: true, message: 'Action processed' };
      });
    } catch (error) {
      console.error('Player action error:', error);
      return { success: false, message: 'Failed to process action' };
    }
  }

  // ----------------------------------------------------------
  // ADVANCE PHASE
  // ----------------------------------------------------------
  private static async advancePhase(
    currentPhase: GamePhase,
    players: PokerPlayer[],
    deck: Card[],
    communityCards: Card[],
    pot: number
  ): Promise<{
    phase: GamePhase;
    deck: Card[];
    communityCards: Card[];
    pot: number;
    players: PokerPlayer[];
    winners?: PokerWinner[];
  }> {
    const activePlayers = players.filter(
      p => p.status === 'active' || p.status === 'all-in'
    );

    // If only one player left, they win
    if (activePlayers.filter(p => p.status === 'active').length <= 1) {
      const winner = activePlayers[0];
      const winners: PokerWinner[] = [{
        uid: winner.uid,
        name: winner.name,
        amount: pot,
        handRank: 'High Card',
        handDescription: 'Won by default (all others folded)',
        cards: winner.holeCards,
      }];

      const updatedPlayers = players.map(p =>
        p.uid === winner.uid
          ? { ...p, chipStack: p.chipStack + pot, isWinner: true, winAmount: pot }
          : p
      );

      return { phase: 'finished', deck, communityCards, pot: 0, players: updatedPlayers, winners };
    }

    switch (currentPhase) {
      case 'pre-flop': {
        // Deal flop (3 cards)
        const flopCards = [deck[0], deck[1], deck[2]];
        return {
          phase: 'flop',
          deck: deck.slice(3),
          communityCards: [...communityCards, ...flopCards],
          pot,
          players,
        };
      }

      case 'flop': {
        // Deal turn (1 card)
        return {
          phase: 'turn',
          deck: deck.slice(1),
          communityCards: [...communityCards, deck[0]],
          pot,
          players,
        };
      }

      case 'turn': {
        // Deal river (1 card)
        return {
          phase: 'river',
          deck: deck.slice(1),
          communityCards: [...communityCards, deck[0]],
          pot,
          players,
        };
      }

      case 'river': {
        // Showdown
        return this.showdown(players, communityCards, pot, deck);
      }

      default:
        return { phase: 'finished', deck, communityCards, pot, players };
    }
  }

  // ----------------------------------------------------------
  // SHOWDOWN
  // ----------------------------------------------------------
  private static showdown(
    players: PokerPlayer[],
    communityCards: Card[],
    pot: number,
    deck: Card[]
  ): {
    phase: GamePhase;
    deck: Card[];
    communityCards: Card[];
    pot: number;
    players: PokerPlayer[];
    winners: PokerWinner[];
  } {
    const activePlayers = players.filter(
      p => p.status === 'active' || p.status === 'all-in'
    );

    // Evaluate hands
    const handResults = activePlayers.map(p => ({
      player: p,
      result: HandEvaluator.evaluate(p.holeCards, communityCards),
    }));

    // Sort by hand rank (highest first)
    handResults.sort((a, b) => b.result.rankValue - a.result.rankValue);

    // Determine winner(s)
    const bestRankValue = handResults[0].result.rankValue;
    const winningHands = handResults.filter(h => h.result.rankValue === bestRankValue);

    const prizePerWinner = Math.floor(pot / winningHands.length);

    const winners: PokerWinner[] = winningHands.map(h => ({
      uid: h.player.uid,
      name: h.player.name,
      amount: prizePerWinner,
      handRank: h.result.rank,
      handDescription: h.result.description,
      cards: h.result.cards,
    }));

    const updatedPlayers = players.map(p => {
      const winner = winners.find(w => w.uid === p.uid);
      const handResult = handResults.find(h => h.player.uid === p.uid);
      return {
        ...p,
        isWinner: !!winner,
        winAmount: winner?.amount || 0,
        chipStack: p.chipStack + (winner?.amount || 0),
        handResult: handResult?.result,
      };
    });

    return {
      phase: 'showdown',
      deck,
      communityCards,
      pot: 0,
      players: updatedPlayers,
      winners,
    };
  }

  // ----------------------------------------------------------
  // CHECK BETTING COMPLETE
  // ----------------------------------------------------------
  private static isBettingComplete(players: PokerPlayer[], currentBet: number): boolean {
    const activePlayers = players.filter(p => p.status === 'active');
    return activePlayers.every(p => p.currentBet === currentBet);
  }

  // ----------------------------------------------------------
  // ACTION TIMER
  // ----------------------------------------------------------
  private static startActionTimer(tableId: string): void {
    this.clearTimer(tableId);
    
    let timeLeft = 30;
    const timer = setInterval(async () => {
      timeLeft--;
      
      if (timeLeft <= 0) {
        this.clearTimer(tableId);
        // Auto-fold current player
        const tableSnap = await getDoc(doc(db, 'poker_tables', tableId));
        if (tableSnap.exists()) {
          const table = tableSnap.data() as PokerTable;
          const activePlayers = table.players.filter(p => p.status === 'active');
          const currentPlayer = activePlayers[table.activePlayerIndex];
          if (currentPlayer) {
            await this.playerAction(tableId, currentPlayer.uid, 'fold');
          }
        }
      } else {
        await updateDoc(doc(db, 'poker_tables', tableId), {
          actionTimer: timeLeft,
        });
      }
    }, 1000);

    this.timers.set(tableId, timer);
  }

  private static clearTimer(tableId: string): void {
    const timer = this.timers.get(tableId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(tableId);
    }
  }

  // ----------------------------------------------------------
  // SAVE MATCH HISTORY
  // ----------------------------------------------------------
  static async saveMatchHistory(tableId: string, table: PokerTable): Promise<void> {
    const matchRef = doc(collection(db, 'poker_matches'));
    
    await setDoc(matchRef, {
      matchId: matchRef.id,
      tableId,
      category: table.category,
      players: table.players.map(p => ({
        uid: p.uid,
        name: p.name,
        holeCards: p.holeCards,
        finalStack: p.chipStack,
        profit: p.chipStack - (table.config.minBuyIn),
        handResult: p.handResult || null,
        isWinner: p.isWinner || false,
      })),
      communityCards: table.communityCards,
      pot: table.pot,
      winners: table.winners,
      phase: table.phase,
      roundNumber: table.roundNumber,
      startedAt: serverTimestamp(),
      completedAt: serverTimestamp(),
    });
  }

  // ----------------------------------------------------------
  // REALTIME SUBSCRIPTION
  // ----------------------------------------------------------
  static subscribeToTable(
    tableId: string,
    callback: (table: PokerTable) => void
  ): () => void {
    return onSnapshot(
      doc(db, 'poker_tables', tableId),
      (snap) => {
        if (snap.exists()) {
          callback({ ...snap.data(), tableId: snap.id } as PokerTable);
        }
      }
    );
  }

  static subscribeToLobby(
    category: TableCategory,
    callback: (tables: PokerTable[]) => void
  ): () => void {
    const q = query(
      collection(db, 'poker_tables'),
      where('category', '==', category),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    return onSnapshot(q, (snapshot) => {
      const tables = snapshot.docs.map(d => ({
        ...d.data(),
        tableId: d.id,
      } as PokerTable));
      callback(tables);
    });
  }

  // ----------------------------------------------------------
  // GET TABLE STATS
  // ----------------------------------------------------------
  static async getTableStats(): Promise<{
    totalTables: number;
    activePlayers: number;
    totalPot: number;
  }> {
    const q = query(
      collection(db, 'poker_tables'),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    let activePlayers = 0;
    let totalPot = 0;

    snapshot.docs.forEach(d => {
      const table = d.data() as PokerTable;
      activePlayers += table.players.length;
      totalPot += table.pot;
    });

    return {
      totalTables: snapshot.size,
      activePlayers,
      totalPot,
    };
  }
}
