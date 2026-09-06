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
  { value: "electric",     label: "Electric Bill" },
  { value: "water",        label: "Water Bill" },
  { value: "internet",     label: "Internet / Cable" },
  { value: "dues",         label: "Association Dues" },
  { value: "garbage",      label: "Garbage / Waste" },
  { value: "parking",      label: "Parking" },
  { value: "maintenance",  label: "Maintenance / Repair" },
  { value: "late_fee",     label: "Late Fee" },
  { value: "other",        label: "Other" },
];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // 0-indexed

/**
 * Given a lease start date string (YYYY-MM-DD) and a payment history array (which we now treat as monthly statements),
 * returns a combined timeline: generated statements + missing month placeholders.
 */
function buildStatements(leaseStart, statements = [], dueDay) {
  if (!Array.isArray(statements)) statements = [];
  if (!leaseStart) return [...statements];

  const today = new Date();
  const todayDay = today.getDate();
  const dueDayNum = parseInt(dueDay || "1", 10);

  // Extract year and month safely without UTC timezone shift
  let y, m;
  if (typeof leaseStart === "string" && leaseStart.includes("-")) {
    const parts = leaseStart.split("-");
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10) - 1;
    if (isNaN(y) || isNaN(m)) return [...statements];
  } else {
    const start = new Date(leaseStart);
    if (isNaN(start.getTime())) return [...statements];
    y = start.getFullYear();
    m = start.getMonth();
  }

  // Collect existing statements by id
  const existingMap = new Map();
  statements.forEach(s => {
    existingMap.set(`${s.year}-${s.month}`, s);
  });

  const entries = [];
  
  // Also include any statements that somehow exist before the lease start or after today (edge cases)
  statements.forEach(s => {
    entries.push(s);
  });

  // Walk from lease start to current month
  while (y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth())) {
    const monthName = MONTHS[m];
    const key = `${y}-${monthName}`;

    // Skip current month if due date hasn't passed yet
    const isCurrentMonth = y === today.getFullYear() && m === today.getMonth();
    if (isCurrentMonth && todayDay < dueDayNum) {
      break;
    }

    if (!existingMap.has(key)) {
      // Add placeholder for missing bill
      entries.push({
        id: `missing-${key}`,
        month: monthName,
        year: String(y),
        is_missing: true, // Needs to be billed
        recorded_at: new Date(y, m, dueDayNum).toISOString(),
      });
    }

    m++;
    if (m > 11) { m = 0; y++; }
  }

  // Sort newest first, filter out duplicates by id
  const uniqueEntries = Array.from(new Map(entries.map(e => [e.id, e])).values());
  
  return uniqueEntries.sort((a, b) => {
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

export default function UnitPanel({ unit, onClose, isDrawerMode, onNavigateToMaintenance }) {
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



  // ── Payment history (Monthly Statements) ───────────────────────────────────────────────────────
  const [paymentHistory, setPaymentHistory] = useState([]);

  // ── Create Bill Form State ──────────────────────────────────────────────
  const [showBillForm, setShowBillForm] = useState(false);
  const [billMonth, setBillMonth]       = useState("");
  const [billYear, setBillYear]         = useState("");
  const [billRent, setBillRent]         = useState(0);
  const [billElectric, setBillElectric] = useState("");
  const [billWater, setBillWater]       = useState("");
  const [billOther, setBillOther]       = useState("");
  const [billNotes, setBillNotes]       = useState("");

  // ── Record Payment Form State ───────────────────────────────────────────
  const [showPayForm,    setShowPayForm]   = useState(false);
  const [payTargetId,    setPayTargetId]   = useState(null); // The ID of the statement being paid
  const [payMethod,      setPayMethod]     = useState("Cash");
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
      setIsEditing(false);
      setShowPayForm(false);
      setShowBillForm(false);
    }
  }, [unit]);

  // ── Maintenance Tickets for this unit ──────────────────────────────────────
  const { tickets } = useMaintenanceTickets(unit?.buildingId);
  const unitTickets = tickets.filter(t => t.unit_id === unit?.id && (t.status !== "settled" || !t.is_paid));

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



  // ── Create a Monthly Bill ──────────────────────────────────────────────
  const handleCreateBill = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const newBill = {
      id: `${billYear}-${billMonth}`,
      month: billMonth,
      year: billYear,
      rent_amount: Number(billRent) || 0,
      electric_amount: Number(billElectric) || 0,
      water_amount: Number(billWater) || 0,
      other_amount: Number(billOther) || 0,
      notes: billNotes,
      recorded_at: new Date().toISOString(),
    };
    
    const existingIndex = paymentHistory.findIndex(p => p.id === newBill.id);
    let updated;
    if (existingIndex >= 0) {
      updated = [...paymentHistory];
      updated[existingIndex] = { ...updated[existingIndex], ...newBill };
    } else {
      newBill.is_paid = false;
      newBill.date_paid = "";
      newBill.method = "";
      newBill.screenshot_url = "";
      updated = [newBill, ...paymentHistory];
    }
    
    await updateUnit(unit.ref, { payment_history: updated });
    setPaymentHistory(updated);
    
    setShowBillForm(false);
    setSaving(false);
  };

  // ── Record Payment for a Bill ──────────────────────────────────────────
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setRecordingSave(true);
    
    let screenshotUrl = "";
    if (payFile) {
      const safeName = payFile.name ? payFile.name.replace(/[^a-zA-Z0-9.-]/g, "_") : "receipt";
      screenshotUrl = await uploadFile(
        `units/${unit.id}/payments/${payTargetId}_${Date.now()}_${safeName}`,
        payFile
      );
    }
    
    const updated = paymentHistory.map(p => {
      if (p.id === payTargetId) {
        return {
          ...p,
          is_paid: true,
          date_paid: payDatePaid,
          method: payMethod,
          screenshot_url: screenshotUrl || p.screenshot_url,
        };
      }
      return p;
    });
    
    await updateUnit(unit.ref, { payment_history: updated });
    setPaymentHistory(updated);
    
    if (status === "overdue") {
      await updateUnit(unit.ref, { status: "occupied" });
      setStatus("occupied");
    }
    
    setShowPayForm(false);
    setPayTargetId(null);
    setPayDatePaid("");
    setPayFile(null);
    setPayFilePrev(null);
    setRecordingSave(false);
  };

  // ── Delete a Statement ──────────────────────────────────────────────────
  const handleDeleteStatement = async (statementId) => {
    if (!confirm("Are you sure you want to delete this statement?")) return;
    const updated = paymentHistory.filter(p => p.id !== statementId);
    await updateUnit(unit.ref, { payment_history: updated });
    setPaymentHistory(updated);
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
            {/* Rent Card */}
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
            </div>

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


            {/* ── MONTHLY STATEMENTS ──────────────────────────────────────── */}
            {unit.status !== "vacant" && (
              <div>
                <div className="flex items-center justify-between mb-3 border-t border-zinc-100 pt-6 mt-2">
                  <div className="text-[12px] font-semibold tracking-[0.06em] text-zinc-500 uppercase">Monthly Statements</div>
                </div>

                {/* Create Bill Form */}
                {showBillForm && (
                  <form onSubmit={handleCreateBill} className="mb-4 rounded-2xl border border-[var(--color-blue-200)] bg-[var(--color-blue-50)] p-4 space-y-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-blue-700)]">
                      Create Bill: {billMonth} {billYear}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Rent (Fixed)</label>
                        <div className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-[12px] text-zinc-500 cursor-not-allowed">
                          ₱{Number(billRent).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Electric Bill</label>
                        <input type="number" min="0" value={billElectric} onChange={(e) => setBillElectric(e.target.value)} placeholder="0" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-[var(--color-blue-600)]" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Water Bill</label>
                        <input type="number" min="0" value={billWater} onChange={(e) => setBillWater(e.target.value)} placeholder="0" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-[var(--color-blue-600)]" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Other / Extras</label>
                        <input type="number" min="0" value={billOther} onChange={(e) => setBillOther(e.target.value)} placeholder="0" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-[var(--color-blue-600)]" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Notes (Optional)</label>
                      <input type="text" value={billNotes} onChange={(e) => setBillNotes(e.target.value)} placeholder="e.g. Broken faucet repair included in Others" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-[var(--color-blue-600)]" />
                    </div>
                    
                    <div className="pt-2 flex items-center justify-between border-t border-[var(--color-blue-100)]">
                      <div className="text-[12px] font-semibold text-[var(--color-blue-700)]">Total: ₱{(Number(billRent) + (Number(billElectric)||0) + (Number(billWater)||0) + (Number(billOther)||0)).toLocaleString()}</div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowBillForm(false)} className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-zinc-500 hover:bg-zinc-100 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-xl bg-[var(--color-blue-600)] hover:bg-[var(--color-blue-700)] text-white text-[11px] font-semibold transition disabled:opacity-50">Save Bill</button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Record Payment Form */}
                {showPayForm && (
                  <form onSubmit={handleRecordPayment} className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 space-y-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-green-700">Record Payment</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-green-700/70 uppercase tracking-wider">Date Paid</label>
                        <input type="date" required value={payDatePaid} onChange={(e) => setPayDatePaid(e.target.value)} className="w-full rounded-xl border border-green-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-green-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-green-700/70 uppercase tracking-wider">Payment Method</label>
                        <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full rounded-xl border border-green-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-green-500">
                          <option>Cash</option>
                          <option>GCash</option>
                          <option>Bank Transfer</option>
                          <option>Check</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-green-700/70 uppercase tracking-wider">Receipt / Screenshot</label>
                      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; setPayFile(f || null); setPayFilePrev(f ? URL.createObjectURL(f) : null); }} className="w-full text-[11px] text-green-700 file:mr-2 file:rounded-full file:border-0 file:bg-white file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-green-700" />
                      {payFilePrev && <img src={payFilePrev} alt="Receipt preview" className="mt-2 h-20 w-full rounded-xl object-cover border border-green-200" />}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => { setShowPayForm(false); setPayTargetId(null); }} className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-zinc-500 hover:bg-zinc-100 transition border border-transparent bg-white">Cancel</button>
                      <button type="submit" disabled={recordingSave} className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white py-2 text-[12px] font-semibold transition disabled:opacity-50">Confirm Payment</button>
                    </div>
                  </form>
                )}

                {/* History list — statements */}
                {(() => {
                  const statements = buildStatements(
                    unit.tenant?.lease_start,
                    paymentHistory,
                    unit.tenant?.rent_due_date
                  );

                  if (statements.length === 0) return (
                    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-center text-[12px] text-zinc-400">
                      No statements found.
                    </div>
                  );

                  return (
                    <div className="space-y-3">
                      {statements.map((s) => {
                        const total = (Number(s.rent_amount)||0) + (Number(s.electric_amount)||0) + (Number(s.water_amount)||0) + (Number(s.other_amount)||0);
                        
                        if (s.is_missing) {
                          return (
                            <div key={s.id} className="rounded-xl border border-dashed border-orange-200 bg-orange-50 px-4 py-3 flex items-center justify-between">
                              <div>
                                <div className="text-[13px] font-semibold text-orange-800">{s.month} {s.year}</div>
                                <div className="text-[11px] text-orange-600">Not billed yet</div>
                              </div>
                              <button
                                onClick={() => { setBillMonth(s.month); setBillYear(s.year); setBillRent(unit.monthly_rent || 0); setShowBillForm(true); setShowPayForm(false); }}
                                className="rounded-full bg-orange-100 px-3 py-1 text-[11px] font-semibold text-orange-700 hover:bg-orange-200 transition"
                              >
                                Create Bill
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div key={s.id} className={`rounded-xl border overflow-hidden ${!s.is_paid ? "border-orange-200 bg-orange-50" : "border-zinc-100 bg-zinc-50"}`}>
                            <div type="button" onClick={() => setExpandedPayId(expandedPayId === s.id ? null : s.id)} className={`w-full flex items-center justify-between px-4 py-3 text-left transition select-none cursor-pointer hover:bg-zinc-100/50`}>
                              <div>
                                <div className={`text-[13px] font-semibold ${ !s.is_paid ? "text-orange-800" : "text-zinc-900"}`}>{s.month} {s.year}</div>
                                <div className={`text-[11px] font-bold ${ !s.is_paid ? "text-orange-600" : "text-zinc-500"}`}>
                                  ₱{total.toLocaleString()} {s.is_paid ? `· Paid on ${s.date_paid}` : ""}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {!s.is_paid ? (
                                  <>
                                    <span className="rounded-full bg-orange-100 border border-orange-300 px-2 py-0.5 text-[10px] font-semibold text-orange-700">UNPAID</span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setPayTargetId(s.id); setShowPayForm(true); setShowBillForm(false); setPayDatePaid(new Date().toISOString().split('T')[0]); }}
                                      className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-semibold text-white transition hover:bg-green-600"
                                    >
                                      Mark Paid
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="rounded-full bg-green-100 border border-green-300 px-2 py-0.5 text-[10px] font-semibold text-green-700">PAID</span>
                                    {expandedPayId === s.id ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {expandedPayId === s.id && (
                              <div className="px-4 pb-3 pt-2 space-y-3 border-t border-zinc-100/50 bg-white">
                                {/* Bill Breakdown */}
                                <div>
                                  <div className="text-[10px] font-semibold tracking-[0.08em] text-zinc-400 uppercase mb-1">Bill Breakdown</div>
                                  <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-2 rounded-lg text-[11px]">
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Rent:</span><span className="font-semibold text-zinc-700">₱{(Number(s.rent_amount)||0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Electric:</span><span className="font-semibold text-zinc-700">₱{(Number(s.electric_amount)||0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Water:</span><span className="font-semibold text-zinc-700">₱{(Number(s.water_amount)||0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-zinc-500">Other:</span><span className="font-semibold text-zinc-700">₱{(Number(s.other_amount)||0).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                                {s.notes && (
                                  <div>
                                    <div className="text-[10px] font-semibold tracking-[0.08em] text-zinc-400 uppercase mb-0.5">Notes</div>
                                    <div className="text-[11px] text-zinc-600">{s.notes}</div>
                                  </div>
                                )}
                                {s.is_paid && (
                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100">
                                    <Field label="Method" value={s.method} />
                                    {s.screenshot_url && (
                                      <div>
                                        <div className="text-[10px] font-semibold tracking-[0.08em] text-zinc-400 uppercase mb-1">Receipt</div>
                                        <a href={s.screenshot_url} target="_blank" rel="noopener noreferrer">
                                          <img src={s.screenshot_url} alt="Receipt" className="h-16 w-full rounded-lg object-cover border border-zinc-200 hover:opacity-90 transition" />
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="flex justify-end gap-3 pt-2">
                                  <button onClick={() => {
                                    setBillMonth(s.month);
                                    setBillYear(s.year);
                                    setBillRent(s.rent_amount || 0);
                                    setBillElectric(s.electric_amount || "");
                                    setBillWater(s.water_amount || "");
                                    setBillOther(s.other_amount || "");
                                    setBillNotes(s.notes || "");
                                    setShowBillForm(true);
                                    setShowPayForm(false);
                                    setExpandedPayId(null);
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                  }} className="flex items-center gap-1 text-[10px] font-semibold text-[var(--color-blue-600)] hover:text-[var(--color-blue-800)] transition">
                                    <Pencil size={12} /> Edit Bill
                                  </button>
                                  <button onClick={() => handleDeleteStatement(s.id)} className="flex items-center gap-1 text-[10px] font-semibold text-red-500 hover:text-red-700 transition">
                                    <Trash2 size={12} /> Delete Bill
                                  </button>
                                </div>
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
                          <div className="flex gap-1">
                            {!t.is_paid && t.billing_type === "separate_tenant_bill" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                UNPAID BILL
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              t.status === 'reported' ? 'bg-red-100 text-red-700' :
                              t.status === 'approved' ? 'bg-amber-100 text-amber-700' :
                              t.status === 'work_finished' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {t.status.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-zinc-500 mb-2">{t.description}</div>
                        <div className="flex items-center justify-between">
                          {t.assigned_to ? (
                            <div className="text-[10px] font-medium text-zinc-400">Assigned: {t.assigned_to_name}</div>
                          ) : <div />}
                          <div className="flex items-center gap-2">
                            {t.total_cost > 0 && (
                              <div className="text-[11px] font-bold text-zinc-700">₱{t.total_cost.toLocaleString()}</div>
                            )}
                            {onNavigateToMaintenance && !t.is_paid && t.total_cost > 0 && (
                              <button onClick={onNavigateToMaintenance} className="text-[10px] font-bold bg-[#0b3860] text-white px-2.5 py-1 rounded-full hover:bg-[#154e83] transition">
                                Pay
                              </button>
                            )}
                          </div>
                        </div>
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
