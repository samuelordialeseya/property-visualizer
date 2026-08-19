"use client";
import { useState, useMemo } from "react";
import { ArrowLeft, Box, Trash2 } from "lucide-react";
import UnitPanel from "@/components/UnitPanel";

const STATUS_STYLES = {
  vacant:   { pill: "bg-zinc-100 text-zinc-600",   dot: "bg-zinc-400",   label: "VACANT" },
  occupied: { pill: "bg-[var(--color-verde-50)] text-[var(--color-verde-700)]",   dot: "bg-[var(--color-verde-500)]",   label: "OCCUPIED" },
  overdue:  { pill: "bg-red-50 text-red-700",   dot: "bg-red-500",   label: "OVERDUE" },
};

export default function PropertyDetail({ building, units, updateUnit, onLaunch3D, onDeleteProperty, onBack }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUnit, setSelectedUnit] = useState(null);

  const filteredUnits = useMemo(() => {
    let list = units;
    if (statusFilter !== "all") list = list.filter((u) => u.status === statusFilter);
    return list.sort((a, b) => a.position_index - b.position_index);
  }, [units, statusFilter]);

  return (
    <div className="flex h-full w-full relative overflow-hidden bg-zinc-50/50">
      <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
        {/* Header */}
        <div className="border-b border-zinc-200 bg-white px-8 py-5 shadow-sm shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <button 
              onClick={onBack}
              className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition"
            >
              <ArrowLeft size={16} />
              Back to Properties
            </button>
          </div>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[24px] font-semibold text-zinc-900 tracking-[-0.02em]">{building.name}</h1>
              <p className="mt-1 text-[14px] text-zinc-500">{building.address || "No address provided"}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onDeleteProperty}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-[14px] font-semibold text-red-700 transition hover:bg-red-100 shadow-sm"
              >
                <Trash2 size={18} />
                Delete Property
              </button>
              
              <button
                onClick={onLaunch3D}
                className="flex items-center gap-2 rounded-xl bg-[var(--color-verde-600)] px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[var(--color-verde-700)] shadow-sm"
              >
                <Box size={18} />
                Launch 3D View
              </button>
            </div>
          </div>
        </div>

        {/* Units Table Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="rounded-2xl bg-white shadow-[var(--shadow-card)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Units Directory</h2>
              <select
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[12px] font-medium text-zinc-600 outline-none focus:border-[var(--color-verde-600)] focus:bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    <th className="px-6 py-3">UNIT</th>
                    <th className="px-6 py-3">STATUS</th>
                    <th className="px-6 py-3">TENANT</th>
                    <th className="px-6 py-3">RENT / MO</th>
                    <th className="px-6 py-3">LEASE END</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-[14px] text-zinc-500">
                        No units found
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((u) => {
                      const s = STATUS_STYLES[u.status] || STATUS_STYLES.vacant;
                      return (
                        <tr
                          key={u.id}
                          onClick={() => setSelectedUnit(u)}
                          className={`cursor-pointer transition hover:bg-zinc-50 ${selectedUnit?.id === u.id ? 'bg-[var(--color-verde-50)]' : ''}`}
                        >
                          <td className="px-6 py-3 font-semibold text-zinc-900">
                            Unit {u.unit_label}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${s.pill}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                              {s.label}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-zinc-600">
                            {u.tenant?.name || <span className="text-zinc-400">—</span>}
                          </td>
                          <td className="px-6 py-3 font-semibold text-zinc-900">
                            ₱{(u.monthly_rent || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-3 text-zinc-600">
                            {u.tenant?.lease_end || <span className="text-zinc-400">—</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-in Unit Panel */}
      {selectedUnit && (
        <UnitPanel unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
      )}
    </div>
  );
}
