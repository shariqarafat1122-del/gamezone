// src/pages/GameHub.tsx
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Gamepad2, Users, Trophy, Zap, Clock,
  ChevronRight, Star, TrendingUp, Crown,
  Dice1, Heart, Spade, Diamond, Club
} from 'lucide-react'
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { cn } from '../lib/utils'

// ============================================================
// TYPES
// ============================================================
interface GameCardProps {
  id: string
  title: string
  description: string
  icon: string
  route: string
  color: string
  gradient: string
  playerCount: number
  minBet: number
  maxBet: number
  type: 'multiplayer' | 'global' | 'solo'
  isLive: boolean
  isHot: boolean
  isNew: boolean
  tags: string[]
}

// ============================================================
// GAME DATA
// ============================================================
const GAMES: GameCardProps[] = [
  {
    id: 'ludo',
    title: 'Ludo Premium',
    description: '1v1 realtime battle. Roll dice, eliminate opponent, highest score wins!',
    icon: '🎲',
    route: '/games/ludo',
    color: '#F59E0B',
    gradient: 'from-amber-600/30 to-yellow-800/20',
    playerCount: 0,
    minBet: 10,
    maxBet: 500,
    type: 'multiplayer',
    isLive: true,
    isHot: true,
    isNew: false,
    tags: ['1v1', '3 Min', 'Skill'],
  },
  {
    id: 'color',
    title: 'Color Prediction',
    description: 'Predict Red, Green or Violet. 25 second rounds, instant results!',
    icon: '🎨',
    route: '/games/color',
    color: '#8B5CF6',
    gradient: 'from-violet-600/30 to-purple-800/20',
    playerCount: 0,
    minBet: 10,
    maxBet: 10000,
    type: 'global',
    isLive: true,
    isHot: true,
    isNew: false,
    tags: ['Global', '25 Sec', 'Fast'],
  },
  {
    id: 'poker',
    title: 'Texas Hold\'em',
    description: 'Premium poker with real cards. Bluff, raise and win the pot!',
    icon: '♠️',
    route: '/games/poker',
    color: '#10B981',
    gradient: 'from-emerald-600/30 to-green-800/20',
    playerCount: 0,
    minBet: 100,
    maxBet: 1000,
    type: 'multiplayer',
    isLive: true,
    isHot: false,
    isNew: false,
    tags: ['2-4 Players', 'Strategy', 'Cards'],
  },
  {
    id: 'oddeven',
    title: 'Odd Even',
    description: 'Simple & fast. Predict Odd or Even number. 25 second rounds!',
    icon: '🔢',
    route: '/games/oddeven',
    color: '#3B82F6',
    gradient: 'from-blue-600/30 to-blue-800/20',
    playerCount: 0,
    minBet: 10,
    maxBet: 10000,
    type: 'global',
    isLive: true,
    isHot: false,
    isNew: false,
    tags: ['Global', '25 Sec', 'Easy'],
  },
  {
    id: 'dragontiger',
    title: 'Dragon Tiger',
    description: 'Dragon vs Tiger card battle. Bet on who gets the higher card!',
    icon: '🐉',
    route: '/games/dragon-tiger',
    color: '#EF4444',
    gradient: 'from-red-600/30 to-rose-800/20',
    playerCount: 0,
    minBet: 10,
    maxBet: 10000,
    type: 'global',
    isLive: true,
    isHot: false,
    isNew: true,
    tags: ['Global', '25 Sec', 'Cards'],
  },
  {
    id: 'andarbhahar',
    title: 'Andar Bahar',
    description: 'Classic Indian card game. Pick Andar or Bahar and win 2x!',
    icon: '🃏',
    route: '/games/andar-bahar',
    color: '#F97316',
    gradient: 'from-orange-600/30 to-orange-800/20',
    playerCount: 0,
    minBet: 10,
    maxBet: 10000,
    type: 'global',
    isLive: true,
    isHot: false,
    isNew: true,
    tags: ['Global', '25 Sec', 'Indian'],
  },
]

// ============================================================
// BADGE COMPONENT
// ============================================================
const GameBadge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span
    className="px-2 py-0.5 rounded-full text-[10px] font-black border"
    style={{
      color,
      borderColor: `${color}40`,
      background: `${color}15`,
    }}
  >
    {label}
  </span>
)

// ============================================================
// LIVE PLAYER COUNT
// ============================================================
const LiveCount: React.FC<{ count: number; color: string }> = ({ count, color }) => (
  <div className="flex items-center gap-1.5">
    <motion.div
      className="w-2 h-2 rounded-full"
      style={{ background: color }}
      animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
    <span className="text-xs text-white/50">
      {count > 0 ? `${count} playing` : 'Be first!'}
    </span>
  </div>
)

