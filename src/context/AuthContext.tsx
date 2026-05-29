import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange } from '../firebase/authService';
import { subscribeToUserProfile } from '../firebase/userService';
import { UserProfile } from '../types';

interface AuthContextType {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  userProfile: null,
  isLoading: true,
  isAdmin: false,
  isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthChange((user) => {
      setFirebaseUser(user);
      if (profileUnsub) { profileUnsub(); profileUnsub = null; }

      if (user) {
        profileUnsub = subscribeToUserProfile(user.uid, (profile) => {
          setUserProfile(profile);
          setIsLoading(false);
        });
      } else {
        setUserProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const isAdmin = userProfile?.role === 'admin';
  const isAuthenticated = !!firebaseUser;

  return (
    <AuthContext.Provider value={{ firebaseUser, userProfile, isLoading, isAdmin, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
