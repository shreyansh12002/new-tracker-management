"use client";

import { useState, useEffect } from "react";

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active");
  const [showAdd, setShowAdd] = useState(false);
  const [showCred, setShowCred] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", email: "", password: "", designation: "academic_writer",
    employeeCode: "", joiningDate: "", shiftTime: "10:00", monthlySalary: "30000",
  });
  const [saving, setSaving] = useState(false);
  const [editEmp, setEditEmp] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({} as Record<string, any>);

  useEffect(() => { loadEmployees(); }, []);

  async function loadEmployees() {
    const res = await fetch("/api/employees");
    const data = await res.json();
    setEmployees(data.employees || []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setShowCred({ ...form, id: data.employee?.id });
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", designation: "academic_writer", employeeCode: "", joiningDate: "", shiftTime: "10:00", monthlySalary: "30000" });
      loadEmployees();
    }
    setSaving(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/employees?id=${editEmp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditEmp(null);
    loadEmployees();
    setSaving(false);
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this employee?")) return;
    await fetch(`/api/employees?id=${id}`, { method: "DELETE" });
    loadEmployees();
  }

  const designations = [
    { value: "academic_writer", label: "Academic Writer" },
    { value: "web_developer", label: "Web Developer" },
    { value: "graphic_designer", label: "Graphic Designer" },
    { value: "video_editor", label: "Video Editor" },
    { value: "intern", label: "Intern" },
  ];

  const visible = employees.filter(e => {
    if (filter === "active") return e.isActive;
    if (filter === "inactive") return !e.isActive;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + Add Employee
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(["all", "active", "inactive"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              filter === f ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No employees</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Employee", "Designation", "Code", "Joining", "Salary", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-slate-800">{emp.name}</div>
                      <div className="text-xs text-slate-400">{emp.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 capitalize">
                      {emp.designation?.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 font-mono">{emp.employeeCode}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{emp.joiningDate}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">₹{Number(emp.monthlySalary || 30000).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span className={`status-badge ${emp.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {emp.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditEmp(emp); setEditForm(emp); }}
                          className="text-xs text-blue-600 hover:underline">Edit</button>
                        {emp.isActive && (
                          <button onClick={() => handleDeactivate(emp.id)}
                            className="text-xs text-red-500 hover:underline">Deactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-overlay">
          <div className="modal-card max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-slate-800 mb-4">Add Employee</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              {[
                { label: "Full Name", key: "name", type: "text" },
                { label: "Email", key: "email", type: "email" },
                { label: "Temp Password", key: "password", type: "text" },
                { label: "Employee Code", key: "employeeCode", type: "text" },
                { label: "Joining Date", key: "joiningDate", type: "date" },
                { label: "Monthly Salary (₹)", key: "monthlySalary", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Designation</label>
                <select value={form.designation} onChange={e => setForm(prev => ({ ...prev, designation: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {designations.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">{saving ? "Adding..." : "Add Employee"}</button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editEmp && (
        <div className="modal-overlay">
          <div className="modal-card max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-slate-800 mb-4">Edit Employee</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                <input value={editForm.name || ""} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Designation</label>
                <select value={editForm.designation || ""} onChange={e => setEditForm(prev => ({ ...prev, designation: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {designations.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Monthly Salary (₹)</label>
                <input type="number" value={editForm.monthlySalary || ""} onChange={e => setEditForm(prev => ({ ...prev, monthlySalary: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                <button type="button" onClick={() => setEditEmp(null)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCred && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm w-full">
            <h3 className="font-semibold text-slate-800 mb-2">Employee Created</h3>
            <p className="text-sm text-slate-500 mb-4">Share these credentials with the employee:</p>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
              <div><span className="text-slate-500">Email:</span> <span className="font-mono text-slate-800">{showCred.email}</span></div>
              <div><span className="text-slate-500">Password:</span> <span className="font-mono text-slate-800 font-bold">{showCred.password}</span></div>
            </div>
            <button onClick={() => setShowCred(null)} className="btn-primary w-full mt-4">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}