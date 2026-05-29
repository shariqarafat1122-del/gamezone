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
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { LudoRoom, LudoPlayer, RoomPlayer } from '../types';
import { creditWallet, debitWallet, createNotification } from '../firebase/userService';

type LudoColor = 'red' | 'blue' | 'green' | 'yellow';

const LUDO_COLORS: LudoColor[] = ['red', 'blue', 'green', 'yellow'];
const PLATFORM_FEE = 0.1; // 10%

export class LudoGameController {
  private static instance: LudoGameController;

  static getInstance(): LudoGameController {
    if (!LudoGameController.instance) {
      LudoGameController.instance = new LudoGameController();
    }
    return LudoGameController.instance;
  }

  // Create a new room or find existing one
  async findOrCreateRoom(betAmount: number, uid: string, userName: string, avatar: string): Promise<string> {
    // Try to find an open room with same bet amount
    const q = query(
      collection(db, 'ludo_rooms'),
      where('betAmount', '==', betAmount),
      where('status', '==', 'open'),
      limit(1)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      const roomId = snap.docs[0].id;
      await this.joinRoom(roomId, uid, userName, avatar);
      return roomId;
    }

    return await this.createRoom(betAmount, uid, userName, avatar);
  }

  // Create a room
  async createRoom(betAmount: number, uid: string, userName: string, avatar: string): Promise<string> {
    const roomRef = doc(collection(db, 'ludo_rooms'));
    const player: LudoPlayer = {
      uid,
      name: userName,
      avatar,
      color: LUDO_COLORS[0],
      pieces: [-1, -1, -1, -1],
      isWinner: false,
    };

    const room: Omit<LudoRoom, 'roomId'> = {
      betAmount,
      maxPlayers: 2,
      players: [player],
      status: 'open',
      currentTurn: '',
      diceValue: 0,
      board: { pieces: { [uid]: [-1, -1, -1, -1] } },
      prize: 0,
      createdAt: serverTimestamp() as unknown as Date,
    };
    await setDoc(roomRef, { roomId: roomRef.id, ...room });

    // Deduct bet amount
    await debitWallet(uid, betAmount, 'bet', `Ludo bet - Room ${roomRef.id}`, roomRef.id);
    return roomRef.id;
  }

  // Join a room
  async joinRoom(roomId: string, uid: string, userName: string, avatar: string): Promise<void> {
    const roomRef = doc(db, 'ludo_rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) throw new Error('Room not found');
    const room = roomSnap.data() as LudoRoom;

    if (room.players.length >= room.maxPlayers) throw new Error('Room is full');
    if (room.players.some((p) => p.uid === uid)) throw new Error('Already in room');

    const colorIndex = room.players.length;
    const player: LudoPlayer = {
      uid,
      name: userName,
      avatar,
      color: LUDO_COLORS[colorIndex],
      pieces: [-1, -1, -1, -1],
      isWinner: false,
    };

    const updatedPlayers = [...room.players, player];
    const updatedBoard = {
      pieces: { ...room.board.pieces, [uid]: [-1, -1, -1, -1] },
    };

    const updates: Partial<LudoRoom> & { [k: string]: unknown } = {
      players: updatedPlayers,
      board: updatedBoard,
    };

    if (updatedPlayers.length === room.maxPlayers) {
      const prize = room.betAmount * room.maxPlayers * (1 - PLATFORM_FEE);
      updates.status = 'playing';
      updates.currentTurn = updatedPlayers[0].uid;
      updates.prize = prize;
      updates.startedAt = serverTimestamp();
    }

    await updateDoc(roomRef, updates);
    await debitWallet(uid, room.betAmount, 'bet', `Ludo bet - Room ${roomId}`, roomId);
  }

  // Roll dice
  async rollDice(roomId: string, uid: string): Promise<number> {
    const roomRef = doc(db, 'ludo_rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) throw new Error('Room not found');
    const room = roomSnap.data() as LudoRoom;

    if (room.currentTurn !== uid) throw new Error('Not your turn');
    const diceValue = Math.floor(Math.random() * 6) + 1;
    await updateDoc(roomRef, { diceValue });
    return diceValue;
  }

  // Move piece
  async movePiece(roomId: string, uid: string, pieceIndex: number, diceValue: number): Promise<void> {
    const roomRef = doc(db, 'ludo_rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) throw new Error('Room not found');
    const room = roomSnap.data() as LudoRoom;

    const pieces = [...(room.board.pieces[uid] || [-1, -1, -1, -1])];
    const currentPos = pieces[pieceIndex];

    // Move logic (simplified)
    let newPos = currentPos === -1 ? (diceValue === 6 ? 0 : -1) : currentPos + diceValue;
    if (newPos > 56) newPos = currentPos; // Can't overshoot home
    pieces[pieceIndex] = newPos;

    const updatedBoard = { ...room.board, pieces: { ...room.board.pieces, [uid]: pieces } };

    // Check win condition (all pieces at 57)
    const isWinner = pieces.every((p) => p === 56);
    if (isWinner) {
      await this.declareWinner(roomId, uid);
      return;
    }

    // Next turn
    const currentIndex = room.players.findIndex((p) => p.uid === uid);
    const nextIndex = (currentIndex + 1) % room.players.length;
    const nextTurn = room.players[nextIndex].uid;

    await updateDoc(roomRef, { board: updatedBoard, currentTurn: diceValue === 6 ? uid : nextTurn, diceValue: 0 });
  }

  // Declare winner
  async declareWinner(roomId: string, winnerId: string): Promise<void> {
    const roomRef = doc(db, 'ludo_rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;
    const room = roomSnap.data() as LudoRoom;

    const updatedPlayers = room.players.map((p) => ({ ...p, isWinner: p.uid === winnerId }));
    await updateDoc(roomRef, {
      status: 'completed',
      winnerId,
      players: updatedPlayers,
      completedAt: serverTimestamp(),
    });

    await creditWallet(winnerId, room.prize, 'win', `Ludo Win - Room ${roomId}`, roomId);
    await createNotification(winnerId, 'win_credited', '🎲 You Won Ludo!', `₹${room.prize} has been credited to your wallet!`);
  }

  // Subscribe to room
  subscribeToRoom(roomId: string, callback: (room: LudoRoom | null) => void): Unsubscribe {
    return onSnapshot(doc(db, 'ludo_rooms', roomId), (snap) => {
      if (!snap.exists()) { callback(null); return; }
      callback({ ...snap.data(), roomId: snap.id } as LudoRoom);
    });
  }

  // Get available rooms
  async getAvailableRooms(betAmount: number): Promise<LudoRoom[]> {
    const q = query(
      collection(db, 'ludo_rooms'),
      where('betAmount', '==', betAmount),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), roomId: d.id } as LudoRoom));
  }
}

export const ludoController = LudoGameController.getInstance();
