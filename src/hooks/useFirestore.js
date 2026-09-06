import { useState, useEffect, useCallback } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  collectionGroup,
  orderBy,
  where
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const uploadFile = async (path, file) => {
  if (!file) return null;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

// Standalone document mutation helpers (no snapshot listeners attached)
export const updateUnitDoc = async (unitRef, data) => {
  await updateDoc(unitRef, data);
};

export const addUnitDoc = async (buildingId, data) => {
  return await addDoc(collection(db, "buildings", buildingId, "units"), data);
};

export const deleteUnitDoc = async (unitRef) => {
  await deleteDoc(unitRef);
};

export function useBuildings(userId) {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setBuildings([]);
      setLoading(false);
      return;
    }
    // Fetch all buildings and filter in JS to ensure legacy buildings (without user_id) are still retrieved
    const q = query(collection(db, "buildings"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(b => !userId || b.user_id === userId || !b.user_id); // Include user docs + legacy demo docs
        
        // Sort by created_at desc in JS to avoid needing complex composite index in GCP console
        data.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        setBuildings(data);
        setLoading(false);
      },
      (error) => {
        console.warn("useBuildings snapshot error:", error.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [userId]);

  const addBuilding = async (buildingData) => {
    const data = {
      ...buildingData,
      user_id: userId || buildingData.user_id || null,
      created_at: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, "buildings"), data);
    
    // Auto-generate units as independent room boxes side-by-side
    const { floors, units_per_floor, advanced_build_mode } = data;
    const defaultW = 2.6;
    const defaultD = 3.2;
    const defaultH = 2.2;

    if (advanced_build_mode) {
      // Initialize with just a single default starting room
      await addDoc(collection(db, "buildings", docRef.id, "units"), {
        unit_label: "A1",
        floor: 1,
        status: "vacant",
        monthly_rent: 0,
        x: 0,
        z: 0,
        width: 3.0,
        depth: 3.0,
        height: defaultH,
        tenant: null,
        buildingId: docRef.id,
        user_id: userId || null
      });
    } else {
      for (let f = 1; f <= floors; f++) {
        for (let u = 1; u <= units_per_floor; u++) {
          const unitLabel = `${String.fromCharCode(64 + f)}${u}`; // A1, A2, etc.
          const xOffset = (u - 1 - (units_per_floor - 1) / 2) * (defaultW + 0.4);
          await addDoc(collection(db, "buildings", docRef.id, "units"), {
            unit_label: unitLabel,
            floor: f,
            status: "vacant",
            monthly_rent: 0,
            x: xOffset,
            z: 0,
            width: defaultW,
            depth: defaultD,
            height: defaultH,
            tenant: null,
            buildingId: docRef.id,
            user_id: userId || null
          });
        }
      }
    }
    return docRef.id;
  };

  const updateBuilding = async (buildingId, data) => {
    await updateDoc(doc(db, "buildings", buildingId), data);
  };

  const deleteBuilding = async (buildingId) => {
    const unitsSnap = await getDocs(collection(db, "buildings", buildingId, "units"));
    await Promise.all(unitsSnap.docs.map(uDoc => deleteDoc(uDoc.ref)));
    try {
      const docsSnap = await getDocs(collection(db, "buildings", buildingId, "documents"));
      await Promise.all(docsSnap.docs.map(dDoc => deleteDoc(dDoc.ref)));
    } catch (e) {
      console.warn("Could not delete documents for building:", e);
    }
    await deleteDoc(doc(db, "buildings", buildingId));
  };

  return { buildings, loading, addBuilding, updateBuilding, deleteBuilding };
}

export function useAllUnits(userId) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setUnits([]);
      setLoading(false);
      return;
    }
    // Fetch all units from collectionGroup.
    // We remove the where() clause here to bypass the Firebase index requirement, 
    // and instead rely on the JS .filter() below.
    const q = query(collectionGroup(db, "units"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ref: doc.ref,
            buildingId: doc.data().buildingId || doc.ref.parent?.parent?.id,
            ...doc.data()
          }))
          .filter(u => !userId || u.user_id === userId || !u.user_id);

        setUnits(data);
        setLoading(false);
      },
      (error) => {
        console.warn("useAllUnits snapshot error:", error.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [userId]);

  const updateUnit = async (unitRef, data) => {
    await updateDoc(unitRef, data);
  };

  const addUnit = async (buildingId, data) => {
    return await addDoc(collection(db, "buildings", buildingId, "units"), {
      ...data,
      user_id: userId || data.user_id || null
    });
  };

  const deleteUnit = async (unitRef) => {
    await deleteDoc(unitRef);
  };

  return { units, loading, updateUnit, addUnit, deleteUnit };
}

