import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Zap, TrendingUp, Lock } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { Badge } from '../components/ui/Badge';

const GAMES = [
  {
    id: 'color-prediction',
    name: 'Color Prediction',
    emoji: '🎨',
    desc: 'Predict Red, Green or Violet! Win up to 9x your bet amount instantly.',
    players: '2,437',
    minBet: 10,
    maxBet: 10000,
    type: 'Round Based',
    color: 'from-purple-600 to-pink-600',
    borderColor: 'border-purple-500/30',
    hot: true,
    multiplier: '9x',
    available: true,
  },
  {
    id: 'dragon-tiger',
    name: 'Dragon Tiger',
    emoji: '🐉',
    desc: 'Dragon vs Tiger card game! Instant results, 1.9x multiplier!',
    players: '3,218',
    minBet: 10,
    maxBet: 10000,
    type: 'Round Based',
    color: 'from-red-600 to-orange-500',
    borderColor: 'border-red-500/30',
    hot: true,
    multiplier: '1.9x',
    available: true,
  },
  {
    id: 'ludo',
    name: 'Ludo Premium',
    emoji: '🎲',
    desc: 'Classic Ludo with real money! Beat opponents and win the pot.',
    players: '1,892',
    minBet: 10,
    maxBet: 500,
    type: 'Multiplayer',
    color: 'from-blue-600 to-cyan-500',
    borderColor: 'border-blue-500/30',
    hot: false,
    multiplier: '2x',
    available: true,
  },
  {
    id: 'odd-even',
    name: 'Odd Even',
    emoji: '⚡',
    desc: 'Simple & fast! Bet on Odd or Even number and win instantly.',
    players: '1,156',
    minBet: 10,
    maxBet: 5000,
    type: 'Round Based',
    color: 'from-green-600 to-emerald-500',
    borderColor: 'border-green-500/30',
    hot: false,
    multiplier: '1.9x',
    available: true,
  },
  {
    id: 'andar-bahar',
    name: 'Andar Bahar',
    emoji: '🎴',
    desc: 'Traditional Indian card game! Bet on Andar or Bahar and win.',
    players: '892',
    minBet: 10,
    maxBet: 5000,
    type: 'Round Based',
    color: 'from-amber-600 to-yellow-500',
    borderColor: 'border-amber-500/30',
    hot: false,
    multiplier: '1.9x',
    available: true,
  },
  {
    id: 'poker',
    name: 'Texas Hold\'em',
    emoji: '♠️',
    desc: 'Premium poker tables! Compete with players for massive pots.',
    players: '567',
    minBet: 10,
    maxBet: 1000,
    type: 'Multiplayer',
    color: 'from-indigo-600 to-violet-600',
    borderColor: 'border-indigo-500/30',
    hot: false,
    multiplier: 'Pot',
    available: true,
  },
];

export const GamesPage = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-black text-white mb-1">All Games</h1>
          <p className="text-sm text-gray-500">Choose your game and start winning!</p>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4 p-4 rounded-2xl bg-[#16161f] border border-white/5 mb-6"
        >
          <div className="flex-1 text-center">
            <p className="text-lg font-black gold-text">6</p>
            <p className="text-[10px] text-gray-500">Games</p>
          </div>
          <div className="w-px h-8 bg-white/5" />
          <div className="flex-1 text-center">
            <p className="text-lg font-black text-green-400">10K+</p>
            <p className="text-[10px] text-gray-500">Players</p>
          </div>
          <div className="w-px h-8 bg-white/5" />
          <div className="flex-1 text-center">
            <p className="text-lg font-black text-purple-400">9x</p>
            <p className="text-[10px] text-gray-500">Max Win</p>
          </div>
          <div className="w-px h-8 bg-white/5" />
          <div className="flex-1 text-center flex justify-center">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 live-indicator" />
              <p className="text-[10px] text-green-400">Live</p>
            </div>
          </div>
        </motion.div>

        {/* Games Grid */}
        <div className="space-y-4">
          {GAMES.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => game.available && navigate(`/games/${game.id}`)}
              className={`relative overflow-hidden rounded-2xl border ${game.borderColor} bg-[#16161f] cursor-pointer group`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-5 group-hover:opacity-15 transition-opacity duration-300`} />

              <div className="relative p-4">
                <div className="flex items-start gap-4">
                  {/* Emoji/Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <span className="text-3xl">{game.emoji}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-base font-bold text-white">{game.name}</h3>
                      {game.hot && <Badge variant="red">🔥 HOT</Badge>}
                      <Badge variant="gold">{game.multiplier}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mb-3">{game.desc}</p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1 text-green-400">
                        <Users size={11} />
                        <span>{game.players} playing</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <TrendingUp size={11} />
                        <span>₹{game.minBet} - ₹{game.maxBet}</span>
                      </div>
                      <Badge variant="gray" size="sm">{game.type}</Badge>
                    </div>
                  </div>

                  {/* Play button */}
                  <div className="flex-shrink-0">
                    {game.available ? (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 rounded-xl bg-gradient-to-r ${game.color} text-white text-sm font-bold flex items-center gap-1`}
                      >
                        <Zap size={14} />
                        Play
                      </motion.div>
                    ) : (
                      <div className="px-4 py-2 rounded-xl bg-gray-700/50 text-gray-500 text-sm font-bold flex items-center gap-1">
                        <Lock size={14} />
                        Soon
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="h-8" />
      </div>
    </MainLayout>
  );
};
