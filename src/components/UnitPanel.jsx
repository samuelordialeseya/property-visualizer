"use client";
import { useState, useEffect } from "react";
import { updateUnitDoc, uploadFile, useMaintenanceTickets } from "@/hooks/useFirestore";
import { Pencil, X, Check, Plus, CreditCard, ChevronDown, ChevronUp, User, Wrench, Zap, Droplets, Wifi, Car, Trash2, Building2, Receipt, MoreHorizontal } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "vacant",   label: "Vacant",         pill: "bg-zinc-100 text-zinc-600 border-zinc-200",  dot: "bg-zinc-400" },
  { value: "occupied", label: "Occupied",        pill: "bg-[var(--color-blue-50)] text-[var(--color-blue-700)] border-[var(--color-blue-500)]", dot: "bg-[var(--color-blue-500)]" },
  { value: "overdue",  label: "Overdue",         pill: "bg-red-50 text-red-700 border-red-500",      dot: "bg-red-500" },
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const PAYMENT_TYPES = [
  { value: "monthly_rent", label: "Monthly Rent" },
  { value: "maintenance",  label: "Maintenance / Repair" },
  { value: "late_fee",     label: "Late Fee" },
  { value: "other",        label: "Other" },
];

const BILL_TYPES = [
  { value: "electric",   label: "Electric",         icon: Zap,          color: "text-yellow-600", bg: "bg-yellow-50" },
  { value: "water",      label: "Water",            icon: Droplets,     color: "text-sky-600",    bg: "bg-sky-50" },
  { value: "internet",   label: "Internet / Cable", icon: Wifi,         color: "text-indigo-600", bg: "bg-indigo-50" },
  { value: "parking",    label: "Parking",          icon: Car,          color: "text-zinc-600",   bg: "bg-zinc-100" },
  { value: "dues",       label: "Association Dues", icon: Building2,    color: "text-purple-600", bg: "bg-purple-50" },
  { value: "garbage",    label: "Garbage / Waste",  icon: Trash2,       color: "text-green-600",  bg: "bg-green-50" },
  { value: "other",      label: "Other",            icon: Receipt,      color: "text-zinc-500",   bg: "bg-zinc-50" },
];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // 0-indexed

/**
 * Given a lease start date string (YYYY-MM-DD) and a payment history array,
 * returns a combined timeline: paid entries + missed-month placeholders.
 * Only monthly_rent type matters for missed detection.
 */
function buildTimeline(leaseStart, paymentHistory, dueDay) {
  if (!leaseStart) return paymentHistory.slice();

  const start = new Date(leaseStart);
  const today = new Date();
  const todayDay = today.getDate();
  const dueDayNum = parseInt(dueDay || "1", 10);

  // Collect all paid months (for monthly rent only)
  const paidSet = new Set(
    paymentHistory
      .filter(p => !p.payment_type || p.payment_type === "monthly_rent")
      .map(p => `${p.year}-${p.month}`)
  );

  const entries = [...paymentHistory];

  // Walk from lease start to current month
  let y = start.getFullYear();
  let m = start.getMonth(); // 0-indexed

  while (y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth())) {
    const monthName = MONTHS[m];
    const key = `${y}-${monthName}`;

    // Skip current month if due date hasn't passed yet
    const isCurrentMonth = y === today.getFullYear() && m === today.getMonth();
    if (isCurrentMonth && todayDay < dueDayNum) {
      break;
    }

    if (!paidSet.has(key)) {
      entries.push({
        id: `missed-${key}`,
        month: monthName,
        year: String(y),
        missed: true,
        payment_type: "monthly_rent",
        recorded_at: new Date(y, m, dueDayNum).toISOString(),
      });
    }

    m++;
    if (m > 11) { m = 0; y++; }
  }

  // Sort newest first
  return entries.sort((a, b) => {
    const da = new Date(b.recorded_at || 0);
    const db = new Date(a.recorded_at || 0);
    return da - db;
  });
}

function Field({ label, value, fallback = "—" }) {
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-[0.08em] text-zinc-400 uppercase mb-0.5">{label}</div>
      <div className="text-[13px] text-zinc-800 font-medium">{value || <span className="text-zinc-400 font-normal">{fallback}</span>}</div>
    </div>
  );
}

