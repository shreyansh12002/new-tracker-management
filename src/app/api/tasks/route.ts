import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks, taskLogs, taskProgressLogs } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getISTDate } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const user = session.user as any;
  const isAdmin = user.role === "admin";

  let allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt)).all();

  if (!isAdmin) {
    allTasks = allTasks.filter(t => t.employeeId === user.id);
  } else if (employeeId) {
    allTasks = allTasks.filter(t => t.employeeId === employeeId);
  }

  return NextResponse.json({ tasks: allTasks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();
  const { title, description, category, clientName, deadline, estimatedHours, employeeId } = body;

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const now = new Date().toISOString();
  const id = nanoid();
  const targetEmpId = employeeId || user.id;

  await db.insert(tasks).values({
    id, title, description, employeeId: targetEmpId, createdBy: user.id,
    category, clientName, deadline, estimatedHours,
    status: "assigned", priority: "medium",
    date: getISTDate(), createdAt: now, updatedAt: now,
  }).execute();

  // Log creation
  await db.insert(taskLogs).values({
    id: nanoid(), taskId: id, employeeId: targetEmpId,
    fromStatus: null, toStatus: "assigned",
    createdAt: now,
  }).execute();

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  return NextResponse.json({ task });
}