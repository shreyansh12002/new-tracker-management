"use client";

import { useState, useEffect } from "react";

export default function AdminSalaryPage() {
  const [employeeStats, setEmployeeStats] = useState<any[]>([]);
  const [overall, setOverall] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [deductionModal, setDeductionModal] = useState<{ open: boolean; employeeId: string; employeeName: string; month: string } | null>(null);
  const [deductionRecords, setDeductionRecords] = useState<any[]>([]);
  const [newAmount, setNewAmount] = useState("");
  const [newReason, setNewReason] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [deductionError, setDeductionError] = useState("");

  useEffect(() => { fetchData(); }, [month]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?month=${month}`);
      const data = await res.json();
      if (data.employeeStats) setEmployeeStats(data.employeeStats);
      if (data.overall) setOverall(data.overall);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function openDeductionModal(employeeId: string, employeeName: string, empMonth: string) {
    setDeductionModal({ open: true, employeeId, employeeName, month: empMonth });
    setNewAmount(""); setNewReason(""); setDeductionError("");
    try {
      const res = await fetch(`/api/failed-deductions?employeeId=${employeeId}&month=${empMonth}`);
      setDeductionRecords(await res.json());
    } catch (e) { setDeductionRecords([]); }
  }

  function closeDeductionModal() {
    setDeductionModal(null);
    setDeductionRecords([]);
  }

  async function handleSaveDeduction() {
    const amt = parseFloat(newAmount);
    if (isNaN(amt) || amt < 0) { setDeductionError("Enter a valid amount"); return; }
    setSaveLoading(true);
    try {
      const res = await fetch("/api/failed-deductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: deductionModal!.employeeId, month: deductionModal!.month, amount: amt, reason: newReason.trim() || undefined }),
      });
      if (res.ok) { fetchData(); setNewAmount(""); setNewReason(""); }
      else setDeductionError((await res.json()).error);
    } catch (e) { setDeductionError("Something went wrong"); }
    setSaveLoading(false);
  }

  async function handleDeleteDeduction(id: string) {
    if (!confirm("Remove this deduction?")) return;
    await fetch(`/api/failed-deductions?id=${id}`, { method: "DELETE" });
    setDeductionRecords(prev => prev.filter(r => r.id !== id));
    fetchData();
  }

  if (loading) {
    return <div className="space-y-4"><div className="h-8 w-32 bg-slate-200 rounded animate-pulse" /><div className="h-64 card animate-pulse" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Salary Report</h1>
        <input type="month" value={month} min="2026-04" onChange={e => setMonth(e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {overall && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Present", value: overall.totalPresent, color: "text-green-600" },
            { label: "Total Late", value: overall.totalLate, color: "text-amber-600" },
            { label: "Total Absent", value: overall.totalAbsent, color: "text-red-600" },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <div className={`kpi-number ${s.color}`}>{s.value ?? 0}</div>
              <div className="kpi-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden overflow-x-auto">
        <div className="p-4 border-b border-slate-100"><h2 className="font-semibold text-slate-700">Employee Salary Breakdown</h2></div>
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {["Employee", "Monthly Salary", "Present", "Late", "Absent", "LOP Days", "Late Fine", "Fail Ded.", "Final Salary"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employeeStats.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">No data</td></tr>
            ) : employeeStats.map((emp: any) => (
              <tr key={emp.employee.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-sm text-slate-800">{emp.employee.name}</div>
                  <div className="text-xs text-slate-400">{emp.employee.employeeCode}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">₹{(emp.employee.monthlySalary || 30000).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 text-sm text-green-600 font-medium">{emp.totalPresent}</td>
                <td className="px-4 py-3 text-sm text-amber-600 font-medium">{emp.totalLate}</td>
                <td className="px-4 py-3 text-sm text-red-600 font-medium">{emp.totalAbsent}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{emp.salary.totalLopDays ?? 0}</td>
                <td className="px-4 py-3 text-sm">
                  {emp.salary.lateFine ? <span className="text-red-600">₹{emp.salary.lateFine}</span> : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {emp.salary.failDeduction > 0 ? (
                    <button onClick={() => openDeductionModal(emp.employee.id, emp.employee.name, month)}
                      className="text-red-600 hover:text-red-700 hover:underline font-medium" title="Click to edit">
                      ₹{emp.salary.failDeduction.toLocaleString("en-IN")}
                    </button>
                  ) : (
                    <button onClick={() => openDeductionModal(emp.employee.id, emp.employee.name, month)}
                      className="text-slate-400 hover:text-red-500 text-xs" title="Add deduction">+ Add</button>
                  )}
                </td>
                <td className="px-4 py-3"><span className="text-sm font-bold text-slate-800">₹{(emp.salary.finalSalary || 0).toLocaleString("en-IN")}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-600 mb-1">Salary Calculation:</p>
        <p>Per Day = Monthly ÷ 30 &nbsp;|&nbsp; LOP from Late = floor(Late ÷ 3) &nbsp;|&nbsp; Late Fine = (Late % 3) × ₹100 &nbsp;|&nbsp; Total LOP = Absent + LOP from Late &nbsp;|&nbsp; Final = Monthly − (Total LOP × Per Day) − Late Fine − Fail Deduction</p>
      </div>

      {/* Deduction Modal */}
      {deductionModal?.open && (
        <div className="modal-overlay">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">Failed Deductions</h3>
                <p className="text-xs text-slate-500 mt-0.5">{deductionModal.employeeName} · {deductionModal.month}</p>
              </div>
              <button onClick={closeDeductionModal} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {deductionRecords.length === 0 ? (
                <div className="text-center py-4 text-sm text-slate-400 bg-slate-50 rounded-lg">No deductions recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {deductionRecords.map(rec => (
                    <div key={rec.id} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-red-700">₹{rec.amount.toLocaleString("en-IN")}</span>
                        {rec.reason && <p className="text-xs text-slate-600 mt-0.5">{rec.reason}</p>}
                      </div>
                      <button onClick={() => handleDeleteDeduction(rec.id)} className="shrink-0 text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-100">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add New Deduction</p>
                {deductionError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{deductionError}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Amount (₹)</label>
                    <input type="number" min="0" step="100" placeholder="e.g. 500" value={newAmount}
                      onChange={e => setNewAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Category</label>
                    <select value={newReason} onChange={e => setNewReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                      <option value="">Select</option>
                      <option value="Plagiarism detected">Plagiarism</option>
                      <option value="Low quality content">Low quality</option>
                      <option value="Missed deadline">Missed deadline</option>
                      <option value="Incorrect format">Incorrect format</option>
                      <option value="Failed review">Failed review</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                {newReason === "Other" && (
                  <input type="text" placeholder="Describe reason..." value={newReason}
                    onChange={e => setNewReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                )}
                <button onClick={handleSaveDeduction} disabled={saveLoading || !newAmount}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {saveLoading ? "Saving..." : "Save Deduction"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}