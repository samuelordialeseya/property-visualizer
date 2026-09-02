"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile, updateUserProfile } from "@/hooks/useFirestore";
import { User, Download, Save, LogOut } from "lucide-react";

export default function SettingsTab({ user, buildings = [], units = [] }) {
  const { logout } = useAuth();
  const { profile, loading } = useUserProfile(user?.uid);
  
  const [managerName, setManagerName] = useState("");
  const [currency, setCurrency] = useState("PHP");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setManagerName(profile.manager_name || "");
      setCurrency(profile.default_currency || "PHP");
    }
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await updateUserProfile(user.uid, {
      manager_name: managerName.trim(),
      default_currency: currency,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleExportData = () => {
    if (!buildings || !units) return;

    const headers = [
      "Property Name", "Property Address", "Unit Name", "Floor", 
      "Status", "Monthly Rent", "Tenant Name", "Tenant Phone", 
      "Lease Start", "Lease End"
    ];

    const rows = [headers.join(",")];

    buildings.forEach(building => {
      const buildingUnits = units.filter(u => u.buildingId === building.id);
      
      if (buildingUnits.length === 0) {
        rows.push(`"${building.name}","${building.address || ''}","No Units","","","","","","",""`);
      } else {
        buildingUnits.forEach(unit => {
          const row = [
            `"${building.name}"`,
            `"${building.address || ''}"`,
            `"${unit.unit_label || ''}"`,
            `"${unit.floor || ''}"`,
            `"${unit.status || 'vacant'}"`,
            `"${unit.monthly_rent || 0}"`,
            `"${unit.tenant?.name || ''}"`,
            `"${unit.tenant?.contact || ''}"`,
            `"${unit.tenant?.lease_start || ''}"`,
            `"${unit.tenant?.lease_end || ''}"`
          ];
          rows.push(row.join(","));
        });
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(rows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `Property_Data_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 text-[14px]">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-zinc-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6 pt-4">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[36px] font-[800] text-[#0b3860] tracking-[-0.03em] font-['Sora']">Settings</h1>
          <p className="text-[14px] text-zinc-400 mt-1 font-['Manrope'] font-medium">Manage your account profile and application preferences</p>
        </div>

        {/* Account Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 bg-white">
            <h2 className="text-[14px] font-bold text-zinc-800 font-['Sora']">Account Profile</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-[#0b3860] rounded-full flex items-center justify-center text-white text-[20px] font-bold font-['Sora'] shadow-sm">
                {(managerName || user?.email || "?")[0].toUpperCase()}
              </div>
              <div>
                <div className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">Email Address</div>
                <div className="text-[15px] font-semibold text-zinc-900">{user?.email}</div>
              </div>
            </div>

            <form onSubmit={handleSave} className="pt-2">
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input 
                  value={managerName} 
                  onChange={e => setManagerName(e.target.value)} 
                  placeholder="e.g. Juan dela Cruz / Skyline Properties LLC"
                  className="w-full max-w-md rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] font-medium outline-none focus:border-[#2270b8] focus:bg-white transition" 
                />
              </div>

              <div className="mb-6">
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Default Currency
                </label>
                <select 
                  value={currency} 
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full max-w-[200px] rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] font-medium outline-none focus:border-[#2270b8] focus:bg-white transition"
                >
                  <option value="PHP">₱ Philippine Peso (PHP)</option>
                  <option value="USD">$ US Dollar (USD)</option>
                </select>
                <p className="text-[11px] text-zinc-400 mt-2">Currently visual only. Converts display formats.</p>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center gap-3">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-[#0b3860] hover:bg-[#154e83] text-white px-5 py-2.5 rounded-xl text-[13px] font-bold transition shadow-sm cursor-pointer disabled:opacity-50">
                  <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
                </button>
                {saved && <span className="text-[12px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">Saved successfully!</span>}
              </div>
            </form>
          </div>
        </div>

        {/* Data Management Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 bg-white">
            <h2 className="text-[14px] font-bold text-zinc-800 font-['Sora']">Data Management</h2>
          </div>
          <div className="p-6">
            <p className="text-[13px] text-zinc-500 mb-4">Export your tenant list, rent logs, staff ledgers, and property layouts into a secure spreadsheet format for backup or external accounting.</p>
            <button onClick={handleExportData}
              className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-4 py-2.5 rounded-xl text-[13px] font-bold transition shadow-xs cursor-pointer">
              <Download size={14} /> Export CSV Data
            </button>
          </div>
        </div>

        {/* Actions Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-bold text-red-600 font-['Sora'] mb-1">Log Out</h2>
              <p className="text-[12px] text-zinc-500">Securely sign out of your account on this device.</p>
            </div>
            <button onClick={logout}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2.5 rounded-xl text-[13px] font-bold transition shadow-xs cursor-pointer">
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
