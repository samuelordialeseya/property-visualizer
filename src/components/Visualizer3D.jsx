"use client";
import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Edges, Text } from "@react-three/drei";
import * as THREE from "three";
import { Building2 } from "lucide-react";
import { getFootprint, cellToWorld, UNIT_W, UNIT_D, UNIT_H } from "@/lib/footprints";
import FootprintEditor from "./FootprintEditor"; // keep if needed or replace
import RoomLayoutEditor from "./RoomLayoutEditor";

// ─── Colours (matching building-mockup.html palette) ────────────────────────
const STATUS_COLOR = {
  occupied: 0xd98a53,
  overdue:  0xe05c5c,
  vacant:   0x6e8592,
};
const UNIT_BODY_COLOR  = 0x4a5a66;
const ROOF_COLOR       = 0x36434d;
const WINDOW_COLOR     = 0xf9d392;
const DOOR_COLOR       = 0x32b883;
const GROUND_COLOR     = 0x0b0f13;
const SLAB_COLOR       = 0x111518;

// ─── Build a THREE.Shape from a list of {x,z} points ────────────────────────
function pointsToShape(pts) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].z);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].z);
  shape.closePath();
  return shape;
}

// ─── Camera Controller for smooth auto-framing ───────────────────────────────
function CameraController({ selectedUnit, isEditMode, cameraPreset }) {
  const { camera, size, controls } = useThree();
  const targetPos = useMemo(() => new THREE.Vector3(0, 2.6, 0), []);
  const currentOffset = useRef({ x: 0 });

  // Handle camera presets
  useEffect(() => {
    if (cameraPreset === "top-down") {
      camera.position.set(0, 30, 0.1);
      if (controls) controls.target.set(0, 0, 0);
    } else if (cameraPreset === "front") {
      camera.position.set(0, 5, 25);
      if (controls) controls.target.set(0, 2.6, 0);
    } else if (cameraPreset === "isometric") {
      camera.position.set(15, 12, 18);
      if (controls) controls.target.set(0, 2.6, 0);
    }
    if (controls) controls.update();
  }, [cameraPreset, camera, controls]);

  useFrame((state, delta) => {
    // 1. Determine target offset (shift room to the left by offsetting projection right)
    const targetOffsetX = (selectedUnit && !isEditMode) ? size.width * 0.18 : 0;
    
    // 2. Interpolate offset smoothly
    currentOffset.current.x = THREE.MathUtils.lerp(currentOffset.current.x, targetOffsetX, 4 * delta);
    
    // 3. Apply offset to camera projection
    if (Math.abs(currentOffset.current.x) > 0.5) {
      camera.setViewOffset(size.width, size.height, currentOffset.current.x, 0, size.width, size.height);
    } else if (camera.view && camera.view.offsetX !== 0) {
      camera.clearViewOffset();
    }

    // 4. When a unit is selected, lock and interpolate OrbitControls target smoothly
    if (selectedUnit && !isEditMode) {
      const floorOffset = ((selectedUnit.floor || 1) - 1) * (UNIT_H + 0.11);
      const h = selectedUnit.height || 2.2;
      const y = floorOffset + h / 2;
      targetPos.set(selectedUnit.x || 0, y, selectedUnit.z || 0);
      
      if (controls) {
        controls.target.lerp(targetPos, 4 * delta);
        controls.update();
      }
    }
  });

  return null;
}
function UnitBox({ unit, isSelected, onClick }) {
  const x = unit.x || 0;
  const floorOffset = ((unit.floor || 1) - 1) * (UNIT_H + 0.11);
  const h = unit.height || 2.2;
  const y = floorOffset + h / 2;
  const z = unit.z || 0;
  const w = unit.width || 2.6;
  const d = unit.depth || 3.2;

  const rot = unit.rotation || 0;
  const rad = (rot * Math.PI) / 180;
  const isRotated = rot === 90 || rot === 270;
  const localW = isRotated ? d : w;
  const localD = isRotated ? w : d;

  const bw = localW - 0.05, bh = h - 0.05, bd = localD - 0.05;
  const statusHex = STATUS_COLOR[unit.status] || STATUS_COLOR.vacant;

  return (
    <group position={[x, y, z]} rotation={[0, rad, 0]}>
      {/* Main body */}
      <mesh
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick(unit); }}
        userData={unit}
      >
        <boxGeometry args={[bw, bh, bd]} />
        <meshStandardMaterial
          color={UNIT_BODY_COLOR}
          emissive={isSelected ? new THREE.Color(0x4a8a70) : new THREE.Color(0x000000)}
          emissiveIntensity={isSelected ? 0.15 : 0}
          roughness={0.85}
          metalness={0.05}
        />
        {isSelected && <Edges scale={1.005} threshold={15} color="#5fa889" />}
      </mesh>

      {/* Status strip at base */}
      <mesh position={[0, -h / 2 + 0.07, 0]} castShadow>
        <boxGeometry args={[localW - 0.02, 0.14, localD - 0.02]} />
        <meshStandardMaterial color={statusHex} roughness={0.6} />
      </mesh>

      {/* Window left */}
      <mesh position={[-bw / 4, 0.15, bd / 2 + 0.03]}>
        <planeGeometry args={[0.5, 0.6]} />
        <meshStandardMaterial
          color={WINDOW_COLOR}
          emissive={new THREE.Color(WINDOW_COLOR)}
          emissiveIntensity={unit.status === 'vacant' ? 0.02 : 0.35}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Window right */}
      <mesh position={[bw / 4, 0.15, bd / 2 + 0.03]}>
        <planeGeometry args={[0.5, 0.6]} />
        <meshStandardMaterial
          color={WINDOW_COLOR}
          emissive={new THREE.Color(WINDOW_COLOR)}
          emissiveIntensity={unit.status === 'vacant' ? 0.02 : 0.35}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Door */}
      <mesh position={[0, -h / 2 + 0.5, bd / 2 + 0.03]}>
        <planeGeometry args={[0.55, 1.0]} />
        <meshStandardMaterial color={DOOR_COLOR} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Unit label */}
      <Text
        position={[0, bh / 2 + 0.2, 0]}
        fontSize={0.3}
        color="#5fa889"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {unit.unit_label}
      </Text>

      {unit.roof_type === 'triangle' ? (
        <group position={[0, h / 2, 0]}>
          <mesh position={[0, 0.055, 0]} castShadow receiveShadow>
            <boxGeometry args={[localW + 0.2, 0.11, localD + 0.2]} />
            <meshStandardMaterial color={ROOF_COLOR} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.11 + 0.5, 0]} castShadow receiveShadow rotation={[0, Math.PI / 4, 0]} scale={[(localW + 0.2) / Math.SQRT2, 1, (localD + 0.2) / Math.SQRT2]}>
            <coneGeometry args={[1, 1, 4]} />
            <meshStandardMaterial color={ROOF_COLOR} roughness={0.9} />
          </mesh>
        </group>
      ) : (
        <mesh position={[0, h / 2 + 0.055, 0]} castShadow receiveShadow>
          <boxGeometry args={[localW + 0.2, 0.11, localD + 0.2]} />
          <meshStandardMaterial color={ROOF_COLOR} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

// ─── Full building — slabs + unit boxes + roof ───────────────────────────────
function Building({ units, selectedUnitId, onSelectUnit }) {
  return (
    <group>
      {/* Unit boxes — individually clickable */}
      {units.map((unit) => (
        <UnitBox
          key={unit.id}
          unit={unit}
          isSelected={selectedUnitId === unit.id}
          onClick={onSelectUnit}
        />
      ))}
    </group>
  );
}

// ─── Ground + grid ───────────────────────────────────────────────────────────
function Ground({ onGroundClick }) {
  return (
    <>
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow 
        position={[0, -0.01, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (onGroundClick) onGroundClick();
        }}
      >
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={GROUND_COLOR} roughness={1} />
      </mesh>
      <gridHelper args={[60, 60, 0x262b2e, 0x1a1e20]} position={[0, 0.005, 0]} />
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────
export default function Visualizer3D({ building, units, selectedUnitId, onSelectUnit, onBack, onSaveLayout, onUpdateBuilding, onCancelNewBuilding }) {
  const [editMode, setEditMode] = useState(false);
  const [editorRooms, setEditorRooms] = useState([]);
  const [selectedEditorRoomId, setSelectedEditorRoomId] = useState(null);
  const [deletedRoomIds, setDeletedRoomIds] = useState([]);
  const [cameraPreset, setCameraPreset] = useState("isometric");

  // Setup card — shown for new buildings (no name) OR when user clicks edit info
  const isNewBuilding = !building?.name;
  const [showSetupCard, setShowSetupCard] = useState(isNewBuilding);
  const [setupIsNew, setSetupIsNew] = useState(isNewBuilding);
  const [setupName, setSetupName] = useState(building?.name || "");
  const [setupAddress, setSetupAddress] = useState(building?.address || "");
  const [setupSaving, setSetupSaving] = useState(false);

  const openEditInfo = () => {
    setSetupName(building?.name || "");
    setSetupAddress(building?.address || "");
    setSetupIsNew(false);
    setShowSetupCard(true);
  };

  const handleSetupSave = async (e) => {
    e.preventDefault();
    if (!setupName.trim()) return;
    setSetupSaving(true);
    await onUpdateBuilding?.({ name: setupName.trim(), address: setupAddress.trim(), is_new: false });
    setSetupSaving(false);
    setShowSetupCard(false);
  };

  const handleSetupCancel = async () => {
    if (setupIsNew) {
      // New building — delete it and go back to dashboard
      await onCancelNewBuilding?.();
    } else {
      setShowSetupCard(false);
    }
  };

  // When entering edit mode, clone the current building's units into local state
  const handleEnterEditMode = () => {
    setEditorRooms(units.map(u => ({
      id: u.id,
      ref: u.ref,
      unit_label: u.unit_label,
      floor: u.floor || 1,
      status: u.status || "vacant",
      monthly_rent: u.monthly_rent || 0,
      x: u.x ?? 0,
      z: u.z ?? 0,
      width: u.width ?? 2.6,
      depth: u.depth ?? 3.2,
      height: u.height ?? 2.2,
      rotation: u.rotation || 0,
      roof_type: u.roof_type || 'flat',
      tenant: u.tenant || null
    })));
    setDeletedRoomIds([]);
    setSelectedEditorRoomId(null);
    setEditMode(true);
  };

  const handleAddRoom = () => {
    const newId = `new-temp-${Date.now()}`;
    const targetFloor = 1;
    const floorRooms = editorRooms.filter(r => r.floor === targetFloor);
    
    let maxNum = 0;
    floorRooms.forEach(r => {
      const match = r.unit_label.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        const seq = num % 100;
        if (seq > maxNum) maxNum = seq;
      }
    });
    
    const labelNum = String(maxNum + 1).padStart(2, '0');
    const unitLabel = `Unit ${targetFloor}${labelNum}`;

    // Place new room beside the last room if any, otherwise at origin
    const lastRoom = floorRooms[floorRooms.length - 1];
    const W = 3.0, D = 3.0;
    const x = lastRoom ? lastRoom.x + lastRoom.width / 2 + W / 2 : 0;
    const z = lastRoom ? lastRoom.z : 0;

    const newRoom = {
      id: newId,
      unit_label: unitLabel,
      floor: targetFloor,
      status: "vacant",
      monthly_rent: 0,
      x, z,
      width: W,
      depth: D,
      height: 2.2,
      tenant: null
    };

    setEditorRooms([...editorRooms, newRoom]);
    setSelectedEditorRoomId(newId);
  };

  const handleAddLShape = () => {
    const baseId = `new-temp-${Date.now()}`;
    const wingId = `new-temp-${Date.now() + 1}`;
    const baseW = 3.0, baseD = 3.0;
    const wingW = 3.0, wingD = 1.5;

    // Find a free spot: offset past any existing rooms
    const allRooms = editorRooms.filter(r => (r.floor || 1) === 1);
    const maxX = allRooms.length > 0 ? Math.max(...allRooms.map(r => r.x + r.width / 2)) : -baseW / 2;
    const originX = maxX + baseW / 2 + 0.5; // half-width offset + gap
    const originZ = 0;

    // Base room
    const baseRoom = {
      id: baseId,
      unit_label: `A${editorRooms.length + 1}`,
      floor: 1,
      status: "vacant",
      monthly_rent: 0,
      x: originX,
      z: originZ,
      width: baseW,
      depth: baseD,
      height: 2.2,
      tenant: null
    };

    // Wing attached to east wall of base, south-edge (high-Z) aligned
    // base south edge: originZ + baseD/2
    // wing center Z: (originZ + baseD/2) - wingD/2
    const wingRoom = {
      id: wingId,
      unit_label: `A${editorRooms.length + 2}`,
      floor: 1,
      status: "vacant",
      monthly_rent: 0,
      x: originX + baseW / 2 + wingW / 2,
      z: (originZ + baseD / 2) - wingD / 2,
      width: wingW,
      depth: wingD,
      height: 2.2,
      tenant: null
    };

    setEditorRooms([...editorRooms, baseRoom, wingRoom]);
    setSelectedEditorRoomId(baseId);
  };

  const handleDeleteRoom = () => {
    if (!selectedEditorRoomId) return;
    if (!selectedEditorRoomId.startsWith("new-temp-")) {
      setDeletedRoomIds([...deletedRoomIds, selectedEditorRoomId]);
    }
    setEditorRooms(editorRooms.filter(r => r.id !== selectedEditorRoomId));
    setSelectedEditorRoomId(null);
  };

  const handleSave = async () => {
    try {
      if (onSaveLayout) {
        await onSaveLayout(editorRooms, deletedRoomIds);
      }
      setEditMode(false);
    } catch (err) {
      console.error("Failed to save layout:", err);
      alert("Failed to save layout, check console.");
    }
  };

  const selectedRoom = editorRooms.find(r => r.id === selectedEditorRoomId);

  return (
    <div className="w-full h-full bg-zinc-100 relative font-sans">
      {!building ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Building2 size={48} className="mb-4 text-zinc-300 stroke-1" />
          <div className="text-[15px] font-semibold text-zinc-400 tracking-[-0.01em]">
            No Building Selected
          </div>
          <p className="mt-1 text-[12px] text-zinc-400">Pick a building from the dashboard</p>
        </div>
      ) : (
        <>
          {/* HUD — building name & back button */}
          <div className="absolute top-5 left-5 z-10 flex flex-col gap-3">
            {onBack && !editMode && (
              <button 
                onClick={onBack}
                className="flex items-center gap-1.5 w-fit rounded-full border border-zinc-200 bg-white/80 backdrop-blur px-3 py-1.5 text-[12px] font-semibold text-zinc-500 transition hover:text-zinc-900 hover:border-zinc-300"
              >
                ← Back to Details
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="pointer-events-none">
                <div className="text-[19px] font-semibold text-zinc-800 leading-none tracking-[-0.02em]">
                  {editMode ? "Layout Editor (Sims-Style)" : (building.name || "Untitled Building")}
                </div>
                <div className="mt-1 text-[12px] text-zinc-500 uppercase tracking-[0.04em]">
                  {editMode ? "Drag room to move · Arrows to expand · Green seam = locked wall" : (building.address || "No address · Drag to orbit · Click a unit")}
                </div>
              </div>
              {!editMode && (
                <button
                  onClick={openEditInfo}
                  title="Edit building info"
                  className="ml-1 flex items-center justify-center h-6 w-6 rounded-lg border border-zinc-200 bg-white/80 backdrop-blur text-zinc-400 transition hover:text-[#5fa889] hover:border-[#5fa889]/40"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              )}
            </div>
            
            {!editMode ? (
              <button 
                onClick={handleEnterEditMode}
                className="mt-2 w-fit rounded-full bg-[#3c6e59] px-4 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#4a8a70]"
              >
                Edit Building Layout
              </button>
            ) : (
              <div className="mt-2 flex gap-2">
                <button 
                  onClick={handleAddRoom}
                  className="rounded-full bg-[#3c6e59] px-3.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#4a8a70]"
                >
                  + Room
                </button>
                <button 
                  onClick={handleAddLShape}
                  className="rounded-full bg-[#2d5a72] px-3.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#3a7290] border border-[#3a7290]"
                  title="Adds two pre-aligned rooms in an L-shape"
                >
                  + L-Shape
                </button>
              </div>
            )}
          </div>

          {/* Selected Room Controller Panel or Save Layout controls */}
          <div className="absolute top-5 right-5 z-10 flex gap-2">
            {!editMode ? (
              units.length > 0 && (
                <div className="rounded-full border border-emerald-200 bg-emerald-50/80 backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-700 shadow-sm">
                  {units.length} Rooms Configured
                </div>
              )
            ) : (
              <div className="flex flex-col items-end gap-3">
                {selectedRoom && (
                  <div className="rounded-xl border border-zinc-200 bg-white/95 backdrop-blur p-4 text-[12px] text-zinc-500 space-y-3 w-64 shadow-xl">
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                      <span className="font-bold text-zinc-800">Room {selectedRoom.unit_label}</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const cur = selectedRoom.rotation || 0;
                            const next = (cur + 90) % 360;
                            setEditorRooms(editorRooms.map(r => r.id === selectedEditorRoomId ? { ...r, rotation: next } : r));
                          }}
                          className="text-[#5fa889] hover:text-[#76c2a1] font-semibold flex items-center gap-1"
                          title="Rotate Door 90°"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        </button>
                        <button 
                          onClick={handleDeleteRoom}
                          className="text-red-500 hover:text-red-400 font-semibold ml-2"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase">Floor</label>
                        <select 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 mt-0.5 text-zinc-800 outline-none focus:border-[#5fa889]"
                          value={selectedRoom.floor}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setEditorRooms(editorRooms.map(r => r.id === selectedEditorRoomId ? { ...r, floor: val } : r));
                          }}
                        >
                          <option value={1}>Floor 1</option>
                          <option value={2}>Floor 2</option>
                          <option value={3}>Floor 3</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase">Height ({selectedRoom.height}m)</label>
                        <input 
                          type="range" min="1" max="4" step="0.2"
                          className="w-full mt-2 accent-[#5fa889]"
                          value={selectedRoom.height}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setEditorRooms(editorRooms.map(r => r.id === selectedEditorRoomId ? { ...r, height: val } : r));
                          }}
                        />
                      </div>
                    </div>

                      <div>
                        <label className="block text-[10px] uppercase">Label</label>
                        <input 
                          type="text"
                          className="w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 mt-0.5 text-zinc-800 outline-none focus:border-[#5fa889]"
                          value={selectedRoom.unit_label}
                          onChange={(e) => {
                            setEditorRooms(editorRooms.map(r => r.id === selectedEditorRoomId ? { ...r, unit_label: e.target.value } : r));
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase">Roof</label>
                        <select 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 mt-0.5 text-zinc-800 outline-none focus:border-[#5fa889]"
                          value={selectedRoom.roof_type || 'flat'}
                          onChange={(e) => {
                            setEditorRooms(editorRooms.map(r => r.id === selectedEditorRoomId ? { ...r, roof_type: e.target.value } : r));
                          }}
                        >
                          <option value="flat">Flat</option>
                          <option value="triangle">Triangle</option>
                        </select>
                      </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditMode(false)}
                    className="rounded-full border border-zinc-200 bg-white/80 px-4 py-1.5 text-[11px] font-semibold text-zinc-500 transition hover:text-zinc-900"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    className="rounded-full bg-[#5fa889] px-4 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#6dbf9b]"
                  >
                    Save Layout
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          {!editMode && (
            <div className="absolute bottom-5 left-5 z-10 flex gap-4">
              {[['#d98a53','Occupied'],['#e05c5c','Overdue'],['#6e8592','Vacant']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
                  <span className="text-[11px] font-medium text-zinc-500">{l}</span>
                </div>
              ))}
            </div>
          )}

          {/* Camera Presets */}
          <div className="absolute right-6 bottom-6 z-10 flex gap-2">
            <button onClick={() => setCameraPreset("isometric")} className={`rounded-xl px-3 py-1.5 text-[11px] font-[600] transition shadow-sm border ${cameraPreset === 'isometric' ? 'bg-[#059669] text-white border-[#059669]' : 'bg-white/90 text-zinc-600 border-zinc-200 hover:bg-white backdrop-blur-sm'}`}>Isometric</button>
            <button onClick={() => setCameraPreset("top-down")} className={`rounded-xl px-3 py-1.5 text-[11px] font-[600] transition shadow-sm border ${cameraPreset === 'top-down' ? 'bg-[#059669] text-white border-[#059669]' : 'bg-white/90 text-zinc-600 border-zinc-200 hover:bg-white backdrop-blur-sm'}`}>Top-Down</button>
            <button onClick={() => setCameraPreset("front")} className={`rounded-xl px-3 py-1.5 text-[11px] font-[600] transition shadow-sm border ${cameraPreset === 'front' ? 'bg-[#059669] text-white border-[#059669]' : 'bg-white/90 text-zinc-600 border-zinc-200 hover:bg-white backdrop-blur-sm'}`}>Front View</button>
          </div>

          <Canvas
            shadows
            camera={{ position: [11, 9, 13], fov: 38 }}
            gl={{ antialias: true }}
            onPointerMissed={() => {
              if (!editMode && onSelectUnit) onSelectUnit(null);
            }}
          >
            <color attach="background" args={[0x0b0f13]} />
            <fog attach="fog" args={[0x0b0f13, 15, 60]} />

            {/* Lighting for Enhanced Dark Mode */}
            <hemisphereLight args={[0xffffff, 0x445566, 0.6]} />
            <directionalLight
              castShadow
              position={[8, 14, 6]}
              intensity={1.5}
              color={0xffeedd}
              shadow-mapSize={[1024, 1024]}
              shadow-camera-left={-14}
              shadow-camera-right={14}
              shadow-camera-top={14}
              shadow-camera-bottom={-14}
              shadow-bias={-0.001}
              shadow-normalBias={0.06}
            />
            {/* Soft rim light / fill */}
            <directionalLight position={[-6, 8, -8]} intensity={1.8} color={0x2b4a5f} />

            <Ground onGroundClick={() => {
              if (!editMode && onSelectUnit) onSelectUnit(null);
            }} />

            {!editMode ? (
              <Building
                units={units}
                selectedUnitId={selectedUnitId}
                onSelectUnit={onSelectUnit}
              />
            ) : (
              <RoomLayoutEditor 
                rooms={editorRooms}
                onChange={setEditorRooms}
                selectedRoomId={selectedEditorRoomId}
                onSelectRoom={setSelectedEditorRoomId}
              />
            )}

            <CameraController 
              selectedUnit={units.find(u => u.id === selectedUnitId)} 
              isEditMode={editMode} 
              cameraPreset={cameraPreset}
            />

            <ContactShadows
              position={[0, 0.02, 0]}
              opacity={0.45}
              scale={40}
              blur={2.5}
              far={8}
              color="#000000"
            />

            <OrbitControls
              makeDefault
              target={[0, 2.6, 0]}
              minPolarAngle={0.2}
              maxPolarAngle={1.4}
              minDistance={5}
              maxDistance={45}
              enableDamping
              dampingFactor={0.08}
              screenSpacePanning={false}
            />
          </Canvas>

          {/* ── Floating Setup Card ─────────────────────────────────────────── */}
          {showSetupCard && (
            <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(11,15,19,0.72)', backdropFilter: 'blur(8px)' }}>
              <div className="relative w-[440px] rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl" style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)' }}>
                {/* Glow accent */}
                <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-[#5fa889] opacity-20 blur-3xl" />

                {/* Header */}
                <div className="mb-1 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#5fa889]/20 text-[#5fa889]">
                      {setupIsNew ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      )}
                    </div>
                    <div>
                      <h2 className="text-[18px] font-bold text-white tracking-[-0.02em]">
                        {setupIsNew ? 'New Building' : 'Edit Building Info'}
                      </h2>
                      <p className="text-[12px] text-white/40">
                        {setupIsNew ? 'Set the details, then build in 3D' : 'Update your building name and address'}
                      </p>
                    </div>
                  </div>
                  {/* X close button — only for edit mode, not new */}
                  {!setupIsNew && (
                    <button
                      onClick={handleSetupCancel}
                      className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 text-white/40 transition hover:border-white/20 hover:text-white"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>

                <div className="my-5 h-px bg-white/10" />

                <form onSubmit={handleSetupSave} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50">Building Name *</label>
                    <input
                      autoFocus
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-[14px] text-white placeholder-white/30 outline-none transition focus:border-[#5fa889]/60 focus:bg-white/15"
                      placeholder="e.g. North Tower"
                      value={setupName}
                      onChange={e => setSetupName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50">Address</label>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-[14px] text-white placeholder-white/30 outline-none transition focus:border-[#5fa889]/60 focus:bg-white/15"
                      placeholder="e.g. 123 Rizal St., Manila"
                      value={setupAddress}
                      onChange={e => setSetupAddress(e.target.value)}
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={handleSetupCancel}
                      disabled={setupSaving}
                      className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-[14px] font-semibold text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      {setupIsNew ? '← Go Back' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={setupSaving || !setupName.trim()}
                      className="flex-1 rounded-xl bg-[#5fa889] py-3 text-[14px] font-bold text-white shadow-lg transition hover:bg-[#76c2a1] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {setupSaving ? 'Saving…' : setupIsNew ? 'Start Building →' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
