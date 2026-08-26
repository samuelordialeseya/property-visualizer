"use client";
import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Edges, Html } from "@react-three/drei";
import * as THREE from "three";
import { Building2, ArrowLeft, Pencil, Layers, X, Check, Plus, CopyPlus, RotateCw, Trash2, Info, Box, Grid, Square, Search, Upload, Wrench } from "lucide-react";
import { getFootprint, cellToWorld, UNIT_W, UNIT_D, UNIT_H } from "@/lib/footprints";
import { uploadFile, useMaintenanceTickets } from "@/hooks/useFirestore";
import { applyMaterialToRef } from "@/lib/textureGenerator";
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
const DOOR_COLOR       = 0x479de9;
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
// Status colour as CSS hex for Html pins
const STATUS_CSS = { occupied: '#d98a53', overdue: '#e05c5c', vacant: '#6e8592' };

function UnitBox({ unit, isSelected, onClick, activeFloor, searchQuery, hoveredUnitId, onHover, isEditMode, hasActiveTicket }) {
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
  const statusCss = STATUS_CSS[unit.status] || STATUS_CSS.vacant;

  // ── Floor Isolator: ghost upper floors when a specific floor is isolated
  const unitFloor = unit.floor || 1;
  const isGhosted = activeFloor !== 'All' && unitFloor !== activeFloor;

  // ── Tenant Spotlight: dim units that don't match search
  const q = searchQuery.trim().toLowerCase();
  const isDimmed = q.length > 0 && (
    !(unit.unit_label || '').toLowerCase().includes(q) &&
    !(unit.tenant?.name || '').toLowerCase().includes(q)
  );

  const isHovered = hoveredUnitId === unit.id && !isEditMode;

  // ── Material & Skinning
  const matRef = useRef();

  useEffect(() => {
    const repeatX = Math.max(1, (unit.width || 2.6) / 1.6);
    const repeatY = Math.max(1, (unit.height || 2.2) / 1.6);
    applyMaterialToRef(matRef.current, unit.material_type, unit.texture_url, repeatX, repeatY, unit.wall_color);
  }, [unit.texture_url, unit.material_type, unit.width, unit.height, unit.wall_color]);

  const isDefaultColor = !unit.wall_color || unit.wall_color === '#4a5a66';
  const baseColor = isDefaultColor ? UNIT_BODY_COLOR : (unit.wall_color || UNIT_BODY_COLOR);

  return (
    <group position={[x, y, z]} rotation={[0, rad, 0]}>
      {/* Main body */}
      <mesh
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick(unit); }}
        onPointerOver={(e) => { if (!isEditMode && e.pointerType === 'mouse') { e.stopPropagation(); onHover(unit.id); } }}
        onPointerOut={(e) => { if (!isEditMode && e.pointerType === 'mouse') { e.stopPropagation(); onHover(null); } }}
        userData={unit}
      >
        <boxGeometry args={[bw, bh, bd]} />
        <meshStandardMaterial
          ref={matRef}
          emissive={isSelected ? new THREE.Color(0x4a8a70) : new THREE.Color(0x000000)}
          emissiveIntensity={isSelected ? 0.15 : 0}
          transparent={isGhosted || isDimmed}
          opacity={isGhosted ? 0.12 : isDimmed ? 0.18 : 1}
        />
        {isSelected && <Edges scale={1.005} threshold={15} color="#2270b8" />}
      </mesh>

      {/* Status strip at base */}
      <mesh position={[0, -h / 2 + 0.07, 0]} castShadow>
        <boxGeometry args={[localW - 0.02, 0.14, localD - 0.02]} />
        <meshStandardMaterial
          color={statusHex} roughness={0.6}
          transparent={isGhosted || isDimmed}
          opacity={isGhosted ? 0.12 : isDimmed ? 0.18 : 1}
        />
      </mesh>

      {/* Window left */}
      {!isGhosted && (
        <mesh position={[-bw / 4, 0.15, bd / 2 + 0.03]}>
          <planeGeometry args={[0.5, 0.6]} />
          <meshStandardMaterial
            color={WINDOW_COLOR}
            emissive={new THREE.Color(WINDOW_COLOR)}
            emissiveIntensity={unit.status === 'vacant' ? 0.02 : 0.35}
            roughness={0.4}
            side={THREE.DoubleSide}
            transparent={isDimmed}
            opacity={isDimmed ? 0.18 : 1}
          />
        </mesh>
      )}
      {/* Window right */}
      {!isGhosted && (
        <mesh position={[bw / 4, 0.15, bd / 2 + 0.03]}>
          <planeGeometry args={[0.5, 0.6]} />
          <meshStandardMaterial
            color={WINDOW_COLOR}
            emissive={new THREE.Color(WINDOW_COLOR)}
            emissiveIntensity={unit.status === 'vacant' ? 0.02 : 0.35}
            roughness={0.4}
            side={THREE.DoubleSide}
            transparent={isDimmed}
            opacity={isDimmed ? 0.18 : 1}
          />
        </mesh>
      )}

      {/* Door */}
      {!isGhosted && (
        <mesh position={[0, -h / 2 + 0.5, bd / 2 + 0.03]}>
          <planeGeometry args={[0.55, 1.0]} />
          <meshStandardMaterial color={DOOR_COLOR} roughness={0.5} side={THREE.DoubleSide}
            transparent={isDimmed} opacity={isDimmed ? 0.18 : 1}
          />
        </mesh>
      )}

      {/* ── Facade-mounted pin (replaces old roof Text label) */}
      {!isGhosted && !isHovered && (
        <Html
          position={[0, h / 2 + 0.18, bd / 2 + 0.12]}
          center
          occlude
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'rgba(11,15,19,0.82)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '999px', padding: '2px 7px 2px 5px',
            fontSize: '10px', fontWeight: 700,
            fontFamily: 'Manrope, sans-serif', color: '#e4e4e7',
            whiteSpace: 'nowrap', opacity: isDimmed ? 0.2 : 1,
          }}>
            <span style={{ height: 6, width: 6, borderRadius: '50%', background: statusCss, flexShrink: 0, display: 'inline-block' }} />
            {unit.unit_label || '?'}
          </div>
        </Html>
      )}

      {/* ── Rich hover card */}
      {isHovered && !isGhosted && (
        <Html center position={[0, h / 2 + 0.6, 0]} zIndexRange={[20, 11]} style={{ pointerEvents: 'none' }}>
          <div style={{
            width: 192, background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(16px)', border: '1px solid #e4e4e7',
            borderRadius: 16, padding: '10px 12px', boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
            fontFamily: 'Manrope, sans-serif', color: '#18181b',
          }}>
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {unit.unit_label}
              </span>
              <span style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 500 }}>Floor {unitFloor}</span>
            </div>
            {/* Tenant name */}
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Sora, sans-serif', color: '#0b3860', marginBottom: 6, lineHeight: 1.2 }}>
              {unit.tenant?.name || 'Vacant'}
            </div>
            {/* Bottom row: rent + status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#3f3f46' }}>
                {unit.monthly_rent ? `₱${Number(unit.monthly_rent).toLocaleString()}` : '—'}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                padding: '2px 7px', borderRadius: 999,
                background: unit.status === 'occupied' ? '#fef3c7' : unit.status === 'overdue' ? '#fee2e2' : '#f4f4f5',
                color: unit.status === 'occupied' ? '#92400e' : unit.status === 'overdue' ? '#991b1b' : '#52525b',
              }}>
                {unit.status || 'vacant'}
              </span>
            </div>
            {/* Active Ticket Warning */}
            {hasActiveTicket && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '1px solid #f4f4f5', color: '#d97706', fontSize: 10, fontWeight: 700 }}>
                <Wrench size={12} />
                Needs Maintenance
              </div>
            )}
          </div>
        </Html>
      )}

      {/* ── Maintenance Wrench Icon ── */}
      {!isGhosted && hasActiveTicket && !isHovered && (
        <Html center position={[0, h / 2 + 0.45, bd / 2 + 0.12]} zIndexRange={[12, 1]} style={{ pointerEvents: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f59e0b', color: '#fff', borderRadius: '50%',
            width: 20, height: 20, boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
            opacity: isDimmed ? 0.3 : 1
          }}>
            <Wrench size={10} strokeWidth={3} />
          </div>
        </Html>
      )}

      {unit.roof_type === 'triangle' ? (
        <group position={[0, h / 2, 0]}>
          <mesh position={[0, 0.055, 0]} castShadow receiveShadow>
            <boxGeometry args={[localW + 0.2, 0.11, localD + 0.2]} />
            <meshStandardMaterial color={ROOF_COLOR} roughness={0.9}
              transparent={isGhosted || isDimmed} opacity={isGhosted ? 0.12 : isDimmed ? 0.18 : 1}
            />
          </mesh>
          <mesh position={[0, 0.11 + 0.5, 0]} castShadow receiveShadow rotation={[0, Math.PI / 4, 0]} scale={[(localW + 0.2) / Math.SQRT2, 1, (localD + 0.2) / Math.SQRT2]}>
            <coneGeometry args={[1, 1, 4]} />
            <meshStandardMaterial color={ROOF_COLOR} roughness={0.9}
              transparent={isGhosted || isDimmed} opacity={isGhosted ? 0.12 : isDimmed ? 0.18 : 1}
            />
          </mesh>
        </group>
      ) : (
        <mesh position={[0, h / 2 + 0.055, 0]} castShadow receiveShadow>
          <boxGeometry args={[localW + 0.2, 0.11, localD + 0.2]} />
          <meshStandardMaterial color={ROOF_COLOR} roughness={0.9}
            transparent={isGhosted || isDimmed} opacity={isGhosted ? 0.12 : isDimmed ? 0.18 : 1}
          />
        </mesh>
      )}
    </group>
  );
}

