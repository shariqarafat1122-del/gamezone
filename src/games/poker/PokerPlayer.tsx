// src/games/poker/PokerPlayer.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PokerPlayer, GamePhase } from '../../types/poker.types';
import PokerCard from './PokerCard';
import { cn } from '../../lib/utils';

interface PokerPlayerSeatProps {
  player: PokerPlayer | null;
  seatIndex: number;
  isActive: boolean;
  isCurrentUser: boolean;
  phase: GamePhase;
}

const STATUS_COLORS = {
  waiting: '#6B7280',
  active: '#10B981',
  folded: '#EF4444',
  'all-in': '#F59E0B',
  'sitting-out': '#6B7280',
  disconnected: '#EF4444',
};

const ACTION_LABELS = {
  fold: { label: 'FOLD', color: '#EF4444' },
  check: { label: 'CHECK', color: '#10B981' },
  call: { label: 'CALL', color: '#3B82F6' },
  raise: { label: 'RAISE', color: '#F59E0B' },
  'all-in': { label: 'ALL IN', color: '#8B5CF6' },
};

const PokerPlayerSeat: React.FC<PokerPlayerSeatProps> = ({
  player,
  seatIndex,
  isActive,
  isCurrentUser,
  phase,
}) => {
  if (!player) {
    return (
      <div className="w-16 h-20 flex flex-col items-center gap-1">
        <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
          <span className="text-white/20 text-xs">+</span>
        </div>
        <p className="text-xs text-white/20">Empty</p>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[player.status];
  const lastAction = player.lastAction
    ? ACTION_LABELS[player.lastAction]
    : null;

  return (
    <motion.div
      className={cn(
        "flex flex-col items-center gap-1",
        player.status === 'folded' && "opacity-50"
      )}
    >
      {/* Hole cards (face down for others) */}
      {player.holeCards.length > 0 && phase !== 'waiting' && !isCurrentUser && (
        <div className="flex gap-0.5 mb-1">
          {player.holeCards.map((_, i) => (
            <div
              key={i}
              className="w-6 h-9 rounded bg-gradient-to-br from-blue-800 to-blue-900 border border-blue-400/30"
            />
          ))}
        </div>
      )}

      {/* Avatar */}
      <div className="relative">
        <motion.div
          animate={isActive ? {
            boxShadow: ['0 0 0 0 rgba(251, 191, 36, 0)', '0 0 0 6px rgba(251, 191, 36, 0.3)', '0 0 0 0 rgba(251, 191, 36, 0)'],
          } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className={cn(
            "w-10 h-10 rounded-full overflow-hidden border-2 transition-all",
            isActive ? "border-yellow-400" : "border-white/20",
            isCurrentUser && "border-blue-400"
          )}
        >
          {player.avatar ? (
            <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {player.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </motion.div>

        {/* Status indicator */}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-950"
          style={{ background: statusColor }}
        />

        {/* Role badges */}
        {player.isDealer && (
          <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
            <span className="text-black text-[8px] font-black">D</span>
          </div>
        )}
        {player.isSmallBlind && !player.isDealer && (
          <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-white text-[8px] font-black">S</span>
          </div>
        )}
        {player.isBigBlind && (
          <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-white text-[8px] font-black">B</span>
          </div>
        )}
      </div>

      {/* Player info */}
      <div className="text-center">
        <p className={cn(
          "text-xs font-bold truncate max-w-[64px]",
          isCurrentUser ? "text-blue-400" : "text-white"
        )}>
          {player.name}
        </p>
        <p className="text-xs text-yellow-400 font-bold">
          ₹{player.chipStack.toLocaleString()}
        </p>
      </div>

      {/* Current bet */}
      {player.currentBet > 0 && (
        <div className="px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30">
          <span className="text-xs text-yellow-400">₹{player.currentBet}</span>
        </div>
      )}

      {/* Last action */}
      <AnimatePresence>
        {lastAction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="px-2 py-0.5 rounded text-xs font-black border"
            style={{
              color: lastAction.color,
              borderColor: `${lastAction.color}40`,
              background: `${lastAction.color}15`,
            }}
          >
            {lastAction.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner badge */}
      {player.isWinner && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="px-2 py-0.5 rounded-full bg-yellow-500 text-black text-xs font-black"
        >
          +₹{player.winAmount}
        </motion.div>
      )}
    </motion.div>
  );
};

export default PokerPlayerSeat;