export function useBuildingUnits(buildingId) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!buildingId) {
      setUnits([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "buildings", buildingId, "units"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ref: doc.ref,
          ...doc.data()
        }));
        setUnits(data);
        setLoading(false);
      },
      (error) => {
        console.warn("useBuildingUnits snapshot error:", error.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [buildingId]);

  return { units, loading };
}

// ─── Staff Hooks ──────────────────────────────────────────────────────────────

export function useStaff(userId, buildingId) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setStaff([]); setLoading(false); return; }
    const q = query(collection(db, "staff"), where("user_id", "==", userId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (buildingId) {
          data = data.filter(s =>
            !s.assigned_properties || s.assigned_properties.length === 0 ||
            s.assigned_properties.includes(buildingId)
          );
        }
        data.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setStaff(data);
        setLoading(false);
      },
      (error) => {
        console.warn("useStaff snapshot error:", error.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [userId, buildingId]);

  return { staff, loading };
}

export function useStaffErrands(staffId) {
  const [errands, setErrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!staffId) { setErrands([]); setLoading(false); return; }
    const q = query(collection(db, "errands"), where("staff_id", "==", staffId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        setErrands(data);
        setLoading(false);
      },
      (error) => {
        console.warn("useStaffErrands snapshot error:", error.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [staffId]);

  return { errands, loading };
}

export const addStaffDoc = async (data) => {
  return await addDoc(collection(db, "staff"), {
    ...data,
    petty_cash_balance: 0,
    created_at: new Date().toISOString(),
  });
};

export const updateStaffDoc = async (staffId, data) => {
  await updateDoc(doc(db, "staff", staffId), data);
};

export const deleteStaffDoc = async (staffId) => {
  await deleteDoc(doc(db, "staff", staffId));
};

export const addErrandDoc = async (data) => {
  return await addDoc(collection(db, "errands"), {
    ...data,
    created_at: new Date().toISOString(),
  });
};

export const updateErrandDoc = async (errandId, data) => {
  await updateDoc(doc(db, "errands", errandId), data);
};

export const deleteErrandDoc = async (errandId) => {
  await deleteDoc(doc(db, "errands", errandId));
};

export const giveCashAdvance = async (staffId, amount, title, userId) => {
  const date = new Date().toISOString().split("T")[0];
  await addDoc(collection(db, "errands"), {
    staff_id: staffId,
    user_id: userId,
    type: "cash_advance",
    title: title || "Cash Advance",
    date,
    amount: Number(amount),
    is_paid: false,
    receipt_url: null,
    created_at: new Date().toISOString(),
  });
  const staffRef = doc(db, "staff", staffId);
  const staffSnap = await getDoc(staffRef);
  if (staffSnap.exists()) {
    const current = staffSnap.data().petty_cash_balance || 0;
    await updateDoc(staffRef, { petty_cash_balance: current + Number(amount) });
  }
};

export const settleStaffLedger = async (staffId, errandIds) => {
  const updates = errandIds.map(id => updateDoc(doc(db, "errands", id), { is_paid: true }));
  await Promise.all(updates);
  await updateDoc(doc(db, "staff", staffId), { petty_cash_balance: 0 });
};

// ─── Maintenance Hooks ────────────────────────────────────────────────────────

export function useMaintenanceTickets(buildingId) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!buildingId) { setTickets([]); setLoading(false); return; }
    const q = query(collection(db, "maintenance"), where("building_id", "==", buildingId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        setTickets(data);
        setLoading(false);
      },
      (error) => {
        console.warn("useMaintenanceTickets snapshot error:", error.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [buildingId]);

  return { tickets, loading };
}

export const addMaintenanceTicketDoc = async (data) => {
  return await addDoc(collection(db, "maintenance"), {
    ...data,
    status: data.status || "reported",
    is_paid: false,
    receipt_urls: data.receipt_urls || [],
    created_at: new Date().toISOString(),
  });
};

export const updateMaintenanceTicketDoc = async (ticketId, data) => {
  await updateDoc(doc(db, "maintenance", ticketId), data);
};

export const deleteMaintenanceTicketDoc = async (ticketId) => {
  await deleteDoc(doc(db, "maintenance", ticketId));
};

// ─── User Profile Hooks ───────────────────────────────────────────────────────

export function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setProfile(null); setLoading(false); return; }
    const docRef = doc(db, "users", userId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile({ id: snapshot.id, ...snapshot.data() });
        } else {
          setProfile({ id: userId, default_currency: "PHP" }); // default fallback
        }
        setLoading(false);
      },
      (error) => {
        console.warn("useUserProfile snapshot error:", error.message);
        setProfile({ id: userId, default_currency: "PHP" });
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [userId]);

  return { profile, loading };
}

