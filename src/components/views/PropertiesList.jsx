"use client";

import { Building2, MapPin } from "lucide-react";

export default function PropertiesList({ buildings = [], units = [], onSelectProperty }) {
  
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
    <div className="flex h-full flex-col overflow-hidden bg-[#f4f4f5] font-sans">
      <div className="flex items-center justify-between px-12 pt-12 pb-6 shrink-0">
        <div>
          <h1 className="text-[36px] font-[800] text-[#0b3860] tracking-[-0.03em] font-['Sora']">Properties</h1>
          <p className="text-[14px] text-zinc-400 mt-1 font-['Manrope'] font-medium">Select a property to manage units or view in 3D</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-12 pb-12">
        {buildings.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white">
            <div className="text-center text-zinc-500">
              <Building2 size={32} className="mx-auto mb-3 text-zinc-400" />
              <p className="font-bold text-[15px] font-['Manrope']">No properties yet</p>
              <p className="text-[13px] font-medium mt-1">Add one from the Dashboard.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buildings.map((b) => {
              const stats = getBuildingStats(b.id);
              return (
                  <div 
                    key={b.id} 
                    className="group rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] border border-zinc-200/70 transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 cursor-pointer flex flex-col relative overflow-hidden"
                    onClick={() => onSelectProperty(b.id)}
                  >
                  
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h2 className="text-[17px] font-[700] text-zinc-900 group-hover:text-[#2270b8] transition-colors font-['Sora']">{b.name}</h2>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-zinc-400 font-medium font-['Manrope']">
                        {b.address ? (
                          <>
                            <MapPin size={14} />
                            {b.address}
                          </>
                        ) : (
                          <span className="text-[#0F4C81]">+ Add Address</span>
                        )}
                      </div>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e1ebf4] text-[#0F4C81] shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-300">
                      <Building2 size={20} />
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4">
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-['Manrope']">Total</div>
                      <div className="text-[16px] font-[700] text-zinc-800 font-['Sora']">{stats.total}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-['Manrope']">Occupied</div>
                      <div className="text-[16px] font-[700] text-[#0F4C81] font-['Sora']">{stats.occupied}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 font-['Manrope']">Vacant</div>
                      <div className="text-[16px] font-[700] text-zinc-500 font-['Sora']">{stats.vacant}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-end text-[12px] font-[700] text-[#0F4C81] opacity-0 group-hover:opacity-100 transition-opacity font-['Manrope']">
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
