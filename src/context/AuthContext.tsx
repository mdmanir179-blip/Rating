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
  signInWithManualCredentials: (identifier: string, pass: string) => Promise<void>;
  signUpWithManualCredentials: (name: string, identifier: string, pass: string) => Promise<void>;
  signInAsDemo: (role?: 'user' | 'admin') => Promise<void>;
  toggleAdminRoleForDemo: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'bizdev06.tbc@gmail.com';

function makeUserFromProfile(profile: UserProfile): User {
  return {
    uid: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
  } as unknown as User;
}

const getDemoWorkerProfile = (): UserProfile => ({
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
});

const getMasterAdminProfile = (): UserProfile => ({
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
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('master_admin_session') === 'true') {
        return makeUserFromProfile(getMasterAdminProfile());
      }
      const savedCustomer = localStorage.getItem('customer_session');
      if (savedCustomer) {
        try {
          const parsed = JSON.parse(savedCustomer);
          return makeUserFromProfile(parsed);
        } catch (e) {}
      }
      if (localStorage.getItem('demo_worker_session') === 'true') {
        return makeUserFromProfile(getDemoWorkerProfile());
      }
    }
    return null;
  });

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('master_admin_session') === 'true') {
        return getMasterAdminProfile();
      }
      const savedCustomer = localStorage.getItem('customer_session');
      if (savedCustomer) {
        try {
          return JSON.parse(savedCustomer);
        } catch (e) {}
      }
      if (localStorage.getItem('demo_worker_session') === 'true') {
        return getDemoWorkerProfile();
      }
    }
    return null;
  });

  const [isMasterAdminSession, setIsMasterAdminSession] = useState<boolean>(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('master_admin_session') === 'true';
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Sync or initialize profile document in Firestore
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
        setCurrentUser(user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('customer_session', JSON.stringify(updated));
        }
      } else {
        const isDefaultAdmin = user.email === ADMIN_EMAIL;
        const initialProfile: UserProfile = {
          id: user.uid,
          email: user.email || 'user@reviewearn.com',
          displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Reviewer'),
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
        setCurrentUser(user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('customer_session', JSON.stringify(initialProfile));
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await syncUserProfile(user);

        // Real-time listener for profile updates
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeDoc = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              const merged = {
                ...data,
                id: user.uid,
                role: user.email === ADMIN_EMAIL ? ('admin' as const) : data.role,
              };
              setUserProfile(merged);
              localStorage.setItem('customer_session', JSON.stringify(merged));
            }
          },
          (error) => {
            console.warn('Profile sync warn:', error);
          }
        );

        setLoading(false);
        return () => unsubscribeDoc();
      } else {
        // If master admin session is active, keep admin profile & user
        if (sessionStorage.getItem('master_admin_session') === 'true') {
          setIsMasterAdminSession(true);
          const master = getMasterAdminProfile();
          setUserProfile(master);
          setCurrentUser(makeUserFromProfile(master));
        } else if (localStorage.getItem('customer_session')) {
          // Restore customer profile & user from persistent session
          try {
            const saved = localStorage.getItem('customer_session');
            if (saved) {
              const p = JSON.parse(saved);
              setUserProfile(p);
              setCurrentUser(makeUserFromProfile(p));
            }
          } catch (e) {}
        } else if (localStorage.getItem('demo_worker_session') === 'true') {
          const demo = getDemoWorkerProfile();
          setUserProfile(demo);
          setCurrentUser(makeUserFromProfile(demo));
        } else {
          setUserProfile(null);
          setCurrentUser(null);
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
      const masterProfile = getMasterAdminProfile();
      setUserProfile(masterProfile);
      setCurrentUser(makeUserFromProfile(masterProfile));
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

  const normalizeIdentifier = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.includes('@')) {
      const cleanEmail = trimmed.toLowerCase();
      return {
        email: cleanEmail,
        phone: '',
        isPhone: false,
        cleanId: cleanEmail.replace(/[^a-z0-9]/g, '_'),
      };
    }
    const digits = trimmed.replace(/[^0-9]/g, '');
    return {
      email: `${digits}@reviewearn.in`,
      phone: digits,
      isPhone: true,
      cleanId: `tel_${digits}`,
    };
  };

  const signInWithManualCredentials = async (rawIdentifier: string, pass: string) => {
    const trimmedId = rawIdentifier.trim();
    const cleanPass = pass.trim();

    if (!trimmedId) {
      throw new Error('Please enter your Email Address or Mobile Number.');
    }
    if (!cleanPass) {
      throw new Error('Please enter your password.');
    }

    if (trimmedId === ADMIN_EMAIL && (cleanPass === 'admin2026' || cleanPass === 'Password123!')) {
      return loginAsMasterAdmin('admin2026');
    }

    const { email, phone, isPhone, cleanId } = normalizeIdentifier(trimmedId);
    if (isPhone && phone.length < 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }
    if (!isPhone && (!email.includes('@') || !email.includes('.'))) {
      throw new Error('Please enter a valid email address.');
    }

    // 1. Try Firebase Auth with email & pass first
    try {
      const res = await signInWithEmailAndPassword(auth, email, cleanPass);
      if (res.user) {
        await syncUserProfile(res.user);
        return;
      }
    } catch (err: any) {
      console.warn('Firebase signIn notice:', err?.code || err?.message);
    }

    // 2. Lookup Firestore for this customer
    const docId = `user-${cleanId}`;
    let existingProfile: UserProfile | null = null;

    try {
      const snap = await getDoc(doc(db, 'users', docId));
      if (snap.exists()) {
        existingProfile = snap.data() as UserProfile;
      }
    } catch (e) {
      console.warn('Firestore lookup notice:', e);
    }

    // Also check local storage backup for offline or immediate access
    if (!existingProfile && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`user_profile_${cleanId}`);
      if (saved) {
        try {
          existingProfile = JSON.parse(saved);
        } catch (e) {}
      }
    }

    if (existingProfile) {
      // Check stored password if present
      if (existingProfile.password && existingProfile.password !== cleanPass) {
        throw new Error('Incorrect password. Please verify your password and try again.');
      }
      setUserProfile(existingProfile);
      setCurrentUser(makeUserFromProfile(existingProfile));
      localStorage.setItem('customer_session', JSON.stringify(existingProfile));
      return;
    }

    // If profile didn't exist yet, create their account smoothly
    const newProfile: UserProfile = {
      id: docId,
      email: email,
      phone: phone || undefined,
      password: cleanPass,
      displayName: isPhone ? `Reviewer ${phone.slice(-4)}` : email.split('@')[0],
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanId}`,
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

    try {
      await setDoc(doc(db, 'users', docId), newProfile, { merge: true });
    } catch (e) {}

    if (typeof window !== 'undefined') {
      localStorage.setItem(`user_profile_${cleanId}`, JSON.stringify(newProfile));
      localStorage.setItem('customer_session', JSON.stringify(newProfile));
    }

    setUserProfile(newProfile);
    setCurrentUser(makeUserFromProfile(newProfile));
  };

  const signUpWithManualCredentials = async (name: string, rawIdentifier: string, pass: string) => {
    const cleanName = name.trim();
    const trimmedId = rawIdentifier.trim();
    const cleanPass = pass.trim();

    if (!cleanName) {
      throw new Error('Please enter your full name.');
    }
    if (!trimmedId) {
      throw new Error('Please enter your Email Address or Mobile Number.');
    }
    if (cleanPass.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const { email, phone, isPhone, cleanId } = normalizeIdentifier(trimmedId);
    if (isPhone && phone.length < 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }
    if (!isPhone && (!email.includes('@') || !email.includes('.'))) {
      throw new Error('Please enter a valid email address.');
    }

    const docId = `user-${cleanId}`;

    // Try creating via Firebase Auth as well
    try {
      const res = await createUserWithEmailAndPassword(auth, email, cleanPass);
      if (res.user) {
        await updateProfile(res.user, { displayName: cleanName });
      }
    } catch (err: any) {
      console.warn('Firebase createUser notice:', err?.code || err?.message);
    }

    const newProfile: UserProfile = {
      id: docId,
      email: email,
      phone: phone || undefined,
      password: cleanPass,
      displayName: cleanName,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
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

    try {
      await setDoc(doc(db, 'users', docId), newProfile, { merge: true });
    } catch (e) {
      console.warn('Firestore setDoc notice:', e);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(`user_profile_${cleanId}`, JSON.stringify(newProfile));
      localStorage.setItem('customer_session', JSON.stringify(newProfile));
    }

    setUserProfile(newProfile);
    setCurrentUser(makeUserFromProfile(newProfile));
  };

  const signInWithEmail = async (email: string, pass: string) => {
    return signInWithManualCredentials(email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    return signUpWithManualCredentials(name, email, pass);
  };

  const signInAsDemo = async (role: 'user' | 'admin' = 'user') => {
    if (role === 'admin') {
      return loginAsMasterAdmin('admin2026');
    }
    const demoProfile = getDemoWorkerProfile();
    try {
      await setDoc(doc(db, 'users', demoProfile.id), demoProfile, { merge: true });
    } catch (e) {}
    setUserProfile(demoProfile);
    setCurrentUser(makeUserFromProfile(demoProfile));
    localStorage.setItem('customer_session', JSON.stringify(demoProfile));
    localStorage.setItem('demo_worker_session', 'true');
  };

  const toggleAdminRoleForDemo = async () => {
    if (!userProfile) return;
    const newRole: 'user' | 'admin' = userProfile.role === 'admin' ? 'user' : 'admin';
    const updated: UserProfile = { ...userProfile, role: newRole };
    setUserProfile(updated);
    localStorage.setItem('customer_session', JSON.stringify(updated));
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
    localStorage.removeItem('customer_session');
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
      if (auth.currentUser) {
        await syncUserProfile(auth.currentUser);
      } else {
        try {
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setUserProfile(data);
            localStorage.setItem('customer_session', JSON.stringify(data));
          }
        } catch (e) {}
      }
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
        signInWithManualCredentials,
        signUpWithManualCredentials,
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
