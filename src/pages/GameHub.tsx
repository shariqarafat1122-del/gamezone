// src/pages/GameHub.tsx
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Gamepad2,
  ChevronRight,
  Crown,
  TrendingUp,
  Zap,
  Clock,
  Shield,
  Users,
} from 'lucide-react'
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { cn } from '../lib/utils'

// ============================================================
// TYPES
// ============================================================
interface GameItem {
  id: string
  title: string
  description: string
  icon: string
  route: string
  color: string
  minBet: number
  maxBet: number
  type: 'multiplayer' | 'global'
  isHot: boolean
  isNew: boolean
  tags: string[]
  playerCount: number
}

// ============================================================
// GAMES DATA
// ============================================================
const INITIAL_GAMES: GameItem[] = [
  {
    id: 'ludo',
    title: 'Ludo Premium',
    description: '1v1 realtime battle. Roll dice, eliminate opponent, highest score wins!',
    icon: '🎲',
    route: '/games/ludo',
    color: '#F59E0B',
    minBet: 10,
    maxBet: 500,
    type: 'multiplayer',
    isHot: true,
    isNew: false,
    tags: ['1v1', '3 Min', 'Skill'],
    playerCount: 0,
  },
  {
    id: 'color',
    title: 'Color Prediction',
    description: 'Predict Red, Green or Violet. 25 second rounds, instant results!',
    icon: '🎨',
    route: '/games/color',
    color: '#8B5CF6',
    minBet: 10,
    maxBet: 10000,
    type: 'global',
    isHot: true,
    isNew: false,
    tags: ['Global', '25 Sec', 'Fast'],
    playerCount: 0,
  },
  {
    id: 'poker',
    title: "Texas Hold'em",
    description: 'Premium poker with real cards. Bluff, raise and win the pot!',
    icon: '♠️',
    route: '/games/poker',
    color: '#10B981',
    minBet: 100,
    maxBet: 1000,
    type: 'multiplayer',
    isHot: false,
    isNew: false,
    tags: ['2-4 Players', 'Strategy', 'Cards'],
    playerCount: 0,
  },
  {
    id: 'oddeven',
    title: 'Odd Even',
    description: 'Simple & fast. Predict Odd or Even number. 25 second rounds!',
    icon: '🔢',
    route: '/games/oddeven',
    color: '#3B82F6',
    minBet: 10,
    maxBet: 10000,
    type: 'global',
    isHot: false,
    isNew: false,
    tags: ['Global', '25 Sec', 'Easy'],
    playerCount: 0,
  },
  {
    id: 'dragontiger',
    title: 'Dragon Tiger',
    description: 'Dragon vs Tiger card battle. Bet on who gets the higher card!',
    icon: '🐉',
    route: '/games/dragon-tiger',
    color: '#EF4444',
    minBet: 10,
    maxBet: 10000,
    type: 'global',
    isHot: false,
    isNew: true,
    tags: ['Global', '25 Sec', 'Cards'],
    playerCount: 0,
  },
  {
    id: 'andarbhahar',
    title: 'Andar Bahar',
    description: 'Classic Indian card game. Pick Andar or Bahar and win 2x!',
    icon: '🃏',
    route: '/games/andar-bahar',
    color: '#F97316',
    minBet: 10,
    maxBet: 10000,
    type: 'global',
    isHot: false,
    isNew: true,
    tags: ['Global', '25 Sec', 'Indian'],
    playerCount: 0,
  },
]

// ============================================================
// FILTER TYPES
// ============================================================
type FilterType = 'all' | 'multiplayer' | 'global' | 'hot'

const FILTERS: { id: FilterType; label: string; icon: string }[] = [
  { id: 'all', label: 'All Games', icon: '🎮' },
  { id: 'hot', label: 'Hot', icon: '🔥' },
  { id: 'multiplayer', label: '1v1 Battle', icon: '⚔️' },
  { id: 'global', label: 'Global Room', icon: '🌍' },
]

// ============================================================
// GAME BADGE
// ============================================================
const GameBadge: React.FC<{ label: string; color: string }> = ({ label, color }) => {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-black border"
      style={{
        color: color,
        borderColor: `${color}40`,
        background: `${color}15`,
      }}
    >
      {label}
    </span>
  )
}

