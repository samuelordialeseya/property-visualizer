"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "firebase/auth";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let resolved = false;

    // Mobile fallback: If Firebase auth takes longer than 1500ms (e.g. mobile Safari IndexedDB delay/lock),
    // stop blocking the page and transition so the user sees the Login screen or Dashboard
    const timer = setTimeout(() => {
      if (!resolved) {
        console.warn("Auth state resolution timed out on mobile, continuing");
        setUser(auth?.currentUser || null);
        setLoading(false);
      }
    }, 1500);

    const unsubscribe = onAuthStateChanged(
      auth,
      (u) => {
        resolved = true;
        clearTimeout(timer);
        setUser(u);
        setLoading(false);
      },
      (error) => {
        console.error("onAuthStateChanged error:", error);
        resolved = true;
        clearTimeout(timer);
        setUser(null);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const signup = (email, password) => createUserWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  const deleteAccount = async (password) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No active user session.");
    
    // If password provided, reauthenticate to satisfy requires-recent-login
    if (password && currentUser.email) {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
    }
    
    await deleteUser(currentUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
