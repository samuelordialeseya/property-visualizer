"use client";
import { useMemo } from "react";
import { Plus, Home, AlertCircle, Building2, ArrowUp, ArrowDown, CheckCircle2, TrendingUp } from "lucide-react";

function StatCard({ label, value, icon: Icon, iconColor, iconBg }) {
  return (
    <div className="rounded-[20px] bg-[#fdfdfd] p-6 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.12)] flex flex-col justify-between border border-zinc-200/50">
      <div className="flex items-start justify-between">
        <div className="mt-2 text-[12px] font-medium text-slate-400 uppercase tracking-[0.1em]">{label}</div>
        {Icon && (
          <div className={`rounded-full p-2 ${iconBg} ${iconColor}`}>
            <Icon size={18} strokeWidth={2.5} />
          </div>
        )}
      </div>
      <div className="mt-6">
        <div className="text-[36px] font-[700] leading-none text-slate-800 tracking-tight font-['Sora']">{value}</div>
      </div>
    </div>
  );
}

export default function DashboardOverview({ buildings, units, onAddBuilding, onSelectProperty, onOpen3D }) {
  const stats = useMemo(() => {
    const totalUnits = units.length;
    const occupied = units.filter((u) => u.status === "occupied").length;
    const overdue = units.filter((u) => u.status === "overdue").length;
    const vacant = units.filter((u) => u.status === "vacant").length;
    const pct = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;
    const revenue = units
      .filter((u) => u.status === "occupied" || u.status === "overdue")
      .reduce((sum, u) => sum + (Number(u.monthly_rent) || 0), 0);
    return { totalUnits, occupied, overdue, vacant, pct, revenue };
  }, [units]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafafa] font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-10 py-8 shrink-0">
        <h1 className="text-[36px] font-[700] text-[#064e3b] tracking-[-0.03em] font-['Sora']">Portfolio Overview</h1>
        <button
          onClick={onAddBuilding}
          className="flex items-center gap-2 rounded-full bg-[#064e3b] px-6 py-3 text-[13px] font-[600] tracking-wide text-white transition hover:bg-[#022c22] shadow-md hover:shadow-lg active:scale-95"
        >
          <Plus size={16} strokeWidth={3} />
          NEW BUILDING
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-10 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-6">
          <StatCard 
            label="Total Revenue (₱)" 
            value={`₱${stats.revenue.toLocaleString()}`} 
            icon={TrendingUp} 
            iconColor="text-[#059669]" 
            iconBg="bg-[#d1fae5]" 
          />
          <StatCard 
            label="Occupancy Rate %" 
            value={`${stats.pct}%`} 
            icon={CheckCircle2} 
            iconColor="text-[#059669]" 
            iconBg="bg-[#d1fae5]" 
          />
          <StatCard 
            label="Overdue Renters" 
            value={`${stats.overdue} Alerts`} 
            icon={AlertCircle} 
            iconColor="text-red-600" 
            iconBg="bg-red-100" 
          />
          <StatCard 
            label="Leases Expiring Soon" 
            value="0" 
            icon={Building2} 
            iconColor="text-orange-600" 
            iconBg="bg-orange-100" 
          />
        </div>

        {/* Content Panels */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left panel: My Properties (Property List) */}
          <div className="col-span-2 rounded-[24px] bg-[#fdfdfd] p-8 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.12)] border border-zinc-200/50">
            <h2 className="text-[17px] font-[600] text-[#064e3b] flex items-center gap-3 mb-8 tracking-[-0.01em] font-['Sora']">
              My Properties
            </h2>

            {buildings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center mt-4">
                <div className="mb-4 rounded-2xl bg-white p-4 text-slate-400 shadow-sm">
                  <Building2 size={32} />
                </div>
                <p className="text-[15px] font-bold text-slate-700">No properties yet</p>
                <p className="mt-1 text-[13px] text-slate-500 font-medium">Click "New Building" to design your first property in 3D</p>
              </div>
            ) : (
              <div className="space-y-4">
                {buildings.map(b => {
                  const bUnits = units.filter(u => u.buildingId === b.id);
                  const occ = bUnits.filter(u => u.status === "occupied").length;
                  const bRev = bUnits
                    .filter((u) => u.status === "occupied" || u.status === "overdue")
                    .reduce((sum, u) => sum + (Number(u.monthly_rent) || 0), 0);
                    
                  return (
                    <div key={b.id} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-4">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-500 font-bold text-[18px]">
                          {b.name ? b.name.charAt(0).toUpperCase() : "B"}
                        </div>
                        <div>
                          <p className="text-[15px] font-[600] text-slate-800">{b.name || "Untitled Building"}</p>
                          <div className="mt-1 flex items-center gap-3 text-[12px] font-medium text-slate-500">
                            <span className="flex items-center gap-1 text-[#059669] bg-[#d1fae5] px-2 py-0.5 rounded-full font-[500]">
                              <CheckCircle2 size={12} strokeWidth={3} />
                              {occ}/{bUnits.length} Occupied
                            </span>
                            <span className="text-slate-600 font-[500]">₱{bRev.toLocaleString()} / mo</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onOpen3D(b.id)}
                          className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[12px] font-[600] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-sm"
                        >
                          3D View
                        </button>
                        <button 
                          onClick={() => onSelectProperty(b.id)}
                          className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[12px] font-[600] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-sm"
                        >
                          Units
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: Revenue and Breakdown */}
          <div className="col-span-1 space-y-6">
            <div className="rounded-[24px] bg-[#fdfdfd] p-8 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.12)] border border-zinc-200/50">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[11px] font-[600] text-[#064e3b] uppercase tracking-[0.1em] font-['Sora']">Est. Monthly Revenue</h2>
                <TrendingUp size={16} className="text-[#059669]" />
              </div>
              <div className="text-[36px] font-[700] text-slate-800 tracking-tight font-['Sora'] mb-4">
                ₱{stats.revenue.toLocaleString()}
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>Rent Collection</span>
                  <span className="text-[#059669]">₱{stats.revenue.toLocaleString()} / ₱{stats.revenue.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#059669] rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] bg-[#fdfdfd] p-8 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.12)] border border-zinc-200/50">
              <h2 className="text-[11px] font-[600] text-[#064e3b] uppercase tracking-[0.1em] mb-6 font-['Sora']">Occupancy Breakdown</h2>
              
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-[12px] font-bold text-slate-700 mb-2">
                    <span>1. Occupied</span>
                    <span>{stats.occupied} units</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-[#064e3b]" style={{ width: `${stats.totalUnits > 0 ? (stats.occupied / stats.totalUnits) * 100 : 0}%` }} />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-[12px] font-bold text-slate-700 mb-2">
                    <span>2. Vacant</span>
                    <span>{stats.vacant} units</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-[#34d399]" style={{ width: `${stats.totalUnits > 0 ? (stats.vacant / stats.totalUnits) * 100 : 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[12px] font-bold text-slate-700 mb-2">
                    <span>3. Overdue</span>
                    <span>{stats.overdue} units</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-red-400" style={{ width: `${stats.totalUnits > 0 ? (stats.overdue / stats.totalUnits) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
