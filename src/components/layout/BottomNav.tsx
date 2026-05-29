import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Gamepad2, Wallet, User, Bell } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/games', icon: Gamepad2, label: 'Games' },
  { path: '/wallet', icon: Wallet, label: 'Wallet' },
  { path: '/notifications', icon: Bell, label: 'Alerts' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bottom-nav">
      <div className="glass border-t border-white/5 px-2 py-2">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
            const isBell = path === '/notifications';

            return (
              <motion.button
                key={path}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(path)}
                className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 ${
                  isActive ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-2xl bg-yellow-500/10 border border-yellow-500/20"
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  />
                )}
                <div className="relative">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  {isBell && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium relative ${isActive ? 'text-yellow-400' : ''}`}>
                  {label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
