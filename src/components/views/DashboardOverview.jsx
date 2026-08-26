"use client";
import { useMemo } from "react";
import { Plus, Home, AlertCircle, Building2, ArrowUp, ArrowDown, CheckCircle2, TrendingUp, Sparkles, Users, CalendarClock } from "lucide-react";

function StatCard({ label, value, subLabel, icon: Icon, iconColor, iconBg }) {
  return (
    <div className="rounded-[16px] bg-white p-5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] flex flex-col justify-between border border-zinc-100 relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.1em] font-['Manrope']">{label}</div>
        {Icon && (
          <div className={`rounded-full p-2 ${iconBg} ${iconColor} transition-transform group-hover:scale-110 duration-300`}>
            <Icon size={16} strokeWidth={2.5} />
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-[32px] font-[800] leading-none text-zinc-800 tracking-tight font-['Sora']">{value}</div>
        {subLabel && (
          <div className="mt-3 text-[12px] font-semibold font-['Manrope']">
            {subLabel}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardOverview({ buildings, units, onAddBuilding, onSelectProperty, onOpen3D }) {
  const stats = useMemo(() => {
    const totalUnits = units.length;
    const occupied = units.filter((u) => u.status === "occupied").length;
    
    let overdue = 0;
    let overdueAmount = 0;
    let vacant = 0;
    let expiringCount = 0;
    
    const today = new Date();
    
    units.forEach((u) => {
      if (u.status === "overdue") {
        overdue++;
        overdueAmount += Number(u.monthly_rent) || 0;
      }
      if (u.status === "vacant") {
        vacant++;
      }
      if (u.tenant?.lease_end) {
        const endDate = new Date(u.tenant.lease_end);
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 30) {
          expiringCount++;
        }
      }
    });

    const pct = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;
    const revenue = units
      .filter((u) => u.status === "occupied" || u.status === "overdue")
      .reduce((sum, u) => sum + (Number(u.monthly_rent) || 0), 0);
      
    return { totalUnits, occupied, overdue, overdueAmount, vacant, pct, revenue, expiringCount };
  }, [units]);

  const actionItems = useMemo(() => {
    const items = [];
    const today = new Date();
    
    units.forEach(u => {
      // Overdue
      if (u.status === 'overdue') {
        items.push({
          id: `overdue-${u.id}`,
          type: 'overdue',
          buildingId: u.buildingId,
          label: `${u.unit_label || u.label || 'Unit'} • ${u.tenant?.name || 'Unknown'} — ₱${u.monthly_rent || 0} Overdue`
        });
      }
      
      // Expiring
      if (u.tenant?.lease_end) {
        const endDate = new Date(u.tenant.lease_end);
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 30) {
          items.push({
            id: `expiring-${u.id}`,
            type: 'expiring',
            buildingId: u.buildingId,
            days: diffDays,
            label: `${u.unit_label || u.label || 'Unit'} • ${u.tenant?.name || 'Unknown'} — Ends in ${diffDays} days`
          });
        }
      }
      
      // Vacant
      if (u.status === 'vacant') {
        const b = buildings.find(b => b.id === u.buildingId);
        items.push({
          id: `vacant-${u.id}`,
          type: 'vacant',
          buildingId: u.buildingId,
          label: `${u.unit_label || u.label || 'Unit'} in ${b?.name || 'Building'} is vacant`
        });
      }
    });

    // Sort or prioritize: Overdue first, then Expiring, then Vacant
    const overdueItems = items.filter(i => i.type === 'overdue');
    const expiringItems = items.filter(i => i.type === 'expiring').sort((a,b) => a.days - b.days);
    const vacantItems = items.filter(i => i.type === 'vacant').slice(0, 2); // limit to top 2

    return [...overdueItems, ...expiringItems, ...vacantItems];
  }, [units, buildings]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafafa] font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-12 pt-14 pb-8 shrink-0">
        <h1 className="text-[42px] font-[800] text-[#0b3860] tracking-[-0.03em] font-['Sora']">Portfolio Overview</h1>
        <button
          onClick={onAddBuilding}
          className="flex items-center gap-2 rounded-full bg-[#0b3860] px-6 py-3 text-[13px] font-[600] tracking-wide text-white transition hover:bg-[#051b30] shadow-md hover:shadow-lg active:scale-95"
        >
          <Plus size={16} strokeWidth={3} />
          NEW BUILDING
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-12 pb-12 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-6">
          <StatCard 
            label="TOTAL PROPERTIES" 
            value={`${buildings.length} Buildings`}
            subLabel={
              <span className="text-zinc-500 font-medium">{stats.totalUnits} Total Units</span>
            }
            icon={Building2} 
            iconColor="text-[#0F4C81]" 
            iconBg="bg-[#e1ebf4]" 
          />
          <StatCard 
            label="ACTIVE TENANTS" 
            value={`${stats.occupied} / ${stats.totalUnits}`} 
            subLabel={
              <span className="text-zinc-500 font-medium">{stats.vacant} Vacant</span>
            }
            icon={Users} 
            iconColor="text-[#0F4C81]" 
            iconBg="bg-[#e1ebf4]" 
          />
          <StatCard 
            label="OVERDUE RENT" 
            value={`${stats.overdue} Alerts`} 
            subLabel={
              stats.overdue === 0 ? (
                <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full inline-block">All Paid 🟢</span>
              ) : (
                <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full inline-block">₱{stats.overdueAmount.toLocaleString()} Overdue 🔴</span>
              )
            }
            icon={AlertCircle} 
            iconColor={stats.overdue > 0 ? "text-rose-600" : "text-emerald-600"} 
            iconBg={stats.overdue > 0 ? "bg-rose-100" : "bg-emerald-100"} 
          />
          <StatCard 
            label="EXPIRING LEASES" 
            value={`${stats.expiringCount} ${stats.expiringCount === 1 ? 'Unit' : 'Units'}`} 
            subLabel={
              <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full inline-block">Next 30 Days 🟡</span>
            }
            icon={CalendarClock} 
            iconColor="text-amber-600" 
            iconBg="bg-amber-100" 
          />
        </div>

        {/* Content Panels */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left panel: My Properties (Property List) */}
          <div className="col-span-1 rounded-[16px] bg-white p-8 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] border border-zinc-100 flex flex-col">
            <h2 className="text-[17px] font-[600] text-[#0b3860] flex items-center gap-3 mb-8 tracking-[-0.01em] font-['Sora']">
              My Properties
            </h2>

            {buildings.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center mt-4">
                <div className="mb-4 rounded-2xl bg-white p-4 text-slate-400 shadow-sm">
                  <Building2 size={32} />
                </div>
                <p className="text-[15px] font-bold text-slate-700">No properties yet</p>
                <p className="mt-1 text-[13px] text-slate-500 font-medium">Click "New Building" to design your first property in 3D</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
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
                            <span className="flex items-center gap-1 text-[#0F4C81] bg-[#e1ebf4] px-2 py-0.5 rounded-full font-[500]">
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
            <div className="rounded-[16px] bg-white p-8 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] border border-zinc-100">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[11px] font-[600] text-[#0b3860] uppercase tracking-[0.1em] font-['Sora']">Est. Monthly Revenue</h2>
                <TrendingUp size={16} className="text-[#0F4C81]" />
              </div>
              <div className="text-[36px] font-[700] text-slate-800 tracking-tight font-['Sora'] mb-4">
                ₱{stats.revenue.toLocaleString()}
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>Rent Collection</span>
                  <span className="text-[#0F4C81]">₱{stats.revenue.toLocaleString()} / ₱{stats.revenue.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0F4C81] rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] bg-white p-8 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] border border-zinc-100 flex flex-col max-h-[380px]">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h2 className="text-[11px] font-[600] text-[#0b3860] uppercase tracking-[0.1em] font-['Sora']">Attention Needed</h2>
                <AlertCircle size={16} className="text-[#0F4C81]" />
              </div>
              
              <div className="overflow-y-auto pr-2 space-y-1">
                {actionItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="mb-3 rounded-full bg-emerald-50 p-3 text-emerald-500">
                      <Sparkles size={24} />
                    </div>
                    <p className="text-[13px] font-medium text-slate-600">✨ All Clear! No pending issues or overdue payments.</p>
                  </div>
                ) : (
                  actionItems.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => onSelectProperty(item.buildingId)}
                      className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-none cursor-pointer hover:bg-zinc-50/60 rounded-xl px-2 -mx-2 transition-colors"
                    >
                      <span className="text-[13px] font-medium text-slate-700 font-['Manrope'] pr-4 truncate">{item.label}</span>
                      {item.type === 'overdue' && (
                        <span className="shrink-0 bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider">OVERDUE</span>
                      )}
                      {item.type === 'expiring' && (
                        <span className="shrink-0 bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider">EXPIRING</span>
                      )}
                      {item.type === 'vacant' && (
                        <span className="shrink-0 bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider">VACANT</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
