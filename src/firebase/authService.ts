import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User,
  RecaptchaVerifier,
  ConfirmationResult,
  updateProfile,
} from 'firebase/auth';
import { auth } from './config';
import { createUserProfile, getUserProfile } from './userService';
import { UserProfile } from '../types';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

// ============================================================
// EMAIL AUTH
// ============================================================

export const signUpWithEmail = async (email: string, password: string, name: string): Promise<UserProfile> => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await createUserProfile(cred.user.uid, {
    name,
    email,
    avatar: cred.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cred.user.uid}`,
  });
  const profile = await getUserProfile(cred.user.uid);
  return profile!;
};

export const signInWithEmail = async (email: string, password: string): Promise<UserProfile> => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  let profile = await getUserProfile(cred.user.uid);
  if (!profile) {
    await createUserProfile(cred.user.uid, {
      name: cred.user.displayName || 'Player',
      email: cred.user.email || '',
    });
    profile = await getUserProfile(cred.user.uid);
  }
  return profile!;
};

// ============================================================
// GOOGLE AUTH
// ============================================================

export const signInWithGoogle = async (): Promise<UserProfile> => {
  const cred = await signInWithPopup(auth, googleProvider);
  let profile = await getUserProfile(cred.user.uid);
  if (!profile) {
    await createUserProfile(cred.user.uid, {
      name: cred.user.displayName || 'Player',
      email: cred.user.email || '',
      avatar: cred.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cred.user.uid}`,
    });
    profile = await getUserProfile(cred.user.uid);
  }
  return profile!;
};

// ============================================================
// PHONE AUTH
// ============================================================

export const setupRecaptcha = (containerId: string): RecaptchaVerifier => {
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
  });
};

export const sendPhoneOTP = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
  return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
};

export const verifyPhoneOTP = async (confirmationResult: ConfirmationResult, otp: string): Promise<UserProfile> => {
  const cred = await confirmationResult.confirm(otp);
  let profile = await getUserProfile(cred.user.uid);
  if (!profile) {
    await createUserProfile(cred.user.uid, {
      name: `Player_${cred.user.uid.slice(0, 6)}`,
      mobile: cred.user.phoneNumber || '',
    });
    profile = await getUserProfile(cred.user.uid);
  }
  return profile!;
};

// ============================================================
// GUEST AUTH
// ============================================================

export const signInAsGuest = async (): Promise<UserProfile> => {
  const cred = await signInAnonymously(auth);
  let profile = await getUserProfile(cred.user.uid);
  if (!profile) {
    await createUserProfile(cred.user.uid, {
      name: `Guest_${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      username: `guest_${cred.user.uid.slice(0, 6)}`,
    });
    profile = await getUserProfile(cred.user.uid);
  }
  return profile!;
};

// ============================================================
// SIGN OUT
// ============================================================

export const logOut = async (): Promise<void> => {
  await signOut(auth);
};

// ============================================================
// AUTH STATE LISTENER
// ============================================================

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
