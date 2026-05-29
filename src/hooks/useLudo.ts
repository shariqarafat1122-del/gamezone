// src/hooks/useLudo.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { LudoController } from '../controllers/LudoController';
import type { LudoRoom } from '../types/ludo.types';
import { toast } from 'sonner';

interface UseLudoReturn {
  room: LudoRoom | null;
  isLoading: boolean;
  isMyTurn: boolean;
  timeLeft: number;
  turnTimeLeft: number;
  rollDice: () => Promise<void>;
  movePiece: (pieceId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  isRolling: boolean;
  isMoving: boolean;
}

export function useLudo(roomId: string): UseLudoReturn {
  const { user } = useAuth();
  const [room, setRoom] = useState<LudoRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRolling, setIsRolling] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const [turnTimeLeft, setTurnTimeLeft] = useState(15);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevTurnRef = useRef<string>('');

  // Subscribe to room
  useEffect(() => {
    if (!roomId) return;

    const unsub = LudoController.subscribeToRoom(roomId, (updatedRoom) => {
      setRoom(updatedRoom);
      setIsLoading(false);

      // Update game timer
      if (updatedRoom.gameEndTime > 0) {
        const remaining = Math.max(
          0,
          Math.floor((updatedRoom.gameEndTime - Date.now()) / 1000)
        );
        setTimeLeft(remaining);
      }

      // Reset turn timer when turn changes
      if (updatedRoom.currentTurn !== prevTurnRef.current) {
        prevTurnRef.current = updatedRoom.currentTurn;
        setTurnTimeLeft(15);
      }
    });

    return unsub;
  }, [roomId]);

  // Game countdown timer
  useEffect(() => {
    if (!room || room.status !== 'playing') return;

    gameTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(gameTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [room?.status]);

  // Turn timer
  useEffect(() => {
    if (!room || room.status !== 'playing') return;
    if (!user) return;

    if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    setTurnTimeLeft(15);

    if (room.currentTurn === user.uid) {
      turnTimerRef.current = setInterval(() => {
        setTurnTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(turnTimerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [room?.currentTurn, room?.status, user?.uid]);

  const rollDice = useCallback(async () => {
    if (!roomId || !user || isRolling) return;

    setIsRolling(true);
    try {
      const result = await LudoController.rollDice(roomId, user.uid);
      if (!result.success) {
        toast.error(result.message || 'Failed to roll');
      }
    } finally {
      setTimeout(() => setIsRolling(false), 800);
    }
  }, [roomId, user, isRolling]);

  const movePiece = useCallback(
    async (pieceId: string) => {
      if (!roomId || !user || isMoving) return;

      setIsMoving(true);
      try {
        const result = await LudoController.movePiece(roomId, user.uid, pieceId);
        if (!result.success) {
          toast.error(result.message || 'Invalid move');
        } else if (result.eliminated) {
          toast.success('🎯 Piece eliminated! +10 bonus');
        } else if (result.finished) {
          toast.success('🏠 Piece reached home!');
        }
      } finally {
        setTimeout(() => setIsMoving(false), 500);
      }
    },
    [roomId, user, isMoving]
  );

  const leaveRoom = useCallback(async () => {
    if (!roomId || !user) return;
    await LudoController.leaveRoom(roomId, user.uid);
  }, [roomId, user]);

  const isMyTurn = room?.currentTurn === user?.uid && room?.status === 'playing';

  return {
    room,
    isLoading,
    isMyTurn,
    timeLeft,
    turnTimeLeft,
    rollDice,
    movePiece,
    leaveRoom,
    isRolling,
    isMoving,
  };
}