function Building({ units, tickets = [], selectedUnitId, onSelectUnit, activeFloor, searchQuery, hoveredUnitId, onHover }) {
  return (
    <group>
      {units.map((unit) => {
        const hasActiveTicket = tickets.some(t => t.unitId === unit.id && t.status !== "settled");
        return (
          <UnitBox
            key={unit.id}
            unit={unit}
            isSelected={selectedUnitId === unit.id}
            onClick={onSelectUnit}
            activeFloor={activeFloor}
            searchQuery={searchQuery}
            hoveredUnitId={hoveredUnitId}
            onHover={onHover}
            isEditMode={false}
            hasActiveTicket={hasActiveTicket}
          />
        );
      })}
    </group>
  );
}

// Convert editorRooms into a shape that UnitBox can render (optimistic view after save)
function editorRoomsToUnits(editorRooms) {
  return editorRooms.map(r => ({
    ...r,
    // ensure all fields UnitBox needs are present
    status: r.status || 'vacant',
    material_type: r.material_type || 'stucco',
    texture_url: r.texture_url || null,
    wall_color: r.wall_color || '#4a5a66',
  }));
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

  // ── Feature state: search, floor isolator, hover
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFloor, setActiveFloor] = useState('All');
  const [hoveredUnitId, setHoveredUnitId] = useState(null);

  // ── Tickets for indicator
  const { tickets } = useMaintenanceTickets(building?.id);

  // Derive unique floor list from units
  const floorList = useMemo(() => {
    const floors = [...new Set(units.map(u => u.floor || 1))].sort((a, b) => a - b);
    return floors;
  }, [units]);

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
    if (onSelectUnit) onSelectUnit(null);
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
      material_type: u.material_type || 'stucco',
      texture_url: u.texture_url || null,
      wall_color: u.wall_color || '#4a5a66',
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
      material_type: 'stucco',
      texture_url: null,
      wall_color: '#4a5a66',
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
      material_type: 'stucco',
      texture_url: null,
      wall_color: '#4a5a66',
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
      material_type: 'stucco',
      texture_url: null,
      wall_color: '#4a5a66',
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

  const [optimisticUnits, setOptimisticUnits] = useState(null);

  const handleSave = async () => {
    try {
      if (onSaveLayout) {
        await onSaveLayout(editorRooms, deletedRoomIds);
      }
      // Immediately show saved state using editorRooms while Firestore catches up
      setOptimisticUnits(editorRoomsToUnits(editorRooms));
      setEditMode(false);
      // Clear optimistic state after Firestore listener should have updated
      setTimeout(() => setOptimisticUnits(null), 4000);
    } catch (err) {
      console.error("Failed to save layout:", err);
      alert("Failed to save layout, check console.");
    }
  };

  const [uploadingTexture, setUploadingTexture] = useState(false);

  const handleTextureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEditorRoomId) return;
    setUploadingTexture(true);
    try {
      const url = await uploadFile(`buildings/${building?.id}/textures/${selectedEditorRoomId}_${Date.now()}`, file);
      setEditorRooms(editorRooms.map(r => r.id === selectedEditorRoomId ? { ...r, texture_url: url, material_type: 'custom' } : r));
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload texture");
    } finally {
      setUploadingTexture(false);
      e.target.value = null;
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
          {/* ── TOP-LEFT HUD: Search & Primary Actions ─────────────────────────── */}
          <div className="absolute top-4 left-4 z-20 flex flex-col items-start gap-3 pointer-events-none">
            {/* TENANT SPOTLIGHT SEARCH */}
            {!editMode && (
              <div className={`pointer-events-auto flex items-center gap-2 bg-zinc-900/80 backdrop-blur-xl border rounded-2xl px-3 py-2 shadow-2xl transition-all shrink-0 ${
                searchQuery ? 'border-[#2270b8] ring-2 ring-[#2270b8]/30' : 'border-white/10'
              }`}>
                <Search size={14} className="text-white/40 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tenant or unit..."
                  className="bg-transparent outline-none text-[12px] text-white placeholder-white/40 w-40 font-['Manrope']"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white transition">
                    <X size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── BOTTOM-LEFT HUD: Building Meta & Edit Controls ─────────────────────────── */}
          <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2.5 pointer-events-none flex-wrap max-w-[60vw]">
            <div className="pointer-events-auto flex items-center gap-2.5 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 pl-3 shadow-2xl shrink-0">
              {onBack && !editMode && (
                <button onClick={onBack} className="text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-xl transition" title="Back to Details">
                  <ArrowLeft size={16} />
                </button>
              )}
              {onBack && !editMode && <div className="h-5 w-px bg-white/15" />}
              <div className="flex flex-col leading-none pr-1">
                <span className="text-[14px] font-bold text-white tracking-tight leading-none font-['Sora']">
                  {editMode ? "Layout Editor" : (building.name || "Untitled Building")}
                </span>
                <span className="mt-0.5 text-[11px] text-white/40 font-['Manrope'] font-medium truncate max-w-[180px]">
                  {editMode ? "Sims-Style 3D Builder" : (building.address || "No address set")}
                </span>
              </div>
              {!editMode && (
                <button onClick={openEditInfo} title="Edit building info" className="text-white/40 hover:text-[#479de9] p-1 rounded-lg transition">
                  <Pencil size={13} />
                </button>
              )}
              <div className="h-5 w-px bg-white/15" />
              {!editMode ? (
                <div className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#479de9] font-['Manrope'] whitespace-nowrap">
                  {units.length} Units
                </div>
              ) : (
                <div className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 font-['Manrope'] whitespace-nowrap">
                  Edit Mode
                </div>
              )}
              <div className="h-5 w-px bg-white/15" />
              {!editMode ? (
                <button
                  onClick={handleEnterEditMode}
                  className="flex items-center gap-1.5 bg-[#2270b8] hover:bg-[#3186d6] text-white px-3.5 py-1.5 rounded-xl text-[12px] font-semibold font-['Manrope'] shadow-md transition active:scale-95"
                >
                  <Layers size={14} />
                  Edit Layout
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-xl text-[12px] font-semibold font-['Manrope'] transition"
                  >
                    <X size={13} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 bg-[#2270b8] hover:bg-[#3186d6] text-white px-3.5 py-1.5 rounded-xl text-[12px] font-semibold font-['Manrope'] shadow-lg transition"
                  >
                    <Check size={13} />
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT SIDE CONTEXTUAL INSPECTOR ─────────────────────────────── */}
          <div className="absolute top-20 right-4 z-20 pointer-events-none">
            {editMode ? (
              selectedRoom ? (
                <div className="pointer-events-auto w-72 bg-white/95 backdrop-blur-xl border border-zinc-200/90 text-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <input
                      type="text"
                      className="font-bold text-zinc-900 font-['Sora'] text-[13px] bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 py-1 outline-none focus:border-[#2270b8] flex-1 min-w-0 transition"
                      value={selectedRoom.unit_label}
                      placeholder="e.g. 101, A-1, Studio, Penthouse"
                      onChange={(e) => setEditorRooms(editorRooms.map(r => r.id === selectedEditorRoomId ? { ...r, unit_label: e.target.value } : r))}
                    />
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        title="Rotate 90°"
                        onClick={() => {
                          const cur = selectedRoom.rotation || 0;
                          setEditorRooms(editorRooms.map(r => r.id === selectedEditorRoomId ? { ...r, rotation: (cur + 90) % 360 } : r));
                        }}
                        className="text-[#2270b8] hover:bg-blue-50 p-1.5 rounded-lg border border-blue-100 transition"
                      >
                        <RotateCw size={14} />
                      </button>
                      <button
                        title="Delete Room"
                        onClick={handleDeleteRoom}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg border border-red-100 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Floor & Roof Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-[600] uppercase tracking-[0.08em] text-zinc-400 mb-1 font-['Manrope']">Floor</label>
                      <select
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 text-[12px] text-zinc-800 outline-none focus:border-[#2270b8] transition"
                        value={selectedRoom.floor}
                        onChange={(e) => setEditorRooms(editorRooms.map(r => r.id === selectedEditorRoomId ? { ...r, floor: parseInt(e.target.value, 10) } : r))}
                      >
                        <option value={1}>Floor 1</option>
                        <option value={2}>Floor 2</option>
                        <option value={3}>Floor 3</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-[600] uppercase tracking-[0.08em] text-zinc-400 mb-1 font-['Manrope']">Roof</label>
                      <select
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 text-[12px] text-zinc-800 outline-none focus:border-[#2270b8] transition"
                        value={selectedRoom.roof_type || 'flat'}
                        onChange={(e) => setEditorRooms(editorRooms.map(r => r.id === selectedEditorRoomId ? { ...r, roof_type: e.target.value } : r))}
                      >
                        <option value="flat">Flat</option>
                        <option value="triangle">Triangle</option>
                      </select>
                    </div>
                  </div>

                  {/* Height slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-[600] uppercase tracking-[0.08em] text-zinc-400 font-['Manrope']">Height</label>
                      <span className="text-[11px] font-[700] text-[#2270b8]">{selectedRoom.height}m</span>
                    </div>
                    <input
                      type="range" min="1" max="4" step="0.2"
                      className="w-full accent-[#2270b8]"
                      value={selectedRoom.height}
                      onChange={(e) => setEditorRooms(editorRooms.map(r => r.id === selectedEditorRoomId ? { ...r, height: parseFloat(e.target.value) } : r))}
                    />
                  </div>

                  <div className="border-t border-zinc-100 pt-3 space-y-3">
                    <div>
                      <label className="block text-[10px] font-[600] uppercase tracking-[0.08em] text-zinc-400 mb-1 font-['Manrope']">Material & Skin</label>
                      <select
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 text-[12px] text-zinc-800 outline-none focus:border-[#2270b8] transition"
                        value={selectedRoom.material_type || 'stucco'}
                        onChange={(e) => {
                          const val = e.target.value;
                          const isTextured = ['brick', 'wood', 'concrete', 'metal'].includes(val);
                          setEditorRooms(editorRooms.map(r => r.id === selectedEditorRoomId ? { 
                            ...r, 
                            material_type: val,
                            texture_url: val !== 'custom' ? null : r.texture_url,
                            wall_color: isTextured ? '#ffffff' : (val === 'stucco' ? '#4a5a66' : r.wall_color)
                          } : r));
                        }}
                      >
                        <option value="stucco">Stucco (Default)</option>
                        <option value="brick">Brick</option>
                        <option value="wood">Wood</option>
                        <option value="concrete">Concrete</option>
                        <option value="metal">Metal</option>
                        <option value="custom">Custom Upload</option>
                      </select>
                    </div>

                    {selectedRoom.material_type === 'custom' && (
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center justify-center gap-2 cursor-pointer w-full border border-dashed border-[#2270b8]/40 bg-blue-50/50 hover:bg-blue-50 text-[#2270b8] rounded-lg px-2 py-2 text-[11px] font-semibold transition">
                          {uploadingTexture ? 'Uploading...' : <><Upload size={14} /> Upload Texture</>}
                          <input type="file" accept="image/*" className="hidden" onChange={handleTextureUpload} disabled={uploadingTexture} />
                        </label>
                        {selectedRoom.texture_url && (
                          <div className="h-10 w-full rounded-md border border-zinc-200 overflow-hidden bg-zinc-100">
                            <img src={selectedRoom.texture_url} alt="Texture Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-[600] uppercase tracking-[0.08em] text-zinc-400 mb-1 font-['Manrope']">Wall Tint</label>
                      <div className="flex items-center gap-2">
                        {[
                          ['#ffffff', 'White'],
                          ['#4a5a66', 'Slate'],
                          ['#d9ccbc', 'Sand'],
                          ['#2c3238', 'Charcoal']
                        ].map(([hex, name]) => (
                          <button
                            key={hex}
                            title={name}
                            onClick={() => setEditorRooms(editorRooms.map(r => r.id === selectedEditorRoomId ? { ...r, wall_color: hex } : r))}
                            className={`w-6 h-6 rounded-full border-2 transition ${
                              (selectedRoom.wall_color || '#4a5a66') === hex ? 'border-[#2270b8] scale-110 shadow-sm' : 'border-zinc-200 hover:scale-105'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pointer-events-auto bg-zinc-900/75 backdrop-blur-md border border-white/10 text-zinc-300 text-[11px] font-['Manrope'] px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                  <Info size={12} className="text-[#479de9] shrink-0" />
                  Click a room to inspect · Drag to reposition · Arrow keys to resize
                </div>
              )
            ) : null}
          </div>

          {/* ── BOTTOM CONTROL DOCK ──────────────────────────────────────────── */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl px-3 py-2 text-white">

              {/* Camera Presets — Segmented pill with icons */}
              <div className="flex items-center gap-0.5 rounded-xl bg-white/5 p-0.5">
                {[
                  ["isometric", "Iso", <Box size={13} key="box" />],
                  ["top-down",  "Top", <Grid size={13} key="grid" />],
                  ["front",     "Front", <Square size={13} key="sq" />]
                ].map(([preset, label, icon]) => (
                  <button
                    key={preset}
                    onClick={() => setCameraPreset(preset)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold font-['Manrope'] transition ${
                      cameraPreset === preset
                        ? 'bg-[#0F4C81] text-white shadow-sm border border-blue-400/30'
                        : 'text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {icon}{label}
                  </button>
                ))}
              </div>

              <div className="h-5 w-px bg-white/15" />

              {/* Floor Isolator (View Mode only) */}
              {!editMode && floorList.length > 1 && (
                <>
                  <div className="flex items-center gap-0.5 rounded-xl bg-white/5 p-0.5">
                    {['All', ...floorList].map((f) => (
                      <button
                        key={f}
                        onClick={() => setActiveFloor(f)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold font-['Manrope'] transition ${
                          activeFloor === f
                            ? 'bg-[#2270b8] text-white shadow-sm'
                            : 'text-zinc-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {f === 'All' ? 'All' : `F${f}`}
                      </button>
                    ))}
                  </div>
                  <div className="h-5 w-px bg-white/15" />
                </>
              )}

              {/* Edit Mode: Builder tools | View Mode: Legend */}
              {editMode ? (
                <>
                  <button
                    onClick={handleAddRoom}
                    className="flex items-center gap-1 bg-[#0b3860] hover:bg-[#154e83] border border-[#2270b8]/40 text-white px-3 py-1.5 rounded-xl text-[11px] font-semibold font-['Manrope'] transition shadow-sm"
                  >
                    <Plus size={13} /> Room
                  </button>
                  <button
                    onClick={handleAddLShape}
                    className="flex items-center gap-1 bg-[#2d5a72] hover:bg-[#3a7290] border border-[#3a7290] text-white px-3 py-1.5 rounded-xl text-[11px] font-semibold font-['Manrope'] transition shadow-sm"
                    title="Adds two rooms in an L-shape"
                  >
                    <CopyPlus size={13} /> L-Shape
                  </button>
                </>
              ) : (
                <>
                  {[['#d98a53','Occupied'],['#e05c5c','Overdue'],['#6e8592','Vacant']].map(([color, label]) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-[11px] font-medium text-zinc-300 font-['Manrope']">{label}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
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
                units={optimisticUnits || units}
                tickets={tickets}
                selectedUnitId={selectedUnitId}
                onSelectUnit={onSelectUnit}
                activeFloor={activeFloor}
                searchQuery={searchQuery}
                hoveredUnitId={hoveredUnitId}
                onHover={setHoveredUnitId}
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
                <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-[#2270b8] opacity-20 blur-3xl" />

                {/* Header */}
                <div className="mb-1 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#2270b8]/20 text-[#2270b8]">
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
                      className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-[14px] text-white placeholder-white/30 outline-none transition focus:border-[#2270b8]/60 focus:bg-white/15"
                      placeholder="e.g. North Tower"
                      value={setupName}
                      onChange={e => setSetupName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50">Address</label>
                    <input
                      className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-[14px] text-white placeholder-white/30 outline-none transition focus:border-[#2270b8]/60 focus:bg-white/15"
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
                      className="flex-1 rounded-xl bg-[#2270b8] py-3 text-[14px] font-bold text-white shadow-lg transition hover:bg-[#479de9] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
