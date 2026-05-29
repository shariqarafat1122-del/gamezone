// src/pages/HomePage.tsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Bell, ArrowRight, ChevronRight, Trophy } from 'lucide-react'
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { useNotifications } from '../context/NotificationContext'
import type { Transaction } from '../types'
import { formatDate } from '../lib/utils'

const QUICK_GAMES = [
  { id: 'ludo', icon: '🎲', label: 'Ludo', route: '/games/ludo', color: '#F59E0B' },
  { id: 'color', icon: '🎨', label: 'Color', route: '/games/color', color: '#8B5CF6' },
  { id: 'poker', icon: '♠️', label: 'Poker', route: '/games/poker', color: '#10B981' },
  { id: 'oddeven', icon: '🔢', label: 'OddEven', route: '/games/oddeven', color: '#3B82F6' },
  { id: 'dragon', icon: '🐉', label: 'Dragon', route: '/games/dragon-tiger', color: '#EF4444' },
  { id: 'andar', icon: '🃏', label: 'Andar', route: '/games/andar-bahar', color: '#F97316' },
]

const TX_CONFIG: Record<string, { icon: string; color: string; prefix: string }> = {
  deposit: { icon: '⬇️', color: '#10B981', prefix: '+' },
  withdrawal: { icon: '⬆️', color: '#EF4444', prefix: '-' },
  bet: { icon: '🎲', color: '#F59E0B', prefix: '-' },
  win: { icon: '🏆', color: '#10B981', prefix: '+' },
  refund: { icon: '↩️', color: '#3B82F6', prefix: '+' },
  bonus: { icon: '🎁', color: '#8B5CF6', prefix: '+' },
}

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()
  const { balance, winningBalance, totalBalance } = useWallet()
  const { unreadCount } = useNotifications()

  // ✅ Fixed: Correct type - Transaction[]
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [winners, setWinners] = useState<any[]>([])

  const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Good Morning ☀️' : h < 17 ? 'Good Afternoon 🌤' : 'Good Evening 🌙'
  }

  // ✅ Fixed: Correct onSnapshot callback
  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    )

    const unsub = onSnapshot(q, (snap) => {
      // ✅ Fixed: Map directly to Transaction[] - no object wrapper
      const txList: Transaction[] = snap.docs.map((d) => ({
        ...d.data(),
        txId: d.id,
      } as Transaction))
      setTransactions(txList)
    })

    return unsub
  }, [user])

  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      where('type', '==', 'win'),
      orderBy('createdAt', 'desc'),
      limit(8)
    )
    const unsub = onSnapshot(q, (snap) => {
      setWinners(snap.docs.map((d) => d.data()))
    })
    return unsub
  }, [])

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/30">{greeting()}</p>
            <h1 className="text-xl font-black text-white">
              {userProfile?.name?.split(' ')[0] || 'Player'} 👋
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/notifications')}
              className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
            >
              <Bell className="w-4 h-4 text-white/60" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center border border-black">
                  <span className="text-white text-[9px] font-black">{unreadCount}</span>
                </div>
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-full border-2 border-yellow-500/30 overflow-hidden"
            >
              {userProfile?.avatar ? (
                <img src={userProfile.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-yellow-500/20 flex items-center justify-center">
                  <span className="text-yellow-400 font-black text-sm">
                    {userProfile?.name?.charAt(0) || 'P'}
                  </span>
                </div>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Wallet Card */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-5"
          style={{
            background: 'linear-gradient(135deg, #1a0e00, #2d1a00, #1a0e00)',
            border: '1px solid rgba(245,158,11,0.25)',
          }}
        >
          <div
            className="absolute inset-0 opacity-15"
            style={{ background: 'radial-gradient(circle at 80% 20%, #F59E0B, transparent 60%)' }}
          />
          <div className="relative">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
              Total Balance
            </p>
            <p className="text-4xl font-black text-white mb-4">
              ₹<span className="text-yellow-400">{totalBalance.toLocaleString()}</span>
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-black/30">
                <p className="text-xs text-white/30 mb-0.5">Deposit</p>
                <p className="text-base font-black text-white">₹{balance.toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-black/30">
                <p className="text-xs text-white/30 mb-0.5">Winnings</p>
                <p className="text-base font-black text-emerald-400">
                  ₹{winningBalance.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/wallet')}
                className="flex-1 py-2.5 rounded-2xl font-black text-sm text-black"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
              >
                + Add Money
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/wallet?tab=withdraw')}
                className="flex-1 py-2.5 rounded-2xl font-black text-sm text-white/60 border border-white/15 bg-white/5"
              >
                Withdraw
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Winners Ticker */}
        {winners.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-yellow-500/10 bg-yellow-500/5 py-3">
            <div className="flex items-center gap-2 px-3 mb-2">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-black text-yellow-400 uppercase">
                Recent Winners
              </span>
            </div>
            <motion.div
              className="flex gap-3 px-3"
              animate={{ x: [0, -400] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            >
              {[...winners, ...winners].map((w, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-1.5"
                >
                  <span className="text-xs">🏆</span>
                  <span className="text-xs font-black text-yellow-400 whitespace-nowrap">
                    +₹{w.amount?.toLocaleString()}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Quick Games */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-white/50 uppercase tracking-wider">
              Quick Play
            </h2>
            <button
              onClick={() => navigate('/games')}
              className="text-xs text-yellow-400 font-bold flex items-center gap-1"
            >
              All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {QUICK_GAMES.map((game, i) => (
              <motion.button
                key={game.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(game.route)}
                className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border min-w-[72px]"
                style={{
                  background: `${game.color}10`,
                  borderColor: `${game.color}25`,
                }}
              >
                <span className="text-2xl">{game.icon}</span>
                <span className="text-[11px] font-bold text-white/50">{game.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-white/50 uppercase tracking-wider">
              Recent Activity
            </h2>
            <button
              onClick={() => navigate('/transactions')}
              className="text-xs text-yellow-400 font-bold flex items-center gap-1"
            >
              See All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-10 rounded-2xl bg-white/3 border border-white/5">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-white/30 text-sm">No activity yet</p>
              <button
                onClick={() => navigate('/games')}
                className="mt-3 px-4 py-1.5 rounded-xl bg-yellow-500/10 text-yellow-400 text-xs font-bold"
              >
                Start Playing →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, i) => {
                const cfg = TX_CONFIG[tx.type] || { icon: '💰', color: '#fff', prefix: '' }
                return (
                  <motion.div
                    key={tx.txId} // ✅ Fixed: use txId not id
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                        style={{ background: `${cfg.color}15` }}
                      >
                        {cfg.icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white capitalize">{tx.type}</p>
                        <p className="text-xs text-white/25">
                          {tx.createdAt?.toDate
                            ? formatDate(tx.createdAt.toDate())
                            : 'Just now'}
                        </p>
                      </div>
                    </div>
                    <p className="font-black text-sm" style={{ color: cfg.color }}>
                      {cfg.prefix}₹{tx.amount?.toLocaleString()}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomePage
