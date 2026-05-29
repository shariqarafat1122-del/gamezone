import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, TrendingUp, Trophy, Users, Zap, ArrowRight,
  Plus, Minus, ChevronRight, Crown, Star, Gift
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MainLayout } from '../layouts/MainLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { getUserTransactions } from '../firebase/userService';
import { Transaction } from '../types';
import { format } from 'date-fns';

const GAMES = [
  { id: 'color-prediction', name: 'Color Prediction', emoji: '🎨', desc: 'Predict the color, win 2x-9x!', players: '2.4K', color: 'from-purple-600 to-pink-600', hot: true },
  { id: 'ludo', name: 'Ludo Premium', emoji: '🎲', desc: 'Classic board game, win big!', players: '1.8K', color: 'from-blue-600 to-cyan-500', hot: false },
  { id: 'dragon-tiger', name: 'Dragon Tiger', emoji: '🐉', desc: 'Dragon vs Tiger, instant win!', players: '3.2K', color: 'from-red-600 to-orange-500', hot: true },
  { id: 'odd-even', name: 'Odd Even', emoji: '⚡', desc: 'Simple, fast, win 1.9x!', players: '1.1K', color: 'from-green-600 to-emerald-500', hot: false },
  { id: 'andar-bahar', name: 'Andar Bahar', emoji: '🎴', desc: 'Classic card game, 1.9x wins!', players: '892', color: 'from-amber-600 to-yellow-500', hot: false },
  { id: 'poker', name: 'Texas Hold\'em', emoji: '♠️', desc: 'Premium poker tables!', players: '567', color: 'from-indigo-600 to-violet-600', hot: false },
];

const WINNERS = [
  { name: 'Raj***', game: 'Color Prediction', amount: 4500, avatar: 'seed=raj' },
  { name: 'Pri***', game: 'Dragon Tiger', amount: 12000, avatar: 'seed=priya' },
  { name: 'Amo***', game: 'Ludo', amount: 2800, avatar: 'seed=amit' },
  { name: 'Sun***', game: 'Odd Even', amount: 7200, avatar: 'seed=sunil' },
  { name: 'Mee***', game: 'Poker', amount: 15000, avatar: 'seed=meena' },
];

