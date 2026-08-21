"use client";

import { Building2, MapPin } from "lucide-react";

export default function PropertiesList({ buildings, units, onSelectProperty }) {
  
  const getBuildingStats = (buildingId) => {
    const bUnits = units.filter(u => u.buildingId === buildingId);
    const occupied = bUnits.filter(u => u.status === "occupied").length;
    const overdue = bUnits.filter(u => u.status === "overdue").length;
    const vacant = bUnits.filter(u => u.status === "vacant").length;
    
    return {
      total: bUnits.length,
      occupied,
      overdue,
      vacant
    };
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-50/50">
      <div className="border-b border-zinc-200 bg-white px-8 py-6 shadow-sm">
        <h1 className="text-[24px] font-semibold text-zinc-900 tracking-[-0.02em]">Properties</h1>
        <p className="mt-1 text-[14px] text-zinc-500">Select a property to manage units or view in 3D</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {buildings.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white">
            <div className="text-center text-zinc-500">
              <Building2 size={32} className="mx-auto mb-3 text-zinc-400" />
              <p>No properties yet. Add one from the Dashboard.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buildings.map((b) => {
              const stats = getBuildingStats(b.id);
              return (
                  <div 
                    key={b.id} 
                    className="group rounded-[24px] bg-[#fdfdfd] p-6 shadow-sm border border-zinc-200/60 transition-all duration-300 hover:border-[#059669]/30 hover:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.12)] hover:-translate-y-1 cursor-pointer flex flex-col relative"
                    onClick={() => onSelectProperty(b.id)}
                  >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-[18px] font-semibold text-zinc-900 group-hover:text-[var(--color-verde-600)] transition-colors">{b.name}</h2>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[13px] text-zinc-500">
                        {b.address ? (
                          <>
                            <MapPin size={14} />
                            {b.address}
                          </>
                        ) : (
                          <span className="text-[#059669] font-medium">+ Add Address</span>
                        )}
                      </div>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-verde-50)] text-[var(--color-verde-600)]">
                      <Building2 size={20} />
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4">
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Total</div>
                      <div className="text-[15px] font-medium text-zinc-700">{stats.total}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Occupied</div>
                      <div className="text-[15px] font-medium text-[var(--color-verde-600)]">{stats.occupied}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Vacant</div>
                      <div className="text-[15px] font-medium text-zinc-500">{stats.vacant}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-end text-[13px] font-[600] text-[#059669] opacity-0 group-hover:opacity-100 transition-opacity">
                    Open Property &rarr;
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
