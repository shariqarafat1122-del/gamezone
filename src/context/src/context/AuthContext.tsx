// src/context/AuthContext.tsx
import React, {
  createContext, useContext, useEffect, useState, useCallback
} from 'react'
import {
  User, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInAnonymously, updateProfile, PhoneAuthProvider,
  signInWithPhoneNumber, RecaptchaVerifier
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import type { UserProfile } from '../types'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>
  signInAsGuest: () => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

async function createUserProfile(user: User, extra?: Partial<UserProfile>) {
  const profileRef = doc(db, 'users', user.uid)
  const walletRef = doc(db, 'wallets', user.uid)

  const profile: UserProfile = {
    uid: user.uid,
    name: user.displayName || extra?.name || 'Player',
    username: `player_${user.uid.slice(0, 6)}`,
    email: user.email || '',
    mobile: user.phoneNumber || '',
    avatar: user.photoURL || '',
    role: 'user',
    status: 'active',
    walletBalance: 0,
    winningBalance: 0,
    depositBalance: 0,
    totalDeposit: 0,
    totalWithdraw: 0,
    totalBet: 0,
    totalWin: 0,
    totalGames: 0,
    referralCode: `GZ${user.uid.slice(0, 6).toUpperCase()}`,
    kycStatus: 'none',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...extra,
  }

  await setDoc(profileRef, profile)
  await setDoc(walletRef, {
    uid: user.uid,
    balance: 0,
    winningBalance: 0,
    depositBalance: 0,
    bonusBalance: 0,
    lockedBalance: 0,
    updatedAt: serverTimestamp(),
  })

  return profile
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (uid: string) => {
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      setUserProfile(snap.data() as UserProfile)
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const ref = doc(db, 'users', firebaseUser.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile)
        } else {
          const profile = await createUserProfile(firebaseUser)
          setUserProfile(profile)
        }
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    await signInWithPopup(auth, provider)
  }

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(user, { displayName: name })
    await createUserProfile(user, { name })
  }

  const signInAsGuest = async () => {
    await signInAnonymously(auth)
  }

  const logout = async () => {
    await signOut(auth)
    setUserProfile(null)
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid)
  }

  const isAdmin = userProfile?.role === 'admin'

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading, isAdmin,
      signInWithGoogle, signInWithEmail, signUpWithEmail,
      signInAsGuest, logout, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
