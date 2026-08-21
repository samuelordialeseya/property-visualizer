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
  orderBy
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const uploadFile = async (path, file) => {
  if (!file) return null;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

export function useBuildings() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "buildings"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBuildings(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const addBuilding = async (buildingData) => {
    const data = {
      ...buildingData,
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
        buildingId: docRef.id
      });
    } else {
      for (let f = 1; f <= floors; f++) {
        for (let u = 1; u <= units_per_floor; u++) {
          const unitLabel = `${String.fromCharCode(64 + f)}${u}`; // A1, A2, etc.
          // Position them side-by-side along X, centered around 0
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
            buildingId: docRef.id
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
    const deletePromises = unitsSnap.docs.map(uDoc => deleteDoc(uDoc.ref));
    await Promise.all(deletePromises);
    await deleteDoc(doc(db, "buildings", buildingId));
  };

  return { buildings, loading, addBuilding, updateBuilding, deleteBuilding };
}

export function useAllUnits() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collectionGroup(db, "units"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ref: doc.ref,
        ...doc.data()
      }));
      setUnits(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const updateUnit = async (unitRef, data) => {
    await updateDoc(unitRef, data);
  };

  const addUnit = async (buildingId, data) => {
    return await addDoc(collection(db, "buildings", buildingId, "units"), data);
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
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ref: doc.ref,
        ...doc.data()
      }));
      setUnits(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [buildingId]);

  return { units, loading };
}
