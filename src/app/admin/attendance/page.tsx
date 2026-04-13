"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";

export default function AdminAttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const empsRes: any = await fetch("/api/employees").then(r => r.json()).catch(() => ({ employees: [] }));
      const attRes: any = await fetch(`/api/attendance?mode=month&month=${selectedMonth}`).then(r => r.json()).catch(() => ({ records: [] }));
      setEmployees(empsRes.employees || []);
      setRecords(attRes.records || []);
      setLoading(false);
    }
    load();
  }, [selectedMonth]);

  const empMap = Object.fromEntries((employees).map(e => [e.id, e]));

  // Stats
  const presentCount = records.filter(r => r.status === "present").length;
  const lateCount = records.filter(r => r.status === "late").length;
  const halfDayCount = records.filter(r => r.status === "half_day").length;

  // Group by employee
  const byEmployee: Record<string, any[]> = {};
  records.forEach(r => {
    if (!byEmployee[r.employeeId]) byEmployee[r.employeeId] = [];
    byEmployee[r.employeeId].push(r);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Present", value: presentCount, color: "text-green-600" },
          { label: "Late", value: lateCount, color: "text-amber-600" },
          { label: "Half Day", value: halfDayCount, color: "text-blue-600" },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`kpi-number ${s.color}`}>{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Per-employee breakdown */}
      <div className="card">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Employee Breakdown</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : employees.filter(e => e.isActive).length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">No employees</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Employee", "Present", "Late", "Half Day", "Alerts"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.filter(e => e.isActive).map(emp => {
                  const empRecords = byEmployee[emp.id] || [];
                  const present = empRecords.filter(r => r.status === "present").length;
                  const late = empRecords.filter(r => r.status === "late").length;
                  const halfDay = empRecords.filter(r => r.status === "half_day").length;
                  const alerts = empRecords.filter(r => r.locationFlag === "outside_office");
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-slate-800">{emp.name}</div>
                        <div className="text-xs text-slate-400">{emp.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600 font-medium">{present}</td>
                      <td className="px-4 py-3 text-sm text-amber-600 font-medium">{late}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 font-medium">{halfDay}</td>
                      <td className="px-4 py-3">
                        {alerts.length > 0 && (
                          <span className="status-badge bg-red-50 text-red-700">{alerts.length} outside office</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}