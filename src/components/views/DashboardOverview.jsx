"use client";
import { useState, useMemo } from "react";

function StatCard({ label, value, sub, color = "text-zinc-900" }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="text-[12px] font-medium text-zinc-500 uppercase tracking-[0.05em]">{label}</div>
      <div className={`mt-2 text-[36px] font-semibold leading-none ${color}`}>{value}</div>
      {sub && <div className="mt-2 text-[12px] text-zinc-500">{sub}</div>}
    </div>
  );
}

export default function DashboardOverview({ buildings, units, onAddBuilding }) {
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [bName, setBName] = useState("");
  const [bAddress, setBAddress] = useState("");
  const [bFloors, setBFloors] = useState(3);
  const [bUnitsPerFloor, setBUnitsPerFloor] = useState(4);
  const [bFootprintType, setBFootprintType] = useState("rectangle");
  const [bAdvancedMode, setBAdvancedMode] = useState(false);

  const handleAddBuilding = async (e) => {
    e.preventDefault();
    await onAddBuilding({
      name: bName || "New Building",
      address: bAddress,
      floors: bAdvancedMode ? 1 : parseInt(bFloors),
      units_per_floor: bAdvancedMode ? 1 : parseInt(bUnitsPerFloor),
      advanced_build_mode: bAdvancedMode,
      footprint_type: bFootprintType,
    });
    setShowAddBuilding(false);
    setBName("");
    setBAddress("");
    setBFootprintType("rectangle");
    setBAdvancedMode(false);
  };

  const stats = useMemo(() => {
    const totalUnits = units.length;
    const occupied = units.filter((u) => u.status === "occupied").length;
    const overdue = units.filter((u) => u.status === "overdue").length;
    const vacant = units.filter((u) => u.status === "vacant").length;
    const pct = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;
    
    // Calculate total monthly revenue from occupied units
    const revenue = units
      .filter((u) => u.status === "occupied" || u.status === "overdue")
      .reduce((sum, u) => sum + (Number(u.monthly_rent) || 0), 0);

    return { totalUnits, occupied, overdue, vacant, pct, revenue };
  }, [units]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-50/50">
      <div className="border-b border-zinc-200 bg-white px-8 py-6 shadow-sm">
        <h1 className="text-[24px] font-semibold text-zinc-900 tracking-[-0.02em]">Dashboard</h1>
        <p className="mt-1 text-[14px] text-zinc-500">Portfolio overview across all properties</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="grid grid-cols-4 gap-6">
          <StatCard label="Total Properties" value={buildings.length} />
          <StatCard label="Total Units" value={stats.totalUnits} sub={`${stats.pct}% occupied`} color="text-[var(--color-verde-600)]" />
          <StatCard label="Vacant Units" value={stats.vacant} color="text-zinc-500" />
          <StatCard label="Overdue Renters" value={stats.overdue} color="text-red-500" />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-zinc-900">Est. Monthly Revenue</h2>
            <p className="mt-1 text-[13px] text-zinc-500">From all occupied units</p>
          </div>
          <div className="text-[32px] font-semibold text-[var(--color-verde-600)]">
            ₱{stats.revenue.toLocaleString()}
          </div>
        </div>

        <div className="border-t border-zinc-200 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[18px] font-semibold text-zinc-900">Manage Portfolio</h2>
            <button
              onClick={() => setShowAddBuilding((v) => !v)}
              className="rounded-xl bg-[var(--color-verde-600)] px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-[var(--color-verde-700)] shadow-sm"
            >
              + Add New Building
            </button>
          </div>

          {showAddBuilding && (
            <div className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] border border-zinc-100">
              <h3 className="mb-4 text-[16px] font-semibold tracking-[-0.02em]">Create Building Profile</h3>
              <form onSubmit={handleAddBuilding} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.08em] text-zinc-500">NAME</label>
                    <input
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none focus:border-[var(--color-verde-600)] focus:bg-white"
                      placeholder="e.g. North Tower"
                      value={bName}
                      onChange={(e) => setBName(e.target.value)}
                      required
                    />
                  </div>
                  
                  {!bAdvancedMode && (
                    <>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.08em] text-zinc-500">FLOORS</label>
                        <input
                          type="number" min="1" max="20"
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-[var(--color-verde-600)] focus:bg-white"
                          value={bFloors}
                          onChange={(e) => setBFloors(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.08em] text-zinc-500">UNITS / FLOOR</label>
                        <input
                          type="number" min="1" max="20"
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-[var(--color-verde-600)] focus:bg-white"
                          value={bUnitsPerFloor}
                          onChange={(e) => setBUnitsPerFloor(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-2 md:pt-6 pt-2">
                    <input 
                      type="checkbox"
                      id="advanced_mode"
                      className="h-4 w-4 rounded border-zinc-300 text-[var(--color-verde-600)] focus:ring-[var(--color-verde-500)]"
                      checked={bAdvancedMode}
                      onChange={(e) => setBAdvancedMode(e.target.checked)}
                    />
                    <label htmlFor="advanced_mode" className="text-[12px] font-semibold text-zinc-700 cursor-pointer select-none">
                      Advanced Build Mode (Build in 3D)
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="rounded-xl bg-[var(--color-verde-600)] px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-[var(--color-verde-700)] transition shadow-sm">
                    Create Building
                  </button>
                  <button type="button" onClick={() => setShowAddBuilding(false)} className="rounded-xl border border-zinc-200 bg-white px-6 py-2.5 text-[14px] font-semibold text-zinc-600 hover:bg-zinc-50 transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
