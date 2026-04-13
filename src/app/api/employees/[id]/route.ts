import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employees } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const body = await req.json();
  const updates: any = {};
  const allowed = ["name", "email", "designation", "employeeCode", "joiningDate", "shiftTime", "monthlySalary", "isActive"];
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (body.password) {
    updates.passwordHash = await bcrypt.hash(body.password, 12);
  }

  await db.update(employees).set(updates).where(eq(employees.id, id)).execute();
  return NextResponse.json({ message: "Updated" });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.update(employees).set({ isActive: false }).where(eq(employees.id, id)).execute();
  return NextResponse.json({ message: "Deactivated" });
}