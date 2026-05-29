// src/games/ludo/LudoGame.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { LogOut, Wifi, WifiOff, Volume2, VolumeX, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLudo } from '../../hooks/useLudo';
import { LudoController } from '../../controllers/LudoController';
import LudoBoard from './LudoBoard';
import LudoDice from './LudoDice';
import LudoPlayerPanel from './LudoPlayerPanel';
import LudoTimer from './LudoTimer';
import LudoWinnerScreen from './LudoWinner';
import { cn } from '../../lib/utils';
import type { LudoColor } from '../../types/ludo.types';

const COLOR_HEX: Record<LudoColor, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#EAB308',
};

// ============================================================
// WAITING SCREEN
// ============================================================
const WaitingScreen: React.FC<{ betAmount: number }> = ({ betAmount }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      className="w-20 h-20 rounded-2xl border-4 border-yellow-500/30 border-t-yellow-500 flex items-center justify-center text-4xl"
    >
      🎲
    </motion.div>
    <div className="text-center">
      <h2 className="text-xl font-black text-white mb-2">Waiting for opponent...</h2>
      <p className="text-white/40 text-sm">₹{betAmount} table • Game starts automatically</p>
    </div>
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-3 h-3 rounded-full bg-yellow-500"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
    </div>
  </div>
);

// ============================================================
// GAME HEADER
// ============================================================
const GameHeader: React.FC<{
  betAmount: number;
  timeLeft: number;
  isConnected: boolean;
  isMuted: boolean;
  onMute: () => void;
  onLeave: () => void;
}> = ({ betAmount, timeLeft, isConnected, isMuted, onMute, onLeave }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gray-950/90 backdrop-blur-xl">
    <div className="flex items-center gap-2">
      <button
        onClick={onLeave}
        className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400"
      >
        <LogOut className="w-4 h-4" />
      </button>
      <div>
        <p className="text-sm font-black text-white">🎲 Ludo ₹{betAmount}</p>
        <div className="flex items-center gap-1">
          {isConnected ? (
            <Wifi className="w-3 h-3 text-green-400" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-400" />
          )}
          <span className={cn(
            "text-xs",
            isConnected ? "text-green-400" : "text-red-400"
          )}>
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <LudoTimer
        timeLeft={timeLeft}
        totalTime={180}
        label="Game Time"
        size="sm"
      />
      <button
        onClick={onMute}
        className="p-2 rounded-xl bg-white/5"
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4 text-white/40" />
        ) : (
          <Volume2 className="w-4 h-4 text-white/60" />
        )}
      </button>
    </div>
  </div>
);

