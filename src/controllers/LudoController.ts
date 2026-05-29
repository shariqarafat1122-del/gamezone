// src/controllers/LudoController.ts

import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  deleteDoc,
  writeBatch,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type {
  LudoRoom,
  LudoPlayer,
  LudoPiece,
  LudoColor,
  LudoMove,
  LudoWinner,
  TableOption,
} from '../types/ludo.types';
import {
  TABLE_OPTIONS,
  SAFE_SQUARES,
  COLOR_START_OFFSET,
  HOME_COLUMN_ENTRY,
  TOTAL_SQUARES,
} from '../types/ludo.types';

// ============================================================
// BOARD LOGIC
// ============================================================

const COLORS: LudoColor[] = ['red', 'blue', 'green', 'yellow'];
const GAME_DURATION = 180; // 3 minutes in seconds
const TURN_TIME_LIMIT = 15; // 15 seconds per turn
const ELIMINATION_PENALTY = 10;

// Create initial pieces for a player
function createInitialPieces(color: LudoColor): LudoPiece[] {
  return [0, 1, 2, 3].map((i) => ({
    id: `${color}_${i}`,
    color,
    pieceIndex: i,
    position: -1, // -1 = home base
    status: 'home' as const,
    isProtected: false,
    stepsMoved: 0,
  }));
}

// Create initial player
function createPlayer(
  uid: string,
  name: string,
  avatar: string,
  color: LudoColor
): LudoPlayer {
  return {
    uid,
    name,
    avatar,
    color,
    pieces: createInitialPieces(color),
    score: 0,
    eliminationCount: 0,
    finishedPieces: 0,
    isReady: false,
    isConnected: true,
    lastSeen: new Date(),
  };
}

// Get board position for a piece
// Returns absolute board position (0-55 = main track, 56-61 = home column)
export function getAbsolutePosition(color: LudoColor, relativePos: number): number {
  if (relativePos < 0) return -1; // home base
  const offset = COLOR_START_OFFSET[color];
  return (offset + relativePos) % TOTAL_SQUARES;
}

// Calculate new position after dice roll
export function calculateNewPosition(
  piece: LudoPiece,
  diceValue: number
): { newPosition: number; valid: boolean; reachedHome: boolean } {
  if (piece.status === 'finished') {
    return { newPosition: piece.position, valid: false, reachedHome: false };
  }

  // Piece in home base - needs 6 to enter
  if (piece.position === -1) {
    if (diceValue === 6) {
      return { newPosition: 0, valid: true, reachedHome: false };
    }
    return { newPosition: -1, valid: false, reachedHome: false };
  }

  // Calculate new relative position
  const newRelPos = piece.position + diceValue;

  // Check if reached home (relative position 56 = finished)
  if (newRelPos === 56) {
    return { newPosition: 56, valid: true, reachedHome: true };
  }

  // Cannot overshoot home
  if (newRelPos > 56) {
    return { newPosition: piece.position, valid: false, reachedHome: false };
  }

  return { newPosition: newRelPos, valid: true, reachedHome: false };
}

// Check if a square is safe
export function isSafeSquare(color: LudoColor, relativePosition: number): boolean {
  const absPos = getAbsolutePosition(color, relativePosition);
  return SAFE_SQUARES.includes(absPos) || relativePosition > 50; // home column
}

// Get movable pieces for current player
export function getMovablePieces(
  player: LudoPlayer,
  diceValue: number
): string[] {
  const movable: string[] = [];

  for (const piece of player.pieces) {
    if (piece.status === 'finished') continue;

    const { valid } = calculateNewPosition(piece, diceValue);
    if (valid) {
      movable.push(piece.id);
    }
  }

  return movable;
}

// Check elimination
export function checkElimination(
  movingPiece: LudoPiece,
  newRelPosition: number,
  opponent: LudoPlayer
): LudoPiece | null {
  if (newRelPosition > 50) return null; // home column, no elimination

  const absNewPos = getAbsolutePosition(movingPiece.color, newRelPosition);

  // Check if safe square
  if (SAFE_SQUARES.includes(absNewPos)) return null;

  // Check opponent pieces at same absolute position
  for (const oppPiece of opponent.pieces) {
    if (oppPiece.status !== 'active') continue;

    const oppAbsPos = getAbsolutePosition(opponent.color, oppPiece.position);
    if (oppAbsPos === absNewPos) {
      return oppPiece; // elimination!
    }
  }

  return null;
}

