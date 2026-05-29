// src/games/ludo/LudoDice.tsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface LudoDiceProps {
  value: number;
  isRolling: boolean;
  isMyTurn: boolean;
  disabled: boolean;
  onRoll: () => void;
  playerColor: string;
}

// Dot positions for each dice face
const DICE_DOTS: Record<number, { top: string; left: string }[]> = {
  1: [{ top: '50%', left: '50%' }],
  2: [
    { top: '25%', left: '25%' },
    { top: '75%', left: '75%' },
  ],
  3: [
    { top: '25%', left: '25%' },
    { top: '50%', left: '50%' },
    { top: '75%', left: '75%' },
  ],
  4: [
    { top: '25%', left: '25%' },
    { top: '25%', left: '75%' },
    { top: '75%', left: '25%' },
    { top: '75%', left: '75%' },
  ],
  5: [
    { top: '25%', left: '25%' },
    { top: '25%', left: '75%' },
    { top: '50%', left: '50%' },
    { top: '75%', left: '25%' },
    { top: '75%', left: '75%' },
  ],
  6: [
    { top: '20%', left: '25%' },
    { top: '20%', left: '75%' },
    { top: '50%', left: '25%' },
    { top: '50%', left: '75%' },
    { top: '80%', left: '25%' },
    { top: '80%', left: '75%' },
  ],
};

// Single Dice Face
const DiceFace: React.FC<{
  value: number;
  size?: number;
  className?: string;
}> = ({ value, size = 80, className }) => {
  const dots = DICE_DOTS[value] || DICE_DOTS[1];

  return (
    <div
      className={cn(
        "relative rounded-xl bg-white shadow-2xl",
        className
      )}
      style={{
        width: size,
        height: size,
        boxShadow: '4px 4px 12px rgba(0,0,0,0.4), inset -2px -2px 6px rgba(0,0,0,0.1), inset 2px 2px 6px rgba(255,255,255,0.8)',
      }}
    >
      {/* Top highlight */}
      <div
        className="absolute inset-x-2 top-1 h-3 rounded-full opacity-60"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.9), transparent)' }}
      />

      {/* Dots */}
      {dots.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-gray-900"
          style={{
            width: size * 0.12,
            height: size * 0.12,
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -50%)',
            boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.3)',
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.05 }}
        />
      ))}

      {/* Side shadow effect */}
      <div
        className="absolute inset-0 rounded-xl opacity-20"
        style={{
          background: 'linear-gradient(135deg, transparent 40%, rgba(0,0,0,0.3) 100%)',
        }}
      />
    </div>
  );
};

// 3D Rolling Dice Animation
const RollingDice: React.FC<{ color: string; size?: number }> = ({ color, size = 80 }) => {
  const [displayValue, setDisplayValue] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 6) + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      animate={{
        rotateX: [0, 360, 720],
        rotateY: [0, 180, 360, 540, 720],
        rotateZ: [0, 45, -45, 90, 0],
        scale: [1, 1.15, 0.9, 1.1, 1],
      }}
      transition={{
        duration: 0.8,
        ease: 'easeInOut',
        times: [0, 0.3, 0.6, 0.8, 1],
      }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <DiceFace value={displayValue} size={size} />
    </motion.div>
  );
};

// Main Dice Component
const LudoDice: React.FC<LudoDiceProps> = ({
  value,
  isRolling,
  isMyTurn,
  disabled,
  onRoll,
  playerColor,
}) => {
  const canRoll = isMyTurn && !disabled && !isRolling;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Dice display */}
      <div
        className="relative cursor-pointer select-none"
        onClick={canRoll ? onRoll : undefined}
        style={{ perspective: '400px' }}
      >
        <AnimatePresence mode="wait">
          {isRolling ? (
            <motion.div
              key="rolling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RollingDice color={playerColor} size={80} />
            </motion.div>
          ) : (
            <motion.div
              key={`face-${value}`}
              initial={{ scale: 0.5, rotateY: -180, opacity: 0 }}
              animate={{ scale: 1, rotateY: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <DiceFace value={value || 1} size={80} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glow effect when it's your turn */}
        {canRoll && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            animate={{
              boxShadow: [
                `0 0 0 0 ${playerColor}00`,
                `0 0 20px 8px ${playerColor}60`,
                `0 0 0 0 ${playerColor}00`,
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Roll Button */}
      <motion.button
        onClick={canRoll ? onRoll : undefined}
        disabled={!canRoll}
        whileTap={canRoll ? { scale: 0.9 } : {}}
        animate={
          canRoll
            ? {
                scale: [1, 1.04, 1],
                transition: { duration: 1, repeat: Infinity },
              }
            : {}
        }
        className={cn(
          "px-6 py-2.5 rounded-xl font-black text-sm transition-all",
          canRoll
            ? "text-white shadow-lg"
            : "bg-white/10 text-white/30 cursor-not-allowed"
        )}
        style={
          canRoll
            ? {
                background: `linear-gradient(135deg, ${playerColor}, ${playerColor}bb)`,
                boxShadow: `0 6px 20px ${playerColor}50`,
              }
            : {}
        }
      >
        {isRolling ? (
          <span className="flex items-center gap-2">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
            >
              🎲
            </motion.span>
            Rolling...
          </span>
        ) : isMyTurn ? (
          '🎲 Roll Dice'
        ) : (
          '⏳ Wait...'
        )}
      </motion.button>

      {/* Dice value display */}
      {value > 0 && !isRolling && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="px-3 py-1 rounded-full text-xs font-black"
          style={{ background: `${playerColor}20`, color: playerColor, border: `1px solid ${playerColor}40` }}
        >
          Rolled: {value}
        </motion.div>
      )}
    </div>
  );
};

export default LudoDice;
export { DiceFace };
