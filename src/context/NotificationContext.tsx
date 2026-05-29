// src/context/NotificationContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  collection, query, where, orderBy, limit,
  onSnapshot, updateDoc, doc, writeBatch
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './AuthContext'
import type { Notification } from '../types'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (notifId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  isLoading: boolean
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  isLoading: true,
})

export const useNotifications = () => useContext(NotificationContext)

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setIsLoading(false)
      return
    }

    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(d => ({ ...d.data(), notifId: d.id } as Notification))
      setNotifications(notifs)
      setIsLoading(false)
    })

    return unsub
  }, [user])

  const markAsRead = async (notifId: string) => {
    await updateDoc(doc(db, 'notifications', notifId), {
      isRead: true,
      readAt: new Date(),
    })
  }

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead)
    const batch = writeBatch(db)
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.notifId), { isRead: true })
    })
    await batch.commit()
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, markAsRead, markAllAsRead, isLoading,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}
