"use client";
import { useState, useEffect } from "react";
import {
  Users, Plus, ChevronRight, X, Check, Trash2,
  Receipt, ArrowDownCircle, ClipboardList, Banknote, User, Edit2, Wrench,
  Save, Building2, ArrowLeft
} from "lucide-react";
import {
  useStaff, useStaffErrands,
  addStaffDoc, deleteStaffDoc, updateStaffDoc,
  addErrandDoc, giveCashAdvance, settleStaffLedger,
  uploadFile, useMaintenanceTickets
} from "@/hooks/useFirestore";

const ROLES = ["Caretaker", "Maintenance Tech", "Cleaner", "Security", "Admin", "Other"];
const ROLE_COLORS = {
  "Caretaker": "bg-blue-100 text-blue-700",
  "Maintenance Tech": "bg-amber-100 text-amber-700",
  "Cleaner": "bg-green-100 text-green-700",
  "Security": "bg-red-100 text-red-700",
  "Admin": "bg-purple-100 text-purple-700",
  "Other": "bg-zinc-100 text-zinc-600",
};

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function AvatarInitials({ name, size = "md" }) {
  const colors = ["bg-[#0b3860]", "bg-[#1d4f7c]", "bg-[#2270b8]", "bg-[#183b5e]", "bg-[#1a5f7a]"];
  const idx = (name || "").charCodeAt(0) % colors.length;
  const sz = size === "lg" ? "h-12 w-12 text-[16px]" : "h-9 w-9 text-[12px]";
  return (
    <div className={`${sz} ${colors[idx]} rounded-full flex items-center justify-center font-bold text-white shrink-0 font-['Sora']`}>
      {initials(name)}
    </div>
  );
}

