"use client";
import { useRef, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Edges, Text } from "@react-three/drei";
import * as THREE from "three";
import { getFootprint, cellToWorld, UNIT_W, UNIT_D, UNIT_H } from "@/lib/footprints";
import FootprintEditor from "./FootprintEditor";

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

// ─── Floor slab — one extruded polygon per floor (decorative, non-clickable) ─
function FloorSlab({ points, floor }) {
  const shape = useMemo(() => pointsToShape(points), [points]);
  const geo   = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.12,
      bevelEnabled: false,
    });
    // ExtrudeGeometry extrudes along Z; rotate so it lies flat on XZ plane
    g.rotateX(-Math.PI / 2);
    // shift up to sit at the base of the floor
    g.translate(0, floor * UNIT_H - 0.12, 0);
    return g;
  }, [shape, floor]);

  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color={SLAB_COLOR} roughness={0.9} />
    </mesh>
  );
}

// ─── Pitched roof traced from the footprint polygon ─────────────────────────
function FootprintRoof({ points, floors }) {
  const geo = useMemo(() => {
    const topY    = floors * UNIT_H;
    const ridgeH  = 1.4;
    // Roof ridge: midpoint of the bounding box's longer axis
    const xs = points.map(p => p.x);
    const zs = points.map(p => p.z);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const midX = (minX + maxX) / 2 * 0.04; // slight offset like the mockup
    const ridgeZ0 = minZ + 0.2, ridgeZ1 = maxZ - 0.2;

    const verts = [];
    const n = points.length;

    // For each edge of the footprint polygon, create a face from that edge to the ridge line
    for (let i = 0; i < n; i++) {
      const a = points[i];
      const b = points[(i + 1) % n];
      // Simple hip-roof approximation: connect each edge to the nearest ridge point
      // We use two triangles per edge (quad split), ridge sampled by Z interpolation
      const rzA = Math.max(ridgeZ0, Math.min(ridgeZ1, a.z));
      const rzB = Math.max(ridgeZ0, Math.min(ridgeZ1, b.z));
      // tri 1
      verts.push(a.x, topY, a.z,  b.x, topY, b.z,  midX, topY + ridgeH, rzA);
      // tri 2 (if rzA !== rzB, add second triangle to fill gap)
      if (Math.abs(rzA - rzB) > 0.01) {
        verts.push(b.x, topY, b.z,  midX, topY + ridgeH, rzB,  midX, topY + ridgeH, rzA);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    g.computeVertexNormals();
    return g;
  }, [points, floors]);

  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color={ROOF_COLOR} roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Single unit box (clickable) ─────────────────────────────────────────────
function UnitBox({ unit, fp, isSelected, onClick }) {
  const cell  = fp.cells[unit.position_index % fp.cells.length];
  if (!cell) return null;
  const { x, y, z } = cellToWorld(cell.col, cell.row, unit.floor - 1, fp);
  const statusHex = STATUS_COLOR[unit.status] || STATUS_COLOR.vacant;
  const bw = UNIT_W - 0.12, bh = UNIT_H - 0.12, bd = UNIT_D - 0.12;

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
        {/* Slightly larger than bw and bd to prevent z-fighting */}
        <boxGeometry args={[bw + 0.02, 0.14, bd + 0.02]} />
        <meshStandardMaterial color={statusHex} roughness={0.6} />
      </mesh>

      {/* Window left */}
      <mesh position={[-0.65, 0.15, bd / 2 + 0.03]}>
        <planeGeometry args={[0.6, 0.7]} />
        <meshStandardMaterial
          color={WINDOW_COLOR}
          emissive={new THREE.Color(WINDOW_COLOR)}
          emissiveIntensity={unit.status === 'vacant' ? 0.02 : 0.35}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Window right */}
      <mesh position={[0.65, 0.15, bd / 2 + 0.03]}>
        <planeGeometry args={[0.6, 0.7]} />
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
    </group>
  );
}

// ─── Full building — slabs + unit boxes + roof ───────────────────────────────
function Building({ building, units, selectedUnitId, onSelectUnit }) {
  const fp = useMemo(() => getFootprint(building), [building]);

  return (
    <group>
      {/* Floor slabs — one per floor, decorative */}
      {Array.from({ length: building.floors }, (_, f) => (
        <FloorSlab key={f} points={fp.points} floor={f} />
      ))}

      {/* Unit boxes — individually clickable */}
      {units.map((unit) => (
        <UnitBox
          key={unit.id}
          unit={unit}
          fp={fp}
          isSelected={selectedUnitId === unit.id}
          onClick={onSelectUnit}
        />
      ))}

      {/* Roof */}
      <FootprintRoof points={fp.points} floors={building.floors} />
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
export default function Visualizer3D({ building, units, selectedUnitId, onSelectUnit, onBack, onSaveFootprint }) {
  const [editMode, setEditMode] = useState(false);
  
  // We keep a local copy of the footprint points while editing
  const [editorPoints, setEditorPoints] = useState([]);
  
  // When entering edit mode, derive initial points from the current building
  const handleEnterEditMode = () => {
    const fp = getFootprint(building);
    setEditorPoints(fp.points);
    setEditMode(true);
  };
  
  // Apply a template shape when in edit mode
  const applyTemplate = (type) => {
    const tempBuilding = { ...building, footprint_type: type, custom_footprint_points: null };
    const fp = getFootprint(tempBuilding);
    setEditorPoints(fp.points);
  };

  const handleSave = () => {
    if (onSaveFootprint) {
      onSaveFootprint(editorPoints);
    }
    setEditMode(false);
  };
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
                {editMode ? "Editing Footprint" : building.name}
              </div>
              <div className="mt-1 text-[12px] text-[#8b9390] uppercase tracking-[0.04em]">
                {editMode ? "Drag corners to reshape" : "Drag to orbit · Click a unit"}
              </div>
            </div>
            
            {!editMode && (
              <button 
                onClick={handleEnterEditMode}
                className="mt-2 w-fit rounded-full bg-[#3c6e59] px-4 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#4a8a70]"
              >
                Edit Footprint Shape
              </button>
            )}
          </div>

          {/* Footprint type badge or editor controls */}
          <div className="absolute top-5 right-5 z-10 flex gap-2">
            {!editMode ? (
              (building.footprint_type && building.footprint_type !== 'rectangle' || building.custom_footprint_points) && (
                <div className="rounded-full border border-[#2c3134] bg-[#1c2023]/80 backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5fa889]">
                  {building.custom_footprint_points ? "Custom Shape" : `${building.footprint_type.replace('_', '-')} shape`}
                </div>
              )
            ) : (
              <div className="flex flex-col items-end gap-3">
                <div className="flex gap-2">
                  <button onClick={() => applyTemplate('rectangle')} className="rounded border border-[#2c3134] bg-[#1c2023]/80 px-2 py-1 text-[11px] font-semibold text-[#8b9390] hover:text-white">Rect</button>
                  <button onClick={() => applyTemplate('l_shape')} className="rounded border border-[#2c3134] bg-[#1c2023]/80 px-2 py-1 text-[11px] font-semibold text-[#8b9390] hover:text-white">L-Shape</button>
                  <button onClick={() => applyTemplate('offset')} className="rounded border border-[#2c3134] bg-[#1c2023]/80 px-2 py-1 text-[11px] font-semibold text-[#8b9390] hover:text-white">Offset</button>
                </div>
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
                    Save Shape
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
                building={building}
                units={units}
                selectedUnitId={selectedUnitId}
                onSelectUnit={onSelectUnit}
              />
            ) : (
              <FootprintEditor 
                initialPoints={editorPoints}
                onChange={setEditorPoints}
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
