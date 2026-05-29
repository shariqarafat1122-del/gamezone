import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Notification } from '../types';
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from '../firebase/userService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userProfile?.uid) { setNotifications([]); return; }
    const unsub = subscribeToNotifications(userProfile.uid, setNotifications);
    return () => unsub();
  }, [userProfile?.uid]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id: string) => {
    await markNotificationRead(id);
  };

  const markAllAsRead = async () => {
    if (!userProfile?.uid) return;
    await markAllNotificationsRead(userProfile.uid);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