// Calculate score based on piece progress
export function calculateScore(pieces: LudoPiece[]): number {
  let score = 0;
  for (const piece of pieces) {
    if (piece.status === 'finished') {
      score += 56; // full journey
    } else if (piece.status === 'active') {
      score += piece.position;
    }
  }
  return score;
}

// ============================================================
// LUDO CONTROLLER CLASS
// ============================================================

export class LudoController {
  private static timers: Map<string, NodeJS.Timeout> = new Map();
  private static turnTimers: Map<string, NodeJS.Timeout> = new Map();

  // ----------------------------------------------------------
  // FIND OR CREATE ROOM (Matchmaking)
  // ----------------------------------------------------------
  static async findOrCreateRoom(
    betAmount: number,
    uid: string,
    name: string,
    avatar: string
  ): Promise<{ roomId: string; isCreator: boolean }> {
    // Look for waiting room with same bet amount
    const q = query(
      collection(db, 'ludo_rooms'),
      where('betAmount', '==', betAmount),
      where('status', '==', 'waiting'),
      orderBy('createdAt', 'asc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Join existing room
      const roomDoc = snapshot.docs[0];
      const room = roomDoc.data() as LudoRoom;

      // Don't join own room
      if (room.players[0]?.uid === uid) {
        return this.createRoom(betAmount, uid, name, avatar);
      }

      const joined = await this.joinRoom(roomDoc.id, uid, name, avatar);
      if (joined) {
        return { roomId: roomDoc.id, isCreator: false };
      }
    }

    // Create new room
    return this.createRoom(betAmount, uid, name, avatar);
  }

  // ----------------------------------------------------------
  // CREATE ROOM
  // ----------------------------------------------------------
  static async createRoom(
    betAmount: number,
    uid: string,
    name: string,
    avatar: string
  ): Promise<{ roomId: string; isCreator: boolean }> {
    const result = await runTransaction(db, async (transaction) => {
      // Check wallet
      const walletRef = doc(db, 'wallets', uid);
      const walletSnap = await transaction.get(walletRef);

      if (!walletSnap.exists() || walletSnap.data().balance < betAmount) {
        throw new Error('Insufficient balance');
      }

      // Deduct bet amount
      transaction.update(walletRef, {
        balance: walletSnap.data().balance - betAmount,
        updatedAt: serverTimestamp(),
      });

      // Create room
      const roomRef = doc(collection(db, 'ludo_rooms'));
      const player = createPlayer(uid, name, avatar, 'red');
      player.isReady = true;

      const now = Date.now();
      const roomData: Omit<LudoRoom, 'createdAt' | 'updatedAt'> = {
        roomId: roomRef.id,
        betAmount,
        status: 'waiting',
        players: [player],
        currentTurn: '',
        diceValue: 0,
        diceRolled: false,
        gameStatus: 'waiting_turn' as any,
        turnStartTime: 0,
        turnTimeLimit: TURN_TIME_LIMIT,
        gameStartTime: 0,
        gameDuration: GAME_DURATION,
        gameEndTime: 0,
        winner: null,
        movablePieces: [],
        lastMoveTime: now,
        roundNumber: 1,
      };

      transaction.set(roomRef, {
        ...roomData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create transaction record
      const txRef = doc(collection(db, 'transactions'));
      transaction.set(txRef, {
        txId: txRef.id,
        uid,
        type: 'bet',
        amount: betAmount,
        description: `Ludo ₹${betAmount} table - Entry fee`,
        roomId: roomRef.id,
        status: 'completed',
        createdAt: serverTimestamp(),
      });

      return roomRef.id;
    });

    return { roomId: result, isCreator: true };
  }

  // ----------------------------------------------------------
  // JOIN ROOM
  // ----------------------------------------------------------
  static async joinRoom(
    roomId: string,
    uid: string,
    name: string,
    avatar: string
  ): Promise<boolean> {
    try {
      await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, 'ludo_rooms', roomId);
        const roomSnap = await transaction.get(roomRef);

        if (!roomSnap.exists()) throw new Error('Room not found');

        const room = roomSnap.data() as LudoRoom;

        if (room.status !== 'waiting') throw new Error('Room not available');
        if (room.players.length >= 2) throw new Error('Room is full');
        if (room.players.some((p) => p.uid === uid)) throw new Error('Already in room');

        // Check wallet
        const walletRef = doc(db, 'wallets', uid);
        const walletSnap = await transaction.get(walletRef);

        if (!walletSnap.exists() || walletSnap.data().balance < room.betAmount) {
          throw new Error('Insufficient balance');
        }

        // Deduct
        transaction.update(walletRef, {
          balance: walletSnap.data().balance - room.betAmount,
          updatedAt: serverTimestamp(),
        });

        // Create player with blue color (second player)
        const player = createPlayer(uid, name, avatar, 'blue');
        player.isReady = true;

        const now = Date.now();
        const gameEndTime = now + GAME_DURATION * 1000;

        // Update room - matched!
        transaction.update(roomRef, {
          players: [...room.players, player],
          status: 'matched',
          gameStartTime: now,
          gameEndTime,
          currentTurn: room.players[0].uid, // first player starts
          gameStatus: 'rolling',
          turnStartTime: now,
          updatedAt: serverTimestamp(),
        });

        // Transaction for second player
        const txRef = doc(collection(db, 'transactions'));
        transaction.set(txRef, {
          txId: txRef.id,
          uid,
          type: 'bet',
          amount: room.betAmount,
          description: `Ludo ₹${room.betAmount} table - Entry fee`,
          roomId,
          status: 'completed',
          createdAt: serverTimestamp(),
        });
      });

      // Start game after successful join
      setTimeout(() => this.startGame(roomId), 1000);
      return true;
    } catch {
      return false;
    }
  }