// ============================================================
// GAME CARD COMPONENT
// ============================================================
const GameCard: React.FC<{
  game: GameCardProps
  index: number
  onPlay: (route: string) => void
}> = ({ game, index, onPlay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 200 }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onPlay(game.route)}
      className="relative overflow-hidden rounded-3xl cursor-pointer select-none"
      style={{
        border: `1px solid ${game.color}25`,
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      {/* Background gradient */}
      <div
        className={cn('absolute inset-0 bg-gradient-to-br opacity-60', game.gradient)}
      />

      {/* Glow effect */}
      <div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 30% 50%, ${game.color}10, transparent 70%)`,
        }}
      />

      <div className="relative p-5">
        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{
                background: `${game.color}20`,
                border: `1.5px solid ${game.color}35`,
                boxShadow: `0 8px 24px ${game.color}20`,
              }}
            >
              {game.icon}
            </motion.div>

            <div>
              <h3 className="font-black text-white text-base leading-tight">
                {game.title}
              </h3>
              <LiveCount count={game.playerCount} color={game.color} />
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-col gap-1 items-end">
            {game.isHot && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 border border-red-500/30 text-red-400">
                🔥 HOT
              </span>
            )}
            {game.isNew && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-green-500/20 border border-green-500/30 text-green-400">
                ✨ NEW
              </span>
            )}
            {game.isLive && !game.isHot && !game.isNew && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 border border-blue-500/30 text-blue-400">
                🟢 LIVE
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-white/45 leading-relaxed mb-3 line-clamp-2">
          {game.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {game.tags.map(tag => (
            <GameBadge key={tag} label={tag} color={game.color} />
          ))}
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/30 mb-0.5">Bet Range</p>
            <p className="text-sm font-black text-white">
              ₹{game.minBet}
              <span className="text-white/30 font-normal"> - </span>
              ₹{game.maxBet.toLocaleString()}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm text-black"
            style={{
              background: `linear-gradient(135deg, ${game.color}, ${game.color}cc)`,
              boxShadow: `0 6px 20px ${game.color}40`,
            }}
          >
            Play
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// CATEGORY FILTER
// ============================================================
type FilterType = 'all' | 'multiplayer' | 'global' | 'hot'

const FILTERS: { id: FilterType; label: string; icon: string }[] = [
  { id: 'all', label: 'All Games', icon: '🎮' },
  { id: 'hot', label: 'Hot', icon: '🔥' },
  { id: 'multiplayer', label: '1v1 Battle', icon: '⚔️' },
  { id: 'global', label: 'Global Room', icon: '🌍' },
]

// ============================================================
// STATS BAR
// ============================================================
const StatsBar: React.FC<{
  totalPlayers: number
  totalGames: number
}> = ({ totalPlayers, totalGames }) => (
  <div className="grid grid-cols-3 gap-3 mb-6">
    {[
      { label: 'Live Players', value: totalPlayers, icon: '👥', color: '#10B981' },
      { label: 'Active Games', value: 6, icon: '🎮', color: '#F59E0B' },
      { label: 'Total Games', value: `${totalGames}+`, icon: '🏆', color: '#8B5CF6' },
    ].map((stat) => (
      <motion.div
        key={stat.label}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-3 rounded-2xl border border-white/5 bg-white/3 text-center"
        style={{ background: `${stat.color}08` }}
      >
        <p className="text-xl mb-1">{stat.icon}</p>
        <p className="text-lg font-black" style={{ color: stat.color }}>
          {stat.value}
        </p>
        <p className="text-xs text-white/30">{stat.label}</p>
      </motion.div>
    ))}
  </div>
)

// ============================================================
// HERO BANNER
// ============================================================
const HeroBanner: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden rounded-3xl mb-6 p-5"
    style={{
      background: 'linear-gradient(135deg, #1a0a00 0%, #2d1500 50%, #1a0a00 100%)',
      border: '1px solid rgba(245,158,11,0.2)',
    }}
  >
    {/* Background pattern */}
    <div className="absolute inset-0 opacity-5">
      <div className="absolute top-2 right-4 text-8xl select-none">🎰</div>
      <div className="absolute bottom-2 left-4 text-6xl select-none">🎲</div>
    </div>

    {/* Glow */}
    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-yellow-500/5" />

    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <Crown className="w-5 h-5 text-yellow-400" />
        <span className="text-yellow-400 text-sm font-black">Premium Gaming Platform</span>
      </div>
      <h2 className="text-2xl font-black text-white mb-2 leading-tight">
        Play Real Games,<br />
        <span className="text-yellow-400">Win Real Money</span>
      </h2>
      <p 