export const HomePage = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activePlayers] = useState(Math.floor(Math.random() * 2000) + 3000);

  useEffect(() => {
    if (userProfile?.uid) {
      getUserTransactions(userProfile.uid, 5).then(setTransactions).catch(() => {});
    }
  }, [userProfile?.uid]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <MainLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-4 py-6 space-y-6"
      >
        {/* Welcome Banner */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-600/20 via-orange-600/10 to-transparent border border-yellow-500/20 p-5">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-yellow-500/10 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-orange-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Welcome back 👋</p>
                  <h2 className="text-2xl font-black text-white">{userProfile?.name?.split(' ')[0] || 'Player'}</h2>
                  <p className="text-xs text-gray-500 mt-1">@{userProfile?.username}</p>
                </div>
                <img
                  src={userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`}
                  alt="Avatar"
                  className="w-14 h-14 rounded-2xl border-2 border-yellow-500/30 bg-gray-800"
                />
              </div>
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 live-indicator" />
                  <span className="text-xs text-green-400 font-medium">{activePlayers.toLocaleString()} Live Players</span>
                </div>
                {userProfile?.totalGames && userProfile.totalGames > 0 && (
                  <Badge variant="gold">
                    <Trophy size={10} /> {userProfile.totalGames} Games
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Wallet Cards */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-3 gap-3">
            <WalletCard
              label="Total Balance"
              amount={userProfile?.walletBalance || 0}
              icon={<Wallet size={16} />}
              color="gold"
              onClick={() => navigate('/wallet')}
            />
            <WalletCard
              label="Winnings"
              amount={userProfile?.winningBalance || 0}
              icon={<TrendingUp size={16} />}
              color="green"
              onClick={() => navigate('/wallet')}
            />
            <WalletCard
              label="Deposits"
              amount={userProfile?.depositBalance || 0}
              icon={<Crown size={16} />}
              color="purple"
              onClick={() => navigate('/wallet')}
            />
          </div>
          <div className="flex gap-3 mt-3">
            <Button variant="gold" fullWidth leftIcon={<Plus size={16} />} onClick={() => navigate('/wallet/deposit')}>
              Add Money
            </Button>
            <Button variant="ghost" fullWidth leftIcon={<Minus size={16} />} onClick={() => navigate('/wallet/withdraw')}>
              Withdraw
            </Button>
          </div>
        </motion.div>

        {/* Live Games Section */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-yellow-400" />
              <h3 className="text-lg font-bold text-white">Live Games</h3>
              <span className="w-2 h-2 rounded-full bg-red-500 live-indicator" />
            </div>
            <button
              onClick={() => navigate('/games')}
              className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300"
            >
              See All <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {GAMES.slice(0, 4).map((game, i) => (
              <motion.div
                key={game.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/games/${game.id}`)}
                className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#16161f] cursor-pointer group"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                <div className="p-4 relative">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{game.emoji}</span>
                    {game.hot && (
                      <Badge variant="red" size="sm">
                        🔥 HOT
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white leading-tight">{game.name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5 leading-tight">{game.desc}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Users size={10} className="text-green-400" />
                    <span className="text-[10px] text-green-400">{game.players} playing</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Winners */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <Crown size={18} className="text-yellow-400" />
            <h3 className="text-lg font-bold text-white">Recent Winners</h3>
          </div>
          <div className="space-y-2">
            {WINNERS.map((winner, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#16161f] border border-white/5"
              >
                <div className="relative">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?${winner.avatar}`}
                    alt={winner.name}
                    className="w-9 h-9 rounded-full bg-gray-800 border border-white/10"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-yellow-400 flex items-center justify-center">
                    <Star size={8} className="text-black" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{winner.name}</p>
                  <p className="text-xs text-gray-500">{winner.game}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">+₹{winner.amount.toLocaleString()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
              <button onClick={() => navigate('/wallet')} className="text-xs text-yellow-400 flex items-center gap-1">
                View All <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#16161f] border border-white/5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    ['deposit', 'win', 'bonus', 'refund'].includes(tx.type)
                      ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {tx.type === 'deposit' ? <Plus size={14} className="text-green-400" /> :
                     tx.type === 'win' ? <Trophy size={14} className="text-green-400" /> :
                     tx.type === 'withdrawal' ? <Minus size={14} className="text-red-400" /> :
                     <Zap size={14} className={['win', 'bonus'].includes(tx.type) ? 'text-green-400' : 'text-red-400'} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{tx.description || tx.type}</p>
                    <p className="text-xs text-gray-500">
                      {tx.createdAt ? format(new Date(tx.createdAt as string), 'MMM d, h:mm a') : ''}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${
                    ['deposit', 'win', 'bonus', 'refund'].includes(tx.type) ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {['deposit', 'win', 'bonus', 'refund'].includes(tx.type) ? '+' : '-'}₹{tx.amount?.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Referral Banner */}
        <motion.div variants={itemVariants}>
          <div
            onClick={() => navigate('/profile')}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-500/20 p-5 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Gift size={16} className="text-purple-400" />
                  <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Refer & Earn</span>
                </div>
                <h4 className="text-white font-bold">Get ₹50 per referral!</h4>
                <p className="text-xs text-gray-400 mt-0.5">Invite friends and earn bonus instantly</p>
              </div>
              <ArrowRight size={20} className="text-purple-400 flex-shrink-0" />
            </div>
          </div>
        </motion.div>

        {/* Bottom spacing */}
        <div className="h-4" />
      </motion.div>
    </MainLayout>
  );
};

const WalletCard = ({
  label, amount, icon, color, onClick,
}: {
  label: string; amount: number; icon: React.ReactNode; color: 'gold' | 'green' | 'purple'; onClick: () => void;
}) => {
  const colorMap = {
    gold: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };
  return (
    <button onClick={onClick} className={`flex flex-col p-3 rounded-2xl border transition-all hover:scale-[1.02] ${colorMap[color]} w-full text-left`}>
      <div className={`${color === 'gold' ? 'text-yellow-400' : color === 'green' ? 'text-green-400' : 'text-purple-400'} mb-2`}>
        {icon}
      </div>
      <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
      <p className={`text-sm font-black mt-0.5 ${color === 'gold' ? 'text-yellow-400' : color === 'green' ? 'text-green-400' : 'text-purple-400'}`}>
        ₹{amount.toFixed(0)}
      </p>
    </button>
  );
};
