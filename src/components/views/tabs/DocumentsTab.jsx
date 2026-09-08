"use client";

import { useState, useMemo } from "react";
import { 
  FileText, 
  Plus, 
  Search, 
  Upload, 
  FolderLock, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Eye, 
  X, 
  Check, 
  Calendar, 
  Tag, 
  File, 
  Sparkles,
  Download,
  AlertCircle,
  Folder,
  Droplets,
  Zap,
  Landmark,
  Building2,
  Shield,
  FileCheck
} from "lucide-react";
import { 
  usePropertyDocuments, 
  addPropertyDocument, 
  updatePropertyDocument, 
  deletePropertyDocument,
  uploadFile 
} from "@/hooks/useFirestore";

// Predefined categories with custom styles and clean icons
const CATEGORIES = [
  { id: "all", label: "All Documents", icon: Folder },
  { id: "title", label: "Title & Ownership", icon: FileCheck, badge: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "water", label: "Manila Water / Water", icon: Droplets, badge: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { id: "electricity", label: "Meralco / Electricity", icon: Zap, badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "loan", label: "Bank Loan & Mortgage", icon: Landmark, badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "government", label: "Govt & Permits", icon: Building2, badge: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "insurance", label: "Insurance", icon: Shield, badge: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "other", label: "Other / General", icon: FileText, badge: "bg-zinc-100 text-zinc-700 border-zinc-200" },
];

// Quick-fill chips for physical storage locations
const LOCATION_CHIPS = [
  "Safe",
  "Master Closet",
  "Filing Cabinet",
  "Office Drawer",
  "Safety Deposit Box",
  "Blue Folder - Desk"
];

const isPdfUrl = (url) => typeof url === "string" && url.toLowerCase().includes(".pdf");

export default function DocumentsTab({ building }) {
  const { documents, loading } = usePropertyDocuments(building?.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);

  // Form state for Add/Edit
  const [formState, setFormState] = useState({
    title: "",
    category: "title",
    physical_location: "",
    description: "",
    issue_date: "",
    expiry_date: "",
    file_url: "",
    thumbnail_url: "",
  });

  const [documentFile, setDocumentFile] = useState(null);
  const [documentFilePreview, setDocumentFilePreview] = useState(null);
  const [isPdf, setIsPdf] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = 
        !searchQuery ||
        doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.physical_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === "all" || doc.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [documents, searchQuery, selectedCategory]);

  const handleOpenAddModal = () => {
    setEditingDocId(null);
    setFormState({
      title: "",
      category: "title",
      physical_location: "",
      description: "",
      issue_date: "",
      expiry_date: "",
      file_url: "",
      thumbnail_url: "",
    });
    setDocumentFile(null);
    setDocumentFilePreview(null);
    setIsPdf(false);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (doc, e) => {
    e?.stopPropagation();
    setEditingDocId(doc.id);
    setFormState({
      title: doc.title || "",
      category: doc.category || "title",
      physical_location: doc.physical_location || "",
      description: doc.description || "",
      issue_date: doc.issue_date || "",
      expiry_date: doc.expiry_date || "",
      file_url: doc.file_url || "",
      thumbnail_url: doc.thumbnail_url || "",
    });
    setDocumentFile(null);
    setDocumentFilePreview(doc.thumbnail_url || (isPdfUrl(doc.file_url) ? null : doc.file_url));
    setIsPdf(isPdfUrl(doc.file_url));
    setIsViewModalOpen(false);
    setIsAddModalOpen(true);
  };

  const handleOpenViewModal = (doc) => {
    setActiveDoc(doc);
    setIsViewModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocumentFile(file);
    const isFilePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    setIsPdf(isFilePdf);

    if (file.type.startsWith("image/")) {
      setDocumentFilePreview(URL.createObjectURL(file));
    } else {
      setDocumentFilePreview(null);
    }
  };

  const handleSaveDocument = async (e) => {
    e.preventDefault();
    if (!building?.id) return;

    setSaving(true);
    try {
      let file_url = formState.file_url;
      let thumbnail_url = formState.thumbnail_url;

      if (documentFile) {
        const safeName = documentFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const path = `documents/${building.id}/${Date.now()}_${safeName}`;
        file_url = await uploadFile(path, documentFile);

        if (documentFile.type.startsWith("image/")) {
          thumbnail_url = file_url;
        }
      }

      const docPayload = {
        title: formState.title.trim(),
        category: formState.category,
        physical_location: formState.physical_location.trim(),
        description: formState.description.trim(),
        issue_date: formState.issue_date || null,
        expiry_date: formState.expiry_date || null,
        file_url: file_url || null,
        thumbnail_url: thumbnail_url || null,
      };

      if (editingDocId) {
        await updatePropertyDocument(building.id, editingDocId, docPayload);
        if (activeDoc?.id === editingDocId) {
          setActiveDoc({ id: editingDocId, ...activeDoc, ...docPayload });
        }
      } else {
        await addPropertyDocument(building.id, docPayload);
      }

      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Save document error:", err);
      alert("Failed to save document. Please check connection and permissions.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (docId, e) => {
    e?.stopPropagation();
    if (!confirm("Are you sure you want to delete this document record?")) return;

    try {
      await deletePropertyDocument(building.id, docId);
      if (activeDoc?.id === docId) {
        setIsViewModalOpen(false);
        setActiveDoc(null);
      }
    } catch (err) {
      console.error("Delete document error:", err);
      alert("Failed to delete document.");
    }
  };

  const getCategoryInfo = (catId) => {
    return CATEGORIES.find((c) => c.id === catId) || CATEGORIES[CATEGORIES.length - 1];
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-[800] text-[#0b3860] font-['Sora'] tracking-tight">
            Property Documents
          </h2>
          <p className="text-[13px] text-zinc-400 font-medium font-['Manrope'] mt-0.5">
            Store photos, scans, and physical storage locations for Land Titles, Water, Meralco, and Loans
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0b3860] px-4 py-2.5 text-[13px] font-[700] text-white hover:bg-[#051b30] transition shadow-sm font-['Manrope']"
          >
            <Plus size={16} />
            Add Document
          </button>
        </div>
      </div>

      {/* 2. Filter Pills & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Category horizontal scroll pills */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-[700] whitespace-nowrap shrink-0 transition font-['Manrope'] cursor-pointer ${
                  active
                    ? "bg-[#0b3860] text-white shadow-sm"
                    : "bg-white text-zinc-600 border border-zinc-200/80 hover:bg-zinc-50"
                }`}
              >
                <Icon size={13} className={active ? "text-white" : "text-zinc-500"} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search docs or locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3.5 py-1.5 text-[13px] outline-none focus:border-[#0b3860] font-['Manrope'] shadow-xs"
          />
        </div>
      </div>

      {/* 3. Documents Grid or Empty State */}
      {loading ? (
        <div className="flex h-60 items-center justify-center rounded-2xl bg-white border border-zinc-200/70">
          <p className="text-[14px] text-zinc-400 font-['Manrope'] font-medium">Loading property documents…</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#e1ebf4] text-[#0b3860] mb-4 shadow-sm">
            <FolderLock size={30} />
          </div>
          <h3 className="text-[17px] font-[700] text-zinc-900 font-['Sora']">
            {searchQuery || selectedCategory !== "all" ? "No matching documents found" : "No documents recorded yet"}
          </h3>
          <p className="mt-1 text-[13.5px] text-zinc-500 max-w-md font-['Manrope']">
            {searchQuery || selectedCategory !== "all"
              ? "Try adjusting your search or category filter."
              : "Keep all your property deeds, Manila Water contracts, Meralco electricity permits, bank mortgages, and physical storage locations organized in one place."}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0b3860] px-5 py-2.5 text-[13px] font-[700] text-white hover:bg-[#051b30] transition shadow-sm font-['Manrope']"
          >
            <Plus size={16} />
            Add First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredDocuments.map((doc) => {
            const cat = getCategoryInfo(doc.category);
            const isImage = doc.thumbnail_url || (doc.file_url && !isPdfUrl(doc.file_url));

            return (
              <div
                key={doc.id}
                onClick={() => handleOpenViewModal(doc)}
                className="group rounded-2xl bg-white border border-zinc-200/80 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-[#0b3860]/40 transition-all duration-200 cursor-pointer flex flex-col overflow-hidden"
              >
                {/* Visual Thumbnail Area */}
                <div className="relative h-40 bg-zinc-100 overflow-hidden flex items-center justify-center border-b border-zinc-100">
                  {isImage ? (
                    <img
                      src={doc.thumbnail_url || doc.file_url}
                      alt={doc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : isPdfUrl(doc.file_url) ? (
                    <div className="flex flex-col items-center justify-center text-red-600 gap-1">
                      <File size={36} />
                      <span className="text-[11px] font-[700] uppercase tracking-wider font-['Manrope']">PDF Document</span>
                    </div>
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-zinc-200/60 text-zinc-400 group-hover:scale-110 transition duration-300">
                      {(() => {
                        const Icon = cat.icon;
                        return <Icon size={28} />;
                      })()}
                    </div>
                  )}

                  {/* Category Pill Tag Overlay */}
                  <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-[700] border backdrop-blur-md bg-white/90 font-['Manrope'] ${cat.badge || "text-zinc-700"}`}>
                      {(() => {
                        const Icon = cat.icon;
                        return <Icon size={11} className="shrink-0" />;
                      })()}
                      <span>{cat.label}</span>
                    </span>
                  </div>

                  {/* View quick action button */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80">
                      <Eye size={14} />
                    </span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-[15px] font-[700] text-zinc-900 group-hover:text-[#0b3860] transition font-['Sora'] line-clamp-1">
                      {doc.title}
                    </h4>

                    {doc.description && (
                      <p className="mt-1 text-[12px] text-zinc-500 font-['Manrope'] line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                  </div>

                  {/* Physical Location Badge — PROMINENT FEATURE */}
                  <div className="pt-2 border-t border-zinc-100">
                    <div className="text-[10px] font-[700] uppercase tracking-wider text-zinc-400 font-['Manrope'] mb-1">
                      Physical Copy
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/80 text-[12px] font-[700] font-['Manrope'] max-w-full">
                      <FolderLock size={13} className="shrink-0 text-amber-700" />
                      <span className="truncate">{doc.physical_location || "Location not recorded"}</span>
                    </div>
                  </div>

                  {/* Card Footer: Dates & Quick Action buttons */}
                  <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-400 font-medium font-['Manrope']">
                    <span>
                      {doc.issue_date ? `Issued: ${doc.issue_date}` : "Recorded"}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleOpenEditModal(doc, e)}
                        title="Edit Document"
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        title="Delete Document"
                        className="p-1 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. VIEW DOCUMENT MODAL */}
      {isViewModalOpen && activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-100 text-[#0b3860] shrink-0">
                  {(() => {
                    const Icon = getCategoryInfo(activeDoc.category).icon;
                    return <Icon size={18} />;
                  })()}
                </div>
                <div>
                  <h3 className="text-[17px] font-[700] text-[#0b3860] font-['Sora']">{activeDoc.title}</h3>
                  <span className="text-[12px] text-zinc-400 font-['Manrope'] font-medium">
                    {getCategoryInfo(activeDoc.category).label}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Highlighted Physical Location Banner */}
              <div className="rounded-xl bg-amber-50/90 border border-amber-200 p-4 flex items-start gap-3.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800 shrink-0">
                  <FolderLock size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] font-[700] uppercase tracking-wider text-amber-800 font-['Manrope']">
                    Physical Storage Location
                  </div>
                  <div className="text-[16px] font-[800] text-amber-950 font-['Sora'] mt-0.5">
                    {activeDoc.physical_location || "No physical location recorded"}
                  </div>
                  <p className="text-[12px] text-amber-800/80 font-['Manrope'] mt-0.5">
                    Use this to locate the original paper document when needed.
                  </p>
                </div>
              </div>

              {/* Document Image / File View */}
              {activeDoc.file_url && (
                <div className="rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50 flex flex-col items-center justify-center p-3">
                  {isPdfUrl(activeDoc.file_url) ? (
                    <div className="py-8 flex flex-col items-center gap-3">
                      <File size={48} className="text-red-600" />
                      <span className="text-[14px] font-[700] text-zinc-800 font-['Sora']">PDF Document File</span>
                      <a
                        href={activeDoc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0b3860] px-4 py-2 text-[13px] font-[700] text-white hover:bg-[#051b30] transition shadow-sm font-['Manrope']"
                      >
                        <ExternalLink size={14} />
                        Open / Download PDF
                      </a>
                    </div>
                  ) : (
                    <div className="relative group max-h-[380px] overflow-hidden rounded-lg">
                      <img
                        src={activeDoc.thumbnail_url || activeDoc.file_url}
                        alt={activeDoc.title}
                        className="max-h-[380px] w-auto object-contain rounded-lg shadow-sm"
                      />
                      <a
                        href={activeDoc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-black font-['Manrope']"
                      >
                        <ExternalLink size={13} />
                        View Full Size
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Description & Notes */}
              {activeDoc.description && (
                <div>
                  <h4 className="text-[12px] font-[700] uppercase tracking-wider text-zinc-400 font-['Manrope'] mb-1">
                    Notes &amp; Details
                  </h4>
                  <p className="text-[14px] text-zinc-700 leading-relaxed font-['Manrope'] whitespace-pre-line bg-zinc-50 p-3.5 rounded-xl border border-zinc-100">
                    {activeDoc.description}
                  </p>
                </div>
              )}

              {/* Dates & Metadata */}
              <div className="grid grid-cols-2 gap-4 text-[13px] font-['Manrope']">
                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                  <span className="text-[11px] font-[700] uppercase text-zinc-400 block mb-0.5">Issue Date</span>
                  <span className="font-[600] text-zinc-800">{activeDoc.issue_date || "Not recorded"}</span>
                </div>
                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                  <span className="text-[11px] font-[700] uppercase text-zinc-400 block mb-0.5">Expiry / Renewal</span>
                  <span className="font-[600] text-zinc-800">{activeDoc.expiry_date || "None"}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
              <button
                onClick={(e) => handleDeleteDocument(activeDoc.id, e)}
                className="inline-flex items-center gap-1.5 text-[13px] font-[700] text-red-600 hover:text-red-700 font-['Manrope']"
              >
                <Trash2 size={15} />
                Delete Record
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleOpenEditModal(activeDoc)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[13px] font-[700] text-zinc-700 hover:bg-zinc-50 transition font-['Manrope']"
                >
                  <Edit3 size={15} />
                  Edit Details
                </button>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="rounded-xl bg-zinc-900 px-5 py-2 text-[13px] font-[700] text-white hover:bg-zinc-800 transition font-['Manrope']"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADD / EDIT DOCUMENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <h3 className="text-[18px] font-[700] text-[#0b3860] font-['Sora']">
                {editingDocId ? "Edit Document Record" : "Add Property Document"}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="p-6 overflow-y-auto space-y-4">
              {/* Document Title */}
              <div>
                <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 mb-1 font-['Manrope']">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Land Title TCT #12345, Manila Water Contract, Meralco Deposit"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-[14px] outline-none focus:border-[#0b3860] focus:ring-1 focus:ring-[#0b3860]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 mb-1 font-['Manrope']">
                  Category *
                </label>
                <select
                  value={formState.category}
                  onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-[14px] outline-none focus:border-[#0b3860] focus:ring-1 focus:ring-[#0b3860]"
                >
                  <option value="title">Title &amp; Ownership (TCT, CCT, Tax Dec)</option>
                  <option value="water">Manila Water / Water Utility</option>
                  <option value="electricity">Meralco / Electricity Service</option>
                  <option value="loan">Bank Loan &amp; Mortgage Papers</option>
                  <option value="government">Government &amp; Building Permits</option>
                  <option value="insurance">Property &amp; Fire Insurance</option>
                  <option value="other">Other / General Documents</option>
                </select>
              </div>

              {/* Physical Storage Location with Quick Chips */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 font-['Manrope']">
                    Where is the Physical Copy Kept? *
                  </label>
                  <span className="text-[11px] text-zinc-400 font-medium font-['Manrope']">e.g. Safe, Closet</span>
                </div>

                {/* Quick Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {LOCATION_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setFormState({ ...formState, physical_location: chip })}
                      className={`text-[11.5px] font-[600] px-2.5 py-1 rounded-lg border transition font-['Manrope'] ${
                        formState.physical_location === chip
                          ? "bg-amber-100 text-amber-900 border-amber-300 font-[700]"
                          : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                      }`}
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  required
                  placeholder="e.g. Safe box (master bedroom), Closet top shelf, Blue drawer"
                  value={formState.physical_location}
                  onChange={(e) => setFormState({ ...formState, physical_location: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-[14px] outline-none focus:border-[#0b3860] focus:ring-1 focus:ring-[#0b3860]"
                />
              </div>

              {/* Photo / Document File Upload */}
              <div>
                <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 mb-1 font-['Manrope']">
                  Upload Photo or PDF Document
                </label>
                <div className="flex items-center gap-4">
                  {documentFilePreview ? (
                    <div className="h-16 w-20 rounded-xl overflow-hidden border border-zinc-200 shrink-0 bg-zinc-100">
                      <img src={documentFilePreview} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  ) : isPdf ? (
                    <div className="h-16 w-20 rounded-xl border border-zinc-200 shrink-0 bg-red-50 flex items-center justify-center text-red-600">
                      <File size={24} />
                    </div>
                  ) : null}

                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-zinc-300 hover:border-[#0b3860] text-[13px] font-[600] text-zinc-600 cursor-pointer transition bg-zinc-50/50">
                    <Upload size={16} />
                    <span>
                      {documentFile ? documentFile.name : formState.file_url ? "Replace existing file" : "Upload document photo or PDF"}
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 mb-1 font-['Manrope']">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={formState.issue_date}
                    onChange={(e) => setFormState({ ...formState, issue_date: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-[14px] outline-none focus:border-[#0b3860]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 mb-1 font-['Manrope']">
                    Expiry / Renewal Date
                  </label>
                  <input
                    type="date"
                    value={formState.expiry_date}
                    onChange={(e) => setFormState({ ...formState, expiry_date: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-[14px] outline-none focus:border-[#0b3860]"
                  />
                </div>
              </div>

              {/* Description / Account Notes */}
              <div>
                <label className="block text-[12px] font-[700] uppercase tracking-wider text-zinc-600 mb-1 font-['Manrope']">
                  Notes &amp; Account Details
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Account CAN #001234, Bank Loan account number, reference notes..."
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-[14px] outline-none focus:border-[#0b3860]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-[13px] font-[600] text-zinc-600 hover:bg-zinc-100 transition font-['Manrope']"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0b3860] px-5 py-2 text-[13px] font-[700] text-white hover:bg-[#051b30] transition shadow-sm disabled:opacity-50 font-['Manrope']"
                >
                  <Check size={16} />
                  {saving ? "Saving…" : editingDocId ? "Save Changes" : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
