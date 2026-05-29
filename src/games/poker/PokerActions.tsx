// src/games/poker/PokerActions.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, TrendingUp } from 'lucide-react';
import type { PokerPlayer, GamePhase, BettingAction } from '../../types/poker.types';
import { cn } from '../../lib/utils';

interface PokerActionsProps {
  player: PokerPlayer;
  currentBet: number;
  phase: GamePhase;
  onAction: (action: BettingAction, amount?: number) => void;
  isLoading: boolean;
  minRaise: number;
  maxRaise: number;
}

const PokerActions: React.FC<PokerActionsProps> = ({
  player,
  currentBet,
  phase,
  onAction,
  isLoading,
  minRaise,
  maxRaise,
}) => {
  const [showRaise, setShowRaise] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(minRaise);

  const canCheck = player.currentBet >= currentBet;
  const callAmount = Math.min(currentBet - player.currentBet, player.chipStack);
  const canRaise = player.chipStack > callAmount;

  const raisePresets = [
    { label: '2x', value: currentBet * 2 },
    { label: '3x', value: currentBet * 3 },
    { label: 'Pot', value: maxRaise },
    { label: 'All-in', value: player.chipStack + player.currentBet },
  ].filter(p => p.value <= player.chipStack + player.currentBet);

  const handleRaise = () => {
    onAction('raise', raiseAmount);
    setShowRaise(false);
  };

  if (phase === 'waiting' || phase === 'finished') return null;

  return (
    <div className="space-y-3">
      {/* Raise slider */}
      <AnimatePresence>
        {showRaise && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-4 rounded-2xl bg-gray-800/90 border border-white/10 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Raise Amount</span>
              <span className="text-lg font-bold text-yellow-400">
                ₹{raiseAmount.toLocaleString()}
              </span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-2">
              {raisePresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setRaiseAmount(Math.min(preset.value, maxRaise))}
                  className={cn(
                    "py-1.5 rounded-lg text-xs font-bold border transition-all",
                    raiseAmount === preset.value
                      ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                      : "bg-white/5 border-white/10 text-white/60"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Slider */}
            <input
              type="range"
              min={minRaise}
              max={maxRaise}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(Number(e.target.value))}
              className="w-full accent-yellow-400"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowRaise(false)}
                className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 text-sm"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleRaise}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading}
                className="flex-1 py-2 rounded-xl bg-yellow-500 text-black font-bold text-sm flex items-center justify-center gap-1"
              >
                <TrendingUp className="w-4 h-4" />
                Raise ₹{raiseAmount}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main action buttons */}
      <div className="grid grid-cols-3 gap-2">
        {/* Fold */}
        <motion.button
          onClick={() => onAction('fold')}
          disabled={isLoading}
          whileTap={{ scale: 0.95 }}
          className="py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-red-500/30 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              ✕ Fold
            </>
          )}
        </motion.button>

        {/* Check / Call */}
        {canCheck ? (
          <motion.button
            onClick={() => onAction('check')}
            disabled={isLoading}
            whileTap={{ scale: 0.95 }}
            className="py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-blue-500/30 transition-all disabled:opacity-50"
          >
            ✓ Check
          </motion.button>
        ) : (
          <motion.button
            onClick={() => onAction('call')}
            disabled={isLoading}
            whileTap={{ scale: 0.95 }}
            className="py-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-green-500/30 transition-all disabled:opacity-50"
          >
            Call ₹{callAmount}
          </motion.button>
        )}

        {/* Raise / All-in */}
        {canRaise ? (
          <motion.button
            onClick={() => setShowRaise(!showRaise)}
            disabled={isLoading}
            whileTap={{ scale: 0.95 }}
            className="py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-yellow-500/30 transition-all disabled:opacity-50"
          >
            ↑ Raise
          </motion.button>
        ) : (
          <motion.button
            onClick={() => onAction('all-in')}
            disabled={isLoading}
            whileTap={{ scale: 0.95 }}
            className="py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold text-sm hover:bg-purple-500/30 transition-all disabled:opacity-50"
          >
            All-In
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default PokerActions;
