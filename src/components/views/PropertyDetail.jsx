"use client";
import { useState, useMemo } from "react";
import { ArrowLeft, Box, Trash2, Wrench, Users, Building2, FileText } from "lucide-react";
import UnitPanel from "@/components/UnitPanel";
import StaffTab from "@/components/views/tabs/StaffTab";
import MaintenanceTab from "@/components/views/tabs/MaintenanceTab";
import PropertyOverviewTab from "@/components/views/tabs/PropertyOverviewTab";
import DocumentsTab from "@/components/views/tabs/DocumentsTab";
import { useMaintenanceTickets, useStaff, usePropertyDocuments } from "@/hooks/useFirestore";

const STATUS_STYLES = {
  vacant:   { pill: "bg-zinc-100 text-zinc-600",   dot: "bg-zinc-400",   label: "VACANT" },
  occupied: { pill: "bg-[var(--color-blue-50)] text-[var(--color-blue-700)]",   dot: "bg-[var(--color-blue-500)]",   label: "OCCUPIED" },
  overdue:  { pill: "bg-red-50 text-red-700",   dot: "bg-red-500",   label: "OVERDUE" },
};

const TABS = [
  { key: "overview",    label: "Overview",           icon: <Building2 size={14} /> },
  { key: "units",       label: "Units Directory",    icon: <Box size={14} /> },
  { key: "documents",   label: "Property Documents", icon: <FileText size={14} /> },
  { key: "maintenance", label: "Maintenance",        icon: <Wrench size={14} /> },
  { key: "staff",       label: "Staff & Payroll",    icon: <Users size={14} /> },
];

