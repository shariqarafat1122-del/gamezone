import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, Trophy, Gamepad2, Wallet,
  Edit3, Save, X, Crown, Star, Shield, Copy, CheckCircle
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { toast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../firebase/userService';
import { logOut } from '../firebase/authService';
import { useNavigate } from 'react-router-dom';

export const ProfilePage = () => {
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userProfile?.name || '');
  const [editUsername, setEditUsername] = useState(userProfile?.username || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    if (!userProfile || !editName.trim()) { toast.error('Name is required'); return; }
    setIsSaving(true);
    try {
      await updateUserProfile(userProfile.uid, { name: editName.trim(), username: editUsername.trim() });
      setIsEditing(false);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const copyRefCode = () => {
    const code = userProfile?.uid?.slice(0, 8).toUpperCase() || 'GAMEZ001';
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { label: 'Games Played', value: userProfile?.totalGames || 0, icon: <Gamepad2 size={18} className="text-blue-400" /> },
    { label: 'Total Won', value: `₹${(userProfile?.totalWin || 0).toFixed(0)}`, icon: <Trophy size={18} className="text-yellow-400" /> },
    { label: 'Total Bet', value: `₹${(userProfile?.totalBet || 0).toFixed(0)}`, icon: <Wallet size={18} className="text-purple-400" /> },
    { label: 'Deposited', value: `₹${(userProfile?.totalDeposit || 0).toFixed(0)}`, icon: <Crown size={18} className="text-green-400" /> },
  ];

  if (!userProfile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1a2e] to-[#16161f] border border-white/5 p-6 mb-6"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-yellow-500/5 blur-3xl" />

          <div className="flex items-start gap-4 relative">
            <div className="relative flex-shrink-0">
              <img
                src={userProfile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.uid}`}
                alt="Avatar"
                className="w-20 h-20 rounded-2xl border-2 border-yellow-500/30 bg-gray-800"
              />
              {isAdmin && (
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center">
                  <Shield size={14} className="text-black" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    className="input-dark text-sm font-bold w-full"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Full Name"
                  />
                  <input
                    className="input-dark text-sm w-full"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                    placeholder="username"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-black text-white">{userProfile.name}</h2>
                  <p className="text-sm text-gray-400">@{userProfile.username}</p>
                </>
              )}

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant={isAdmin ? 'gold' : 'default'}>
                  {isAdmin ? '👑 Admin' : '🎮 Player'}
                </Badge>
                <Badge variant={userProfile.status === 'active' ? 'green' : 'red'}>
                  {userProfile.status}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button onClick={handleSave} disabled={isSaving}
                    className="p-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30">
                    <Save size={16} />
                  </button>
                  <button onClick={() => setIsEditing(false)}
                    className="p-2 rounded-xl glass text-gray-400 hover:text-white">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)}
                  className="p-2 rounded-xl glass text-gray-400 hover:text-white">
                  <Edit3 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Contact info */}
          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
            {userProfile.email && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail size={14} className="text-gray-600" />
                <span>{userProfile.email}</span>
              </div>
            )}
            {userProfile.mobile && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Phone size={14} className="text-gray-600" />
                <span>{userProfile.mobile}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <User size={14} className="text-gray-600" />
              <span>UID: {userProfile.uid.slice(0, 16)}...</span>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {stat.icon}
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className="text-xl font-black text-white">{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Wallet Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-gold rounded-2xl p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Wallet Summary</h3>
            <button onClick={() => navigate('/wallet')} className="text-xs text-yellow-400 flex items-center gap-1">
              Manage <Wallet size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Main Balance', value: userProfile.walletBalance, color: 'text-yellow-400' },
              { label: 'Winning Balance', value: userProfile.winningBalance, color: 'text-green-400' },
              { label: 'Deposit Balance', value: userProfile.depositBalance, color: 'text-blue-400' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <span className="text-sm text-gray-400">{item.label}</span>
                <span className={`text-sm font-bold ${item.color}`}>₹{(item.value || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Referral */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-purple-900/20 p-5 mb-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Star size={16} className="text-purple-400" />
                <h3 className="font-bold text-white">Refer & Earn</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">Share your code and earn ₹50 per friend!</p>
              <div className="flex items-center gap-2 px-3 py-2 bg-black/30 rounded-xl">
                <span className="font-mono text-purple-400 font-bold tracking-wider">
                  {userProfile.uid.slice(0, 8).toUpperCase()}
                </span>
                <button onClick={copyRefCode} className="ml-auto">
                  {copied ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} className="text-gray-400" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Admin Panel Link */}
        {isAdmin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <Button
              variant="outline"
              fullWidth
              leftIcon={<Shield size={16} />}
              onClick={() => navigate('/admin')}
              className="mb-3"
            >
              Open Admin Panel
            </Button>
          </motion.div>
        )}

        {/* Logout */}
        <Button
          variant="danger"
          fullWidth
          onClick={async () => { await logOut(); navigate('/auth'); }}
        >
          Sign Out
        </Button>

        <div className="h-8" />
      </div>
    </MainLayout>
  );
};
