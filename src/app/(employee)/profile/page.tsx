"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/auth";

export default function EmployeeProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, late: 0, present: 0 });
  const [weekly, setWeekly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    auth().then(s => {
      const u = s?.user as any;
      setUser(u);
      loadData(u?.id);
    });
  }, []);

  async function loadData(empId: string) {
    try {
      const [taskRes, attRes] = await Promise.all([
        fetch(`/api/tasks?employeeId=${empId}`),
        fetch("/api/attendance"),
      ]);
      const tasks = await taskRes.json();
      const att = await attRes.json();
      const empTasks = (tasks.tasks || []).filter((t: any) => t.employeeId === empId);
      const empAtt = (att.records || []).filter((r: any) => r.employeeId === empId);
      setStats({
        total: empTasks.length,
        completed: empTasks.filter((t: any) => t.status === "completed").length,
        inProgress: empTasks.filter((t: any) => t.status === "in_progress").length,
        late: empAtt.filter((r: any) => r.status === "late").length,
        present: empAtt.filter((r: any) => r.status === "present" || r.status === "late").length,
      });
      setWeekly(empAtt.slice(-7).reverse());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) {
    return <div className="space-y-4"><div className="h-40 card animate-pulse" /><div className="h-64 card animate-pulse" /></div>;
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <h1 className="text-2xl font-bold text-slate-800">Profile</h1>

      {/* Profile Card */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-white">
          {user?.name?.charAt(0) || "?"}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{user?.name}</h2>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <p className="text-xs text-slate-400 capitalize mt-0.5">
            {(user?.designation || "").replace("_", " ")} · {user?.role}
          </p>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-700 mb-4">This Week</h3>
        {weekly.length === 0 ? (
          <div className="text-center py-4 text-sm text-slate-400">No attendance records</div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekly.map(r => {
              const day = new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" });
              const dot = r.status === "late" ? "bg-amber-400" : r.status === "present" ? "bg-green-400" : "bg-red-400";
              return (
                <div key={r.id} className="text-center">
                  <div className="text-[10px] text-slate-400 mb-1">{day}</div>
                  <div className={`w-3 h-3 rounded-full mx-auto ${dot}`} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Tasks", value: stats.total, color: "text-blue-600" },
          { label: "In Progress", value: stats.inProgress, color: "text-amber-600" },
          { label: "Completed", value: stats.completed, color: "text-green-600" },
          { label: "Attendance", value: stats.present, color: "text-purple-600" },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`kpi-number ${s.color}`}>{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Security */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-700 mb-4">Security</h3>
        <button onClick={() => setShowPass(true)} className="btn-secondary">Change Password</button>
      </div>

      {/* Change Password Modal */}
      {showPass && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm w-full">
            <h3 className="font-semibold text-slate-800 mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">New Password</label>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2">
                <button disabled={passLoading || newPass.length < 6} className="btn-primary flex-1 disabled:opacity-50">
                  {passLoading ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setShowPass(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
              {newPass.length > 0 && newPass.length < 6 && (
                <p className="text-xs text-red-500">Password must be at least 6 characters</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}