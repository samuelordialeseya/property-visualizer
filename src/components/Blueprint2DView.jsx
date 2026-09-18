"use client";

import React, { useState, useRef, useMemo } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Wrench, User, Maximize2, Box } from "lucide-react";

const STATUS_CONFIG = {
  occupied: { border: "#d98a53", bg: "rgba(217, 138, 83, 0.18)", label: "Occupied", pillBg: "#d98a53" },
  overdue:  { border: "#e05c5c", bg: "rgba(224, 92, 92, 0.18)",   label: "Overdue",  pillBg: "#e05c5c" },
  vacant:   { border: "#4a5a66", bg: "rgba(74, 90, 102, 0.18)",   label: "Vacant",   pillBg: "#6e8592" },
};

const PIXELS_PER_METER = 48; // Base scale: 1 meter = 48 SVG pixels

export default function Blueprint2DView({
  units = [],
  tickets = [],
  selectedUnitId,
  onSelectUnit,
  activeFloor = "All",
  searchQuery = "",
  hoveredUnitId,
  onHover,
  onEnterEditMode,
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Filter units by floor
  const floorUnits = useMemo(() => {
    return units.filter((u) => {
      if (activeFloor === "All") return true;
      return (u.floor || 1) === activeFloor;
    });
  }, [units, activeFloor]);

  // Calculate bounding box in world meters
  const bounds = useMemo(() => {
    if (floorUnits.length === 0) return { minX: -5, maxX: 5, minZ: -5, maxZ: 5, width: 10, depth: 10, centerX: 0, centerZ: 0 };
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    floorUnits.forEach((u) => {
      const x = u.x || 0;
      const z = u.z || 0;
      const rot = u.rotation || 0;
      const isRot = rot === 90 || rot === 270;
      const w = isRot ? (u.depth || 3.2) : (u.width || 2.6);
      const d = isRot ? (u.width || 2.6) : (u.depth || 3.2);
      minX = Math.min(minX, x - w / 2);
      maxX = Math.max(maxX, x + w / 2);
      minZ = Math.min(minZ, z - d / 2);
      maxZ = Math.max(maxZ, z + d / 2);
    });
    // Add padding around building
    minX -= 2;
    maxX += 2;
    minZ -= 2;
    maxZ += 2;
    return {
      minX, maxX, minZ, maxZ,
      width: maxX - minX,
      depth: maxZ - minZ,
      centerX: (minX + maxX) / 2,
      centerZ: (minZ + maxZ) / 2,
    };
  }, [floorUnits]);

  // Touch / mouse panning handlers
  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoom = (delta) => {
    setZoom((prev) => Math.min(2.5, Math.max(0.4, prev + delta)));
  };

  const q = searchQuery.trim().toLowerCase();

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#0b0f13] overflow-hidden select-none cursor-grab active:cursor-grabbing font-sans"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* ── Blueprint Grid & Rooms Canvas ───────────────────────── */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: "center center",
          transition: isPanning ? "none" : "transform 140ms ease-out",
        }}
      >
        <svg
          className="overflow-visible pointer-events-auto"
          width={Math.max(600, bounds.width * PIXELS_PER_METER)}
          height={Math.max(500, bounds.depth * PIXELS_PER_METER)}
          viewBox={`${bounds.minX * PIXELS_PER_METER} ${bounds.minZ * PIXELS_PER_METER} ${bounds.width * PIXELS_PER_METER} ${bounds.depth * PIXELS_PER_METER}`}
        >
          <defs>
            {/* Engineering millimeter grid */}
            <pattern id="smallGrid" width={PIXELS_PER_METER / 2} height={PIXELS_PER_METER / 2} patternUnits="userSpaceOnUse">
              <path d={`M ${PIXELS_PER_METER / 2} 0 L 0 0 0 ${PIXELS_PER_METER / 2}`} fill="none" stroke="#161e27" strokeWidth="0.8" />
            </pattern>
            <pattern id="grid" width={PIXELS_PER_METER} height={PIXELS_PER_METER} patternUnits="userSpaceOnUse">
              <rect width={PIXELS_PER_METER} height={PIXELS_PER_METER} fill="url(#smallGrid)" />
              <path d={`M ${PIXELS_PER_METER} 0 L 0 0 0 ${PIXELS_PER_METER}`} fill="none" stroke="#222f3d" strokeWidth="1.2" />
            </pattern>
          </defs>

          {/* Background grid rect */}
          <rect
            x={bounds.minX * PIXELS_PER_METER}
            y={bounds.minZ * PIXELS_PER_METER}
            width={bounds.width * PIXELS_PER_METER}
            height={bounds.depth * PIXELS_PER_METER}
            fill="url(#grid)"
          />

          {/* Coordinate Origin Axis Marker */}
          <line x1="-30" y1="0" x2="30" y2="0" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
          <line x1="0" y1="-30" x2="0" y2="30" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />

          {/* Render Rooms */}
          {floorUnits.map((unit) => {
            const rot = unit.rotation || 0;
            const isRot = rot === 90 || rot === 270;
            const w = isRot ? (unit.depth || 3.2) : (unit.width || 2.6);
            const d = isRot ? (unit.width || 2.6) : (unit.depth || 3.2);

            const pxW = w * PIXELS_PER_METER;
            const pxD = d * PIXELS_PER_METER;
            const pxX = (unit.x || 0) * PIXELS_PER_METER - pxW / 2;
            const pxZ = (unit.z || 0) * PIXELS_PER_METER - pxD / 2;

            const isSelected = selectedUnitId === unit.id;
            const isHovered = hoveredUnitId === unit.id;
            const hasTicket = tickets.some((t) => t.unitId === unit.id && t.status !== "settled");

            const isDimmed = q.length > 0 && !(
              (unit.unit_label || "").toLowerCase().includes(q) ||
              (unit.tenant?.name || "").toLowerCase().includes(q)
            );

            const status = STATUS_CONFIG[unit.status] || STATUS_CONFIG.vacant;

            return (
              <g
                key={unit.id}
                transform={`translate(${pxX}, ${pxZ})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectUnit?.(unit);
                }}
                onPointerEnter={() => onHover?.(unit.id)}
                onPointerLeave={() => onHover?.(null)}
                className="cursor-pointer transition-opacity duration-150"
                style={{ opacity: isDimmed ? 0.2 : 1 }}
              >
                {/* Room Outer Wall / Fill */}
                <rect
                  x="0"
                  y="0"
                  width={pxW}
                  height={pxD}
                  rx="6"
                  fill={isSelected ? "rgba(34, 112, 184, 0.25)" : isHovered ? "rgba(255, 255, 255, 0.08)" : status.bg}
                  stroke={isSelected ? "#479de9" : status.border}
                  strokeWidth={isSelected ? "3" : isHovered ? "2.5" : "1.8"}
                  strokeDasharray={unit.status === "vacant" ? "4 2" : "none"}
                />

                {/* Status Indicator Bar at Top Edge */}
                <rect
                  x="3"
                  y="3"
                  width={Math.max(10, pxW - 6)}
                  height="4"
                  rx="2"
                  fill={status.pillBg}
                />

                {/* Room Center Content: SVG ForeignObject */}
                <foreignObject x="4" y="10" width={Math.max(40, pxW - 8)} height={Math.max(30, pxD - 14)}>
                  <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center select-none overflow-hidden">
                    {/* Unit Label */}
                    <span className="text-[12px] font-bold text-white font-['Sora'] tracking-tight truncate max-w-full leading-tight drop-shadow-sm">
                      {unit.unit_label || "Room"}
                    </span>

                    {/* Dimensions & Floor */}
                    <span className="text-[9.5px] font-mono font-medium text-zinc-400 mt-0.5 leading-none">
                      {w.toFixed(1)}m × {d.toFixed(1)}m
                    </span>

                    {/* Tenant or Rent if space permits */}
                    {pxD > 75 && (
                      <div className="mt-1 flex flex-col items-center max-w-full">
                        {unit.tenant?.name ? (
                          <span className="text-[10px] font-semibold text-zinc-200 truncate max-w-[90%] bg-black/40 px-1.5 py-0.5 rounded leading-tight">
                            👤 {unit.tenant.name}
                          </span>
                        ) : (
                          <span className="text-[9.5px] font-semibold text-zinc-400">
                            {unit.monthly_rent ? `₱${Number(unit.monthly_rent).toLocaleString()}` : "Vacant"}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Maintenance Ticket Alert */}
                    {hasTicket && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                        <Wrench size={10} /> Needs Fix
                      </div>
                    )}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Empty State if no rooms exist on this floor ────────────── */}
      {floorUnits.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center z-10">
          <div className="pointer-events-auto max-w-sm rounded-2xl bg-zinc-900 border border-white/10 p-6 shadow-2xl">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-[#2270b8]/20 border border-[#2270b8]/30 flex items-center justify-center text-[#479de9] mb-3">
              <Box size={24} />
            </div>
            <h3 className="text-[16px] font-bold text-white font-['Sora']">
              {activeFloor !== "All" ? `No Rooms on Floor ${activeFloor}` : "No Rooms Added Yet"}
            </h3>
            <p className="text-[12px] text-zinc-400 mt-1.5 font-['Manrope']">
              Add rooms and configure your building layout in the layout designer.
            </p>
            {onEnterEditMode && (
              <button
                onClick={onEnterEditMode}
                className="mt-4 w-full py-2.5 px-4 rounded-xl bg-[#2270b8] hover:bg-[#3186d6] text-white text-[13px] font-bold font-['Manrope'] transition shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                Start Building Layout →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Floating Zoom / Pan Controls (Top-Right) ───────────────── */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-xl p-1 shadow-xl">
        <button
          onClick={() => handleZoom(0.2)}
          title="Zoom In"
          className="h-8 w-8 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition active:scale-90"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => handleZoom(-0.2)}
          title="Zoom Out"
          className="h-8 w-8 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition active:scale-90"
        >
          <ZoomOut size={16} />
        </button>
        <div className="h-4 w-px bg-white/15 mx-0.5" />
        <button
          onClick={handleResetView}
          title="Reset View"
          className="h-8 w-8 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition active:scale-90"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* ── Mode Info Badge (Bottom-Right) ─────────────────────────── */}
      <div className="absolute bottom-6 right-6 z-20 pointer-events-none hidden sm:flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 shadow-lg text-[11px] text-zinc-400 font-['Manrope']">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span>2D Architectural Blueprint · Touch/drag to pan</span>
      </div>
    </div>
  );
}
