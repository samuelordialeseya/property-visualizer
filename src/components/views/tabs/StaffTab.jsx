"use client";
import { useState } from "react";
import {
  Users, Wallet, AlertCircle, Plus, ChevronRight, X, Check, Trash2,
  Receipt, ArrowDownCircle, ClipboardList, Banknote, User
} from "lucide-react";
import {
  useStaff, useStaffErrands,
  addStaffDoc, deleteStaffDoc,
  addErrandDoc, giveCashAdvance, settleStaffLedger,
  uploadFile
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
  const colors = ["bg-[#0b3860]", "bg-[#2270b8]", "bg-teal-700", "bg-indigo-700", "bg-purple-700"];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-[16px] font-bold text-zinc-900 font-['Sora']">Add Staff Member</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition"><X size={16} /></button>
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
                  className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold border transition ${payType === v ? "bg-[#0b3860] text-white border-[#0b3860]" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
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
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-[13px] font-semibold text-zinc-600 hover:bg-zinc-100 transition">Cancel</button>
            <button type="submit" disabled={saving || !name.trim()}
              className="flex-1 rounded-xl bg-[#0b3860] py-2.5 text-[13px] font-bold text-white hover:bg-[#154e83] transition disabled:opacity-50">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[460px]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-[16px] font-bold text-zinc-900 font-['Sora']">Log Expense / Errand</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition"><X size={16} /></button>
        </div>
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Expense Category</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["material_expense","Materials / Items"],
                ["errand_fee","Labor / Service"],
                ["cash_advance","Cash Advance"]
              ].map(([v,l]) => (
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-[16px] font-bold text-zinc-900 font-['Sora']">Issue Cash Advance / Fund</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition"><X size={16} /></button>
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
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-[13px] font-semibold text-zinc-600 hover:bg-zinc-50 transition">Cancel</button>
            <button type="submit" disabled={saving || !amount}
              className="flex-1 rounded-xl bg-[#0b3860] py-2.5 text-[13px] font-bold text-white hover:bg-[#154e83] transition disabled:opacity-50">
              {saving ? "Issuing…" : "Issue Cash Advance →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StaffLedger({ staff, userId, onClose }) {
  const { errands, loading } = useStaffErrands(staff.id);
  const [showErrand, setShowErrand] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);
  const [settling, setSettling] = useState(false);

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
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-100 shrink-0 bg-white shadow-2xs">
        <div className="flex items-center gap-3">
          <AvatarInitials name={staff.name} size="md" />
          <div>
            <div className="text-[15px] font-bold text-zinc-900 font-['Sora'] leading-tight">{staff.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[staff.role] || ROLE_COLORS.Other}`}>{staff.role}</span>
              {staff.phone && <span className="text-[11px] text-zinc-400">{staff.phone}</span>}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition" title="Close"><X size={16} /></button>
      </div>

      {/* Settlement Calculator Summary Box */}
      <div className="mx-5 mt-3 rounded-2xl bg-[#0b3860] p-3.5 text-white shrink-0 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 font-['Manrope']">Settlement & Expense Calculator</span>
          <span className="text-[10px] font-semibold text-white/50">{unsettledIds.length} pending</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2.5 bg-white/10 p-2.5 rounded-xl">
          {[
            ["₱" + totalAdvance.toLocaleString(), "Total Advances"],
            ["₱" + totalReceipts.toLocaleString(), "Receipts / Expenses"],
            [
              (netBalance > 0 ? "₱" : netBalance < 0 ? "-₱" : "₱") + Math.abs(netBalance).toLocaleString(),
              netBalance > 0 ? "Due Back (Change)" : netBalance < 0 ? "Reimburse (Staff Paid)" : "Balanced (₱0)"
            ]
          ].map(([v, l], i) => (
            <div key={l} className="text-center">
              <div className={`text-[15px] font-bold font-['Sora'] leading-tight ${i === 2 && netBalance > 0 ? "text-amber-300" : i === 2 && netBalance < 0 ? "text-green-300" : "text-white"}`}>{v}</div>
              <div className="text-[9.5px] text-white/70 leading-tight mt-0.5">{l}</div>
            </div>
          ))}
        </div>
        <button onClick={async () => { setSettling(true); await settleStaffLedger(staff.id, unsettledIds); setSettling(false); }}
          disabled={settling || unsettledIds.length === 0}
          className="w-full py-2 rounded-xl bg-white/15 hover:bg-white/25 text-[11px] font-bold transition disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer">
          <Check size={13} /> {settling ? "Settling…" : unsettledIds.length === 0 ? "✓ All Accounts Settled" : `Settle & Mark Paid (${unsettledIds.length})`}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 px-5 py-2.5 shrink-0">
        <button onClick={() => setShowAdvance(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[#2270b8] text-[#2270b8] bg-[#2270b8]/5 hover:bg-[#2270b8]/10 text-[12px] font-semibold transition cursor-pointer">
          <Banknote size={14} /> Cash Advance
        </button>
        <button onClick={() => setShowErrand(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-zinc-200 text-zinc-700 bg-zinc-50 hover:bg-zinc-100 text-[12px] font-semibold transition cursor-pointer">
          <ClipboardList size={14} /> Log Expense / Errand
        </button>
      </div>

      {/* Transaction History Header */}
      <div className="flex items-center justify-between px-5 pt-1 pb-1.5 shrink-0">
        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-['Manrope']">
          Transaction History ({errands.length})
        </span>
        {errands.length > 2 && (
          <span className="text-[10px] text-zinc-400 font-medium">Scroll down to view all ↓</span>
        )}
      </div>

      {/* Fully Scrollable Transaction History List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6 space-y-2">
        {loading ? (
          <div className="py-8 text-center text-zinc-400 text-[13px]">Loading transactions…</div>
        ) : errands.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-zinc-400 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">No expenses or advances recorded yet</div>
        ) : errands.map(e => {
          const cfg = TYPE_CFG[e.type] || TYPE_CFG.errand_fee;
          return (
            <div key={e.id} className={`rounded-xl border p-3 flex items-start gap-3 transition ${e.is_paid ? "border-zinc-100 bg-zinc-50/70" : "border-zinc-200 bg-white shadow-xs hover:border-zinc-300"}`}>
              <div className="mt-0.5 shrink-0">{cfg.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-zinc-800 truncate">{e.title}</div>
                <div className="text-[11px] text-zinc-400">{e.date} · {cfg.label}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-[13px] font-bold ${cfg.color}`}>₱{(e.amount || 0).toLocaleString()}</div>
                <div className={`text-[10px] font-bold ${e.is_paid ? "text-green-600" : "text-amber-600"}`}>{e.is_paid ? "SETTLED" : "PENDING"}</div>
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

      {showErrand && <LogErrandModal staff={staff} userId={userId} onClose={() => setShowErrand(false)} />}
      {showAdvance && <CashAdvanceModal staff={staff} userId={userId} onClose={() => setShowAdvance(false)} />}
    </div>
  );
}

