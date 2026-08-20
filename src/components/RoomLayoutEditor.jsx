"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";

const UNIT_H = 2.2;
const MIN_DIM = 1.0;

function roomsIntersect(r1, r2) {
  if (r1.floor !== r2.floor) return false;
  const margin = 0.02; // very small margin to allow sharing boundaries
  const r1x1 = r1.x - r1.width / 2;
  const r1x2 = r1.x + r1.width / 2;
  const r1z1 = r1.z - r1.depth / 2;
  const r1z2 = r1.z + r1.depth / 2;

  const r2x1 = r2.x - r2.width / 2;
  const r2x2 = r2.x + r2.width / 2;
  const r2z1 = r2.z - r2.depth / 2;
  const r2z2 = r2.z + r2.depth / 2;

  return (
    r1x1 + margin < r2x2 &&
    r1x2 - margin > r2x1 &&
    r1z1 + margin < r2z2 &&
    r1z2 - margin > r2z1
  );
}

export default function RoomLayoutEditor({ rooms, onChange, selectedRoomId, onSelectRoom }) {
  const { controls, raycaster } = useThree();
  
  // Dragging states
  // dragType: 'move' | 'corner-0' | 'corner-1' | 'corner-2' | 'corner-3' | 'height'
  const [dragState, setDragState] = useState(null); 
  const planeRef = useRef(null);

  // Disable camera controls when dragging
  useEffect(() => {
    if (controls) {
      controls.enabled = dragState === null;
    }
  }, [dragState, controls]);

  const handlePointerDown = (e, roomId, type) => {
    e.stopPropagation();
    onSelectRoom(roomId);
    setDragState({ roomId, type });
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragState || !planeRef.current) return;
    const { roomId, type } = dragState;
    const currentRoom = rooms.find(r => r.id === roomId);
    if (!currentRoom) return;

    const intersects = raycaster.intersectObject(planeRef.current);
    if (intersects.length === 0) return;
    const hitPoint = intersects[0].point;

    // Convert room to coordinates format
    let x1 = currentRoom.x - currentRoom.width / 2;
    let x2 = currentRoom.x + currentRoom.width / 2;
    let z1 = currentRoom.z - currentRoom.depth / 2;
    let z2 = currentRoom.z + currentRoom.depth / 2;
    let height = currentRoom.height;
    let floor = currentRoom.floor;

    const gridSnap = 0.5;
    const snapX = Math.round(hitPoint.x / gridSnap) * gridSnap;
    const snapZ = Math.round(hitPoint.z / gridSnap) * gridSnap;

    let updatedRoom = { ...currentRoom };

    if (type === "move") {
      // For movement, we raycast and center the room on the cursor
      // (relative to drag offset would be better, but direct center-snap is extremely clean and stable)
      updatedRoom.x = snapX;
      updatedRoom.z = snapZ;
    } else if (type.startsWith("corner-")) {
      const idx = parseInt(type.split("-")[1], 10);
      // Index mapping:
      // 0: bottom-left (x1, z1)
      // 1: bottom-right (x2, z1)
      // 2: top-left (x1, z2)
      // 3: top-right (x2, z2)
      if (idx === 0) {
        x1 = Math.min(snapX, x2 - MIN_DIM);
        z1 = Math.min(snapZ, z2 - MIN_DIM);
      } else if (idx === 1) {
        x2 = Math.max(snapX, x1 + MIN_DIM);
        z1 = Math.min(snapZ, z2 - MIN_DIM);
      } else if (idx === 2) {
        x1 = Math.min(snapX, x2 - MIN_DIM);
        z2 = Math.max(snapZ, z1 + MIN_DIM);
      } else if (idx === 3) {
        x2 = Math.max(snapX, x1 + MIN_DIM);
        z2 = Math.max(snapZ, z1 + MIN_DIM);
      }
      updatedRoom.width = x2 - x1;
      updatedRoom.depth = z2 - z1;
      updatedRoom.x = (x1 + x2) / 2;
      updatedRoom.z = (z1 + z2) / 2;
    } else if (type === "height") {
      // Raycast height against vertical projection or cursor y
      // Hit point is on ground plane, so we look at the vertical cursor position.
      // But standard R3F raycaster against ground plane won't give height directly.
      // So we can estimate delta Y based on mouse movement, or raycast against a vertical plane facing camera.
      // Standard simple approach for flat ground plane height control:
      // Use the cursor hit point Z delta or simply read the screen space delta.
      // Let's do plane hitPoint Z delta translated to height for simplicity and stability, 
      // or check the actual vertical coordinate of the ray's origin/direction.
      // Even simpler: Since we have the raycaster ray, we can find the point of closest approach to a vertical line,
      // or compute it mathematically:
      const ray = raycaster.ray;
      // Solve for vertical line at [currentRoom.x, z]:
      // ray.origin + t * ray.direction = [currentRoom.x, y, currentRoom.z]
      // t * direction.x = currentRoom.x - origin.x  =>  t = (currentRoom.x - origin.x) / direction.x
      let t = 0;
      if (Math.abs(ray.direction.x) > 0.01) {
        t = (currentRoom.x - ray.origin.x) / ray.direction.x;
      } else if (Math.abs(ray.direction.z) > 0.01) {
        t = (currentRoom.z - ray.origin.z) / ray.direction.z;
      }
      const verticalY = ray.origin.y + t * ray.direction.y;
      
      const groundLevel = (floor - 1) * UNIT_H;
      const calculatedHeight = Math.max(1.0, Math.min(6.0, verticalY - groundLevel));
      // Snap height to 0.2 units
      updatedRoom.height = Math.round(calculatedHeight / 0.2) * 0.2;
    }

    // Check collision with other rooms on the same floor
    const hasCollision = rooms.some(r => r.id !== roomId && roomsIntersect(updatedRoom, r));
    if (!hasCollision) {
      const newRooms = rooms.map(r => r.id === roomId ? updatedRoom : r);
      onChange(newRooms);
    }
  };

  const handlePointerUp = (e) => {
    if (dragState) {
      e.target.releasePointerCapture(e.pointerId);
      setDragState(null);
    }
  };

  return (
    <group 
      onPointerMove={dragState ? handlePointerMove : undefined}
      onPointerUp={dragState ? handlePointerUp : undefined}
    >
      {/* Invisible plane at y = 0 for XZ raycasting */}
      <mesh ref={planeRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} visible={false}>
        <planeGeometry args={[300, 300]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>

      {/* Render all rooms */}
      {rooms.map((room) => {
        const isSelected = room.id === selectedRoomId;
        const yOffset = (room.floor - 1) * UNIT_H;
        const center = [room.x, yOffset + room.height / 2, room.z];
        const statusColors = {
          occupied: "#c97a4a",
          overdue: "#b23b3b",
          vacant: "#a9b6b0"
        };
        const baseColor = isSelected ? "#3c6e59" : "#2e3438";

        // Corners for handles
        const x1 = room.x - room.width / 2;
        const x2 = room.x + room.width / 2;
        const z1 = room.z - room.depth / 2;
        const z2 = room.z + room.depth / 2;
        const corners = [
          { x: x1, z: z1 }, // 0: BL
          { x: x2, z: z1 }, // 1: BR
          { x: x1, z: z2 }, // 2: TL
          { x: x2, z: z2 }  // 3: TR
        ];

        return (
          <group key={room.id}>
            {/* Room Box Mesh */}
            <mesh 
              position={center} 
              onClick={(e) => {
                e.stopPropagation();
                onSelectRoom(room.id);
              }}
              onPointerDown={(e) => {
                // If not clicking handles, drag the body of the room to move
                if (isSelected) {
                  handlePointerDown(e, room.id, "move");
                }
              }}
            >
              <boxGeometry args={[room.width - 0.05, room.height - 0.05, room.depth - 0.05]} />
              <meshStandardMaterial 
                color={baseColor} 
                roughness={0.8}
                emissive={isSelected ? "#5fa889" : "#000000"}
                emissiveIntensity={isSelected ? 0.2 : 0}
              />
              {isSelected && <Edges scale={1.005} threshold={15} color="#5fa889" />}
            </mesh>

            {/* Status strip at base of the room */}
            <mesh position={[room.x, yOffset + 0.07, room.z]}>
              <boxGeometry args={[room.width - 0.03, 0.14, room.depth - 0.03]} />
              <meshStandardMaterial color={statusColors[room.status || "vacant"]} roughness={0.6} />
            </mesh>

            {/* Render handles ONLY if selected */}
            {isSelected && (
              <>
                {/* 4 Corner resizing handles */}
                {corners.map((c, i) => (
                  <mesh 
                    key={i} 
                    position={[c.x, yOffset + 0.15, c.z]}
                    onPointerDown={(e) => handlePointerDown(e, room.id, `corner-${i}`)}
                  >
                    <sphereGeometry args={[0.22, 16, 16]} />
                    <meshStandardMaterial color="#f2c98a" roughness={0.4} emissive="#f2c98a" emissiveIntensity={0.2} />
                  </mesh>
                ))}

                {/* Top vertical height handle */}
                <mesh 
                  position={[room.x, yOffset + room.height + 0.15, room.z]}
                  onPointerDown={(e) => handlePointerDown(e, room.id, "height")}
                >
                  <coneGeometry args={[0.18, 0.4, 16]} />
                  <meshStandardMaterial color="#f2c98a" roughness={0.4} emissive="#f2c98a" emissiveIntensity={0.2} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}
