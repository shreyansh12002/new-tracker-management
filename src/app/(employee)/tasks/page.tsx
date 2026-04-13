"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/auth";

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  assigned: { bg: "bg-blue-50", text: "text-blue-700", label: "Assigned" },
  not_started: { bg: "bg-slate-100", text: "text-slate-600", label: "Not Started" },
  in_progress: { bg: "bg-amber-50", text: "text-amber-700", label: "In Progress" },
  completed: { bg: "bg-green-50", text: "text-green-700", label: "Completed" },
  on_hold: { bg: "bg-orange-50", text: "text-orange-700", label: "On Hold" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", label: "Cancelled" },
};

const CATEGORY_MAP: Record<string, string> = {
  youtube_content: "YouTube Content",
  academic: "Academic",
  e_invite: "E-Invite",
  justdial_leads: "JustDial Leads",
  digital_marketing: "Digital Marketing",
  other: "Other",
};

export default function EmployeeTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "today">("all");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", category: "youtube_content", clientName: "", deadline: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    auth().then(s => {
      if (s?.user) loadTasks(s.user as any);
    });
  }, []);

  async function loadTasks(user: any) {
    const res = await fetch(`/api/tasks?employeeId=${user.id}`);
    const data = await res.json();
    setTasks(data.tasks || []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, date: new Date().toISOString().split("T")[0] }),
    });
    if (res.ok) {
      const data = await res.json();
      setTasks(prev => [data.task, ...prev]);
      setForm({ title: "", category: "youtube_content", clientName: "", deadline: "" });
      setShowAdd(false);
    }
    setSaving(false);
  }

  async function handleStatus(taskId: string, status: string) {
    await fetch(`/api/tasks?id=${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  }

  const today = new Date().toISOString().split("T")[0];
  let visible = tasks;
  if (filter === "today") visible = visible.filter(t => t.date === today);
  if (statusFilter) visible = visible.filter(t => t.status === statusFilter);

  const completed = tasks.filter(t => t.status === "completed").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">My Tasks</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Task</button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Tasks", value: tasks.length, color: "text-blue-600" },
          { label: "In Progress", value: inProgress, color: "text-amber-600" },
          { label: "Completed", value: completed, color: "text-green-600" },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`kpi-number ${s.color}`}>{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["all", "today"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${filter === f ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
            >
              {f === "all" ? "All Time" : "Today"}
            </button>
          ))}
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Task List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No tasks found</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map(task => {
              const st = STATUS_MAP[task.status] || STATUS_MAP.not_started;
              return (
                <div key={task.id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="status-badge bg-slate-100 text-slate-600">{CATEGORY_MAP[task.category] || task.category}</span>
                        {task.clientName && <span className="text-xs text-slate-400">{task.clientName}</span>}
                        {task.deadline && <span className="text-xs text-slate-400">Due: {task.deadline}</span>}
                      </div>
                    </div>
                    <select value={task.status} onChange={e => handleStatus(task.id, e.target.value)}
                      className={`text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0 ${st.bg} ${st.text}`}>
                      {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-overlay">
          <div className="modal-card max-w-md w-full">
            <h3 className="font-semibold text-slate-800 mb-4">Add Task</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Task Title</label>
                <input type="text" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What are you working on?"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Client / Project (optional)</label>
                <input type="text" value={form.clientName} onChange={e => setForm(prev => ({ ...prev, clientName: e.target.value }))}
                  placeholder="e.g. AcademiaAssist"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Deadline (optional)</label>
                <input type="date" value={form.deadline} onChange={e => setForm(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving || !form.title.trim()} className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? "Adding..." : "Add Task"}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}