// ============================================================
// MAIN GAME
// ============================================================
const LudoGame: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    room, isLoading, isMyTurn, timeLeft,
    turnTimeLeft, rollDice, movePiece,
    leaveRoom, isRolling, isMoving,
  } = useLudo(roomId || '');

  const [isMuted, setIsMuted] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [prevStatus, setPrevStatus] = useState<string>('');

  // Show winner when game finishes
  useEffect(() => {
    if (room?.status === 'finished' && room.winner && prevStatus !== 'finished') {
      setTimeout(() => setShowWinner(true), 500);
    }
    if (room?.status) setPrevStatus(room.status);
  }, [room?.status, room?.winner]);

  const handleLeave = useCallback(async () => {
    await leaveRoom();
    navigate('/games/ludo');
  }, [leaveRoom, navigate]);

  const handlePlayAgain = useCallback(() => {
    setShowWinner(false);
    navigate('/games/ludo');
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Game not found</p>
          <button
            onClick={() => navigate('/games/ludo')}
            className="px-6 py-3 rounded-xl bg-yellow-500 text-black font-bold"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const myPlayer = room.players.find((p) => p.uid === user?.uid);
  const opponent = room.players.find((p) => p.uid !== user?.uid);
  const myColor = myPlayer?.color || 'red';
  const myColorHex = COLOR_HEX[myColor];

  const canRoll = isMyTurn && !room.diceRolled && room.status === 'playing';
  const canMove = isMyTurn && room.diceRolled && room.movablePieces.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <GameHeader
        betAmount={room.betAmount}
        timeLeft={timeLeft}
        isConnected={true}
        isMuted={isMuted}
        onMute={() => setIsMuted(!isMuted)}
        onLeave={() => setShowLeaveConfirm(true)}
      />

      {/* Waiting state */}
      {(room.status === 'waiting' || room.status === 'matched') && (
        <WaitingScreen betAmount={room.betAmount} />
      )}

      {/* Playing state */}
      {room.status === 'playing' && (
        <div className="flex-1 flex flex-col">
          {/* Opponent panel */}
          {opponent && (
            <div className="px-4 pt-3">
              <LudoPlayerPanel
                player={opponent}
                isCurrentTurn={room.currentTurn === opponent.uid}
                isMe={false}
                diceValue={room.currentTurn === opponent.uid ? room.diceValue : undefined}
              />
            </div>
          )}

          {/* Turn timer bar */}
          <div className="px-4 py-2">
            <LudoTimer
              timeLeft={room.currentTurn === user?.uid ? turnTimeLeft : 15}
              totalTime={15}
              variant="turn"
              label={isMyTurn ? "Your turn timer" : "Opponent's timer"}
            />
          </div>

          {/* Board */}
          <div className="flex-1 flex items-center justify-center px-2 py-2">
            <LudoBoard
              room={room}
              currentUserId={user?.uid || ''}
              movablePieces={isMyTurn ? room.movablePieces : []}
              onPieceClick={canMove ? movePiece : () => {}}
            />
          </div>

          {/* My panel + Dice */}
          <div className="px-4 pb-4 space-y-3">
            {/* Status message */}
            <AnimatePresence mode="wait">
              <motion.div
                key={isMyTurn ? 'myturn' : 'wait'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                {isMyTurn ? (
                  <div>
                    {!room.diceRolled ? (
                      <p className="text-sm font-bold text-yellow-400 animate-pulse">
                        🎲 Tap to roll the dice!
                      </p>
                    ) : room.movablePieces.length > 0 ? (
                      <p className="text-sm font-bold text-green-400 animate-pulse">
                        👆 Select a piece to move!
                      </p>
                    ) : (
                      <p className="text-sm text-white/40">No moves available, skipping...</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-white/40">
                    ⏳ Waiting for {opponent?.name}...
                  </p>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Dice + My Panel */}
            <div className="flex items-center gap-3">
              {myPlayer && (
                <div className="flex-1">
                  <LudoPlayerPanel
                    player={myPlayer}
                    isCurrentTurn={isMyTurn}
                    isMe={true}
                    diceValue={isMyTurn ? room.diceValue : undefined}
                  />
                </div>
              )}

              <div className="flex-shrink-0">
                <LudoDice
                  value={room.diceValue}
                  isRolling={isRolling}
                  isMyTurn={isMyTurn}
                  disabled={!canRoll || isMoving}
                  onRoll={rollDice}
                  playerColor={myColorHex}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave confirmation */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="w-full max-w-xs rounded-2xl bg-gray-900 border border-white/10 p-6 text-center"
            >
              <p className="text-4xl mb-3">⚠️</p>
              <h3 className="text-lg font-black text-white mb-2">Leave Game?</h3>
              <p className="text-sm text-white/50 mb-6">
                {room.status === 'playing'
                  ? 'Leaving now means forfeit. Your opponent wins!'
                  : 'Your bet will be refunded.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold"
                >
                  Stay
                </button>
                <button
                  onClick={handleLeave}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold"
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner Screen */}
      <AnimatePresence>
        {showWinner && room.winner && myPlayer && (
          <LudoWinnerScreen
            winner={room.winner}
            players={room.players}
            betAmount={room.betAmount}
            isMe={room.winner.uid === user?.uid}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LudoGame;