  // ----------------------------------------------------------
  // START GAME
  // ----------------------------------------------------------
  static async startGame(roomId: string): Promise<void> {
    const roomRef = doc(db, 'ludo_rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;

    const room = roomSnap.data() as LudoRoom;
    if (room.players.length < 2) return;

    const now = Date.now();
    const gameEndTime = now + GAME_DURATION * 1000;

    await updateDoc(roomRef, {
      status: 'playing',
      gameStatus: 'rolling',
      gameStartTime: now,
      gameEndTime,
      turnStartTime: now,
      updatedAt: serverTimestamp(),
    });

    // Start game timer
    this.startGameTimer(roomId, gameEndTime);
    // Start turn timer
    this.startTurnTimer(roomId, room.currentTurn || room.players[0].uid);
  }

  // ----------------------------------------------------------
  // ROLL DICE
  // ----------------------------------------------------------
  static async rollDice(roomId: string, uid: string): Promise<{
    success: boolean;
    diceValue?: number;
    movablePieces?: string[];
    message?: string;
  }> {
    try {
      return await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, 'ludo_rooms', roomId);
        const roomSnap = await transaction.get(roomRef);

        if (!roomSnap.exists()) {
          return { success: false, message: 'Room not found' };
        }

        const room = roomSnap.data() as LudoRoom;

        if (room.currentTurn !== uid) {
          return { success: false, message: 'Not your turn' };
        }

        if (room.diceRolled) {
          return { success: false, message: 'Dice already rolled' };
        }

        if (room.status !== 'playing') {
          return { success: false, message: 'Game not active' };
        }

        // Roll dice
        const diceValue = Math.floor(Math.random() * 6) + 1;

        // Get current player
        const currentPlayer = room.players.find((p) => p.uid === uid);
        if (!currentPlayer) {
          return { success: false, message: 'Player not found' };
        }

        // Calculate movable pieces
        const movable = getMovablePieces(currentPlayer, diceValue);

        transaction.update(roomRef, {
          diceValue,
          diceRolled: true,
          movablePieces: movable,
          gameStatus: movable.length > 0 ? 'moving' : 'rolling',
          updatedAt: serverTimestamp(),
        });

        // If no movable pieces, auto-skip turn
        if (movable.length === 0) {
          setTimeout(async () => {
            await this.skipTurn(roomId, uid, room);
          }, 1500);
        }

        return { success: true, diceValue, movablePieces: movable };
      });
    } catch (error) {
      console.error('Roll dice error:', error);
      return { success: false, message: 'Failed to roll dice' };
    }
  }

  // ----------------------------------------------------------
  // MOVE PIECE
  // ----------------------------------------------------------
  static async movePiece(
    roomId: string,
    uid: string,
    pieceId: string
  ): Promise<{ success: boolean; eliminated?: boolean; finished?: boolean; message?: string }> {
    try {
      return await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, 'ludo_rooms', roomId);
        const roomSnap = await transaction.get(roomRef);

        if (!roomSnap.exists()) {
          return { success: false, message: 'Room not found' };
        }

        const room = roomSnap.data() as LudoRoom;

        if (room.currentTurn !== uid) {
          return { success: false, message: 'Not your turn' };
        }

        if (!room.diceRolled) {
          return { success: false, message: 'Roll dice first' };
        }

        if (!room.movablePieces.includes(pieceId)) {
          return { success: false, message: 'Cannot move this piece' };
        }

        // Find current player and opponent
        const playerIndex = room.players.findIndex((p) => p.uid === uid);
        const opponentIndex = playerIndex === 0 ? 1 : 0;

        if (playerIndex === -1) {
          return { success: false, message: 'Player not found' };
        }

        const updatedPlayers = room.players.map((p) => ({ ...p, pieces: [...p.pieces] }));
        const currentPlayer = updatedPlayers[playerIndex];
        const opponent = updatedPlayers[opponentIndex];

        // Find piece
        const pieceIdx = currentPlayer.pieces.findIndex((p) => p.id === pieceId);
        if (pieceIdx === -1) {
          return { success: false, message: 'Piece not found' };
        }

        const piece = currentPlayer.pieces[pieceIdx];
        const { newPosition, valid, reachedHome } = calculateNewPosition(piece, room.diceValue);

        if (!valid) {
          return { success: false, message: 'Invalid move' };
        }

        let eliminated = false;
        let extraTurn = room.diceValue === 6;

        // Update piece position
        currentPlayer.pieces[pieceIdx] = {
          ...piece,
          position: newPosition,
          status: reachedHome ? 'finished' : newPosition === -1 ? 'home' : 'active',
          stepsMoved: piece.stepsMoved + room.diceValue,
          isProtected: isSafeSquare(currentPlayer.color, newPosition),
        };

        // If piece entered board (was in home, dice was 6)
        if (piece.position === -1 && newPosition === 0) {
          extraTurn = true; // Extra turn for entering board
        }

        // Check elimination (only if not reaching home and piece is active)
        if (!reachedHome && newPosition > 0 && opponent) {
          const eliminatedPiece = checkElimination(
            currentPlayer.pieces[pieceIdx],
            newPosition,
            opponent
          );

          if (eliminatedPiece) {
            eliminated = true;
            extraTurn = true; // Extra turn for elimination

            // Send eliminated piece back home
            const oppPieceIdx = opponent.pieces.findIndex((p) => p.id === eliminatedPiece.id);
            if (oppPieceIdx !== -1) {
              opponent.pieces[oppPieceIdx] = {
                ...opponent.pieces[oppPieceIdx],
                position: -1,
                status: 'home',
                isProtected: false,
              };
            }

            // Apply penalty
            opponent.score = Math.max(0, opponent.score - ELIMINATION_PENALTY);
            currentPlayer.score += ELIMINATION_PENALTY; // Bonus for elimination
            currentPlayer.eliminationCount += 1;
          }
        }

        // Check if piece finished
        if (reachedHome) {
          currentPlayer.finishedPieces += 1;
          currentPlayer.score += 56; // Max points for finishing
          extraTurn = true; // Extra turn for finishing a piece
        }

        // Recalculate scores
        currentPlayer.score = calculateScore(currentPlayer.pieces);
        if (eliminated) {
          opponent.score = Math.max(0, calculateScore(opponent.pieces) - ELIMINATION_PENALTY);
        }

        // Check if all pieces finished (perfect win)
        const allFinished = currentPlayer.pieces.every((p) => p.status === 'finished');

        // Determine next turn
        const nextTurn = extraTurn ? uid : (opponent?.uid || uid);
        const now = Date.now();

        // Check if game time is up
        const timeUp = now >= room.gameEndTime;

        if (allFinished || timeUp) {
          // End game
          const winner = this.determineWinner(updatedPlayers, room.betAmount);

          transaction.update(roomRef, {
            players: updatedPlayers,
            status: 'finished',
            winner,
            diceRolled: false,
            movablePieces: [],
            gameStatus: 'waiting_turn' as any,
            updatedAt: serverTimestamp(),
          });

          // Credit winner
          if (winner) {
            await this.creditWinner(winner, roomId, transaction);
          }
        } else {
          transaction.update(roomRef, {
            players: updatedPlayers,
            currentTurn: nextTurn,
            diceRolled: false,
            movablePieces: [],
            gameStatus: 'rolling',
            turnStartTime: now,
            updatedAt: serverTimestamp(),
          });
        }

        // Save move to history
        const moveRef = doc(collection(db, 'ludo_moves'));
        transaction.set(moveRef, {
          moveId: moveRef.id,
          roomId,
          uid,
          pieceId,
          fromPosition: piece.position,
          toPosition: newPosition,
          diceValue: room.diceValue,
          eliminated,
          timestamp: now,
          createdAt: serverTimestamp(),
        });

        return { success: true, eliminated, finished: reachedHome };
      });
    } catch (error) {
      console.error('Move piece error:', error);
      return { success: false, message: 'Failed to move piece' };
    }
  }

  // ----------------------------------------------------------
  // SKIP TURN (no movable pieces)
  // ----------------------------------------------------------
  private static async skipTurn(
    roomId: string,
    uid: string,
    room: LudoRoom
  ): Promise<void> {
    const roomRef = doc(db, 'ludo_rooms', roomId);
    const opponent = room.players.find((p) => p.uid !== uid);

    await updateDoc(roomRef, {
      currentTurn: opponent?.uid || uid,
      diceRolled: false,
      movablePieces: [],
      gameStatus: 'rolling',
      turnStartTime: Date.now(),
      updatedAt: serverTimestamp(),
    });
  }

  // ----------------------------------------------------------
  // AUTO-SKIP TURN (timer expired)
  // ----------------------------------------------------------
  static async autoSkipTurn(roomId: string, uid: string): Promise<void> {
    const roomRef = doc(db, 'ludo_rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;

    const room = roomSnap.data() as LudoRoom;
    if (room.currentTurn !== uid || room.status !== 'playing') return;

    const opponent = room.players.find((p) => p.uid !== uid);

    await updateDoc(roomRef, {
      currentTurn: opponent?.uid || uid,
      diceRolled: false,
      movablePieces: [],
      gameStatus: 'rolling',
      turnStartTime: Date.now(),
      updatedAt: serverTimestamp(),
    });
  }

  // ----------------------------------------------------------
  // DETERMINE WINNER
  // ----------------------------------------------------------
  static determineWinner(players: LudoPlayer[], betAmount: number): LudoWinner | null {
    if (players.length === 0) return null;

    const tableOption = TABLE_OPTIONS.find((t) => t.betAmount === betAmount);
    const prize = tableOption ? tableOption.prize : betAmount * 1.8;

    // Sort by score (higher = winner)
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];

    return {
      uid: winner.uid,
      name: winner.name,
      color: winner.color,
      score: winner.score,
      prize,
    };
  }

  // ----------------------------------------------------------
  // CREDIT WINNER
  // ----------------------------------------------------------
  private static async creditWinner(
    winner: LudoWinner,
    roomId: string,
    transaction: any
  ): Promise<void> {
    const walletRef = doc(db, 'wallets', winner.uid);
    const walletSnap = await transaction.get(walletRef);

    if (walletSnap.exists()) {
      transaction.update(walletRef, {
        balance: walletSnap.data().balance + winner.prize,
        updatedAt: serverTimestamp(),
      });
    }

    // Create win transaction
    const txRef = doc(collection(db, 'transactions'));
    transaction.set(txRef, {
      txId: txRef.id,
      uid: winner.uid,
      type: 'win',
      amount: winner.prize,
      description: `Ludo win - ₹${winner.prize} credited`,
      roomId,
      status: 'completed',
      createdAt: serverTimestamp(),
    });

    // Create notification
    const notifRef = doc(collection(db, 'notifications'));
    transaction.set(notifRef, {
      notifId: notifRef.id,
      uid: winner.uid,
      type: 'win',
      title: '🎉 You Won!',
      message: `Congratulations! You won ₹${winner.prize} in Ludo!`,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  }

  // ----------------------------------------------------------
  // GAME TIMER
  // ----------------------------------------------------------
  static startGameTimer(roomId: string, gameEndTime: number): void {
    this.clearGameTimer(roomId);

    const checkInterval = setInterval(async () => {
      const now = Date.now();

      if (now >= gameEndTime) {
        clearInterval(checkInterval);
        this.timers.delete(roomId);

        // End game by time
        await this.endGameByTime(roomId);
      }
    }, 1000);

    this.timers.set(roomId, checkInterval);
  }

  static clearGameTimer(roomId: string): void {
    const timer = this.timers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(roomId);
    }
  }

  // ----------------------------------------------------------
  // TURN TIMER
  // ----------------------------------------------------------
  static startTurnTimer(roomId: string, uid: string): void {
    this.clearTurnTimer(roomId);

    let elapsed = 0;
    const timer = setInterval(async () => {
      elapsed += 1;
      if (elapsed >= TURN_TIME_LIMIT) {
        clearInterval(timer);
        this.turnTimers.delete(roomId);
        await this.autoSkipTurn(roomId, uid);
      }
    }, 1000);

    this.turnTimers.set(roomId, timer);
  }

  static clearTurnTimer(roomId: string): void {
    const timer = this.turnTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.turnTimers.delete(roomId);
    }
  }

  // ----------------------------------------------------------
  // END GAME BY TIME
  // ----------------------------------------------------------
  static async endGameByTime(roomId: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const roomRef = doc(db, 'ludo_rooms', roomId);
      const roomSnap = await transaction.get(roomRef);

      if (!roomSnap.exists()) return;

      const room = roomSnap.data() as LudoRoom;
      if (room.status === 'finished') return;

      const winner = this.determineWinner(room.players, room.betAmount);

      transaction.update(roomRef, {
        status: 'finished',
        winner,
        updatedAt: serverTimestamp(),
      });

      if (winner) {
        await this.creditWinner(winner, roomId, transaction);
      }
    });

    // Cleanup and create new table
    setTimeout(() => this.cleanupAndCreateNewRoom(roomId), 3000);
  }

  // ----------------------------------------------------------
  // CLEANUP AND CREATE NEW ROOM
  // ----------------------------------------------------------
  static async cleanupAndCreateNewRoom(roomId: string): Promise<void> {
    const roomRef = doc(db, 'ludo_rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;

    const room = roomSnap.data() as LudoRoom;
    const betAmount = room.betAmount;

    // Remove finished room from lobby
    await updateDoc(roomRef, {
      status: 'finished',
      updatedAt: serverTimestamp(),
    });

    // Clear all timers
    this.clearGameTimer(roomId);
    this.clearTurnTimer(roomId);
  }

  // ----------------------------------------------------------
  // LEAVE ROOM
  // ----------------------------------------------------------
  static async leaveRoom(roomId: string, uid: string): Promise<void> {
    const roomRef = doc(db, 'ludo_rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;

    const room = roomSnap.data() as LudoRoom;

    if (room.status === 'waiting') {
      // Refund if waiting
      await runTransaction(db, async (transaction) => {
        const walletRef = doc(db, 'wallets', uid);
        const walletSnap = await transaction.get(walletRef);
        if (walletSnap.exists()) {
          transaction.update(walletRef, {
            balance: walletSnap.data().balance + room.betAmount,
            updatedAt: serverTimestamp(),
          });
        }
        transaction.update(roomRef, {
          status: 'abandoned',
          updatedAt: serverTimestamp(),
        });
      });
    } else if (room.status === 'playing') {
      // Other player wins by forfeit
      const winner = room.players.find((p) => p.uid !== uid);
      if (winner) {
        const ludoWinner: LudoWinner = {
          uid: winner.uid,
          name: winner.name,
          color: winner.color,
          score: winner.score,
          prize: TABLE_OPTIONS.find((t) => t.betAmount === room.betAmount)?.prize || room.betAmount * 1.8,
        };

        await runTransaction(db, async (transaction) => {
          const walletRef = doc(db, 'wallets', winner.uid);
          const walletSnap = await transaction.get(walletRef);
          if (walletSnap.exists()) {
            transaction.update(walletRef, {
              balance: walletSnap.data().balance + ludoWinner.prize,
              updatedAt: serverTimestamp(),
            });
          }
          transaction.update(roomRef, {
            status: 'finished',
            winner: ludoWinner,
            updatedAt: serverTimestamp(),
          });
        });
      }
    }
  }

  // ----------------------------------------------------------
  // SUBSCRIPTIONS
  // ----------------------------------------------------------
  static subscribeToRoom(
    roomId: string,
    callback: (room: LudoRoom) => void
  ): () => void {
    return onSnapshot(doc(db, 'ludo_rooms', roomId), (snap) => {
      if (snap.exists()) {
        callback({ ...snap.data(), roomId: snap.id } as LudoRoom);
      }
    });
  }

  static subscribeToLobby(
    betAmount: number,
    callback: (rooms: LudoRoom[]) => void
  ): () => void {
    const q = query(
      collection(db, 'ludo_rooms'),
      where('betAmount', '==', betAmount),
      where('status', '==', 'waiting'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    return onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs.map((d) => ({
        ...d.data(),
        roomId: d.id,
      } as LudoRoom));
      callback(rooms);
    });
  }
}
