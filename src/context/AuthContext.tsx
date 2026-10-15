import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signInAsDemo: (role?: 'user' | 'admin') => Promise<void>;
  toggleAdminRoleForDemo: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'bizdev06.tbc@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync or initialize profile document
  const syncUserProfile = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setUserProfile({ ...data, id: user.uid });
      } else {
        const isDefaultAdmin = user.email === ADMIN_EMAIL;
        const initialProfile: UserProfile = {
          id: user.uid,
          email: user.email || 'user@reviewearn.com',
          displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Worker ID'),
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          role: isDefaultAdmin ? 'admin' : 'user',
          walletBalance: 0,
          totalEarned: 0,
          completedTasksCount: 0,
          demoTasksCompleted: 0,
          activePlan: 'none',
          planExpiresAt: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(userRef, initialProfile);
        setUserProfile(initialProfile);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await syncUserProfile(user);

        // Real-time listener for profile updates
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeDoc = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile({ ...(docSnap.data() as UserProfile), id: user.uid });
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          }
        );

        setLoading(false);
        return () => unsubscribeDoc();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        await syncUserProfile(res.user);
      }
    } catch (error) {
      console.error('Google Sign In Error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      await syncUserProfile(res.user);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      await updateProfile(res.user, { displayName: name });
      await syncUserProfile(res.user);
    }
  };

  const signInAsDemo = async (role: 'user' | 'admin' = 'user') => {
    const demoEmail = role === 'admin' ? ADMIN_EMAIL : 'demo.worker@reviewearn.com';
    const demoPassword = 'Password123!';
    try {
      await signInWithEmail(demoEmail, demoPassword);
    } catch {
      // If doesn't exist, create it
      await signUpWithEmail(demoEmail, demoPassword, role === 'admin' ? 'Master Admin' : 'Demo Reviewer');
    }
  };

  const toggleAdminRoleForDemo = async () => {
    if (!currentUser || !userProfile) return;
    const newRole = userProfile.role === 'admin' ? 'user' : 'admin';
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date().toISOString(),
      });
      setUserProfile((prev) => prev ? { ...prev, role: newRole } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await syncUserProfile(currentUser);
    }
  };

  const isAdmin = userProfile?.role === 'admin' || currentUser?.email === ADMIN_EMAIL;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsDemo,
        toggleAdminRoleForDemo,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