// ============================================================
// GAME CARD
// ============================================================
const GameCard: React.FC<{
  game: GameItem
  index: number
  onPlay: (route: string) => void
}> = ({ game, index, onPlay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 200 }}
      whileHover={{ y: -4 }}
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
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${game.color}15, transparent)`,
        }}
      />

      <div className="relative p-5">
        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{
                background: `${game.color}20`,
                border: `1.5px solid ${game.color}35`,
              }}
            >
              {game.icon}
            </div>
            <div>
              <h3 className="font-black text-white text-base leading-tight">
                {game.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ background: game.color }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-xs text-white/40">
                  {game.playerCount > 0
                    ? `${game.playerCount} playing`
                    : 'Be first!'}
                </span>
              </div>
            </div>
          </div>

          {/* Status badge */}
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
            {!game.isHot && !game.isNew && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 border border-blue-500/30 text-blue-400">
                🟢 LIVE
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-white/40 leading-relaxed mb-3 line-clamp-2">
          {game.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {game.tags.map((tag) => (
            <GameBadge key={tag} label={tag} color={game.color} />
          ))}
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/30 mb-0.5">Bet Range</p>
            <p className="text-sm font-black text-white">
              {'₹'}
              {game.minBet}
              <span className="text-white/30 font-normal"> - </span>
              {'₹'}
              {game.maxBet.toLocaleString()}
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
// HERO BANNER
// ============================================================
const HeroBanner: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl mb-6 p-5"
      style={{
        background: 'linear-gradient(135deg, #1a0a00 0%, #2d1500 50%, #1a0a00 100%)',
        border: '1px solid rgba(245,158,11,0.2)',
      }}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(circle at 80% 50%, #F59E0B, transparent 60%)',
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-black">
            Premium Gaming Platform
          </span>
        </div>
        <h2 className="text-2xl font-black text-white mb-2 leading-tight">
          Play Real Games,
          <br />
          <span className="text-yellow-400">Win Real Money</span>
        </h2>
        <p className="text-white/40 text-sm mb-4">
          6 games • Instant withdrawal • 24/7 support
        </p>
        <div className="flex gap-2 flex-wrap">
          {['🔒 100% Secure', '⚡ Instant Pay', '🎯 Fair Play'].map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400/80 text-xs font-bold"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// STATS BAR
// ============================================================
const StatsBar: React.FC<{ totalPlayers: number }> = ({ totalPlayers }) => {
  const stats = [
    { label: 'Live Players', value: totalPlayers, icon: '👥', color: '#10B981' },
    { label: 'Active Games', value: 6, icon: '🎮', color: '#F59E0B' },
    { label: 'Total Games', value: '1000+', icon: '🏆', color: '#8B5CF6' },
  ]

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-3 rounded-2xl border border-white/5 text-center"
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
}

// ============================================================
// QUICK PLAY STRIP
// ============================================================
const QuickPlayStrip: React.FC<{
  games: GameItem[]
  onPlay: (route: string) => void
}> = ({ games, onPlay }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-white/50 uppercase tracking-wider">
          Quick Play
        </h3>
        <TrendingUp className="w-4 h-4 text-white/30" />
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {games.slice(0, 4).map((game) => (
          <motion.button
            key={game.id}
            onClick={() => onPlay(game.route)}
            whileTap={{ scale: 0.93 }}
            className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border"
            style={{
              background: `${game.color}10`,
              borderColor: `${game.color}25`,
              minWidth: 80,
            }}
          >
            <span className="text-3xl">{game.icon}</span>
            <span className="text-xs font-bold text-white/50 text-center leading-tight">
              {game.title.split(' ')[0]}
            </span>
            <span className="text-xs font-black" style={{ color: game.color }}>
              {'₹'}{game.minBet}+
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// MAIN GAMEHUB
// ============================================================
const GameHub: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { balance } = useWallet()

  const [games, setGames] = useState<GameItem[]>(INITIAL_GAMES)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [totalPlayers, setTotalPlayers] = useState(0)

  // Live player counts
  useEffect(() => {
    // Ludo
    const ludoUnsub = onSnapshot(
      query(collection(db, 'ludo_rooms'), where('status', '==', 'playing')),
      (snap) => {
        setGames((prev) =>
          prev.map((g) =>
            g.id === 'ludo' ? { ...g, playerCount: snap.size * 2 } : g
          )
        )
      }
    )

    // Poker
    const pokerUnsub = onSnapshot(
      query(collection(db, 'poker_tables'), where('isActive', '==', true)),
      (snap) => {
        let count = 0
        snap.docs.forEach((d) => {
          count += d.data().players?.length || 0
        })
        setGames((prev) =>
          prev.map((g) =>
            g.id === 'poker' ? { ...g, playerCount: count } : g
          )
        )
      }
    )

    return () => {
      ludoUnsub()
      pokerUnsub()
    }
  }, [])

  // Total players
  useEffect(() => {
    const total = games.reduce((sum, g) => sum + g.playerCount, 0)
    setTotalPlayers(total)
  }, [games])

  // Filter games
  const filteredGames = games.filter((game) => {
    const matchFilter =
      activeFilter === 'all'
        ? true
        : activeFilter === 'hot'
        ? game.isHot
        : activeFilter === 'multiplayer'
        ? game.type === 'multiplayer'
        : activeFilter === 'global'
        ? game.type === 'global'
        : true

    const matchSearch =
      searchQuery === '' ||
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase())

    return matchFilter && matchSearch
  })

  const handlePlay = (route: string) => {
    navigate(route)
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-yellow-400" />
              Game Hub
            </h1>
            <p className="text-xs text-white/40">
              {totalPlayers > 0
                ? `${totalPlayers} players online`
                : '6 games available'}
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <span className="text-yellow-400 text-sm font-black">
              {'₹'}{balance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-white/30 text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="flex-1 bg-transparent text-white placeholder-white/25 text-sm outline-none"
            />
            {searchQuery !== '' && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-white/30 hover:text-white/60 text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {FILTERS.map((filter) => (
            <motion.button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap',
                activeFilter === filter.id
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'text-white/40 hover:text-white/60 bg-white/5'
              )}
            >
              <span>{filter.icon}</span>
              {filter.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {/* Hero */}
        <HeroBanner />

        {/* Stats */}
        <StatsBar totalPlayers={totalPlayers} />

        {/* Quick Play */}
        {activeFilter === 'all' && searchQuery === '' && (
          <QuickPlayStrip games={games} onPlay={handlePlay} />
        )}

        {/* Games List */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-white/50 uppercase tracking-wider">
              {activeFilter === 'all'
                ? 'All Games'
                : activeFilter === 'hot'
                ? '🔥 Hot Games'
                : activeFilter === 'multiplayer'
                ? '⚔️ 1v1 Battles'
                : '🌍 Global Rooms'}
              <span className="text-white/25 ml-2 font-normal normal-case">
                ({filteredGames.length})
              </span>
            </h2>
          </div>

          <AnimatePresence mode="wait">
            {filteredGames.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-16"
              >
                <p className="text-5xl mb-4">🔍</p>
                <p className="text-white/50 font-bold">No games found</p>
                <p className="text-white/30 text-sm mt-1">
                  Try a different search or filter
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setActiveFilter('all')
                  
