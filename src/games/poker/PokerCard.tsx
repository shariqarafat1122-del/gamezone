// src/games/poker/PokerCard.tsx

import React from 'react';
import { motion } from 'framer-motion';
import type { Card } from '../../types/poker.types';
import { cn } from '../../lib/utils';

interface PokerCardProps {
  card: Card;
  isVisible?: boolean;
  isHighlighted?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SUIT_SYMBOLS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS = {
  hearts: '#EF4444',
  diamonds: '#EF4444',
  clubs: '#1F2937',
  spades: '#1F2937',
};

const SIZE_CONFIG = {
  sm: { width: 'w-8', height: 'h-12', rank: 'text-xs', suit: 'text-sm', corner: 'text-[8px]' },
  md: { width: 'w-14', height: 'h-20', rank: 'text-lg', suit: 'text-2xl', corner: 'text-xs' },
  lg: { width: 'w-20', height: 'h-28', rank: 'text-2xl', suit: 'text-4xl', corner: 'text-sm' },
};

const PokerCard: React.FC<PokerCardProps> = ({
  card,
  isVisible = true,
  isHighlighted = false,
  size = 'md',
  className,
}) => {
  const sizeConfig = SIZE_CONFIG[size];
  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  if (!isVisible) {
    return (
      <div
        className={cn(
          sizeConfig.width,
          sizeConfig.height,
          "rounded-lg border-2 border-blue-400/50 bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center",
          className
        )}
      >
        <div className="text-blue-400/50 text-xl">🂠</div>
      </div>
    );
  }

  return (
    <motion.div
      animate={isHighlighted ? { y: -8, boxShadow: '0 0 20px rgba(251, 191, 36, 0.5)' } : {}}
      className={cn(
        sizeConfig.width,
        sizeConfig.height,
        "relative rounded-lg border bg-white flex flex-col items-center justify-center select-none",
        isHighlighted
          ? "border-yellow-400 shadow-lg shadow-yellow-400/30"
          : "border-gray-200",
        className
      )}
    >
      {/* Top-left corner */}
      <div
        className={cn("absolute top-0.5 left-1 flex flex-col items-center leading-none")}
        style={{ color }}
      >
        <span className={cn(sizeConfig.corner, "font-black")}>{card.rank}</span>
        <span className={sizeConfig.corner}>{symbol}</span>
      </div>

      {/* Center suit */}
      <span className={cn(sizeConfig.suit)} style={{ color }}>
        {symbol}
      </span>

      {/* Bottom-right corner (rotated) */}
      <div
        className={cn("absolute bottom-0.5 right-1 flex flex-col items-center leading-none rotate-180")}
        style={{ color }}
      >
        <span className={cn(sizeConfig.corner, "font-black")}>{card.rank}</span>
        <span className={sizeConfig.corner}>{symbol}</span>
      </div>
    </motion.div>
  );
};

export default PokerCard;
