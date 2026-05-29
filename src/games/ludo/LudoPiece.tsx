// src/games/ludo/LudoPiece.tsx

import React from 'react';
import { motion } from 'framer-motion';
import type { LudoPiece, LudoColor } from '../../types/ludo.types';
import { cn } from '../../lib/utils';

interface LudoPieceProps {
  piece: LudoPiece;
  color: LudoColor;
  isMovable: boolean;
  onClick: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const COLOR_STYLES: Record<LudoColor, {
  primary: string;
  shadow: string;
  highlight: string;
  border: string;
}> = {
  red: {
    primary: '#EF4444',
    shadow: '#991B1B',
    highlight: '#FCA5A5',
    border: '#DC2626',
  },
  blue: {
    primary: '#3B82F6',
    shadow: '#1D4ED8',
    highlight: '#93C5FD',
    border: '#2563EB',
  },
  green: {
    primary: '#10B981',
    shadow: '#065F46',
    highlight: '#6EE7B7',
    border: '#059669',
  },
  yellow: {
    primary: '#EAB308',
    shadow: '#92400E',
    highlight: '#FDE68A',
    border: '#D97706',
  },
};

const SIZE_CONFIG = {
  xs: { outer: 14, inner: 8, cap: 6 },
  sm: { outer: 18, inner: 10, cap: 8 },
  md: { outer: 24, inner: 14, cap: 10 },
  lg: { outer: 32, inner: 18, cap: 14 },
};

const LudoPieceComponent: React.FC<LudoPieceProps> = ({
  piece, color, isMovable, onClick, size = 'sm',
}) => {
  const styles = COLOR_STYLES[color];
  const dim = SIZE_CONFIG[size];

  if (piece.status === 'finished') return null;

  return (
    <motion.div
      onClick={isMovable ? onClick : undefined}
      whileHover={isMovable ? { scale: 1.3 } : {}}
      whileTap={isMovable ? { scale: 0.9 } : {}}
      animate={
        isMovable
          ? {
              y: [0, -3, 0],
              transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
            }
          : {}
      }
      className={cn(
        "relative flex items-end justify-center cursor-default select-none",
        isMovable && "cursor-pointer z-10"
      )}
      style={{ width: dim.outer, height: dim.outer + 4 }}
    >
      {/* Piece body - classic ludo pawn shape */}
      <svg
        width={dim.outer}
        height={dim.outer + 4}
        viewBox="0 0 32 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow/base */}
        <ellipse cx="16" cy="34" rx="10" ry="3" fill="rgba(0,0,0,0.3)" />

        {/* Body */}
        <path
          d="M8 28 C8 22 12 18 12 14 C10 12 10 8 16 8 C22 8 22 12 20 14 C20 18 24 22 24 28 Z"
          fill={styles.primary}
          stroke={styles.border}
          strokeWidth="1"
        />

        {/* Head */}
        <circle
          cx="16"
          cy="8"
          r="6"
          fill={styles.primary}
          stroke={styles.border}
          strokeWidth="1"
        />

        {/* Highlight on head */}
        <circle cx="13.5" cy="5.5" r="2" fill={styles.highlight} opacity="0.6" />

        {/* Body highlight */}
        <path
          d="M12 16 C11 20 11 24 12 27"
          stroke={styles.highlight}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* 3D shadow side */}
        <path
          d="M20 14 C21 18 23 22 23 28"
          stroke={styles.shadow}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>

      {/* Movable glow ring */}
      {isMovable && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{
            boxShadow: [
              `0 0 0 2px ${styles.primary}00`,
              `0 0 0 4px ${styles.primary}80`,
              `0 0 0 2px ${styles.primary}00`,
            ],
          }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}

      {/* Eliminated indicator */}
      {piece.status === 'eliminated' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs">💀</span>
        </div>
      )}
    </motion.div>
  );
};

export default LudoPieceComponent;
