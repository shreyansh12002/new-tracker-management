"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/auth";
import { formatDate, formatTime, getISTDate, getISTTime, isWithinWorkingHours } from "@/lib/utils";

export default function EmployeeAttendancePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "fetching" | "success" | "error">("idle");
  const [locationError, setLocationError] = useState("");
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [weeklyRecords, setWeeklyRecords] = useState<any[]>([]);
  const [capturedLoc, setCapturedLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    auth().then(s => {
      const u = s?.user as any;
      setUser(u);
      loadData(u.id);
    });
  }, []);

  async function loadData(empId: string) {
    setLoading(true);
    const today = getISTDate();
    try {
      const [todayRes, allRes] = await Promise.all([
        fetch(`/api/attendance?date=${today}&employeeId=${empId}`),
        fetch("/api/attendance"),
      ]);
      const todayData = await todayRes.json();
      setTodayRecord(todayData.records?.find((r: any) => r.employeeId === empId) || null);
      const all = await allRes.json();
      const empRecords = (all.records || []).filter((r: any) => r.employeeId === empId);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      setWeeklyRecords(empRecords.filter((r: any) => new Date(r.date) >= weekAgo));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleClockIn() {
    setLocationStatus("fetching");
    if (!navigator.geolocation) { setLocationStatus("error"); setLocationError("Not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setCapturedLoc({ lat, lng });
        setLocationStatus("success");
        await submitAttendance("clock_in", lat, lng);
      },
      () => { setLocationStatus("error"); setLocationError("Location denied"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
      if (res.ok) { setTodayRecord(data.record); loadData(user.id); }
    } catch (e) { alert("Failed"); }
    setMarking(false);
  }

  function getStatusBadge(status: string) {
    const map: Record<string, string> = {
      present: "bg-green-50 text-green-700", late: "bg-amber-50 text-amber-700", half_day: "bg-blue-50 text-blue-700"
    };
    return `status-badge ${map[status] || "bg-slate-100 text-slate-600"}`;
  }

  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(0).padStart(2, "0")}`;

  if (loading) {
    return <div className="space-y-4"><div className="h-32 card animate-pulse" /><div className="h-64 card animate-pulse" /></div>;
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>

      {/* Current Time */}
      <div className="card p-6 text-center">
        <div className="text-4xl font-bold text-slate-800 font-mono">{getISTTime().slice(0, 5)}</div>
        <div className="text-sm text-slate-500 mt-1">{formatDate(getISTDate())}</div>
      </div>

      {/* Status Card */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-700 mb-4">Today&apos;s Status</h2>
        {todayRecord ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={getStatusBadge(todayRecord.status)}>{todayRecord.status === "late" ? "Late" : todayRecord.status === "half_day" ? "Half Day" : "Present"}</span>
              <span className="text-sm text-slate-500">Clocked in at {formatTime(todayRecord.checkInTime)}</span>
            </div>
            {todayRecord.distance && todayRecord.distance !== "0" && (
              <p className="text-xs text-slate-400">
                {parseInt(todayRecord.distance) < 1000 ? `${todayRecord.distance}m from office` : `${(parseInt(todayRecord.distance)/1000).toFixed(1)}km from office`}
              </p>
            )}
            {todayRecord.locationFlag === "outside_office" && (
              <span className="status-badge bg-red-50 text-red-700">Outside office range</span>
            )}
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-slate-500 mb-3">
              {isWithinWorkingHours() ? "Ready to mark your attendance" : "Clock-in available 10 AM – 6:30 PM"}
            </p>
            <button onClick={handleClockIn} disabled={!isWithinWorkingHours() || marking || locationStatus === "fetching"}
              className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed">
              {marking || locationStatus === "fetching" ? "Getting location..." : "Mark Attendance"}
            </button>
            {locationStatus === "error" && <p className="text-xs text-red-500 mt-2">{locationError}</p>}
          </div>
        )}
      </div>

      {/* Weekly History */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">This Week</h2>
        </div>
        {weeklyRecords.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">No records this week</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {weeklyRecords.slice().reverse().map(r => (
              <div key={r.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{formatDate(r.date)}</p>
                  <p className="text-xs text-slate-400">{r.date.split("-").reverse().join("-")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={getStatusBadge(r.status)}>{r.status === "late" ? "Late" : r.status === "half_day" ? "Half Day" : "Present"}</span>
                  <span className="text-xs text-slate-500">{formatTime(r.checkInTime)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

