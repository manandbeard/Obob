'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestore-error';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'moderator' | 'coach' | null;
  profileName: string | null;
  profileId: string | null;
  loading: boolean;
  login: () => Promise<boolean>;
  logOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  profileName: null,
  profileId: null,
  loading: true,
  login: async () => false,
  logOut: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'moderator' | 'coach' | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Check users collection first
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setRole(data.role);
            setProfileName(data.name || currentUser.displayName || 'User');
            setProfileId(currentUser.uid);
          } else {
            // Check legacy admins collection or auto-grant
            const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
            if (adminDoc.exists() || currentUser.email === 'river.soldier@gmail.com') {
              // Migrate to users collection
              await setDoc(doc(db, 'users', currentUser.uid), {
                email: currentUser.email,
                role: 'admin',
                name: currentUser.displayName || 'Admin'
              });
              setRole('admin');
              setProfileName(currentUser.displayName || 'Admin');
              setProfileId(currentUser.uid);
            } else {
              // User exists in Auth but has no role assigned yet
              setRole(null);
              setProfileName(null);
              setProfileId(null);
            }
          }
        } catch (error) {
          console.error("Error verifying user role", error);
        }
      } else {
        setRole(null);
        setProfileName(null);
        setProfileId(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const currentUser = result.user;

      // The onAuthStateChanged listener will handle the role assignment
      // But we can return true if they successfully authenticated
      return true;
    } catch (error) {
      console.error("Login failed", error);
      return false;
    }
  };

  const logOut = async () => {
    await signOut(auth);
    setRole(null);
    setProfileName(null);
    setProfileId(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, profileName, profileId, loading, login, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
