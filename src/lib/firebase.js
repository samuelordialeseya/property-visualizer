import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { 
  getAuth, 
  initializeAuth, 
  browserLocalPersistence,
  indexedDBLocalPersistence, 
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

// Use memoryLocalCache to eliminate IndexedDB database lock/closure errors on mobile devices
let db;
try {
  db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  });
} catch {
  db = getFirestore(app);
}

// On mobile browsers (Safari, private mode, webviews), IndexedDB connections frequently
// abort or throw "database is closing" when the tab is hidden or backgrounded.
// Prioritizing browserLocalPersistence (localStorage) guarantees fast, synchronous, persistent auth
// that never disconnects on mobile tab hide/sleep.
let auth;
try {
  if (typeof window !== "undefined") {
    auth = initializeAuth(app, {
      persistence: [browserLocalPersistence, indexedDBLocalPersistence, browserSessionPersistence, inMemoryPersistence]
    });
  } else {
    auth = getAuth(app);
  }
} catch {
  auth = getAuth(app);
}

const storage = getStorage(app);

export { app, db, auth, storage };
