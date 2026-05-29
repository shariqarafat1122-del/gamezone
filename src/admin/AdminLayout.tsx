import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Wallet, ArrowDownLeft, ArrowUpRight,
  Gamepad2, Bell, BarChart3, Settings, LogOut, Shield, Menu, X
} from 'lucide-react';
import { logOut } from '../firebase/authService';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/deposits', icon: ArrowDownLeft, label: 'Deposits' },
  { path: '/admin/withdrawals', icon: ArrowUpRight, label: 'Withdrawals' },
  { path: '/admin/games', icon: Gamepad2, label: 'Games' },
  { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { path: '/admin/reports', icon: BarChart3, label: 'Reports' },
];

export const AdminLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logOut();
    navigate('/auth');
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
            <Shield size={18} className="text-black" />
          </div>
          <div>
            <span className="font-black text-base gold-text">Admin Panel</span>
            <p className="text-[10px] text-gray-600">GameZone Premium</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => { navigate(path); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-2">
          <img src={userProfile?.avatar} alt="Admin" className="w-8 h-8 rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{userProfile?.name}</p>
            <p className="text-[10px] text-yellow-400">Administrator</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 flex-col bg-[#12121a] border-r border-white/5 fixed h-screen overflow-y-auto">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-[#12121a] border-r border-white/5 z-50 lg:hidden overflow-y-auto"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-30 h-14 glass border-b border-white/5 flex items-center px-4 gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-white/10">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-yellow-400" />
            <span className="text-sm font-bold text-gray-300">
              {NAV_ITEMS.find(n => n.path === location.pathname)?.label || 'Admin'}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 live-indicator" />
              <span className="text-xs text-green-400">Live</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
