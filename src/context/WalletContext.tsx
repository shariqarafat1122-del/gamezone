// src/context/WalletContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './AuthContext'
import type { WalletData } from '../types'

interface WalletContextType {
  balance: number
  winningBalance: number
  depositBalance: number
  totalBalance: number
  isLoading: boolean
}

const WalletContext = createContext<WalletContextType>({
  balance: 0,
  winningBalance: 0,
  depositBalance: 0,
  totalBalance: 0,
  isLoading: true,
})

export const useWallet = () => useContext(WalletContext)

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setWallet(null)
      setIsLoading(false)
      return
    }

    const unsub = onSnapshot(doc(db, 'wallets', user.uid), (snap) => {
      if (snap.exists()) {
        setWallet(snap.data() as WalletData)
      } else {
        setWallet({ uid: user.uid, balance: 0, winningBalance: 0, depositBalance: 0, bonusBalance: 0, lockedBalance: 0, updatedAt: null })
      }
      setIsLoading(false)
    })

    return unsub
  }, [user])

  return (
    <WalletContext.Provider value={{
      balance: wallet?.balance || 0,
      winningBalance: wallet?.winningBalance || 0,
      depositBalance: wallet?.depositBalance || 0,
      totalBalance: (wallet?.balance || 0) + (wallet?.winningBalance || 0),
      isLoading,
    }}>
      {children}
    </WalletContext.Provider>
  )
}
