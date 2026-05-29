import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Wallet, ChevronDown, Trophy, LogOut, User, Shield, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { logOut } from '../../firebase/authService';
import { useNavigate } from 'react-router-dom';
import { toast } from '../ui/Toast';

export const Header = () => {
  const { userProfile, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logOut();
      navigate('/auth');
      toast.success('Logged out successfully');
    } catch {
      toast.error('Failed to logout');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
            <Trophy size={18} className="text-black" />
          </div>
          <div className="hidden sm:block">
            <span className="font-black text-lg gold-text tracking-tight">GameZone</span>
            <span className="text-[10px] text-gray-500 block -mt-1 tracking-widest uppercase">Premium</span>
          </div>
        </div>

        {/* Live indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
          <span className="w-2 h-2 rounded-full bg-green-400 live-indicator" />
          <span className="text-xs text-green-400 font-medium">Live Games Active</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Wallet Balance */}
          {userProfile && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/wallet')}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl glass-gold border border-yellow-500/20 hover:border-yellow-500/40 transition-all"
            >
              <Wallet size={14} className="text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">₹{(userProfile.walletBalance || 0).toFixed(2)}</span>
            </motion.button>
          )}

          {/* Notifications */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/notifications')}
            className="relative p-2.5 rounded-xl glass hover:bg-white/10 transition-all"
          >
            <Bell size={18} className="text-gray-300" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-black flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </motion.button>

          {/* Profile Menu */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl glass hover:bg-white/10 transition-all"
            >
              <img
                src={userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`}
                alt="Avatar"
                className="w-7 h-7 rounded-full border border-yellow-500/30 bg-gray-800"
              />
              <span className="hidden sm:block text-sm font-medium text-gray-200 max-w-24 truncate">
                {userProfile?.name || 'Player'}
              </span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-52 bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-20"
                  >
                    {/* User info */}
                    <div className="p-4 border-b border-white/5">
                      <p className="text-sm font-bold text-white truncate">{userProfile?.name}</p>
                      <p className="text-xs text-gray-500 truncate">@{userProfile?.username}</p>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px] font-bold">
                          <Shield size={10} /> ADMIN
                        </span>
                      )}
                    </div>

                    {/* SM: Wallet */}
                    <div className="p-3 border-b border-white/5 sm:hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Wallet</span>
                        <span className="text-sm font-bold text-yellow-400">₹{(userProfile?.walletBalance || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="p-2">
                      <MenuItem icon={<User size={14} />} label="Profile" onClick={() => { navigate('/profile'); setShowMenu(false); }} />
                      <MenuItem icon={<Wallet size={14} />} label="Wallet" onClick={() => { navigate('/wallet'); setShowMenu(false); }} />
                      {isAdmin && (
                        <MenuItem icon={<Shield size={14} />} label="Admin Panel" onClick={() => { navigate('/admin'); setShowMenu(false); }} className="text-yellow-400" />
                      )}
                      <div className="my-1 border-t border-white/5" />
                      <MenuItem icon={<LogOut size={14} />} label="Logout" onClick={handleLogout} className="text-red-400" />
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

const MenuItem = ({ icon, label, onClick, className = '' }: { icon: React.ReactNode; label: string; onClick: () => void; className?: string }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm font-medium text-gray-300 transition-colors ${className}`}
  >
    {icon}
    {label}
  </button>
);
