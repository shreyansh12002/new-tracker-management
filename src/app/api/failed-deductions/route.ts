import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { failedDeductions, employees } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const employeeId = searchParams.get("employeeId");

  let records = await db.select().from(failedDeductions).all();
  if (month) records = records.filter(r => r.month === month);
  if (employeeId) records = records.filter(r => r.employeeId === employeeId);

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { employeeId, month, amount, reason } = body;
  if (!employeeId || !month || amount === undefined) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  const adminId = (session.user as any)?.id || null;
  const existing = await db.select().from(failedDeductions)
    .where(and(eq(failedDeductions.employeeId, employeeId), eq(failedDeductions.month, month)))
    .get();

  let result: any;
  if (existing) {
    await db.update(failedDeductions).set({ amount, reason: reason || null, createdBy: adminId })
      .where(eq(failedDeductions.id, existing.id)).execute();
    result = { ...existing, amount, reason };
  } else {
    const id = nanoid();
    const now = new Date().toISOString();
    await db.insert(failedDeductions).values({ id, employeeId, month, amount, reason: reason || null, createdBy: adminId, createdAt: now }).execute();
    result = { id, employeeId, month, amount, reason, createdBy: adminId, createdAt: now };
  }

  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.delete(failedDeductions).where(eq(failedDeductions.id, id)).execute();
  return NextResponse.json({ message: "Deleted" });
}