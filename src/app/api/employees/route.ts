import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employees } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allEmps = await db.select().from(employees).all();
  return NextResponse.json({ employees: allEmps });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, password, designation, employeeCode, joiningDate, shiftTime, monthlySalary } = body;

  if (!name || !email || !password || !designation || !employeeCode) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const existing = await db.select().from(employees).where(eq(employees.email, email)).get();
  if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();
  const id = nanoid();

  await db.insert(employees).values({
    id, name, email, passwordHash, role: "employee",
    designation, employeeCode,
    joiningDate: joiningDate || now.split("T")[0],
    shiftTime: shiftTime || "10:00",
    monthlySalary: monthlySalary || 30000,
    isActive: true, createdAt: now,
  }).execute();

  const emp = await db.select().from(employees).where(eq(employees.id, id)).get();
  return NextResponse.json({ employee: { ...emp, password } });
}