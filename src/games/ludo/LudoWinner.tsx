// src/games/ludo/LudoWinner.tsx

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RotateCcw, Home, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LudoWinner, LudoPlayer, LudoColor } from '../../types/ludo.types';

interface LudoWinnerProps {
  winner: LudoWinner;
  players: LudoPlayer[];
  betAmount: number;
  isMe: boolean;
  onPlayAgain: () => void;
}

const COLOR_LABELS: Record<LudoColor, string> = {
  red: '🔴',
  blue: '🔵',
  green: '🟢',
  yellow: '🟡',
};

const Confetti: React.FC = () => {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][i % 5],
    delay: Math.random() * 0.8,
    duration: 1.5 + Math.random() * 1.5,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            left: `${p.x}%`,
            top: '-5%',
            background: p.color,
            rotate: p.rotation,
          }}
          animate={{
            y: ['0vh', '110vh'],
            rotate: [p.rotation, p.rotation + 360],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  );
};

const LudoWinnerScreen: React.FC<LudoWinnerProps> = ({
  winner, players, betAmount, isMe, onPlayAgain,
}) => {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowDetails(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const loser = players.find((p) => p.uid !== winner.uid);
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
    >
      <Confetti />

      <div className="relative w-full max-w-sm">
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="rounded-3xl overflow-hidden border border-yellow-500/30 bg-gray-900"
        >
          {/* Header */}
          <div className="relative p-6 text-center bg-gradient-to-b from-yellow-900/50 to-transparent">
            {/* Trophy */}
            <motion.div
              animate={{
                rotateY: [0, 360],
                scale: [1, 1.15, 1],
              }}
              transition={{
                rotateY: { duration: 3, repeat: Infinity, ease: 'linear' },
                scale: { duration: 1.5, repeat: Infinity },
              }}
              className="text-7xl mb-3 block"
            >
              🏆
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-yellow-400 mb-1"
            >
              {isMe ? 'You Won!' : `${winner.name} Won!`}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-2 text-white/60 text-sm"
            >
              <span>{COLOR_LABELS[winner.color]}</span>
              <span>{winner.name}</span>
              <span>•</span>
              <span className="text-white font-bold">{winner.score} pts</span>
            </motion.div>
          </div>

          {/* Prize */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="px-6 pb-4"
              >
                {/* Prize display */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="text-center mb-4 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20"
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Coins className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm text-white/50">
                      {isMe ? 'Prize Credited!' : 'Winner Prize'}
                    </span>
                  </div>
                  <motion.p
                    className="text-4xl font-black text-yellow-400"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1, repeat: 3 }}
                  >
                    ₹{winner.prize}
                  </motion.p>
                  {isMe && (
                    <p className="text-xs text-green-400 mt-1">✅ Added to your wallet</p>
                  )}
                </motion.div>

                {/* Scoreboard */}
                <div className="mb-4">
                  <p className="text-xs text-white/40 uppercase font-bold mb-2">Final Scores</p>
                  {sortedPlayers.map((player, i) => (
                    <motion.div
                      key={player.uid}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 + 0.3 }}
                      className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {i === 0 ? '🥇' : '🥈'}
                        </span>
                        <span>{COLOR_LABELS[player.color]}</span>
                        <span className="text-sm text-white">
                          {player.uid === winner.uid ? `${player.name} (Winner)` : player.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{player.score}</p>
                        <p className="text-xs text-white/30">{player.eliminationCount} kills</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <motion.button
                    onClick={onPlayAgain}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/30"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Play Again
                  </motion.button>
                  <motion.button
                    onClick={() => navigate('/games/ludo')}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white font-black text-sm flex items-center justify-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Lobby
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LudoWinnerScreen;
