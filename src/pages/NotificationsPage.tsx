import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Trophy, Wallet, Megaphone, Shield, Zap, XCircle, AlertTriangle } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/ui/Button';
import { useNotifications } from '../context/NotificationContext';
import { Notification, NotificationType } from '../types';
import { format } from 'date-fns';

const getNotifIcon = (type: NotificationType) => {
  const icons: Partial<Record<NotificationType, React.ReactNode>> = {
    deposit_approved: <Wallet size={18} className="text-green-400" />,
    deposit_rejected: <XCircle size={18} className="text-red-400" />,
    withdrawal_approved: <Wallet size={18} className="text-blue-400" />,
    withdrawal_rejected: <XCircle size={18} className="text-red-400" />,
    win_credited: <Trophy size={18} className="text-yellow-400" />,
    match_started: <Zap size={18} className="text-green-400" />,
    match_completed: <Zap size={18} className="text-blue-400" />,
    admin_announcement: <Megaphone size={18} className="text-purple-400" />,
    maintenance: <AlertTriangle size={18} className="text-orange-400" />,
    bonus_credited: <Trophy size={18} className="text-purple-400" />,
  };
  return icons[type] || <Bell size={18} className="text-gray-400" />;
};

const getNotifBg = (type: NotificationType) => {
  const bgMap: Partial<Record<NotificationType, string>> = {
    deposit_approved: 'bg-green-500/10 border-green-500/20',
    deposit_rejected: 'bg-red-500/10 border-red-500/20',
    withdrawal_approved: 'bg-blue-500/10 border-blue-500/20',
    withdrawal_rejected: 'bg-red-500/10 border-red-500/20',
    win_credited: 'bg-yellow-500/10 border-yellow-500/20',
    match_started: 'bg-green-500/10 border-green-500/20',
    admin_announcement: 'bg-purple-500/10 border-purple-500/20',
    maintenance: 'bg-orange-500/10 border-orange-500/20',
  };
  return bgMap[type] || 'bg-white/5 border-white/10';
};

const NotificationItem = ({ notif, onClick }: { notif: Notification; onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    onClick={onClick}
    className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${getNotifBg(notif.type)} ${
      !notif.isRead ? 'ring-1 ring-yellow-500/20' : ''
    }`}
  >
    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
      {getNotifIcon(notif.type)}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white leading-tight">{notif.title}</p>
        {!notif.isRead && (
          <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0 mt-1.5" />
        )}
      </div>
      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{notif.message}</p>
      <p className="text-[10px] text-gray-600 mt-1.5">
        {notif.createdAt ? format(new Date(notif.createdAt as string), 'MMM d, yyyy h:mm a') : 'Just now'}
      </p>
    </div>
  </motion.div>
);

export const NotificationsPage = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <MainLayout>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-black text-white">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<CheckCheck size={14} />}
              onClick={markAllAsRead}
            >
              Mark All Read
            </Button>
          )}
        </motion.div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Bell size={32} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-400 mb-2">No Notifications</h3>
            <p className="text-gray-600 text-sm">Your notifications will appear here</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {/* Unread section */}
            {unreadCount > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">New</p>
                <div className="space-y-2">
                  <AnimatePresence>
                    {notifications.filter(n => !n.isRead).map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notif={notif}
                        onClick={() => markAsRead(notif.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Read section */}
            {notifications.filter(n => n.isRead).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">Earlier</p>
                <div className="space-y-2 opacity-70">
                  <AnimatePresence>
                    {notifications.filter(n => n.isRead).map((notif) => (
                      <NotificationItem key={notif.id} notif={notif} onClick={() => {}} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="h-8" />
      </div>
    </MainLayout>
  );
};
