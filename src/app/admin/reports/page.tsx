"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";

export default function AdminReportsPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/employees").then(r => r.json()),
      fetch(`/api/reports?month=${month}`).then(r => r.json()),
    ]).then(([emps, rep]) => {
      setEmployees(emps.employees || []);
      setReports(rep);
      setLoading(false);
    });
  }, [month]);

  const empMap = Object.fromEntries((employees).map(e => [e.id, e]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <input type="month" value={month} min="2026-04"
          onChange={e => setMonth(e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Overall stats */}
      {reports?.overall && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Present", value: reports.overall.totalPresent, color: "text-green-600" },
            { label: "Total Late", value: reports.overall.totalLate, color: "text-amber-600" },
            { label: "Total Absent", value: reports.overall.totalAbsent, color: "text-red-600" },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <div className={`kpi-number ${s.color}`}>{s.value}</div>
              <div className="kpi-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Per-employee report */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Employee Performance</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : !reports?.employeeStats?.length ? (
          <div className="p-8 text-center text-sm text-slate-400">No data for this month</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Employee", "Present", "Late", "Absent", "Working Days", "LOP Days", "Late Fine", "Final Salary"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.employeeStats.map((emp: any) => (
                  <tr key={emp.employee.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-slate-800">{emp.employee.name}</div>
                      <div className="text-xs text-slate-400">{emp.employee.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">{emp.totalPresent}</td>
                    <td className="px-4 py-3 text-sm text-amber-600 font-medium">{emp.totalLate}</td>
                    <td className="px-4 py-3 text-sm text-red-600 font-medium">{emp.totalAbsent}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{emp.totalWorkingDays}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{emp.salary.totalLopDays}</td>
                    <td className="px-4 py-3 text-sm">
                      {emp.salary.lateFine > 0 ? (
                        <span className="text-red-600">₹{emp.salary.lateFine}</span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-slate-800">₹{(emp.salary.finalSalary || 0).toLocaleString("en-IN")}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Calculation explanation */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-600 mb-1">Salary Calculation:</p>
        <p>Per Day = Monthly ÷ 30 &nbsp;|&nbsp; LOP from Late = floor(Late ÷ 3) &nbsp;|&nbsp; Late Fine = (Late % 3) × ₹100 &nbsp;|&nbsp; Total LOP = Absent + LOP from Late &nbsp;|&nbsp; Final = Monthly − (Total LOP × Per Day) − Late Fine − Fail Deduction</p>
      </div>
    </div>
  );
}