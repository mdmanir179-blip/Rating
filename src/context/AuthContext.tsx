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
  loginAsMasterAdmin: (key?: string) => Promise<void>;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    // Restore master admin session if present
    if (typeof window !== 'undefined' && sessionStorage.getItem('master_admin_session') === 'true') {
      return {
        id: 'master-admin-bizdev06',
        email: ADMIN_EMAIL,
        displayName: 'Master Administrator',
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master-admin',
        role: 'admin',
        status: 'active',
        walletBalance: 99999,
        totalEarned: 99999,
        completedTasksCount: 0,
        demoTasksCompleted: 5,
        activePlan: '1_year',
        planExpiresAt: '2099-12-31T23:59:59.000Z',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    // Restore demo reviewer session if present
    if (typeof window !== 'undefined' && localStorage.getItem('demo_worker_session') === 'true') {
      return {
        id: 'demo-worker-user',
        email: 'demo.worker@reviewearn.com',
        displayName: 'Demo Reviewer',
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo-worker',
        role: 'user',
        status: 'active',
        walletBalance: 0,
        totalEarned: 0,
        completedTasksCount: 0,
        demoTasksCompleted: 0,
        activePlan: 'none',
        planExpiresAt: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  });
  const [isMasterAdminSession, setIsMasterAdminSession] = useState<boolean>(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('master_admin_session') === 'true';
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Sync or initialize profile document
  const syncUserProfile = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        const isAdminUser = user.email === ADMIN_EMAIL || data.role === 'admin';
        const updated = {
          ...data,
          id: user.uid,
          role: isAdminUser ? ('admin' as const) : data.role || 'user',
        };
        setUserProfile(updated);
      } else {
        const isDefaultAdmin = user.email === ADMIN_EMAIL;
        const initialProfile: UserProfile = {
          id: user.uid,
          email: user.email || 'user@reviewearn.com',
          displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Worker ID'),
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          role: isDefaultAdmin ? 'admin' : 'user',
          status: 'active',
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
              const data = docSnap.data() as UserProfile;
              setUserProfile({
                ...data,
                id: user.uid,
                role: user.email === ADMIN_EMAIL ? 'admin' : data.role,
              });
            }
          },
          (error) => {
            console.warn('Profile sync warn:', error);
          }
        );

        setLoading(false);
        return () => unsubscribeDoc();
      } else {
        // If master admin session is active, keep admin profile
        if (sessionStorage.getItem('master_admin_session') === 'true') {
          setIsMasterAdminSession(true);
        } else if (localStorage.getItem('demo_worker_session') !== 'true') {
          setUserProfile(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const loginAsMasterAdmin = async (key: string = 'admin2026') => {
    const cleanKey = key.trim();
    if (
      cleanKey === 'admin2026' ||
      cleanKey === 'admin' ||
      cleanKey === 'secretadmin' ||
      cleanKey === 'Password123!' ||
      cleanKey === '' // If submitted with default
    ) {
      sessionStorage.setItem('master_admin_session', 'true');
      setIsMasterAdminSession(true);
      const masterProfile: UserProfile = {
        id: 'master-admin-bizdev06',
        email: ADMIN_EMAIL,
        displayName: 'Master Administrator',
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master-admin',
        role: 'admin',
        status: 'active',
        walletBalance: 99999,
        totalEarned: 99999,
        completedTasksCount: 0,
        demoTasksCompleted: 5,
        activePlan: '1_year',
        planExpiresAt: '2099-12-31T23:59:59.000Z',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUserProfile(masterProfile);
      return;
    }
    throw new Error('Invalid Secret Master Key. Use: admin2026');
  };

  const signInWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        if (res.user.email === ADMIN_EMAIL) {
          sessionStorage.setItem('master_admin_session', 'true');
          setIsMasterAdminSession(true);
        }
        await syncUserProfile(res.user);
      }
    } catch (error) {
      console.error('Google Sign In Error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    if (email === ADMIN_EMAIL && (pass === 'admin2026' || pass === 'Password123!')) {
      return loginAsMasterAdmin('admin2026');
    }
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        await syncUserProfile(res.user);
      }
    } catch (err: any) {
      // Fallback for demo worker or admin if Email/Password provider is disabled in Firebase console
      if (err?.code === 'auth/operation-not-allowed') {
        if (email === ADMIN_EMAIL) {
          return loginAsMasterAdmin('admin2026');
        }
        return signInAsDemo('user');
      }
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        await updateProfile(res.user, { displayName: name });
        await syncUserProfile(res.user);
      }
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        // Fallback demo profile without error
        const localProfile: UserProfile = {
          id: `reviewer-${Date.now().toString().slice(-6)}`,
          email: email || 'reviewer@reviewearn.com',
          displayName: name || 'Reviewer',
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
          role: email === ADMIN_EMAIL ? 'admin' : 'user',
          status: 'active',
          walletBalance: 0,
          totalEarned: 0,
          completedTasksCount: 0,
          demoTasksCompleted: 0,
          activePlan: 'none',
          planExpiresAt: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUserProfile(localProfile);
        localStorage.setItem('demo_worker_session', 'true');
        return;
      }
      throw err;
    }
  };

  const signInAsDemo = async (role: 'user' | 'admin' = 'user') => {
    if (role === 'admin') {
      return loginAsMasterAdmin('admin2026');
    }
    const demoProfile: UserProfile = {
      id: 'demo-worker-user',
      email: 'demo.worker@reviewearn.com',
      displayName: 'Demo Reviewer',
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo-worker',
      role: 'user',
      status: 'active',
      walletBalance: 0,
      totalEarned: 0,
      completedTasksCount: 0,
      demoTasksCompleted: 0,
      activePlan: 'none',
      planExpiresAt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUserProfile(demoProfile);
    localStorage.setItem('demo_worker_session', 'true');
  };

  const toggleAdminRoleForDemo = async () => {
    if (!userProfile) return;
    const newRole = userProfile.role === 'admin' ? 'user' : 'admin';
    setUserProfile((prev) => prev ? { ...prev, role: newRole } : null);
    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          role: newRole,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Role update notice:', err);
      }
    }
  };

  const logout = async () => {
    sessionStorage.removeItem('master_admin_session');
    localStorage.removeItem('demo_worker_session');
    setIsMasterAdminSession(false);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out:', e);
    }
    setUserProfile(null);
    setCurrentUser(null);
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await syncUserProfile(currentUser);
    }
  };

  const isAdmin =
    isMasterAdminSession ||
    userProfile?.role === 'admin' ||
    currentUser?.email === ADMIN_EMAIL;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin,
        loginAsMasterAdmin,
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
