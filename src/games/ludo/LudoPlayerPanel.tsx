// src/games/ludo/LudoPlayerPanel.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Shield, Zap } from 'lucide-react';
import type { LudoPlayer, LudoColor } from '../../types/ludo.types';
import { cn } from '../../lib/utils';

interface LudoPlayerPanelProps {
  player: LudoPlayer;
  isCurrentTurn: boolean;
  isMe: boolean;
  diceValue?: number;
}

const COLOR_CONFIG: Record<LudoColor, { hex: string; bg: string; label: string }> = {
  red: { hex: '#EF4444', bg: 'from-red-900/50', label: '🔴' },
  blue: { hex: '#3B82F6', bg: 'from-blue-900/50', label: '🔵' },
  green: { hex: '#10B981', bg: 'from-green-900/50', label: '🟢' },
  yellow: { hex: '#EAB308', bg: 'from-yellow-900/50', label: '🟡' },
};

const LudoPlayerPanel: React.FC<LudoPlayerPanelProps> = ({
  player, isCurrentTurn, isMe, diceValue,
}) => {
  const config = COLOR_CONFIG[player.color];
  const finishedCount = player.pieces.filter((p) => p.status === 'finished').length;
  const activeCount = player.pieces.filter((p) => p.status === 'active').length;

  return (
    <motion.div
      animate={
        isCurrentTurn
          ? { boxShadow: [`0 0 0 0 ${config.hex}00`, `0 0 12px 4px ${config.hex}50`, `0 0 0 0 ${config.hex}00`] }
          : {}
      }
      transition={{ duration: 1.5, repeat: Infinity }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-3 transition-all",
        isCurrentTurn
          ? "border-opacity-80"
          : "border-white/10"
      )}
      style={{
        background: `linear-gradient(135deg, ${config.hex}15, transparent)`,
        borderColor: isCurrentTurn ? config.hex : undefined,
      }}
    >
      {/* Turn indicator */}
      {isCurrentTurn && (
        <motion.div
          className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{ background: config.hex }}
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}

      {/* Player info */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="relative w-8 h-8 rounded-full overflow-hidden border-2 flex-shrink-0"
          style={{ borderColor: config.hex }}
        >
          {player.avatar ? (
            <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white font-black text-sm"
              style={{ background: `${config.hex}40` }}
            >
              {player.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-xs">{config.label}</span>
            <p className="text-xs font-bold text-white truncate">
              {isMe ? `${player.name} (You)` : player.name}
            </p>
          </div>
          {isCurrentTurn && (
            <motion.p
              className="text-xs font-black"
              style={{ color: config.hex }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              Your Turn!
            </motion.p>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-center">
          <p className="text-lg font-black" style={{ color: config.hex }}>
            {player.score}
          </p>
          <p className="text-xs text-white/30">Score</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-white">{finishedCount}/4</p>
          <p className="text-xs text-white/30">Home</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-orange-400">{player.eliminationCount}</p>
          <p className="text-xs text-white/30">Kills</p>
        </div>
      </div>

      {/* Piece status indicators */}
      <div className="flex items-center gap-1">
        {player.pieces.map((piece) => (
          <div
            key={piece.id}
            className="w-4 h-4 rounded-full border flex items-center justify-center"
            style={{
              borderColor: config.hex,
              background:
                piece.status === 'finished'
                  ? config.hex
                  : piece.status === 'active'
                  ? `${config.hex}50`
                  : 'transparent',
            }}
          >
            {piece.status === 'finished' && (
              <span className="text-white text-xs">✓</span>
            )}
          </div>
        ))}
      </div>

      {/* Current dice */}
      {isCurrentTurn && diceValue && diceValue > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-white shadow-lg flex items-center justify-center"
        >
          <span className="text-gray-900 font-black text-sm">{diceValue}</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default LudoPlayerPanel;