export default function UnitPanel({ unit, onClose, isDrawerMode }) {
  const updateUnit = updateUnitDoc;

  // ── Edit mode state ───────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);

  // ── Unit fields ───────────────────────────────────────────────────────────
  const [unitLabel,     setUnitLabel]     = useState("");

  // ── Tenant fields ─────────────────────────────────────────────────────────
  const [status,        setStatus]        = useState("vacant");
  const [rent,          setRent]          = useState("");
  const [tenantName,    setTenantName]    = useState("");
  const [contact,       setContact]       = useState("");
  const [leaseStart,    setLeaseStart]    = useState("");
  const [leaseEnd,      setLeaseEnd]      = useState("");
  const [notes,         setNotes]         = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [rentDueDate,   setRentDueDate]   = useState("1");
  const [tenantPhotoUrl, setTenantPhotoUrl] = useState("");
  const [photoFile,     setPhotoFile]     = useState(null);

  // ── Smart Bills ────────────────────────────────────────────────────────────
  const [smartBills,    setSmartBills]    = useState([]);
  const [showBillForm,  setShowBillForm]  = useState(false);
  const [billType,      setBillType]      = useState("electric");
  const [billLabel,     setBillLabel]     = useState("");
  const [billAmount,    setBillAmount]    = useState("");
  const [billFreq,      setBillFreq]      = useState("monthly");
  const [billNotes,     setBillNotes]     = useState("");
  const [billSaving,    setBillSaving]    = useState(false);
  const [editBillId,    setEditBillId]    = useState(null);

  // ── Payment history ───────────────────────────────────────────────────────
  const [paymentHistory, setPaymentHistory] = useState([]); // [{id, month, year, amount, method, date_paid, screenshot_url}]

  // ── Record-payment form ───────────────────────────────────────────────────
  const [showPayForm,    setShowPayForm]   = useState(false);
  const [payMonth,       setPayMonth]      = useState(MONTHS[currentMonth]);
  const [payYear,        setPayYear]       = useState(String(currentYear));
  const [payAmount,      setPayAmount]     = useState("");
  const [payMethod,      setPayMethod]     = useState("Cash");
  const [payType,        setPayType]       = useState("monthly_rent");
  const [payDesc,        setPayDesc]       = useState("");
  const [payDatePaid,    setPayDatePaid]   = useState("");
  const [payFile,        setPayFile]       = useState(null);
  const [payFilePrev,    setPayFilePrev]   = useState(null);
  const [recordingSave,  setRecordingSave] = useState(false);
  const [expandedPayId,  setExpandedPayId] = useState(null);

  const [saving, setSaving] = useState(false);

  // ── Sync from unit prop ───────────────────────────────────────────────────
  useEffect(() => {
    if (unit) {
      setUnitLabel(unit.unit_label ?? "");
      setStatus(unit.status || "vacant");
      setRent(unit.monthly_rent ?? "");
      setTenantName(unit.tenant?.name ?? "");
      setContact(unit.tenant?.contact ?? "");
      setLeaseStart(unit.tenant?.lease_start ?? "");
      setLeaseEnd(unit.tenant?.lease_end ?? "");
      setNotes(unit.tenant?.notes ?? "");
      setPaymentMethod(unit.tenant?.payment_method ?? "Cash");
      setRentDueDate(unit.tenant?.rent_due_date ?? "1");
      setTenantPhotoUrl(unit.tenant?.tenant_photo_url ?? "");
      setPhotoFile(null);
      setPaymentHistory(unit.payment_history ?? []);
      setSmartBills(unit.smart_bills ?? []);
      setIsEditing(false);
      setShowPayForm(false);
      setShowBillForm(false);
    }
  }, [unit]);

  // ── Maintenance Tickets for this unit ──────────────────────────────────────
  const { tickets } = useMaintenanceTickets(unit?.buildingId);
  const unitTickets = tickets.filter(t => t.unitId === unit?.id);

  // ── Save tenant & unit details ────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!unit) return;
    setSaving(true);

    let photoUrl = tenantPhotoUrl;
    if (photoFile) {
      photoUrl = await uploadFile(`units/${unit.id}/tenant_photo_${Date.now()}`, photoFile);
    }

    await updateUnit(unit.ref, {
      unit_label: unitLabel.trim() || unit.unit_label || "101",
      status,
      monthly_rent: Number(rent) || 0,
      tenant: status === "vacant" ? null : {
        name: tenantName, contact,
        lease_start: leaseStart, lease_end: leaseEnd,
        notes, payment_method: paymentMethod,
        rent_due_date: rentDueDate,
        tenant_photo_url: photoUrl,
      },
    });
    setSaving(false);
    setIsEditing(false);
  };

  // ── Smart Bill helpers ────────────────────────────────────────────────────
  const handleAddBill = async (e) => {
    e.preventDefault();
    setBillSaving(true);
    const cfg = BILL_TYPES.find(b => b.value === billType);
    const newBill = {
      id: `bill-${Date.now()}`,
      type: billType,
      label: billLabel.trim() || cfg?.label || "Bill",
      amount: Number(billAmount) || 0,
      frequency: billFreq,
      notes: billNotes.trim(),
      created_at: new Date().toISOString(),
    };
    const updated = editBillId
      ? smartBills.map(b => b.id === editBillId ? { ...newBill, id: editBillId } : b)
      : [...smartBills, newBill];
    await updateUnit(unit.ref, { smart_bills: updated });
    setSmartBills(updated);
    setBillLabel(""); setBillAmount(""); setBillNotes(""); setBillFreq("monthly"); setBillType("electric");
    setShowBillForm(false); setEditBillId(null); setBillSaving(false);
  };

  const handleDeleteBill = async (billId) => {
    if (!confirm("Remove this bill?")) return;
    const updated = smartBills.filter(b => b.id !== billId);
    await updateUnit(unit.ref, { smart_bills: updated });
    setSmartBills(updated);
  };

  const handleEditBill = (bill) => {
    setEditBillId(bill.id);
    setBillType(bill.type);
    setBillLabel(bill.label);
    setBillAmount(String(bill.amount));
    setBillFreq(bill.frequency || "monthly");
    setBillNotes(bill.notes || "");
    setShowBillForm(true);
  };

  // ── Record a payment ──────────────────────────────────────────────────────
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setRecordingSave(true);

    let screenshotUrl = "";
    if (payFile) {
      screenshotUrl = await uploadFile(
        `units/${unit.id}/payments/${payYear}_${payMonth}_${Date.now()}`,
        payFile
      );
    }

    const newEntry = {
      id: `${payYear}-${payMonth}-${Date.now()}`,
      month: payMonth,
      year: payYear,
      payment_type: payType,
      description: payDesc,
      amount: Number(payAmount) || 0,
      method: payMethod,
      date_paid: payDatePaid,
      screenshot_url: screenshotUrl,
      recorded_at: new Date().toISOString(),
    };

    const updated = [newEntry, ...paymentHistory];
    await updateUnit(unit.ref, { payment_history: updated });
    setPaymentHistory(updated);

    // If recording a rent payment, flip overdue → occupied
    if (status === "overdue" && payType === "monthly_rent") {
      await updateUnit(unit.ref, { status: "occupied", payment_history: updated });
      setStatus("occupied");
    }

    setPayAmount(""); setPayDatePaid(""); setPayFile(null); setPayFilePrev(null);
    setPayDesc(""); setPayType("monthly_rent");
    setPayMonth(MONTHS[currentMonth]); setPayYear(String(currentYear));
    setShowPayForm(false);
    setRecordingSave(false);
  };

  // ── Mark a missed month as overdue ────────────────────────────────────────
  const handleMarkOverdue = async () => {
    await updateUnit(unit.ref, { status: "overdue" });
    setStatus("overdue");
  };

  if (!unit) return null;

  const curStatus = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  const displayPhoto = photoFile ? URL.createObjectURL(photoFile) : tenantPhotoUrl;

  const floatingClasses = "absolute top-8 bottom-8 right-10 z-[999] w-96 rounded-2xl border border-zinc-200 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]";
  const drawerClasses = "fixed top-0 right-0 h-full w-[420px] shadow-2xl z-[999] transition-transform border-l border-zinc-200";

  return (
    <>
      {isDrawerMode && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      )}
      <div className={`flex flex-col bg-white font-sans text-zinc-900 overflow-hidden ${isDrawerMode ? drawerClasses : floatingClasses}`}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Tenant photo */}
          {displayPhoto ? (
            <img src={displayPhoto} alt="Tenant" className="h-10 w-10 rounded-full object-cover border border-zinc-200 shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
              <User size={18} />
            </div>
          )}
          <div>
            <div className="text-[17px] font-semibold leading-tight text-zinc-900">
              {unit.unit_label || "Unnamed Unit"}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${curStatus.dot}`} />
              <span className="text-[12px] text-zinc-500">{curStatus.label} · Floor {unit.floor}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[12px] font-semibold text-zinc-600 transition hover:bg-zinc-100"
            >
              <Pencil size={12} />
              Edit
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[12px] font-semibold text-zinc-500 transition hover:bg-zinc-100"
            >
              <X size={12} />
              Cancel
            </button>
          )}
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Body (scrollable) ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* ── READ-ONLY VIEW ─────────────────────────────────────────────── */}
        {!isEditing && (
          <>
            {/* Rent + Smart Bill total */}
            {(() => {
              const monthlyExtras = smartBills.filter(b => b.frequency === "monthly").reduce((s, b) => s + (b.amount || 0), 0);
              const totalMonthly = (Number(unit.monthly_rent) || 0) + monthlyExtras;
              return (
                <div className="rounded-xl bg-[var(--color-blue-50)] shadow-md shadow-[var(--color-blue-100)] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-semibold tracking-[0.08em] text-[var(--color-blue-600)] uppercase">Monthly Rent</div>
                      <div className="text-[22px] font-bold text-[var(--color-blue-700)] leading-tight">
                        ₱{(Number(unit.monthly_rent) || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="text-[10px] font-semibold tracking-[0.08em] text-[var(--color-blue-600)] uppercase">Due Day</div>
                      <div className="text-[15px] font-semibold text-[var(--color-blue-700)]">
                        {unit.tenant?.rent_due_date ? `Day ${unit.tenant.rent_due_date}` : "—"}
                      </div>
                    </div>
                  </div>
                  {monthlyExtras > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-[var(--color-blue-200)] flex items-center justify-between">
                      <div className="text-[10px] text-[var(--color-blue-600)] font-semibold uppercase tracking-wide">Total w/ Bills</div>
                      <div className="text-[14px] font-bold text-[var(--color-blue-800)]">₱{totalMonthly.toLocaleString()}<span className="text-[10px] font-medium text-[var(--color-blue-500)] ml-1">(+₱{monthlyExtras.toLocaleString()} extras)</span></div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Tenant info */}
            {unit.status !== "vacant" && unit.tenant ? (
              <div className="space-y-3">
                <Field label="Tenant Name" value={unit.tenant.name} />
                <Field label="Contact" value={unit.tenant.contact} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Lease Start" value={unit.tenant.lease_start} />
                  <Field label="Lease End" value={unit.tenant.lease_end} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Payment Method" value={unit.tenant.payment_method} />
                </div>
                {unit.tenant.notes && <Field label="Notes" value={unit.tenant.notes} />}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-[13px] text-zinc-400">
                No tenant assigned. Click <strong>Edit</strong> to add one.
              </div>
            )}

            {/* ── SMART BILLS ──────────────────────────────────────────── */}
            {unit.status !== "vacant" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[12px] font-semibold tracking-[0.06em] text-zinc-500 uppercase flex items-center gap-1.5">
                    <CreditCard size={13} className="text-zinc-400" /> Smart Bills
                  </div>
                  <button
                    onClick={() => { setShowBillForm(v => !v); setEditBillId(null); setBillLabel(""); setBillAmount(""); setBillNotes(""); setBillFreq("monthly"); setBillType("electric"); }}
                    className="flex items-center gap-1 rounded-full bg-zinc-100 hover:bg-zinc-200 px-3 py-1 text-[11px] font-semibold text-zinc-600 transition"
                  >
                    <Plus size={11} />{showBillForm && !editBillId ? "Cancel" : "Add Bill"}
                  </button>
                </div>

                {/* Add / Edit Bill Form */}
                {showBillForm && (
                  <form onSubmit={handleAddBill} className="mb-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                    <div className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                      {editBillId ? "Edit Bill" : "New Smart Bill"}
                    </div>

                    {/* Bill type picker */}
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Bill Type</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {BILL_TYPES.map(bt => {
                          const Icon = bt.icon;
                          return (
                            <button key={bt.value} type="button" onClick={() => { setBillType(bt.value); if (!billLabel || BILL_TYPES.find(x => x.label === billLabel)) setBillLabel(bt.label); }}
                              className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-center transition text-[9.5px] font-semibold ${
                                billType === bt.value
                                  ? `${bt.bg} border-current ${bt.color} ring-1 ring-current`
                                  : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                              }`}>
                              <Icon size={14} />{bt.label.split(" ")[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Label override */}
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Bill Name / Label</label>
                      <input type="text" required value={billLabel} onChange={e => setBillLabel(e.target.value)}
                        placeholder="e.g. Meralco, MAYNILAD, PLDT"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-[var(--color-blue-600)] transition" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Amount */}
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Amount (₱)</label>
                        <input type="number" min="0" required value={billAmount} onChange={e => setBillAmount(e.target.value)}
                          placeholder="e.g. 1200"
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-[var(--color-blue-600)] transition" />
                      </div>
                      {/* Frequency */}
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Frequency</label>
                        <div className="flex gap-1.5 h-[34px]">
                          {[["monthly","Monthly"],["once","One-time"]].map(([v,l]) => (
                            <button key={v} type="button" onClick={() => setBillFreq(v)}
                              className={`flex-1 rounded-xl text-[11px] font-semibold border transition ${
                                billFreq === v ? "bg-[#0b3860] text-white border-[#0b3860]" : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                              }`}>{l}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Notes (optional)</label>
                      <input type="text" value={billNotes} onChange={e => setBillNotes(e.target.value)}
                        placeholder="e.g. Separate meter, included in rent…"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-[var(--color-blue-600)] transition" />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button type="submit" disabled={billSaving}
                        className="flex-1 rounded-xl bg-[var(--color-blue-600)] py-2 text-[12px] font-semibold text-white hover:bg-[var(--color-blue-700)] transition disabled:opacity-50">
                        {billSaving ? "Saving…" : editBillId ? "Update Bill" : "Add Bill"}
                      </button>
                      <button type="button" onClick={() => { setShowBillForm(false); setEditBillId(null); }}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-500 hover:bg-zinc-50">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Bills List */}
                {smartBills.length === 0 && !showBillForm ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-4 text-center text-[12px] text-zinc-400">
                    No extra bills added. Click <strong>Add Bill</strong> to track electric, water, etc.
                  </div>
                ) : smartBills.length > 0 && (
                  <div className="space-y-1.5">
                    {smartBills.map(bill => {
                      const cfg = BILL_TYPES.find(b => b.value === bill.type) || BILL_TYPES[BILL_TYPES.length - 1];
                      const Icon = cfg.icon;
                      return (
                        <div key={bill.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-3 py-2.5 hover:border-zinc-200 transition group">
                          <div className={`p-1.5 rounded-lg ${cfg.bg} shrink-0`}>
                            <Icon size={13} className={cfg.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-zinc-900 leading-tight truncate">{bill.label}</div>
                            {bill.notes && <div className="text-[10px] text-zinc-400 truncate">{bill.notes}</div>}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[13px] font-bold text-zinc-800">₱{(bill.amount || 0).toLocaleString()}</div>
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
                              bill.frequency === "monthly" ? "bg-blue-50 text-blue-600" : "bg-zinc-100 text-zinc-500"
                            }`}>{bill.frequency === "monthly" ? "Monthly" : "One-time"}</span>
                          </div>
                          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => handleEditBill(bill)} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition" title="Edit">
                              <Pencil size={11} />
                            </button>
                            <button onClick={() => handleDeleteBill(bill.id)} className="p-1 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition" title="Remove">
                              <X size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {/* Monthly total row */}
                    {smartBills.some(b => b.frequency === "monthly") && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-100 mt-1">
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Total Monthly Bills</span>
                        <span className="text-[13px] font-bold text-zinc-800">
                          ₱{smartBills.filter(b => b.frequency === "monthly").reduce((s, b) => s + (b.amount || 0), 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── PAYMENT HISTORY ──────────────────────────────────────── */}
            {unit.status !== "vacant" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[12px] font-semibold tracking-[0.06em] text-zinc-500 uppercase">Payment History</div>
                  <button
                    onClick={() => setShowPayForm((v) => !v)}
                    className="flex items-center gap-1 rounded-full bg-[var(--color-blue-600)] px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-[var(--color-blue-700)]"
                  >
                    <Plus size={11} />
                    Record Payment
                  </button>
                </div>

                {showPayForm && (
                  <form
                    onSubmit={handleRecordPayment}
                    className="mb-4 rounded-2xl border border-[var(--color-blue-200)] bg-[var(--color-blue-50)] p-4 space-y-3"
                  >
                    <div className="text-[11px] font-semibold text-[var(--color-blue-700)] uppercase tracking-wider">New Payment Entry</div>

                    {/* Payment type */}
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Payment Type</label>
                      <select
                        className="w-full rounded-xl border border-zinc-200 bg-white px-2 py-2 text-[12px] outline-none focus:border-[var(--color-blue-600)]"
                        value={payType}
                        onChange={(e) => setPayType(e.target.value)}
                      >
                        {PAYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>

                    {/* Month / Year — only for monthly rent */}
                    {payType === "monthly_rent" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">For Month</label>
                          <select
                            className="w-full rounded-xl border border-zinc-200 bg-white px-2 py-2 text-[12px] outline-none focus:border-[var(--color-blue-600)]"
                            value={payMonth}
                            onChange={(e) => setPayMonth(e.target.value)}
                          >
                            {MONTHS.map((m) => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Year</label>
                          <input
                            type="number" min="2020" max="2040"
                            className="w-full rounded-xl border border-zinc-200 bg-white px-2 py-2 text-[12px] outline-none focus:border-[var(--color-blue-600)]"
                            value={payYear}
                            onChange={(e) => setPayYear(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Description — for non-rent types */}
                    {payType !== "monthly_rent" && (
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Description</label>
                        <input
                          type="text"
                          className="w-full rounded-xl border border-zinc-200 bg-white px-2 py-2 text-[12px] outline-none focus:border-[var(--color-blue-600)]"
                          value={payDesc}
                          onChange={(e) => setPayDesc(e.target.value)}
                          placeholder="e.g. Broken faucet repair"
                          required
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Amount (₱)</label>
                        <input
                          type="number" min="0" required
                          className="w-full rounded-xl border border-zinc-200 bg-white px-2 py-2 text-[12px] outline-none focus:border-[var(--color-blue-600)]"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="e.g. 15000"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Date Paid</label>
                        <input
                          type="date" required
                          className="w-full rounded-xl border border-zinc-200 bg-white px-2 py-2 text-[12px] outline-none focus:border-[var(--color-blue-600)]"
                          value={payDatePaid}
                          onChange={(e) => setPayDatePaid(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Payment Method</label>
                      <select
                        className="w-full rounded-xl border border-zinc-200 bg-white px-2 py-2 text-[12px] outline-none focus:border-[var(--color-blue-600)]"
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                      >
                        <option>Cash</option>
                        <option>GCash</option>
                        <option>Bank Transfer</option>
                        <option>Check</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Receipt / Screenshot</label>
                      <input
                        type="file" accept="image/*"
                        className="w-full text-[11px] text-zinc-600 file:mr-2 file:rounded-full file:border-0 file:bg-white file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-zinc-700"
                        onChange={(e) => {
                          const f = e.target.files[0];
                          setPayFile(f);
                          setPayFilePrev(f ? URL.createObjectURL(f) : null);
                        }}
                      />
                      {payFilePrev && (
                        <img src={payFilePrev} alt="Receipt preview" className="mt-2 h-20 w-full rounded-xl object-cover border border-zinc-200" />
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={recordingSave}
                        className="flex-1 rounded-xl bg-[var(--color-blue-600)] py-2 text-[12px] font-semibold text-white transition hover:bg-[var(--color-blue-700)] disabled:opacity-50"
                      >
                        {recordingSave ? "Saving…" : "Record Payment"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPayForm(false)}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-500 hover:bg-zinc-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* History list — includes missed months */}
                {(() => {
                  const timeline = buildTimeline(
                    unit.tenant?.lease_start,
                    paymentHistory,
                    unit.tenant?.rent_due_date
                  );
                  const nonRentEntries = paymentHistory.filter(p => p.payment_type && p.payment_type !== "monthly_rent");
                  const allEntries = timeline;

                  if (allEntries.length === 0) return (
                    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-center text-[12px] text-zinc-400">
                      No payments recorded yet.
                    </div>
                  );

                  return (
                    <div className="space-y-2">
                      {allEntries.map((p) => {
                        const isMissed = p.missed;
                        const typeLabel = PAYMENT_TYPES.find(t => t.value === p.payment_type)?.label ?? "Monthly Rent";
                        const title = p.payment_type === "monthly_rent" || !p.payment_type
                          ? `${p.month} ${p.year}`
                          : p.description || typeLabel;
                        const sub = p.payment_type === "monthly_rent" || !p.payment_type
                          ? (isMissed ? "No payment recorded" : `₱${(p.amount || 0).toLocaleString()} · ${p.method}`)
                          : `₱${(p.amount || 0).toLocaleString()} · ${p.method} · ${p.date_paid || ""}`;

                        return (
                          <div key={p.id} className={`rounded-xl border overflow-hidden ${
                            isMissed ? "border-orange-200 bg-orange-50" : "border-zinc-100 bg-zinc-50"
                          }`}>
                          <div
                              type="button"
                              onClick={() => !isMissed && setExpandedPayId(expandedPayId === p.id ? null : p.id)}
                              className={`w-full flex items-center justify-between px-4 py-3 text-left transition select-none ${
                                isMissed ? "cursor-default" : "hover:bg-zinc-100 cursor-pointer"
                              }`}
                            >
                              <div>
                                <div className={`text-[13px] font-semibold ${ isMissed ? "text-orange-800" : "text-zinc-900"}`}>
                                  {title}
                                  {p.payment_type && p.payment_type !== "monthly_rent" && (
                                    <span className="ml-2 text-[10px] font-medium text-zinc-400">{typeLabel}</span>
                                  )}
                                </div>
                                <div className={`text-[11px] ${ isMissed ? "text-orange-600" : "text-zinc-500"}`}>{sub}</div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isMissed ? (
                                  <>
                                    <span className="rounded-full bg-orange-100 border border-orange-300 px-2 py-0.5 text-[10px] font-semibold text-orange-700">MISSED</span>
                                    {status !== "overdue" && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleMarkOverdue(); }}
                                        className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white transition hover:bg-red-600"
                                      >
                                        Mark Overdue
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span className="rounded-full bg-[var(--color-blue-50)] border border-[var(--color-blue-200)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-blue-700)]">PAID</span>
                                    {expandedPayId === p.id ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
                                  </>
                                )}
                              </div>
                            </div>
                            {!isMissed && expandedPayId === p.id && (
                              <div className="px-4 pb-3 space-y-2 border-t border-zinc-100">
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                  <Field label="Date Paid" value={p.date_paid} />
                                  <Field label="Method" value={p.method} />
                                </div>
                                {p.description && <Field label="Description" value={p.description} />}
                                {p.screenshot_url && (
                                  <div>
                                    <div className="text-[10px] font-semibold tracking-[0.08em] text-zinc-400 uppercase mb-1">Receipt</div>
                                    <a href={p.screenshot_url} target="_blank" rel="noopener noreferrer">
                                      <img src={p.screenshot_url} alt="Receipt" className="h-28 w-full rounded-xl object-cover border border-zinc-200 hover:opacity-90 transition" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── MAINTENANCE TICKETS ──────────────────────────────────────── */}
            {unit.status !== "vacant" && (
              <div>
                <div className="flex items-center justify-between mb-3 mt-6 border-t border-zinc-100 pt-6">
                  <div className="text-[12px] font-semibold tracking-[0.06em] text-zinc-500 uppercase">Active Maintenance</div>
                </div>
                {unitTickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-4 text-center text-[12px] text-zinc-400">
                    No active tickets.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unitTickets.map(t => (
                      <div key={t.id} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[13px] font-semibold text-zinc-900">{t.title}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            t.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 mb-2">{t.description}</div>
                        {t.assigned_to && (
                          <div className="text-[10px] font-medium text-zinc-400">Assigned: {t.assigned_to_name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── EDIT MODE ──────────────────────────────────────────────────── */}
        {isEditing && (
          <form id="unit-form" onSubmit={handleSave} className="space-y-5">
            {/* Unit Name / Number */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.08em] text-zinc-500 uppercase">UNIT NAME / NUMBER</label>
              <input
                type="text"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-[var(--color-blue-600)] focus:bg-white transition"
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                placeholder="e.g. 101, A-1, Studio B, Penthouse, Room 4"
                required
              />
              <p className="mt-1 text-[11px] text-zinc-400">Can be any format (numbers, letters, custom room names)</p>
            </div>

            {/* Status */}
            <div>
              <label className="mb-2 block text-[11px] font-semibold tracking-[0.08em] text-zinc-500">STATUS</label>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition border ${status === opt.value ? opt.pill + " ring-2 ring-current ring-offset-1" : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly Rent */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.08em] text-zinc-500">MONTHLY RENT (₱)</label>
              <input type="number" min="0"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-[var(--color-blue-600)] focus:bg-white transition"
                value={rent} onChange={(e) => setRent(e.target.value)}
              />
            </div>

            {status !== "vacant" && (
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 space-y-4">
                <div className="text-[10px] font-semibold tracking-[0.08em] text-zinc-500 uppercase">Tenant Details</div>

                {/* Tenant photo */}
                <div>
                  <label className="mb-1 block text-[10px] font-semibold tracking-[0.06em] text-zinc-500 uppercase">Photo</label>
                  <div className="flex items-center gap-3">
                    {displayPhoto ? (
                      <img src={displayPhoto} alt="Tenant" className="h-10 w-10 rounded-full object-cover border border-zinc-200 shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-400 shrink-0">
                        <User size={18} />
                      </div>
                    )}
                    <input type="file" accept="image/*"
                      className="w-full text-[12px] text-zinc-600 file:mr-2 file:rounded-full file:border-0 file:bg-zinc-200 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-zinc-700"
                      onChange={(e) => setPhotoFile(e.target.files[0])}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-semibold tracking-[0.06em] text-zinc-500 uppercase">Name</label>
                  <input type="text"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-900 outline-none focus:border-[var(--color-blue-600)] transition"
                    value={tenantName} onChange={(e) => setTenantName(e.target.value)}
                    required={status !== "vacant"} placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-semibold tracking-[0.06em] text-zinc-500 uppercase">Contact</label>
                  <input type="text"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-900 outline-none focus:border-[var(--color-blue-600)] transition"
                    value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+63 9XX XXX XXXX"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold tracking-[0.06em] text-zinc-500 uppercase">Lease Start</label>
                    <input type="date"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] text-zinc-900 outline-none focus:border-[var(--color-blue-600)] transition"
                      value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold tracking-[0.06em] text-zinc-500 uppercase">Lease End</label>
                    <input type="date"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] text-zinc-900 outline-none focus:border-[var(--color-blue-600)] transition"
                      value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold tracking-[0.06em] text-zinc-500 uppercase">Payment Method</label>
                    <select
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] text-zinc-900 outline-none focus:border-[var(--color-blue-600)] transition"
                      value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option>Cash</option>
                      <option>GCash</option>
                      <option>Bank Transfer</option>
                      <option>Check</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold tracking-[0.06em] text-zinc-500 uppercase">Due Day</label>
                    <input type="number" min="1" max="31"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] text-zinc-900 outline-none focus:border-[var(--color-blue-600)] transition"
                      value={rentDueDate} onChange={(e) => setRentDueDate(e.target.value)} placeholder="e.g. 5"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-semibold tracking-[0.06em] text-zinc-500 uppercase">Notes</label>
                  <textarea rows="2"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] text-zinc-900 outline-none focus:border-[var(--color-blue-600)] transition resize-none"
                    value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…"
                  />
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      {isEditing && (
        <div className="border-t border-zinc-100 bg-zinc-50/50 px-6 py-4 shrink-0">
          <button
            type="submit" form="unit-form" disabled={saving}
            className="w-full rounded-xl bg-[var(--color-blue-600)] py-2.5 text-[14px] font-semibold text-white transition hover:bg-[var(--color-blue-700)] disabled:opacity-50 shadow-sm"
          >
            {saving ? "Saving…" : "Save Changes →"}
          </button>
        </div>
      )}
    </div>
    </>
  );
}
