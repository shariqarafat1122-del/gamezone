// src/games/ludo/LudoTimer.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LudoTimerProps {
  timeLeft: number;
  totalTime?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'game' | 'turn';
}

const LudoTimer: React.FC<LudoTimerProps> = ({
  timeLeft,
  totalTime = 180,
  label = 'Time Left',
  size = 'md',
  variant = 'game',
}) => {
  const percentage = (timeLeft / totalTime) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isWarning = timeLeft <= 30;
  const isDanger = timeLeft <= 10;

  const color = isDanger
    ? '#EF4444'
    : isWarning
    ? '#F59E0B'
    : variant === 'turn'
    ? '#3B82F6'
    : '#10B981';

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  if (variant === 'turn') {
    // Simple bar for turn timer
    return (
      <div className="flex items-center gap-2">
        <Clock className="w-3 h-3" style={{ color }} />
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="text-xs font-black" style={{ color }}>
          {timeLeft}s
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Circular timer */}
      <div className="relative">
        <svg width={size === 'lg' ? 100 : size === 'md' ? 80 : 60} height={size === 'lg' ? 100 : size === 'md' ? 80 : 60}>
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r="40%"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="4"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50%"
            cy="50%"
            r="40%"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5 }}
            transform={`rotate(-90 ${size === 'lg' ? 50 : size === 'md' ? 40 : 30} ${size === 'lg' ? 50 : size === 'md' ? 40 : 30})`}
          />
          {/* Time text */}
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={color}
            fontSize={size === 'lg' ? 18 : size === 'md' ? 14 : 10}
            fontWeight="bold"
          >
            {minutes}:{seconds.toString().padStart(2, '0')}
          </text>
        </svg>

        {/* Warning pulse */}
        {isWarning && (
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: color }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
      </div>

      <p className="text-xs font-medium" style={{ color }}>
        {label}
      </p>

      {isWarning && (
        <motion.div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: `${color}20`, border: `1px solid ${color}40` }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          <AlertTriangle className="w-3 h-3" style={{ color }} />
          <span className="text-xs font-bold" style={{ color }}>
            {isDanger ? 'Hurry!' : 'Time running out!'}
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default LudoTimer;
