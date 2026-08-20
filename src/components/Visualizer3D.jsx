"use client";
import { useRef, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Edges, Text } from "@react-three/drei";
import * as THREE from "three";
import { getFootprint, cellToWorld, UNIT_W, UNIT_D, UNIT_H } from "@/lib/footprints";
import FootprintEditor from "./FootprintEditor"; // keep if needed or replace
import RoomLayoutEditor from "./RoomLayoutEditor";

// ─── Colours (matching building-mockup.html palette) ────────────────────────
const STATUS_COLOR = {
  occupied: 0xc97a4a,
  overdue:  0xb23b3b,
  vacant:   0xa9b6b0,
};
const UNIT_BODY_COLOR  = 0x2e3438;
const ROOF_COLOR       = 0x1e2426;
const WINDOW_COLOR     = 0xf2c98a;
const DOOR_COLOR       = 0x5fa889;
const GROUND_COLOR     = 0x0e1113;
const SLAB_COLOR       = 0x252a2d;

// ─── Build a THREE.Shape from a list of {x,z} points ────────────────────────
function pointsToShape(pts) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].z);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].z);
  shape.closePath();
  return shape;
}

// ─── Single unit box (clickable) ─────────────────────────────────────────────
function UnitBox({ unit, isSelected, onClick }) {
  const x = unit.x || 0;
  const floorOffset = ((unit.floor || 1) - 1) * UNIT_H;
  const h = unit.height || 2.2;
  const y = floorOffset + h / 2;
  const z = unit.z || 0;
  const w = unit.width || 2.6;
  const d = unit.depth || 3.2;

  const bw = w - 0.08, bh = h - 0.08, bd = d - 0.08;
  const statusHex = STATUS_COLOR[unit.status] || STATUS_COLOR.vacant;

  return (
    <group position={[x, y, z]}>
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
          emissive={isSelected ? new THREE.Color(0x3c6e59) : new THREE.Color(0x000000)}
          emissiveIntensity={isSelected ? 0.25 : 0}
          roughness={0.85}
          metalness={0.05}
        />
        {isSelected && <Edges scale={1.005} threshold={15} color="#5fa889" />}
      </mesh>

      {/* Status strip at base */}
      <mesh position={[0, -bh / 2 + 0.07, 0]} castShadow>
        <boxGeometry args={[bw + 0.02, 0.14, bd + 0.02]} />
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

      {/* Door on ground floor */}
      {unit.floor === 1 && (
        <mesh position={[0, -bh / 2 + 0.5, bd / 2 + 0.03]}>
          <planeGeometry args={[0.55, 1.0]} />
          <meshStandardMaterial color={DOOR_COLOR} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Unit label */}
      <Text
        position={[0, bh / 2 + 0.2, 0]}
        fontSize={0.3}
        color="#8b9390"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {unit.unit_label}
      </Text>

      {/* Flat roof slab */}
      <mesh position={[0, bh / 2 + 0.05, 0]} castShadow>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color={ROOF_COLOR} roughness={0.8} />
      </mesh>
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
function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={GROUND_COLOR} roughness={1} />
      </mesh>
      <gridHelper args={[60, 60, 0x262b2e, 0x1a1e20]} position={[0, 0.005, 0]} />
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────
export default function Visualizer3D({ building, units, selectedUnitId, onSelectUnit, onBack, onSaveLayout }) {
  const [editMode, setEditMode] = useState(false);
  const [editorRooms, setEditorRooms] = useState([]);
  const [selectedEditorRoomId, setSelectedEditorRoomId] = useState(null);
  const [deletedRoomIds, setDeletedRoomIds] = useState([]);

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
    const labelNum = floorRooms.length + 1;
    const unitLabel = `${String.fromCharCode(64 + targetFloor)}${labelNum}`;

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

  const handleSave = () => {
    if (onSaveLayout) {
      onSaveLayout(editorRooms, deletedRoomIds);
    }
    setEditMode(false);
  };

  const selectedRoom = editorRooms.find(r => r.id === selectedEditorRoomId);

  return (
    <div className="w-full h-full bg-[#14171a] relative font-sans">
      {!building ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl mb-4 opacity-20">🏢</div>
          <div className="text-[15px] font-semibold text-[#3a4050] tracking-[-0.01em]">
            No Building Selected
          </div>
          <p className="mt-1 text-[12px] text-[#2a3040]">Pick a building from the dashboard</p>
        </div>
      ) : (
        <>
          {/* HUD — building name & back button */}
          <div className="absolute top-5 left-5 z-10 flex flex-col gap-3">
            {onBack && !editMode && (
              <button 
                onClick={onBack}
                className="flex items-center gap-1.5 w-fit rounded-full border border-[#2c3134] bg-[#1c2023]/80 backdrop-blur px-3 py-1.5 text-[12px] font-semibold text-[#8b9390] transition hover:text-white hover:border-[#4a5257]"
              >
                ← Back to Details
              </button>
            )}
            <div className="pointer-events-none">
              <div className="text-[19px] font-semibold text-[#eceeec] leading-none tracking-[-0.02em]">
                {editMode ? "Layout Editor (Sims-Style)" : building.name}
              </div>
              <div className="mt-1 text-[12px] text-[#8b9390] uppercase tracking-[0.04em]">
                {editMode ? "Drag room to move · Arrows to expand · Green seam = locked wall" : "Drag to orbit · Click a unit"}
              </div>
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
                  ⌐ L-Shape
                </button>
              </div>
            )}
          </div>

          {/* Selected Room Controller Panel or Save Layout controls */}
          <div className="absolute top-5 right-5 z-10 flex gap-2">
            {!editMode ? (
              units.length > 0 && (
                <div className="rounded-full border border-[#2c3134] bg-[#1c2023]/80 backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5fa889]">
                  {units.length} Rooms Configured
                </div>
              )
            ) : (
              <div className="flex flex-col items-end gap-3">
                {selectedRoom && (
                  <div className="rounded-xl border border-[#2c3134] bg-[#1c2023]/95 backdrop-blur p-4 text-[12px] text-[#8b9390] space-y-3 w-64 shadow-xl">
                    <div className="flex justify-between items-center border-b border-[#2c3134] pb-2">
                      <span className="font-bold text-[#eceeec]">Room {selectedRoom.unit_label}</span>
                      <button 
                        onClick={handleDeleteRoom}
                        className="text-red-500 hover:text-red-400 font-semibold"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase">Floor</label>
                        <select 
                          className="w-full bg-[#14171a] border border-[#2c3134] rounded px-1.5 py-1 mt-0.5 text-white"
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
                          className="w-full mt-2"
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
                        className="w-full bg-[#14171a] border border-[#2c3134] rounded px-1.5 py-1 mt-0.5 text-white"
                        value={selectedRoom.unit_label}
                        onChange={(e) => {
                          setEditorRooms(editorRooms.map(r => r.id === selectedEditorRoomId ? { ...r, unit_label: e.target.value } : r));
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditMode(false)}
                    className="rounded-full border border-[#2c3134] bg-[#1c2023]/80 px-4 py-1.5 text-[11px] font-semibold text-[#8b9390] transition hover:text-white"
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
              {[['#c97a4a','Occupied'],['#b23b3b','Overdue'],['#a9b6b0','Vacant']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
                  <span className="text-[11px] text-[#8b9390]">{l}</span>
                </div>
              ))}
            </div>
          )}

          <Canvas
            shadows
            camera={{ position: [11, 9, 13], fov: 38 }}
            gl={{ antialias: true }}
          >
            <color attach="background" args={[0x14171a]} />
            <fog attach="fog" args={[0x14171a, 20, 38]} />

            {/* Lighting matching mockup */}
            <hemisphereLight args={[0x445566, 0x11161a, 1.2]} />
            <directionalLight
              castShadow
              position={[8, 14, 6]}
              intensity={2.0}
              color={0xe0edff}
              shadow-mapSize={[1024, 1024]}
              shadow-camera-left={-14}
              shadow-camera-right={14}
              shadow-camera-top={14}
              shadow-camera-bottom={-14}
            />
            <directionalLight position={[-6, 6, -8]} intensity={0.8} color={0x5fa889} />

            <Ground />

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
              minPolarAngle={0.35}
              maxPolarAngle={1.3}
              minDistance={8}
              maxDistance={28}
              enableDamping
              dampingFactor={0.08}
            />
          </Canvas>
        </>
      )}
    </div>
  );
}