export const updateUserProfile = async (userId, data) => {
  const docRef = doc(db, "users", userId);
  await setDoc(docRef, data, { merge: true });
};

export const deleteUserData = async (userId, includeBuildings = true) => {
  if (!userId) return;

  // 1. Delete user profile document
  try {
    await deleteDoc(doc(db, "users", userId));
  } catch (e) {
    console.warn("Could not delete user profile doc:", e);
  }

  // 2. Optionally clean up user buildings, units, staff, errands, maintenance, documents
  if (includeBuildings) {
    try {
      const bSnap = await getDocs(query(collection(db, "buildings"), where("user_id", "==", userId)));
      for (const bDoc of bSnap.docs) {
        const unitsSnap = await getDocs(collection(db, "buildings", bDoc.id, "units"));
        await Promise.all(unitsSnap.docs.map((u) => deleteDoc(u.ref)));
        const docsSnap = await getDocs(collection(db, "buildings", bDoc.id, "documents"));
        await Promise.all(docsSnap.docs.map((d) => deleteDoc(d.ref)));
        await deleteDoc(bDoc.ref);
      }
    } catch (e) {
      console.warn("Could not delete buildings for user:", e);
    }

    try {
      const staffSnap = await getDocs(query(collection(db, "staff"), where("user_id", "==", userId)));
      await Promise.all(staffSnap.docs.map((s) => deleteDoc(s.ref)));
    } catch (e) {
      console.warn("Could not delete staff for user:", e);
    }

    try {
      const errandsSnap = await getDocs(query(collection(db, "errands"), where("user_id", "==", userId)));
      await Promise.all(errandsSnap.docs.map((ed) => deleteDoc(ed.ref)));
    } catch (e) {
      console.warn("Could not delete errands for user:", e);
    }

    try {
      const maintSnap = await getDocs(query(collection(db, "maintenance"), where("user_id", "==", userId)));
      await Promise.all(maintSnap.docs.map((m) => deleteDoc(m.ref)));
    } catch (e) {
      console.warn("Could not delete maintenance for user:", e);
    }
  }
};

// --- Property Documents Suite ---
export function usePropertyDocuments(buildingId) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!buildingId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    // Query collection directly and sort in JS to avoid index dependencies or omitting docs without created_at
    const q = query(collection(db, "buildings", buildingId, "documents"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        docs.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        setDocuments(docs);
        setLoading(false);
      },
      (error) => {
        console.warn("Property documents listener error:", error.message);
        setDocuments([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [buildingId]);

  return { documents, loading };
}

export const addPropertyDocument = async (buildingId, data) => {
  return await addDoc(collection(db, "buildings", buildingId, "documents"), {
    ...data,
    created_at: new Date().toISOString(),
  });
};

export const updatePropertyDocument = async (buildingId, docId, data) => {
  return await updateDoc(doc(db, "buildings", buildingId, "documents", docId), data);
};

export const deletePropertyDocument = async (buildingId, docId) => {
  return await deleteDoc(doc(db, "buildings", buildingId, "documents", docId));
};



