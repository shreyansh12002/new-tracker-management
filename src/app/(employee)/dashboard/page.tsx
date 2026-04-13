"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/auth";
import { formatDate, formatTime, getISTDate, getISTTime, isWithinWorkingHours } from "@/lib/utils";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0 });
  const [marking, setMarking] = useState(false);
  const [showClockIn, setShowClockIn] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "fetching" | "success" | "error">("idle");
  const [locationError, setLocationError] = useState("");
  const [capturedLoc, setCapturedLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("youtube_content");
  const [newTaskClient, setNewTaskClient] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => {
    auth().then((s) => {
      setUser(s?.user as any);
      loadData(s?.user as any);
    });
  }, []);

  async function loadData(u: any) {
    setLoading(true);
    const today = getISTDate();
    try {
      const [attRes, taskRes, statsRes] = await Promise.all([
        fetch(`/api/attendance?date=${today}&employeeId=${u.id}`),
        fetch(`/api/tasks?employeeId=${u.id}`),
        fetch(`/api/attendance?mode=stats`),
      ]);
      const att = await attRes.json();
      setTodayAttendance(att.record || null);
      const t = await taskRes.json();
      setTasks(Array.isArray(t.tasks) ? t.tasks : []);
      const st = await statsRes.json();
      if (st.stats) setStats(st.stats);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  async function handleClockIn() {
    setLocationStatus("fetching");
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCapturedLoc({ lat, lng });
        setLocationStatus("success");
        await submitAttendance("clock_in", lat, lng);
      },
      (err) => {
        setLocationStatus("error");
        setLocationError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleClockOut() {
    if (!capturedLoc) {
      setLocationStatus("fetching");
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCapturedLoc({ lat, lng });
          setLocationStatus("success");
          await submitAttendance("clock_out", lat, lng);
        },
        () => { setLocationStatus("error"); setLocationError("Could not get location"); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      await submitAttendance("clock_out", capturedLoc.lat, capturedLoc.lng);
    }
  }

  async function submitAttendance(action: string, lat: number, lng: number) {
    setMarking(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, latitude: lat, longitude: lng, employeeId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setTodayAttendance(data.record);
        setShowClockIn(false);
      } else {
        alert(data.error || "Failed");
      }
    } catch (e) { alert("Something went wrong"); }
    setMarking(false);
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          employeeId: user.id,
          category: newTaskCategory,
          clientName: newTaskClient,
          date: getISTDate(),
          deadline: undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks(prev => [data.task, ...prev]);
        setNewTaskTitle("");
        setNewTaskClient("");
      }
    } catch (e) { console.error(e); }
    setSavingTask(false);
  }

  async function handleStatusChange(taskId: string, status: string) {
    const res = await fetch(`/api/tasks?id=${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: data.task.status } : t));
    }
  }

  const canClockIn = isWithinWorkingHours() && !todayAttendance?.checkInTime;
  const canClockOut = todayAttendance?.checkInTime && !todayAttendance?.clockOutTime;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 card animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 card animate-pulse" />)}
        </div>
        <div className="h-64 card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Greeting */}
      <div className="card p-5">
        <h1 className="text-lg font-bold text-slate-800">{getGreeting()}, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500 mt-0.5">{formatDate(getISTDate())} · {getISTTime()}</p>
      </div>

      {/* Attendance Card */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-700 mb-4">Today&apos;s Attendance</h2>
        {todayAttendance ? (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`status-badge ${todayAttendance.status === "late" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                  {todayAttendance.status === "late" ? "Late" : "Present"}
                </span>
                <span className="text-sm text-slate-500">at {formatTime(todayAttendance.checkInTime)}</span>
              </div>
              {todayAttendance.distance && todayAttendance.distance !== "0" && (
                <p className="text-xs text-slate-400">
                  {parseInt(todayAttendance.distance) < 1000
                    ? `${todayAttendance.distance}m from office`
                    : `${(parseInt(todayAttendance.distance)/1000).toFixed(1)}km from office`}
                </p>
              )}
            </div>
            <button onClick={handleClockOut} disabled={marking} className="btn-primary text-xs">
              {marking ? "..." : "Clock Out"}
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-slate-500 mb-3">
              {isWithinWorkingHours() ? "Ready to clock in" : "Clock-in available 10 AM – 6:30 PM"}
            </p>
            <button
              onClick={handleClockIn}
              disabled={!canClockIn || marking}
              className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {marking ? "Getting location..." : "Clock In"}
            </button>
            {locationStatus === "error" && (
              <p className="text-xs text-red-500 mt-2">{locationError}</p>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Present Days", value: stats.present, color: "text-green-600" },
          { label: "Late Days", value: stats.late, color: "text-amber-600" },
          { label: "Absent Days", value: stats.absent, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`kpi-number ${s.color}`}>{s.value ?? 0}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add Task Form */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-700 mb-4">Add Today&apos;s Task</h2>
        <form onSubmit={handleAddTask} className="space-y-3">
          <input
            type="text"
            placeholder="What are you working on?"
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <select
              value={newTaskCategory}
              onChange={e => setNewTaskCategory(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="youtube_content">YouTube Content</option>
              <option value="academic">Academic</option>
              <option value="e_invite">E-Invite</option>
              <option value="justdial_leads">JustDial Leads</option>
              <option value="digital_marketing">Digital Marketing</option>
              <option value="other">Other</option>
            </select>
            <input
              type="text"
              placeholder="Client / Project (optional)"
              value={newTaskClient}
              onChange={e => setNewTaskClient(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" disabled={savingTask || !newTaskTitle.trim()} className="btn-primary w-full disabled:opacity-50">
            {savingTask ? "Adding..." : "Add Task"}
          </button>
        </form>
      </div>

      {/* Task List */}
      <div className="card">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Today&apos;s Tasks</h2>
        </div>
        {tasks.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">No tasks yet. Add one above.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map(task => (
              <div key={task.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="status-badge bg-slate-100 text-slate-600 capitalize">
                      {task.category?.replace("_", " ")}
                    </span>
                    {task.clientName && (
                      <span className="text-xs text-slate-400">{task.clientName}</span>
                    )}
                  </div>
                </div>
                <select
                  value={task.status}
                  onChange={e => handleStatusChange(task.id, e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0"
                >
                  <option value="assigned">Assigned</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}