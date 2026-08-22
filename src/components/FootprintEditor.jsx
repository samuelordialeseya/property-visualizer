"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

/**
 * Checks if two line segments (p1-p2 and p3-p4) intersect.
 */
function lineIntersect(p1, p2, p3, p4) {
  const denominator = (p4.z - p3.z) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.z - p1.z);
  if (denominator === 0) return false;

  const ua = ((p4.x - p3.x) * (p1.z - p3.z) - (p4.z - p3.z) * (p1.x - p3.x)) / denominator;
  const ub = ((p2.x - p1.x) * (p1.z - p3.z) - (p2.z - p1.z) * (p1.x - p3.x)) / denominator;

  // We use a small epsilon for the bounds to ignore vertices touching each other
  const eps = 0.001;
  return ua > eps && ua < 1 - eps && ub > eps && ub < 1 - eps;
}

/**
 * Checks if a polygon has any self-intersecting edges.
 */
function isSelfIntersecting(pts) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      // Don't check adjacent edges since they share a vertex
      if (i === 0 && j === n - 1) continue;
      const p3 = pts[j];
      const p4 = pts[(j + 1) % n];
      if (lineIntersect(p1, p2, p3, p4)) {
        return true;
      }
    }
  }
  return false;
}

export default function FootprintEditor({ initialPoints, onChange }) {
  const { controls, raycaster } = useThree();
  const [points, setPoints] = useState(initialPoints);
  const [dragIndex, setDragIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  
  // Update internal state if props change (e.g., switched footprint type)
  useEffect(() => {
    setPoints(initialPoints);
  }, [initialPoints]);

  const planeRef = useRef(null);

  // When dragging starts, disable orbit controls
  useEffect(() => {
    if (controls) {
      controls.enabled = dragIndex === null;
    }
  }, [dragIndex, controls]);

  const handlePointerDown = (e, index) => {
    e.stopPropagation();
    setDragIndex(index);
    // Raycaster is updated automatically by R3F on pointerdown, so we capture the start
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (dragIndex === null || !planeRef.current) return;
    
    // We need to raycast against the invisible plane
    const intersects = raycaster.intersectObject(planeRef.current);
    if (intersects.length > 0) {
      const p = intersects[0].point;
      
      // Snap to 0.5 grid
      const snap = 0.5;
      const nx = Math.round(p.x / snap) * snap;
      const nz = Math.round(p.z / snap) * snap;

      // Candidate points array
      const newPts = [...points];
      newPts[dragIndex] = { x: nx, z: nz };

      // Ensure no self-intersection
      if (!isSelfIntersecting(newPts)) {
        setPoints(newPts);
        onChange(newPts); // Notify parent (Visualizer3D)
      }
    }
  };

  const handlePointerUp = (e) => {
    if (dragIndex !== null) {
      e.target.releasePointerCapture(e.pointerId);
      setDragIndex(null);
    }
  };

  // Convert points to 3D array for the Line component
  const linePoints = useMemo(() => {
    const pts = points.map(p => new THREE.Vector3(p.x, 0.1, p.z));
    if (pts.length > 0) pts.push(pts[0]); // close the loop
    return pts;
  }, [points]);

  return (
    <group 
      onPointerMove={dragIndex !== null ? handlePointerMove : undefined}
      onPointerUp={dragIndex !== null ? handlePointerUp : undefined}
    >
      {/* Invisible plane for raycasting during drag */}
      <mesh 
        ref={planeRef} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        visible={false}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>

      {/* Polygon outline */}
      {linePoints.length > 1 && (
        <Line 
          points={linePoints}
          color="#2270b8"
          lineWidth={4}
          dashed={true}
          dashSize={0.5}
          gapSize={0.2}
        />
      )}

      {/* Handles */}
      {points.map((p, i) => (
        <mesh 
          key={i} 
          position={[p.x, dragIndex === i || hoverIndex === i ? 0.4 : 0.2, p.z]}
          onPointerDown={(e) => handlePointerDown(e, i)}
          onPointerOver={() => setHoverIndex(i)}
          onPointerOut={() => setHoverIndex(null)}
          scale={dragIndex === i ? 1.5 : 1}
        >
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial 
            color={dragIndex === i ? "#f2c98a" : hoverIndex === i ? "#2270b8" : "#0b3860"} 
            roughness={0.4} 
            emissive={dragIndex === i ? "#f2c98a" : "#000000"}
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}
