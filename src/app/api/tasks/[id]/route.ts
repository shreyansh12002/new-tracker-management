import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks, taskLogs, taskProgressLogs } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const body = await req.json();
  const user = session.user as any;
  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Partial<typeof task> = { updatedAt: new Date().toISOString() };
  const allowed = ["title", "description", "status", "priority", "deadline", "category", "clientName", "dailySummary", "workedHours"];

  for (const key of allowed) {
    if (body[key] !== undefined) (updates as any)[key] = body[key];
  }

  // If status changed, log it
  if (body.status && body.status !== task.status) {
    await db.insert(taskLogs).values({
      id: nanoid(), taskId: id, employeeId: task.employeeId,
      fromStatus: task.status, toStatus: body.status,
      notes: body.notes || null, createdAt: new Date().toISOString(),
    }).execute();
  }

  await db.update(tasks).set(updates).where(eq(tasks.id, id)).execute();

  // Progress log for status change
  if (body.status && body.status !== task.status) {
    await db.insert(taskProgressLogs).values({
      id: nanoid(), taskId: id, employeeId: task.employeeId,
      description: `Status changed to ${body.status}`,
      timestamp: new Date().toISOString().split("T")[1].slice(0, 8),
      createdAt: new Date().toISOString(),
    }).execute();
  }

  const updated = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  return NextResponse.json({ task: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.delete(tasks).where(eq(tasks.id, id)).execute();
  return NextResponse.json({ message: "Deleted" });
}