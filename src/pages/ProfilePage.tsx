// src/pages/ProfilePage.tsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Phone, Edit3, LogOut,
  Shield, Copy, CheckCircle,
} from 'lucide-react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
// ✅ Fixed: Import from correct path
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { toast } from 'sonner'

const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  // ✅ Fixed: No authService import needed - use AuthContext
  const { user, userProfile, logout, refreshProfile } = useAuth()
  const { balance, winningBalance } = useWallet()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(userProfile?.name || '')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyReferral = () => {
    if (!userProfile?.referralCode) return
    navigator.clipboard.writeText(userProfile.referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Referral code copied!')
  }

  const handleSave = async () => {
    if (!user || !name.trim()) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        updatedAt: serverTimestamp(),
      })
      await refreshProfile()
      setEditing(false)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/auth')
  }

  const stats = [
    {
      label: 'Total Games',
      value: userProfile?.totalGames || 0,
      icon: '🎮',
      color: '#3B82F6',
    },
    {
      label: 'Total Wins',
      value: userProfile?.totalWin || 0,
      icon: '🏆',
      color: '#F59E0B',
    },
    {
      label: 'Total Bet',
      value: `₹${(userProfile?.totalBet || 0).toLocaleString()}`,
      icon: '💰',
      color: '#8B5CF6',
    },
    {
      label: 'Win Rate',
      value:
        userProfile?.totalGames && userProfile.totalGames > 0
          ? `${Math.round((userProfile.totalWin / userProfile.totalGames) * 100)}%`
          : '0%',
      icon: '📈',
      color: '#10B981',
    },
  ]

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <User className="w-5 h-5 text-yellow-400" />
            My Profile
          </h1>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </motion.button>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-yellow-500/30 shadow-2xl">
              {userProfile?.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-yellow-500/30 to-amber-600/30 flex items-center justify-center">
                  <span className="text-yellow-400 font-black text-4xl">
                    {userProfile?.name?.charAt(0) || 'P'}
                  </span>
                </div>
              )}
            </div>
            {userProfile?.role === 'admin' && (
              <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center border-2 border-black">
                <Shield className="w-4 h-4 text-black" />
              </div>
            )}
          </div>

          {editing ? (
            <div className="w-full max-w-xs mb-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-center px-4 py-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-white font-black text-xl outline-none"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-yellow-500 text-black text-sm font-black"
                >
                  {saving ? '...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-black text-white">{userProfile?.name}</h2>
              <button
                onClick={() => {
                  setName(userProfile?.name || '')
                  setEditing(true)
                }}
              >
                <Edit3 className="w-4 h-4 text-white/30 hover:text-white/60" />
              </button>
            </div>
          )}

          <p className="text-white/40 text-sm">@{userProfile?.username}</p>

          {userProfile?.role === 'admin' && (
            <span className="mt-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-black flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Administrator
            </span>
          )}
        </div>

        {/* Wallet Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
            <p className="text-xs text-yellow-400/60 mb-1">Total Balance</p>
            <p className="text-xl font-black text-yellow-400">
              ₹{(balance + winningBalance).toLocaleString()}
            </p>
          </div>
          <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <p className="text-xs text-emerald-400/60 mb-1">Total Won</p>
            <p className="text-xl font-black text-emerald-400">
              ₹{(userProfile?.totalWin || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-2xl border border-white/5 bg-white/3"
            >
              <p className="text-xl mb-2">{stat.icon}</p>
              <p className="text-xl font-black" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Account Info */}
        <div className="space-y-2">
          <h3 className="text-xs font-black text-white/40 uppercase tracking-wider">
            Account Info
          </h3>
          {[
            { icon: Mail, label: 'Email', value: userProfile?.email || 'Not set' },
            { icon: Phone, label: 'Mobile', value: userProfile?.mobile || 'Not set' },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5"
            >
              <Icon className="w-4 h-4 text-white/30" />
              <div>
                <p className="text-xs text-white/30">{label}</p>
                <p className="text-sm font-bold text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Referral */}
        {userProfile?.referralCode && (
          <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5">
            <p className="text-xs text-purple-400/60 font-bold uppercase mb-2">
              Your Referral Code
            </p>
            <div className="flex items-center justify-between">
              <p className="text-xl font-black text-purple-400 tracking-widest">
                {userProfile.referralCode}
              </p>
              <button
                onClick={copyReferral}
                className="p-2 rounded-xl bg-purple-500/10"
              >
                {copied ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-purple-400" />
                )}
              </button>
            </div>
            <p className="text-xs text-white/30 mt-1">
              Share and earn bonus on referrals
            </p>
          </div>
        )}

        {/* Admin Panel Link */}
        {userProfile?.role === 'admin' && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/admin')}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-yellow-400" />
              <div className="text-left">
                <p className="font-bold text-white text-sm">Admin Panel</p>
                <p className="text-xs text-white/30">
                  Manage users, games and payments
                </p>
              </div>
            </div>
            <span className="text-yellow-400">→</span>
          </motion.button>
        )}
      </div>
    </div>
  )
}

export default ProfilePage