export default function StaffTab({ building, buildings, userId }) {
  const buildingId = building?.id;
  const { staff, loading } = useStaff(userId, buildingId);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const totalPayroll = staff.filter(s => s.pay_type === "monthly_salary").reduce((sum, s) => sum + (s.monthly_salary || 0), 0);
  const totalPettyCash = staff.reduce((sum, s) => sum + (s.petty_cash_balance || 0), 0);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-3 gap-4 px-8 py-3.5 border-b border-zinc-100 shrink-0 bg-white">
        {[
          { icon: <Users size={18} className="text-[#2270b8]" />, label: "Active Staff", value: staff.length, color: "bg-blue-50" },
          { icon: <Wallet size={18} className="text-green-600" />, label: "Monthly Payroll", value: `₱${totalPayroll.toLocaleString()}`, color: "bg-green-50" },
          { icon: <AlertCircle size={18} className="text-amber-600" />, label: "Cash on Hand / Advances", value: `₱${totalPettyCash.toLocaleString()}`, color: "bg-amber-50" },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className={`rounded-2xl ${color} px-5 py-3.5 flex items-center gap-4`}>
            <div className="p-2.5 bg-white rounded-xl shadow-sm shrink-0">{icon}</div>
            <div>
              <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider font-['Manrope']">{label}</div>
              <div className="text-[19px] font-bold text-zinc-900 font-['Sora'] leading-tight">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Staff Directory Left Column */}
        <div className="w-[36%] border-r border-zinc-100 flex flex-col min-h-0 overflow-hidden bg-zinc-50/30">
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 shrink-0 bg-white">
            <span className="text-[13px] font-bold text-zinc-700 font-['Sora']">Staff Roster</span>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 bg-[#0b3860] hover:bg-[#154e83] text-white px-3 py-1.5 rounded-xl text-[11px] font-bold transition shadow-sm cursor-pointer">
              <Plus size={12} /> Add Staff
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="py-8 text-center text-zinc-400 text-[13px]">Loading staff…</div>
            ) : staff.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-zinc-200 rounded-xl text-[13px] text-zinc-400 bg-white">
                <Users size={28} className="mx-auto mb-2 text-zinc-300" />
                No staff members yet. Click "Add Staff" to get started.
              </div>
            ) : staff.map(s => (
              <div key={s.id}
                onClick={() => setSelectedStaff(selectedStaff?.id === s.id ? null : s)}
                className={`rounded-xl border p-3 cursor-pointer transition ${selectedStaff?.id === s.id ? "border-[#2270b8] bg-[#2270b8]/5 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"}`}>
                <div className="flex items-center gap-3">
                  <AvatarInitials name={s.name} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-zinc-900 truncate">{s.name}</div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[s.role] || ROLE_COLORS.Other}`}>{s.role}</span>
                  </div>
                  <ChevronRight size={14} className="text-zinc-400 shrink-0" />
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
                {selectedStaff?.id === s.id && (
                  <div className="mt-2 pt-2 border-t border-zinc-100 flex justify-end">
                    <button onClick={async e => { e.stopPropagation(); if (!confirm(`Remove ${s.name}?`)) return; setDeletingId(s.id); setSelectedStaff(null); await deleteStaffDoc(s.id); setDeletingId(null); }}
                      disabled={deletingId === s.id}
                      className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 transition">
                      <Trash2 size={11} /> Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Staff Ledger Right Column */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white">
          {selectedStaff ? (
            <StaffLedger staff={selectedStaff} userId={userId} onClose={() => setSelectedStaff(null)} />
          ) : (
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

