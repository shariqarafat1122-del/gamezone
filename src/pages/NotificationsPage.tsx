// src/pages/NotificationsPage.tsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext'
import type { Notification, NotificationType } from '../types'
import { formatDate, cn } from '../lib/utils'

// ✅ Fixed: All NotificationType values included
const NOTIF_ICONS: Record<NotificationType, string> = {
  deposit_approved: '✅',
  deposit_rejected: '❌',
  withdrawal_approved: '💸',
  withdrawal_rejected: '🚫',
  match_started: '🎮',
  match_completed: '🏁',
  win_credited: '🏆',
  admin_announcement: '📢',
  bonus_credited: '🎁',
  maintenance: '🔧',   // ✅ Fixed: added maintenance
  system: '🔔',
}

// ✅ Fixed: All NotificationType values included
const NOTIF_COLORS: Record<NotificationType, string> = {
  deposit_approved: '#10B981',
  deposit_rejected: '#EF4444',
  withdrawal_approved: '#10B981',
  withdrawal_rejected: '#EF4444',
  match_started: '#3B82F6',
  match_completed: '#6B7280',
  win_credited: '#F59E0B',
  admin_announcement: '#8B5CF6',
  bonus_credited: '#F59E0B',
  maintenance: '#F97316',  // ✅ Fixed: added maintenance
  system: '#3B82F6',
}

const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } =
    useNotifications()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filtered =
    filter === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-400" />
            <h1 className="text-xl font-black text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-black">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </motion.button>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all',
                filter === f
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'text-white/40 bg-white/5'
              )}
            >
              {f}{' '}
              {f === 'unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/3 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔔</p>
            <p className="text-white/40 font-bold">
              {filter === 'unread'
                ? 'No unread notifications'
                : 'No notifications yet'}
            </p>
            <p className="text-white/20 text-sm mt-1">
              Play games and make transactions to get notified
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {filtered.map((notif: Notification, i: number) => {
                const icon = NOTIF_ICONS[notif.type] || '🔔'
                const color = NOTIF_COLORS[notif.type] || '#6B7280'

                return (
                  <motion.div
                    key={notif.notifId} // ✅ Fixed: use notifId
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() =>
                      !notif.isRead && markAsRead(notif.notifId) // ✅ Fixed: use notifId
                    }
                    className={cn(
                      'flex gap-3 p-4 rounded-2xl border cursor-pointer transition-all',
                      !notif.isRead
                        ? 'border-opacity-30'
                        : 'border-white/5 bg-white/3'
                    )}
                    style={
                      !notif.isRead
                        ? {
                            borderColor: `${color}30`,
                            background: `${color}08`,
                          }
                        : {}
                    }
                  >
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${color}15` }}
                    >
                      {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'text-sm font-bold',
                            !notif.isRead ? 'text-white' : 'text-white/70'
                          )}
                        >
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                            style={{ background: color }}
                          />
                        )}
                      </div>
                      <p className="text-xs text-white/40 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-xs text-white/20 mt-1.5">
                        {notif.createdAt?.toDate
                          ? formatDate(notif.createdAt.toDate())
                          : 'Just now'}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

export default NotificationsPage
