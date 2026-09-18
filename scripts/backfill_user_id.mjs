import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  collectionGroup 
} from "firebase/firestore";

// Usage: node scripts/backfill_user_id.mjs <YOUR_FIREBASE_UID>
const targetUserId = process.argv[2];

if (!targetUserId) {
  console.error("Error: Please provide your Firebase User ID (UID).");
  console.error("Usage: node scripts/backfill_user_id.mjs <TARGET_USER_ID>");
  process.exit(1);
}

const firebaseConfig = {
  apiKey: "AIzaSyBclwmZ5aKiTMtNEQ_hNJTJZotYyNAzlNs",
  authDomain: "property-visualizer-b04f3.firebaseapp.com",
  projectId: "property-visualizer-b04f3",
  storageBucket: "property-visualizer-b04f3.firebasestorage.app",
  messagingSenderId: "407467486695",
  appId: "1:407467486695:web:0abd3305e95dfcf6a0a142"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function backfill() {
  console.log(Starting backfill of user_id: ...);

  let count = 0;

  // 1. Buildings
  console.log("Checking buildings...");
  const bSnap = await getDocs(collection(db, "buildings"));
  for (const bDoc of bSnap.docs) {
    const data = bDoc.data();
    if (!data.user_id) {
      await updateDoc(bDoc.ref, { user_id: targetUserId });
      console.log(Updated building:  ());
      count++;
    }
  }

  // 2. Units
  console.log("Checking units across all buildings...");
  const uSnap = await getDocs(collectionGroup(db, "units"));
  for (const uDoc of uSnap.docs) {
    const data = uDoc.data();
    if (!data.user_id) {
      await updateDoc(uDoc.ref, { user_id: targetUserId });
      console.log(Updated unit:  ());
      count++;
    }
  }

  // 3. Staff
  console.log("Checking staff...");
  const sSnap = await getDocs(collection(db, "staff"));
  for (const sDoc of sSnap.docs) {
    const data = sDoc.data();
    if (!data.user_id) {
      await updateDoc(sDoc.ref, { user_id: targetUserId });
      console.log(Updated staff:  ());
      count++;
    }
  }

  // 4. Maintenance
  console.log("Checking maintenance tickets...");
  const mSnap = await getDocs(collection(db, "maintenance"));
  for (const mDoc of mSnap.docs) {
    const data = mDoc.data();
    if (!data.user_id) {
      await updateDoc(mDoc.ref, { user_id: targetUserId });
      console.log(Updated maintenance ticket: );
      count++;
    }
  }

  // 5. Errands
  console.log("Checking errands...");
  const eSnap = await getDocs(collection(db, "errands"));
  for (const eDoc of eSnap.docs) {
    const data = eDoc.data();
    if (!data.user_id) {
      await updateDoc(eDoc.ref, { user_id: targetUserId });
      console.log(Updated errand: );
      count++;
    }
  }

  console.log(\nBackfill complete! Updated  documents with user_id: );
  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
