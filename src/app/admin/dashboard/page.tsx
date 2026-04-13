"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ totalEmps: 0, activeToday: 0, lateToday: 0, totalTasks: 0 });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const empsData: any = await fetch("/api/employees").then(r => r.json()).catch(() => ({ employees: [] }));
      const tasksData: any = await fetch("/api/tasks").then(r => r.json()).catch(() => ({ tasks: [] }));
      const attData: any = await fetch("/api/attendance?mode=overview").then(r => r.json()).catch(() => ({ records: [] }));
      setEmployeeList(empsData.employees || []);
      const today = new Date().toISOString().split("T")[0];
      const todayRecs = (attData.records || []).filter((r: any) => r.date === today);
      setStats({
        totalEmps: (empsData.employees || []).filter((e: any) => e.isActive).length,
        activeToday: todayRecs.filter((r: any) => r.status === "present" || r.status === "late").length,
        lateToday: todayRecs.filter((r: any) => r.status === "late").length,
        totalTasks: (tasksData.tasks || []).length,
      });
      const allTasks = tasksData.tasks || [];
      setRecentTasks(allTasks.slice(0, 10));
      setAlerts(todayRecs.filter((r: any) => r.isLate || r.locationFlag));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 card animate-pulse" />)}
        </div>
        <div className="h-64 card animate-pulse" />
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    assigned: "bg-blue-50 text-blue-700",
    not_started: "bg-slate-100 text-slate-600",
    in_progress: "bg-amber-50 text-amber-700",
    completed: "bg-green-50 text-green-700",
    on_hold: "bg-orange-50 text-orange-700",
    cancelled: "bg-red-50 text-red-700",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Employees", value: stats.totalEmps, color: "text-blue-600" },
          { label: "Active Today", value: stats.activeToday, color: "text-green-600" },
          { label: "Late Today", value: stats.lateToday, color: "text-amber-600" },
          { label: "Total Tasks", value: stats.totalTasks, color: "text-purple-600" },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`kpi-number ${s.color}`}>{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="card p-4 border-red-200 bg-red-50">
          <h3 className="font-semibold text-slate-700 mb-3">Today&apos;s Alerts</h3>
          <div className="space-y-2">
            {alerts.map((a: any) => {
              const emp = employeeList.find((e: any) => e.id === a.employeeId);
              return (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <span className="font-medium text-slate-800">{emp?.name || "Unknown"}</span>
                  <span className={`status-badge ${a.status === "late" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                    {a.status === "late" ? "Late" : "Alert"}
                  </span>
                  <span className="text-slate-500">{a.checkInTime}</span>
                  {a.distance && a.distance !== "0" && (
                    <span className="text-slate-400 text-xs">
                      {parseInt(a.distance) < 1000 ? `${a.distance}m away` : `${(parseInt(a.distance)/1000).toFixed(1)}km away`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Tasks */}
      <div className="card">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Recent Tasks</h2>
          <Link href="/admin/tasks" className="text-xs text-blue-600 hover:underline font-medium">View all</Link>
        </div>
        {recentTasks.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">No tasks yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTasks.map((t: any) => {
                  const emp = employeeList.find((e: any) => e.id === t.employeeId);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-800">{t.title}</div>
                        <div className="text-xs text-slate-400">{emp?.name || "Unknown"}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 capitalize">{t.category?.replace("_", " ")}</td>
                      <td className="px-4 py-3">
                        <span className={`status-badge ${statusColor[t.status] || "bg-slate-100 text-slate-600"}`}>
                          {t.status?.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Overview */}
      <div className="card p-4">
        <h2 className="font-semibold text-slate-700 mb-4">Team Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {employeeList.filter((e: any) => e.isActive).map((emp: any) => (
            <div key={emp.id} className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="w-8 h-8 rounded-full bg-slate-200 mx-auto flex items-center justify-center text-xs font-bold text-slate-600 mb-1">
                {emp.name.charAt(0)}
              </div>
              <div className="text-xs font-medium text-slate-700 truncate">{emp.name}</div>
              <div className="text-[10px] text-slate-400 capitalize">{emp.designation?.replace("_", " ")}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}