import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { 
  getAuth, 
  initializeAuth, 
  indexedDBLocalPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence, 
  inMemoryPersistence 
} from "firebase/auth";
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

// On mobile browsers (Safari, private mode, webviews), IndexedDB can hang or fail silently.
// initializeAuth with persistence fallbacks ensures auth initializes without hanging.
let auth;
try {
  if (typeof window !== "undefined") {
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence]
    });
  } else {
    auth = getAuth(app);
  }
} catch {
  auth = getAuth(app);
}

const storage = getStorage(app);

export { app, db, auth, storage };
