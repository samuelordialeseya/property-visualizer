"use client";

import { useState, useRef } from "react";
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Eye, 
  EyeOff, 
  Layers, 
  Coins, 
  Edit3, 
  Box, 
  FileText, 
  Wrench, 
  Camera, 
  Upload, 
  Check, 
  X, 
  ArrowUpRight 
} from "lucide-react";
import { uploadFile } from "@/hooks/useFirestore";

export default function PropertyOverviewTab({
  building,
  units = [],
  updateBuilding,
  onNavigateTab,
  onLaunch3D,
  openTicketCount = 0,
  documentCount = 0,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Form state for Edit Modal
  const [formData, setFormData] = useState({
    name: building?.name || "",
    address: building?.address || "",
    property_value: building?.property_value ?? "",
    property_value_hidden: !!building?.property_value_hidden,
    purchase_date: building?.purchase_date || "",
    property_type: building?.property_type || "Residential",
    lot_area: building?.lot_area || "",
    description: building?.description || "",
    photo_url: building?.photo_url || "",
  });

  const [modalPhotoFile, setModalPhotoFile] = useState(null);
  const [modalPhotoPreview, setModalPhotoPreview] = useState(null);

  // Quick stats calculations
  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === "occupied").length;
  const vacantUnits = units.filter((u) => u.status === "vacant").length;
  const overdueUnits = units.filter((u) => u.status === "overdue").length;
  const occupancyPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const totalMonthlyRent = units.reduce((sum, u) => sum + (Number(u.monthly_rent) || 0), 0);

  // Extract acquisition year safely without UTC timezone shift
  const getDisplayYear = (dateStr) => {
    if (!dateStr) return "";
    if (typeof dateStr === "string" && dateStr.includes("-")) {
      return dateStr.split("-")[0];
    }
    const d = new Date(dateStr);
    return isNaN(d.getFullYear()) ? dateStr : d.getFullYear();
  };

  // Format acquisition date safely without timezone day shifts
  const formatPurchaseDate = (dateStr) => {
    if (!dateStr) return "Not recorded";
    try {
      if (typeof dateStr === "string" && dateStr.includes("-")) {
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const monthIndex = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const date = new Date(year, monthIndex, day);
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }
      }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Toggle property value hide/reveal
  const handleToggleHideValue = async (e) => {
    e?.stopPropagation();
    const newHidden = !building?.property_value_hidden;
    try {
      await updateBuilding({ property_value_hidden: newHidden });
    } catch (err) {
      console.error("Failed to toggle value visibility:", err);
    }
  };

  // Quick photo upload directly from banner
  const handleQuickPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !building?.id) return;
    try {
      setUploadingPhoto(true);
      const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, "_") : "photo";
      const url = await uploadFile(`buildings/${building.id}/cover_${Date.now()}_${safeName}`, file);
      if (url) {
        await updateBuilding({ photo_url: url });
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleOpenEditModal = () => {
    setFormData({
      name: building?.name || "",
      address: building?.address || "",
      property_value: building?.property_value ?? "",
      property_value_hidden: !!building?.property_value_hidden,
      purchase_date: building?.purchase_date || "",
      property_type: building?.property_type || "Residential",
      lot_area: building?.lot_area || "",
      description: building?.description || "",
      photo_url: building?.photo_url || "",
    });
    setModalPhotoFile(null);
    setModalPhotoPreview(null);
    setIsEditing(true);
  };

  const handleModalPhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setModalPhotoFile(file);
      setModalPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let photo_url = formData.photo_url;
      if (modalPhotoFile && building?.id) {
        const safeName = modalPhotoFile.name ? modalPhotoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_") : "photo";
        photo_url = await uploadFile(`buildings/${building.id}/cover_${Date.now()}_${safeName}`, modalPhotoFile);
      }

      await updateBuilding({
        name: String(formData.name || "").trim(),
        address: String(formData.address || "").trim(),
        property_value: formData.property_value !== "" ? Number(formData.property_value) : null,
        property_value_hidden: Boolean(formData.property_value_hidden),
        purchase_date: formData.purchase_date || null,
        property_type: formData.property_type || "Residential",
        lot_area: String(formData.lot_area || "").trim() || null,
        description: String(formData.description || "").trim() || null,
        photo_url: photo_url || null,
      });

      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update building details:", err);
      alert("Failed to save changes. Please check permissions and try again.");
    } finally {
      setSaving(false);
    }
  };

  // Cover image fallback
  const displayPhoto = building?.photo_url || "/images/default-property.jpg";

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
      {/* Hidden file input for fast photo change */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleQuickPhotoUpload}
      />

      {/* 1. HERO BANNER: Property Name on Left, Faded Photo on Right */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-zinc-200/80 shadow-[var(--shadow-card)] min-h-[240px] md:min-h-[290px] flex flex-col md:flex-row items-stretch justify-between animate-fade-down">
        
        {/* Left Side: Property Identity & Quick Actions */}
        <div className="flex-1 p-5 sm:p-7 md:p-9 z-10 flex flex-col justify-between max-w-2xl">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-[700] uppercase tracking-wider bg-[#e1ebf4] text-[#0b3860] font-['Manrope']">
                <Building2 size={12} />
                {building?.property_type || "Residential"}
              </span>

              {building?.lot_area && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-[600] bg-zinc-100 text-zinc-600 font-['Manrope']">
                  <Layers size={12} />
                  {building.lot_area}
                </span>
              )}

              {building?.purchase_date && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-[600] bg-zinc-100 text-zinc-600 font-['Manrope']">
                  <Calendar size={12} />
                  Acquired {getDisplayYear(building.purchase_date)}
                </span>
              )}
            </div>

            <h1 className="text-[26px] sm:text-[30px] md:text-[38px] font-[800] text-[#0b3860] tracking-[-0.03em] font-['Sora'] leading-tight">
              {building?.name || "Untitled Property"}
            </h1>

            <div className="flex items-center gap-1.5 mt-2.5 text-zinc-500 text-[14px] font-medium font-['Manrope']">
              <MapPin size={16} className="text-[#0F4C81] shrink-0" />
              <span>{building?.address || "No address specified yet"}</span>
            </div>

            {building?.description && (
              <p className="mt-3 text-[13.5px] text-zinc-600 leading-relaxed line-clamp-2 max-w-xl font-['Manrope']">
                {building.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-6 pt-2">
            <button
              onClick={handleOpenEditModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b3860] px-4 py-2 text-[13px] font-[700] text-white transition hover:bg-[#051b30] shadow-sm font-['Manrope'] cursor-pointer"
            >
              <Edit3 size={15} />
              Edit Property Details
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/90 backdrop-blur-sm px-4 py-2 text-[13px] font-[700] text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900 shadow-sm font-['Manrope'] cursor-pointer"
            >
              <Camera size={15} className="text-[#0F4C81]" />
              {uploadingPhoto ? "Uploading…" : building?.photo_url ? "Change Photo" : "Upload Photo"}
            </button>

            {onLaunch3D && (
              <button
                onClick={onLaunch3D}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white/90 backdrop-blur-sm px-3.5 py-2 text-[13px] font-[600] text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 shadow-sm font-['Manrope'] cursor-pointer"
              >
                <Box size={15} className="text-zinc-500" />
                3D View
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Faded Picture of the Property */}
        <div className="relative md:w-[48%] min-h-[180px] md:min-h-full overflow-hidden shrink-0 group">
          {/* Real or default property photo */}
          <img
            src={displayPhoto}
            alt={building?.name || "Property Photo"}
            className="w-full h-full object-cover object-center transform transition duration-700 group-hover:scale-105"
            style={{
              maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 15%, rgba(0,0,0,0.85) 60%, black 100%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 15%, rgba(0,0,0,0.85) 60%, black 100%)",
            }}
          />

          {/* Smooth left gradient overlay to guarantee seamless blend with card */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-white via-white/40 md:via-transparent to-transparent" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-white/60 md:from-transparent to-transparent" />

          {/* Quick upload camera chip on hover */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1.5 text-[11px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/80 font-['Manrope'] cursor-pointer"
          >
            <Camera size={13} />
            {building?.photo_url ? "Update Photo" : "Add Property Photo"}
          </button>
        </div>
      </div>

      {/* 2. KEY METRIC CARDS (Valuation with eye toggle, Purchase Date, Footprint, Rent Roll) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Property Valuation (with hide/reveal toggle) */}
        <div className="rounded-2xl bg-white p-5 border border-zinc-200/80 shadow-[var(--shadow-card)] relative flex flex-col justify-between animate-fade-up delay-50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[700] uppercase tracking-wider text-zinc-400 font-['Manrope']">
              Estimated Value
            </span>
            <button
              onClick={handleToggleHideValue}
              title={building?.property_value_hidden ? "Show property value" : "Hide property value"}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-[#0b3860] hover:bg-zinc-100 transition cursor-pointer"
            >
              {building?.property_value_hidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="my-2">
            {building?.property_value_hidden ? (
              <div className="text-[24px] font-[800] text-zinc-400 tracking-wider font-['Sora'] select-none">
                ₱ ••••••••••
              </div>
            ) : building?.property_value ? (
              <div className="text-[24px] font-[800] text-[#0b3860] tracking-tight font-['Sora']">
                ₱{Number(building.property_value).toLocaleString()}
              </div>
            ) : (
              <button
                onClick={handleOpenEditModal}
                className="text-[14px] font-[600] text-[#0F4C81] hover:underline font-['Manrope'] cursor-pointer"
              >
                + Set Property Value
              </button>
            )}
          </div>

          <p className="text-[12px] text-zinc-400 font-['Manrope']">
            {building?.property_value_hidden ? "Hidden from casual view" : "Market / purchase valuation"}
          </p>
        </div>

        {/* Card 2: Acquisition / Purchase Date */}
        <div className="rounded-2xl bg-white p-5 border border-zinc-200/80 shadow-[var(--shadow-card)] relative flex flex-col justify-between animate-fade-up delay-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[700] uppercase tracking-wider text-zinc-400 font-['Manrope']">
              Purchase Date
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 text-zinc-500">
              <Calendar size={16} />
            </div>
          </div>

          <div className="my-2">
            <div className="text-[20px] font-[800] text-zinc-800 tracking-tight font-['Sora']">
              {formatPurchaseDate(building?.purchase_date)}
            </div>
          </div>

          <p className="text-[12px] text-zinc-400 font-['Manrope']">
            {building?.purchase_date ? "Acquisition record" : "Record when acquired"}
          </p>
        </div>

        {/* Card 3: Footprint / Lot Area & Type */}
        <div className="rounded-2xl bg-white p-5 border border-zinc-200/80 shadow-[var(--shadow-card)] relative flex flex-col justify-between animate-fade-up delay-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[700] uppercase tracking-wider text-zinc-400 font-['Manrope']">
              Footprint & Type
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 text-zinc-500">
              <Layers size={16} />
            </div>
          </div>

          <div className="my-2">
            <div className="text-[20px] font-[800] text-zinc-800 tracking-tight font-['Sora']">
              {building?.lot_area || "Area not set"}
            </div>
          </div>

          <p className="text-[12px] text-zinc-400 font-['Manrope']">
            {building?.property_type || "Residential"}
          </p>
        </div>

        {/* Card 4: Monthly Rent Roll & Occupancy */}
        <div className="rounded-2xl bg-white p-5 border border-zinc-200/80 shadow-[var(--shadow-card)] relative flex flex-col justify-between animate-fade-up delay-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[700] uppercase tracking-wider text-zinc-400 font-['Manrope']">
              Monthly Rent Roll
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e1ebf4] text-[#0F4C81]">
              <Coins size={16} />
            </div>
          </div>

          <div className="my-2">
            <div className="text-[22px] font-[800] text-[#0b3860] tracking-tight font-['Sora']">
              ₱{totalMonthlyRent.toLocaleString()}
            </div>
          </div>

          <p className="text-[12px] text-zinc-400 font-['Manrope']">
            {occupiedUnits} of {totalUnits} Units Occupied ({occupancyPct}%)
          </p>
        </div>

      </div>

      {/* 3. LOWER SECTION: Property Description + Quick Tab Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up delay-200">
        
        {/* Description & Historical Notes */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 md:p-7 border border-zinc-200/80 shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-[700] text-[#0b3860] font-['Sora']">Property Overview & Notes</h2>
              <button
                onClick={handleOpenEditModal}
                className="text-[12px] font-[700] text-[#0F4C81] hover:underline flex items-center gap-1 font-['Manrope'] cursor-pointer"
              >
                <Edit3 size={13} />
                Edit Notes
              </button>
            </div>

            <p className="text-[14px] text-zinc-600 leading-relaxed whitespace-pre-line font-['Manrope']">
              {building?.description || (
                <span className="text-zinc-400 italic">
                  No property description or historical notes added yet. Click &quot;Edit Details&quot; to add notes about land title status, zoning details, amenities, or contact instructions.
                </span>
              )}
            </p>
          </div>

          {/* Mini units status snapshot bar */}
          <div className="mt-6 pt-5 border-t border-zinc-100">
            <div className="flex items-center justify-between text-[12px] font-[700] mb-2 font-['Manrope']">
              <span className="text-zinc-500">Unit Distribution ({totalUnits} total)</span>
              <span className="text-[#0b3860]">{occupancyPct}% Occupancy</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-100 flex overflow-hidden">
              {totalUnits > 0 ? (
                <>
                  <div style={{ width: `${(occupiedUnits / totalUnits) * 100}%` }} className="bg-[#2270b8]" title={`Occupied: ${occupiedUnits}`} />
                  <div style={{ width: `${(overdueUnits / totalUnits) * 100}%` }} className="bg-red-500" title={`Overdue: ${overdueUnits}`} />
                  <div style={{ width: `${(vacantUnits / totalUnits) * 100}%` }} className="bg-zinc-300" title={`Vacant: ${vacantUnits}`} />
                </>
              ) : (
                <div className="w-full bg-zinc-200" />
              )}
            </div>
            <div className="flex items-center gap-4 mt-2.5 text-[11px] font-semibold text-zinc-500 font-['Manrope']">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#2270b8]" /> {occupiedUnits} Occupied</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> {overdueUnits} Overdue</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-zinc-300" /> {vacantUnits} Vacant</span>
            </div>
          </div>
        </div>

        {/* Quick Navigation Hub */}
        <div className="space-y-3 flex flex-col">
          
          {/* Shortcut to Units Directory */}
          <div
            onClick={() => onNavigateTab?.("units")}
            className="flex-1 rounded-2xl bg-white p-4 border border-zinc-200/80 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-[#0b3860]/40 transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e1ebf4] text-[#0F4C81] group-hover:scale-105 transition">
                <Box size={18} />
              </div>
              <div>
                <h3 className="text-[14px] font-[700] text-zinc-900 group-hover:text-[#0b3860] transition font-['Sora']">
                  Units Directory
                </h3>
                <p className="text-[12px] text-zinc-400 font-medium font-['Manrope']">
                  {totalUnits} units · Rent & leases
                </p>
              </div>
            </div>
            <ArrowUpRight size={18} className="text-zinc-400 group-hover:text-[#0b3860] transition" />
          </div>

          {/* Shortcut to Documents Tab */}
          <div
            onClick={() => onNavigateTab?.("documents")}
            className="flex-1 rounded-2xl bg-white p-4 border border-zinc-200/80 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-[#0b3860]/40 transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700 group-hover:scale-105 transition">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="text-[14px] font-[700] text-zinc-900 group-hover:text-[#0b3860] transition font-['Sora']">
                  Property Documents
                </h3>
                <p className="text-[12px] text-zinc-400 font-medium font-['Manrope']">
                  {documentCount} records · Title & utilities
                </p>
              </div>
            </div>
            <ArrowUpRight size={18} className="text-zinc-400 group-hover:text-[#0b3860] transition" />
          </div>

          {/* Shortcut to Maintenance Tab */}
          <div
            onClick={() => onNavigateTab?.("maintenance")}
            className="flex-1 rounded-2xl bg-white p-4 border border-zinc-200/80 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-[#0b3860]/40 transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700 group-hover:scale-105 transition">
                <Wrench size={18} />
              </div>
              <div>
                <h3 className="text-[14px] font-[700] text-zinc-900 group-hover:text-[#0b3860] transition font-['Sora']">
                  Maintenance
                </h3>
                <p className="text-[12px] text-zinc-400 font-medium font-['Manrope']">
                  {openTicketCount} active tickets
                </p>
              </div>
            </div>
            <ArrowUpRight size={18} className="text-zinc-400 group-hover:text-[#0b3860] transition" />
          </div>

        </div>

      </div>

      {/* 4. EDIT PROPERTY DETAILS MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <h2 className="text-[18px] font-[700] text-[#0b3860] font-['Sora']">Edit Property Profile</h2>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 overflow-y-auto space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 mb-1 font-['Manrope']">
                  Property Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-[14px] outline-none focus:border-[#0b3860] focus:ring-1 focus:ring-[#0b3860]"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 mb-1 font-['Manrope']">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. 36-38 Malakas St, Diliman, Quezon City"
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-[14px] outline-none focus:border-[#0b3860] focus:ring-1 focus:ring-[#0b3860]"
                />
              </div>

              {/* Property Value + Hide Toggle */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 mb-1 font-['Manrope']">
                    Property Value (₱)
                  </label>
                  <input
                    type="number"
                    value={formData.property_value}
                    onChange={(e) => setFormData({ ...formData, property_value: e.target.value })}
                    placeholder="e.g. 25000000"
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-[14px] outline-none focus:border-[#0b3860] focus:ring-1 focus:ring-[#0b3860]"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.property_value_hidden}
                      onChange={(e) => setFormData({ ...formData, property_value_hidden: e.target.checked })}
                      className="h-4 w-4 rounded border-zinc-300 text-[#0b3860] focus:ring-[#0b3860]"
                    />
                    <span className="text-[13px] font-[600] text-zinc-700 font-['Manrope']">
                      Hide value by default (👁)
                    </span>
                  </label>
                </div>
              </div>

              {/* Purchase Date & Property Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 mb-1 font-['Manrope']">
                    Purchase / Acquisition Date
                  </label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-[14px] outline-none focus:border-[#0b3860] focus:ring-1 focus:ring-[#0b3860]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 mb-1 font-['Manrope']">
                    Property Type
                  </label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-[14px] outline-none focus:border-[#0b3860] focus:ring-1 focus:ring-[#0b3860]"
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Mixed-Use">Mixed-Use</option>
                    <option value="Apartment Building">Apartment Building</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Land / Lot">Land / Lot</option>
                  </select>
                </div>
              </div>

              {/* Lot Area */}
              <div>
                <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 mb-1 font-['Manrope']">
                  Lot / Floor Area
                </label>
                <input
                  type="text"
                  value={formData.lot_area}
                  onChange={(e) => setFormData({ ...formData, lot_area: e.target.value })}
                  placeholder="e.g. 180 sqm, 3-Storey"
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-[14px] outline-none focus:border-[#0b3860] focus:ring-1 focus:ring-[#0b3860]"
                />
              </div>

              {/* Photo Upload in Modal */}
              <div>
                <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 mb-1 font-['Manrope']">
                  Cover Photo
                </label>
                <div className="flex items-center gap-4">
                  {(modalPhotoPreview || formData.photo_url) && (
                    <div className="h-16 w-24 rounded-xl overflow-hidden border border-zinc-200 shrink-0 bg-zinc-100">
                      <img
                        src={modalPhotoPreview || formData.photo_url}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-zinc-300 hover:border-[#0b3860] text-[13px] font-[600] text-zinc-600 cursor-pointer transition">
                    <Upload size={15} />
                    <span>{modalPhotoFile ? modalPhotoFile.name : "Select photo file"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleModalPhotoSelect}
                    />
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 mb-1 font-['Manrope']">
                  Description & Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Notes about land title, ownership history, zoning, key contacts..."
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-[14px] outline-none focus:border-[#0b3860] focus:ring-1 focus:ring-[#0b3860]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl px-4 py-2 text-[13px] font-[600] text-zinc-600 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0b3860] px-5 py-2 text-[13px] font-[700] text-white hover:bg-[#051b30] transition shadow-sm disabled:opacity-50"
                >
                  <Check size={16} />
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