export default function PropertyDetail({ 
  building, 
  units, 
  buildings, 
  updateUnit, 
  updateBuilding, 
  onLaunch3D, 
  onDeleteProperty, 
  onBack, 
  userId 
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUnit, setSelectedUnit] = useState(null);

  const { tickets } = useMaintenanceTickets(building?.id);
  const { staff } = useStaff(userId, building?.id);
  const { documents } = usePropertyDocuments(building?.id);

  const openTicketCount = tickets.filter(t => t.status !== "settled").length;
  const staffCount = staff.length;
  const documentCount = documents.length;

  const activeUnit = useMemo(() => {
    if (!selectedUnit) return null;
    return units.find((u) => u.id === selectedUnit.id) || selectedUnit;
  }, [units, selectedUnit]);

  const filteredUnits = useMemo(() => {
    let list = [...(units || [])];
    if (statusFilter !== "all") list = list.filter((u) => u.status === statusFilter);
    return list.sort((a, b) => {
      if (a.position_index !== undefined && b.position_index !== undefined) {
        return a.position_index - b.position_index;
      }
      if (a.floor !== b.floor) {
        return (a.floor || 0) - (b.floor || 0);
      }
      return (a.unit_label || "").localeCompare(b.unit_label || "", undefined, { numeric: true });
    });
  }, [units, statusFilter]);

  const tabBadge = (key) => {
    if (key === "units" && units.length > 0) return units.length;
    if (key === "documents" && documentCount > 0) return documentCount;
    if (key === "maintenance" && openTicketCount > 0) return openTicketCount;
    if (key === "staff" && staffCount > 0) return staffCount;
    return null;
  };

  return (
    <div className="flex h-full w-full relative overflow-hidden bg-[#f4f4f5]">
      <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
        {/* Header Bar */}
        <div className="border-b border-zinc-200/80 bg-white px-4 sm:px-6 md:px-8 pt-3.5 sm:pt-4 pb-3 sm:pb-3.5 shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] shrink-0 relative">
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button 
                onClick={onBack}
                className="flex items-center gap-1 sm:gap-1.5 text-[12px] sm:text-[13px] font-semibold text-zinc-500 hover:text-zinc-900 transition font-['Manrope'] shrink-0"
              >
                <ArrowLeft size={16} />
                <span>Properties</span>
              </button>
              <span className="text-zinc-300 shrink-0">/</span>
              <span className="text-[13px] sm:text-[14px] font-[700] text-[#0b3860] font-['Sora'] truncate max-w-[150px] sm:max-w-xs md:max-w-sm">
                {building?.name || "Untitled Property"}
              </span>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onDeleteProperty}
                title="Delete Property"
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 sm:px-3.5 py-1.5 text-[12px] font-[700] text-red-700 transition hover:bg-red-100 shadow-sm font-['Manrope']"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Delete Property</span>
              </button>
              
              <button
                onClick={onLaunch3D}
                className="flex items-center gap-1.5 rounded-xl bg-[#0b3860] px-3 sm:px-4 py-1.5 text-[12px] font-[700] text-white transition hover:bg-[#051b30] shadow-sm font-['Manrope']"
              >
                <Box size={14} />
                <span>Launch 3D</span>
              </button>
            </div>
          </div>

          {/* Sub Navigation Pills (Matching Sidebar Aesthetic) */}
          <div className="flex items-center overflow-x-auto no-scrollbar -mx-1 px-1">
            <div className="inline-flex items-center gap-1 p-1 bg-[#f4f4f5] rounded-[14px] border border-zinc-200/70">
              {TABS.map(tab => {
                const badge = tabBadge(tab.key);
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-[11px] text-[12px] sm:text-[13px] transition-all duration-150 font-['Manrope'] whitespace-nowrap ${
                      active
                        ? "bg-white text-[#0b3860] font-[700] shadow-sm border border-zinc-200/80"
                        : "text-zinc-500 font-medium hover:text-zinc-900 hover:bg-zinc-200/50 border border-transparent"
                    }`}
                  >
                    <span className={`shrink-0 transition-colors ${active ? "text-[#0b3860]" : "text-zinc-400"}`}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                    {badge !== null && (
                      <span
                        className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                          active
                            ? "bg-[#0b3860] text-white shadow-xs"
                            : "bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div key="overview" className="flex-1 flex flex-col overflow-hidden animate-fade-in">
            <PropertyOverviewTab
              building={building}
              units={units}
              updateBuilding={updateBuilding}
              onNavigateTab={(tabKey) => setActiveTab(tabKey)}
              onLaunch3D={onLaunch3D}
              openTicketCount={openTicketCount}
              documentCount={documentCount}
            />
          </div>
        )}

        {activeTab === "documents" && (
          <div key="documents" className="flex-1 flex flex-col overflow-hidden animate-fade-in">
            <DocumentsTab building={building} />
          </div>
        )}

        {activeTab === "units" && (
          <div key="units" className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 animate-fade-in">
            <div className="rounded-2xl bg-white shadow-[var(--shadow-card)] border border-zinc-200/70 overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
                <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Units Directory</h2>
                <select
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[12px] font-medium text-zinc-600 outline-none focus:border-[var(--color-blue-600)] focus:bg-white cursor-pointer"
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
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                      <th className="px-6 py-3">UNIT</th>
                      <th className="px-6 py-3">STATUS</th>
                      <th className="px-6 py-3">TENANT</th>
                      <th className="px-6 py-3">RENT / MO</th>
                      <th className="px-6 py-3">LEASE END</th>
                      <th className="px-6 py-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredUnits.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-[14px] text-zinc-500 animate-scale-in">
                          No units found
                        </td>
                      </tr>
                    ) : (
                      filteredUnits.map((u, idx) => {
                        const s = STATUS_STYLES[u.status] || STATUS_STYLES.vacant;
                        const hasTenant = u.status !== "vacant" && !!u.tenant?.name;
                        return (
                          <tr
                            key={u.id}
                            onClick={() => setSelectedUnit(u)}
                            style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                            className={`cursor-pointer transition hover:bg-zinc-50 animate-fade-up ${selectedUnit?.id === u.id ? "bg-[var(--color-blue-50)]" : ""}`}
                          >
                            <td className="px-6 py-3 font-semibold text-zinc-900">
                              {u.unit_label || "—"}
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
                            <td className="px-6 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedUnit(u); }}
                                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-[600] text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition shadow-sm cursor-pointer"
                                >
                                  Edit
                                </button>
                                {hasTenant && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setSelectedUnit(u); }}
                                    className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-[600] text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition shadow-sm cursor-pointer"
                                  >
                                    Pay
                                  </button>
                                )}
                              </div>
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
        )}

        {activeTab === "maintenance" && (
          <div key="maintenance" className="flex-1 min-h-0 overflow-hidden animate-fade-in">
            <MaintenanceTab building={building} units={units} userId={userId} />
          </div>
        )}

        {activeTab === "staff" && (
          <div key="staff" className="flex-1 min-h-0 overflow-hidden animate-fade-in">
            <StaffTab building={building} buildings={buildings} userId={userId} />
          </div>
        )}
      </div>

      {/* Slide-in Unit Panel */}
      {activeUnit && (
        <UnitPanel 
          unit={activeUnit} 
          onClose={() => setSelectedUnit(null)} 
          isDrawerMode={true} 
          onNavigateToMaintenance={() => {
            setActiveTab("maintenance");
            setSelectedUnit(null);
          }}
        />
      )}
    </div>
  );
}