function AddStaffModal({ userId, buildingId, buildings, onClose }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Caretaker");
  const [phone, setPhone] = useState("");
  const [payType, setPayType] = useState("monthly_salary");
  const [salary, setSalary] = useState("");
  const [assignedProps, setAssignedProps] = useState(buildingId ? [buildingId] : []);
  const [saving, setSaving] = useState(false);

  const toggle = (id) => setAssignedProps(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await addStaffDoc({
      user_id: userId,
      name: name.trim(),
      role,
      phone: phone.trim(),
      pay_type: payType,
      monthly_salary: payType === "monthly_salary" ? Number(salary) || 0 : 0,
      assigned_properties: assignedProps,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto animate-scale-in my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-[16px] font-bold text-zinc-900 font-['Sora']">Add Staff Member</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition cursor-pointer"><X size={16} /></button>
        </div>
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Full Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Juan dela Cruz"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#2270b8] transition" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#2270b8] transition">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+63 9XX XXX XXXX"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#2270b8] transition" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Compensation Structure</label>
            <div className="flex gap-3">
              {[["monthly_salary", "Monthly Salary"], ["per_errand", "Per Errand / Task"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setPayType(v)}
                  className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold border transition cursor-pointer ${payType === v ? "bg-[#0b3860] text-white border-[#0b3860]" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {payType === "monthly_salary" && (
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Monthly Salary (₱)</label>
              <input type="number" min="0" value={salary} onChange={e => setSalary(e.target.value)} placeholder="e.g. 12000"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#2270b8] transition" />
            </div>
          )}
          {buildings && buildings.length > 1 && (
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Assigned Properties</label>
              <div className="space-y-1 max-h-32 overflow-y-auto rounded-xl border border-zinc-200 p-2">
                {buildings.map(b => (
                  <label key={b.id} className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded-lg hover:bg-zinc-50">
                    <input type="checkbox" checked={assignedProps.includes(b.id)} onChange={() => toggle(b.id)} className="accent-[#2270b8]" />
                    <span className="text-[13px] text-zinc-700">{b.name || "Untitled Building"}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-[13px] font-semibold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving || !name.trim()}
              className="flex-1 rounded-xl bg-[#0b3860] py-2.5 text-[13px] font-bold text-white hover:bg-[#154e83] transition disabled:opacity-50 cursor-pointer">
              {saving ? "Saving…" : "Save Staff Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LogErrandModal({ staff, userId, onClose }) {
  const [type, setType] = useState("material_expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiptFile, setReceiptFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    let receipt_url = null;
    if (receiptFile) receipt_url = await uploadFile(`staff/${staff.id}/receipts/${Date.now()}`, receiptFile);
    await addErrandDoc({ staff_id: staff.id, user_id: userId, type, title: title.trim(), date, amount: Number(amount) || 0, is_paid: false, receipt_url });
    setSaving(false);
    onClose();
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[460px] max-h-[90vh] overflow-y-auto animate-scale-in my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-[16px] font-bold text-zinc-900 font-['Sora']">Log Expense / Errand</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition cursor-pointer"><X size={16} /></button>
        </div>
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Expense Category</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["material_expense", "Materials / Items"],
                ["errand_fee", "Labor / Service"]
              ].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setType(v)}
                  className={`py-2 px-1 rounded-xl text-[11px] font-semibold border transition text-center ${type === v ? "bg-[#0b3860] text-white border-[#0b3860]" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Description *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Bought replacement faucet, lightbulbs"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#2270b8] transition" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Amount (₱) *</label>
              <input required type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#2270b8] transition" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#2270b8] transition" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Receipt / Photo</label>
            <input type="file" accept="image/*" onChange={e => setReceiptFile(e.target.files[0])}
              className="w-full text-[12px] text-zinc-600 file:mr-2 file:rounded-full file:border-0 file:bg-zinc-200 file:px-2 file:py-1 file:text-[11px] file:font-semibold" />
          </div>
          <div className="pt-1 flex gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-[13px] font-semibold text-zinc-600 hover:bg-zinc-50 transition">Cancel</button>
            <button type="submit" disabled={saving || !title.trim() || !amount}
              className="flex-1 rounded-xl bg-[#2270b8] py-2.5 text-[13px] font-bold text-white hover:bg-[#3186d6] transition disabled:opacity-50">
              {saving ? "Saving…" : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditErrandModal({ errand, staff, onClose }) {
  const [title, setTitle] = useState(errand.title || "");
  const [amount, setAmount] = useState(errand.amount || "");
  const [date, setDate] = useState(errand.date || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const newAmount = Number(amount) || 0;

    if (errand.type === "cash_advance" && !errand.is_paid && newAmount !== errand.amount) {
      const diff = newAmount - errand.amount;
      const { updateStaffDoc } = await import("@/hooks/useFirestore");
      await updateStaffDoc(staff.id, { petty_cash_balance: (staff.petty_cash_balance || 0) + diff });
    }

    const { updateErrandDoc } = await import("@/hooks/useFirestore");
    await updateErrandDoc(errand.id, { title: title.trim(), amount: newAmount, date });

    setSaving(false);
    onClose();
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] max-h-[90vh] overflow-y-auto animate-scale-in my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-[16px] font-bold text-zinc-900 font-['Sora']">Edit Transaction</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition cursor-pointer"><X size={16} /></button>
        </div>
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Description *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Bought replacement faucet"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#2270b8] transition" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Amount (₱) *</label>
              <input required type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#2270b8] transition" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#2270b8] transition" />
            </div>
          </div>
          <div className="pt-1 flex gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-[13px] font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving || !title.trim() || !amount}
              className="flex-1 rounded-xl bg-[#0b3860] py-2.5 text-[13px] font-bold text-white hover:bg-[#154e83] transition disabled:opacity-50 cursor-pointer">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CashAdvanceModal({ staff, userId, onClose }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await giveCashAdvance(staff.id, amount, note || `Cash Advance to ${staff.name}`, userId);
    setSaving(false);
    onClose();
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] max-h-[90vh] overflow-y-auto animate-scale-in my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-[16px] font-bold text-zinc-900 font-['Sora']">Issue Cash Advance / Fund</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition cursor-pointer"><X size={16} /></button>
        </div>
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-[#0b3860]/5 border border-[#0b3860]/10 px-4 py-3 flex items-center gap-3">
            <AvatarInitials name={staff.name} />
            <div>
              <div className="text-[13px] font-bold text-zinc-900">{staff.name}</div>
              <div className="text-[11px] text-zinc-500">Current Cash on Hand: <span className="font-bold text-[#0b3860]">₱{(staff.petty_cash_balance || 0).toLocaleString()}</span></div>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Amount to Give (₱) *</label>
            <input required type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500 or 1000"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[14px] font-semibold outline-none focus:border-[#2270b8] transition" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Note / Purpose (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. For hardware store materials"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] outline-none focus:border-[#2270b8] transition" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-[13px] font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving || !amount}
              className="flex-1 rounded-xl bg-[#0b3860] py-2.5 text-[13px] font-bold text-white hover:bg-[#154e83] transition disabled:opacity-50 cursor-pointer">
              {saving ? "Issuing…" : "Issue Cash Advance →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StaffLedger({ staff, userId, buildings = [], onClose, maintenanceTickets = [] }) {
  const { errands, loading } = useStaffErrands(staff.id);
  const [activeTab, setActiveTab] = useState("ledger"); // "ledger" | "tasks" | "profile"
  const [showErrand, setShowErrand] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);
  const [editingErrand, setEditingErrand] = useState(null);
  const [deletingErrandId, setDeletingErrandId] = useState(null);
  const [settling, setSettling] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(staff.name || "");
  const [editRole, setEditRole] = useState(staff.role || "Caretaker");
  const [editPhone, setEditPhone] = useState(staff.phone || "");
  const [editPayType, setEditPayType] = useState(staff.pay_type || "monthly_salary");
  const [editSalary, setEditSalary] = useState(staff.monthly_salary || "");
  const [editProps, setEditProps] = useState(staff.assigned_properties || []);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState(false);

  // Reset tab and form state whenever selected staff changes
  useEffect(() => {
    setActiveTab("ledger");
    setIsEditingProfile(false);
    setEditName(staff.name || "");
    setEditRole(staff.role || "Caretaker");
    setEditPhone(staff.phone || "");
    setEditPayType(staff.pay_type || "monthly_salary");
    setEditSalary(staff.monthly_salary || "");
    setEditProps(staff.assigned_properties || []);
  }, [staff.id]);

  const assignedTickets = maintenanceTickets.filter(t => t.assigned_staff_id === staff.id);

  const handleDeleteErrand = async (errand) => {
    if (!confirm("Delete this transaction?")) return;
    setDeletingErrandId(errand.id);
    if (errand.type === "cash_advance" && !errand.is_paid) {
      const { updateStaffDoc } = await import("@/hooks/useFirestore");
      await updateStaffDoc(staff.id, { petty_cash_balance: (staff.petty_cash_balance || 0) - (errand.amount || 0) });
    }
    const { deleteErrandDoc } = await import("@/hooks/useFirestore");
    await deleteErrandDoc(errand.id);
    setDeletingErrandId(null);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSavingProfile(true);
    await updateStaffDoc(staff.id, {
      name: editName.trim(),
      role: editRole,
      phone: editPhone.trim(),
      pay_type: editPayType,
      monthly_salary: editPayType === "monthly_salary" ? Number(editSalary) || 0 : 0,
      assigned_properties: editProps,
    });
    setSavingProfile(false);
    setIsEditingProfile(false);
  };

  const handleDeleteStaff = async () => {
    if (!confirm(`Are you sure you want to remove ${staff.name}? This will permanently remove them from the staff roster.`)) return;
    setDeletingStaff(true);
    await deleteStaffDoc(staff.id);
    setDeletingStaff(false);
    onClose();
  };

  // Only calculate for ACTIVE / UNSETTLED transactions
  const unsettledErrands = errands.filter(e => !e.is_paid);
  const totalAdvance = unsettledErrands.filter(e => e.type === "cash_advance").reduce((s, e) => s + (e.amount || 0), 0);
  const totalReceipts = unsettledErrands.filter(e => e.type === "material_expense" || e.type === "errand_fee").reduce((s, e) => s + (e.amount || 0), 0);
  const netBalance = totalAdvance - totalReceipts;
  const unsettledIds = unsettledErrands.map(e => e.id);

  const TYPE_CFG = {
    cash_advance: { icon: <ArrowDownCircle size={15} className="text-green-600" />, label: "Cash Advance", color: "text-green-700" },
    material_expense: { icon: <Receipt size={15} className="text-amber-600" />, label: "Materials / Expense", color: "text-amber-700" },
    errand_fee: { icon: <ClipboardList size={15} className="text-blue-600" />, label: "Labor / Errand Fee", color: "text-blue-700" },
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-zinc-100 shrink-0 bg-white shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onClose}
            className="md:hidden p-1.5 -ml-1 mr-0.5 rounded-lg text-zinc-500 hover:bg-zinc-100 transition cursor-pointer flex items-center gap-1 text-[12px] font-bold"
            title="Back to Roster"
          >
            <ArrowLeft size={16} />
            <span className="hidden xs:inline">Roster</span>
          </button>
          <AvatarInitials name={staff.name} size="md" />
          <div className="min-w-0">
            <div className="text-[14px] sm:text-[15px] font-bold text-zinc-900 font-['Sora'] leading-tight truncate">{staff.name}</div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[staff.role] || ROLE_COLORS.Other}`}>{staff.role}</span>
              {staff.phone && <span className="text-[11px] text-zinc-400">{staff.phone}</span>}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition cursor-pointer" title="Close"><X size={16} /></button>
      </div>

      {/* ── Sub-Navigation Tabs ── */}
      <div className="flex border-b border-zinc-100 px-6 shrink-0 bg-white gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-1.5 py-2.5 px-3 text-[12px] font-bold border-b-2 transition cursor-pointer ${
            activeTab === "ledger"
              ? "border-[#0b3860] text-[#0b3860]"
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <Receipt size={13} />
          <span>Ledger</span>
          {unsettledIds.length > 0 && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full">
              {unsettledIds.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-1.5 py-2.5 px-3 text-[12px] font-bold border-b-2 transition cursor-pointer ${
            activeTab === "tasks"
              ? "border-[#0b3860] text-[#0b3860]"
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <Wrench size={13} />
          <span>Tasks</span>
          {assignedTickets.length > 0 && (
            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full">
              {assignedTickets.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-1.5 py-2.5 px-3 text-[12px] font-bold border-b-2 transition cursor-pointer ${
            activeTab === "profile"
              ? "border-[#0b3860] text-[#0b3860]"
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <User size={13} />
          <span>Profile</span>
        </button>
      </div>

      {/* ── TAB 1: LEDGER ── */}
      {activeTab === "ledger" && (
        <div className="flex-1 min-h-0 relative">
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent z-10" />

          <div className="h-full overflow-y-auto px-6 py-5 space-y-5 pb-16">
            {/* ── Balance Summary Card (Blue) ── */}
            <div className="rounded-xl bg-[#0b3860] px-4 py-3 text-white shadow-sm">
              <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-1.5">
                <span className="text-[11px] font-bold text-white/70 font-['Manrope']">Current Cash Balance</span>
                <span className="text-[10px] font-semibold text-white/40">{unsettledIds.length} pending</span>
              </div>

              <div className="space-y-1 mb-2 font-['Manrope'] text-[12px]">
                <div className="flex justify-between">
                  <span className="text-white/60">You gave {staff.name.split(' ')[0]}:</span>
                  <span className="font-bold">₱{totalAdvance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">{staff.name.split(' ')[0]} spent:</span>
                  <span className="font-bold">₱{totalReceipts.toLocaleString()}</span>
                </div>
                <div className="border-t border-white/10 mt-1.5 pt-1.5">
                  {netBalance > 0 ? (
                    <div className="flex justify-between items-center text-amber-300">
                      <span className="font-bold text-[12px]">{staff.name.split(' ')[0]} needs to return:</span>
                      <span className="font-bold text-[15px] font-['Sora']">₱{Math.abs(netBalance).toLocaleString()}</span>
                    </div>
                  ) : netBalance < 0 ? (
                    <div className="flex justify-between items-center text-green-300">
                      <span className="font-bold text-[12px]">You need to pay {staff.name.split(' ')[0]}:</span>
                      <span className="font-bold text-[15px] font-['Sora']">₱{Math.abs(netBalance).toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-white/80">
                      <span className="font-bold text-[12px]">All balanced!</span>
                      <span className="font-bold text-[15px] font-['Sora']">₱0</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={async () => { setSettling(true); await settleStaffLedger(staff.id, unsettledIds); setSettling(false); }}
                disabled={settling || unsettledIds.length === 0}
                className="w-full py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold transition disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]">
                <Check size={12} /> {settling ? "Clearing…" : unsettledIds.length === 0 ? "All Settled" : "Mark as Settled"}
              </button>
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex gap-3">
              <button onClick={() => setShowAdvance(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#2270b8] text-[#2270b8] bg-[#2270b8]/5 hover:bg-[#2270b8]/10 text-[12px] font-bold transition cursor-pointer active:scale-[0.98]">
                <Banknote size={15} /> Issue Cash Advance
              </button>
              <button onClick={() => setShowErrand(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 bg-zinc-50 hover:bg-zinc-100 text-[12px] font-bold transition cursor-pointer active:scale-[0.98]">
                <ClipboardList size={15} /> Log Expense / Errand
              </button>
            </div>

            {/* ── Transaction History ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-['Manrope']">
                  Transaction History ({errands.length})
                </span>
                {unsettledErrands.length > 0 ? (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    {unsettledErrands.length} PENDING
                  </span>
                ) : errands.length > 0 ? (
                  <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    ALL SETTLED
                  </span>
                ) : null}
              </div>

              <div className="space-y-2.5">
                {loading ? (
                  <div className="py-8 text-center text-zinc-400 text-[13px]">Loading transactions…</div>
                ) : errands.length === 0 ? (
                  <div className="py-10 text-center text-[13px] text-zinc-400 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                    No expenses or advances recorded yet
                  </div>
                ) : errands.map(e => {
                  const cfg = TYPE_CFG[e.type] || TYPE_CFG.errand_fee;
                  return (
                    <div key={e.id} className={`group rounded-xl border p-3.5 flex items-start gap-3 transition ${e.is_paid ? "border-zinc-100 bg-zinc-50/70" : "border-zinc-200 bg-white shadow-xs hover:border-zinc-300"}`}>
                      <div className="mt-0.5 shrink-0">{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-zinc-800 truncate">{e.title}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{e.date} · {cfg.label}</div>
                        <div className="mt-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingErrand(e)}
                            className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-[#2270b8] transition cursor-pointer">
                            <Edit2 size={10} /> Edit
                          </button>
                          <button onClick={() => handleDeleteErrand(e)} disabled={deletingErrandId === e.id}
                            className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-red-600 transition disabled:opacity-50 cursor-pointer">
                            <Trash2 size={10} /> {deletingErrandId === e.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-[13px] font-bold ${cfg.color}`}>₱{(e.amount || 0).toLocaleString()}</div>
                        <div className={`text-[10px] font-bold mt-0.5 ${e.is_paid ? "text-green-600" : "text-amber-600"}`}>{e.is_paid ? "SETTLED" : "PENDING"}</div>
                      </div>
                      {e.receipt_url && (
                        <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" className="shrink-0" title="View receipt">
                          <img src={e.receipt_url} alt="Receipt" className="h-10 w-10 object-cover rounded-lg border border-zinc-200 hover:opacity-80 transition shadow-xs" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: TASKS ── */}
      {activeTab === "tasks" && (
        <div className="flex-1 min-h-0 relative">
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent z-10" />

          <div className="h-full overflow-y-auto px-6 py-5 space-y-4 pb-16">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-[13px] font-bold text-zinc-800 font-['Sora']">Assigned Maintenance Tasks</h3>
                <p className="text-[11px] text-zinc-400">Tickets assigned to {staff.name.split(' ')[0]}</p>
              </div>
              <span className="text-[10px] font-bold text-[#0b3860] bg-[#e1ebf4] px-2.5 py-0.5 rounded-full">
                {assignedTickets.length} {assignedTickets.length === 1 ? "task" : "tasks"}
              </span>
            </div>

            <div className="space-y-2.5">
              {assignedTickets.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
                  <Wrench size={28} className="mx-auto mb-2 text-zinc-300" />
                  <div className="text-[13px] font-semibold text-zinc-600">No maintenance tasks assigned</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Tasks assigned to {staff.name.split(' ')[0]} in the Maintenance tab will show up here.</div>
                </div>
              ) : assignedTickets.map(t => (
                <div key={t.id} className="group rounded-xl border border-zinc-200 bg-white p-3.5 flex items-start gap-3 shadow-xs hover:border-zinc-300 transition">
                  <div className="mt-0.5 shrink-0 text-[#2270b8] p-2 bg-blue-50 rounded-lg"><Wrench size={15} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-zinc-800 truncate">{t.title}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{t.unit_label || "Common Area"} · {t.created_at ? new Date(t.created_at).toLocaleDateString("en-PH") : ""}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === 'settled' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {t.status === 'settled' ? "SETTLED" : "ACTIVE"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: PROFILE ── */}
      {activeTab === "profile" && (
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6 pb-16">
          {!isEditingProfile ? (
            <>
              {/* Profile Details Card */}
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-['Manrope']">Staff Information</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(staff.name || "");
                      setEditRole(staff.role || "Caretaker");
                      setEditPhone(staff.phone || "");
                      setEditPayType(staff.pay_type || "monthly_salary");
                      setEditSalary(staff.monthly_salary || "");
                      setEditProps(staff.assigned_properties || []);
                      setIsEditingProfile(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#0b3860] hover:text-[#1d4f7c] transition cursor-pointer"
                  >
                    <Edit2 size={12} /> Edit Details
                  </button>
                </div>

                <div className="space-y-3 text-[13px]">
                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Full Name</span>
                    <span className="font-semibold text-zinc-900">{staff.name}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Role</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[staff.role] || ROLE_COLORS.Other}`}>
                      {staff.role}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Phone</span>
                    <span className="font-semibold text-zinc-900">{staff.phone || "None listed"}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Compensation</span>
                    <span className="font-semibold text-zinc-900">
                      {staff.pay_type === "monthly_salary"
                        ? `₱${(staff.monthly_salary || 0).toLocaleString()} / month`
                        : "Per Errand / Task"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Assigned Properties</span>
                    <div className="text-right">
                      {(!staff.assigned_properties || staff.assigned_properties.length === 0) ? (
                        <span className="text-zinc-400 text-[12px]">All / None</span>
                      ) : (
                        <div className="flex flex-col gap-0.5 text-right">
                          {staff.assigned_properties.map(pid => {
                            const b = buildings.find(x => x.id === pid);
                            return (
                              <span key={pid} className="inline-flex items-center justify-end gap-1 font-semibold text-zinc-800 text-[12px]">
                                <Building2 size={12} className="text-zinc-400" />
                                {b ? b.name : "Property"}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="rounded-2xl border border-red-200/60 bg-red-50/20 p-5">
                <div className="text-[11px] font-bold text-red-500 uppercase tracking-wider font-['Manrope'] mb-1.5">
                  Danger Zone
                </div>
                <p className="text-[12px] text-zinc-500 mb-3.5 leading-relaxed">
                  Removing this staff member will take them off the roster and detach their assigned maintenance tickets. Their past logged errands will stay recorded for accounting.
                </p>
                <button
                  type="button"
                  onClick={handleDeleteStaff}
                  disabled={deletingStaff}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Trash2 size={13} /> {deletingStaff ? "Removing…" : "Remove Staff Member"}
                </button>
              </div>
            </>
          ) : (
            /* Inline Edit Form */
            <form onSubmit={handleSaveProfile} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-[14px] font-bold text-zinc-900 font-['Sora']">Edit Staff Profile</h3>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="text-zinc-400 hover:text-zinc-600 transition text-[12px]"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Full Name *</label>
                <input
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-[#2270b8] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Role</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-[#2270b8] transition"
                  >
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-[#2270b8] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Compensation Structure</label>
                <div className="flex gap-2">
                  {[["monthly_salary", "Monthly Salary"], ["per_errand", "Per Errand / Task"]].map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEditPayType(v)}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                        editPayType === v ? "bg-[#0b3860] text-white border-[#0b3860]" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {editPayType === "monthly_salary" && (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Monthly Salary (₱)</label>
                  <input
                    type="number"
                    min="0"
                    value={editSalary}
                    onChange={e => setEditSalary(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-[#2270b8] transition"
                  />
                </div>
              )}

              {buildings && buildings.length > 1 && (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Assigned Properties</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto rounded-xl border border-zinc-200 p-2">
                    {buildings.map(b => (
                      <label key={b.id} className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded-lg hover:bg-zinc-50">
                        <input
                          type="checkbox"
                          checked={editProps.includes(b.id)}
                          onChange={() => {
                            const id = b.id;
                            setEditProps(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
                          }}
                          className="accent-[#2270b8]"
                        />
                        <span className="text-[12px] text-zinc-700">{b.name || "Untitled Building"}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-[12px] font-semibold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile || !editName.trim()}
                  className="flex-1 rounded-xl bg-[#0b3860] py-2 text-[12px] font-bold text-white hover:bg-[#154e83] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save size={13} /> {savingProfile ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {showErrand && <LogErrandModal staff={staff} userId={userId} onClose={() => setShowErrand(false)} />}
      {showAdvance && <CashAdvanceModal staff={staff} userId={userId} onClose={() => setShowAdvance(false)} />}
      {editingErrand && <EditErrandModal errand={editingErrand} staff={staff} onClose={() => setEditingErrand(null)} />}
    </div>
  );
}

export default function StaffTab({ building, buildings, userId }) {
  const buildingId = building?.id;
  const { staff, loading } = useStaff(userId, buildingId);
  const { tickets: maintenanceTickets } = useMaintenanceTickets(buildingId);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  // Sync selectedStaff if staff is removed or updated
  useEffect(() => {
    if (selectedStaff && !loading && !staff.some(s => s.id === selectedStaff.id)) {
      setSelectedStaff(null);
    }
  }, [staff, selectedStaff, loading]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowAdd(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Staff Directory Left Column */}
        <div className={`${selectedStaff ? "hidden md:flex" : "flex"} w-full md:w-[36%] border-r border-zinc-100 flex-col min-h-0 overflow-hidden bg-zinc-50/30`}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-zinc-800 font-['Sora']">Staff Roster</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e1ebf4] text-[#2270b8]">
                {staff.length}
              </span>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 bg-[#0b3860] hover:bg-[#154e83] text-white px-3 py-1.5 rounded-xl text-[11px] font-bold transition shadow-sm cursor-pointer active:scale-95">
              <Plus size={12} /> Add Staff
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="py-8 text-center text-zinc-400 text-[13px] animate-fade-in">Loading staff…</div>
            ) : staff.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-zinc-200 rounded-xl text-[13px] text-zinc-400 bg-white animate-scale-in">
                <Users size={28} className="mx-auto mb-2 text-zinc-300" />
                No staff members yet. Click "Add Staff" to get started.
              </div>
            ) : staff.map((s, idx) => (
              <div key={s.id}
                onClick={() => setSelectedStaff(s)}
                style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
                className={`rounded-xl border p-3 cursor-pointer transition animate-fade-up ${selectedStaff?.id === s.id ? "border-[#2270b8] bg-[#2270b8]/5 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"}`}>
                <div className="flex items-center gap-3">
                  <AvatarInitials name={s.name} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-zinc-900 truncate">{s.name}</div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[s.role] || ROLE_COLORS.Other}`}>{s.role}</span>
                  </div>
                  <ChevronRight size={14} className={`shrink-0 transition-transform ${selectedStaff?.id === s.id ? "text-[#2270b8] translate-x-0.5" : "text-zinc-400"}`} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-[11px] text-zinc-500">
                    {s.pay_type === "monthly_salary" ? `₱${(s.monthly_salary || 0).toLocaleString()}/mo` : "Per Errand / Task"}
                    {s.phone && <span className="ml-2 text-zinc-400">· {s.phone}</span>}
                  </div>
                  {(s.petty_cash_balance || 0) > 0 && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      ₱{s.petty_cash_balance.toLocaleString()} advance
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Ledger Right Column */}
        <div className={`${selectedStaff ? "flex" : "hidden md:flex"} flex-1 min-h-0 flex-col overflow-hidden bg-white animate-fade-in`}>
          {selectedStaff ? (() => {
            const activeStaff = staff.find(s => s.id === selectedStaff.id) || selectedStaff;
            return <StaffLedger staff={activeStaff} userId={userId} buildings={buildings} onClose={() => setSelectedStaff(null)} maintenanceTickets={maintenanceTickets} />;
          })() : (
            <div className="flex flex-col items-center justify-center h-full text-center text-zinc-400 gap-3">
              <div className="p-4 bg-zinc-100 rounded-full"><User size={28} className="text-zinc-300" /></div>
              <div>
                <div className="text-[14px] font-semibold text-zinc-500">Select a Staff Member</div>
                <div className="text-[12px] mt-0.5">View ledger, record expenses, and manage cash advances.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddStaffModal userId={userId} buildingId={buildingId} buildings={buildings} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

