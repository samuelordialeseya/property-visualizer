"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBuildings, useAllUnits } from "@/hooks/useFirestore";

import Login from "@/components/Login";
import Sidebar from "@/components/Sidebar";

import DashboardOverview from "@/components/views/DashboardOverview";
import PropertiesList from "@/components/views/PropertiesList";
import PropertyDetail from "@/components/views/PropertyDetail";
import Visualizer3D from "@/components/Visualizer3D";
import UnitPanel from "@/components/UnitPanel";

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth();
  const { buildings, addBuilding, updateBuilding, deleteBuilding } = useBuildings();
  const { units, updateUnit, addUnit, deleteUnit } = useAllUnits();

  const [activeView, setActiveView] = useState("dashboard");
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [selectedUnit3D, setSelectedUnit3D] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSetActiveView = (view) => {
    setActiveView(view);
    // Auto-collapse sidebar when entering 3D view, re-expand when leaving
    if (view === "3d_view") setSidebarCollapsed(true);
    else setSidebarCollapsed(false);
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-100 font-sans text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!user) return <Login />;

  const handleSelectProperty = (id) => {
    setSelectedBuildingId(id);
    handleSetActiveView("property_detail");
  };

  const handleCreateBuilding = async (buildingData) => {
    const newId = await addBuilding(buildingData);
    if (buildingData.advanced_build_mode) {
      setSelectedBuildingId(newId);
      setActiveView("3d_view");
    }
  };

  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);
  const buildingUnits = units.filter((u) => u.buildingId === selectedBuildingId);

  return (
    <main className="flex h-screen overflow-hidden bg-zinc-100 font-sans">
      <Sidebar
        activeView={activeView}
        setActiveView={handleSetActiveView}
        onLogout={logout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {activeView === "dashboard" && (
          <DashboardOverview buildings={buildings} units={units} onAddBuilding={handleCreateBuilding} />
        )}
        
        {activeView === "properties" && (
          <PropertiesList 
            buildings={buildings} 
            units={units} 
            onSelectProperty={handleSelectProperty} 
          />
        )}

        {activeView === "property_detail" && selectedBuilding && (
          <PropertyDetail
            building={selectedBuilding}
            units={buildingUnits}
            updateUnit={updateUnit}
            onLaunch3D={() => handleSetActiveView("3d_view")}
            onDeleteProperty={async () => {
              if (confirm(`Are you sure you want to delete ${selectedBuilding.name}? This will permanently delete all units, tenants, and payment records.`)) {
                await deleteBuilding(selectedBuilding.id);
                handleSetActiveView("properties");
              }
            }}
            onBack={() => handleSetActiveView("properties")}
          />
        )}

        {activeView === "3d_view" && selectedBuilding && (
          <div className="h-full w-full relative">
            <Visualizer3D
              building={selectedBuilding}
              units={buildingUnits}
              selectedUnitId={selectedUnit3D?.id}
              onSelectUnit={(unit) => setSelectedUnit3D(unit)}
              onSaveLayout={async (editorRooms, deletedRoomIds) => {
                // 1. Process deletions
                for (const dId of deletedRoomIds) {
                  const toDel = buildingUnits.find(u => u.id === dId);
                  if (toDel && toDel.ref) {
                    await deleteUnit(toDel.ref);
                  }
                }

                // 2. Process updates and additions
                for (const room of editorRooms) {
                  const unitData = {
                    unit_label: room.unit_label,
                    floor: room.floor,
                    status: room.status,
                    monthly_rent: room.monthly_rent,
                    x: room.x,
                    z: room.z,
                    width: room.width,
                    depth: room.depth,
                    height: room.height,
                    rotation: room.rotation || 0,
                    tenant: room.tenant,
                    buildingId: selectedBuilding.id
                  };

                  if (room.id.startsWith("new-temp-")) {
                    await addUnit(selectedBuilding.id, unitData);
                  } else {
                    const existingRef = buildingUnits.find(u => u.id === room.id)?.ref;
                    if (existingRef) {
                      await updateUnit(existingRef, unitData);
                    }
                  }
                }
              }}
              onBack={() => {
                handleSetActiveView("property_detail");
                setSelectedUnit3D(null);
              }}
            />
            {selectedUnit3D && (
              <UnitPanel unit={selectedUnit3D} onClose={() => setSelectedUnit3D(null)} />
            )}
          </div>
        )}

        {activeView === "settings" && (
          <div className="flex h-full items-center justify-center text-zinc-500">
            Settings Page (Coming Soon)
          </div>
        )}
      </div>
    </main>
  );
}
