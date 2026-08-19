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
    
    // Auto-generate units based on grid
    const { floors, units_per_floor } = data;
    for (let f = 1; f <= floors; f++) {
      for (let u = 1; u <= units_per_floor; u++) {
        const unitLabel = `${String.fromCharCode(64 + f)}${u}`; // A1, A2, B1, etc.
        const positionIndex = (f - 1) * units_per_floor + (u - 1);
        await addDoc(collection(db, "buildings", docRef.id, "units"), {
          unit_label: unitLabel,
          floor: f,
          status: "vacant",
          monthly_rent: 0,
          position_index: positionIndex,
          tenant: null,
          buildingId: docRef.id // useful for collection group queries
        });
      }
    }
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

  return { units, loading, updateUnit };
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
    const q = query(collection(db, "buildings", buildingId, "units"), orderBy("position_index", "asc"));
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
