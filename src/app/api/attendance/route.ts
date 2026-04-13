import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { attendance, employees } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getISTDate, getISTTime, haversineDistance } from "@/lib/utils";

const OFFICE_LAT = 28.6139;
const OFFICE_LNG = 77.2090;
const ALLOWED_RADIUS = 200;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || getISTDate();
  const employeeId = searchParams.get("employeeId");
  const mode = searchParams.get("mode");

  if (mode === "overview") {
    const recs = await db.select().from(attendance).all();
    return NextResponse.json({ records: recs });
  }

  if (mode === "stats") {
    const user = session.user as any;
    const empId = user.id;
    const records = await db.select().from(attendance).where(eq(attendance.employeeId, empId)).all();
    const present = records.filter(r => r.status === "present" || r.status === "late").length;
    const late = records.filter(r => r.status === "late").length;
    return NextResponse.json({ stats: { present, late, absent: 0 } });
  }

  if (mode === "month") {
    const month = searchParams.get("month"); // "YYYY-MM"
    let recs = await db.select().from(attendance).all();
    if (month) recs = recs.filter(r => r.date.startsWith(month));
    if ((session.user as any).role !== "admin") {
      const uid = (session.user as any).id;
      recs = recs.filter(r => r.employeeId === uid);
    }
    return NextResponse.json({ records: recs });
  }

  if (mode === "emp") {
    const empId = searchParams.get("employeeId");
    if (!empId) return NextResponse.json({ records: [] });
    let recs = await db.select().from(attendance).where(eq(attendance.employeeId, empId)).all();
    return NextResponse.json({ records: recs });
  }

  let recs = await db.select().from(attendance).where(eq(attendance.date, date)).all();
  if (employeeId) recs = recs.filter(r => r.employeeId === employeeId);
  if ((session.user as any).role !== "admin") {
    recs = recs.filter(r => r.employeeId === (session.user as any).id);
  }

  return NextResponse.json({ records: recs });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();
  const { action, latitude, longitude, employeeId, notes, status } = body;

  const today = getISTDate();
  const time = getISTTime();
  const id = nanoid();

  // Check for existing attendance
  const targetEmpId = employeeId || user.id;
  const existing = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.employeeId, targetEmpId), eq(attendance.date, today)))
    .get();

  if (action === "clock_in") {
    if (existing) {
      return NextResponse.json({ error: "Already clocked in today", record: existing }, { status: 400 });
    }

    // Determine if late (after 10:15 AM)
    const [h, m] = time.split(":").map(Number);
    const mins = h * 60 + m;
    const isLate = mins > 10 * 60 + 15;

    // Distance check
    const dist = haversineDistance(latitude, longitude, OFFICE_LAT, OFFICE_LNG);
    const locationValid = dist <= ALLOWED_RADIUS;
    const locationFlag = dist > ALLOWED_RADIUS ? "outside_office" : null;

    await db.insert(attendance).values({
      id, employeeId: targetEmpId, date: today, checkInTime: time,
      status: isLate ? "late" : "present", isLate, latitude: String(latitude),
      longitude: String(longitude), distance: String(Math.round(dist)),
      locationValid, locationFlag, createdAt: new Date().toISOString(),
    }).execute();

    const record = { id, employeeId: targetEmpId, date: today, checkInTime: time, status: isLate ? "late" : "present", isLate, distance: String(Math.round(dist)), locationFlag };
    return NextResponse.json({ message: "Clocked in", record });
  }

  if (action === "update_status" && existing) {
    await db.update(attendance).set({ status, isLate: status === "late", isHalfDay: status === "half_day", isManualOverride: true, overrideBy: user.id }).where(eq(attendance.id, existing.id)).execute();
    return NextResponse.json({ message: "Updated" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  return POST(req); // delegate to POST for update
}