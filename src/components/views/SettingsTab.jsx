"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile, updateUserProfile, deleteUserData } from "@/hooks/useFirestore";
import { User, Download, Save, LogOut, Trash2, AlertTriangle, Eye, EyeOff, X, Loader2 } from "lucide-react";

export default function SettingsTab({ user, buildings = [], units = [] }) {
  const { logout, deleteAccount } = useAuth();
  const { profile, loading } = useUserProfile(user?.uid);
  
  const [managerName, setManagerName] = useState("");
  const [currency, setCurrency] = useState("PHP");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Delete Account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleteWithData, setDeleteWithData] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      setDeleteError("Please enter your current password to confirm.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError("");
    try {
      // 1. Delete Firestore user profile & owned properties if selected
      await deleteUserData(user?.uid, deleteWithData);

      // 2. Re-authenticate & delete user from Firebase Auth
      await deleteAccount(deletePassword);
      // Auth state change will redirect to Login automatically
    } catch (err) {
      console.error("Delete account error:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setDeleteError("Incorrect password. Please verify your credentials and try again.");
      } else if (err.code === "auth/too-many-requests") {
        setDeleteError("Too many attempts. Please wait a moment and try again.");
      } else {
        setDeleteError(err.message || "Failed to delete account. Please try again.");
      }
      setDeleteLoading(false);
    }
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
    <div className="h-full overflow-y-auto bg-[#f4f4f5] p-8">
      <div className="max-w-3xl mx-auto space-y-6 pt-4">
        
        {/* Header */}
        <div className="mb-8 animate-fade-down">
          <h1 className="text-[36px] font-[800] text-[#0b3860] tracking-[-0.03em] font-['Sora']">Settings</h1>
          <p className="text-[14px] text-zinc-400 mt-1 font-['Manrope'] font-medium">Manage your account profile and application preferences</p>
        </div>

        {/* Account Profile Card */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-zinc-200/70 overflow-hidden animate-fade-up delay-50">
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
                  className="w-full max-w-[260px] rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] font-medium outline-none focus:border-[#2270b8] focus:bg-white transition"
                >
                  <option value="PHP">PHP (₱) — Philippine Peso</option>
                  <option value="USD">USD ($) — US Dollar</option>
                </select>
                <p className="text-[11px] text-zinc-400 mt-2">Currently visual only. Converts display formats.</p>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center gap-3">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-[#0b3860] hover:bg-[#154e83] text-white px-5 py-2.5 rounded-xl text-[13px] font-bold transition shadow-sm cursor-pointer disabled:opacity-50">
                  <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
                </button>
                {saved && <span className="text-[12px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full animate-fade-in">Saved successfully!</span>}
              </div>
            </form>
          </div>
        </div>

        {/* Data Management Card */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-zinc-200/70 overflow-hidden animate-fade-up delay-100">
          <div className="px-6 py-4 border-b border-zinc-100 bg-white">
            <h2 className="text-[14px] font-bold text-zinc-800 font-['Sora']">Data Management</h2>
          </div>
          <div className="p-6">
            <p className="text-[13px] text-zinc-500 mb-4">Export your tenant list, rent logs, staff ledgers, and property layouts into a secure spreadsheet format for backup or external accounting.</p>
            <button onClick={handleExportData}
              className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-4 py-2.5 rounded-xl text-[13px] font-bold transition shadow-xs cursor-pointer active:scale-95">
              <Download size={14} /> Export CSV Data
            </button>
          </div>
        </div>

        {/* Account Actions Card */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-zinc-200/70 overflow-hidden animate-fade-up delay-150">
          <div className="px-6 py-4 border-b border-zinc-100 bg-white">
            <h2 className="text-[14px] font-bold text-zinc-800 font-['Sora']">Account Actions</h2>
          </div>

          <div className="divide-y divide-zinc-100">
            {/* Log Out */}
            <div className="p-6 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[14px] font-bold text-zinc-900 font-['Sora'] mb-0.5">Log Out</h3>
                <p className="text-[12px] text-zinc-500 font-['Manrope']">Securely sign out of your current session on this device.</p>
              </div>
              <button 
                type="button"
                onClick={logout}
                className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-5 py-2.5 rounded-xl text-[13px] font-bold transition shadow-xs cursor-pointer shrink-0 active:scale-95"
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>

            {/* Delete Account */}
            <div className="p-6 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[14px] font-bold text-zinc-900 font-['Sora'] mb-0.5">Delete Account</h3>
                <p className="text-[12px] text-zinc-500 font-['Manrope']">
                  Permanently delete your account, login credentials, and all associated property data.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setDeleteError("");
                  setDeletePassword("");
                  setShowDeleteModal(true);
                }}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 px-5 py-2.5 rounded-xl text-[13px] font-bold transition shadow-xs cursor-pointer shrink-0 active:scale-95"
              >
                <Trash2 size={14} /> Delete Account
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-zinc-900 font-['Sora']">Delete Account</h3>
                  <p className="text-[11px] font-medium text-zinc-400 font-['Manrope']">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => !deleteLoading && setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-200/50 hover:text-zinc-600 transition disabled:opacity-50 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleDeleteAccount} className="p-6 space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-[12px] text-zinc-600 leading-relaxed">
                You are about to permanently delete <strong>{user?.email}</strong>. All account settings, preferences, and session data will be permanently wiped.
              </div>

              {/* Delete properties checkbox */}
              <label className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 cursor-pointer hover:bg-zinc-100/70 transition">
                <input
                  type="checkbox"
                  checked={deleteWithData}
                  onChange={(e) => setDeleteWithData(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <div className="text-[12px]">
                  <span className="font-bold text-zinc-800 block">Delete all owned properties and units</span>
                  <span className="text-zinc-500 font-medium">Also permanently remove all buildings, units, tenant history, and staff records created by this account.</span>
                </div>
              </label>

              {/* Password field */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5 font-['Manrope']">
                  Confirm your password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      if (deleteError) setDeleteError("");
                    }}
                    placeholder="Enter current password"
                    required
                    disabled={deleteLoading}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 pr-10 text-[13px] font-medium outline-none transition focus:border-red-500 focus:bg-white disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Required to verify account ownership before deletion.</p>
              </div>

              {deleteError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12px] font-semibold text-red-700 animate-in fade-in duration-200">
                  <AlertTriangle size={15} className="shrink-0 text-red-600" />
                  <span>{deleteError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-[13px] font-bold text-zinc-700 hover:bg-zinc-100 transition disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading || !deletePassword.trim()}
                  className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] px-5 py-2 text-[13px] font-bold text-white shadow-sm transition disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Deleting Account...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      Permanently Delete
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
