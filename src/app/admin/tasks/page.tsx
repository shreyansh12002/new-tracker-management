"use client";

import { useState, useEffect } from "react";

const COLUMNS = [
  { key: "assigned", label: "Assigned", color: "bg-blue-50 border-blue-100", textColor: "text-blue-700" },
  { key: "not_started", label: "Not Started", color: "bg-slate-50 border-slate-100", textColor: "text-slate-600" },
  { key: "in_progress", label: "In Progress", color: "bg-amber-50 border-amber-100", textColor: "text-amber-700" },
  { key: "completed", label: "Completed", color: "bg-green-50 border-green-100", textColor: "text-green-700" },
  { key: "on_hold", label: "On Hold", color: "bg-orange-50 border-orange-100", textColor: "text-orange-700" },
  { key: "cancelled", label: "Cancelled", color: "bg-red-50 border-red-100", textColor: "text-red-700" },
];

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [assignTaskId, setAssignTaskId] = useState<string | null>(null);
  const [assignEmp, setAssignEmp] = useState("");
  const [filterEmp, setFilterEmp] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [t, e] = await Promise.all([
      fetch("/api/tasks").then(r => r.json()),
      fetch("/api/employees").then(r => r.json()),
    ]);
    setTasks(t.tasks || []);
    setEmployees(e.employees || []);
    setLoading(false);
  }

  async function handleStatusChange(taskId: string, status: string) {
    await fetch(`/api/tasks?id=${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignTaskId || !assignEmp) return;
    await fetch(`/api/tasks?id=${assignTaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: assignEmp }),
    });
    setShowAssign(false);
    setAssignTaskId(null);
    loadData();
  }

  const filtered = filterEmp ? tasks.filter(t => t.employeeId === filterEmp) : tasks;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Task Board</h1>
        <div className="flex items-center gap-2">
          <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="h-64 card animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto">
          {COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.key);
            return (
              <div key={col.key} className={`rounded-xl border ${col.color} p-3 min-w-[220px]`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${col.textColor}`}>{col.label}</h3>
                  <span className={`text-xs font-bold ${col.textColor}`}>{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map(task => {
                    const emp = employees.find(e => e.id === task.employeeId);
                    return (
                      <div key={task.id} className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 hover:shadow-md transition-shadow">
                        <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-2">{task.title}</p>
                        {emp && <p className="text-xs text-slate-400 mb-2">{emp.name}</p>}
                        <div className="flex items-center gap-1 mb-2">
                          <span className={`status-badge ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium}`}>
                            {task.priority}
                          </span>
                          <span className="status-badge bg-slate-100 text-slate-500 capitalize text-[10px]">
                            {task.category?.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const nextCol = COLUMNS.find(c => c.key !== task.status);
                              if (nextCol) handleStatusChange(task.id, nextCol.key);
                            }}
                            className="text-[10px] text-blue-600 hover:underline"
                          >
                            Move →
                          </button>
                          <button
                            onClick={() => { setAssignTaskId(task.id); setShowAssign(true); }}
                            className="text-[10px] text-slate-500 hover:underline"
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-[10px] text-red-500 hover:underline ml-auto"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Modal */}
      {showAssign && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm w-full">
            <h3 className="font-semibold text-slate-800 mb-4">Assign Task</h3>
            <form onSubmit={handleAssign} className="space-y-4">
              <select
                value={assignEmp}
                onChange={e => setAssignEmp(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select employee</option>
                {employees.filter(e => e.isActive).map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1">Assign</button>
                <button type="button" onClick={() => setShowAssign(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}