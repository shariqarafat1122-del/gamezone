// src/games/poker/PokerWinner.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import type { PokerWinner } from '../../types/poker.types';
import PokerCard from './PokerCard';

interface PokerWinnerDisplayProps {
  winners: PokerWinner[];
  onClose: () => void;
}

const PokerWinnerDisplay: React.FC<PokerWinnerDisplayProps> = ({ winners, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/90 to-gray-900/90 backdrop-blur-xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent" />

        {/* Confetti */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'][i % 4],
              left: `${Math.random() * 100}%`,
              top: '-10px',
            }}
            animate={{
              y: ['0%', '120%'],
              rotate: [0, 360],
              opacity: [1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              delay: Math.random() * 0.5,
              repeat: 2,
            }}
          />
        ))}

        <div className="relative p-6 text-center">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-xl bg-white/10 text-white/60"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Trophy */}
          <motion.div
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="text-6xl mb-4"
          >
            🏆
          </motion.div>

          <h2 className="text-2xl font-black text-yellow-400 mb-2">
            {winners.length === 1 ? 'Winner!' : 'Split Pot!'}
          </h2>

          {winners.map((winner, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="mb-4 p-4 rounded-xl bg-white/10 border border-yellow-500/30"
            >
              <p className="text-lg font-bold text-white mb-1">{winner.name}</p>
              <p className="text-sm text-white/60 mb-2">{winner.handDescription}</p>
              
              {/* Winner's cards */}
              {winner.cards.length > 0 && (
                <div className="flex items-center justify-center gap-1 mb-3">
                  {winner.cards.slice(0, 5).map((card, ci) => (
                    <PokerCard key={ci} card={card} isVisible size="sm" isHighlighted />
                  ))}
                </div>
              )}

              <div className="text-2xl font-black text-yellow-400">
                +₹{winner.amount.toLocaleString()}
              </div>
            </motion.div>
          ))}

          <button
            onClick={onClose}
            className="mt-2 px-6 py-2.5 rounded-xl bg-yellow-500 text-black font-bold text-sm"
          >
            Continue
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PokerWinnerDisplay;
