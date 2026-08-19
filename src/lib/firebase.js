import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBclwmZ5aKiTMtNEQ_hNJTJZotYyNAzlNs",
  authDomain: "property-visualizer-b04f3.firebaseapp.com",
  projectId: "property-visualizer-b04f3",
  storageBucket: "property-visualizer-b04f3.firebasestorage.app",
  messagingSenderId: "407467486695",
  appId: "1:407467486695:web:0abd3305e95dfcf6a0a142"
};

// Initialize Firebase (singleton pattern for Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
