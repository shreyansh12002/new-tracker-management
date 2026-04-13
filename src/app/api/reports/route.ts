import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { attendance, employees, failedDeductions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getISTDate, getMonthDays, getMonthName } from "@/lib/utils";

const ATTENDANCE_CUTOFF = "2026-04-01";

function calculateFinalSalary(monthlySalary: number, lateCount: number, absentCount: number, failDeduction: number) {
  const perDaySalary = monthlySalary / 30;
  const lopFromLate = Math.floor(lateCount / 3);
  const remainingLate = lateCount % 3;
  const lateFine = remainingLate * 100;
  const totalLopDays = absentCount + lopFromLate;
  const lopDeduction = Math.round(totalLopDays * perDaySalary * 100) / 100;
  const finalSalary = Math.max(0, Math.round((monthlySalary - lopDeduction - lateFine - failDeduction) * 100) / 100);
  return { perDaySalary: Math.round(perDaySalary * 100) / 100, lopFromLate, remainingLate, lateFine, totalLopDays, lopDeduction, finalSalary };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const employeeId = searchParams.get("employeeId");

  const istNow = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
  const year = month ? parseInt(month.split("-")[0]) : istNow.getFullYear();
  const monthNum = month ? parseInt(month.split("-")[1]) : istNow.getMonth() + 1;
  const days = getMonthDays(year, monthNum);
  const monthStr = `${year}-${String(monthNum).padStart(2, "0")}`;

  let allEmployees = await db.select().from(employees).where(eq(employees.isActive, true)).all();
  const allFailedDeductions = await db.select().from(failedDeductions).all();
  const rawAttendance = await db.select().from(attendance).all();
  let allAttendance = rawAttendance.filter((r) => r.date.startsWith(monthStr) && r.date >= ATTENDANCE_CUTOFF);

  if (employeeId) allAttendance = allAttendance.filter(r => r.employeeId === employeeId);

  const employeeStats = allEmployees.map((emp) => {
    const empRecords = allAttendance.filter(r => r.employeeId === emp.id);
    const todayIST = istNow.toISOString().split("T")[0];
    const startDate = emp.joiningDate > ATTENDANCE_CUTOFF ? emp.joiningDate : ATTENDANCE_CUTOFF;
    const effectiveWorkingDays = days.filter(d => {
      const dow = new Date(d + "T00:00:00").getDay();
      return dow !== 0 && d >= startDate && d <= todayIST;
    });

    const totalPresent = empRecords.filter(r => r.status === "present").length;
    const totalLate = empRecords.filter(r => r.status === "late").length;
    const totalAbsent = Math.max(0, effectiveWorkingDays.length - empRecords.length);

    const empFailed = allFailedDeductions.filter(r => r.employeeId === emp.id && r.month === monthStr);
    const failDeduction = empFailed.reduce((s, r) => s + r.amount, 0);
    const salaryCalc = calculateFinalSalary(emp.monthlySalary || 30000, totalLate, totalAbsent, failDeduction);

    return {
      employee: { id: emp.id, name: emp.name, employeeCode: emp.employeeCode, designation: emp.designation, monthlySalary: emp.monthlySalary || 30000 },
      totalPresent, totalLate, totalAbsent,
      totalWorkingDays: effectiveWorkingDays.length,
      salary: { ...salaryCalc, failDeduction },
    };
  });

  return NextResponse.json({
    employeeStats,
    overall: {
      totalPresent: employeeStats.reduce((s, e) => s + e.totalPresent, 0),
      totalLate: employeeStats.reduce((s, e) => s + e.totalLate, 0),
      totalAbsent: employeeStats.reduce((s, e) => s + e.totalAbsent, 0),
    },
    month: monthStr, monthName: getMonthName(monthNum, year),
  });
}