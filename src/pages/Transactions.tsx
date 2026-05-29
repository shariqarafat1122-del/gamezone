// src/pages/Transactions.tsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { History, Filter } from 'lucide-react'
import {
  collection, query, where, orderBy, limit, onSnapshot
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../lib/utils'
import { cn } from '../lib/utils'

type TxFilter = 'all' | 'deposit' | 'withdrawal' | 'bet' | 'win'

const TX_CONFIG: Record<string, { icon: string; color: string; prefix: string; label: string }> = {
  deposit: { icon: '⬇️', color: '#10B981', prefix: '+', label: 'Deposit' },
  withdrawal: { icon: '⬆️', color: '#EF4444', prefix: '-', label: 'Withdrawal' },
  bet: { icon: '🎲', color: '#F59E0B', prefix: '-', label: 'Bet' },
  win: { icon: '🏆', color: '#10B981', prefix: '+', label: 'Win' },
  refund: { icon: '↩️', color: '#3B82F6', prefix: '+', label: 'Refund' },
  bonus: { icon: '🎁', color: '#8B5CF6', prefix: '+', label: 'Bonus' },
}

const Transactions: React.FC = () => {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<any[]>([])
  const [filter, setFilter] = useState<TxFilter>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const constraints: any[] = [
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50),
    ]

    if (filter !== 'all') {
      constraints.unshift(where('type', '==', filter))
    }

    const q = query(collection(db, 'transactions'), ...constraints)
    const unsub = onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ ...d.data(), id: d.id })))
      setIsLoading(false)
    })

    return unsub
  }, [user, filter])

  const filters: { id: TxFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'deposit', label: 'Deposits' },
    { id: 'withdrawal', label: 'Withdrawals' },
    { id: 'bet', label: 'Bets' },
    { id: 'win', label: 'Wins' },
  ]

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <h1 className="text-xl font-black text-white flex items-center gap-2 mb-3">
          <History className="w-5 h-5 text-yellow-400" />
          Transactions
        </h1>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-bold transition-all',
                filter === f.id
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'text-white/40 bg-white/5'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 rounded-2xl bg-white/3 animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📊</p>
            <p className="text-white/40 font-bold">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx, i) => {
              const config = TX_CONFIG[tx.type] || { icon: '💰', color: '#FFF', prefix: '', label: tx.type }
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: `${config.color}15` }}
                    >
                      {config.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{config.label}</p>
                      <p className="text-xs text-white/30">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-xs text-white/20 mt-0.5">
                        {tx.createdAt?.toDate ? formatDate(tx.createdAt.toDate()) : 'Just now'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black" style={{ color: config.color }}>
                      {config.prefix}₹{tx.amount?.toLocaleString()}
                    </p>
                    <p className={cn(
                      'text-xs mt-0.5 capitalize',
                      tx.status === 'completed' && 'text-emerald-400',
                      tx.status === 'pending' && 'text-yellow-400',
                      tx.status === 'failed' && 'text-red-400',
                    )}>
                      {tx.status}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Transactions
